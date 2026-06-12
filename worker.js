importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

var game = new Chess();

var pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

var pawnEvalWhite = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

var pawnEvalEndgameWhite = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [150,150,150,150,150,150,150,150],
    [80, 80, 80, 80, 80, 80, 80, 80],
    [40, 40, 40, 40, 40, 40, 40, 40],
    [20, 20, 20, 20, 20, 20, 20, 20],
    [10, 10, 10, 10, 10, 10, 10, 10],
    [5,  5,  5,  5,  5,  5,  5,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

var knightEval = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

var bishopEvalWhite = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

var rookEvalWhite = [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
];

var queenEval = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

var kingEvalMidWhite = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
];

var kingEvalEndWhite = [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
];

function reverseArray(array) {
    return array.slice().reverse();
}

var pawnEvalBlack = reverseArray(pawnEvalWhite);
var pawnEvalEndgameBlack = reverseArray(pawnEvalEndgameWhite);
var bishopEvalBlack = reverseArray(bishopEvalWhite);
var rookEvalBlack = reverseArray(rookEvalWhite);
var kingEvalMidBlack = reverseArray(kingEvalMidWhite);
var kingEvalEndBlack = reverseArray(kingEvalEndWhite);

function evaluateBoard() {
    var totalEvaluation = 0;
    var nonPawnMaterial = 0;

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            var piece = game.board()[i][j];
            if (piece !== null) {
                if (piece.type !== 'p' && piece.type !== 'k') {
                    nonPawnMaterial += pieceValues[piece.type];
                }
            }
        }
    }

    var isEndgame = nonPawnMaterial < 1500;

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation += getPieceValue(game.board()[i][j], i, j, isEndgame);
        }
    }
    return totalEvaluation;
}

function getPieceValue(piece, x, y, isEndgame) {
    if (piece === null) return 0;
    var val = pieceValues[piece.type];
    var pst = 0;

    if (piece.color === 'w') {
        if (piece.type === 'p') pst = isEndgame ? pawnEvalEndgameWhite[x][y] : pawnEvalWhite[x][y];
        else if (piece.type === 'n') pst = knightEval[x][y];
        else if (piece.type === 'b') pst = bishopEvalWhite[x][y];
        else if (piece.type === 'r') pst = rookEvalWhite[x][y];
        else if (piece.type === 'q') pst = queenEval[x][y];
        else if (piece.type === 'k') pst = isEndgame ? kingEvalEndWhite[x][y] : kingEvalMidWhite[x][y];
        return val + pst;
    } else {
        if (piece.type === 'p') pst = isEndgame ? pawnEvalEndgameBlack[x][y] : pawnEvalBlack[x][y];
        else if (piece.type === 'n') pst = knightEval[x][y];
        else if (piece.type === 'b') pst = bishopEvalBlack[x][y];
        else if (piece.type === 'r') pst = rookEvalBlack[x][y];
        else if (piece.type === 'q') pst = queenEval[x][y];
        else if (piece.type === 'k') pst = isEndgame ? kingEvalEndBlack[x][y] : kingEvalMidBlack[x][y];
        return -(val + pst);
    }
}

function scoreMove(move) {
    var score = 0;
    if (move.captured) {
        score += 10 * pieceValues[move.captured] - pieceValues[move.piece];
    }
    if (move.promotion) {
        score += pieceValues[move.promotion];
    }
    return score;
}

function orderMoves(moves) {
    return moves.sort(function(a, b) {
        return scoreMove(b) - scoreMove(a);
    });
}

function quiesce(alpha, beta, isMaximizingPlayer) {
    var standPat = evaluateBoard();
    if (isMaximizingPlayer) {
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (beta > standPat) beta = standPat;
    }

    var moves = game.moves({ verbose: true });
    var captures = moves.filter(function(m) { return m.captured; });
    captures = orderMoves(captures);

    for (var i = 0; i < captures.length; i++) {
        game.move(captures[i]);
        var score = quiesce(alpha, beta, !isMaximizingPlayer);
        game.undo();

        if (isMaximizingPlayer) {
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        } else {
            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
    }
    return isMaximizingPlayer ? alpha : beta;
}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) {
        return quiesce(alpha, beta, isMaximizingPlayer);
    }
    
    var moves = game.moves({ verbose: true });
    if (moves.length === 0) {
        if (game.in_checkmate()) return isMaximizingPlayer ? -99999 : 99999;
        return 0; 
    }
    
    moves = orderMoves(moves);

    if (isMaximizingPlayer) {
        var bestVal = -Infinity;
        for (var i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            var value = minimax(depth - 1, alpha, beta, false);
            game.undo();
            bestVal = Math.max(bestVal, value);
            alpha = Math.max(alpha, bestVal);
            if (beta <= alpha) break;
        }
        return bestVal;
    } else {
        var bestVal = Infinity;
        for (var i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            var value = minimax(depth - 1, alpha, beta, true);
            game.undo();
            bestVal = Math.min(bestVal, value);
            beta = Math.min(beta, bestVal);
            if (beta <= alpha) break;
        }
        return bestVal;
    }
}

onmessage = function(e) {
    game.load(e.data.fen);
    var moves = game.moves({ verbose: true });
    if (moves.length === 0) {
        postMessage({ bestMove: null });
        return;
    }

    moves = orderMoves(moves);
    var bestMove = null;
    var bestValue = e.data.isWhite ? -Infinity : Infinity;
    var searchDepth = 4;

    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        game.move(move);
        var boardValue = minimax(searchDepth - 1, -Infinity, Infinity, !e.data.isWhite);
        game.undo();

        if (e.data.isWhite) {
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
    postMessage({ bestMove: bestMove });
};
