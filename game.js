// CHROMARA — PoC de JRPG: mapa → transición → batalla ATB con mezcla de colores.
'use strict';
// =====================================================================
// 0. Núcleo: canvas 320×180, escalado entero, input, RNG, utilidades de color
// =====================================================================
const W = 320, H = 180, TILE = 16;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const g = buf.getContext('2d');
let SCALE = 1;
function fit() {
  SCALE = Math.max(1, Math.floor(Math.min(innerWidth / W, (innerHeight - 20) / H)));
  cv.width = W * SCALE; cv.height = H * SCALE;
  cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', fit); fit();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const R = (a, b) => a + Math.random() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = arr => arr[RI(0, arr.length - 1)];
function seeded(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// --- Input
const keys = {}, pressed = {};
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', z: 'ok', Enter: 'ok', ' ': 'ok', x: 'back', Escape: 'back', Tab: 'swap', F1: 'debug' };
addEventListener('keydown', e => {
  const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  if (!k) return;
  e.preventDefault();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  Audio.init();
});
addEventListener('keyup', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
const hit = k => { const v = pressed[k]; pressed[k] = false; return !!v; };

// --- Color utils (hue-shifting: sombras hacia azul, luces hacia amarillo)
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbHex(r, gg, b) { return '#' + [r, gg, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function rgbHsl(r, gg, b) {
  r /= 255; gg /= 255; b /= 255; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (gg - b) / d + (gg < b ? 6 : 0) : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; h *= 60; }
  return [h, s, l];
}
function hslRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
function hueToward(h, target, amt) { let d = ((target - h + 540) % 360) - 180; return h + d * amt; }
function shade(hex, towardHue, hueAmt, ds, dl) {
  let [h, s, l] = rgbHsl(...hexRgb(hex)); h = hueToward(h, towardHue, hueAmt); s = clamp(s + ds, 0, 1); l = clamp(l + dl, 0, 1);
  return rgbHex(...hslRgb(h, s, l));
}
const rampCache = {};
function ramp(hex) {
  if (rampCache[hex]) return rampCache[hex];
  const [h0, s] = rgbHsl(...hexRgb(hex));
  const y = (h0 > 35 && h0 < 75) ? 0.45 : 1; // amarillos: sombras hacia naranja, no hacia rojo (si no, parecen fuego)
  const r = s < 0.25
    ? { hi: shade(hex, 240, 0.1, 0.05, 0.14), base: hex, sh: shade(hex, 240, 0.2, 0.05, -0.08), dk: shade(hex, 240, 0.3, 0.08, -0.14), out: '#0b0912', spec: '#b8b4cc' }
    : { hi: shade(hex, 55, 0.18, -0.02, 0.15), base: hex, sh: shade(hex, 250, 0.16 * y, 0.06, -0.13), dk: shade(hex, 250, 0.28 * y, 0.1, -0.24), out: shade(hex, 250, 0.35 * y, 0.12, -0.38), spec: shade(hex, 55, 0.3, -0.3, 0.38) };
  return rampCache[hex] = r;
}
function desat(hex, amt, dl = 0) { let [h, s, l] = rgbHsl(...hexRgb(hex)); return rgbHex(...hslRgb(h, s * (1 - amt), clamp(l + dl, 0, 1))); }
const C = k => DATA.colors[k].hex;

// =====================================================================
// 1. Audio: SFX por osciladores + secuenciador chiptune mínimo
// =====================================================================
const Audio = {
  ctx: null, master: null, seq: null, cur: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
    if (typeof SFX !== 'undefined') { SFX.init(this.ctx, this.master); if (SFX.ambPending !== undefined) SFX.ambient(SFX.ambPending); }
    this.preload();
    if (this.pending) this.play(this.pending);
  },
  tone(f, t0, dur, type = 'square', vol = 0.25, slide = 0) {
    if (!this.ctx) return; const o = this.ctx.createOscillator(), gn = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t0 + dur);
    gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn); gn.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(t0, dur, vol = 0.2, hp = 800) {
    if (!this.ctx) return; const n = this.ctx.sampleRate * dur | 0, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const gn = this.ctx.createGain(); gn.gain.value = vol; s.connect(f); f.connect(gn); gn.connect(this.master); s.start(t0);
  },
  sfx(name, o) {
    if (!this.ctx) return; if (typeof SFX !== 'undefined' && SFX.ctx) { SFX.play(name, o); return; } const t = this.ctx.currentTime;
    switch (name) {
      case 'move': this.tone(880, t, .04, 'square', .08); break;
      case 'ok': this.tone(660, t, .05, 'square', .12); this.tone(990, t + .05, .08, 'square', .12); break;
      case 'back': this.tone(440, t, .08, 'square', .1, -200); break;
      case 'nope': this.tone(180, t, .12, 'square', .12); break;
      case 'hit': this.noise(t, .08, .25, 1500); this.tone(160, t, .1, 'square', .2, -100); break;
      case 'hitweak': this.noise(t, .1, .3, 900); this.tone(220, t, .18, 'sawtooth', .22, -180); this.tone(880, t + .04, .12, 'square', .12, 400); break;
      case 'heal': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * .07, .18, 'triangle', .16)); break;
      case 'tech': this.tone(300, t, .3, 'sawtooth', .16, 900); this.noise(t + .1, .15, .12, 3000); break;
      case 'mix': [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, t + i * .04, .22, 'square', .12)); this.noise(t + .18, .2, .2, 2000); break;
      case 'rainbow': [262, 330, 392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * .05, .3, 'triangle', .16)); break;
      case 'ready': this.tone(1320, t, .05, 'square', .07); break;
      case 'die': this.noise(t, .3, .2, 400); this.tone(200, t, .35, 'sawtooth', .15, -150); break;
      case 'fall': this.tone(1200, t, .45, 'sine', .15, -1000); break;
      case 'splash': this.noise(t, .35, .4, 300); this.tone(90, t, .3, 'sine', .3, -60); break;
      case 'victory': [523, 523, 523, 659, 784, 659, 784].forEach((f, i) => this.tone(f, t + [0, .12, .24, .36, .6, .84, .96][i], i > 3 ? .3 : .12, 'square', .14)); break;
      case 'ko': this.tone(300, t, .5, 'square', .15, -250); break;
      case 'encounter': this.tone(110, t, .6, 'sawtooth', .18, 60); break;
      case 'equip': this.tone(740, t, .06, 'triangle', .12); this.tone(1100, t + .06, .1, 'triangle', .12); break;
    }
  },
  // ---- Sintetizador de música (esquema MUSIC de music.js): pulsos con duty, ADSR, vibrato, eco, batería
  waves: {},
  wave(osc, name) {
    if (name === 'tri') osc.type = 'triangle'; else if (name === 'saw') osc.type = 'sawtooth'; else if (name === 'sine') osc.type = 'sine';
    else { const d = { pulse50: .5, pulse25: .25, pulse12: .125, square: .5 }[name] ?? .5; let w = this.waves[d]; if (!w) { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d); w = this.waves[d] = this.ctx.createPeriodicWave(re, im, { disableNormalization: false }); } osc.setPeriodicWave(w); }
  },
  bus() { // eco compartido (retardo sincronizado al tempo por canción)
    if (this.echo) return this.echo; const d = this.ctx.createDelay(1); d.delayTime.value = .28; const fb = this.ctx.createGain(); fb.gain.value = .32; const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    d.connect(lp); lp.connect(fb); fb.connect(d); const out = this.ctx.createGain(); out.gain.value = .5; lp.connect(out); out.connect(this.master); this.echo = d; return d;
  },
  note(tr, t0, midi, dur, vel = 1) {
    const ctx = this.ctx, f = 440 * Math.pow(2, (midi - 69) / 12), [a, dc, su, rl] = tr.env || [0.005, 0.06, 0.75, 0.06], peak = (tr.vol ?? .2) * vel * 1.5; // la música iba ~6 dB por debajo de los SFX
    const o = ctx.createOscillator(); this.wave(o, tr.wave || 'pulse50'); o.frequency.value = f;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(peak, t0 + a); gn.gain.linearRampToValueAtTime(peak * su, t0 + a + dc);
    const end = t0 + Math.max(a + dc, dur - rl * .5); gn.gain.setValueAtTime(peak * su, end); gn.gain.linearRampToValueAtTime(0.0001, end + rl);
    o.connect(gn); gn.connect(this.master); if (tr.echo) { const s = ctx.createGain(); s.gain.value = tr.echo; gn.connect(s); s.connect(this.bus()); }
    if (tr.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.6; lg.gain.value = tr.vib * 14; l.connect(lg); lg.connect(o.detune); l.start(t0 + .08); l.stop(end + rl + .05); }
    o.start(t0); o.stop(end + rl + .05);
  },
  drum(kind, t0, vol = 1) {
    const ctx = this.ctx; vol *= 1.3;
    if (kind === 'k') { const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + .1); gn.gain.setValueAtTime(.5 * vol, t0); gn.gain.exponentialRampToValueAtTime(.001, t0 + .16); o.connect(gn); gn.connect(this.master); o.start(t0); o.stop(t0 + .2); this.noise(t0, .02, .12 * vol, 2000); }
    else if (kind === 's') { this.noise(t0, .12, .22 * vol, 1200); const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(120, t0 + .06); gn.gain.setValueAtTime(.25 * vol, t0); gn.gain.exponentialRampToValueAtTime(.001, t0 + .08); o.connect(gn); gn.connect(this.master); o.start(t0); o.stop(t0 + .1); }
    else if (kind === 'h') this.noise(t0, .03, .07 * vol, 7000);
    else if (kind === 'o') this.noise(t0, .14, .06 * vol, 6000);
  },
  // ---- Reproducción por samples (music_samples.js: Ogg/Opus embebido con loop points sample-exactos, estilo SPC700)
  buffers: {}, decoding: {},
  async decode(name) {
    if (this.buffers[name]) return this.buffers[name]; if (this.decoding[name]) return this.decoding[name];
    const S = MUSIC_SAMPLES[name], bin = atob(S.data), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return this.decoding[name] = this.ctx.decodeAudioData(arr.buffer).then(b => { this.buffers[name] = b; delete this.decoding[name]; return b; });
  },
  playSample(name) {
    const S = MUSIC_SAMPLES[name]; if (!this.musicBus) { this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.9; this.musicBus.connect(this.master); }
    const token = this.token = (this.token || 0) + 1;
    this.decode(name).then(buf => {
      if (this.token !== token || this.cur !== name) return; // se pidió otra cosa mientras decodificaba
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = !!S.loop; if (S.loop) { src.loopStart = S.loopStart; src.loopEnd = Math.min(S.loopEnd, buf.duration); }
      const gn = this.ctx.createGain(); gn.gain.setValueAtTime(1, this.ctx.currentTime); src.connect(gn); gn.connect(this.musicBus); src.start(); this.src = { src, gn };
      if (!S.loop) src.onended = () => { if (this.src && this.src.src === src) this.src = null; };
    }).catch(e => console.warn('música', name, e));
  },
  preload() { if (typeof MUSIC_SAMPLES === 'undefined' || !this.ctx) return; for (const k in MUSIC_SAMPLES) this.decode(k); },
  play(name) {
    this.pending = name; if (!this.ctx) return; if (this.cur === name && (this.seq || this.src)) return;
    this.stop(); this.cur = name;
    if (typeof MUSIC_SAMPLES !== 'undefined' && MUSIC_SAMPLES[name]) { this.playSample(name); return; }
    const M = (typeof MUSIC !== 'undefined' && MUSIC[name]) ? MUSIC[name] : null;
    if (!M) { this.playLegacy(name); return; }
    const sps = 60 / M.bpm / (M.stepsPerBeat || 4), len = M.length, events = [];
    M.tracks.forEach(tr => { for (const n of tr.notes) events.push({ step: n[0], tr, midi: n[1], dur: n[2] * sps, vel: n[3] ?? 1 }); });
    (M.drums || []).forEach(d => events.push({ step: d[0], drum: d[1], vel: d[2] ?? 1 }));
    events.sort((a, b) => a.step - b.step); if (!events.length) return;
    if (this.echo) this.echo.delayTime.value = Math.min(.9, sps * 3); // eco a corchea con puntillo
    let loopStart = this.ctx.currentTime + 0.06, idx = 0;
    const tick = () => {
      if (!this.ctx) return;
      for (let guard = 0; guard < 4000; guard++) {
        const ev = events[idx], t = loopStart + ev.step * sps; if (t > this.ctx.currentTime + 0.25) return;
        if (ev.drum) this.drum(ev.drum, t, ev.vel); else this.note(ev.tr, t, ev.midi, ev.dur, ev.vel);
        if (++idx >= events.length) { if (M.loop === false) { clearInterval(this.seq); this.seq = null; return; } idx = 0; loopStart += len * sps; }
      }
    };
    tick(); this.seq = setInterval(tick, 50);
  },
  playLegacy(name) {
    const song = SONGS[name]; if (!song) return;
    const spb = 60 / song.bpm / 4; let step = 0, next = this.ctx.currentTime + 0.05;
    const N = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const freq = n => { const m = N[n[0]] + (n[1] === '#' ? 1 : 0) + 12 * (parseInt(n[n.length - 1]) + 1); return 440 * Math.pow(2, (m - 69) / 12); };
    const len = song.tracks[0].pat.length;
    this.seq = setInterval(() => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.15) {
        for (const tr of song.tracks) {
          const n = tr.pat[step % len]; if (n === '-' || n === '.') continue;
          let d = 1; while (tr.pat[(step + d) % len] === '.' && d < 16) d++;
          this.tone(freq(n), next, spb * d * 0.9, tr.wave, tr.vol);
        }
        if (song.drums) { const dr = song.drums[step % song.drums.length]; if (dr === 'k') this.drum('k', next); if (dr === 's') this.drum('s', next); if (dr === 'h') this.drum('h', next); }
        next += spb; step++;
      }
    }, 40);
  },
  stop() { if (this.seq) clearInterval(this.seq); this.seq = null; this.cur = null; this.pending = null; this.token = (this.token || 0) + 1;
    if (this.src) { const { src, gn } = this.src, t = this.ctx.currentTime; gn.gain.setValueAtTime(gn.gain.value, t); gn.gain.linearRampToValueAtTime(0, t + .12); try { src.stop(t + .13); } catch (e) {} this.src = null; } },
};
const P = s => s.trim().split(/\s+/);
const SONGS = {
  map: { bpm: 96, tracks: [
    { wave: 'triangle', vol: .12, pat: P('E4 . . . G4 . A4 . B4 . . . A4 . G4 . E4 . . . D4 . E4 . G4 . . . . . . .  A4 . . . G4 . E4 . D4 . . . E4 . G4 . A4 . . . . . B4 . A4 . . . . . . .') },
    { wave: 'square', vol: .05, pat: P('- - E5 - - - E5 - - - D5 - - - E5 - - - G5 - - - G5 - - - E5 - - - D5 - - - A5 - - - A5 - - - G5 - - - E5 - - - D5 - - - D5 - - - E5 - - - D5 -') },
    { wave: 'sine', vol: .22, pat: P('E2 . . . . . . . C2 . . . . . . . D2 . . . . . . . G2 . . . . . . . A2 . . . . . . . C2 . . . . . . . D2 . . . . . . . E2 . . . . . . .') },
  ] },
  battle: { bpm: 150, drums: P('k - h - s - h - k - k - s - h h'), tracks: [
    { wave: 'square', vol: .1, pat: P('E4 - E4 - G4 - E4 - A4 . - G4 E4 - D4 - E4 - E4 - G4 - B4 - A4 . - G4 A4 - B4 - C5 - C5 - B4 - A4 - G4 . - A4 B4 - G4 - E4 - D4 - E4 - G4 - B4 . . . A4 - G4 -') },
    { wave: 'sawtooth', vol: .12, pat: P('E2 - E2 - E3 - E2 - E2 - E2 - E3 - E2 - D2 - D2 - D3 - D2 - D2 - D2 - D3 - D2 - C2 - C2 - C3 - C2 - C2 - C2 - C3 - C2 - B1 - B1 - B2 - B1 - D2 - D2 - D3 - D2 -') },
    { wave: 'square', vol: .04, pat: P('- - - - B4 - - - - - - - B4 - - - - - - - A4 - - - - - - - A4 - - - - - - - G4 - - - - - - - G4 - - - - - - - F#4 - - - - - - - A4 - - -') },
  ] },
  boss: { bpm: 160, drums: P('k - k - s - h - k - h k s - h h'), tracks: [
    { wave: 'square', vol: .1, pat: P('E4 - F4 - E4 - D#4 - E4 - G4 - F4 - E4 - D4 - D#4 - D4 - C4 - D4 - F4 - D#4 - D4 - C4 - C#4 - C4 - B3 - C4 - D#4 - D4 - C4 - B3 - C4 - B3 - A#3 - B3 - D4 - B3 - G3 -') },
    { wave: 'sawtooth', vol: .13, pat: P('E2 E2 - E2 - E2 E3 - E2 E2 - E2 - E2 F2 - D2 D2 - D2 - D2 D3 - D2 D2 - D2 - D2 D#2 - C2 C2 - C2 - C2 C3 - C2 C2 - C2 - C2 C#2 - B1 B1 - B1 - B1 B2 - B1 B1 - B1 - B1 B1 -') },
  ] },
};

