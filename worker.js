import { Chess } from "./chess";
import Turochamp from './turochamp/turochamp';

onmessage = (e) =>{
    const fen = e.data;
    const game = new Chess();
    game.load(fen);
    const turochamp = new Turochamp(game);
    postMessage(JSON.stringify(turochamp.findNextMove()));
}