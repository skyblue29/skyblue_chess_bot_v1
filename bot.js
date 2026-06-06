var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 20000 };

// 🌟 핵심 오프닝 족보 (이 정석대로 폰부터 밉니다)
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

// 🌟 강제 폰 전개 유도 점수판 (안 밀면 -40점 감점, 밀면 +60~100점 떡상)
var PAWN_TABLE = [
    [  0,  0,  0,  0,  0,  0,  0,  0], 
    [ 10, 10, 10,-40,-40, 10, 10, 10], // e, d 폰 안 움직이면 마이너스 폭탄!
    [ 10, 10, 20, 20, 20, 20, 10, 10], 
    [ 10, 10, 20, 60, 60, 20, 10, 10], // e5, d5로 밀면 압도적 최고점 부여
    [ 20, 20, 30, 40, 40, 30, 20, 20], 
    [ 30, 30, 40, 50, 50, 40, 30, 30], 
    [ 80, 80, 80, 80, 80, 80, 80, 80], 
    [  0,  0,  0,  0,  0,  0,  0,  0]  
];

// 나이트 점수 대폭 너프 (폰이 우선순위가 되도록)
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
        // 🌟 체크메이트 즉시 발동 패치: 빨리 끝낼수록 depth 점수를 1000배 증폭시켜서 눈앞의 킬각을 절대 안 놓침!
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
    
    // 1. 오프닝 족보 확인
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
    
    // 공격, 체크(+), 체크메이트(#)를 가장 먼저 확인하도록 정렬
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

        // 🌟 나이트 버그 완전 척결을 위한 핵폭탄급 하드코딩
        // 초반 8수 이내일 때, e5, d5, c5 폰 전진이 가능하면 점수를 -500점(가장 좋음)으로 강제 조작!
        if (game.history().length <= 8) {
            if (move === 'e5' || move === 'd5' || move === 'c5' || move === 'e6' || move === 'd6') {
                boardValue -= 500; 
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
        let winnerText = (game.turn() === 'w') ? "CHECKMATE!<br>Black Wins" : "CHECKMATE!<br>
