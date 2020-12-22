const DEPTH = 3;
const MIN = -200000;
const MAX = 200000;
class Turochamp {
  constructor(game) {
    this.game = game;
  }
  getEvaluation() {
    const t = this.game.turn();
    this.game.setTurn("w");
    const val = this._getPositionalValue() + 100 * this._getMaterialValue();
    this.game.setTurn(t);
    return val;
  }

  findNextMove() {
    if (this.game.turn() != "w") return null;
    let maxValue = -20000;
    let maxValueMove = null;

    const moves = this.game.moves({ verbose: true });

    for (const move of moves) {
      const val = this._alphaBetaSearch(move, 1, MIN, MAX, false) * 100;
      this.game.move(move);
      val += this._getPositionEvaluation();
      val += this._countKingSafetyScore(move);
      val += this._isCheckMateThreat() ? 1 : 0;
      this.game.undo();

      if (maxValue <= val) {
        maxValue = val;
        maxValueMove = move;
      }
    }
    return maxValueMove;
  }

  _alphaBetaSearch(move, currDepth, alpha, beta, isMax) {
    if (currDepth > DEPTH) {
      this.game.move(move);
      const mval = this._getMaterialValueSub();
      this.game.undo();
      return mval;
    }

    let considerableMoves = 0;
    this.game.move(move);

    if (isMax) {
      // Max
      let best = MIN;
      for (const m of this.game.moves({ verbose: true })) {
        if (m.flags === "c" || m.flags === "e") {
          considerableMoves++;
          const val = this._alphaBetaSearch(
            m,
            currDepth + 1,
            alpha,
            beta,
            false
          );
          best = Math.max(best, val);
          alpha = Math.max(alpha, best);

          if (beta <= alpha) break;
        } else {
          const val = this._getMaterialValueSub();
          best = Math.max(best, val);
          beta = Math.max(beta, best);
          if (beta <= alpha) break;
        }
      }

      if (considerableMoves == 0) {
        // No considerable moves, thus dead position
        const matval = this._getMaterialValueSub();
        this.game.undo();
        return matval;
      }
      this.game.undo();
      return best;
    } else {
      // Min
      let best = MAX;
      for (let m of this.game.moves({ verbose: true })) {
        if (m.flags === "c" || m.flags === "e") {
          considerableMoves++;
          const val = this._alphaBetaSearch(
            m,
            currDepth + 1,
            alpha,
            beta,
            true
          );
          best = Math.min(best, val);
          beta = Math.min(beta, best);
          if (beta <= alpha) break;
        } else {
          const val = this._getMaterialValueSub();
          best = Math.min(best, val);
          beta = Math.min(beta, best);
          if (beta <= alpha) break;
        }
      }
      if (considerableMoves == 0) {
        // No considerable moves, thus dead position
        const matval = this._getMaterialValueSub();
        this.game.undo();
        return matval;
      }
      this.game.undo();

      return best;
    }
  }
  _getPositionEvaluation() {
    const t = this.game.turn();
    this.game.setTurn("w");
    const val = this._getPositionalValue();
    this.game.setTurn(t);
    return val;
  }
  _getPositionalValue() {
    let value = 0;
    // (i)
    let criteria1 =
      this._countRootNumberOfMoves("q") +
      this._countRootNumberOfMoves("b") +
      this._countRootNumberOfMoves("r") +
      this._countRootNumberOfMoves("n");
    value += criteria1;
    // (ii)
    let criteria2 =
      this._countDefendersOfPiece("n") +
      this._countDefendersOfPiece("b") +
      this._countDefendersOfPiece("r");
    value += criteria2;
    // (iii)
    let criteria3 = this._countKingMovesNotCastle();
    value += criteria3;
    // (iv)
    let criteria4 = this._countKingExposedScore();
    value -= criteria4;
    // (vi) ,(vii)
    let criteria6 = this._countPawnScore();
    value += criteria6;
    //(ix)
    value += this._isBlackInCheck() ? 0.5 : 0;

    return value;
  }
  _countRootNumberOfMoves(piece) {
    let value = 0;
    const moves = this.game.moves({ verbose: true });
    for (const move of moves) {
      if (move.color == "w" && move.piece.toLowerCase() == piece) {
        if (move.flags == "c") value += 2;
        else value += 1;
      }
    }
    value = Math.sqrt(value);
    return value;
  }
  _countPawnScore() {
    let value = 0;
    let rank = 8;
    for (let row of this.game.board()) {
      let file = "a";
      for (let sq of row) {
        if (sq == null) {
          file = this._nextChar(file);
          continue;
        }
        if (sq.type === "p" && sq.color === "w") {
          value += (rank - 2) * 0.2;
          const d = this._countSquareDefenders(file + rank, false);
          if (rank > 2 && d >= 1) value += 0.3;
        }
        file = this._nextChar(file);
      }
      rank--;
    }
    return value;
  }
  _countKingMovesNotCastle() {
    let value = 0;
    for (const move of this.game.moves({ verbose: true })) {
      if (
        move.piece.toLowerCase() === "k" &&
        move.flags != "q" &&
        move.flags != "k"
      ) {
        value += 1;
        if (move.flags == "c") value += 1;
      }
    }
    return Math.sqrt(value);
  }
  _countKingExposedScore() {
    let value = 0;
    let sq = this._squaresOfPiece("k")[0];
    let removedKing = this.game.remove(sq);
    this.game.put(
      {
        type: "q",
        color: "w",
      },
      sq
    );

    try {
      for (let move of this.game.moves({
        verbose: true,
        legal: false,
        square: sq,
      })) {
        if (move.piece === "q") {
          value += 1;
          if (move.flags === "c") value += 1;
        }
      }
      this.game.put(removedKing, sq);
    } catch (err) {
      console.log(err);
    }
    return Math.sqrt(value);
  }
  _countKingSafetyScore(movePlayed) {
    let value = 0;
    if (this._isCastlingPossible()) value += 1;

    for (const move of this.game.moves({ verbose: true })) {
      if (move.flags === "k" || move.flags === "q") {
        value += 1;
        break;
      }
    }

    if (movePlayed.flags === "k" || movePlayed.flags === "q") value += 1; // TODO : Can't do it here have to do it at root

    return value;
  }
  _isCheckMateThreat() {
    for(const move of this.game.moves({verbose: true})){
        this.game.move(move);
        if(this.game.in_checkmate()){
            return true;
        }
        this.game.undo();
    }
    return false;
  }
  _isBlackInCheck() {
    this.game.setTurn("b");
    const isCheck = this.game.in_check();
    this.game.setTurn("w");
    return isCheck;
  }
  _isCastlingPossible() {
    const fen = this.game.fen();
    const fenParts = fen.split(" ");
    let castling = fenParts[2];
    for (let ca of castling) {
      if (ca == "K" || ca == "Q") return true;
    }
    return false;
  }
  _countDefendersOfPiece(piece) {
    let value = 0;
    let squares = this._squaresOfPiece(piece);
    for (let sq of squares) {
      let defenders = this._countSquareDefenders(sq);
      if (defenders >= 1) value += 1;
      if (defenders >= 2) value += 0.5;
    }
    return value;
  }
  _countSquareDefenders(square, countPawn = true) {
    // remove the piece and put an enemy queen here
    let defenders = 0;
    const removedPiece = this.game.remove(square);
    this.game.put(
      {
        type: "q",
        color: "b",
      },
      square
    );
    try {
      for (let move of this.game.moves({ verbose: true })) {
        if (move.to === square && (move.flags === "c" || move.flags === "e")) {
          if (move.piece.toLowerCase() === "p" && !countPawn) continue;
          defenders++;
        }
      }
      this.game.remove(square);
      this.game.put(removedPiece, square);
      return defenders;
    } catch (e) {
      console.log("error ", e);
      return 0;
    }
  }
  _squaresOfPiece(pieceType) {
    return this.game.SQUARES.filter((square) => {
      const r = this.game.get(square);
      return r === null
        ? false
        : r.color == "w" && r.type.toLowerCase() === pieceType;
    });
  }
  _getMaterialValue() {
    const B = this._getMaterialValueForColor("b");
    const W = this._getMaterialValueForColor("w");
    return W / B;
  }
  _getMaterialValueSub() {
    const B = this._getMaterialValueForColor("b");
    const W = this._getMaterialValueForColor("w");
    return W - B;
  }
  _getMaterialValueForColor(color) {
    let value = 0;
    for (let row of this.game.board()) {
      for (let sq of row) {
        if (sq === null) continue;
        if (sq.color === color) {
          switch (sq.type) {
            case "p":
              value += 1;
              break;
            case "r":
              value += 5;
              break;
            case "b":
              value += 3.5;
              break;
            case "q":
              value += 10;
              break;
            case "n":
              value += 3;
              break;
          }
        }
      }
    }
    if (this.game.in_checkmate()) {
      value += 100;
    }
    return value;
  }
  _nextChar(c) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
  }
}

export default Turochamp;
