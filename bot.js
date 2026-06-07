var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

var ECO_DATA = {};
var ecoFiles = [
    'ecoA.json', 
    'ecoB.json', 
    'ecoC.json', 
    'ecoD.json', 
    'ecoE.json', 
    'eco_interpolated.json'
]; 
var loadedCount = 0;
var isEngineReady = false;

// ⚡ 최적화 1: 평가 캐시 메모리 (중복 계산 방지)
var evalCache = {};

function loadEcoFiles() {
    if (loadedCount >= ecoFiles.length) {
        console.log("All ECO Files Integrated Successfully");
        isEngineReady = true;
        updateStatus();
        return;
    }
    
    var currentFile = ecoFiles[loadedCount];
    $status.text('Loading Database: ' + currentFile + ' ...');
    
    $.getJSON(currentFile, function(data) {
        Object.assign(ECO_DATA, data);
        loadedCount++;
        loadEcoFiles();
    }).fail(function() {
        console.log("Failed to load: " + currentFile);
        loadedCount++;
        loadEcoFiles();
    });
}

loadEcoFiles();

var PAWN_TABLE = [
    [  0,  0,  0,  0,  0,  0,  0,  0], 
    [ 70, 70, 70, 70, 70, 70, 70, 70], 
    [ 30, 30, 40, 50, 50, 40, 30, 30], 
    [ 10, 10, 20, 40, 40, 20, 10, 10], 
    [  5,  5, 10, 30, 30, 10,  5,  5], 
    [  5, -5,-10,  0,  0,-10, -5,  5], 
    [  5, 10, 10,-20,-20, 10, 10,  5], 
    [  0,  0,  0,  0,  0,  0,  0,  0]  
];

var KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 20, 25, 25, 20,  0,-30],
    [-30,  0, 20, 25, 25, 20,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

var BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-10,  0, 10, 15, 15, 10,  0,-10],
    [-10, 10, 15, 20, 20, 15, 10,-10],
    [-10, 10, 15, 20, 20, 15, 10,-10],
    [-10,  0, 10, 15, 15, 10,  0,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

var ROOK_TABLE = [
    [  0,  0,  0,  5,  5,  0,  0,  0],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [  5, 10, 10, 10, 10, 10, 10,  5],
    [  0,  0,  0,  0,  0,  0,  0,  0]
];

var QUEEN_TABLE = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

var KING_TABLE = [
    [ 20, 30, 10,  0,  0, 10, 30, 20],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30]
];

