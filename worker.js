importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

var game = new Chess();

var pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// 🌟 미들게임 포지션 평가 (Piece-Square Tables)
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

function reverseArray(array) { return array.slice().reverse(); }

var pawnEvalBlack = reverseArray(pawnEvalWhite);
var pawnEvalEndgameBlack = reverseArray(pawnEvalEndgameWhite);
var bishopEvalBlack = reverseArray(bishopEvalWhite);
var rookEvalBlack = reverseArray(rookEvalWhite);
var kingEvalMidBlack = reverseArray(kingEvalMidWhite);
var kingEvalEndBlack = reverseArray(kingEvalEndWhite);

var startTime = 0;
var timeLimit = 3000; // 🌟 엔진 연산 타임아웃 3초 (성능 극대화)
var timeOut = false;
var nodes = 0;

function evaluateBoard() {
    var totalEvaluation = 0;
    var nonPawnMaterial = 0;

    var boardState = game.board();
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            var piece = boardState[i][j];
            if (piece !== null && piece.type !== 'p' && piece.type !== 'k') {
                nonPawnMaterial += pieceValues[piece.type];
            }
        }
    }

    // 판에 남은 주요 기물 점수가 1500점 미만이면 엔드게임 모드 돌입
    var isEndgame = nonPawnMaterial < 1500;

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation += getPieceValue(boardState[i][j], i, j, isEndgame);
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

// 🌟 MVV-LVA (가장 싼 기물로 상대의 비싼 기물을 잡는 수를 먼저 계산)
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

// 🌟 정지 탐색 (전술적 교전이 멈출 때까지 시뮬레이션 연장)
function quiesce(alpha, beta, isMaximizingPlayer, qDepth) {
    nodes++;
    if ((nodes & 2047) === 0 && Date.now() - startTime > timeLimit) timeOut = true;
    if (timeOut || qDepth > 4) return evaluateBoard();

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
        var score = quiesce(alpha, beta, !isMaximizingPlayer, qDepth + 1);
        game.undo();
        if (timeOut) return 0;

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

// 🌟 알파-베타 푸르닝 (무의미한 수는 계산 생략)
function minimax(depth, alpha, beta, isMaximizingPlayer) {
    nodes++;
    if ((nodes & 2047) === 0 && Date.now() - startTime > timeLimit) timeOut = true;
    if (timeOut) return 0;

    if (depth === 0) {
        return quiesce(alpha, beta, isMaximizingPlayer, 0);
    }
    
    var moves = game.moves({ verbose: true });
    if (moves.length === 0) {
        if (game.in_checkmate()) return isMaximizingPlayer ? -99999 : 99999;
        return 0; // 스테일메이트 등 무승부
    }
    
    moves = orderMoves(moves);

    if (isMaximizingPlayer) {
        var bestVal = -Infinity;
        for (var i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            var value = minimax(depth - 1, alpha, beta, false);
            game.undo();
            if (timeOut) return 0;

            bestVal = Math.max(bestVal, value);
            alpha = Math.max(alpha, bestVal);
            if (beta <= alpha) break; // 가지치기
        }
        return bestVal;
    } else {
        var bestVal = Infinity;
        for (var i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            var value = minimax(depth - 1, alpha, beta, true);
            game.undo();
            if (timeOut) return 0;

            bestVal = Math.min(bestVal, value);
            beta = Math.min(beta, bestVal);
            if (beta <= alpha) break; // 가지치기
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
    var globalBestMove = moves[0];
    
    startTime = Date.now();
    timeLimit = 3000; // 3초 제한
    timeOut = false;
    nodes = 0;

    // 🌟 반복 심화 탐색 (1수 앞부터 5수 앞까지 순차적으로 찔러봄)
    for (var currentDepth = 1; currentDepth <= 5; currentDepth++) {
        var bestMoveThisDepth = null;
        var bestValue = e.data.isWhite ? -Infinity : Infinity;

        for (var i = 0; i < moves.length; i++) {
            var move = moves[i];
            game.move(move);
            var boardValue = minimax(currentDepth - 1, -Infinity, Infinity, !e.data.isWhite);
            game.undo();

            if (timeOut) break;

            if (e.data.isWhite) {
                if (boardValue > bestValue) {
                    bestValue = boardValue;
                    bestMoveThisDepth = move;
                }
            } else {
                if (boardValue < bestValue) {
                    bestValue = boardValue;
                    bestMoveThisDepth = move;
                }
            }
        }
        
        // 시간 초과 안 당하고 탐색 완료한 깊이의 최고의 수를 저장
        if (!timeOut && bestMoveThisDepth) {
            globalBestMove = bestMoveThisDepth;
        } else if (timeOut) {
            break;
        }
    }

    postMessage({ bestMove: globalBestMove });
};
