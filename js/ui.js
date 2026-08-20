/* Slide-A-Lama — rendering, input and animation.
 * Owns every DOM node; game.js owns every rule. The renderer is a pure
 * function of the state/step log it is handed, which keeps the logic testable.
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var Game = global.SAL.Game;
  var AI = global.SAL.AI;
  var Audio = global.SAL.Audio;

  /* ==================================================================== svg */

  var INK = 'rgba(58,25,10,.72)';
  var INK_SOFT = 'rgba(58,25,10,.34)';

  var FRUIT = [
    /* banana */
    '<svg viewBox="0 0 48 48"><g fill="' + INK + '">' +
      '<path d="M8.6 12C6 28.8 14.6 40.4 31 43c3.4.5 5.6-1 5.8-3.6.2-2.6-1.5-4.2-4.4-4.7C21 32.8 15.2 25.6 15 13.2c0-3.2-5.9-3.8-6.4-1.2Z"/>' +
      '<path d="M12.8 13.4 13.5 6c.2-2 3.6-1.8 3.5.4l-.6 7.6z"/>' +
      '<path d="M31 43c3.4.5 5.6-1 5.8-3.6v-.6c-1.5 2.4-3.9 3.4-7 3.1z" fill="' + INK_SOFT + '"/>' +
    '</g></svg>',
    /* cherry */
    '<svg viewBox="0 0 48 48"><g fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round">' +
      '<path d="M25 10c-4.5 4-9.5 8-11.5 15"/><path d="M25 10c1.5 6 4.5 10.5 8.5 14"/>' +
    '</g><g fill="' + INK + '">' +
      '<circle cx="14" cy="33" r="8.6"/><circle cx="34" cy="34" r="7.6"/>' +
      '<path d="M25 10c3-3.6 8-4.6 12-2.6-2.6 3.6-7.4 5-12 2.6z" fill="' + INK_SOFT + '"/>' +
    '</g></svg>',
    /* apple */
    '<svg viewBox="0 0 48 48"><g fill="' + INK + '">' +
      '<path d="M24 15.5c3.8-4 11.4-3.4 14.6 2.4 3 5.5 1.6 15.6-3.4 20.8-2.6 2.8-5.6 2-8.6 1.4a12 12 0 0 0-5.2 0c-3 .6-6 1.4-8.6-1.4-5-5.2-6.4-15.3-3.4-20.8 3.2-5.8 10.8-6.4 14.6-2.4z"/>' +
      '<path d="M23 14.4c-.4-3.6.6-6.6 3-9 .9-.9 2.6.5 1.9 1.6-1.4 2.2-2 4.6-1.8 7.4z"/>' +
      '<path d="M27.6 12.6c1-4.2 4.4-6.6 8.8-6.6.6 4.6-3.2 8-8.8 6.6z" fill="' + INK_SOFT + '"/>' +
    '</g></svg>',
    /* grapes */
    '<svg viewBox="0 0 48 48"><g fill="' + INK + '">' +
      '<circle cx="24" cy="17" r="5.2"/><circle cx="15" cy="23" r="5.2"/><circle cx="33" cy="23" r="5.2"/>' +
      '<circle cx="19.5" cy="31" r="5.2"/><circle cx="28.5" cy="31" r="5.2"/><circle cx="24" cy="39" r="5.2"/>' +
      '<path d="M24 12.4c-.6-3 .2-5.6 2.4-7.6 1-.9 2.5.6 1.7 1.7-1.3 1.6-1.9 3.4-1.8 5.9z"/>' +
      '<path d="M28 8.2c1.6-3.2 4.8-4.6 8.6-3.8-.4 4-3.9 6-8.6 3.8z" fill="' + INK_SOFT + '"/>' +
    '</g></svg>',
    /* golden bell */
    '<svg viewBox="0 0 48 48"><g fill="' + INK + '">' +
      '<path d="M24 9.5c-7.4 0-11.4 5-11.4 12.6 0 6.4-1.6 10.4-4.2 12.8-1 .9-.4 2.4 1 2.4h29.2c1.4 0 2-1.5 1-2.4-2.6-2.4-4.2-6.4-4.2-12.8C35.4 14.5 31.4 9.5 24 9.5z"/>' +
      '<circle cx="24" cy="7.4" r="3.2"/><path d="M24 39.6c2.9 0 5 1 5 2.4 0 1.5-2.1 2.5-5 2.5s-5-1-5-2.5c0-1.4 2.1-2.4 5-2.4z"/>' +
      '<path d="M17.6 20.8c0-4.6 2-7.6 5.6-8.4-4.8 0-8 3.2-8 8.4 0 5.6-.8 9.6-2.4 12.4 2.8-2.6 4.8-6.4 4.8-12.4z" fill="rgba(255,255,255,.28)"/>' +
    '</g></svg>',
    /* gem */
    '<svg viewBox="0 0 48 48"><g fill="' + INK + '">' +
      '<path d="M15.4 8h17.2c.7 0 1.3.3 1.7.9l6.4 9.3c.5.8.4 1.9-.3 2.6L25.6 40.4a2.1 2.1 0 0 1-3.2 0L7.6 20.8c-.7-.7-.8-1.8-.3-2.6l6.4-9.3c.4-.6 1-.9 1.7-.9z"/>' +
      '<g fill="rgba(255,255,255,.34)"><path d="M15.4 8h6.2l-3.4 11.4H7.3z"/><path d="M24 40.4 18.2 19.4h11.6z"/></g>' +
    '</g></svg>'
  ];

  var TILE_STYLE = [
    { tint: '#f5cf3f', hi: '#ffeb95', lo: '#cf9a11' },
    { tint: '#e4405f', hi: '#ff8a9d', lo: '#9f1a35' },
    { tint: '#5fb84a', hi: '#a6e390', lo: '#2c7a22' },
    { tint: '#a35ad6', hi: '#d2a0f2', lo: '#672c99' },
    { tint: '#ff8f2e', hi: '#ffc781', lo: '#bf5604' },
    { tint: '#34c9dd', hi: '#93f0f9', lo: '#0c869c' }
  ];

  var ICONS = {
    soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19.5 6a9 9 0 0 1 0 12"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="m17 9 5 6M22 9l-5 6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v9h13v-9"/><path d="M10 19v-5h4v5"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M19.3 12a7.4 7.4 0 1 1-2.1-5.4L20 9"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5 5 5-5"/></svg>',
    trophy: '<svg viewBox="0 0 64 64"><g fill="none" stroke="#f0a92b" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="#ffd77a"/>' +
      '<path d="M18 12h-7v4a9 9 0 0 0 8 9M46 12h7v4a9 9 0 0 1-8 9"/>' +
      '<path d="M32 36v9M23 56h18l-2-9H25z" fill="#ffd77a"/></g>' +
      '<path d="M32 15l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="#b5751a"/></svg>'
  };

  /* A single lama, side view, facing left. `lamaShapes` is the raw geometry in a
     40x46 coordinate space so it can be dropped into any parent SVG with a
     transform; `lamaSVG` wraps it in its own viewBox for standalone use. */
  function lamaShapes(color, shade) {
    return '<g fill="' + shade + '">' +
        '<rect x="11" y="30" width="4.6" height="13" rx="2.3"/><rect x="17.5" y="30" width="4.6" height="13" rx="2.3"/>' +
        '<rect x="25" y="30" width="4.6" height="13" rx="2.3"/><rect x="30.6" y="30" width="4.6" height="13" rx="2.3"/>' +
      '</g>' +
      '<g fill="' + color + '">' +
        '<path d="M36.2 19.4c3-1.4 4.6.8 3.2 4-1 2.4-2.8 3-4.2 1.6z"/>' +
        '<rect x="8.5" y="17.5" width="27" height="16.5" rx="8"/>' +
        '<path d="M12.6 25.5 20 22.6 16.6 6.8 10.4 8.6z"/>' +
        '<ellipse cx="12.4" cy="9.2" rx="6.1" ry="5.6"/>' +
        '<ellipse cx="6.2" cy="12" rx="4.6" ry="3.6"/>' +
        '<path d="M8.4 6.2 8.9.4l3.6 4.6zM13.2 5.2 15.4.8l2.4 5z"/>' +
      '</g>' +
      '<g fill="rgba(255,255,255,.4)"><circle cx="17" cy="24" r="2.6"/><circle cx="24" cy="27" r="3"/><circle cx="30" cy="23.5" r="2.4"/></g>' +
      '<circle cx="10.4" cy="8.6" r="1.35" fill="#2a1220"/>' +
      '<path d="M4.4 12.6h3" stroke="#2a1220" stroke-width="1.1" stroke-linecap="round"/>';
  }

  function lamaSVG(color, shade) {
    return '<svg viewBox="0 0 40 46">' + lamaShapes(color, shade) + '</svg>';
  }

  function markSVG() {
    return '<svg viewBox="0 0 120 120">' +
      '<defs><linearGradient id="mk1" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#ffe9b0"/><stop offset=".55" stop-color="#f0a92b"/><stop offset="1" stop-color="#b5751a"/>' +
      '</linearGradient></defs>' +
      '<circle cx="60" cy="60" r="54" fill="#2a1240" stroke="url(#mk1)" stroke-width="4"/>' +
      '<circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,197,106,.28)" stroke-width="2" stroke-dasharray="6 7"/>' +
      '<g transform="translate(90 32) scale(-1.5 1.5)">' + lamaShapes('#ffd77a', '#c9871d') + '</g>' +
      '</svg>';
  }

  /* ================================================================ storage */

  var STORE = {
    get: function (key, fallback) {
      try {
        var raw = global.localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (err) { return fallback; }
    },
    set: function (key, value) {
      try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ }
    }
  };

  function defaultStats() {
    return { ai: { easy: [0, 0], medium: [0, 0], hard: [0, 0] }, hotseat: [0, 0] };
  }

  function loadStats() {
    var s = STORE.get('sal.stats', null);
    if (!s || !s.ai || !s.hotseat) return defaultStats();
    ['easy', 'medium', 'hard'].forEach(function (k) {
      if (!Array.isArray(s.ai[k])) s.ai[k] = [0, 0];
    });
    if (!Array.isArray(s.hotseat)) s.hotseat = [0, 0];
    return s;
  }

  /* ================================================================== state */

  var els = {};
  var state = null;
  var tileEls = {};
  var lamaEls = [];
  var lamaOwner = [];
  var displayScores = [0, 0];
  var busy = false;
  var cancelAI = null;
  /* Bumped on every new game. Anything async captures the value it started with
     and bails out if the board it was animating no longer exists. */
  var gen = 0;
  var metricsCache = null;
  var confettiStop = null;
  var prefs = {
    mode: STORE.get('sal.mode', 'ai'),
    difficulty: STORE.get('sal.difficulty', 'medium')
  };
  var stats = loadStats();

  var NAMES = { p1: 'שחקן 1', p2: 'שחקן 2', cpu: 'המחשב' };

  function playerName(i) {
    if (i === 0) return NAMES.p1;
    return state && state.mode === 'ai' ? NAMES.cpu : NAMES.p2;
  }

  function $(id) { return doc.getElementById(id); }
  function wait(ms) { return new Promise(function (res) { global.setTimeout(res, ms); }); }

  /* ================================================================ screens */

  function showScreen(id) {
    var list = doc.querySelectorAll('.screen');
    for (var i = 0; i < list.length; i++) list[i].classList.toggle('is-active', list[i].id === id);
    if (id !== 'screen-end' && confettiStop) { confettiStop(); confettiStop = null; }
  }

  /* ================================================================== board */

  function metrics() {
    if (metricsCache) return metricsCache;
    var cell = els.cells.firstChild ? els.cells.firstChild.offsetWidth : 56;
    var boardW = els.board.clientWidth;
    var gap = cell ? (boardW - 5 * cell) / 4 : 6;
    metricsCache = { cell: cell, gap: gap, step: cell + gap };
    return metricsCache;
  }

  function posValue(r, c) {
    return 'translate3d(calc(var(--step) * ' + c + '), calc(var(--step) * ' + r + '), 0)';
  }

  function setPos(el, r, c) {
    var p = posValue(r, c);
    el.style.setProperty('--pos', p);
    el.style.transform = p;
  }

  function tileMarkup(t) {
    var st = TILE_STYLE[t];
    return { style: '--tint:' + st.tint + ';--tint-hi:' + st.hi + ';--tint-lo:' + st.lo + ';', svg: FRUIT[t] };
  }

  function createTileEl(tile, r, c) {
    var el = doc.createElement('div');
    var m = tileMarkup(tile.t);
    el.className = 'tile';
    el.setAttribute('style', m.style);
    el.innerHTML = m.svg;
    setPos(el, r, c);
    els.tiles.appendChild(el);
    tileEls[tile.id] = el;
    return el;
  }

  /* Diff the incoming board against what is on screen: move what stayed,
     spawn what arrived, animate out what vanished. */
  function paint(board, opts) {
    opts = opts || {};
    var alive = {};
    for (var r = 0; r < Game.SIZE; r++) {
      for (var c = 0; c < Game.SIZE; c++) {
        var tile = board[r][c];
        if (!tile) continue;
        alive[tile.id] = true;
        var el = tileEls[tile.id];
        if (el) {
          setPos(el, r, c);
        } else {
          var from = (opts.spawn && opts.spawn.id === tile.id) ? opts.spawn : { r: r, c: c };
          el = createTileEl(tile, from.r, from.c);
          if (from.r !== r || from.c !== c) {
            void el.offsetWidth; /* commit the start position before moving */
            setPos(el, r, c);
          }
        }
      }
    }
    Object.keys(tileEls).forEach(function (id) {
      if (alive[id]) return;
      var gone = tileEls[id];
      delete tileEls[id];
      gone.classList.add(opts.exit || 'pop');
      global.setTimeout(function () {
        if (gone.parentNode) gone.parentNode.removeChild(gone);
      }, 330);
    });
  }

  function clearBoardEls() {
    tileEls = {};
    els.tiles.innerHTML = '';
    els.fx.innerHTML = '';
  }

  function flashLanded(id) {
    var el = tileEls[id];
    if (!el) return;
    el.classList.remove('landed');
    void el.offsetWidth;
    el.classList.add('landed');
  }

  /* ================================================================ effects */

  function floater(text, r, c, tone) {
    var m = metrics();
    var el = doc.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = ((c + 0.5) * m.step) + 'px';
    el.style.top = ((r + 0.5) * m.step) + 'px';
    if (tone) el.style.color = tone;
    els.fx.appendChild(el);
    global.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
  }

  function comboBanner(level) {
    var el = doc.createElement('div');
    el.className = 'combo';
    el.textContent = 'קומבו ×' + level;
    els.fx.appendChild(el);
    global.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 520);
  }

  /* ================================================================== lamas */

  function buildLamas() {
    els.lamas.innerHTML = '';
    lamaEls = [];
    lamaOwner = [];
    for (var i = 0; i < Game.LAMA_TOTAL; i++) {
      var el = doc.createElement('div');
      el.className = 'lama';
      var owner = i < 5 ? 0 : 1;
      el.innerHTML = '<div class="lama-body">' +
        (owner === 0 ? lamaSVG('#ffcf8a', '#c98a2e') : lamaSVG('#8fe3e0', '#2e9b98')) + '</div>';
      els.lamas.appendChild(el);
      lamaEls.push(el);
      lamaOwner.push(owner);
    }
  }

  function paintLamaColor(el, owner) {
    var body = el.firstChild;
    body.innerHTML = owner === 0 ? lamaSVG('#ffcf8a', '#c98a2e') : lamaSVG('#8fe3e0', '#2e9b98');
  }

  function layoutLamas(k, animate) {
    if (!lamaEls.length) return;
    var W = els.bench.clientWidth || 380;
    var lw = lamaEls[0].offsetWidth || 30;
    var gap = lw + 2;
    for (var i = 0; i < Game.LAMA_TOTAL; i++) {
      var owner = i < k ? 0 : 1;
      var count, idx, center;
      if (owner === 0) { count = k; idx = i; center = W * 0.25; }
      else { count = Game.LAMA_TOTAL - k; idx = i - k; center = W * 0.75; }
      var x = center - (count * gap) / 2 + idx * gap;
      x = Math.max(2, Math.min(W - lw - 2, x));

      var el = lamaEls[i];
      el.style.transform = 'translateX(' + x + 'px)';
      el.classList.toggle('face-right', owner === 1);

      if (lamaOwner[i] !== owner) {
        paintLamaColor(el, owner);
        lamaOwner[i] = owner;
        if (animate) {
          el.classList.remove('walking');
          void el.offsetWidth;
          el.classList.add('walking');
          global.setTimeout((function (node) {
            return function () { node.classList.remove('walking'); };
          })(el), 420);
        }
      }
    }
    $('lamacount-0').textContent = String(k);
    $('lamacount-1').textContent = String(Game.LAMA_TOTAL - k);
  }

  /* =============================================================== hud sync */

  function setScore(player, value, bump) {
    var el = $('score-' + player);
    el.textContent = String(value);
    if (bump) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }

  function addScore(player, points) {
    displayScores[player] += points;
    setScore(player, displayScores[player], true);
  }

  function renderNextTile() {
    els.next.innerHTML = '';
    if (!state || !state.nextTile) return;
    var m = tileMarkup(state.nextTile.t);
    var el = doc.createElement('div');
    el.className = 'tile';
    el.setAttribute('style', m.style);
    el.innerHTML = m.svg;
    els.next.appendChild(el);
  }

  function renderTurn() {
    if (!state) return;
    $('turn-count').textContent = String(state.turn);
    $('panel-0').classList.toggle('is-turn', state.current === 0);
    $('panel-1').classList.toggle('is-turn', state.current === 1);
    $('name-0').textContent = playerName(0);
    $('name-1').textContent = playerName(1);

    var text;
    if (state.mode === 'ai') text = state.current === 0 ? 'תור שלך' : 'תור המחשב';
    else text = 'תור ' + playerName(state.current);
    els.turnText.textContent = text;
    els.turnText.style.color = state.current === 0 ? 'var(--p1)' : 'var(--p2)';

    renderNextTile();
    els.hint.textContent = Game.isAITurn(state) ? 'המחשב בוחר את המהלך שלו' : 'בחרו חץ כדי להחליק את האריח פנימה';
  }

  function setArrowsEnabled(on) {
    var list = els.arrows;
    for (var i = 0; i < list.length; i++) list[i].disabled = !on;
  }

  function highlightArrow(move) {
    for (var i = 0; i < els.arrows.length; i++) {
      var a = els.arrows[i];
      var hot = a.dataset.side === move.side && Number(a.dataset.index) === move.index;
      a.classList.toggle('is-hot', hot);
      if (hot) {
        (function (node) {
          global.setTimeout(function () { node.classList.remove('is-hot'); }, 420);
        })(a);
      }
    }
  }

  /* ================================================================ playback */

  function longestRun(groups) {
    var max = 0;
    for (var i = 0; i < groups.length; i++) if (groups[i].len > max) max = groups[i].len;
    return max;
  }

  function centroid(cells) {
    var r = 0, c = 0;
    for (var i = 0; i < cells.length; i++) { r += cells[i].r; c += cells[i].c; }
    return { r: r / cells.length, c: c / cells.length };
  }

  function playSteps(steps, player, myGen) {
    var i = 0;
    function next() {
      if (i >= steps.length || myGen !== gen) return Promise.resolve();
      var s = steps[i++];
      if (s.type === 'insert') {
        Audio.slide();
        paint(s.board, { spawn: { id: s.tile.id, r: s.from.r, c: s.from.c }, exit: 'crush' });
        if (s.crushed.length) {
          global.setTimeout(function () { Audio.crush(); }, 130);
          floater('נמחץ', s.crushed[0].r, s.crushed[0].c, '#c9b3c6');
        }
        return wait(250).then(function () {
          Audio.land();
          flashLanded(s.tile.id);
          return wait(40);
        }).then(next);
      }
      if (s.type === 'gravity') {
        paint(s.board);
        return wait(215).then(function () { Audio.land(); return wait(20); }).then(next);
      }
      /* match */
      Audio.match(longestRun(s.groups), s.cascade);
      addScore(player, s.points);
      var mid = centroid(s.cleared);
      floater('+' + s.points, mid.r, mid.c);
      if (s.cascade > 1) comboBanner(s.cascade);
      paint(s.board, { exit: 'pop' });
      return wait(s.cascade > 1 ? 330 : 300).then(next);
    }
    return next();
  }

  function animateLamas(before, after) {
    if (before === after) { layoutLamas(after, false); return Promise.resolve(); }
    layoutLamas(after, true);
    var moved = Math.min(3, Math.abs(after - before));
    for (var i = 0; i < moved; i++) {
      global.setTimeout(function () { Audio.bleat(); }, i * 150);
    }
    return wait(430);
  }

  /* ================================================================== turns */

  function doMove(move, fromAI) {
    if (busy || !state || state.over) return;
    if (!fromAI && Game.isAITurn(state)) return;

    busy = true;
    setArrowsEnabled(false);
    els.hint.textContent = '';

    var myGen = gen;
    var player = state.current;
    var res = Game.playMove(state, move);
    if (!res) { busy = false; return; }

    playSteps(res.steps, player, myGen)
      .then(function () {
        if (myGen !== gen) return null;
        displayScores[0] = state.scores[0];
        displayScores[1] = state.scores[1];
        setScore(0, displayScores[0], false);
        setScore(1, displayScores[1], false);
        return animateLamas(res.lamasBefore, res.lamasAfter);
      })
      .then(function () {
        if (myGen !== gen) return;
        busy = false;
        if (state.over) { endGame(); return; }
        renderTurn();
        if (Game.isAITurn(state)) startAITurn();
        else setArrowsEnabled(true);
      })
      .catch(function (err) {
        /* Never leave the board locked if an animation misbehaves. */
        if (myGen !== gen) return;
        busy = false;
        setArrowsEnabled(!state.over);
        if (global.console && global.console.error) global.console.error(err);
      });
  }

  function startAITurn() {
    var myGen = gen;
    setArrowsEnabled(false);
    els.turnText.classList.add('thinking');
    cancelAI = AI.decide(state, function (move) {
      cancelAI = null;
      if (myGen !== gen) return;
      els.turnText.classList.remove('thinking');
      highlightArrow(move);
      global.setTimeout(function () {
        if (myGen !== gen) return;
        doMove(move, true);
      }, 130);
    });
  }

  function stopAI() {
    if (cancelAI) { cancelAI(); cancelAI = null; }
    els.turnText.classList.remove('thinking');
  }

  /* =================================================================== game */

  function startGame(mode, difficulty) {
    gen++;
    stopAI();
    prefs.mode = mode;
    if (difficulty) prefs.difficulty = difficulty;
    STORE.set('sal.mode', prefs.mode);
    STORE.set('sal.difficulty', prefs.difficulty);
    renderModeSelection();

    state = Game.createState({ mode: mode, difficulty: prefs.difficulty });
    busy = false;
    displayScores = [0, 0];
    metricsCache = null;
    clearBoardEls();
    setScore(0, 0, false);
    setScore(1, 0, false);
    showScreen('screen-game');

    /* bench width is only known once the screen is laid out */
    global.requestAnimationFrame(function () {
      layoutLamas(5, false);
      for (var i = 0; i < Game.LAMA_TOTAL; i++) {
        var owner = i < 5 ? 0 : 1;
        if (lamaOwner[i] !== owner) { paintLamaColor(lamaEls[i], owner); lamaOwner[i] = owner; }
      }
    });

    renderTurn();
    setArrowsEnabled(true);
    els.hint.textContent = 'בחרו חץ כדי להחליק את האריח פנימה';
    if (Game.isAITurn(state)) startAITurn();
  }

  function recordResult() {
    if (!state || state.winner == null) return;
    if (state.mode === 'ai') {
      var bucket = stats.ai[state.difficulty] || (stats.ai[state.difficulty] = [0, 0]);
      if (state.winner === 0) bucket[0]++;
      else if (state.winner === 1) bucket[1]++;
    } else if (state.winner === 0 || state.winner === 1) {
      stats.hotseat[state.winner]++;
    }
    STORE.set('sal.stats', stats);
    renderStats();
  }

  function endGame() {
    setArrowsEnabled(false);
    recordResult();

    var winner = state.winner;
    var humanWon = state.mode !== 'ai' || winner === 0;
    if (winner === -1) Audio.lose();
    else if (humanWon) Audio.win();
    else Audio.lose();

    var title, sub;
    if (winner === -1) {
      title = 'תיקו!';
      sub = 'הלאמות לא הצליחו להחליט — 200 תורות ואף אחד לא הכריע.';
    } else if (state.mode === 'ai') {
      title = winner === 0 ? 'ניצחתם!' : 'המחשב ניצח';
      sub = winner === 0
        ? 'כל עשר הלאמות עברו לצד שלכם.'
        : 'הלאמות בחרו בצד השני. נסו שוב!';
    } else {
      title = playerName(winner) + ' ניצח!';
      sub = 'כל עשר הלאמות עברו לצד המנצח.';
    }
    if (state.reason === 'turns' && winner !== -1) sub = 'נגמרו 200 התורות — הניצחון נקבע לפי הניקוד.';

    var celebrate = winner !== -1 && humanWon;
    $('end-title').textContent = title;
    $('end-sub').textContent = sub;
    $('end-trophy').innerHTML = celebrate
      ? ICONS.trophy
      : '<svg viewBox="0 0 64 64"><g transform="translate(12 8) scale(.85)">' +
        lamaShapes(winner === -1 ? '#c9b3c6' : '#8fe3e0', winner === -1 ? '#7d6a86' : '#2e9b98') + '</g></svg>';
    $('end-name-0').textContent = playerName(0);
    $('end-name-1').textContent = playerName(1);
    $('end-score-0').textContent = String(state.scores[0]);
    $('end-score-1').textContent = String(state.scores[1]);
    $('end-lamas-0').textContent = state.lamas + ' לאמות';
    $('end-lamas-1').textContent = (Game.LAMA_TOTAL - state.lamas) + ' לאמות';
    doc.querySelectorAll('.end-score').forEach(function (node, idx) {
      node.classList.toggle('is-winner', idx === winner);
    });

    var myGen = gen;
    global.setTimeout(function () {
      if (myGen !== gen) return; /* a restart beat the end screen to it */
      showScreen('screen-end');
      if (celebrate) confettiStop = runConfetti(true);
    }, 520);
  }

  /* =============================================================== confetti */

  function runConfetti(celebrate) {
    var canvas = els.confetti;
    var ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return function () {};
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var colors = ['#ffd77a', '#f0a92b', '#e4405f', '#34c9dd', '#a35ad6', '#5fb84a'];
    var parts = [];
    var count = celebrate ? 110 : 34;
    for (var i = 0; i < count; i++) {
      parts.push({
        x: Math.random() * w,
        y: -20 - Math.random() * h * 0.7,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 1.4 + Math.random() * 2.4,
        w: 5 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.22,
        color: colors[(Math.random() * colors.length) | 0]
      });
    }

    var alive = true;
    var frames = 0;
    function frame() {
      if (!alive) return;
      frames++;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        p.vy += 0.012;
        if (p.y > h + 24) { p.y = -24; p.x = Math.random() * w; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = frames > 260 ? Math.max(0, 1 - (frames - 260) / 90) : 1;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (frames > 350) { alive = false; ctx.clearRect(0, 0, w, h); return; }
      global.requestAnimationFrame(frame);
    }
    global.requestAnimationFrame(frame);
    return function () { alive = false; ctx.clearRect(0, 0, w, h); };
  }

  /* ================================================================== modal */

  var modalOpen = false;

  function closeModal() {
    modalOpen = false;
    els.modal.hidden = true;
    els.modalActions.innerHTML = '';
  }

  function showModal(opts) {
    els.modalTitle.textContent = opts.title;
    els.modalBody.innerHTML = opts.body;
    els.modalActions.innerHTML = '';
    (opts.actions || []).forEach(function (a) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.primary ? 'btn-primary' : 'btn-ghost');
      b.textContent = a.label;
      b.addEventListener('click', function () {
        Audio.click();
        closeModal();
        if (a.onClick) a.onClick();
      });
      els.modalActions.appendChild(b);
    });
    els.modal.hidden = false;
    modalOpen = true;
  }

  function helpBody() {
    var rows = Game.TILES.map(function (t) {
      var st = TILE_STYLE[t.t];
      return '<span class="rule-tile"><span class="swatch" style="--tint:' + st.tint + ';--tint-hi:' + st.hi +
        ';--tint-lo:' + st.lo + '">' + FRUIT[t.t] + '</span>' + t.name + ' · ' + t.value + '</span>';
    }).join('');
    return '<ul>' +
      '<li>הלוח מתחיל ריק. בכל תור מקבלים אריח אחד ובוחרים מאיפה להחליק אותו: מלמעלה, מימין או משמאל.</li>' +
      '<li>אריח שנכנס מלמעלה נופל ונערם. אם הטור מלא — האריח התחתון נמחץ.</li>' +
      '<li>אריח שנכנס מהצד דוחף את כל השורה. אם השורה מלאה — האריח בקצה השני נופל החוצה.</li>' +
      '<li>שלושה אריחים זהים ומעלה בשורה או בטור — מתפוצצים ונזקפים לזכותכם.</li>' +
      '<li>רצף של 4 שווה פי 1.5, רצף של 5 שווה פי 2, וכל קומבו נוסף מכפיל שוב (×2, ×3…).</li>' +
      '<li>על כל 60 נקודות יתרון לאמה אחת עוברת לצד שלכם. עשר לאמות בצד אחד — ניצחון.</li>' +
      '</ul><div class="rule-tiles">' + rows + '</div>';
  }

  function renderStats() {
    var a = stats.ai[prefs.difficulty] || [0, 0];
    var diffName = { easy: 'קל', medium: 'בינוני', hard: 'קשה' }[prefs.difficulty];
    $('stats-ai').textContent = 'רמה ' + diffName + ' · ניצחונות ' + a[0] + ' · הפסדים ' + a[1];
    $('stats-hotseat').textContent = 'שחקן 1: ' + stats.hotseat[0] + ' · שחקן 2: ' + stats.hotseat[1];
  }

  function renderModeSelection() {
    $('btn-mode-ai').classList.toggle('is-selected', prefs.mode === 'ai');
    $('btn-mode-hotseat').classList.toggle('is-selected', prefs.mode === 'hotseat');
  }

  function renderDifficulty() {
    var btns = doc.querySelectorAll('.seg-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-on', btns[i].dataset.diff === prefs.difficulty);
    }
    renderStats();
  }

  function renderMute() {
    var off = Audio.isMuted();
    [els.mute, els.muteMenu].forEach(function (b) {
      if (!b) return;
      b.innerHTML = off ? ICONS.soundOff : ICONS.soundOn;
      b.classList.toggle('is-off', off);
      b.setAttribute('aria-label', off ? 'הפעלת צלילים' : 'השתקה');
      b.setAttribute('aria-pressed', off ? 'true' : 'false');
    });
  }

  /* ================================================================== build */

  function buildCells() {
    var frag = doc.createDocumentFragment();
    for (var i = 0; i < Game.SIZE * Game.SIZE; i++) {
      var d = doc.createElement('div');
      d.className = 'cell';
      frag.appendChild(d);
    }
    els.cells.appendChild(frag);
  }

  function buildArrows() {
    els.arrows = [];
    var defs = [
      { host: $('arrows-top'), side: 'top', rotate: 0, label: 'הכנסה מלמעלה לטור ' },
      { host: $('arrows-left'), side: 'left', rotate: -90, label: 'הכנסה משמאל לשורה ' },
      { host: $('arrows-right'), side: 'right', rotate: 90, label: 'הכנסה מימין לשורה ' }
    ];
    defs.forEach(function (def) {
      for (var i = 0; i < Game.SIZE; i++) {
        var b = doc.createElement('button');
        b.type = 'button';
        b.className = 'arrow';
        b.dataset.side = def.side;
        b.dataset.index = String(i);
        b.setAttribute('aria-label', def.label + (i + 1));
        b.innerHTML = def.rotate ? '<span style="display:block;width:100%;height:100%;transform:rotate(' +
          def.rotate + 'deg)">' + ICONS.chevron + '</span>' : ICONS.chevron;
        def.host.appendChild(b);
        els.arrows.push(b);
      }
    });

    els.arrows.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        Audio.unlock();
        doMove({ side: b.dataset.side, index: Number(b.dataset.index) }, false);
      });
    });
  }

  function confirmLeave(after) {
    showModal({
      title: 'לצאת מהמשחק?',
      body: '<p>המשחק הנוכחי יימחק ולא ניתן יהיה לחזור אליו.</p>',
      actions: [
        { label: 'כן, לצאת', primary: true, onClick: after },
        { label: 'ביטול' }
      ]
    });
  }

  function gameInProgress() {
    return state && !state.over && (state.turn > 1 || !Game.isEmpty(state.board));
  }

  function bind() {
    $('btn-start').addEventListener('click', function () {
      Audio.unlock();
      Audio.click();
      showScreen('screen-menu');
    });

    $('btn-mode-ai').addEventListener('click', function () {
      Audio.unlock(); Audio.click();
      startGame('ai', prefs.difficulty);
    });

    $('btn-mode-hotseat').addEventListener('click', function () {
      Audio.unlock(); Audio.click();
      startGame('hotseat');
    });

    doc.querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        Audio.unlock(); Audio.click();
        prefs.difficulty = b.dataset.diff;
        STORE.set('sal.difficulty', prefs.difficulty);
        renderDifficulty();
      });
    });

    $('btn-help').addEventListener('click', function () {
      Audio.unlock(); Audio.click();
      showModal({ title: 'איך משחקים', body: helpBody(), actions: [{ label: 'הבנתי', primary: true }] });
    });

    $('btn-home').addEventListener('click', function () {
      Audio.click();
      var go = function () { stopAI(); busy = false; showScreen('screen-menu'); };
      if (gameInProgress()) confirmLeave(go); else go();
    });

    $('btn-restart').addEventListener('click', function () {
      Audio.click();
      var go = function () { startGame(state.mode, state.difficulty); };
      if (gameInProgress()) {
        showModal({
          title: 'משחק חדש?',
          body: '<p>הלוח יתאפס והניקוד יימחק.</p>',
          actions: [{ label: 'התחל מחדש', primary: true, onClick: go }, { label: 'ביטול' }]
        });
      } else go();
    });

    $('btn-again').addEventListener('click', function () {
      Audio.click();
      startGame(state.mode, state.difficulty);
    });

    $('btn-tomenu').addEventListener('click', function () {
      Audio.click();
      showScreen('screen-menu');
    });

    [els.mute, els.muteMenu].forEach(function (b) {
      if (!b) return;
      b.addEventListener('click', function () {
        Audio.unlock();
        Audio.toggle();
        renderMute();
        if (!Audio.isMuted()) Audio.click();
      });
    });

    $('modal-backdrop').addEventListener('click', closeModal);

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalOpen) closeModal();
    });

    global.addEventListener('resize', function () {
      metricsCache = null;
      if (state) layoutLamas(state.lamas, false);
    });

    /* Any first touch/click anywhere is a valid gesture to open the audio context. */
    ['pointerdown', 'touchstart'].forEach(function (evt) {
      doc.addEventListener(evt, function once() {
        Audio.unlock();
        doc.removeEventListener(evt, once);
      }, { passive: true });
    });
  }

  function init() {
    els.board = $('board');
    els.cells = $('cells');
    els.tiles = $('tiles');
    els.fx = $('fx');
    els.bench = $('bench');
    els.lamas = $('lamas');
    els.next = $('next-tile');
    els.turnText = $('turn-text');
    els.hint = $('hint');
    els.mute = $('btn-mute');
    els.muteMenu = $('btn-mute-menu');
    els.modal = $('modal');
    els.modalTitle = $('modal-title');
    els.modalBody = $('modal-body');
    els.modalActions = $('modal-actions');
    els.confetti = $('confetti');

    $('landing-mark').innerHTML = markSVG();
    $('btn-home').innerHTML = ICONS.home;
    $('btn-restart').innerHTML = ICONS.restart;
    $('btn-mode-ai').querySelector('[data-art="ai"]').innerHTML =
      '<svg viewBox="0 0 64 64"><rect x="8" y="14" width="48" height="34" rx="7" fill="#3a2050" stroke="#f0a92b" stroke-width="2.5"/>' +
      '<circle cx="23" cy="30" r="4.2" fill="#34c9dd"/><circle cx="41" cy="30" r="4.2" fill="#34c9dd"/>' +
      '<path d="M23 39h18" stroke="#ffd77a" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M32 14V7M24 55h16" stroke="#f0a92b" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="32" cy="5" r="3" fill="#ffd77a"/></svg>';
    $('btn-mode-hotseat').querySelector('[data-art="duo"]').innerHTML =
      '<svg viewBox="0 0 64 64">' +
      '<g transform="translate(33 16) scale(-.8 .8)">' + lamaShapes('#ffcf8a', '#c98a2e') + '</g>' +
      '<g transform="translate(31 16) scale(.8)">' + lamaShapes('#8fe3e0', '#2e9b98') + '</g></svg>';

    buildCells();
    buildArrows();
    buildLamas();
    renderDifficulty();
    renderMute();
    bind();

    if (prefs.mode !== 'ai' && prefs.mode !== 'hotseat') prefs.mode = 'ai';
    renderModeSelection();

    global.requestAnimationFrame(function () { layoutLamas(5, false); });

    if ('serviceWorker' in global.navigator && global.location.protocol.indexOf('http') === 0) {
      global.addEventListener('load', function () {
        global.navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
      });
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  global.SAL.UI = { start: startGame, showScreen: showScreen };
})(typeof window !== 'undefined' ? window : globalThis);