// =====================================================================
// 2. Arte procedural: gotas (hue-shift + selout + especular), tiles, ventanas, texto
// =====================================================================
const spriteCache = new Map();
function cached(key, fn) { let s = spriteCache.get(key); if (!s) { s = fn(); spriteCache.set(key, s); } return s; }

// Dibuja una gota en pixel art. shape: round|tall|splash|blob. pose: idle|hurt|attack|ko|happy
function makeDrop(o) {
  const w = o.w, h = o.h, sx = o.sx || 1, sy = o.sy || 1;
  const cw = Math.ceil(w * 1.6), ch = Math.ceil(h * 1.4) + 2;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  const rw = (w * sx) / 2, rh = h * sy, cx = cw / 2, bottom = ch - 1, top = bottom - rh;
  const k = { round: .18, tall: .38, splash: .12, blob: .05 }[o.shape] || .18;
  const rp = ramp(o.color), core = o.core ? ramp(o.core) : null, rnd = seeded(o.seed || 7);
  const wob = [], lobes = [];
  for (let i = 0; i < 8; i++) wob.push(rnd() * 6.28);
  if (o.shape === 'splash') for (let i = 0; i < 4; i++) lobes.push({ u: (i % 2 ? 1 : -1) * (0.75 + rnd() * .35), v: 0.35 + rnd() * .5, r: 0.18 + rnd() * .12 });
  if (o.shape === 'blob') for (let i = 0; i < 3; i++) lobes.push({ u: (rnd() - .5) * 1.8, v: 0.7 + rnd() * .3, r: 0.22 + rnd() * .14 });
  const uv = (px, py) => [(px + .5 - cx) / rw, ((py + .5 - top) / rh) * 2 - 1];
  const inside = (px, py) => {
    const [u, v] = uv(px, py);
    if (v >= -1 && v <= 1) {
      let f = Math.sqrt(Math.max(0, 1 - v * v)) * Math.pow((v + 1) / 2, k) * (1 + k * .8);
      if (o.shape === 'blob') f *= 1 + 0.07 * Math.sin(v * 5 + wob[0]) + 0.05 * Math.sin(v * 11 + wob[1]);
      if (Math.abs(u) <= f) return true;
    }
    for (const L of lobes) { const du = u - L.u, dv = (v - L.v) * (rw / rh) * 2; if (du * du + dv * dv <= L.r * L.r) return true; }
    return false;
  };
  const img = x.createImageData(cw, ch), d = img.data;
  const put = (px, py, hex) => { if (px < 0 || py < 0 || px >= cw || py >= ch) return; const [r, gg, b] = hexRgb(hex); const i = (py * cw + px) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; };
  const L = [-0.45, -0.6, 0.66];
  for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
    if (!inside(px, py)) continue;
    const [u, v] = uv(px, py);
    const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
    if (edge) { put(px, py, rp.out); continue; }
    const nu = clamp(u, -1, 1), nv = clamp(v * 0.85, -1, 1), nz = Math.sqrt(Math.max(0, 1 - nu * nu - nv * nv));
    const lam = nu * L[0] + nv * L[1] + nz * L[2];
    let col = lam > .58 ? rp.hi : lam > .2 ? rp.base : lam > -.15 ? rp.sh : rp.dk;
    if (core && u * u + (v + .05) * (v + .05) < 0.2) col = lam > .3 ? core.base : core.sh;
    if (u > -.6 && u < -.3 && v > -.62 && v < -.38 && o.pose !== 'ko') col = rp.spec;
    if (o.pose === 'ko') col = lam > .2 ? rp.sh : rp.dk;
    put(px, py, col);
  }
  x.putImageData(img, 0, 0);
  // ojos
  const eyeCol = o.core ? ramp(o.core).hi : (o.dark ? '#f4f0ea' : '#14121c');
  const ey = Math.round(top + rh * (o.pose === 'ko' ? .5 : .52)), ex1 = Math.round(cx - rw * .32), ex2 = Math.round(cx + rw * .3);
  if (o.pose === 'ko' || o.pose === 'hurt') {
    x.fillStyle = eyeCol; for (const ex of [ex1, ex2]) { x.fillRect(ex - 1, ey - 1, 1, 1); x.fillRect(ex + 1, ey - 1, 1, 1); x.fillRect(ex, ey, 1, 1); x.fillRect(ex - 1, ey + 1, 1, 1); x.fillRect(ex + 1, ey + 1, 1, 1); }
  } else if (o.pose === 'happy') {
    x.fillStyle = eyeCol; for (const ex of [ex1, ex2]) { x.fillRect(ex - 1, ey, 1, 1); x.fillRect(ex, ey - 1, 1, 1); x.fillRect(ex + 1, ey, 1, 1); }
  } else {
    const tall = h >= 20 ? 2 : 1;
    x.fillStyle = eyeCol; x.fillRect(ex1, ey - tall + 1, 1, tall); x.fillRect(ex2, ey - tall + 1, 1, tall);
    if (!o.dark && !o.core) { x.fillStyle = '#ffffff'; x.fillRect(ex1, ey - tall + 1, 1, 1); x.fillRect(ex2, ey - tall + 1, 1, 1); }
    if (o.pose === 'attack') { x.fillStyle = eyeCol; x.fillRect(ex1 - 1, ey - tall, 2, 1); x.fillRect(ex2, ey - tall, 2, 1); }
  }
  return c;
}
const IDLE = [[1, 1], [1.04, .97], [1, 1], [.96, 1.04]];
const POSES = { idle: [1, 1], hurt: [1.16, .84], attack: [.9, 1.12], ko: [1.5, .32], happy: [1, 1], hop: [.9, 1.15] };
function dropSprite(def, pose, frame, extra = {}) {
  const [sx, sy] = pose === 'idle' ? IDLE[frame % 4] : POSES[pose];
  const key = `${def.color}|${def.core || ''}|${def.shape}|${def.w}x${def.h}|${pose}|${pose === 'idle' ? frame % 4 : 0}|${extra.dark ? 1 : 0}`;
  const s = cached(key, () => makeDrop({ w: def.w, h: def.h, sx, sy, shape: def.shape, color: def.color, core: def.core, pose, dark: extra.dark, seed: def.seed })); s.__key = key; return s;
}
function drawDrop(def, x, y, pose = 'idle', frame = 0, extra = {}) { // anclado en los pies (centro-abajo)
  let s = dropSprite(def, pose, frame, extra); if (extra.tint) s = tintSprite(s, extra.tint, extra.tintA || .5); g.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height + 1));
}
// Sombra elíptica bajo el sprite
function shadow(x, y, w) { g.fillStyle = 'rgba(10,8,20,0.28)'; g.fillRect(Math.round(x - w / 2), y - 1, w, 2); g.fillRect(Math.round(x - w / 2) + 1, y - 2, w - 2, 1); g.fillRect(Math.round(x - w / 2) + 1, y, w - 2, 1); }

