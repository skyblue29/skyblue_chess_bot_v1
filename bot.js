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
var pendingPromotionMove = null;

var engineWorker = new Worker('worker.js');

function loadEcoFiles() {
    if (loadedCount >= ecoFiles.length) {
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

window.selectColor = function(color) {
    if (!isEngineReady) {
        alert("database loading.. please wait");
        return;
    }
    var startScreen = document.getElementById('start-screen');
    var mainGame = document.getElementById('main-game-container');
    startScreen.style.opacity = '0';
    setTimeout(function() {
        startScreen.style.visibility = 'hidden';
        mainGame.style.opacity = '1';
        startGameWithColor(color);
    }, 600);
};

window.handleDevMode = function() {
    var pass = prompt("Enter Developer Password:");
    if (pass === "1234a") {
        var startScreen = document.getElementById('start-screen');
        var mainGame = document.getElementById('main-game-container');
        startScreen.style.opacity = '0';
        setTimeout(function() {
            startScreen.style.visibility = 'hidden';
            mainGame.style.opacity = '1';
            startTestPosition();
        }, 600);
    } else {
        alert("Access Denied.");
    }
};

function startTestPosition() {
    playerColor = 'w';
    var testFen = '8/4P3/8/8/8/8/4K3/k7 w - - 0 1';
    game.load(testFen);
    board.orientation('white');
    board.position(testFen);
    
    removeGreyDots();
    selectedSquare = null;
    pendingPromotionMove = null;
    $('#history').text("Dev Mode: Promotion Test");
    $('#opening-name').text("Test Position Loaded");
    updateStatus();
}

function removeGreyDots() {
    $('#myBoard .suggested-dot, #myBoard .suggested-ring').remove();
    $('#myBoard div[class*="square-"]').removeClass('highlight-selected');
}

function showGreyDots(square) {
    removeGreyDots();
    $('#myBoard .square-' + square).addClass('highlight-selected');
    var moves = game.moves({ square: square, verbose: true });
    for (var i = 0; i < moves.length; i++) {
        var targetSquare = moves[i].to;
        var $targetEl = $('#myBoard .square-' + targetSquare);
        if (game.get(targetSquare)) {
            $targetEl.append('<div class="suggested-ring"></div>');
        } else {
            $targetEl.append('<div class="suggested-dot"></div>');
        }
    }
}

function showPromotionMenu(source, target) {
    pendingPromotionMove = { from: source, to: target };
    var c = playerColor;
    var baseUrl = 'https://chessboardjs.com/img/chesspieces/wikipedia/';
    
    $('#promo-img-q').attr('src', baseUrl + c + 'Q.png');
    $('#promo-img-r').attr('src', baseUrl + c + 'R.png');
    $('#promo-img-b').attr('src', baseUrl + c + 'B.png');
    $('#promo-img-n').attr('src', baseUrl + c + 'N.png');
    
    $('#promotion-modal').fadeIn(200);
}

window.executePromotion = function(promoPiece) {
    $('#promotion-modal').fadeOut(200);
    if (pendingPromotionMove) {
        game.move({ from: pendingPromotionMove.from, to: pendingPromotionMove.to, promotion: promoPiece });
        board.position(game.fen());
        removeGreyDots();
        selectedSquare = null;
        pendingPromotionMove = null;
        updateStatus();
        if (!game.game_over()) makeComputerMove();
    }
};

function startGameWithColor(color) {
    playerColor = color;
    game.reset();
    board.orientation(color === 'b' ? 'black' : 'white');
    board.position('start');
    removeGreyDots();
    selectedSquare = null;
    pendingPromotionMove = null;
    $('#history').text("Game Start");
    $('#opening-name').text("Starting Position");
    if (color === 'b') makeComputerMove();
}

function makeComputerMove() {
    $status.text('computer is thinking...');
    engineWorker.postMessage({
        fen: game.fen(),
        isWhite: (game.turn() === 'w'),
        moveHistoryLength: game.history().length,
        legalMoves: game.moves()
    });
}

engineWorker.onmessage = function(e) {
    var bestMove = e.data.bestMove;
    if(bestMove) {
        game.move(bestMove);
        board.position(game.fen());
    }
    updateStatus();
};

function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if (piece.charAt(0) !== playerColor) return false;
    if (!isEngineReady) return false;
    selectedSquare = source;
    showGreyDots(source);
}

function onDrop(source, target) {
    var moves = game.moves({ verbose: true });
    var moveObj = null;
    for (var i = 0; i < moves.length; i++) {
        if (moves[i].from === source && moves[i].to === target) {
            moveObj = moves[i];
            break;
        }
    }
    if (!moveObj) {
        removeGreyDots();
        selectedSquare = null;
        return 'snapback';
    }
    if (moveObj.flags.indexOf('p') !== -1 || moveObj.flags.indexOf('np') !== -1 || moveObj.flags.indexOf('cp') !== -1 || moveObj.promotion) {
        showPromotionMenu(source, target);
        return 'snapback';
    }
    game.move({ from: source, to: target, promotion: 'q' });
    updateStatus();
    removeGreyDots();
    selectedSquare = null;
    if (!game.game_over()) makeComputerMove();
}

function onSnapEnd() { board.position(game.fen()); }

$(document).on('click', '#myBoard div[class*="square-"]', function(event) {
    if (!isEngineReady || game.game_over()) return;
    if (game.turn() !== playerColor) return; 
    var className = $(this).attr('class');
    var match = className.match(/square-([a-h][1-8])/);
    if (!match) return;
    var clickedSquare = match[1];
    var pieceOnClickedSquare = game.get(clickedSquare);
    if (selectedSquare) {
        var moves = game.moves({ square: selectedSquare, verbose: true });
        var moveObj = null;
        for (var i = 0; i < moves.length; i++) {
            if (moves[i].to === clickedSquare) {
                moveObj = moves[i];
                break;
            }
        }
        if (moveObj) {
            if (moveObj.flags.indexOf('p') !== -1 || moveObj.flags.indexOf('np') !== -1 || moveObj.flags.indexOf('cp') !== -1 || moveObj.promotion) {
                showPromotionMenu(selectedSquare, clickedSquare);
                return;
            }
            game.move({ from: selectedSquare, to: clickedSquare, promotion: 'q' });
            board.position(game.fen());
            removeGreyDots();
            selectedSquare = null;
            updateStatus();
            if (!game.game_over()) makeComputerMove();
            return;
        }
        if (!pieceOnClickedSquare || pieceOnClickedSquare.color !== playerColor) {
            removeGreyDots();
            selectedSquare = null;
            return;
        }
    }
    if (pieceOnClickedSquare && pieceOnClickedSquare.color === playerColor) {
        if (selectedSquare === clickedSquare) {
            removeGreyDots();
            selectedSquare = null;
        } else {
            selectedSquare = clickedSquare;
            showGreyDots(clickedSquare);
        }
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
        var winnerText = (game.turn() === 'w') ? "CHECKMATE<br><span class='winner-text'>Black Wins</span>" : "CHECKMATE<br><span class='winner-text'>White Wins</span>";
        $('#checkmate-banner').html(winnerText).fadeIn(300);
        setTimeout(function() { showAnalysisModal(reason); }, 1500);
        $('#checkmate-banner').fadeOut(5000);
    } else {
        showAnalysisModal(reason);
    }
}

function showAnalysisModal(reason) {
    $('#modal-title').text('analyzing game... (' + reason + ')');
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
            if (countThisMove) stats.good++;
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
    $('#modal-title').text('analysis complete!');
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
