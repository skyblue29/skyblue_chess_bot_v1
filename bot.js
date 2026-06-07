var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var ECO_DATA = {};
var ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json', 'eco_interpolated.json']; 
var loadedCount = 0;
var isEngineReady = false;

// ⚡ Web Worker 엔진 초기화
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
    
    return null; // 족보에 없으면 워커에게 연산 지시
}

function makeComputerMove() {
    $status.text('computer is thinking...');
    
    var openingMove = getEliteOpeningMove();
    if (openingMove) {
        // 족보에 있는 수라면 1초 내로 즉각 반응
        setTimeout(function() {
            game.move(openingMove);
            board.position(game.fen());
            updateStatus();
        }, 300);
    } else {
        // 족보에 없으면 Worker에게 데이터 전송 (백그라운드 연산 시작)
        engineWorker.postMessage({
            fen: game.fen(),
            isWhite: (game.turn() === 'w'),
            moveHistoryLength: game.history().length,
            legalMoves: game.moves()
        });
    }
}

// ⚡ 워커가 연산을 마치고 결과를 보내면 화면에 즉시 적용
engineWorker.onmessage = function(e) {
    var bestMove = e.data.bestMove;
    game.move(bestMove);
    board.position(game.fen());
    updateStatus();
};

function onDragStart(source, piece) {
    if (game.game_over() || piece.search(/^b/) !== -1) return false;
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

    if (game.in_checkmate()) alert("Game Over: Checkmate!");
    else if (game.in_draw()) alert("Game Over: Draw!");
}

$(document).ready(function() {
    board = Chessboard('myBoard', {
        draggable: true, position: 'start', onDragStart: onDragStart, onDrop: onDrop, onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });
});
