/* Slide-A-Lama — every sound is synthesised at runtime with the Web Audio API.
 * No audio files, no decoding, no network. The context is created lazily on the
 * first user gesture because mobile Safari/Chrome refuse to start it otherwise.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'sal.mute';

  var ctx = null;
  var master = null;
  var noiseBuffer = null;
  var muted = false;

  try {
    muted = global.localStorage && global.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (err) { muted = false; }

  function now() { return ctx ? ctx.currentTime : 0; }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(function () {});
      return ctx;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (err) {
      ctx = null;
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(function () {});
    return ctx;
  }

  function getNoise() {
    if (noiseBuffer) return noiseBuffer;
    var len = Math.floor(ctx.sampleRate * 0.7);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function live() {
    return !muted && ensure() !== null;
  }

  /* --------------------------------------------------------------- helpers */

  function tone(opts) {
    var t0 = (opts.at != null ? opts.at : now()) + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to != null) {
      if (opts.exp !== false && opts.to > 0 && opts.freq > 0) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
      else osc.frequency.linearRampToValueAtTime(opts.to, t0 + opts.dur);
    }
    var peak = opts.gain != null ? opts.gain : 0.2;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    var tail = gain;
    if (opts.filter) {
      var f = ctx.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.setValueAtTime(opts.filterFreq || 1200, t0);
      if (opts.filterTo) f.frequency.exponentialRampToValueAtTime(opts.filterTo, t0 + opts.dur);
      f.Q.value = opts.q || 1;
      gain.connect(f);
      tail = f;
    }
    tail.connect(master);
    osc.connect(gain);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
    return { osc: osc, gain: gain, t0: t0 };
  }

  function noise(opts) {
    var t0 = (opts.at != null ? opts.at : now()) + (opts.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.playbackRate.value = opts.rate || 1;

    var filter = ctx.createBiquadFilter();
    filter.type = opts.filter || 'bandpass';
    filter.frequency.setValueAtTime(opts.from || 2000, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.toFreq || 300), t0 + opts.dur);
    filter.Q.value = opts.q || 1.2;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.gain != null ? opts.gain : 0.25, t0 + (opts.attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.05);
  }

  function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------------------------------------------------------------- sounds */

  /* Tile leaves the hand and slides into the temple: filtered noise sweeping down. */
  function slide() {
    if (!live()) return;
    noise({ dur: 0.22, from: 3200, toFreq: 420, gain: 0.16, filter: 'bandpass', q: 0.9 });
    tone({ type: 'triangle', freq: 620, to: 240, dur: 0.2, gain: 0.07 });
  }

  /* Tile settles: short sine thump. */
  function land() {
    if (!live()) return;
    tone({ type: 'sine', freq: 190, to: 70, dur: 0.16, gain: 0.26 });
    noise({ dur: 0.06, from: 900, toFreq: 200, gain: 0.07, filter: 'lowpass' });
  }

  /* Something got pushed out of the temple: dry crunch. */
  function crush() {
    if (!live()) return;
    noise({ dur: 0.14, from: 5200, toFreq: 700, gain: 0.3, filter: 'highpass', q: 0.6 });
    tone({ type: 'square', freq: 150, to: 55, dur: 0.12, gain: 0.12 });
  }

  /* Match arpeggio. Longer runs go higher and add a note; each cascade level
     shifts the whole figure up a minor third. */
  function match(len, cascade) {
    if (!live()) return;
    var c = Math.max(1, cascade || 1);
    var root = 64 + (c - 1) * 3 + (len >= 5 ? 7 : (len >= 4 ? 4 : 0));
    var notes = len >= 4 ? [0, 4, 7, 12] : [0, 4, 7];
    var t0 = now();
    for (var i = 0; i < notes.length; i++) {
      tone({
        type: 'triangle', freq: midiFreq(root + notes[i]), dur: 0.16,
        gain: 0.19, at: t0, delay: i * 0.062
      });
      tone({
        type: 'sine', freq: midiFreq(root + notes[i] + 12), dur: 0.1,
        gain: 0.07, at: t0, delay: i * 0.062
      });
    }
  }

  /* The signature noise: a wobbly lama bleat. Sawtooth sliding down then back
     up, with an LFO wobbling the pitch, through a moving lowpass. */
  function bleat() {
    if (!live()) return;
    var t0 = now();
    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, t0);
    osc.frequency.exponentialRampToValueAtTime(150, t0 + 0.22);
    osc.frequency.exponentialRampToValueAtTime(295, t0 + 0.42);

    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(17, t0);
    lfo.frequency.linearRampToValueAtTime(9, t0 + 0.45);
    var lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(46, t0);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, t0);
    filter.frequency.exponentialRampToValueAtTime(700, t0 + 0.45);
    filter.Q.value = 6;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03);
    gain.gain.setValueAtTime(0.2, t0 + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.47);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t0); osc.stop(t0 + 0.5);
    lfo.start(t0); lfo.stop(t0 + 0.5);
  }

  function click() {
    if (!live()) return;
    tone({ type: 'square', freq: 520, to: 380, dur: 0.06, gain: 0.09 });
  }

  function win() {
    if (!live()) return;
    var t0 = now();
    var seq = [0, 4, 7, 12, 16, 19];
    for (var i = 0; i < seq.length; i++) {
      tone({ type: 'triangle', freq: midiFreq(60 + seq[i]), dur: 0.22, gain: 0.2, at: t0, delay: i * 0.09 });
      tone({ type: 'square', freq: midiFreq(48 + seq[i]), dur: 0.2, gain: 0.05, at: t0, delay: i * 0.09 });
    }
    tone({ type: 'triangle', freq: midiFreq(84), dur: 0.7, gain: 0.16, at: t0, delay: 0.56 });
  }

  function lose() {
    if (!live()) return;
    var t0 = now();
    tone({ type: 'sawtooth', freq: 233, to: 110, dur: 0.75, gain: 0.16, filter: 'lowpass', filterFreq: 1400, filterTo: 380, at: t0 });
    tone({ type: 'sawtooth', freq: 175, to: 82, dur: 0.8, gain: 0.1, filter: 'lowpass', filterFreq: 1100, filterTo: 300, at: t0, delay: 0.12 });
  }

  /* ------------------------------------------------------------- interface */

  function setMuted(value) {
    muted = !!value;
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch (err) { /* private mode — fall back to in-memory only */ }
    if (master) {
      var t = now();
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(muted ? 0 : 0.85, t);
    }
    return muted;
  }

  global.SAL = global.SAL || {};
  global.SAL.Audio = {
    /* Call from a real user gesture before anything else. */
    unlock: function () { ensure(); },
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { return setMuted(!muted); },
    slide: slide,
    land: land,
    crush: crush,
    match: match,
    bleat: bleat,
    click: click,
    win: win,
    lose: lose
  };
})(typeof window !== 'undefined' ? window : globalThis);
