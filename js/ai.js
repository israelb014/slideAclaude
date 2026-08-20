/* Slide-A-Lama — computer opponent.
 * Runs entirely on cloned plain-array boards (see game.js), never on the DOM,
 * so a search can never stall the renderer.
 */
(function (global) {
  'use strict';

  var Game = global.SAL.Game;

  /* Tiles the opponent might plausibly draw, used for the 1-ply reply search.
     Peeking at the real RNG would be cheating, so we average over a small,
     weight-representative sample instead. */
  var REPLY_SAMPLE = [
    { t: 0, p: 0.50 },
    { t: 2, p: 0.33 },
    { t: 5, p: 0.17 }
  ];

  var DELAY_MIN = 400;
  var DELAY_MAX = 900;

  function thinkingDelay(rnd) {
    return DELAY_MIN + Math.floor((rnd ? rnd() : Math.random()) * (DELAY_MAX - DELAY_MIN));
  }

  /* Soft positional bonus: adjacent same-type pairs are matches waiting to
     happen. Only ever used to break ties between equal-scoring moves. */
  function potential(board) {
    var n = 0;
    for (var r = 0; r < Game.SIZE; r++) {
      for (var c = 0; c < Game.SIZE; c++) {
        var cell = board[r][c];
        if (!cell) continue;
        if (c + 1 < Game.SIZE && board[r][c + 1] && board[r][c + 1].t === cell.t) n++;
        if (r + 1 < Game.SIZE && board[r + 1][c] && board[r + 1][c].t === cell.t) n++;
      }
    }
    return n;
  }

  /* Best immediate gain the opponent could squeeze out of `board`, averaged
     over the tiles they might draw. */
  function bestReplyGain(board) {
    var moves = Game.legalMoves();
    var total = 0;
    for (var s = 0; s < REPLY_SAMPLE.length; s++) {
      var best = 0;
      for (var i = 0; i < moves.length; i++) {
        var sim = Game.simulate(board, { id: -1, t: REPLY_SAMPLE[s].t }, moves[i]);
        if (sim.points > best) best = sim.points;
      }
      total += best * REPLY_SAMPLE[s].p;
    }
    return total;
  }

  function evaluateAll(board, tile) {
    var moves = Game.legalMoves();
    var out = [];
    for (var i = 0; i < moves.length; i++) {
      var sim = Game.simulate(board, tile, moves[i]);
      out.push({ move: moves[i], gain: sim.points, board: sim.board, cascades: sim.cascades, crushed: sim.crushed });
    }
    return out;
  }

  function pickBest(scored, rnd) {
    var best = -Infinity;
    var winners = [];
    for (var i = 0; i < scored.length; i++) {
      if (scored[i].score > best + 1e-9) { best = scored[i].score; winners = [scored[i]]; }
      else if (scored[i].score > best - 1e-9) winners.push(scored[i]);
    }
    return winners[Math.floor(rnd() * winners.length)];
  }

  function chooseEasy(state, rnd) {
    var moves = Game.legalMoves();
    return moves[Math.floor(rnd() * moves.length)];
  }

  function chooseMedium(state, rnd) {
    var options = evaluateAll(state.board, state.nextTile);
    var scored = options.map(function (o) {
      /* Greedy on immediate points, with enough jitter to stay unpredictable. */
      return { move: o.move, score: o.gain + potential(o.board) * 0.5 + rnd() * 12 };
    });
    return pickBest(scored, rnd).move;
  }

  function chooseHard(state, rnd) {
    var options = evaluateAll(state.board, state.nextTile);
    var scored = options.map(function (o) {
      var reply = bestReplyGain(o.board);
      return {
        move: o.move,
        score: o.gain - reply * 0.7 + potential(o.board) * 0.6 + rnd() * 2
      };
    });
    return pickBest(scored, rnd).move;
  }

  /* Synchronous decision — cheap enough (a few hundred 5x5 sims) to run inline,
     but callers should still wrap it in the thinking delay for feel. */
  function chooseMove(state) {
    var rnd = (state && (state.aiRnd || state.rnd)) || Math.random;
    var level = (state && state.difficulty) || 'medium';
    if (level === 'easy') return chooseEasy(state, rnd);
    if (level === 'hard') return chooseHard(state, rnd);
    return chooseMedium(state, rnd);
  }

  /* Async wrapper used by the UI: keeps the main thread free during the pause
     and hands back a move via callback. */
  function decide(state, callback) {
    var delay = thinkingDelay(state && (state.aiRnd || state.rnd));
    var timer = setTimeout(function () {
      var move;
      try {
        move = chooseMove(state);
      } catch (err) {
        move = Game.legalMoves()[0];
      }
      callback(move);
    }, delay);
    return function cancel() { clearTimeout(timer); };
  }

  global.SAL.AI = {
    DELAY_MIN: DELAY_MIN,
    DELAY_MAX: DELAY_MAX,
    potential: potential,
    bestReplyGain: bestReplyGain,
    evaluateAll: evaluateAll,
    chooseMove: chooseMove,
    decide: decide,
    thinkingDelay: thinkingDelay
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.SAL.AI;
})(typeof window !== 'undefined' ? window : globalThis);
