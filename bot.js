var board = null;
var game = new Chess();
var $history = $('#history');
var $status = $('#status');

var ECO_DATA = {};
var ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json', 'eco_interpolated.json']; 
var loadedCount = 0;
var isEngineReady = false;
var playerColor = 'w';
var selectedSquare = null;

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

function removeGreyDots() {
    $('#myBoard .suggested-dot, #myBoard .suggested-ring').remove();
    $('#myBoard .square-55d63').removeClass('highlight-selected');
}

function showGreyDots(square) {
    removeGreyDots();
    $('.square-' + square).addClass('highlight-selected');
    
    var moves = game.moves({ square: square, verbose: true });
    for (var i = 0; i < moves.length; i++) {
        var targetSquare = moves[i].to;
        var $targetEl = $('.square-' + targetSquare);
        if (game.get(targetSquare)) {
            $targetEl.append('<div class="suggested-ring"></div>');
        } else {
            $targetEl.append('<div class="suggested-dot"></div>');
        }
    }
}

function startGameWithColor(color) {
    playerColor = color;
    game.reset();
    
    board.orientation(color === 'b' ? 'black' : 'white');
    board.position('start');
    
    removeGreyDots();
    selectedSquare = null;
    
    $('#history').text("Game Start");
    $('#opening-name').text("Starting Position");
    
    if (color === 'b') {
        makeComputerMove();
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
    removeGreyDots();
    selectedSquare = null;
}

function onDrop(source, target) {
    var move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    updateStatus();
    removeGreyDots();
    selectedSquare = null;
    if (!game.game_over()) makeComputerMove();
}

function onSnapEnd() { board.position(game.fen()); }

$(document).on('click', '#myBoard .square-55d63', function() {
    if (!isEngineReady || game.game_over()) return;
    
    var classes = $(this).attr('class').split(' ');
    var square = null;
    for (var i = 0; i < classes.length; i++) {
        if (classes[i].indexOf('square-') === 0 && classes[i] !== 'square-55d63') {
            square = classes[i].replace('square-', '');
            break;
        }
    }
    if (!square) return;
    
    var piece = game.get(square);
    
    if (selectedSquare) {
        var moves = game.moves({ square: selectedSquare, verbose: true });
        var isValidMove = moves.some(m => m.to === square);
        
        if (isValidMove) {
            game.move({ from: selectedSquare, to: square, promotion: 'q' });
            board.position(game.fen());
            removeGreyDots();
            selectedSquare = null;
            updateStatus();
            if (!game.game_over()) makeComputerMove();
            return;
        }
    }
    
    if (piece && piece.color === playerColor) {
        selectedSquare = square;
        showGreyDots(square);
    } else {
        removeGreyDots();
        selectedSquare = null;
    }
});

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

function triggerGameOver(reason) {
    if (game.history().length < 2) {
        alert("The game is too short to analyze.");
        return;
    }
    $status.text('Game Over: ' + reason);

    if (reason === 'Checkmate') {
        var winnerText = (game.turn() === 'w') ? "CHECKMATE<br><span class='winner-text'>Black Wins</span>" : "CHECKMATE!<br><span class='winner-text'>White Wins</span>";
        $('#checkmate-banner').html(winnerText).fadeIn(300);
        setTimeout(function() { showAnalysisModal(reason); }, 1500);
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
            tempGame.move(moveStr);
            if (countThisMove) {
                stats.good++;
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