// --- Tiles (dos paletas: 'gris' = Chromara apagada, 'vivo' = color recuperado)
// Autotiling por vecindad: orillas de agua, bordes de camino, puentes de madera, borde líquido de la tinta,
// hierba con variantes (matas, flores) y árboles como sprites 16×24 ordenados por profundidad.
const PAL = {
  gris: { grass: '#7d8a68', grass2: '#6f7c5c', grassHi: '#8e9b76', grassDk: '#5c694b', flower: '#c4bfb0', flower2: '#a39d92',
          ink: '#4a4a55', ink2: '#3f3f4a', inkHi: '#5f5e6e', inkDk: '#2a2934',
          water: '#6d8a9c', water2: '#7f9cae', waterDk: '#5c7789', foam: '#adc2ce', bank: '#565243', bank2: '#8c8672',
          path: '#b3a98c', path2: '#a3997d', path3: '#c3b99c', plank: '#9b8669', plank2: '#75634c', plank3: '#b39d7f',
          tree: '#5d7452', tree2: '#4b6142', treeHi: '#71886a', treeOut: '#2f3d2b', trunk: '#6b5a48', trunk2: '#4a3e31',
          rock: '#8a8a90', rock2: '#6e6e76', rock3: '#a3a3a9', rockOut: '#454550' },
  vivo: { grass: '#5fb64a', grass2: '#4fa23c', grassHi: '#7ecb60', grassDk: '#3d8a2f', flower: '#fbf6ff', flower2: '#f0578a',
          ink: '#5fb64a', ink2: '#4fa23c', inkHi: '#7ecb60', inkDk: '#3d8a2f',
          water: '#3a8fe0', water2: '#62b0f2', waterDk: '#2d76c2', foam: '#c8ecff', bank: '#6e5230', bank2: '#cfae70',
          path: '#e8cf8a', path2: '#d9bd74', path3: '#f5e3aa', plank: '#b98450', plank2: '#865a2e', plank3: '#d8a66c',
          tree: '#2f9a48', tree2: '#227a38', treeHi: '#62c463', treeOut: '#0f4a1c', trunk: '#8a5a34', trunk2: '#59371d',
          rock: '#a8a4b8', rock2: '#7c7890', rock3: '#cbc7d8', rockOut: '#454060' },
};
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
// clase de suelo de cada casilla: w agua, p camino, i tinta, g hierba (árboles, rocas y manchas van encima de hierba)
function tileCls(tx, ty, pal) {
  const ch = tileAt(tx, ty);
  if (ch === '~') return 'w';
  if (ch === '=') return 'p';
  if (pal === 'vivo') return 'g';
  if (ch === ',') return 'i';
  if (ch === 'x' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(tx + a, ty + b) === ',')) return 'i';
  return 'g';
}
// máscara de vecinos de la misma clase: N=1 E=2 S=4 W=8 NE=16 SE=32 SW=64 NW=128
const NB8 = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8], [1, -1, 16], [1, 1, 32], [-1, 1, 64], [-1, -1, 128]];
function nbMask(tx, ty, cls, pal) { let m = 0; for (const [a, b, bit] of NB8) if (tileCls(tx + a, ty + b, pal) === cls) m |= bit; return m; }
const px = (x, col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
function speckle(x, col, n, rnd) { x.fillStyle = col; for (let i = 0; i < n; i++) x.fillRect(rnd() * 16 | 0, rnd() * 16 | 0, 1, 1); }
function tuft(x, p, X, Y) { px(x, p.grassHi, X + 1, Y); px(x, p.grassDk, X, Y + 1); px(x, p.grass2, X + 1, Y + 1); px(x, p.grassHi, X + 2, Y + 1); px(x, p.grassDk, X, Y + 2); px(x, p.grassDk, X + 2, Y + 2); }
function flower(x, p, X, Y, alt) { px(x, p.grassDk, X + 1, Y + 3); px(x, alt ? p.flower2 : p.flower, X, Y + 1); px(x, alt ? p.flower2 : p.flower, X + 2, Y + 1); px(x, alt ? p.flower2 : p.flower, X + 1, Y); px(x, alt ? p.flower2 : p.flower, X + 1, Y + 2); px(x, alt ? p.flower : p.flower2, X + 1, Y + 1); }
function stain(x, dark, hi) { x.fillStyle = dark; x.fillRect(4, 5, 8, 6); x.fillRect(2, 7, 12, 3); x.fillRect(6, 3, 3, 2); x.fillRect(12, 11, 2, 2); x.fillRect(3, 11, 2, 1); x.fillRect(6, 10, 5, 2); px(x, hi, 5, 6, 2, 1); px(x, hi, 7, 5); px(x, hi, 3, 8); }

function drawGrassTile(x, p, pal, kind, vr) {
  const rnd = seeded(vr * 97 + kind.charCodeAt(0) * 7);
  x.fillStyle = kind === 'T' ? p.grass2 : p.grass; x.fillRect(0, 0, 16, 16);
  speckle(x, kind === 'T' ? p.grassDk : p.grass2, kind === 'T' ? 10 : 6, rnd);
  if (kind === 'T') { speckle(x, p.grassHi, 2, rnd); return; }
  if (kind === '.') {
    if (vr === 3 || vr === 9) tuft(x, p, 3 + rnd() * 8 | 0, 3 + rnd() * 8 | 0);
    else if (vr === 6) { tuft(x, p, 2, 3); tuft(x, p, 9, 9); }
    else if (vr === 12 || (pal === 'vivo' && vr === 14)) flower(x, p, 4 + rnd() * 6 | 0, 3 + rnd() * 6 | 0, vr === 14);
    else if (vr === 15) { px(x, p.grassHi, 5, 6, 2, 1); px(x, p.grassHi, 10, 11, 2, 1); }
  } else if (kind === 'r') {
    px(x, p.grassDk, 4, 14, 10, 1); px(x, p.grassDk, 3, 13, 12, 1);
    px(x, p.rockOut, 3, 6, 10, 8); px(x, p.rockOut, 5, 4, 6, 2); px(x, p.rockOut, 4, 5, 8, 1);
    px(x, p.rock2, 4, 6, 8, 7); px(x, p.rock2, 5, 5, 6, 1);
    px(x, p.rock, 5, 6, 5, 4); px(x, p.rock, 6, 5, 3, 1); px(x, p.rock, 4, 7, 1, 2);
    px(x, p.rock3, 6, 6, 2, 1); px(x, p.rock3, 6, 7, 1, 1);
    px(x, p.rockOut, 9, 9); px(x, p.rockOut, 10, 10); px(x, p.rockOut, 8, 11); px(x, p.rockOut, 11, 8);
  } else if (kind === 'x') stain(x, '#2a2438', '#3e3852');
}
function drawWaterTile(x, p, m, vr, frame) {
  const rnd = seeded(vr * 53 + 11), sh = [0, 1, 2, 1][frame];
  x.fillStyle = p.water; x.fillRect(0, 0, 16, 16);
  const dashes = [[2, 3, 5], [10, 9, 4], [5, 13, 3], [13, 6, 2]];
  dashes.forEach(([dx, dy, len], i) => {
    const s = i & 1 ? -sh : sh;
    for (let k = 0; k < len; k++) { px(x, p.water2, (dx + s + k) & 15, dy); }
    for (let k = 0; k < len - 1; k++) { px(x, p.waterDk, (dx + s + k + 2) & 15, dy + 1); }
  });
  const has = b => m & b, foamOn = i => ((i + frame) % 5) !== 0;
  if (!has(1)) { px(x, p.bank, 0, 0, 16, 1); for (let i = 0; i < 16; i++) if (foamOn(i)) px(x, p.foam, i, 1); }
  if (!has(4)) { px(x, p.bank, 0, 15, 16, 1); for (let i = 0; i < 16; i++) if (foamOn(i + 2)) px(x, p.foam, i, 14); }
  if (!has(8)) { px(x, p.bank, 0, 0, 1, 16); for (let i = 0; i < 16; i++) if (foamOn(i + 1)) px(x, p.foam, 1, i); }
  if (!has(2)) { px(x, p.bank, 15, 0, 1, 16); for (let i = 0; i < 16; i++) if (foamOn(i + 3)) px(x, p.foam, 14, i); }
  if (has(1) && has(2) && !has(16)) { px(x, p.bank, 15, 0); px(x, p.foam, 14, 1); px(x, p.foam, 14, 0); px(x, p.foam, 15, 1); }
  if (has(4) && has(2) && !has(32)) { px(x, p.bank, 15, 15); px(x, p.foam, 14, 14); px(x, p.foam, 14, 15); px(x, p.foam, 15, 14); }
  if (has(4) && has(8) && !has(64)) { px(x, p.bank, 0, 15); px(x, p.foam, 1, 14); px(x, p.foam, 1, 15); px(x, p.foam, 0, 14); }
  if (has(1) && has(8) && !has(128)) { px(x, p.bank, 0, 0); px(x, p.foam, 1, 1); px(x, p.foam, 1, 0); px(x, p.foam, 0, 1); }
  // esquinas exteriores: redondear el banco
  if (!has(1) && !has(8)) px(x, p.bank, 1, 1); if (!has(1) && !has(2)) px(x, p.bank, 14, 1);
  if (!has(4) && !has(8)) px(x, p.bank, 1, 14); if (!has(4) && !has(2)) px(x, p.bank, 14, 14);
}
function drawRoadTile(x, p, pm, wm, vr) {
  const rnd = seeded(vr * 31 + 3);
  if (wm) { // puente o embarcadero de madera: tablones perpendiculares a la marcha, barandas a los lados
    const horiz = (wm & 1 && wm & 4) ? true : (wm & 8 && wm & 2) ? false : !!(wm & 10);
    for (let i = 0; i < 16; i++) {
      const col = i % 4 === 3 ? p.plank2 : i % 4 === 0 ? p.plank3 : p.plank;
      if (horiz) px(x, col, i, 0, 1, 16); else px(x, col, 0, i, 16, 1);
    }
    for (let i = 0; i < 5; i++) { const a = rnd() * 16 | 0, b = rnd() * 16 | 0; px(x, p.plank2, horiz ? a : b, horiz ? b : a, 1, 1); }
    if (horiz) { px(x, p.trunk2, 0, 0, 16, 1); px(x, p.trunk2, 0, 15, 16, 1); px(x, p.plank3, 0, 1, 16, 1); for (let i = 1; i < 16; i += 5) { px(x, p.trunk2, i, 0, 2, 2); px(x, p.trunk2, i, 14, 2, 2); } }
    else { px(x, p.trunk2, 0, 0, 1, 16); px(x, p.trunk2, 15, 0, 1, 16); px(x, p.plank3, 1, 0, 1, 16); for (let i = 1; i < 16; i += 5) { px(x, p.trunk2, 0, i, 2, 2); px(x, p.trunk2, 14, i, 2, 2); } }
    return;
  }
  x.fillStyle = p.path; x.fillRect(0, 0, 16, 16);
  speckle(x, p.path2, 6, rnd); speckle(x, p.path3, 3, rnd);
  const edge = (bit, fn) => { if (pm & bit) return; for (let i = 0; i < 16; i++) { const d = rnd() < .4 ? 2 : 1; fn(i, d); } };
  edge(1, (i, d) => { px(x, p.grass, i, 0, 1, d - 1); px(x, p.path2, i, d - 1); });
  edge(4, (i, d) => { px(x, p.grass, i, 17 - d, 1, d - 1); px(x, p.path2, i, 16 - d); });
  edge(8, (i, d) => { px(x, p.grass, 0, i, d - 1, 1); px(x, p.path2, d - 1, i); });
  edge(2, (i, d) => { px(x, p.grass, 17 - d, i, d - 1, 1); px(x, p.path2, 16 - d, i); });
  if (!(pm & 1) && !(pm & 8)) px(x, p.grass, 0, 0, 2, 2); if (!(pm & 1) && !(pm & 2)) px(x, p.grass, 14, 0, 2, 2);
  if (!(pm & 4) && !(pm & 8)) px(x, p.grass, 0, 14, 2, 2); if (!(pm & 4) && !(pm & 2)) px(x, p.grass, 14, 14, 2, 2);
}
function drawInkTile(x, p, m, vr, withStain) {
  const rnd = seeded(vr * 71 + 5);
  x.fillStyle = p.ink; x.fillRect(0, 0, 16, 16);
  speckle(x, p.ink2, 8, rnd);
  for (let i = 0; i < 2; i++) { const a = rnd() * 13 | 0, b = rnd() * 14 | 0; px(x, p.inkHi, a, b, 3, 1); px(x, p.inkHi, a + 3, b + 1); }
  if (vr === 0) { const a = 2 + (rnd() * 9 | 0), b = 2 + (rnd() * 9 | 0); px(x, p.inkDk, a, b + 1, 6, 2); px(x, p.inkDk, a + 1, b, 4, 4); px(x, p.inkDk, a + 6, b + 2); px(x, p.inkHi, a + 1, b + 1, 2, 1); } // charco más profundo
  // borde líquido: la hierba asoma con bultos irregulares, contorno oscuro y brillo del menisco
  const depth = () => 1 + (rnd() < .45 ? 1 : 0) + (rnd() < .12 ? 1 : 0);
  if (!(m & 1)) for (let i = 0; i < 16; i++) { const d = depth(); px(x, p.grass, i, 0, 1, d); px(x, p.inkDk, i, d); if (rnd() < .5) px(x, p.inkHi, i, d + 1); }
  if (!(m & 4)) { // borde sur: la tinta cuelga en chorretones sobre la hierba
    const drips = rnd() < .3 ? [] : rnd() < .6 ? [2 + (rnd() * 11 | 0)] : [1 + (rnd() * 5 | 0), 9 + (rnd() * 5 | 0)];
    for (let i = 0; i < 16; i++) { const d = 2 + depth(); px(x, p.grass, i, 16 - d, 1, d); px(x, p.inkDk, i, 15 - d); }
    for (const dx of drips) { const top = 10 + (rnd() * 2 | 0), len = 2 + (rnd() * (15 - top) | 0); px(x, p.inkDk, dx - 1, top, 3, len); px(x, p.ink, dx, top, 1, len - 1); px(x, p.inkDk, dx, top + len); px(x, p.inkHi, dx, top + 1); }
  }
  if (!(m & 8)) for (let i = 0; i < 16; i++) { const d = depth(); px(x, p.grass, 0, i, d, 1); px(x, p.inkDk, d, i); }
  if (!(m & 2)) for (let i = 0; i < 16; i++) { const d = depth(); px(x, p.grass, 16 - d, i, d, 1); px(x, p.inkDk, 15 - d, i); }
  if ((m & 1) && (m & 8) && !(m & 128)) { px(x, p.grass, 0, 0, 2, 1); px(x, p.grass, 0, 1); px(x, p.inkDk, 2, 0); px(x, p.inkDk, 1, 1); px(x, p.inkDk, 0, 2); }
  if ((m & 1) && (m & 2) && !(m & 16)) { px(x, p.grass, 14, 0, 2, 1); px(x, p.grass, 15, 1); px(x, p.inkDk, 13, 0); px(x, p.inkDk, 14, 1); px(x, p.inkDk, 15, 2); }
  if ((m & 4) && (m & 8) && !(m & 64)) { px(x, p.grass, 0, 15, 2, 1); px(x, p.grass, 0, 14); px(x, p.inkDk, 2, 15); px(x, p.inkDk, 1, 14); px(x, p.inkDk, 0, 13); }
  if ((m & 4) && (m & 2) && !(m & 32)) { px(x, p.grass, 14, 15, 2, 1); px(x, p.grass, 15, 14); px(x, p.inkDk, 13, 15); px(x, p.inkDk, 14, 14); px(x, p.inkDk, 15, 13); }
  if (withStain) stain(x, '#22202c', '#3a3648');
}
// Tile de suelo de una casilla, cacheado por su forma (clase + vecinos + variante), no por posición
function groundTile(tx, ty, pal, frame = 0) {
  const ch = tileAt(tx, ty), cls = tileCls(tx, ty, pal), v = hash2(tx, ty), p = PAL[pal];
  let key, draw;
  if (cls === 'w') { const m = nbMask(tx, ty, 'w', pal), vr = v & 3; key = `w|${m}|${vr}|${frame}`; draw = x => drawWaterTile(x, p, m, vr, frame); }
  else if (cls === 'p') { const wm = nbMask(tx, ty, 'w', pal) & 15, pm = nbMask(tx, ty, 'p', pal) | wm, vr = v & 7; key = `p|${pm}|${wm}|${vr}`; draw = x => drawRoadTile(x, p, pm, wm, vr); }
  else if (cls === 'i') { const m = nbMask(tx, ty, 'i', pal), vr = v & 7; key = `i|${m}|${vr}|${ch === 'x' ? 1 : 0}`; draw = x => drawInkTile(x, p, m, vr, ch === 'x'); }
  else { const kind = ch === 'T' ? 'T' : ch === 'r' ? 'r' : (ch === 'x' && pal === 'gris') ? 'x' : '.', vr = (v >>> 8) & 15; key = `g|${kind}|${vr}`; draw = x => drawGrassTile(x, p, pal, kind, vr); }
  return cached(`tile|${pal}|${key}`, () => { const c = document.createElement('canvas'); c.width = c.height = TILE; draw(c.getContext('2d')); c.__key = `${pal}|${key}`; return c; });
}
// Árbol 16×24: copa redonda con bultos de hojas, fusionada con los árboles vecinos para formar setos/muros de bosque
function treeSprite(pal, mL, mR, vr) {
  return cached(`tree|${pal}|${mL ? 1 : 0}|${mR ? 1 : 0}|${vr}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d');
    const ph1 = vr * 1.3, ph2 = vr * 2.1;
    const inside = (X, Y) => {
      if (Y < 0 || Y > 17) return false;
      const ell = (X, Y) => { const u = (X + .5 - 8) / 7.7, w = (Y + .5 - 8.5) / 8.4; return u * u + w * w <= 1 + 0.08 * Math.sin(X * 2.1 + ph1) * Math.sin(Y * 1.7 + ph2); };
      if (X < 0) return mL && (ell(X + 16, Y) || Y >= 3 && Y <= 14); if (X > 15) return mR && (ell(X - 16, Y) || Y >= 3 && Y <= 14);
      if (mL && X < 8 && (ell(X + 16, Y) || Y >= 3 && Y <= 14)) return true;
      if (mR && X >= 8 && (ell(X - 16, Y) || Y >= 3 && Y <= 14)) return true;
      return ell(X, Y);
    };
    // tronco
    px(x, p.treeOut, 5, 15, 6, 9); px(x, p.trunk2, 6, 15, 4, 9); px(x, p.trunk, 7, 15, 2, 8); px(x, p.treeOut, 4, 23); px(x, p.treeOut, 11, 23); px(x, p.trunk2, 5, 22); px(x, p.trunk2, 10, 22);
    // copa
    for (let Y = 0; Y <= 17; Y++) for (let X = 0; X < 16; X++) {
      if (!inside(X, Y)) continue;
      if (!inside(X - 1, Y) || !inside(X + 1, Y) || !inside(X, Y - 1) || !inside(X, Y + 1)) { px(x, p.treeOut, X, Y); continue; }
      const u = (X + .5 - 8) / 7.7, w = (Y + .5 - 8.5) / 8.4;
      const lam = -u * .45 - w * .7 + .32 * Math.sin(X * 1.9 + ph1) * Math.sin(Y * 1.5 + ph2) + .12 * Math.sin(X * .9 + Y * 1.1 + vr);
      px(x, lam > .5 ? p.treeHi : lam > .05 ? p.tree : lam > -.42 ? p.tree2 : p.treeOut, X, Y);
    }
    return c;
  });
}
// El mapa: sustituimos marcadores por hierba y guardamos posiciones
const MAP = { w: DATA.map[0].length, h: DATA.map.length, rows: [], spawn: [3, 21], spots: [] };
DATA.map.forEach((row, y) => {
  let out = '';
  for (let x = 0; x < row.length; x++) {
    let ch = row[x];
    if (ch === 'P') { MAP.spawn = [x, y]; ch = '.'; }
    else if (DATA.encounters[ch]) { MAP.spots.push({ key: ch, x, y }); ch = ch === 'B' ? ',' : (ch === '5' ? ',' : '.'); }
    out += ch;
  }
  MAP.rows.push(out);
});
const tileAt = (tx, ty) => (ty < 0 || ty >= MAP.h || tx < 0 || tx >= MAP.w) ? 'T' : MAP.rows[ty][tx];
const solid = ch => ch === 'T' || ch === '~' || ch === 'r';

// --- Texto y ventanas
const FONT = '8px "Press Start 2P", monospace';
function txt(s, x, y, col = '#f4f0ea', shadowCol = '#14121c') {
  g.font = FONT; g.textBaseline = 'top';
  if (shadowCol) { g.fillStyle = shadowCol; g.fillText(s, x + 1, y + 1); }
  g.fillStyle = col; g.fillText(s, x, y);
}
function txtC(s, cx, y, col, sh) { g.font = FONT; const w = g.measureText(s).width; txt(s, Math.round(cx - w / 2), y, col, sh); }
function bar(x, y, w, h, t, col, bg = '#0b0912') { g.fillStyle = bg; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x + 1, y + 1, Math.round((w - 2) * clamp(t, 0, 1)), h - 2); }
function cursor(x, y, col = '#f4f0ea') { g.fillStyle = col; g.fillRect(x, y, 1, 5); g.fillRect(x + 1, y + 1, 1, 3); g.fillRect(x + 2, y + 2, 1, 1); g.fillStyle = '#14121c'; g.fillRect(x, y + 5, 3, 1); }

// =====================================================================
// 3. Estado global de partida
// =====================================================================
const Game = { state: 'title', t: 0, pigmento: 0, palette: 'gris', inventory: { ...DATA.inventory }, defeated: new Set(), bossDown: false, intro: true, debug: false };
function effStats(p) { // base + arma + accesorio
  const wpn = DATA.weapons[p.weapon] || {}, acc = DATA.accessories[p.acc] || {};
  const s = { hp: p.hp, mp: p.mp, atk: p.atk, def: p.def, spd: p.spd };
  for (const k in s) s[k] += (wpn[k] || 0) + (acc[k] || 0);
  return s;
}
// Estado persistente del grupo (HP/MP actuales entre batallas)
const Party = DATA.party.map(p => { const s = effStats(p); return { ...p, cur: { hp: s.hp, mp: s.mp } }; });
function setState(s) { Game.state = s; Game.t = 0; }

// =====================================================================
// 4. Mapa del mundo (overworld)
// =====================================================================
const OW = { x: 0, y: 0, cam: { x: 0, y: 0 }, hist: [], moving: false, t: 0, msg: null, menu: null, foes: [] };
function initOverworld() {
  OW.x = MAP.spawn[0] * TILE + 8; OW.y = MAP.spawn[1] * TILE + 12; OW.hist = [];
  OW.foes = MAP.spots.map(s => ({ key: s.key, hx: s.x * TILE + 8, hy: s.y * TILE + 12, x: s.x * TILE + 8, y: s.y * TILE + 12, tx: 0, ty: 0, t: RI(0, 60), enemies: DATA.encounters[s.key], boss: s.key === 'B', seed: s.x * 7 + s.y }));
  if (Game.intro) OW.msg = { lines: DATA.texts.intro, t: 0 };
}
function walkable(px, py) { // hitbox pies 8×6
  for (const [dx, dy] of [[-4, -1], [3, -1], [-4, 3], [3, 3]]) if (solid(tileAt((px + dx) / TILE | 0, (py + dy) / TILE | 0))) return false;
  return true;
}
function updateOverworld() {
  OW.t++;
  if (OW.msg) { OW.msg.t++; if (OW.msg.t > 20 && (hit('ok') || hit('back'))) { OW.msg = null; Audio.sfx('page'); Game.intro = false; if (OW.msg === null && Game.bossDown && !Game.ended) Game.ended = true; } return; }
  if (OW.menu) { updateMenu(); return; }
  if (hit('ok')) { openMenu(); return; }
  let dx = 0, dy = 0; if (keys.left) dx--; if (keys.right) dx++; if (keys.up) dy--; if (keys.down) dy++;
  OW.moving = !!(dx || dy);
  if (OW.moving) {
    const sp = 1.25, nx = OW.x + dx * sp, ny = OW.y + dy * sp;
    if (walkable(nx, OW.y)) OW.x = nx; if (walkable(OW.x, ny)) OW.y = ny;
    OW.hist.unshift([OW.x, OW.y]); if (OW.hist.length > 40) OW.hist.pop();
    if (OW.t % 14 === 0) { const tx = OW.x / TILE | 0, ty = (OW.y + 3) / TILE | 0, ch = tileAt(tx, ty); const wood = ch === '=' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(tx + a, ty + b) === '~'); Audio.sfx(wood ? 'step_wood' : ch === '=' ? 'step_path' : 'step_grass', { pan: (OW.t / 14 & 1) ? .15 : -.15 }); }
  }
  // enemigos del mapa: deambulan, persiguen si estás cerca
  for (const f of OW.foes) {
    if (Game.defeated.has(f.key)) continue;
    const d = Math.hypot(OW.x - f.x, OW.y - f.y);
    if (d < 56 && !f.seen) { f.seen = true; Audio.sfx('detect'); } else if (d > 96) f.seen = false;
    if (f.boss) { f.x = f.hx; f.y = f.hy; }
    else if (d < 56) { const a = Math.atan2(OW.y - f.y, OW.x - f.x); const nx = f.x + Math.cos(a) * .7, ny = f.y + Math.sin(a) * .7; if (walkable(nx, ny)) { f.x = nx; f.y = ny; } }
    else { if (--f.t <= 0) { f.t = RI(60, 150); f.tx = f.hx + R(-24, 24); f.ty = f.hy + R(-16, 16); } const a = Math.atan2(f.ty - f.y, f.tx - f.x); if (Math.hypot(f.tx - f.x, f.ty - f.y) > 2) { const nx = f.x + Math.cos(a) * .4, ny = f.y + Math.sin(a) * .4; if (walkable(nx, ny)) { f.x = nx; f.y = ny; } } }
    if (d < 11) { startTransition(f); return; }
  }
  OW.cam.x = clamp(Math.round(OW.x - W / 2), 0, MAP.w * TILE - W); OW.cam.y = clamp(Math.round(OW.y - H / 2), 0, MAP.h * TILE - H);
}
function mapDef(p, size = 1) { return { color: C(p.color), shape: p.shape, w: Math.round(p.w * .5 * size), h: Math.round(p.h * .5 * size), seed: 3 }; }
function drawOverworld() {
  const cx = OW.cam.x, cy = OW.cam.y, wf = (OW.t / 9 | 0) % 4, pal = Game.palette;
  const ents = [];
  for (let ty = cy / TILE | 0; ty <= (cy + H) / TILE + 1; ty++) for (let tx = cx / TILE | 0; tx <= (cx + W) / TILE; tx++) {
    const ch = tileAt(tx, ty); g.drawImage(groundTile(tx, ty, pal, ch === '~' ? wf : 0), tx * TILE - cx, ty * TILE - cy);
    if (ch === 'T' && ty < MAP.h) ents.push({ y: ty * TILE + TILE, draw: () => g.drawImage(treeSprite(pal, tileAt(tx - 1, ty) === 'T', tileAt(tx + 1, ty) === 'T', hash2(tx, ty) & 7), tx * TILE - cx, ty * TILE - 8 - cy) });
  }
  // seguidores (Ámbar y Añil detrás del líder, estilo CT)
  Party.forEach((p, i) => {
    let x = OW.x, y = OW.y; if (i > 0) { const h = OW.hist[Math.min(OW.hist.length - 1, i * 12)]; if (h) { x = h[0]; y = h[1]; } else { x = OW.x - i * 12; } }
    const frame = OW.moving ? (OW.t / 6 | 0) % 4 : (OW.t / 14 | 0) % 4;
    ents.push({ y, draw: () => { shadow(x - cx, y - cy, 8); drawDrop(mapDef(p), x - cx, y - cy, p.cur.hp <= 0 ? 'ko' : (OW.moving ? (frame % 2 ? 'hop' : 'hurt') : 'idle'), frame); } });
  });
  for (const f of OW.foes) {
    if (Game.defeated.has(f.key)) continue;
    const e = DATA.enemies[f.enemies[0]], core = e.color === 'negro' ? null : C(e.color);
    const def = { color: C('negro'), core, shape: e.shape, w: f.boss ? 24 : 12, h: f.boss ? 20 : 12, seed: f.seed };
    ents.push({ y: f.y, draw: () => { shadow(f.x - cx, f.y - cy, f.boss ? 16 : 8); drawDrop(def, f.x - cx, f.y - cy, 'idle', (OW.t / 10 + f.seed | 0) % 4, { dark: true }); } });
  }
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  // HUD
  win(4, 4, 124, 16); swatch(8, 8, C('amarillo')); ui('PIGMENTO ' + Game.pigmento, 18, 8, TXT);
  if (OW.msg) drawMessage(OW.msg.lines);
  if (OW.menu) drawMenu();
}
function drawMessage(lines) {
  const h = lines.length * 10 + 14; win(8, H - h - 8, W - 16, h);
  lines.forEach((l, i) => ui(l, 16, H - h - 1 + i * 10, i === 0 ? GOLD : TXT));
  if ((Game.t / 20 | 0) % 2) ui('▼', W - 24, H - 16, TXT2);
}
// --- Menú de estado/equipo (Enter en el mapa)
const ACC_LIST = Object.keys(DATA.accessories);
function openMenu() { OW.menu = { idx: 0 }; Audio.sfx('book_open'); }
function updateMenu() {
  const m = OW.menu;
  if (hit('back')) { OW.menu = null; Audio.sfx('book_close'); return; }
  if (hit('down')) { m.idx = (m.idx + 1) % 3; Audio.sfx('cursor', semiOf(Party[m.idx])); }
  if (hit('up')) { m.idx = (m.idx + 2) % 3; Audio.sfx('cursor', semiOf(Party[m.idx])); }
  const p = Party[m.idx];
  if (hit('left') || hit('right')) {
    const before = effStats(p); const i = ACC_LIST.indexOf(p.acc); p.acc = ACC_LIST[(i + (hit.__dir = keys.right ? 1 : ACC_LIST.length - 1)) % ACC_LIST.length];
    const after = effStats(p); p.cur.hp = clamp(p.cur.hp + after.hp - before.hp, 1, after.hp); p.cur.mp = clamp(p.cur.mp + after.mp - before.mp, 0, after.mp); Audio.sfx('equip');
  }
}
function drawMenu() {
  g.fillStyle = 'rgba(11,9,18,0.45)'; g.fillRect(0, 0, W, H);
  win(8, 8, 304, 164);
  ui('CHROMARA', 16, 14, GOLD); swatch(196, 14, C('amarillo')); ui('Pigmento ' + Game.pigmento, 206, 14, TXT);
  Party.forEach((p, i) => {
    const y = 28 + i * 34, s = effStats(p), sel = OW.menu.idx === i;
    if (sel) { hilite(24, y + 14, 296, 28, C(p.color), .2); dropCursor(16, y + 8, C(p.color)); }
    drawDrop({ color: C(p.color), shape: p.shape, w: Math.round(p.w * .7), h: Math.round(p.h * .7) }, 36, y + 26, 'idle', (Game.t / 12 + i | 0) % 4);
    ui(p.name, 56, y, sel ? TXT : C(p.color)); ui(p.role, 56, y + 10, TXT2);
    ui(`HP ${p.cur.hp}/${s.hp}`, 120, y, TXT); ui(`MP ${p.cur.mp}/${s.mp}`, 120, y + 10, TXT);
    ui(`ATK${s.atk} DEF${s.def} SPD${s.spd}`, 120, y + 20, TXT2);
    g.drawImage(iconSprite(p.weapon, C(p.color)), 220, y - 2); ui(DATA.weapons[p.weapon].name, 234, y, TXT);
    ui((sel ? '◄' : ' ') + DATA.accessories[p.acc].name + (sel ? '►' : ''), 226, y + 10, sel ? GOLD : TXT);
  });
  const p = Party[OW.menu.idx];
  win(8, 132, 304, 40);
  ui(DATA.accessories[p.acc].desc, 16, 138, TXT);
  const inv = Object.entries(Game.inventory).filter(([, n]) => n > 0).map(([k, n]) => `${DATA.items[k].short || DATA.items[k].name} x${n}`).join('  ');
  ui(inv || 'Sin objetos', 16, 150, TXT2);
  ui('◄► accesorio   X cerrar', 16, 161, TXT3);
}

// =====================================================================
// 7. Título, bucle principal, debug
// =====================================================================
function drawTitle() {
  g.fillStyle = '#14121c'; g.fillRect(0, 0, W, H);
  const word = 'CHROMARA', cols = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'rojo', 'amarillo'];
  g.font = FONT; const cw = 8 * 2;
  word.split('').forEach((ch, i) => { const y = 50 + Math.sin(Game.t * .08 + i * .6) * 3; g.save(); g.translate(W / 2 - word.length * cw / 2 + i * cw, y); g.scale(2, 2); txt(ch, 0, 0, C(cols[(i + (Game.t / 30 | 0)) % cols.length])); g.restore(); });
  txtC('Las gotas que devolvieron el color', W / 2, 88, '#b8b4cc');
  DATA.party.forEach((p, i) => { const x = W / 2 - 40 + i * 40; shadow(x, 132, 16); drawDrop({ color: C(p.color), shape: p.shape, w: p.w, h: p.h, seed: 3 }, x, 132 - Math.abs(Math.sin(Game.t * .1 + i)) * 4, 'idle', (Game.t / 10 + i | 0) % 4); });
  if ((Game.t / 30 | 0) % 2) txtC('PULSA Z / ENTER', W / 2, 156, '#f4f0ea');
  txtC('PoC · Fable 5 · 320x180', W / 2, 170, '#4a4460', null);
}
function drawDebug() {
  win(W - 124, 24, 120, 70, { solid: 'rgba(11,9,18,0.85)' }); txt('DEBUG', W - 114, 28, '#f2c93a');
  ['1-6/B: batalla', 'H: curar', 'F: ATB lleno', 'K: enemigos 1HP', 'C: paleta', 'W: Active/Wait'].forEach((s, i) => txt(s, W - 114, 38 + i * 9, '#b8b4cc'));
}
addEventListener('keydown', e => {
  if (!Game.debug) return; const k = e.key.toUpperCase();
  if (Game.state === 'overworld' && (DATA.encounters[k])) { const f = OW.foes.find(x => x.key === k); if (f) startTransition(f); }
  if (k === 'H') { Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); if (Game.state === 'battle') B.party.forEach(u => { u.hp = u.maxhp; u.mp = u.maxmp; u.alive = true; u.pose = 'idle'; }); }
  if (k === 'F' && Game.state === 'battle') B.party.forEach(u => { if (u.alive) u.atb = 100; });
  if (k === 'K' && Game.state === 'battle') B.enemies.forEach(u => { if (u.alive) u.hp = 1; });
  if (k === 'C') Game.palette = Game.palette === 'gris' ? 'vivo' : 'gris';
  if (k === 'W') { ATB_ACTIVE = !ATB_ACTIVE; if (Game.state === 'battle') say('ATB ' + (ATB_ACTIVE ? 'ACTIVE' : 'WAIT'), '#f4f0ea'); }
});
let last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  acc += Math.min(50, ts - last); last = ts;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  render();
}
function update() {
  if (hit('debug')) Game.debug = !Game.debug;
  if (typeof SFX !== 'undefined') { const want = Game.state === 'overworld' ? Game.palette : null; if ((SFX.amb ? SFX.amb.mode : null) !== want) SFX.ambient(want); }
  if (Game.paused) { for (const k in pressed) pressed[k] = false; return; }
  Game.t++;
  switch (Game.state) {
    case 'title': if (hit('ok')) { Audio.sfx('ok'); initOverworld(); setState('overworld'); Audio.play('map'); } break;
    case 'overworld': updateOverworld(); break;
    case 'transition': updateTransition(); break;
    case 'battle': updateBattle(); break;
  }
  for (const k in pressed) pressed[k] = false;
}
function render() {
  g.imageSmoothingEnabled = false;
  switch (Game.state) {
    case 'title': drawTitle(); break;
    case 'overworld': drawOverworld(); break;
    case 'transition': drawTransition(); break;
    case 'battle': drawBattle(); break;
  }
  if (Game.debug) drawDebug();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, W * SCALE, H * SCALE);
}
// Hooks de depuración
window.__chromara = {
  Game, Party, OW, B, DATA, MAP,
  battle(key) { const f = OW.foes.find(x => x.key === String(key)); if (f) { startTransition(f); } return !!f; },
  heal() { Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); },
  atb() { if (B.party) B.party.forEach(u => u.atb = 100); },
  kill() { if (B.enemies) B.enemies.forEach(u => u.alive && (u.hp = 1)); },
  win() { if (B.enemies) B.enemies.forEach(u => u.alive && kill(u)); checkEnd(); },
  start() { if (Game.state === 'title') { initOverworld(); setState('overworld'); } },
  pause(v = !Game.paused) { Game.paused = v; },
  colorize() { Game.palette = Game.palette === 'gris' ? 'vivo' : 'gris'; },
  sprite(o) { return makeDrop(o); },
};
const boot = () => requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(boot, boot); else boot();
