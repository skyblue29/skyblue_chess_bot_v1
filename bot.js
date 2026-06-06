var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

// 1. 기물 가치
var PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 20000 };

// 2. 미드게임 위치 점수판 (PST)
var PAWN_TABLE = [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
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
    [  0,  0,  0,  0,  0,  0,  0,  0],
    [  5, 10, 10, 10, 10, 10, 10,  5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [  0,  0,  0,  5,  5,  0,  0,  0]
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
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
];

// 3. 엔진 핵심 평가 함수
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

// 4. 미니맥스 + 알파베타 알고리즘
function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) return evaluateBoard(game.board());
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

// 5. 봇 턴 계산 (가지치기 최적화)
function getBestMove() {
    var moves = game.moves();
    var bestMove = null;
    var bestValue = Infinity;
    
    // 공격적인 수를 먼저 계산하도록 정렬
    moves.sort(function(a, b) {
        return (b.indexOf('x') !== -1 ? 1 : 0) - (a.indexOf('x') !== -1 ? 1 : 0);
    });
    
    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        game.move(move);
        var boardValue = minimax(2, -Infinity, Infinity, true); // 탐색 깊이(Depth 3)
        game.undo();
        if (boardValue < bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

// 6. UI 이벤트 및 체스 룰 처리
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

// 7. 대국 종료 및 기권 버튼 처리
function triggerGameOver(reason) {
    if (game.history().length < 2) {
        alert("The game is too short to analyze.");
        resetGame();
        return;
    }
    $status.text('Game Over: ' + reason);
    $('#modal-title').text('Analyzing Game... (' + reason + ')');
    $('#stats-container').hide();
    $('#progress-bar').show();
    $('#analysis-modal').css('display', 'flex');
    runAnalysis(); 
}

// 8. 🌟 체스닷컴 기준 적용 심화 분석 알고리즘
async function runAnalysis() {
    let history = game.history();
    let tempGame = new Chess();
    let stats = { book:0, brilliant:0, great:0, best:0, excellent:0, good:0, inaccuracy:0, mistake:0, miss:0, blunder:0 };

    for (let i = 0; i < history.length; i++) {
        let isWhite = (i % 2 === 0);
        let moveStr = history[i];

        // 오프닝 이론 판정 (처음 8수)
        if (i < 8) {
            stats.book++;
            tempGame.move(moveStr);
        } else {
            let evalBefore = evaluateBoard(tempGame.board());
            tempGame.move(moveStr);
            let evalAfter = evaluateBoard(tempGame.board());
            
            // 점수 변동폭 계산
            let delta = isWhite ? (evalAfter - evalBefore) : (evalBefore - evalAfter);
            let prevMoveStr = i > 0 ? history[i-1] : ""; 

            // 엄격한 분류 기준 적용
            if (delta <= -300) {
                stats.blunder++; 
            } else if (delta <= -150) {
                if (prevMoveStr.includes('x') || prevMoveStr.includes('+')) {
                    stats.miss++;
                } else {
                    stats.mistake++;
                }
            } else if (delta <= -50) {
                stats.inaccuracy++;
            } else if (delta > 80 && moveStr.includes('x')) {
                stats.brilliant++;
            } else if (delta > 50) {
                stats.great++;
            } else if (delta > 0) {
                stats.best++;
            } else if (delta >= -10) {
                stats.excellent++;
            } else {
                stats.good++;
            }
        }

        // 분석 막대그래프 애니메이션
        let percent = Math.round(((i + 1) / history.length) * 100);
        $('#progress-fill').css('width', percent + '%');
        await new Promise(r => setTimeout(r, 20)); // 브라우저 멈춤 방지
    }

    // 결과 화면 출력
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

// 9. 대국 초기화 (새 게임)
function resetGame() {
    $('#analysis-modal').fadeOut();
    game.clear();               
    game.reset();               
    board.start();              
    updateStatus();             
}

// 초기 설정
var config = {
    draggable: true, position: 'start',
    onDragStart: onDragStart, onDrop: onDrop, onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};
board = Chessboard('myBoard', config);