// ⚡ 최적화 1: 파라미터를 gameObj로 변경하여 캐싱 적용
function evaluateBoard(gameObj) {
    // 현재 기물 배치 상태만 추출하여 캐시 확인 (속도 폭발적 증가)
    var fenPos = gameObj.fen().split(' ')[0];
    if (evalCache[fenPos] !== undefined) {
        return evalCache[fenPos];
    }

    var boardMatrix = gameObj.board(); // 여기서 메모리를 엄청 잡아먹기 때문에 캐싱이 필수적입니다.
    var score = 0;
    var wk = null, bk = null;
    var wMajorMinor = 0, bMajorMinor = 0;
    var wBishopColor = null;

    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
            var p = boardMatrix[r][c];
            if (p) {
                if (p.color === 'w') {
                    if (p.type !== 'p' && p.type !== 'k') wMajorMinor++;
                    if (p.type === 'k') wk = {r: r, c: c};
                    if (p.type === 'b') wBishopColor = ((r + c) % 2 === 0) ? 'light' : 'dark';
                } else {
                    if (p.type !== 'p' && p.type !== 'k') bMajorMinor++;
                    if (p.type === 'k') bk = {r: r, c: c};
                }
            }
        }
    }

    var isEndgame = (wMajorMinor <= 2 && bMajorMinor <= 2);

    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) { 
            var piece = boardMatrix[r][c];
            if (piece) {
                var val = PIECE_VALUES[piece.type];
                var bonus = 0;
                var tableRow = (piece.color === 'w') ? (7 - r) : r;
                var tableCol = c;

                if (piece.type === 'p') {
                    bonus = PAWN_TABLE[tableRow][tableCol];
                    if (isEndgame) bonus += ((7 - tableRow) * 30); 
                }
                else if (piece.type === 'n') bonus = KNIGHT_TABLE[tableRow][tableCol];
                else if (piece.type === 'b') bonus = BISHOP_TABLE[tableRow][tableCol];
                else if (piece.type === 'r') bonus = ROOK_TABLE[tableRow][tableCol];
                else if (piece.type === 'q') bonus = QUEEN_TABLE[tableRow][tableCol];
                else if (piece.type === 'k') {
                    if (isEndgame) bonus = -KING_TABLE[tableRow][tableCol];
                    else bonus = KING_TABLE[tableRow][tableCol];
                }

                var pieceScore = val + bonus;

                if (isEndgame && piece.type !== 'p' && piece.type !== 'k') {
                    var enemyKing = (piece.color === 'w') ? bk : wk;
                    var myKing = (piece.color === 'w') ? wk : bk;

                    if (enemyKing && myKing) {
                        var enemyKingMopUp = 0;
                        enemyKingMopUp += Math.max(Math.abs(enemyKing.c - 3.5), Math.abs(enemyKing.r - 3.5)) * 10;
                        
                        var kingDistance = Math.abs(myKing.r - enemyKing.r) + Math.abs(myKing.c - enemyKing.c);
                        enemyKingMopUp += (14 - kingDistance) * 5;

                        if (piece.type === 'b' || piece.type === 'n') {
                            if (wBishopColor === 'light') {
                                var distToA8 = Math.abs(enemyKing.r - 0) + Math.abs(enemyKing.c - 0);
                                var distToH1 = Math.abs(enemyKing.r - 7) + Math.abs(enemyKing.c - 7);
                                enemyKingMopUp += (14 - Math.min(distToA8, distToH1)) * 15;
                            } else if (wBishopColor === 'dark') {
                                var distToA1 = Math.abs(enemyKing.r - 7) + Math.abs(enemyKing.c - 0);
                                var distToH8 = Math.abs(enemyKing.r - 0) + Math.abs(enemyKing.c - 7);
                                enemyKingMopUp += (14 - Math.min(distToA1, distToH8)) * 15;
                            }
                        }

                        pieceScore += enemyKingMopUp;
                    }
                }

                if (piece.color === 'w') score += pieceScore;
                else score -= pieceScore;
            }
        }
    }
    
    // 계산 완료 후 캐시에 저장
    evalCache[fenPos] = score;
    return score;
}

// ⚡ 최적화 2: 정렬 로직 간소화 (수만 번 반복되는 indexOf 성능 향상)
function orderMoves(moves) {
    var scoredMoves = [];
    for (var i = 0; i < moves.length; i++) {
        var m = moves[i];
        var s = 0;
        if (m.indexOf('#') !== -1) s += 5000;
        else if (m.indexOf('+') !== -1) s += 500;
        if (m.indexOf('x') !== -1) s += 200;
        scoredMoves.push({ move: m, score: s });
    }
    scoredMoves.sort(function(a, b) { return b.score - a.score; });
    var result = [];
    for (var j = 0; j < scoredMoves.length; j++) {
        result.push(scoredMoves[j].move);
    }
    return result;
}

