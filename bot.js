var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 20000 };

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

// 수정됨: 중앙으로 전진할수록 가산점이 높아지는 정상적인 폰 테이블
var PAWN_TABLE = [
    [  0,  0,  0,  0,  0,  0,  0,  0], 
    [ 50, 50, 50, 50, 50, 50, 50, 50], 
    [ 10, 10, 20, 30, 30, 20, 10, 10], 
    [  5,  5, 10, 25, 25, 10,  5,  5], 
    [  0,  0,  0, 20, 20,  0,  0,  0], 
    [  5, -5,-10,  0,  0,-10, -5,  5], 
    [  5, 10, 10,-20,-20, 10, 10,  5], 
    [  0,  0,  0,  0,  0,  0,  0,  0]  
];

var KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

var BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
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

function evaluateBoard(boardMatrix) {
    var score = 0;
    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) { 
            var piece = boardMatrix[r][c];
            if (piece) {
                var val = PIECE_VALUES[piece.type];
                var bonus = 0;
                var tableRow = (piece.color === 'w') ? (7 - r) : r;
                var tableCol = c;

                if (piece.type === 'p') bonus = PAWN_TABLE[tableRow][tableCol];
                else if (piece.type === 'n') bonus = KNIGHT_TABLE[tableRow][tableCol];
                else if (piece.type === 'b') bonus = BISHOP_TABLE[tableRow][tableCol];
                else if (piece.type === 'r') bonus = ROOK_TABLE[tableRow][tableCol];
                else if (piece.type === 'q') bonus = QUEEN_TABLE[tableRow][tableCol];
                else if (piece.type === 'k') bonus = KING_TABLE[tableRow][tableCol];

                if (piece.color === 'w') score += (val + bonus);
                else score -= (val + bonus);
            }
        }
    }
    return score;
}

function minimax(gameObj, depth, alpha, beta, isMaximizing) {
    if (gameObj.game_over()) {
        if (gameObj.in_checkmate()) return gameObj.turn() === 'w' ? (-999999 - (depth * 1000)) : (999999 + (depth * 1000));
        if (gameObj.in_draw()) return 0;
    }
    if (depth === 0) return evaluateBoard(gameObj.board());

    var moves = gameObj.moves();
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
    var historyStr = game.history().join(" ");
    var legalMoves = game.moves();
    
    // 수정됨: 훨씬 더 깊어지고 촘촘해진 1티어 정석 사전 (히포포타무스 차단)
    var ELITE_OPENINGS = {
        "": ["e4", "d4", "c4", "Nf3"],
        "e4": ["c5", "e5", "e6", "c6"],
        "d4": ["Nf6", "d5", "e6"],
        "c4": ["e5", "c5", "Nf6"],
        "Nf3": ["Nf6", "d5", "c5"],
        
        // 프렌치 디펜스 메인 라인
        "e4 e6": ["d4"],
        "e4 e6 d4": ["d5"],
        "e4 e6 d4 d5": ["Nc3", "Nd2", "e5"],
        "e4 e6 d4 d5 Nc3": ["Nf6", "Bb4"],
        "e4 e6 d4 d5 Nc3 Nf6": ["Bg5", "e5"],
        "e4 e6 d4 d5 e5": ["c5"],
        "e4 e6 d4 d5 e5 c5": ["c3"],

        // 시실리안 디펜스 메인 라인
        "e4 c5": ["Nf3"],
        "e4 c5 Nf3": ["d6", "Nc6", "e6"],
        "e4 c5 Nf3 d6": ["d4"],
        "e4 c5 Nf3 d6 d4": ["cxd4"],
        "e4 c5 Nf3 d6 d4 cxd4": ["Nxd4"],
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4": ["Nf6"],
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6": ["Nc3"],
        "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3": ["a6", "g6", "Nc6"],
        "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3": ["e5", "d6"],

        // 카로칸 디펜스 메인 라인
        "e4 c6": ["d4"],
        "e4 c6 d4": ["d5"],
        "e4 c6 d4 d5": ["Nc3", "exd5", "e5"],
        "e4 c6 d4 d5 Nc3": ["dxe4"],
        "e4 c6 d4 d5 Nc3 dxe4": ["Nxe4"],
        "e4 c6 d4 d5 Nc3 dxe4 Nxe4": ["Bf5", "Nd7"],

        // e4 e5 라인 (루이 로페즈, 이탈리안 등)
        "e4 e5": ["Nf3", "Nc3", "Bc4"],
        "e4 e5 Nf3": ["Nc6", "Nf6"],
        "e4 e5 Nf3 Nc6": ["Bb5", "Bc4"],
        "e4 e5 Nf3 Nc6 Bb5": ["a6", "Nf6"],
        "e4 e5 Nf3 Nc6 Bb5 a6": ["Ba4"],
        "e4 e5 Nf3 Nc6 Bb5 a6 Ba4": ["Nf6"],
        "e4 e5 Nf3 Nc6 Bc4": ["Bc5", "Nf6"],
        "e4 e5 Nf3 Nc6 Bc4 Bc5": ["c3", "O-O", "d3"],

        // d4 라인 (퀸즈 갬빗 등)
        "d4 d5": ["c4", "Nf3", "Bf4"],
        "d4 d5 c4": ["e6", "c6", "dxc4"],
        "d4 d5 c4 e6": ["Nc3", "Nf3"],
        "d4 d5 c4 e6 Nc3": ["Nf6", "Be7"],
        "d4 d5 c4 c6": ["Nf3", "Nc3"],
        "d4 Nf6 c4": ["e6", "g6"],
        "d4 Nf6 c4 e6": ["Nc3", "Nf3"],
        "d4 Nf6 c4 g6": ["Nc3", "g3"]
    };

    if (ELITE_OPENINGS[historyStr]) {
        var prefMoves = ELITE_OPENINGS[historyStr];
        var validPrefs = [];
        for (var p = 0; p < prefMoves.length; p++) {
            if (legalMoves.indexOf(prefMoves[p]) !== -1) {
                validPrefs.push(prefMoves[p]);
            }
        }
        if (validPrefs.length > 0) {
            return validPrefs[Math.floor(Math.random() * validPrefs.length)];
        }
    }

    var isWhite = (game.turn() === 'w');
    var bestMove = null;
    var bestValue = isWhite ? -Infinity : Infinity; 
    
    legalMoves.sort(function(a, b) {
        if (a.indexOf('#') !== -1) return -1;
        if (b.indexOf('#') !== -1) return 1;
        if (a.indexOf('+') !== -1) return -1;
        if (b.indexOf('+') !== -1) return 1;
        return (b.indexOf('x') !== -1 ? 1 : 0) - (a.indexOf('x') !== -1 ? 1 : 0);
    });
    
    for (var i = 0; i < legalMoves.length; i++) {
        var move = legalMoves[i];
        game.move(move);
        
        var boardValue = minimax(game, 2, -Infinity, Infinity, !isWhite); 

        // 수정됨: Anti-Hippopotamus 및 중앙 전개 강제 유도
        if (game.history().length < 14) {
            // 초반에 구석 폰(a, h)을 밀면 가차없이 점수 강등
            if (move === 'a3' || move === 'a4' || move === 'h3' || move === 'h4' || 
                move === 'a6' || move === 'a5' || move === 'h6' || move === 'h5') {
                boardValue += isWhite ? -50 : 50; 
            }
            // 초반에 나이트(N)와 비숍(B)을 전개하면 점수 상승
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
    setTimeout(function() {
        var move = getBestMove(); 
        game.move(move);
        board.position(game.fen());
        updateStatus();
    }, 250);
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
