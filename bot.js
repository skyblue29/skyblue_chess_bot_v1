var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

// 기물 점수 설정 (파이썬 코드와 동일)
var PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

function evaluateBoard(boardMatrix) {
    var score = 0;
    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
            var piece = boardMatrix[r][c];
            if (piece) {
                var val = PIECE_VALUES[piece.type];
                score += (piece.color === 'w') ? val : -val;
            }
        }
    }
    return score;
}

// 미니맥스 알파-베타 가지치기 알고리즘
function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
        return evaluateBoard(game.board());
    }

    var moves = game.moves();
    if (isMaximizing) {
        var maxEval = -Infinity;
        for (var i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            maxEval = Math.max(maxEval, minimax(depth - 1, alpha, beta, false));
            game.undo();
            alpha = Math.max(alpha, maxEval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        var minEval = Infinity;
        for (var i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            minEval = Math.min(minEval, minimax(depth - 1, alpha, beta, true));
            game.undo();
            beta = Math.min(beta, minEval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// 봇의 최선수 계산 (Depth 3 탐색)
function getBestMove() {
    var moves = game.moves();
    var bestMove = null;
    var bestValue = Infinity; // 흑(Computer)은 점수를 낮추는 것이 목표

    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        game.move(move);
        var boardValue = minimax(2, -Infinity, Infinity, true);
        game.undo();

        if (boardValue < bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

// 유저가 기물을 움직일 때의 규칙 처리
function onDragStart(source, piece, position, orientation) {
    if (game.game_over() || piece.search(/^b/) !== -1) return false;
}

function makeComputerMove() {
    $status.text('computer is thinking...');
    
    // 약간의 딜레이를 주어 자연스럽게 연산하도록 처리
    setTimeout(function() {
        var move = getBestMove();
        game.move(move);
        board.position(game.fen());
        updateStatus();
    }, 250);
}

function onDrop(source, target) {
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // 폰 승진 시 퀸으로 고정
    });

    if (move === null) return 'snapback';

    updateStatus();
    if (!game.game_over()) {
        makeComputerMove();
    }
}

function onSnapEnd() {
    board.position(game.fen());
}

// 상단 바 기보 히스토리 문자열 생성 및 상태 업데이트
function updateStatus() {
    var moves = game.history();
    var historyStr = "";
    for (var i = 0; i < moves.length; i++) {
        if (i % 2 === 0) {
            historyStr += (Math.floor(i / 2) + 1) + ". " + moves[i] + " ";
        } else {
            historyStr += moves[i] + " ";
        }
    }
    $history.text(historyStr || "Game Start");
    $status.text('skyblue bot v1');

    if (game.in_checkmate()) {
        $status.text('Game Over: Checkmate!');
    } else if (game.in_draw()) {
        $status.text('Game Over: Draw');
    }
}

// 체스판 그래픽 초기화
var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png' // 정식 고화질 기물 이미지 자동 연동
};
board = Chessboard('myBoard', config);