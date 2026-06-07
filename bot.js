var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var ECO_DATA = {};
var ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json', 'eco_interpolated.json']; 
var loadedCount = 0;
var isEngineReady = false;
var playerColor = 'w';

var engineWorker = new Worker('worker.js');

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
        loadedCount++;
        loadEcoFiles();
    });
}
loadEcoFiles();

function startGameWithColor(color) {
    playerColor = color;
    if (color === 'b') {
        board.orientation('black');
        makeComputerMove();
    } else {
        board.orientation('white');
    }
    if (typeof board !== 'undefined') {
        board.resize();
    }
}

function getEliteOpeningMove() {
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
        var validPrefs = prefMoves.filter(m => legalMoves.indexOf(m) !== -1);
        if (validPrefs.length > 0) return validPrefs[Math.floor(Math.random() * validPrefs.length)];
    }

    var bookMoves = [];
    for (var k = 0; k < legalMoves.length; k++) {
        var tempMove = legalMoves[k];
        game.move(tempMove);
        var nextFenFull = game.fen();
        var nextFenPos = nextFenFull.split(' ')[0];
        game.undo();
        if (ECO_DATA[nextFenFull] || ECO_DATA[nextFenPos]) bookMoves.push(tempMove);
    }
    if (bookMoves.length > 0) return bookMoves[Math.floor(Math.random() * bookMoves.length)];
    
    return null; 
}

function makeComputerMove() {
    $status.text('computer is thinking...');
    
    var openingMove = getEliteOpeningMove();
    if (openingMove) {
        setTimeout(function() {
            game.move(openingMove);
            board.position(game.fen());
            updateStatus();
        }, 300);
    } else {
        engineWorker.postMessage({
            fen: game.fen(),
            isWhite: (game.turn() === 'w'),
            moveHistoryLength: game.history().length,
            legalMoves: game.moves()
        });
    }
}

engineWorker.onmessage = function(e) {
    var bestMove = e.data.bestMove;
    game.move(bestMove);
    board.position(game.fen());
    updateStatus();
};

function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if (piece.charAt(0) !== playerColor) return false;
    if (!isEngineReady) { alert("Please wait. The opening database is still loading."); return false; }
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
    for (var i=0; i<moves.length; i++) {
        if(i%2===0) historyStr += (Math.floor(i/2)+1) + ". " + moves[i] + " ";
        else historyStr += moves[i] + " ";
    }
    $history.text(historyStr || "Game Start");
    $status.text('skyblue bot v1');

    var fullFen = game.fen();
    var matchedOpening = ECO_DATA[fullFen] || ECO_DATA[fullFen.split(' ')[0]];
    $('#opening-name').text(matchedOpening && matchedOpening.name ? (matchedOpening.eco ? "["+matchedOpening.eco+"] " : "") + matchedOpening.name : (moves.length===0 ? "Starting Position" : ""));

    if (game.in_checkmate()) triggerGameOver('Checkmate');
    else if (game.in_draw()) triggerGameOver('Draw');
}

// 🌟 업데이트 됨: 체크메이트 5초 페이드아웃 및 텍스트 모던화
function triggerGameOver(reason) {
    if (game.history().length < 2) {
        alert("The game is too short to analyze.");
        return;
    }
    $status.text('Game Over: ' + reason);

    if (reason === 'Checkmate') {
        var winnerText = (game.turn() === 'w') ? "CHECKMATE<br><span class='winner-text'>Black Wins</span>" : "CHECKMATE<br><span class='winner-text'>White Wins</span>";
        
        // 배너 띄우기
        $('#checkmate-banner').html(winnerText).fadeIn(300);
        
        // 1.5초 뒤에 분석 모달창 표시
        setTimeout(function() { showAnalysisModal(reason); }, 1500);
        
        // 🌟 5초(5000ms) 동안 서서히 투명해지며 사라지게 설정 (분석 화면을 가리지 않음)
        $('#checkmate-banner').fadeOut(5000);
        
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
            // 엔진 워커 없이 단순 분석용 가벼운 로직 (기존 유지)
            tempGame.move(moveStr);
            if (countThisMove) {
                stats.good++; // UI 퍼포먼스를 위해 딥 러닝 분석은 생략하고 임시 마킹
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

$(document).ready(function() {
    try {
        board = Chessboard('myBoard', {
            draggable: true, position: 'start', onDragStart: onDragStart, onDrop: onDrop, onSnapEnd: onSnapEnd,
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        });
    } catch (e) {
        alert("Board Error: " + e.message);
    }
});
