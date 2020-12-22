import Chessboard from "chessboardjs";
import { Chess } from "./chess";

console.log(`
|\___   ___\\  \|\  \|\   __  \|\   __  \|\   ____\|\  \|\  \|\   __  \|\   _ \  _   \|\   __  \  
\|___ \  \_\ \  \\\  \ \  \|\  \ \  \|\  \ \  \___|\ \  \\\  \ \  \|\  \ \  \\\__\ \  \ \  \|\  \ 
     \ \  \ \ \  \\\  \ \   _  _\ \  \\\  \ \  \    \ \   __  \ \   __  \ \  \\|__| \  \ \   ____\
      \ \  \ \ \  \\\  \ \  \\  \\ \  \\\  \ \  \____\ \  \ \  \ \  \ \  \ \  \    \ \  \ \  \___|
       \ \__\ \ \_______\ \__\\ _\\ \_______\ \_______\ \__\ \__\ \__\ \__\ \__\    \ \__\ \__\   
        \|__|  \|_______|\|__|\|__|\|_______|\|_______|\|__|\|__|\|__|\|__|\|__|     \|__|\|__|   
`);

const board = Chessboard("board1", {
  draggable: true,
  position: "start",
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  pieceTheme: '/{piece}.png',
});
board.flip();
board.start();
const game = new Chess();
const worker = new Worker('./worker.js');
let isWhite = true;
const thinking = document.querySelector('.thinking');
const scorecard = document.querySelector('.scorecard');
const statusDisplay = document.querySelector('.status');
let moveNumber = 1;
let newdiv = document.createElement('div');
newdiv.id = "move-1";
scorecard.append(newdiv);
let moveString = moveNumber + ". ";
game.header('White', 'Turochamp', 'Black', 'Player');
document.getElementById('download-pgn').addEventListener('click', downloadPGN);

function downloadPGN() {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(game.pgn()));
  element.setAttribute('download', 'turochamp-game-'+Date.now()+'.pgn');

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function onDragStart(source, piece, position, orientation) {
  if(isWhite) {return false;}
  if (game.game_over()) return false;

  if (
    (game.turn() === "w") ||
    (game.turn() === "b" && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
}
function onDrop(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: "q", 
  });

  // illegal move
  if (move === null) return "snapback";

  moveString += " " + move.san;
  document.getElementById('move-'+moveNumber).innerHTML = moveString;
  moveNumber++;
  moveString = moveNumber + ". ";
  newdiv = document.createElement('div');
  newdiv.id = "move-"+moveNumber;
  scorecard.append(newdiv);
  updateStatus(move);
  
}
function updateStatus(move) {
  var status = "";

  var moveColor = "White";
  if (game.turn() === "b") {
    moveColor = "Black";
  }

  if (game.in_checkmate()) {
    status = moveColor + " is checkmated.";
  }

  else if (game.in_draw()) {
    status = "Game over, drawn position";
  }

  else {
    status = moveColor + " to move";
    if (game.in_check()) {
      status += ". Check";
    }
  }
  statusDisplay.innerHTML = status;  
  if(!game.game_over()){ 

    worker.postMessage(game.fen());
    isWhite = true;
    thinking.innerHTML = " is thinking ...";

    worker.onmessage = e =>{
      const nextMove = JSON.parse(e.data);
      if(nextMove != null){
        game.move(nextMove);
        board.position(game.fen());
        moveString += " " + nextMove.san;
        document.getElementById('move-'+moveNumber).innerHTML = moveString;
        updateStatus(nextMove);
      }
      isWhite = false;
      thinking.innerHTML = "";
    }
  }
}
function onSnapEnd () {
    board.position(game.fen())
}

updateStatus();
