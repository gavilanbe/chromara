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
  OW.x = MAP.spawn[0] * TILE + 8; OW.y = MAP.spawn[1] * TILE + 12; OW.hist = []; OW.puddles = []; OW.dust = []; OW.vx = OW.vy = 0; OW.bob = 0; OW.dir = 'down'; OW.cam.x = clamp(OW.x - W / 2, 0, MAP.w * TILE - W); OW.cam.y = clamp(OW.y - H / 2, 0, MAP.h * TILE - H);
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
  // movimiento con aceleración y frenada; el líder bota al andar (es una gota)
  let dx = 0, dy = 0; if (keys.left) dx--; if (keys.right) dx++; if (keys.up) dy--; if (keys.down) dy++;
  if (dx && dy) { dx *= .707; dy *= .707; }
  const sp = 1.35; OW.vx = lerp(OW.vx || 0, dx * sp, dx ? .3 : .45); OW.vy = lerp(OW.vy || 0, dy * sp, dy ? .3 : .45);
  if (Math.abs(OW.vx) < .04) OW.vx = 0; if (Math.abs(OW.vy) < .04) OW.vy = 0;
  const speed = Math.hypot(OW.vx, OW.vy); OW.moving = speed > .1;
  if (dx || dy) OW.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  if (OW.moving) {
    const nx = OW.x + OW.vx, ny = OW.y + OW.vy;
    if (walkable(nx, OW.y)) OW.x = nx; else OW.vx = 0; if (walkable(OW.x, ny)) OW.y = ny; else OW.vy = 0;
    OW.hist.unshift([OW.x, OW.y]); if (OW.hist.length > 40) OW.hist.pop();
    const prev = OW.bob || 0; OW.bob = prev + speed * .11;
    if (Math.floor(OW.bob) > Math.floor(prev)) { // aterrizaje: gotitas del color del líder y paso según el terreno
      const tx = OW.x / TILE | 0, ty = (OW.y + 3) / TILE | 0, ch = tileAt(tx, ty); const wood = ch === '=' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(tx + a, ty + b) === '~');
      Audio.sfx(wood ? 'step_wood' : ch === '=' ? 'step_path' : 'step_grass', { pan: (Math.floor(OW.bob) & 1) ? .15 : -.15 });
      for (let i = 0; i < 2; i++) OW.dust.push({ x: OW.x + R(-2, 2), y: OW.y + 1, vx: R(-.5, .5), vy: -R(.4, .9), col: C(Party[0].color), t: 0, life: RI(10, 16) });
    }
  } else { OW.bob = 0; }
  for (const d of OW.dust) { d.x += d.vx; d.y += d.vy; d.vy += .12; d.t++; } OW.dust = OW.dust.filter(d => d.t < d.life);
  // enemigos del mapa: deambulan, te ven (¡) y persiguen
  for (const f of OW.foes) {
    if (Game.defeated.has(f.key)) continue;
    const d = Math.hypot(OW.x - f.x, OW.y - f.y);
    if (d < 56 && !f.seen) { f.seen = true; f.alert = 30; Audio.sfx('detect'); } else if (d > 96) f.seen = false;
    if (f.alert > 0) f.alert--;
    if (f.boss) { f.x = f.hx; f.y = f.hy; }
    else if (d < 56) { if (f.alert > 12) { /* se queda quieto un instante al verte */ } else { const a = Math.atan2(OW.y - f.y, OW.x - f.x); const nx = f.x + Math.cos(a) * .85, ny = f.y + Math.sin(a) * .85; if (walkable(nx, ny)) { f.x = nx; f.y = ny; } } }
    else { if (--f.t <= 0) { f.t = RI(60, 150); f.tx = f.hx + R(-24, 24); f.ty = f.hy + R(-16, 16); } const a = Math.atan2(f.ty - f.y, f.tx - f.x); if (Math.hypot(f.tx - f.x, f.ty - f.y) > 2) { const nx = f.x + Math.cos(a) * .4, ny = f.y + Math.sin(a) * .4; if (walkable(nx, ny)) { f.x = nx; f.y = ny; } } }
    f.dirLeft = (d < 56 ? OW.x < f.x : f.tx < f.x);
    if (d < 11) { startTransition(f); return; }
  }
  // cámara suave con un poco de anticipación hacia donde vas
  const gx = clamp(OW.x - W / 2 + (OW.vx || 0) * 16, 0, MAP.w * TILE - W), gy = clamp(OW.y - H / 2 + (OW.vy || 0) * 10, 0, MAP.h * TILE - H);
  OW.cam.x = lerp(OW.cam.x, gx, .12); OW.cam.y = lerp(OW.cam.y, gy, .12);
}
// Sprite de un miembro del grupo en el mapa: vista según dirección (espaldas al subir, frente al bajar, perfil a los lados)
const DIRVIEW = { up: 'back', down: 'front', left: 'side', right: 'side' };
function mapDrop(p, x, y, dir, bob, moving, t, idx) {
  const col = C(p.color), dead = p.cur.hp <= 0, view = dead ? 'front' : DIRVIEW[dir] || 'back';
  const blink = !moving && ((t + idx * 53) % 170) < 6, spr = buildSprite(`${p.id}_${view}_mini`, col, null, { eyes: dead ? 'ko' : blink ? 'blink' : 'normal' });
  const hop = moving ? Math.abs(Math.sin(bob * Math.PI)) : 0, wz = hop * 3, sq = moving ? (hop < .15 ? [1.1, .9] : hop > .85 ? [.94, 1.06] : [1, 1]) : (((t / 14 | 0) + idx) % 4 === 1 ? [1.03, .97] : [1, 1]);
  shadow(x, y, Math.round((p.w * .42) * (1 - hop * .3)));
  if (dead) { drawSprite(spr, x, y, 1, false, .45); return; }
  drawSprite(spr, x, Math.round(y - wz), sq[0], dir === 'right', sq[1]);
  if (p.id === 'anil') drawSatellites(x, y - wz, t + idx * 10, col, .4);
}
function drawOverworld() {
  const cx = Math.round(OW.cam.x), cy = Math.round(OW.cam.y), wf = (OW.t / 9 | 0) % 4, pal = Game.palette;
  const ents = [];
  for (let ty = cy / TILE | 0; ty <= (cy + H) / TILE + 1; ty++) for (let tx = cx / TILE | 0; tx <= (cx + W) / TILE; tx++) {
    const ch = tileAt(tx, ty); g.drawImage(groundTile(tx, ty, pal, ch === '~' ? wf : 0), tx * TILE - cx, ty * TILE - cy);
    if (ch === 'T' && ty < MAP.h) ents.push({ y: ty * TILE + TILE, draw: () => g.drawImage(treeSprite(pal, tileAt(tx - 1, ty) === 'T', tileAt(tx + 1, ty) === 'T', hash2(tx, ty) & 7), tx * TILE - cx, ty * TILE - 8 - cy) });
  }
  for (const p of OW.puddles || []) { const x = p.x - cx, y = p.y - cy; if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue; g.fillStyle = ramp(p.col).sh; g.beginPath(); g.ellipse(x, y + 2, p.w, p.w * .45, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).base; g.beginPath(); g.ellipse(x - 1, y + 1, p.w - 2, p.w * .4 - 1, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).hi; g.fillRect(x - p.w * .5 | 0, y - 1, 3, 1); }
  // grupo: líder y seguidores por la estela (estilo CT), cada uno mirando hacia donde avanza
  Party.forEach((p, i) => {
    let x = OW.x, y = OW.y, dir = OW.dir || 'down';
    if (i > 0) { const h = OW.hist[Math.min(OW.hist.length - 1, i * 12)], h2 = OW.hist[Math.min(OW.hist.length - 1, i * 12 + 4)]; if (h) { x = h[0]; y = h[1]; if (h2) { const ddx = h[0] - h2[0], ddy = h[1] - h2[1]; if (Math.abs(ddx) + Math.abs(ddy) > .5) dir = Math.abs(ddx) >= Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : (ddy < 0 ? 'up' : 'down'); else dir = OW.dir || 'down'; } } else { x = OW.x - i * 12; } }
    const moving = OW.moving && (i === 0 || OW.hist.length > i * 12);
    ents.push({ y, draw: () => mapDrop(p, x - cx, y - cy, dir, (OW.bob || 0) + i * .33, moving, OW.t, i) });
  });
  for (const f of OW.foes) {
    if (Game.defeated.has(f.key)) continue;
    const e = DATA.enemies[f.enemies[0]], core = e.color === 'negro' ? null : C(e.color);
    ents.push({ y: f.y, draw: () => { const hop = Math.abs(Math.sin((OW.t + f.seed * 7) * (f.seen ? .25 : .12))) * (f.seen ? 4 : 2), x = f.x - cx, y = f.y - cy; shadow(x, y, f.boss ? 18 : 8); const spr = buildSprite(f.enemies[0] + '_mini', C('negro'), core, { eyes: f.alert > 0 ? 'happy' : 'normal' }); drawSprite(spr, x, Math.round(y - hop), 1, f.dirLeft); if (f.alert > 0) { const by = y - spr.height - 10 + (f.alert > 24 ? (30 - f.alert) : 0); g.fillStyle = '#f4f0ea'; g.fillRect(x - 1, by, 2, 6); g.fillRect(x - 1, by + 8, 2, 2); } } });
  }
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  for (const d of OW.dust) { g.fillStyle = d.t < d.life * .6 ? ramp(d.col).base : ramp(d.col).sh; g.fillRect(Math.round(d.x - cx), Math.round(d.y - cy), 1, 1); }
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
// ---- Título: página en blanco → cae una gota de tinta → la mancha abre un agujero por el que se ve Chromara en vuelo (Mode 7)
// → las letras se pintan a brochazos, una a una y de su color → las tres gotas aterrizan con salpicón → cinta con "PULSA Z"
const TITLE = { t: 0, cam: { x: 320, y: 240, yaw: 0, pitch: .52, h: 120, f: 170, hy: 64 }, balls: null, letters: 'CHROMARA', cols: ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'rojo', 'amarillo'], sfxd: {} };
function titleSfx(k, name, o) { if (!TITLE.sfxd[k]) { TITLE.sfxd[k] = 1; Audio.sfx(name, o); } }
// ---- Logo gooey: cada letra es un brochazo de pintura de su color con la base abultada (la pintura se acumula abajo),
// se menea como gelatina por franjas, hace pop al pintarse, salpica, forma un charquito bajo la letra y suelta goterones.
const LOGO_W = 20, LOGO_H = 26, POOLS = { C: [[14, 19]], H: [[4, 21], [15, 21]], R: [[4, 21], [15, 21]], O: [[10, 20]], M: [[3, 21], [16, 21]], A: [[3, 21], [16, 21]] };
function logoPath(x, ch) {
  x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
  switch (ch) {
    case 'C': x.arc(11, 13, 7, 0.8, 5.5); break;
    case 'H': x.moveTo(4, 4); x.lineTo(4, 21); x.moveTo(15, 4); x.lineTo(15, 21); x.moveTo(4, 12.5); x.lineTo(15, 12.5); break;
    case 'R': x.moveTo(4, 21); x.lineTo(4, 4); x.lineTo(11, 4); x.arc(11, 8.5, 4.5, -Math.PI / 2, Math.PI / 2); x.lineTo(4, 13); x.moveTo(9, 13); x.lineTo(15, 21); break;
    case 'O': x.ellipse(10, 12.5, 6, 8.5, 0, 0, 6.29); break;
    case 'M': x.moveTo(3, 21); x.lineTo(3, 4); x.lineTo(9.5, 14); x.lineTo(16, 4); x.lineTo(16, 21); break;
    case 'A': x.moveTo(3, 21); x.lineTo(9.5, 4); x.lineTo(16, 21); x.moveTo(6, 15.5); x.lineTo(13, 15.5); break;
  }
  x.stroke();
  for (const [px, py] of POOLS[ch] || []) { x.beginPath(); x.arc(px, py, 4.6, 0, 6.29); x.fill(); } // pintura acumulada en la base
}
function logoLetter(ch, col) {
  return cached(`logo|${ch}|${col}`, () => {
    const m = document.createElement('canvas'); m.width = LOGO_W; m.height = LOGO_H; const mx = m.getContext('2d'); mx.strokeStyle = mx.fillStyle = '#fff'; logoPath(mx, ch);
    const md = mx.getImageData(0, 0, LOGO_W, LOGO_H).data, inside = (X, Y) => X >= 0 && Y >= 0 && X < LOGO_W && Y < LOGO_H && md[(Y * LOGO_W + X) * 4 + 3] > 110;
    const c = document.createElement('canvas'); c.width = LOGO_W + 2; c.height = LOGO_H + 2; const x = c.getContext('2d'), rp = ramp(col), rnd = seeded(ch.charCodeAt(0) * 7);
    for (let Y = 0; Y < LOGO_H; Y++) for (let X = 0; X < LOGO_W; X++) {
      if (!inside(X, Y)) continue;
      const edge = !inside(X - 1, Y) || !inside(X + 1, Y) || !inside(X, Y - 1) || !inside(X, Y + 1);
      let tone; if (edge) tone = rp.out; else { const v = (Y / LOGO_H) + (rnd() - .5) * .22 + ((Y * 3 + X) % 5 === 0 ? .12 : 0); tone = !inside(X, Y - 2) || !inside(X - 1, Y - 1) ? rp.hi : !inside(X, Y + 2) || !inside(X + 1, Y + 1) ? rp.dk : v < .32 ? rp.hi : v < .64 ? rp.base : v < .86 ? rp.sh : rp.dk; }
      x.fillStyle = tone; x.fillRect(X + 1, Y + 1, 1, 1);
    }
    x.fillStyle = rp.spec; for (let Y = 2; Y < LOGO_H; Y++) for (let X = 1; X < LOGO_W; X++) if (inside(X, Y) && !inside(X - 1, Y - 1) && inside(X + 1, Y + 1) && inside(X + 2, Y + 2) && rnd() < .6) x.fillRect(X + 1, Y + 1, 1, 1);
    return c;
  });
}
// dibuja un sprite meneándose como gelatina: franjas horizontales con desfase horizontal y estirado vertical
function drawGooey(spr, x, y, wob, sy = 1, phase = 0) {
  const h = spr.height, hh = Math.round(h * sy);
  for (let r = 0; r < hh; r += 2) { const srcY = Math.min(h - 1, Math.round(r / sy)), rows = Math.min(2, h - srcY); const off = Math.round(Math.sin(phase + r * .28) * wob * (r / hh)); g.drawImage(spr, 0, srcY, spr.width, rows, Math.round(x + off), Math.round(y + h - hh + r), spr.width, Math.round(rows * sy)); }
}
function drawLogo(t, x0, y0) {
  const word = TITLE.letters, cw = 23; TITLE.L = TITLE.L || word.split('').map(() => ({ painted: -1, drips: [], spl: [] }));
  const baseY = y0 + LOGO_H;
  // charquitos de pintura bajo las letras (se juntan entre sí)
  word.split('').forEach((ch, i) => { const S = TITLE.L[i]; if (S.painted < 0) return; const q = clamp((t - S.painted) / 40, 0, 1), col = C(TITLE.cols[i]), x = x0 + i * cw + LOGO_W / 2 + 1; g.fillStyle = ramp(col).sh; g.beginPath(); g.ellipse(x, baseY + 2, (6 + q * 10) * 1.1, 2 + q * 2.2, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(col).base; g.beginPath(); g.ellipse(x - 1, baseY + 1.5, 5 + q * 9, 1.5 + q * 1.6, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(col).hi; g.fillRect(x - 5, baseY + 1, 3, 1); });
  word.split('').forEach((ch, i) => {
    const S = TITLE.L[i], k = clamp((t - 100 - i * 9) / 12, 0, 1); if (k <= 0) return;
    const col = C(TITLE.cols[i]), rp = ramp(col), spr = logoLetter(ch, col), x = x0 + i * cw;
    if (k < 1) titleSfx('l' + i, 'brush_sweep', { pan: (i - 4) * .1, vol: .5 });
    if (k >= 1 && S.painted < 0) { S.painted = t; Audio.sfx('plop', { semi: i * 2 - 6 }); for (let j = 0; j < 10; j++) S.spl.push({ x: x + LOGO_W / 2 + R(-6, 6), y: y0 + LOGO_H / 2 + R(-8, 8), vx: R(-1.6, 1.6), vy: -R(.5, 2.4), t: 0 }); S.drips = [{ x: (POOLS[ch] || [[10, 20]])[0][0] + R(-1, 1), len: 0, max: R(5, 11), speed: R(.08, .16) }]; if (POOLS[ch] && POOLS[ch][1] && Math.random() < .6) S.drips.push({ x: POOLS[ch][1][0], len: 0, max: R(3, 8), speed: R(.06, .12) }); }
    const since = S.painted < 0 ? 0 : t - S.painted, pop = S.painted < 0 ? 0 : Math.max(0, 1 - since / 26), popS = 1 + Math.sin(since * .5) * .28 * pop;
    // onda de gelatina que recorre la palabra cada pocos segundos: cada letra hace boing al pasar, con un chispazo en su luz
    const wv = t > 320 ? ((t - 320) % 260) / 260 : -1, wk = wv < 0 ? 0 : clamp(1 - Math.abs(wv * (word.length + 3) - 1.5 - i), 0, 1), boing = Math.sin(wk * Math.PI);
    const wob = .8 + pop * 4 + boing * 3.5 + (t > 200 ? Math.sin(t * .05 + i) * .3 + .3 : 0), sy = popS * (1 + Math.sin(t * .11 + i * .9) * .025 + boing * .14), phase = t * .18 + i * 1.3;
    if (boing > .85 && S.drips[0] && S.drips[0].len < S.drips[0].max) S.drips[0].len += .5;
    const bob = t > 200 ? Math.sin(t * .06 + i * .7) * 1.5 : 0, y = Math.round(y0 + bob) + (k < 1 ? (1 - k) * 6 | 0 : 0);
    g.save(); g.beginPath(); g.rect(x - 3, y - 6, Math.round((spr.width + 6) * k), spr.height + 10); g.clip();
    g.globalAlpha = .4; g.drawImage(spr, x + 2, y + 3); g.globalAlpha = 1; // sombra de tinta
    drawGooey(spr, x, y, wob, sy, phase);
    g.restore();
    if (boing > .6) { const q = (boing - .6) / .4, r = Math.round(1 + q * 3), cx2 = x + 5, cy2 = y + 5 - Math.round(boing * 3); g.fillStyle = '#ffffff'; g.fillRect(cx2 - r, cy2, r * 2 + 1, 1); g.fillRect(cx2, cy2 - r, 1, r * 2 + 1); g.fillStyle = rp.hi; g.fillRect(cx2 - 1, cy2 - 1, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(cx2, cy2, 1, 1); }
    // goterones que crecen y se desprenden
    for (const d of S.drips) { d.len = Math.min(d.max, d.len + d.speed); const dx = x + d.x + 1, dy = baseY + Math.round(bob), L = Math.round(d.len); g.fillStyle = rp.out; g.fillRect(dx - 1, dy - 2, 3, L + 3); g.fillStyle = rp.base; g.fillRect(dx, dy - 2, 1, L + 1); g.fillStyle = rp.sh; g.fillRect(dx + 1, dy - 1, 1, L); g.fillStyle = rp.out; g.fillRect(dx - 1, dy + L + 1, 3, 1); g.fillRect(dx, dy + L + 2, 1, 1); g.fillStyle = rp.hi; g.fillRect(dx, dy, 1, 1);
      if (d.len >= d.max && Math.random() < .012) { (TITLE.drips = TITLE.drips || []).push({ x: dx, y: dy + L, vy: .3, col, t: 0 }); d.len = d.max * .35; d.max = R(4, 10); } }
    // salpicaduras del pop
    for (const p of S.spl) { p.t++; p.x += p.vx; p.y += p.vy; p.vy += .12; g.fillStyle = p.t < 10 ? rp.hi : rp.base; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); } S.spl = S.spl.filter(p => p.t < 22);
    if (k < 1) { const img = propSprite('brocha', col), P = PROP.brocha; hilite(x - 4, y + LOGO_H / 2, x + Math.round(spr.width * k) + 4, LOGO_H + 6, rp.base, .35); drawProp(img, x + spr.width * k + 6, y + 8 + k * 14, P.a - 1.4 + Math.sin(t * .8) * .15, 1, P.tip[0], P.tip[1], .85); }
  });
  for (const d of TITLE.drips || []) { d.t++; d.vy += .05; d.y += d.vy; g.fillStyle = ramp(d.col).out; g.fillRect(Math.round(d.x) - 1, Math.round(d.y), 3, 3); g.fillStyle = ramp(d.col).base; g.fillRect(Math.round(d.x), Math.round(d.y), 1, 2); g.fillStyle = ramp(d.col).hi; g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }
  TITLE.drips = (TITLE.drips || []).filter(d => d.y < 118);
}
function updateTitle() {
  TITLE.t++;
  if (hit('ok')) { if (TITLE.t < 350) { TITLE.t = 350; return; } Audio.sfx('ok'); initOverworld(); setState('overworld'); Audio.play('map'); }
}
function drawTitle() {
  const t = TITLE.t, cam = TITLE.cam;
  // vuelo lento sobre el mapa: la cámara orbita el lago
  cam.yaw += .0035; cam.x = 300 + Math.cos(cam.yaw) * -150; cam.y = 200 + Math.sin(cam.yaw) * -150;
  const pal = Game.palette; Object.assign(SCENE.cam, cam); drawSky(pal); drawFloor(pal, pal === 'gris' ? '#767c96' : '#9ed0f6', pal === 'gris' ? '#767c96' : '#9ed0f6');
  // papel por encima, agujereado por la mancha de tinta
  const hole = clamp((t - 34) / 70, 0, 1), R0 = hole * 300;
  if (hole < 1) { // el papel va en una capa aparte para poder agujerearlo y ver el mundo debajo
    if (!TITLE.layer) { TITLE.layer = document.createElement('canvas'); TITLE.layer.width = W; TITLE.layer.height = H; }
    const L = TITLE.layer.getContext('2d'); L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, W, H);
    L.fillStyle = PAPER; L.fillRect(0, 0, W, H); const rnd = seeded(7); L.fillStyle = PAPER2; for (let i = 0; i < 700; i++) L.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1);
    L.fillStyle = PENCIL; L.globalAlpha = .5; for (let y = 22; y < H; y += 14) L.fillRect(0, y, W, 1); L.globalAlpha = 1; L.fillStyle = '#c96a6a'; L.fillRect(28, 0, 1, H); // renglones y margen
    if (!TITLE.balls) { const r = seeded(11); TITLE.balls = []; for (let i = 0; i < 9; i++) TITLE.balls.push({ a: i / 9 * 6.28 + (r() - .5) * .5, d: .3 + r() * .7, r: .5 + r() * .5 }); TITLE.tendrils = []; for (let i = 0; i < 6; i++) TITLE.tendrils.push({ a: r() * 6.28, len: 1.2 + r(), w: .12 + r() * .2 }); }
    const sx = 160, sy = 100;
    if (t >= 34) { titleSfx('splash', 'splash');
      // borde de tinta alrededor del agujero, y el agujero
      L.fillStyle = '#0b0912'; for (const b of TITLE.balls) { const r = R0 * b.r + 3, d = R0 * b.d * .8; L.beginPath(); L.ellipse(sx + Math.cos(b.a) * d, sy + Math.sin(b.a) * d * .75, r, r * .8, 0, 0, 6.29); L.fill(); }
      L.globalCompositeOperation = 'destination-out';
      for (const b of TITLE.balls) { const r = R0 * b.r, d = R0 * b.d * .8; L.beginPath(); L.ellipse(sx + Math.cos(b.a) * d, sy + Math.sin(b.a) * d * .75, r, r * .8, 0, 0, 6.29); L.fill(); }
      for (const tn of TITLE.tendrils) { const Ln = R0 * tn.len; L.save(); L.translate(sx, sy); L.rotate(tn.a); L.beginPath(); L.ellipse(Ln * .5, 0, Ln * .5, R0 * tn.w, 0, 0, 6.29); L.fill(); L.restore(); }
      L.globalCompositeOperation = 'source-over';
      if (hole < .3) for (let r = 0; r < 3; r++) { const kk = clamp(hole * 4 - r * .3, 0, 1); if (kk <= 0 || kk >= 1) continue; L.strokeStyle = 'rgba(42,36,56,' + (.7 * (1 - kk)) + ')'; L.lineWidth = 1; L.beginPath(); L.ellipse(sx, sy, 14 + kk * 90, 6 + kk * 36, 0, 0, 6.29); L.stroke(); }
    }
    g.drawImage(TITLE.layer, 0, 0);
    if (t > 8 && t < 34) { const k = (t - 8) / 26, y = lerp(-24, 96, k * k); g.fillStyle = 'rgba(11,9,18,' + (.2 + k * .3) + ')'; g.beginPath(); g.ellipse(sx, sy, 14 - k * 6, 5 - k * 2, 0, 0, 6.29); g.fill(); drawDrop({ color: C('negro'), shape: 'tall', w: 16, h: 24 }, sx, y, 'hop', 0, { dark: true }); titleSfx('fall', 'fall'); }
  }
  drawLogo(t, W / 2 - 8 * 23 / 2 + 2, 28);
  // las tres gotas nacen de los goterones de sus letras: C (rojo) → Carmín, R (amarillo) → Ámbar, M (azul) → Añil.
  // Cuando han nacido las tres, saltan al centro y se colocan en formación.
  const LX = [0, 2, 4], lcw = 23, lx0 = W / 2 - 8 * lcw / 2 + 2, lbase = 28 + LOGO_H, gy = 150, T0 = [175, 203, 231], TALL = T0[2] + 32 + 40, CX = [160, 208, 112];
  DATA.party.forEach((p, i) => {
    const li = LX[i], xl = lx0 + li * lcw + POOLS[TITLE.letters[li]][0][0] + 1, col = C(p.color), rp = ramp(col), t0 = T0[i], u = t - t0;
    if (u < 0) return;
    if (u < 18) { // 1) el goterón engorda
      const q = u / 18, L = 4 + q * 9, r = 2 + q * 3.5; g.fillStyle = rp.out; g.fillRect(xl - 1, lbase - 2, 3, L + 2); g.fillStyle = rp.base; g.fillRect(xl, lbase - 2, 1, L);
      g.fillStyle = rp.out; g.beginPath(); g.ellipse(xl + .5, lbase + L, r + 1, r + 1.5, 0, 0, 6.29); g.fill(); g.fillStyle = rp.base; g.beginPath(); g.ellipse(xl + .5, lbase + L, r, r + .5, 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(xl - 1, lbase + L - 2, 1, 1); return; }
    if (u < 32) { // 2) se desprende y cae
      const q = (u - 18) / 14, y = lerp(lbase + 14, gy, q * q); if (u === 18) Audio.sfx('slow_drip', { semi: [0, 4, 7][i] }); shadow(xl, gy, Math.round(4 + q * 10)); drawDrop({ color: col, shape: 'tall', w: 12, h: 18 }, xl, y, 'hop', 0); return; }
    const s = u - 32; // 3) salpicón y charco · 4) el charco se levanta y toma forma · 5) al centro · 6) posan
    if (s === 0) { Audio.sfx('plop', { semi: [0, 4, 7][i] }); TITLE.spl = TITLE.spl || []; for (let j = 0; j < 12; j++) TITLE.spl.push({ x: xl + R(-4, 4), y: gy - 2, vx: R(-2, 2), vy: -R(.8, 2.6), col, t: 0 }); }
    if (s < 30) { const q = s / 30; g.strokeStyle = col; g.globalAlpha = 1 - q; g.lineWidth = 2; g.beginPath(); g.ellipse(xl, gy, 6 + q * 44, 2 + q * 16, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; }
    if (s < 12) { shadow(xl, gy, 14); const q = s / 12; g.fillStyle = rp.sh; g.beginPath(); g.ellipse(xl, gy, 8 + q * 10, 3 + q * 2, 0, 0, 6.29); g.fill(); g.fillStyle = rp.base; g.beginPath(); g.ellipse(xl - 1, gy - 1, 7 + q * 9, 2.5 + q * 1.5, 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(xl - 6, gy - 2, 3, 1); return; }
    const rise = clamp((s - 12) / 26, 0, 1), e = 1 - Math.pow(1 - rise, 3), over = rise < 1 ? Math.sin(rise * Math.PI) * .22 : 0, born = rise >= 1;
    if (s === 12) Audio.sfx('grow', { semi: [0, 4, 7][i], vol: .6 }); if (s === 38) Audio.sfx('tinkle', { semi: [0, 4, 7][i] });
    // 5) al centro: dos saltos cuando han nacido las tres
    const mk = clamp((t - TALL - i * 6) / 36, 0, 1), me = mk * mk * (3 - 2 * mk), x = Math.round(lerp(xl, CX[i], me)), hopM = mk > 0 && mk < 1 ? Math.abs(Math.sin(mk * Math.PI * 2)) * 10 : 0;
    if (mk > 0 && mk < 1 && (t - TALL - i * 6) === 18) Audio.sfx('plop', { semi: [0, 4, 7][i], vol: .5 });
    const posed = mk >= 1, breathe = posed ? 1 + Math.sin(t * .07 + i * 1.1) * .025 : 1, land = posed ? Math.max(0, 1 - (t - TALL - i * 6 - 36) / 10) : 0;
    const eyes = !born ? 'blink' : ((t + i * 50) % 160) < 6 ? 'blink' : posed && t > TALL + 80 && ((t - TALL) % 400) < 60 ? 'happy' : 'normal';
    const spr = buildSprite(`${p.id}_title`, col, null, { eyes }), sx = (1.7 - .7 * e + over * .6) * (1 + land * .18), sy = Math.max(.08, e * (1 + over)) * breathe * (1 - land * .16);
    shadow(x, gy, Math.round((spr.width * .5) * (1 - hopM / 20)));
    if (!born) { g.fillStyle = rp.sh; g.beginPath(); g.ellipse(x, gy, 16 * (1 - e) + 3, 4 * (1 - e) + 1, 0, 0, 6.29); g.fill(); }
    drawSprite(spr, x, Math.round(gy - hopM), sx, false, sy); if (p.id === 'anil' && born) drawSatellites(x, gy - hopM - 4, t, col, 1.1 * clamp((t - t0 - 70) / 20, 0, 1));
  });
  for (const q of TITLE.spl || []) { q.t++; q.x += q.vx; q.y += q.vy; q.vy += .14; if (q.y > 140) { q.y = 140; q.vy *= -.3; q.vx *= .6; } g.fillStyle = q.t < 8 ? ramp(q.col).hi : ramp(q.col).base; g.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); } TITLE.spl = (TITLE.spl || []).filter(q => q.t < 30);
  if (t > 350) { if ((t / 30 | 0) % 2) { tape(W / 2 - 62, 158, 124, 14); ui('PULSA Z / ENTER', W / 2 - 56, 161, TXT); } txtC('PoC · Fable 5 · 320x180', W / 2, 173, '#7a7694', null); }
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
    case 'title': updateTitle(); break;
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
  title(t) { TITLE.t = t; },
  pause(v = !Game.paused) { Game.paused = v; },
  colorize() { Game.palette = Game.palette === 'gris' ? 'vivo' : 'gris'; },
  sprite(o) { return makeDrop(o); },
};
const boot = () => requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(boot, boot); else boot();
