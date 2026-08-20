/* Slide-A-Lama — core rules engine.
 * PURE LOGIC ONLY. This file must never touch the DOM, window events or audio.
 * Everything here is deterministic given a seed, which is what tests.html leans on.
 */
(function (global) {
  'use strict';

  var SIZE = 5;
  var MAX_TURNS = 200;
  var LAMA_TOTAL = 10;
  var LAMA_STEP = 60; /* points of lead needed to drag one lama across */

  /* ---------------------------------------------------------------- tiles */

  var TILES = [
    { t: 0, key: 'banana', name: 'בננה',   value: 10, weight: 30 },
    { t: 1, key: 'cherry', name: 'דובדבן', value: 15, weight: 25 },
    { t: 2, key: 'apple',  name: 'תפוח',   value: 20, weight: 20 },
    { t: 3, key: 'grapes', name: 'ענבים',  value: 25, weight: 15 },
    { t: 4, key: 'bell',   name: 'פעמון',  value: 40, weight: 7  },
    { t: 5, key: 'gem',    name: 'יהלום',  value: 60, weight: 3  }
  ];

  var TOTAL_WEIGHT = TILES.reduce(function (s, d) { return s + d.weight; }, 0);

  var uid = 0;
  function makeTile(t) { return { id: ++uid, t: t }; }

  /* ------------------------------------------------------------------ rng */

  /* mulberry32 — tiny, fast, seedable so replays and tests are reproducible */
  function createRNG(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickTileType(rnd) {
    var roll = rnd() * TOTAL_WEIGHT;
    for (var i = 0; i < TILES.length; i++) {
      roll -= TILES[i].weight;
      if (roll < 0) return TILES[i].t;
    }
    return 0;
  }

  /* ---------------------------------------------------------------- board */

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      b.push([null, null, null, null, null]);
    }
    return b;
  }

  function cloneBoard(b) {
    var out = [];
    for (var r = 0; r < SIZE; r++) {
      var row = new Array(SIZE);
      for (var c = 0; c < SIZE; c++) {
        var cell = b[r][c];
        row[c] = cell ? { id: cell.id, t: cell.t } : null;
      }
      out.push(row);
    }
    return out;
  }

  /* "0.3.." style rows -> board. Handy in tests and for the AI's fixtures. */
  function fromTypes(rows) {
    var b = emptyBoard();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var ch = rows[r][c];
        if (ch !== '.' && ch !== ' ') b[r][c] = makeTile(parseInt(ch, 10));
      }
    }
    return b;
  }

  function toTypes(b) {
    return b.map(function (row) {
      return row.map(function (cell) { return cell ? String(cell.t) : '.'; }).join('');
    });
  }

  function columnCount(b, c) {
    var n = 0;
    for (var r = 0; r < SIZE; r++) if (b[r][c]) n++;
    return n;
  }

  function isEmpty(b) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) if (b[r][c]) return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------- moves */

  var ENTRIES = (function () {
    var list = [];
    ['top', 'left', 'right'].forEach(function (side) {
      for (var i = 0; i < SIZE; i++) list.push({ side: side, index: i });
    });
    return list;
  })();

  function legalMoves() {
    /* Every entry point is always playable: a full lane crushes instead of
       blocking, so there is no such thing as a dead arrow. */
    return ENTRIES.map(function (m) { return { side: m.side, index: m.index }; });
  }

  function sameMove(a, b) { return !!a && !!b && a.side === b.side && a.index === b.index; }

  /* Where a tile enters from, in board coordinates (outside the grid). */
  function entryCell(move) {
    if (move.side === 'top') return { r: -1, c: move.index };
    if (move.side === 'left') return { r: move.index, c: -1 };
    return { r: move.index, c: SIZE };
  }

  /* Insert one tile. Returns the new board plus anything that got destroyed. */
  function applyInsert(board, tile, move) {
    var b = cloneBoard(board);
    var crushed = [];
    var r, c;

    if (move.side === 'top') {
      c = move.index;
      var filled = columnCount(b, c);
      if (filled >= SIZE) {
        crushed.push({ r: SIZE - 1, c: c, tile: b[SIZE - 1][c] });
        for (r = SIZE - 1; r > 0; r--) b[r][c] = b[r - 1][c];
        b[0][c] = tile;
      } else {
        b[SIZE - 1 - filled][c] = tile;
      }
    } else if (move.side === 'left') {
      r = move.index;
      if (b[r][SIZE - 1]) crushed.push({ r: r, c: SIZE - 1, tile: b[r][SIZE - 1] });
      for (c = SIZE - 1; c > 0; c--) b[r][c] = b[r][c - 1];
      b[r][0] = tile;
    } else {
      r = move.index;
      if (b[r][0]) crushed.push({ r: r, c: 0, tile: b[r][0] });
      for (c = 0; c < SIZE - 1; c++) b[r][c] = b[r][c + 1];
      b[r][SIZE - 1] = tile;
    }

    return { board: b, crushed: crushed };
  }

  /* Pack every column down to the floor, preserving stack order. */
  function applyGravity(board) {
    var b = cloneBoard(board);
    var moves = [];
    for (var c = 0; c < SIZE; c++) {
      var stack = [];
      for (var r = SIZE - 1; r >= 0; r--) {
        if (b[r][c]) { stack.push({ tile: b[r][c], from: r }); b[r][c] = null; }
      }
      for (var i = 0; i < stack.length; i++) {
        var to = SIZE - 1 - i;
        b[to][c] = stack[i].tile;
        if (stack[i].from !== to) {
          moves.push({ id: stack[i].tile.id, from: { r: stack[i].from, c: c }, to: { r: to, c: c } });
        }
      }
    }
    return { board: b, moves: moves };
  }

  /* --------------------------------------------------------------- scoring */

  /* Every maximal straight run of 3+ identical tiles, horizontal and vertical. */
  function findRuns(board) {
    var runs = [];
    var r, c, len, i, cells;

    for (r = 0; r < SIZE; r++) {
      c = 0;
      while (c < SIZE) {
        var cell = board[r][c];
        if (!cell) { c++; continue; }
        len = 1;
        while (c + len < SIZE && board[r][c + len] && board[r][c + len].t === cell.t) len++;
        if (len >= 3) {
          cells = [];
          for (i = 0; i < len; i++) cells.push({ r: r, c: c + i });
          runs.push({ dir: 'h', t: cell.t, cells: cells });
        }
        c += len;
      }
    }

    for (c = 0; c < SIZE; c++) {
      r = 0;
      while (r < SIZE) {
        var cell2 = board[r][c];
        if (!cell2) { r++; continue; }
        len = 1;
        while (r + len < SIZE && board[r + len][c] && board[r + len][c].t === cell2.t) len++;
        if (len >= 3) {
          cells = [];
          for (i = 0; i < len; i++) cells.push({ r: r + i, c: c });
          runs.push({ dir: 'v', t: cell2.t, cells: cells });
        }
        r += len;
      }
    }

    return runs;
  }

  function lengthMultiplier(len) {
    if (len >= 5) return 2;
    if (len === 4) return 1.5;
    return 1;
  }

  function runPoints(board, run) {
    var base = 0;
    for (var i = 0; i < run.cells.length; i++) {
      var p = run.cells[i];
      base += TILES[board[p.r][p.c].t].value;
    }
    return Math.floor(base * lengthMultiplier(run.cells.length));
  }

  /* Clear matches, drop, repeat. Each pass beyond the first is a cascade and
     is worth its cascade number as a multiplier. */
  function resolveMatches(board, steps) {
    var b = board;
    var total = 0;
    var cascade = 0;

    for (;;) {
      var runs = findRuns(b);
      if (!runs.length) break;
      cascade++;

      var groups = [];
      var stepBase = 0;
      var seen = {};
      var cleared = [];

      for (var i = 0; i < runs.length; i++) {
        var pts = runPoints(b, runs[i]);
        stepBase += pts;
        groups.push({ dir: runs[i].dir, t: runs[i].t, cells: runs[i].cells, len: runs[i].cells.length, points: pts });
        for (var j = 0; j < runs[i].cells.length; j++) {
          var p = runs[i].cells[j];
          var key = p.r + ',' + p.c;
          if (!seen[key]) { seen[key] = true; cleared.push({ r: p.r, c: p.c, tile: b[p.r][p.c] }); }
        }
      }

      var stepPoints = stepBase * cascade;
      total += stepPoints;

      var nb = cloneBoard(b);
      for (var k = 0; k < cleared.length; k++) nb[cleared[k].r][cleared[k].c] = null;

      if (steps) {
        steps.push({
          type: 'match', cascade: cascade, points: stepPoints, base: stepBase,
          groups: groups, cleared: cleared, board: nb
        });
      }
      b = nb;

      var g = applyGravity(b);
      if (g.moves.length && steps) steps.push({ type: 'gravity', moves: g.moves, board: g.board });
      b = g.board;
    }

    return { board: b, points: total, cascades: cascade };
  }

  /* Full move resolution. `steps` is an ordered replay log the renderer walks. */
  function applyMove(board, tile, move) {
    var steps = [];
    var ins = applyInsert(board, tile, move);
    steps.push({
      type: 'insert', move: { side: move.side, index: move.index }, tile: tile,
      from: entryCell(move), crushed: ins.crushed, board: ins.board
    });

    var g = applyGravity(ins.board);
    if (g.moves.length) steps.push({ type: 'gravity', moves: g.moves, board: g.board });

    var res = resolveMatches(g.board, steps);
    return {
      board: res.board, steps: steps, points: res.points,
      cascades: res.cascades, crushed: ins.crushed
    };
  }

  /* Allocation-light variant for the AI: same maths, no replay log. */
  function simulate(board, tile, move) {
    var ins = applyInsert(board, tile, move);
    var g = applyGravity(ins.board);
    var res = resolveMatches(g.board, null);
    return { board: res.board, points: res.points, cascades: res.cascades, crushed: ins.crushed.length };
  }

  /* ---------------------------------------------------------------- lamas */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function lamasForP1(s1, s2) {
    return clamp(5 + Math.floor((s1 - s2) / LAMA_STEP), 0, LAMA_TOTAL);
  }

  /* ---------------------------------------------------------------- state */

  function createState(opts) {
    opts = opts || {};
    var seed = opts.seed != null ? opts.seed : ((Math.random() * 0xffffffff) >>> 0);
    var state = {
      mode: opts.mode || 'ai',                 /* 'ai' | 'hotseat' */
      difficulty: opts.difficulty || 'medium', /* 'easy' | 'medium' | 'hard' */
      seed: seed,
      rnd: createRNG(seed),
      aiRnd: createRNG((seed ^ 0x9E3779B9) >>> 0), /* kept separate so AI thinking never perturbs the tile stream */
      board: emptyBoard(),
      scores: [0, 0],
      current: opts.first || 0,
      turn: 1,
      lamas: 5,
      over: false,
      winner: null,   /* 0 | 1 | -1 (draw) */
      reason: null,   /* 'lamas' | 'turns' */
      nextTile: null
    };
    state.nextTile = makeTile(pickTileType(state.rnd));
    return state;
  }

  function isAITurn(state) {
    return state.mode === 'ai' && state.current === 1 && !state.over;
  }

  function finish(state, winner, reason) {
    state.over = true;
    state.winner = winner;
    state.reason = reason;
  }

  function playMove(state, move) {
    if (state.over) return null;

    var player = state.current;
    var tile = state.nextTile;
    var res = applyMove(state.board, tile, move);

    state.board = res.board;
    state.scores[player] += res.points;

    var lamasBefore = state.lamas;
    state.lamas = lamasForP1(state.scores[0], state.scores[1]);

    if (state.lamas >= LAMA_TOTAL) finish(state, 0, 'lamas');
    else if (state.lamas <= 0) finish(state, 1, 'lamas');
    else if (state.turn >= MAX_TURNS) {
      var w = state.scores[0] === state.scores[1] ? -1 : (state.scores[0] > state.scores[1] ? 0 : 1);
      finish(state, w, 'turns');
    }

    if (!state.over) {
      state.turn++;
      state.current = 1 - player;
      state.nextTile = makeTile(pickTileType(state.rnd));
    }

    return {
      player: player,
      move: { side: move.side, index: move.index },
      tile: tile,
      steps: res.steps,
      points: res.points,
      cascades: res.cascades,
      crushed: res.crushed,
      lamasBefore: lamasBefore,
      lamasAfter: state.lamas,
      over: state.over,
      winner: state.winner,
      reason: state.reason
    };
  }

  global.SAL = global.SAL || {};
  global.SAL.Game = {
    SIZE: SIZE,
    MAX_TURNS: MAX_TURNS,
    LAMA_TOTAL: LAMA_TOTAL,
    LAMA_STEP: LAMA_STEP,
    TILES: TILES,
    ENTRIES: ENTRIES,
    createRNG: createRNG,
    pickTileType: pickTileType,
    makeTile: makeTile,
    emptyBoard: emptyBoard,
    cloneBoard: cloneBoard,
    fromTypes: fromTypes,
    toTypes: toTypes,
    isEmpty: isEmpty,
    columnCount: columnCount,
    legalMoves: legalMoves,
    sameMove: sameMove,
    entryCell: entryCell,
    applyInsert: applyInsert,
    applyGravity: applyGravity,
    findRuns: findRuns,
    lengthMultiplier: lengthMultiplier,
    runPoints: runPoints,
    resolveMatches: resolveMatches,
    applyMove: applyMove,
    simulate: simulate,
    lamasForP1: lamasForP1,
    createState: createState,
    isAITurn: isAITurn,
    playMove: playMove
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.SAL.Game;
})(typeof window !== 'undefined' ? window : globalThis);
