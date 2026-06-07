importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

var PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
var PAWN_TABLE = [
    [0,0,0,0,0,0,0,0],[70,70,70,70,70,70,70,70],[30,30,40,50,50,40,30,30],
    [10,10,20,40,40,20,10,10],[5,5,10,30,30,10,5,5],[5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
];
var KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,5,5,0,-20,-40],[-30,5,15,20,20,15,5,-30],
    [-30,0,20,25,25,20,0,-30],[-30,0,20,25,25,20,0,-30],[-30,5,15,20,20,15,5,-30],
    [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
];
var BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],[-10,5,0,0,0,0,5,-10],[-10,0,10,15,15,10,0,-10],
    [-10,10,15,20,20,15,10,-10],[-10,10,15,20,20,15,10,-10],[-10,0,10,15,15,10,0,-10],
    [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
];
var ROOK_TABLE = [
    [0,0,0,5,5,0,0,0],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[5,10,10,10,10,10,10,5],[0,0,0,0,0,0,0,0]
];
var QUEEN_TABLE = [
    [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],
    [-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20]
];
var KING_TABLE = [
    [20,30,10,0,0,10,30,20],[20,20,0,0,0,0,20,20],[-10,-20,-20,-20,-20,-20,-20,-10],
    [-20,-30,-30,-40,-40,-30,-30,-20],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30]
];

var evalCache = {};

function evaluateBoard(gameObj) {
    var fenPos = gameObj.fen().split(' ')[0];
    if (evalCache[fenPos] !== undefined) return evalCache[fenPos];

    var boardMatrix = gameObj.board();
    var score = 0;
    var wk = null, bk = null, wMajorMinor = 0, bMajorMinor = 0, wBishopColor = null;

    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
            var p = boardMatrix[r][c];
            if (p) {
                if (p.color === 'w') {
                    if (p.type !== 'p' && p.type !== 'k') wMajorMinor++;
                    if (p.type === 'k') wk = {r:r, c:c};
                    if (p.type === 'b') wBishopColor = ((r+c)%2===0) ? 'light' : 'dark';
                } else {
                    if (p.type !== 'p' && p.type !== 'k') bMajorMinor++;
                    if (p.type === 'k') bk = {r:r, c:c};
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
                var tableRow = (piece.color === 'w') ? (7-r) : r;
                var tableCol = c;

                if (piece.type === 'p') {
                    bonus = PAWN_TABLE[tableRow][tableCol];
                    if (isEndgame) bonus += ((7-tableRow)*30); 
                }
                else if (piece.type === 'n') bonus = KNIGHT_TABLE[tableRow][tableCol];
                else if (piece.type === 'b') bonus = BISHOP_TABLE[tableRow][tableCol];
                else if (piece.type === 'r') bonus = ROOK_TABLE[tableRow][tableCol];
                else if (piece.type === 'q') bonus = QUEEN_TABLE[tableRow][tableCol];
                else if (piece.type === 'k') bonus = isEndgame ? -KING_TABLE[tableRow][tableCol] : KING_TABLE[tableRow][tableCol];

                var pieceScore = val + bonus;

                if (isEndgame && piece.type !== 'p' && piece.type !== 'k') {
                    var enemyKing = (piece.color === 'w') ? bk : wk;
                    var myKing = (piece.color === 'w') ? wk : bk;
                    if (enemyKing && myKing) {
                        var enemyKingMopUp = Math.max(Math.abs(enemyKing.c-3.5), Math.abs(enemyKing.r-3.5)) * 10;
                        enemyKingMopUp += (14 - (Math.abs(myKing.r-enemyKing.r) + Math.abs(myKing.c-enemyKing.c))) * 5;
                        
                        if (piece.type === 'b' || piece.type === 'n') {
                            if (wBishopColor === 'light') {
                                enemyKingMopUp += (14 - Math.min(Math.abs(enemyKing.r) + Math.abs(enemyKing.c), Math.abs(enemyKing.r-7) + Math.abs(enemyKing.c-7))) * 15;
                            } else if (wBishopColor === 'dark') {
                                enemyKingMopUp += (14 - Math.min(Math.abs(enemyKing.r-7) + Math.abs(enemyKing.c), Math.abs(enemyKing.r) + Math.abs(enemyKing.c-7))) * 15;
                            }
                        }
                        pieceScore += enemyKingMopUp;
                    }
                }
                score += (piece.color === 'w') ? pieceScore : -pieceScore;
            }
        }
    }
    evalCache[fenPos] = score;
    return score;
}