function quiesce(gameObj, alpha, beta, isMaximizing, qsDepth) {
    var stand_pat = evaluateBoard(gameObj); // 파라미터 변경 반영
    if (qsDepth === 0) return stand_pat;

    if (isMaximizing) {
        if (stand_pat >= beta) return beta;
        if (alpha < stand_pat) alpha = stand_pat;
    } else {
        if (stand_pat <= alpha) return alpha;
        if (beta > stand_pat) beta = stand_pat;
    }

    var moves = gameObj.moves();
    var captureMoves = [];
    for (var i = 0; i < moves.length; i++) {
        if (moves[i].indexOf('x') !== -1 || moves[i].indexOf('+') !== -1 || moves[i].indexOf('#') !== -1) {
            captureMoves.push(moves[i]);
        }
    }

    if (captureMoves.length === 0) return stand_pat;
    captureMoves = orderMoves(captureMoves);

    if (isMaximizing) {
        for (var i = 0; i < captureMoves.length; i++) {
            gameObj.move(captureMoves[i]);
            var score = quiesce(gameObj, alpha, beta, false, qsDepth - 1);
            gameObj.undo();
            if (score > stand_pat) stand_pat = score;
            if (stand_pat >= beta) return beta;
            if (stand_pat > alpha) alpha = stand_pat;
        }
        return stand_pat;
    } else {
        for (var i = 0; i < captureMoves.length; i++) {
            gameObj.move(captureMoves[i]);
            var score = quiesce(gameObj, alpha, beta, true, qsDepth - 1);
            gameObj.undo();
            if (score < stand_pat) stand_pat = score;
            if (stand_pat <= alpha) return alpha;
            if (stand_pat < beta) beta = stand_pat;
        }
        return stand_pat;
    }
}

