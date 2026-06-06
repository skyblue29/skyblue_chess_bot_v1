var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 20000 };

// 🌟 오프닝 족보 (나이트 뜀박질 방지용 고정 패턴)
const OPENING_BOOK = {
    "": ["e4", "d4", "c4", "Nf3"],
    "e4": ["e5", "c5", "e6", "c6"],
    "d4": ["Nf6", "d5", "e6"],
    "c4": ["e5", "c5", "Nf6"],
    "Nf3": ["Nf6", "d5", "c5"],
    "e4 e5": ["Nf3", "Nc3", "Bc4"],
    "e4 c5": ["Nf3", "Nc3", "c3"],
    "e4 e6": ["d4"],
    "e4 c6": ["d4"],
    "d4 d5": ["c4", "Nf3", "Bf4"],
    "d4 Nf6": ["c4", "Nf3", "Bg5"],
    "e4 e5 Nf3": ["Nc6", "Nf6", "d6"],
    "e4 c5 Nf3": ["d6", "Nc6", "e6"]
};

// 🌟 위치별 점수판 (폰이 중앙으로 나갈 때 엄청난 가산점 부여)
var PAWN_TABLE = [
    [  0,  0,  0,  0,  0,  0,  0,  0], 
    [ 10, 10, 10,-40,-40, 10, 10, 10], 
    [ 10, 10, 20, 20, 20, 20, 10, 10], 
    [ 10, 10, 20, 60, 60, 20, 10, 10], 
    [ 20, 20, 30, 40, 40, 30, 20, 20], 
    [ 30, 30, 40, 50, 50, 40, 30, 30], 
    [ 80, 80, 80, 80, 80, 80, 80, 80], 
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

// 🌟 버그 해결: c++ 무한 루프 오타를 c++로 정상 수정했습니다!
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
        // 🌟 킬각 패치: 체크메이트 점수를 증폭시켜 눈앞의 1수 메이트를 절대 놓치지 않습니다.
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
    
    // 1. 오프닝 족보 체크
    if (OPENING_BOOK[historyStr]) {
        var bookMoves = OPENING_BOOK[historyStr];
        var chosenMove = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        var legalMoves = game.moves();
        if (legalMoves.includes(chosenMove)) {
            return chosenMove;
        }
    }

    var moves = game.moves();
    var bestMove = null;
    var bestValue = Infinity;
    
    // 체크메이트(#), 체크(+)를 최우선 순위로 연산 정렬
    moves.sort(function(a, b) {
        if (a.includes('#')) return -1;
        if (b.includes('#')) return 1;
        if (a.includes('+')) return -1;
        if (b.includes('+')) return 1;
        return (b.indexOf('x') !== -1 ? 1 : 0) - (a.indexOf('x') !== -1 ? 1 : 0);
    });
    
    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        game.move(move);
        var boardValue = minimax(game, 2, -Infinity, Infinity, true); 

        // 🌟 나이트 고집 차단 장치: 초반 8수 이내에 중앙 폰(e/d/c) 전진이 가능하면 가산점 폭탄 부여
        if (game.history().length <= 8) {
            if (move === 'e5' || move === 'd5' || move === 'c5' || move === 'e6' || move === 'd6') {
                boardValue -= 600; 
            }
        }

        game.undo();
        if (boardValue < bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

function onDragStart(source, piece, position, orientation) {
    if (game.game_over() || piece.search(/^b/) !== -1) return false;
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
    var moves = game.history();
    var historyStr = "";
    for (var i = 0; i < moves.length; i++) {
        if (i % 2 === 0) historyStr += (Math.floor(i / 2) + 1) + ". " + moves[i] + " ";
        else historyStr += moves[i] + " ";
    }
    $history.text(historyStr || "Game Start");
    $status.text('skyblue bot v1');

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
        let winnerText = (game.turn() === 'w') ? "CHECKMATE!<br>Black Wins" : "CHECKMATE!<br>White Wins";
        $('#checkmate-banner').html(winnerText);
        $('#checkmate-banner').fadeIn(300);
        setTimeout(() => { showAnalysisModal(reason); }, 2000);
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
    let history = game.history();
    let tempGame = new Chess();
    let stats = { book:0, brilliant:0, great:0, best:0, excellent:0, good:0, inaccuracy:0, mistake:0, miss:0, blunder:0 };

    for (let i = 0; i < history.length; i++) {
        let isWhite = (i % 2 === 0);
        let moveStr = history[i];
        let countThisMove = isWhite; 

        if (i < 8) {
            if (countThisMove) stats.book++;
            tempGame.move(moveStr);
        } else {
            let evalBefore = minimax(tempGame, 2, -Infinity, Infinity, isWhite);
            tempGame.move(moveStr);
            let evalAfter = minimax(tempGame, 2, -Infinity, Infinity, !isWhite);
            let delta = isWhite ? (evalAfter - evalBefore) : (evalBefore - evalAfter);
            let prevMoveStr = i > 0 ? history[i-1] : ""; 

            if (countThisMove) {
                if (delta <= -250) stats.blunder++; 
                else if (delta <= -100) {
                    if (prevMoveStr.includes('x') || prevMoveStr.includes('+')) stats.miss++; 
                    else stats.mistake++; 
                } else if (delta <= -40) stats.inaccuracy++; 
                else if (delta > 150 && moveStr.includes('x')) stats.brilliant++; 
                else if (delta > 100) stats.great++;
                else if (delta >= -10) stats.best++;
                else if (delta >= -30) stats.excellent++;
                else stats.good++;
            }
        }
        let percent = Math.round(((i + 1) / history.length) * 100);
        $('#progress-fill').css('width', percent + '%');
        await new Promise(r => setTimeout(r, 10)); 
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

var config = {
    draggable: true, position: 'start',
    onDragStart: onDragStart, onDrop: onDrop, onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('myBoard', config);
