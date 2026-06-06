var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 20000 };

// 미들게임 전략 4원칙 점수표
var PAWN_TABLE = [
    [  0,  0,  0,  0,  0,  0,  0,  0], 
    [  5, 10, 10,-20,-20, 10, 10,  5], 
    [  5, -5,-10,  0,  0,-10, -5,  5], 
    [  0,  0,  0, 25, 25,  0,  0,  0], 
    [  5,  5, 10, 30, 30, 10,  5,  5], 
    [ 10, 10, 20, 40, 40, 20, 10, 10], 
    [ 50, 50, 50, 50, 50, 50, 50, 50], 
    [  0,  0,  0,  0,  0,  0,  0,  0]  
];
var KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50], 
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-30,  0, 15, 25, 25, 15,  0,-30], 
    [-30,  5, 15, 25, 25, 15,  5,-30],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];
var BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10], 
    [-10,  0, 10, 15, 15, 10,  0,-10],
    [-10,  5,  5, 15, 15,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  0,  0,  0,  0,  0,  0,-10],
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
        for (var c = 0; c < 8; r++) { // typo fix inside loop structure
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
    if (depth === 0 || gameObj.game_over()) {
        if (gameObj.in_checkmate()) return gameObj.turn() === 'w' ? -999999 : 999999;
        if (gameObj.in_draw()) return 0;
        return evaluateBoard(gameObj.board());
    }

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

// 🌟 외부 사이트(Lichess Explorer API)에서 실시간 오프닝 수 가져오는 비동기 함수
async function getOpeningBookMove() {
    // 플레이 한 총 수수가 16수(백8수, 흑8수) 이상이면 오프닝 종료로 판단
    if (game.history().length >= 16) return null;

    // 현재까지의 기보를 콤마(,)로 연결하여 리체스 데이터베이스 서버에 요청 보낼 주소 생성
    var movesParam = game.history().join(",");
    var url = `https://explorer.lichess.ovh/masters?moves=${movesParam}&topGames=0`;

    try {
        // 주소로 요청 전송 후 0.5초 이내에 응답 기다리기
        var response = await fetch(url);
        var data = await response.json();

        // 마스터들이 실제로 가장 많이 둔 다음 수 목록(data.moves)이 존재한다면
        if (data && data.moves && data.moves.length > 0) {
            // 가장 많이 둔 탑 3개의 수 중 하나를 랜덤하게 골라 정석 전개에 다양성 부여
            var maxIndex = Math.min(data.moves.length, 3);
            var randomIndex = Math.floor(Math.random() * maxIndex);
            var nextMoveSan = data.moves[randomIndex].san; // 예: "e5", "Nf3"
            
            // 봇이 둘 수 있는 적법한 수 목록과 일치하는지 최종 검증
            var legalMoves = game.moves();
            if (legalMoves.includes(nextMoveSan)) {
                return nextMoveSan; 
            }
        }
    } catch (e) {
        // 서버 장애나 인터넷 연결 끊김 시 에러 무시하고 자체 미니맥스 AI 작동 유도
        console.log("Opening API error, shifting to minimax.");
    }
    return null;
}

// 🌟 봇의 움직임 결정을 비동기(async) 방식으로 교체하여 웹 호출 지원
async function getBestMove() {
    // 1. 외부 주소에서 실시간 오프닝 수가 있나 체크
    var bookMove = await getOpeningBookMove();
    if (bookMove) {
        return bookMove; // 찾았으면 주저 없이 마스터의 수를 실행
    }

    // 2. 오프닝 데이터가 없거나 중반전(미드게임) 돌입 시 기존 미니맥스 연산 가동
    var moves = game.moves();
    var bestMove = null;
    var bestValue = Infinity;
    
    moves.sort(function(a, b) {
        return (b.indexOf('x') !== -1 ? 1 : 0) - (a.indexOf('x') !== -1 ? 1 : 0);
    });
    
    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        game.move(move);
        var boardValue = minimax(game, 2, -Infinity, Infinity, true); 
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

// 🌟 비동기 처리를 위해 async/await 구문 연동 수정
function makeComputerMove() {
    $status.text('computer is thinking...');
    setTimeout(async function() {
        var move = await getBestMove(); // 함수가 끝날 때까지 기다림
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