function minimax(gameObj, depth, alpha, beta, isMaximizing) {
    if (gameObj.game_over()) {
        if (gameObj.in_checkmate()) return gameObj.turn() === 'w' ? (-999999 + (depth * 1000)) : (999999 - (depth * 1000));
        if (gameObj.in_draw()) return 0;
    }
    // ⚡ 최적화 3: 과도한 정지 탐색 깊이 제한 (4 -> 2)
    // 깊이를 줄여도 이미 핵심 패턴을 인식하므로 멍청해지지 않고 속도만 훨씬 빨라집니다.
    if (depth === 0) return quiesce(gameObj, alpha, beta, isMaximizing, 2); 

    var moves = orderMoves(gameObj.moves());
    if (isMaximizing) {
        var maxEval = -Infinity;
        for (var i = 0; i < moves.length; i++) {
            gameObj.move(moves[i]);
            maxEval = Math.max(maxEval, minimax(gameObj, depth - 1, alpha, beta, false));
            gameObj.undo();
            alpha = Math.max(alpha, maxEval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        var minEval = Infinity;
        for (var i = 0; i < moves.length; i++) {
            gameObj.move(moves[i]);
            minEval = Math.min(minEval, minimax(gameObj, depth - 1, alpha, beta, true));
            gameObj.undo();
            beta = Math.min(beta, minEval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function getBestMove() {
    evalCache = {}; // 매 턴마다 캐시 초기화 (메모리 누수 방지)
    
    var historyStr = game.history().join(" ");
    var legalMoves = game.moves();
    
    var ELITE_OPENINGS = {
        "": ["e4", "d4", "c4", "Nf3"], "e4": ["c5", "e5", "e6", "c6"], "d4": ["Nf6", "d5", "e6"],
        "c4": ["e5", "c5", "Nf6"], "Nf3": ["Nf6", "d5", "c5"], "e4 e6": ["d4"], "e4 e6 d4": ["d5"],
        "e4 e6 d4 d5": ["Nc3", "Nd2", "e5"], "e4 e6 d4 d5 Nc3": ["Nf6", "Bb4"], "e4 e6 d4 d5 Nc3 Nf6": ["Bg5", "e5"],
        "e4 c5": ["Nf3"], "e4 c5 Nf3": ["d6", "Nc6", "e6"], "e4 c5 Nf3 d6": ["d4"], "e4 c5 Nf3 d6 d4": ["cxd4"],
        "e4 c5 Nf3 d6 d4 cxd4": ["Nxd4"], "e4 c5 Nf3 d6 d4 Nxd4": ["Nf6"], "e4 c5 Nf3 d6 d4 Nxd4 Nf6": ["Nc3"],
        "e4 c6": ["d4"], "e4 c6 d4": ["d5"], "e4 c6 d4 d5": ["Nc3", "exd5", "e5"], "e4 c6 d4 d5 Nc3": ["dxe4"],
        "e4 c6 d4 d5 Nc3 dxe4": ["Nxe4"], "e4 e5": ["Nf3", "Nc3", "Bc4"], "e4 e5 Nf3": ["Nc6", "Nf6"],
        "e4 e5 Nf3 Nc6": ["Bb5", "Bc4"], "e4 e5 Nf3 Nc6 Bb5": ["a6", "Nf6"], "e4 e5 Nf3 Nc6 Bc4": ["Bc5", "Nf6"],
        "d4 d5": ["c4", "Nf3", "Bf4"], "d4 d5 c4": ["e6", "c6", "dxc4"], "d4 d5 c4 e6": ["Nc3", "Nf3"], "d4 Nf6 c4": ["e6", "g6"]
    };

    if (ELITE_OPENINGS[historyStr]) {
        var prefMoves = ELITE_OPENINGS[historyStr];
        var validPrefs = [];
        for (var p = 0; p < prefMoves.length; p++) {
            if (legalMoves.indexOf(prefMoves[p]) !== -1) validPrefs.push(prefMoves[p]);
        }
        if (validPrefs.length > 0) return validPrefs[Math.floor(Math.random() * validPrefs.length)];
    }

    var isWhite = (game.turn() === 'w');
    var bestMove = null;
    var bestValue = isWhite ? -Infinity : Infinity; 
    
    legalMoves = orderMoves(legalMoves);
    
    for (var i = 0; i < legalMoves.length; i++) {
        var move = legalMoves[i];
        game.move(move);
        
        var boardValue = minimax(game, 2, -Infinity, Infinity, !isWhite); 

        if (game.history().length < 14) {
            if (move === 'a3' || move === 'a4' || move === 'h3' || move === 'h4' || 
                move === 'a6' || move === 'a5' || move === 'h6' || move === 'h5') {
                boardValue += isWhite ? -50 : 50; 
            }
            if (move.charAt(0) === 'N' || move.charAt(0) === 'B') {
                boardValue += isWhite ? 20 : -20;
            }
        }

        game.undo();
        
        if (isWhite) {
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        } else {
            if (boardValue < bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }
    }
    return bestMove || legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

function onDragStart(source, piece, position, orientation) {
    if (game.game_over() || piece.search(/^b/) !== -1) return false;
    if (!isEngineReady) {
        alert("Please wait. The opening database is still loading.");
        return false;
    }
}

function makeComputerMove() {
    $status.text('computer is thinking...');
    
    // UI 업데이트 지연시간 단축으로 체감 속도 상승
    setTimeout(function() {
        var move = getBestMove(); 
        game.move(move);
        board.position(game.fen());
        updateStatus();
    }, 50);
}

function onDrop(source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    updateStatus();
    if (!game.game_over()) makeComputerMove();
}

function onSnapEnd() { board.position(game.fen()); }

function updateStatus() {
    if (!isEngineReady) return;
    
    var moves = game.history();
    var historyStr = "";
    for (var i = 0; i < moves.length; i++) {
        if (i % 2 === 0) historyStr += (Math.floor(i / 2) + 1) + ". " + moves[i] + " ";
        else historyStr += moves[i] + " ";
    }
    $history.text(historyStr || "Game Start");
    $status.text('skyblue bot v1');

    var fullFen = game.fen();
    var positionOnlyFen = fullFen.split(' ')[0];
    var matchedOpening = ECO_DATA[fullFen] || ECO_DATA[positionOnlyFen];
    
    if (matchedOpening && matchedOpening.name) {
        var ecoCode = matchedOpening.eco ? "[" + matchedOpening.eco + "] " : "";
        $('#opening-name').text(ecoCode + matchedOpening.name);
    } else if (moves.length === 0) {
        $('#opening-name').text("Starting Position");
    }

    if (game.in_checkmate()) triggerGameOver('Checkmate');
    else if (game.in_draw()) triggerGameOver('Draw');
}

function triggerGameOver(reason) {
    if (game.history().length < 2) {
        alert("The game is too short to analyze.");
        resetGame();
        return;
    }
    $status.text('Game Over: ' + reason);

    if (reason === 'Checkmate') {
        var winnerText = (game.turn() === 'w') ? "CHECKMATE!<br>Black Wins" : "CHECKMATE!<br>White Wins";
        $('#checkmate-banner').html(winnerText);
        $('#checkmate-banner').fadeIn(300);
        setTimeout(function() { showAnalysisModal(reason); }, 2000);
    } else {
        showAnalysisModal(reason);
    }
}

function showAnalysisModal(reason) {
    $('#modal-title').text('Analyzing Game... (' + reason + ')');
    $('#stats-container').hide();
    $('#progress-bar').show();
    $('#analysis-modal').css('display', 'flex');
    runAnalysis(); 
}

async function runAnalysis() {
    var history = game.history();
    var tempGame = new Chess();
    var stats = { book:0, brilliant:0, great:0, best:0, excellent:0, good:0, inaccuracy:0, mistake:0, miss:0, blunder:0 };

    for (var i = 0; i < history.length; i++) {
        var isWhite = (i % 2 === 0);
        var moveStr = history[i];
        var countThisMove = isWhite; 

        if (i < 8) {
            if (countThisMove) stats.book++;
            tempGame.move(moveStr);
        } else {
            var evalBefore = minimax(tempGame, 2, -Infinity, Infinity, isWhite);
            tempGame.move(moveStr);
            var evalAfter = minimax(tempGame, 2, -Infinity, Infinity, !isWhite);
            var delta = isWhite ? (evalAfter - evalBefore) : (evalBefore - evalAfter);
            var prevMoveStr = i > 0 ? history[i-1] : ""; 

            if (countThisMove) {
                if (delta <= -250) stats.blunder++; 
                else if (delta <= -100) {
                    if (prevMoveStr.indexOf('x') !== -1 || prevMoveStr.indexOf('+') !== -1) stats.miss++; 
                    else stats.mistake++; 
                } else if (delta <= -40) stats.inaccuracy++; 
                else if (delta > 150 && moveStr.indexOf('x') !== -1) stats.brilliant++; 
                else if (delta > 100) stats.great++;
                else if (delta >= -10) stats.best++;
                else if (delta >= -30) stats.excellent++;
                else stats.good++;
            }
        }
        var percent = Math.round(((i + 1) / history.length) * 100);
        $('#progress-fill').css('width', percent + '%');
        await new Promise(function(resolve) { setTimeout(resolve, 10); }); 
    }

    $('#stat-brilliant').text(stats.brilliant);
    $('#stat-great').text(stats.great);
    $('#stat-best').text(stats.best);
    $('#stat-excellent').text(stats.excellent);
    $('#stat-good').text(stats.good);
    $('#stat-book').text(stats.book);
    $('#stat-inaccuracy').text(stats.inaccuracy);
    $('#stat-mistake').text(stats.mistake);
    $('#stat-miss').text(stats.miss);
    $('#stat-blunder').text(stats.blunder);

    $('#modal-title').text('Analysis Complete!');
    $('#progress-bar').hide();
    $('#stats-container').fadeIn();
}

function resetGame() {
    $('#checkmate-banner').hide(); 
    $('#analysis-modal').fadeOut();
    game.clear();               
    game.reset();               
    board.start();              
    updateStatus();             
}

$(document).ready(function() {
    try {
        var config = {
            draggable: true, position: 'start',
            onDragStart: onDragStart, onDrop: onDrop, onSnapEnd: onSnapEnd,
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };
        board = Chessboard('myBoard', config);
    } catch (e) {
        alert("Board Error: " + e.message);
    }
});