function orderMoves(moves) {
    var scoredMoves = [];
    for (var i = 0; i < moves.length; i++) {
        var m = moves[i];
        var s = 0;
        if (m.indexOf('#') !== -1) s += 5000;
        else if (m.indexOf('+') !== -1) s += 500;
        if (m.indexOf('x') !== -1) s += 200;
        scoredMoves.push({move:m, score:s});
    }
    scoredMoves.sort(function(a,b) { return b.score - a.score; });
    var result = [];
    for (var j = 0; j < scoredMoves.length; j++) result.push(scoredMoves[j].move);
    return result;
}

function quiesce(gameObj, alpha, beta, isMax, qsDepth) {
    var stand_pat = evaluateBoard(gameObj);
    if (qsDepth === 0) return stand_pat;

    if (isMax) {
        if (stand_pat >= beta) return beta;
        if (alpha < stand_pat) alpha = stand_pat;
    } else {
        if (stand_pat <= alpha) return alpha;
        if (beta > stand_pat) beta = stand_pat;
    }

    var moves = gameObj.moves();
    var captureMoves = [];
    for (var i = 0; i < moves.length; i++) {
        if (moves[i].indexOf('x') !== -1 || moves[i].indexOf('+') !== -1 || moves[i].indexOf('#') !== -1) captureMoves.push(moves[i]);
    }

    if (captureMoves.length === 0) return stand_pat;
    captureMoves = orderMoves(captureMoves);

    for (var i = 0; i < captureMoves.length; i++) {
        gameObj.move(captureMoves[i]);
        var score = quiesce(gameObj, alpha, beta, !isMax, qsDepth - 1);
        gameObj.undo();
        if (isMax) {
            if (score > stand_pat) stand_pat = score;
            if (stand_pat >= beta) return beta;
            if (stand_pat > alpha) alpha = stand_pat;
        } else {
            if (score < stand_pat) stand_pat = score;
            if (stand_pat <= alpha) return alpha;
            if (stand_pat < beta) beta = stand_pat;
        }
    }
    return stand_pat;
}

function minimax(gameObj, depth, alpha, beta, isMax) {
    if (gameObj.game_over()) {
        if (gameObj.in_checkmate()) return gameObj.turn() === 'w' ? (-999999+(depth*1000)) : (999999-(depth*1000));
        return 0;
    }
    if (depth === 0) return quiesce(gameObj, alpha, beta, isMax, 2);

    var moves = orderMoves(gameObj.moves());
    var bestEval = isMax ? -Infinity : Infinity;
    
    for (var i = 0; i < moves.length; i++) {
        gameObj.move(moves[i]);
        var ev = minimax(gameObj, depth-1, alpha, beta, !isMax);
        gameObj.undo();
        
        if (isMax) {
            bestEval = Math.max(bestEval, ev);
            alpha = Math.max(alpha, bestEval);
        } else {
            bestEval = Math.min(bestEval, ev);
            beta = Math.min(beta, bestEval);
        }
        if (beta <= alpha) break;
    }
    return bestEval;
}

self.onmessage = function(e) {
    var data = e.data;
    var fen = data.fen;
    var isWhite = data.isWhite;
    var moveHistoryLength = data.moveHistoryLength;
    var legalMovesStr = data.legalMoves;
    
    var tempGame = new Chess(fen);
    var legalMoves = orderMoves(legalMovesStr);
    
    evalCache = {};
    var bestMove = null;
    var bestValue = isWhite ? -Infinity : Infinity;
    
    for (var i = 0; i < legalMoves.length; i++) {
        var move = legalMoves[i];
        tempGame.move(move);
        var boardValue = minimax(tempGame, 2, -Infinity, Infinity, !isWhite);
        
        if (moveHistoryLength < 14) {
            if (move==='a3'||move==='a4'||move==='h3'||move==='h4'||move==='a6'||move==='a5'||move==='h6'||move==='h5') {
                boardValue += isWhite ? -50 : 50;
            }
            if (move.charAt(0)==='N' || move.charAt(0)==='B') {
                boardValue += isWhite ? 20 : -20;
            }
        }
        tempGame.undo();
        
        if (isWhite) {
            if (boardValue > bestValue) { bestValue = boardValue; bestMove = move; }
        } else {
            if (boardValue < bestValue) { bestValue = boardValue; bestMove = move; }
        }
    }
    
    // 메인 스레드로 결과 반환
    self.postMessage({ bestMove: bestMove || legalMoves[Math.floor(Math.random()*legalMoves.length)] });
};
