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
const PAL = {
  gris: { grass: '#7d8a68', grass2: '#6f7c5c', ink: '#4a4a55', ink2: '#3f3f4a', water: '#6d8a9c', water2: '#7f9cae', path: '#b3a98c', path2: '#a3997d', tree: '#5d7452', tree2: '#4b6142', trunk: '#6b5a48', rock: '#8a8a90', rock2: '#6e6e76' },
  vivo: { grass: '#5fb64a', grass2: '#4fa23c', ink: '#5fb64a', ink2: '#4fa23c', water: '#3a8fe0', water2: '#62b0f2', path: '#e8cf8a', path2: '#d9bd74', tree: '#2f9a48', tree2: '#227a38', trunk: '#8a5a34', rock: '#a8a4b8', rock2: '#7c7890' },
};
function makeTile(kind, pal, frame = 0) {
  return cached(`tile|${kind}|${pal}|${frame}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = c.height = TILE; const x = c.getContext('2d'); const rnd = seeded(kind.length * 31 + 5);
    const dots = (a, b, n) => { for (let i = 0; i < n; i++) { x.fillStyle = b; x.fillRect(rnd() * 16 | 0, rnd() * 16 | 0, 1, 1); } };
    switch (kind) {
      case '.': x.fillStyle = p.grass; x.fillRect(0, 0, 16, 16); dots(p.grass, p.grass2, 9); x.fillStyle = p.grass2; x.fillRect(3, 11, 1, 2); x.fillRect(11, 4, 1, 2); break;
      case ',': x.fillStyle = p.ink; x.fillRect(0, 0, 16, 16); dots(p.ink, p.ink2, 10); x.fillStyle = p.ink2; x.fillRect(5, 6, 3, 2); x.fillRect(11, 12, 2, 2); break;
      case '~': x.fillStyle = p.water; x.fillRect(0, 0, 16, 16); x.fillStyle = p.water2; const o = frame ? 4 : 0; x.fillRect((2 + o) % 16, 3, 5, 1); x.fillRect((10 + o) % 16, 9, 4, 1); x.fillRect((5 + o) % 16, 13, 3, 1); break;
      case '=': x.fillStyle = p.path; x.fillRect(0, 0, 16, 16); dots(p.path, p.path2, 8); break;
      case 'T': x.fillStyle = p.grass; x.fillRect(0, 0, 16, 16); dots(p.grass, p.grass2, 4);
        x.fillStyle = p.trunk; x.fillRect(7, 11, 3, 4); x.fillStyle = shade(p.tree2, 250, .3, .1, -.15); x.fillRect(2, 3, 12, 10); x.fillRect(4, 1, 8, 1); x.fillRect(1, 5, 1, 6); x.fillRect(14, 5, 1, 6);
        x.fillStyle = p.tree2; x.fillRect(3, 3, 10, 9); x.fillStyle = p.tree; x.fillRect(4, 2, 7, 1); x.fillRect(3, 3, 8, 6); x.fillStyle = shade(p.tree, 55, .2, 0, .14); x.fillRect(4, 3, 4, 2); x.fillRect(4, 5, 2, 1); break;
      case 'r': x.fillStyle = p.grass; x.fillRect(0, 0, 16, 16); dots(p.grass, p.grass2, 4); x.fillStyle = shade(p.rock2, 250, .3, .1, -.2); x.fillRect(3, 6, 10, 8); x.fillRect(5, 4, 6, 2); x.fillStyle = p.rock2; x.fillRect(4, 6, 8, 7); x.fillRect(6, 5, 4, 1); x.fillStyle = p.rock; x.fillRect(5, 6, 5, 4); x.fillRect(6, 5, 3, 1); break;
      case 'x': x.fillStyle = p.grass; x.fillRect(0, 0, 16, 16); dots(p.grass, p.grass2, 5); if (pal === 'gris') { x.fillStyle = '#2a2438'; x.fillRect(4, 5, 8, 6); x.fillRect(2, 7, 12, 3); x.fillRect(6, 3, 3, 2); x.fillRect(12, 11, 2, 2); x.fillRect(3, 11, 2, 1); } break;
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
function win(x, y, w, h, opt = {}) { // papel de cuaderno con borde de tinta y sombra
  g.fillStyle = 'rgba(20,18,28,.35)'; g.fillRect(x + 2, y + 2, w, h);
  g.fillStyle = opt.solid || '#f1e9d6'; g.fillRect(x, y, w, h);
  if (!opt.solid) { const rnd = seeded(x * 31 + y * 17 + w); g.fillStyle = '#e3d8bd'; for (let i = 0; i < w * h / 48; i++) g.fillRect(x + 1 + rnd() * (w - 2) | 0, y + 1 + rnd() * (h - 2) | 0, 1, 1); }
  g.fillStyle = '#2a2438'; g.fillRect(x + 1, y, w - 2, 1); g.fillRect(x + 1, y + h - 1, w - 2, 1); g.fillRect(x, y + 1, 1, h - 2); g.fillRect(x + w - 1, y + 1, 1, h - 2);
  g.fillStyle = '#c9bd9c'; g.fillRect(x + 1, y + h - 2, w - 2, 1); g.fillRect(x + w - 2, y + 1, 1, h - 2);
}
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
  const cx = OW.cam.x, cy = OW.cam.y, wf = (OW.t / 30 | 0) % 2;
  for (let ty = cy / TILE | 0; ty <= (cy + H) / TILE; ty++) for (let tx = cx / TILE | 0; tx <= (cx + W) / TILE; tx++) {
    const ch = tileAt(tx, ty); g.drawImage(makeTile(ch, Game.palette, ch === '~' ? wf : 0), tx * TILE - cx, ty * TILE - cy);
  }
  const ents = [];
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
  win(4, 4, 124, 16); swatch(8, 8, C('amarillo')); ui('PIGMENTO ' + Game.pigmento, 18, 8, INK);
  if (OW.msg) drawMessage(OW.msg.lines);
  if (OW.menu) drawMenu();
}
function drawMessage(lines) {
  const h = lines.length * 10 + 14; win(24, H - h - 8, W - 48, h);
  lines.forEach((l, i) => ui(l, 32, H - h - 1 + i * 10, i === 0 ? GOLD : INK));
  if ((Game.t / 20 | 0) % 2) ui('▼', W - 40, H - 14, INK2);
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
  ui('CHROMARA', 16, 14, GOLD); swatch(196, 14, C('amarillo')); ui('Pigmento ' + Game.pigmento, 206, 14, INK);
  Party.forEach((p, i) => {
    const y = 28 + i * 34, s = effStats(p), sel = OW.menu.idx === i;
    if (sel) { g.globalAlpha = .22; pstroke(16, y + 14, 304, y + 14, 30, C(p.color), 1, 0, false); g.globalAlpha = 1; dropCursor(16, y + 8, C(p.color)); }
    drawDrop({ color: C(p.color), shape: p.shape, w: Math.round(p.w * .7), h: Math.round(p.h * .7) }, 36, y + 26, 'idle', (Game.t / 12 + i | 0) % 4);
    ui(p.name, 56, y, ramp(C(p.color)).sh); ui(p.role, 56, y + 10, INK2);
    ui(`HP ${p.cur.hp}/${s.hp}`, 120, y, INK); ui(`MP ${p.cur.mp}/${s.mp}`, 120, y + 10, INK);
    ui(`ATK${s.atk} DEF${s.def} SPD${s.spd}`, 120, y + 20, INK2);
    g.drawImage(iconSprite(p.weapon, C(p.color)), 220, y - 2); ui(DATA.weapons[p.weapon].name, 234, y, INK);
    ui((sel ? '◄' : ' ') + DATA.accessories[p.acc].name + (sel ? '►' : ''), 226, y + 10, sel ? GOLD : INK);
  });
  const p = Party[OW.menu.idx];
  win(8, 132, 304, 40);
  ui(DATA.accessories[p.acc].desc, 16, 138, INK);
  const inv = Object.entries(Game.inventory).filter(([, n]) => n > 0).map(([k, n]) => `${DATA.items[k].short || DATA.items[k].name} x${n}`).join('  ');
  ui(inv || 'Sin objetos', 16, 150, INK2);
  ui('◄► accesorio   X cerrar', 16, 161, INK3);
}

// =====================================================================
// 5. Transición: una gota negra cae, salpica y se traga la pantalla
// =====================================================================
const TR = { t: 0, foe: null };
function startTransition(foe) { TR.t = 0; TR.foe = foe; setState('transition'); Audio.stop(); Audio.sfx('encounter'); setTimeout(() => Audio.sfx('fall'), 200); }
function updateTransition() {
  TR.t++;
  if (TR.t === 38) Audio.sfx('splash');
  if (TR.t === 70) { initBattle(TR.foe); setState('battle'); }
}
function drawTransition() {
  drawOverworld();
  const t = TR.t;
  if (t < 38) { // caída con aceleración
    const y = -20 + (t * t) * 0.085 * 1.05, def = { color: C('negro'), shape: 'tall', w: 14, h: 20 };
    drawDrop(def, W / 2, y, 'hop', 0, { dark: true });
  } else { // salpicadura: círculo con borde tembloroso
    const k = (t - 38) / 22, r = k * k * 260;
    g.fillStyle = '#0b0912'; g.beginPath(); g.arc(W / 2, H / 2 + 10, r, 0, 6.29); g.fill();
    for (let i = 0; i < 12; i++) { const a = i * 0.52 + t * .05, rr = r * (0.9 + 0.25 * Math.sin(i * 3.1 + t * .3)); g.beginPath(); g.arc(W / 2 + Math.cos(a) * rr, H / 2 + 10 + Math.sin(a) * rr, r * .25 + 3, 0, 6.29); g.fill(); }
    if (t < 46) for (let i = 0; i < 8; i++) { const a = i * .78, d = (t - 38) * 6; g.fillRect(W / 2 + Math.cos(a) * d - 1, H / 2 + 10 + Math.sin(a) * d * .5 - 1, 3, 3); }
  }
}

// =====================================================================
// 6. Batalla: ATB (modo Wait), techs combinadas, IA, efectos
// =====================================================================
const B = {};
const SEMI = { carmin: 0, ambar: 4, anil: 7 }; // cada gota tiene su nota: acorde mayor Re-Fa#-La
const semiOf = u => ({ semi: SEMI[u.id] ?? -5 });
let ATB_ACTIVE = true; const ATB_RATE = .11; // modo Active (Chrono Trigger): el tiempo no se para al elegir
function colorMult(atkCol, defCol) {
  if (atkCol === 'blanco') return defCol === 'negro' ? 3 : 1.5;
  if (defCol === 'negro') return 1;
  if (DATA.complement[atkCol] === defCol) return 2;
  if (atkCol === defCol) return 0.5;
  return 1;
}
function unitFromParty(p, i) {
  const s = effStats(p);
  return { id: p.id, name: p.name, kind: 'party', data: p, color: p.color, def: { color: C(p.color), shape: p.shape, w: p.w, h: p.h, seed: 3 }, hp: p.cur.hp, maxhp: s.hp, mp: p.cur.mp, maxmp: s.mp, atk: s.atk, dfn: s.def, spd: s.spd, atb: R(10, 55), x: 0, y: 0, pose: 'idle', poseT: 0, status: {}, alive: p.cur.hp > 0, acc: p.acc, idx: i, shadowW: p.w * .7 };
}
function unitFromEnemy(id, i, n, group) {
  const dup = group.filter(x => x === id).length > 1, letter = 'ABC'[group.slice(0, i).filter(x => x === id).length];
  const e = DATA.enemies[id], core = e.color === 'negro' ? null : C(e.color);
  return { id, name: e.name + (dup ? ' ' + letter : ''), kind: 'enemy', data: e, color: e.color, def: { color: C('negro'), core, shape: e.shape, w: e.w, h: e.h, seed: 11 + i * 5 }, hp: e.hp, maxhp: e.hp, mp: 0, atk: e.atk, dfn: e.def, spd: e.spd, atb: R(0, 40), x: 0, y: 0, pose: 'idle', poseT: 0, status: {}, alive: true, ai: e.ai, boss: !!e.boss, acts: 0, idx: i, shadowW: e.w * .75 };
}
function initBattle(foe) {
  Object.assign(B, { foe, party: [], enemies: [], queue: [], menu: null, actions: [], busy: false, particles: [], nums: [], puddles: [], fx: [], marks: [], shake: 0, hitstop: 0, flash: null, phase: 'intro', t: 0, msg: null, msgT: 0, result: null, rainbow: 0 });
  B.party = Party.map(unitFromParty);
  const posP = [[236, 86], [258, 108], [240, 126]];
  B.party.forEach((u, i) => { u.hx = u.x = posP[i][0]; u.hy = u.y = posP[i][1]; if (!u.alive) u.pose = 'ko'; });
  const n = foe.enemies.length, posE = n === 1 ? [[84, 112]] : n === 2 ? [[70, 94], [98, 122]] : [[62, 86], [92, 110], [66, 126]];
  B.enemies = foe.enemies.map((id, i) => unitFromEnemy(id, i, n, foe.enemies));
  B.enemies.forEach((u, i) => { u.hx = u.x = posE[i][0] + (u.boss ? 10 : 0); u.hy = u.y = posE[i][1]; });
  B.units = [...B.enemies, ...B.party];
  Audio.play(foe.boss ? 'boss' : 'battle');
}
const alive = arr => arr.filter(u => u.alive);
function say(s, col = '#f4f0ea') { B.msg = { s, col }; B.msgT = 70; }
function num(x, y, v, col, big) { B.nums.push({ x, y, v: String(v), col, t: 0, vy: -1.6, big }); }
function burst(x, y, col, n, spd = 1.6, life = 24, grav = .06) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), s = R(.3, 1) * spd; B.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .5, col, t: 0, life: life + RI(-6, 6), g: grav }); } }
function stream(x0, y0, x1, y1, col, n, dur) { for (let i = 0; i < n; i++) B.particles.push({ x: x0, y: y0, tx: x1 + R(-6, 6), ty: y1 + R(-8, 4), col, t: -RI(0, dur * .5), life: dur, dur, arc: R(-30, -8), stream: true }); }
function damage(target, raw, col, src) {
  if (!target.alive) return 0;
  const mult = colorMult(col, target.color), dmg = Math.max(1, Math.round(raw * mult * R(.92, 1.08)));
  target.hp = Math.max(0, target.hp - dmg); target.pose = 'hurt'; target.poseT = 14;
  num(target.x + R(-4, 4), target.y - 26, dmg, mult >= 2 ? '#f2c93a' : mult < 1 ? '#8c8ab0' : '#f4f0ea', mult >= 2);
  burst(target.x, target.y - 10, C(col), mult >= 2 ? 14 : 7, mult >= 2 ? 2.2 : 1.4);
  Audio.sfx(mult >= 2 ? 'hitweak' : mult < 1 ? 'resist' : 'hit', { pan: target.kind === 'enemy' ? -.4 : .4 }); B.hitstop = mult >= 2 ? 6 : 3; B.shake = mult >= 2 ? 4 : 2;
  if (mult >= 2) say((src ? src + ': ' : '') + '¡Débil al ' + DATA.colors[col].name.toLowerCase() + '!', '#f2c93a');
  if (target.hp <= 0) kill(target);
  return dmg;
}
function heal(target, amount, isMp) {
  if (!target.alive) return;
  if (isMp) { target.mp = Math.min(target.maxmp, target.mp + amount); num(target.x, target.y - 26, '+' + amount, '#3a6fe2'); }
  else { const a = Math.min(amount, target.maxhp - target.hp); target.hp += a; num(target.x, target.y - 26, '+' + a, '#4fb84a'); }
  burst(target.x, target.y - 12, isMp ? C('azul') : C('verde'), 10, 1, 28, -.03); Audio.sfx('heal');
}
function kill(u) {
  u.alive = false; u.pose = 'ko'; u.atb = 0; Audio.sfx(u.kind === 'enemy' ? 'die' : 'ko');
  if (u.kind === 'enemy') { // se disuelve en tinta y deja un charquito del color que había robado
    burst(u.x, u.y - 8, C('negro'), 18, 2, 30, .12);
    if (u.def.core) { B.puddles.push({ x: u.x, y: u.y, col: u.def.core, w: u.data.w }); burst(u.x, u.y - 8, u.def.core, 10, 1.4, 34, .05); }
    u.dead = 1;
  }
  B.queue = B.queue.filter(q => q !== u); if (B.menu && B.menu.unit === u) B.menu = null;
}
function statusMult(u, k) { return u.status[k] ? (k === 'tiznado' ? .7 : .6) : 1; }
function baseDmg(atk, def, power) { return Math.max(2, (atk * 2 - def * .7) * power); }
// --- Acciones como corrutinas (generadores). yield = un frame.
function* wait(n) { for (let i = 0; i < n; i++) yield; }
function* tween(u, x1, y1, n) { const x0 = u.x, y0 = u.y; for (let i = 1; i <= n; i++) { const t = i / n, e = t * (2 - t); u.x = lerp(x0, x1, e); u.y = lerp(y0, y1, e); yield; } }
function tickStatus(u) { for (const k in u.status) if (--u.status[k] <= 0) delete u.status[k]; }
// ---- Utilería: herramientas de dibujo como assets pixel art (horizontales, punta/trabajo a la derecha)
function propSprite(kind, color) {
  return cached(`prop|${kind}|${color || ''}`, () => {
    const c = document.createElement('canvas'); c.width = kind === 'brocha' ? 60 : 48; c.height = kind === 'brocha' ? 22 : 16; const x = c.getContext('2d');
    const rp = color ? ramp(color) : null, F = (col, a, b, cw = 1, ch = 1) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
    const O = '#2a1a10', WOOD = ['#d9a06a', '#b07a48', '#8a5a34', '#5c3a20'], MET = ['#f0eef6', '#c9c4d4', '#8c8ab0', '#4a4460'];
    switch (kind) {
      case 'brocha': { // brocha plana de pintor: mango de madera clara en forma de pala con agujero, virola ancha con remaches, cerdas largas con la punta cargada
        const PW = ['#f6ead0', '#e8d4a8', '#c9b080', '#9a8258'], OL = '#5a4630';
        // mango: estrecho al final, se ensancha hacia la virola (perfil de pala)
        for (let i = 0; i < 26; i++) { const hh = i < 8 ? 6 : Math.min(16, 6 + (i - 8) * 0.8 | 0); const y0 = 11 - (hh >> 1); x.fillStyle = OL; x.fillRect(i, y0 - 1, 1, hh + 2); x.fillStyle = PW[1]; x.fillRect(i, y0, 1, hh); x.fillStyle = PW[0]; x.fillRect(i, y0, 1, 1 + (hh > 8 ? 1 : 0)); x.fillStyle = PW[2]; x.fillRect(i, y0 + hh - 2, 1, 2); x.fillStyle = PW[3]; x.fillRect(i, y0 + hh - 1, 1, 1); }
        F(OL, 0, 8, 1, 6); F(PW[2], 6, 10, 10, 1); F(PW[2], 12, 8, 8, 1); F(OL, 3, 9, 3, 3); F(PW[3], 3, 9, 1, 1); F(PW[0], 5, 11, 1, 1);
        // virola ancha
        F(OL, 26, 1, 12, 20); F(MET[1], 27, 2, 10, 18); F(MET[0], 27, 2, 10, 1); F(MET[0], 27, 3, 2, 16); F(MET[2], 27, 18, 10, 2); F(MET[3], 36, 3, 1, 16); F(MET[3], 30, 2, 1, 18); F(MET[3], 34, 2, 1, 18); F(MET[0], 31, 2, 1, 18);
        F(MET[3], 32, 5, 1, 1); F(MET[3], 32, 10, 1, 1); F(MET[3], 32, 15, 1, 1); F(MET[0], 32, 4, 1, 1); F(MET[0], 32, 9, 1, 1); F(MET[0], 32, 14, 1, 1);
        // cerdas naturales (vetas horizontales) con la punta cargada de pintura
        F(OL, 38, 1, 22, 20); for (let r = 0; r < 18; r++) { x.fillStyle = r % 3 === 0 ? '#d8cbaa' : r % 3 === 1 ? '#b8a888' : '#8a7c60'; x.fillRect(39, 2 + r, 14, 1); }
        for (let r = 0; r < 18; r++) { const rag = (r * 7) % 3; x.fillStyle = r % 4 === 0 ? rp.hi : r % 4 === 2 ? rp.sh : rp.base; x.fillRect(53, 2 + r, 6 - rag, 1); x.fillStyle = rp.dk; x.fillRect(59 - rag, 2 + r, 1, 1); if (rag) { x.fillStyle = OL; x.fillRect(59 - rag + 1, 2 + r, rag, 1); } }
        F(rp.sh, 52, 2, 1, 18); F(rp.base, 55, 20, 2, 1); F(rp.sh, 55, 21, 2, 1); F(rp.out, 54, 20, 1, 1); F(rp.out, 57, 20, 1, 1);
        break; }
      case 'lapiz': { // goma rosa, virola, cuerpo hexagonal facetado, cono de madera, mina
        F(O, 0, 3, 7, 8); F('#e89aa8', 1, 4, 5, 6); F('#f4c0c8', 1, 4, 5, 1); F('#b86a7c', 1, 8, 5, 2); F(O, 6, 3, 5, 8); F(MET[1], 7, 4, 3, 6); F(MET[0], 7, 4, 3, 1); F(MET[2], 7, 8, 3, 2); F(MET[3], 8, 4, 1, 6);
        F(O, 10, 3, 30, 8); F('#f2c93a', 11, 4, 28, 6); F('#fbe28a', 11, 4, 28, 1); F('#fff3c0', 11, 5, 28, 1); F('#c9a02a', 11, 7, 28, 2); F('#8a6a12', 11, 9, 28, 1);
        F('#5c4a0a', 15, 6, 1, 1); F('#5c4a0a', 17, 6, 3, 1); F('#5c4a0a', 21, 6, 1, 1); F('#5c4a0a', 23, 6, 2, 1); F('#5c4a0a', 26, 6, 3, 1);
        F(O, 39, 4, 6, 6); F('#e8cf9a', 40, 5, 4, 4); F('#f6e6c0', 40, 5, 4, 1); F('#c9a878', 40, 8, 4, 1); F(O, 44, 5, 3, 4); F('#e8cf9a', 44, 6, 2, 2); F(O, 46, 6, 1, 2); F('#2a2438', 45, 6, 2, 2); F('#4a4460', 45, 6, 1, 1);
        break; }
      case 'pincel': { // mango lacado con reflejo y anilla de color, virola con dos pliegues, mechón afilado
        F(O, 0, 5, 30, 6); F('#1e1a2c', 1, 6, 28, 4); F('#4a4460', 2, 6, 27, 1); F('#6a6480', 3, 7, 10, 1); F('#0b0912', 1, 9, 28, 1); F(rp.base, 22, 6, 3, 4); F(rp.hi, 22, 6, 3, 1); F(rp.dk, 22, 9, 3, 1);
        F(O, 29, 4, 10, 8); F(MET[1], 30, 5, 8, 6); F(MET[0], 30, 5, 8, 1); F(MET[2], 30, 10, 8, 1); F(MET[3], 32, 5, 1, 6); F(MET[3], 35, 5, 1, 6); F(MET[0], 33, 6, 1, 1); F(MET[0], 36, 6, 1, 1);
        F(rp.out, 38, 5, 9, 6); F(rp.base, 39, 6, 6, 4); F(rp.hi, 39, 6, 5, 1); F(rp.sh, 39, 9, 6, 1); F(rp.out, 45, 6, 3, 4); F(rp.base, 45, 7, 2, 2); F(rp.dk, 47, 7, 1, 2); F(rp.sh, 44, 11, 2, 1); F(rp.base, 44, 12, 1, 1);
        break; }
      case 'goma': { // goma bicolor con funda de papel
        F('#2a2438', 1, 2, 30, 12); F('#f4f0ea', 2, 3, 16, 10); F('#ffffff', 2, 3, 16, 1); F('#c9c4d4', 2, 11, 16, 2); F('#e86a8a', 18, 3, 12, 10); F('#f4a0b8', 18, 3, 12, 1); F('#b84a6a', 18, 11, 12, 2);
        F('#3a6fe2', 12, 2, 7, 12); F('#8fb4f2', 13, 3, 5, 1); F('#f4f0ea', 13, 6, 5, 2); F('#1f3f8a', 13, 12, 5, 1); F('#0b0912', 1, 2, 1, 1); F('#0b0912', 30, 2, 1, 1); F('#0b0912', 1, 13, 1, 1); F('#0b0912', 30, 13, 1, 1);
        break; }
      case 'tubo': { // tubo de pintura metálico: pliegue, etiqueta con muestra de color, tapón
        F(MET[3], 0, 3, 4, 10); F(MET[2], 1, 4, 2, 8); F(MET[0], 1, 5, 1, 1); F(MET[3], 3, 2, 26, 12); F(MET[1], 4, 3, 24, 10); F(MET[0], 4, 3, 24, 2); F(MET[0], 4, 5, 2, 6); F(MET[2], 4, 11, 24, 2);
        F('#f4f0ea', 11, 3, 10, 10); F(rp.base, 13, 5, 4, 5); F(rp.hi, 13, 5, 4, 1); F(rp.dk, 16, 5, 1, 5); F('#2a2438', 18, 5, 2, 1); F('#2a2438', 18, 7, 2, 1); F('#2a2438', 18, 9, 1, 1);
        F(MET[3], 29, 5, 4, 6); F(MET[2], 29, 6, 3, 4); F(rp.out, 33, 3, 9, 10); F(rp.base, 34, 4, 7, 8); F(rp.hi, 34, 4, 7, 1); F(rp.sh, 34, 10, 7, 2); F(rp.dk, 40, 5, 1, 7); F(rp.sh, 36, 6, 1, 4); F(rp.sh, 38, 6, 1, 4);
        break; }
    }
    return c;
  });
}
const PROP = { brocha: { tip: [58, 20], a: 1.05 }, lapiz: { tip: [47, 7], a: 0.95 }, pincel: { tip: [47, 12], a: 1.0 }, goma: { tip: [16, 8], a: 0 }, tubo: { tip: [41, 8], a: Math.PI / 2 } };
const facing = u => u.kind === 'party' ? -1 : 1; // hacia dónde ataca
// Dibuja un prop apuntando "hacia delante" (mirroring según facing). a = ángulo, (px,py) = pivote en el sprite.
function drawProp(img, x, y, a, fac, px = 1, py = 5, scale = 1, alpha = 1) { g.save(); g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); g.scale(fac, 1); g.rotate(a); g.imageSmoothingEnabled = false; g.drawImage(img, -px * scale, -py * scale, img.width * scale, img.height * scale); g.restore(); }
// Trazo pixelado. taper: pincelada afilada en los extremos; prog recorta el avance; jit desordena (lápiz).
function pstroke(x0, y0, x1, y1, w, col, prog = 1, jit = 0, taper = true) {
  const n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) | 0); g.fillStyle = col;
  for (let i = 0; i <= n * prog; i++) { const t = i / n, ww = Math.max(1, Math.round(taper ? w * (0.55 + 0.45 * Math.sin(Math.PI * t)) : w)); const j = jit ? Math.round(Math.sin(i * 12.9898) * jit) : 0; g.fillRect(Math.round(x0 + (x1 - x0) * t - ww / 2) + j, Math.round(y0 + (y1 - y0) * t - ww / 2), ww, ww); }
}
function pointAt(pts, k) { const tot = pts.length - 1, f = clamp(k * tot, 0, tot - 1e-6), i = Math.floor(f), t = f - i; return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]; }
// Efectos transitorios con dibujo propio (encima o debajo de las unidades) y marcas de pintura sobre el objetivo
function fx(dur, draw, under = false) { const f = { t: 0, dur, draw, under }; B.fx.push(f); return f; }
function mark(m) { B.marks.push(Object.assign({ t: 0, life: 48, grow: 5 }, m)); return B.marks[B.marks.length - 1]; }
function drawPath(P, w, col, k, jit = 0) { const tot = P.length - 1, n = Math.floor(tot * k); for (let i = 0; i < n; i++) pstroke(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], w, col, 1, jit, false); if (n < tot) { const f = tot * k - n; pstroke(P[n][0], P[n][1], lerp(P[n][0], P[n + 1][0], f), lerp(P[n][1], P[n + 1][1], f), w, col, 1, jit, false); } }
function drawMarks() {
  for (const m of B.marks) {
    const k = clamp(m.t / m.grow, 0, 1); g.globalAlpha = m.t > m.life - 14 ? (m.life - m.t) / 14 : 1;
    if (m.kind === 'stroke') pstroke(m.x0, m.y0, m.x1, m.y1, m.w, m.col, k, m.jit || 0);
    else if (m.kind === 'path') drawPath(m.pts, m.w || 1, m.col, k, m.jit || 0);
    else if (m.kind === 'blob') { const rnd = seeded(m.seed || 5); g.fillStyle = m.col; const n = Math.round(8 * k); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * m.w, r = Math.max(1, Math.round(1 + rnd() * m.w * .4)); g.fillRect(Math.round(m.x0 + Math.cos(a) * d - r), Math.round(m.y0 + Math.sin(a) * d * .6 - r), r * 2, r * 2); } }
    g.globalAlpha = 1;
  }
}
function sparkle(x, y, col = '#f4f0ea') { const s = fx(10, () => { const r = s.t < 5 ? s.t : 10 - s.t; g.fillStyle = col; g.fillRect(x - r, y, r * 2 + 1, 1); g.fillRect(x, y - r, 1, r * 2 + 1); if (r > 2) { g.fillRect(x - 1, y - 1, 3, 3); } }); }
function flames(x, y, n, spread = 12) { for (let i = 0; i < n; i++) B.particles.push({ x: x + R(-spread, spread), y: y - R(0, 4), vx: R(-.3, .3), vy: -R(1, 2.4), g: -.02, t: -RI(0, 16), life: RI(12, 24), pal: ['#fbe28a', C('amarillo'), C('naranja'), C('rojo'), '#5a2a2a'], size: 3 }); }
function ghostsOf(u) { const ghosts = []; const f = fx(999, () => { for (const gh of ghosts) { g.globalAlpha = Math.max(0, .35 * (1 - gh.t / 12)); drawDrop(u.def, gh.x, gh.y, 'attack', 0); gh.t++; } g.globalAlpha = 1; }); return { add: () => ghosts.push({ x: u.x, y: u.y, t: 0 }), end: () => { f.dur = 0; } }; }
function* hop(u, x1, y1, n, height) { const x0 = u.x, y0 = u.y; for (let i = 1; i <= n; i++) { const k = i / n; u.x = lerp(x0, x1, k); u.y = lerp(y0, y1, k) - Math.sin(Math.PI * k) * height; yield; } }
// Pringue: el objetivo queda cubierto de pintura (tinte + churretes que van cayendo) y vuelve a la normalidad al rato
function goop(t, col, life = 84) { if (!t || !t.alive) return; t.goop = { col, t: 0, life, drips: [0, 1, 2, 3].map(() => ({ dx: R(-t.def.w * .36, t.def.w * .36), y0: R(.12, .45), len: 0, speed: R(.12, .3), max: R(8, t.def.h * .8) })) }; }
function drawGoop(u) {
  const G = u.goop, a = G.t > G.life - 20 ? (G.life - G.t) / 20 : 1, rp = ramp(G.col), top = u.y - u.def.h; g.globalAlpha = a;
  g.fillStyle = rp.base; g.beginPath(); g.ellipse(u.x, top + 3, u.def.w * .42, 3, 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(Math.round(u.x - u.def.w * .3), top + 1, 3, 1);
  for (const d of G.drips) { const x = Math.round(u.x + d.dx), y = Math.round(top + u.def.h * d.y0), L = Math.round(d.len); g.fillStyle = rp.base; g.fillRect(x, y, 2, L); g.fillStyle = rp.hi; g.fillRect(x, y, 1, Math.max(1, L - 3)); g.fillStyle = rp.sh; g.fillRect(x - 1, y + L - 1, 4, 3); g.fillStyle = rp.base; g.fillRect(x, y + L, 2, 1); }
  g.globalAlpha = 1;
}
function tintSprite(s, col, a) { const q = Math.round(a * 10) / 10; return cached(`${s.__key}|tint|${col}|${q}`, () => { const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d'); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = q; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; }); }
function hitBasic(u, t) { return damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, 1), u.color, u.name); }
// La herramienta protagonista: aparece con un destello, recorre un camino con la punta dejando su trazo y se retira.
// o = { kind, color, pts, w, col, frames, fac, scale, under (color de la línea de grafito debajo), jit, life, onTip(k,x,y) }
function* toolStroke(o) {
  const img = propSprite(o.kind, o.color), P = PROP[o.kind], sc = o.scale || 1, [x0, y0] = o.pts[0];
  if (o.under) mark({ kind: 'path', pts: o.pts.map(p => [p[0] + 1, p[1] + 1]), w: o.w, col: o.under, grow: o.frames, life: o.life || 50, jit: o.jit });
  mark({ kind: 'path', pts: o.pts, w: o.w, col: o.col, grow: o.frames, life: o.life || 50, jit: o.jit });
  sparkle(x0, y0 - 2); const st = { k: 0, lift: 0 };
  const f = fx(999, () => { const [x, y] = pointAt(o.pts, st.k), l = st.lift; drawProp(img, x - (o.fac || 1) * l * 1.5, y - l * 2.5, P.a + (o.a || 0) - l * .05, o.fac || 1, P.tip[0], P.tip[1], sc, l ? Math.max(0, 1 - l / 10) : 1); });
  for (let i = 1; i <= o.frames; i++) { st.k = i / o.frames; const [x, y] = pointAt(o.pts, st.k); if (o.onTip) o.onTip(st.k, x, y); yield; }
  for (let i = 1; i <= 8; i++) { st.lift = i; yield; }
  f.dur = 0;
}
// ---- Ataques básicos del grupo: cada herramienta es protagonista y hace lo suyo
function* atkBrocha(u, t) { // Carmín avanza; la brocha baja del cielo y descarga una pincelada diagonal sobre el enemigo
  const fac = facing(u); u.pose = 'attack';
  yield* tween(u, lerp(u.hx, t.x, .45), lerp(u.hy, t.y, .45) + 2, 7);
  const pts = [[t.x - fac * 14, t.y - t.def.h - 10], [t.x + fac * 12, t.y - 2]]; let done = false; Audio.sfx('brush_sweep', { pan: -.3 });
  yield* toolStroke({ kind: 'brocha', color: C(u.color), pts, w: 8, col: C(u.color), frames: 8, fac, onTip: (k, x, y) => { if (k > .55 && !done) { done = true; burst(x, y, C(u.color), 8, 2, 16, .12); hitBasic(u, t); goop(t, C(u.color)); } if (k > .3 && Math.random() < .5) B.particles.push({ x, y, vx: R(-.6, .6), vy: R(.2, 1), g: .1, col: C(u.color), t: 0, life: 16 }); } });
  u.pose = 'idle'; yield* tween(u, u.hx, u.hy, 8);
}
function* atkLapiz(u, t) { // Ámbar llega en un dash con estelas; el lápiz garabatea en zigzag sobre el enemigo siguiendo su punta
  const fac = facing(u); u.pose = 'attack'; const gh = ghostsOf(u), x1 = t.x - fac * (t.def.w / 2 + 14); Audio.sfx('dash');
  for (let i = 1; i <= 5; i++) { if (i % 2) gh.add(); const k = i / 5; u.x = lerp(u.hx, x1, k * (2 - k)); u.y = lerp(u.hy, t.y + 1, k); yield; }
  const pts = []; for (let i = 0; i < 7; i++) pts.push([t.x - fac * 12 + fac * i * 4, t.y - t.def.h * (i % 2 ? .3 : .8)]); let done = false; Audio.sfx('scratch', { pan: -.3 });
  yield* toolStroke({ kind: 'lapiz', pts, w: 2, col: C(u.color), under: '#3a3448', jit: 1, frames: 10, fac, onTip: (k) => { if (k > .7 && !done) { done = true; hitBasic(u, t); } } });
  gh.end(); u.pose = 'idle'; yield* tween(u, u.hx, u.hy, 6);
}
function* atkPincel(u, t) { // Añil no se mueve: el pincel pinta una voluta en el aire y el trazo sale disparado
  const fac = facing(u); u.pose = 'attack'; const cx = t.x - fac * 40, cy = t.y - t.def.h * .5 - 14; Audio.sfx('brush_hiss');
  const pts = []; for (let i = 0; i <= 8; i++) pts.push([cx - fac * 12 + fac * i * 3, cy + Math.sin(i * 1.1) * 7]);
  yield* toolStroke({ kind: 'pincel', color: C(u.color), pts, w: 3, col: C(u.color), frames: 9, fac, life: 20 });
  Audio.sfx('fwip'); B.marks = B.marks.filter(m => m.pts !== pts);
  const fl = fx(999, () => { const k = clamp(fl.t / 10, 0, 1), x = lerp(cx, t.x, k), y = lerp(cy, t.y - t.def.h * .5, k) - Math.sin(k * Math.PI) * 10; drawPath(pts.map(p => [p[0] - cx + x, p[1] - cy + y]), 3, C(u.color), 1); });
  stream(cx, cy, t.x, t.y - 10, C(u.color), 8, 10); yield* wait(10); fl.dur = 0;
  mark({ kind: 'blob', x0: t.x, y0: t.y - t.def.h * .5, w: 10, col: C(u.color), seed: B.t });
  hitBasic(u, t); goop(t, C(u.color)); yield* wait(8); u.pose = 'idle';
}
// ---- Ataques básicos de las Gotas Negras, según su forma
function* atkSlam(u, t) { // redondas: salto y planchazo
  u.pose = 'attack'; const fac = facing(u), x1 = t.x - fac * (t.def.w / 2 + 6); Audio.sfx('whip', { vol: .5 });
  yield* hop(u, x1, t.y + 1, 12, 30); u.pose = 'hurt'; u.poseT = 8;
  mark({ kind: 'blob', x0: t.x, y0: t.y - t.def.h * .4, w: 10, col: C('negro'), seed: B.t }); B.shake = Math.max(B.shake, 2);
  hitBasic(u, t); goop(t, C('negro'), 60); yield* wait(10); u.pose = 'idle'; yield* hop(u, u.hx, u.hy, 10, 20);
}
function* atkSpit(u, t) { // salpicaduras: escupe tres pegotes
  u.pose = 'attack'; Audio.sfx('ink_jet'); for (let i = 0; i < 3; i++) { stream(u.x, u.y - 8, t.x, t.y - t.def.h * .5, u.def.core || C('negro'), 6, 14); yield* wait(4); }
  yield* wait(10); mark({ kind: 'blob', x0: t.x, y0: t.y - t.def.h * .5, w: 8, col: u.def.core || C('negro'), seed: B.t });
  hitBasic(u, t); goop(t, u.def.core || C('negro'), 60); yield* wait(12); u.pose = 'idle';
}
function* atkSmear(u, t) { // alargadas: embestida y tiznajo diagonal
  u.pose = 'attack'; const fac = facing(u), gh = ghostsOf(u); Audio.sfx('dash', { pan: .3 });
  for (let i = 1; i <= 6; i++) { if (i % 2) gh.add(); const k = i / 6; u.x = lerp(u.hx, t.x - fac * (t.def.w / 2 + 6), k); u.y = lerp(u.hy, t.y + 1, k); yield; }
  mark({ kind: 'stroke', x0: t.x - fac * 10, y0: t.y - 2, x1: t.x + fac * 8, y1: t.y - t.def.h, w: 4, col: C('negro'), jit: 1 });
  hitBasic(u, t); goop(t, C('negro'), 60); yield* wait(10); u.pose = 'idle'; yield* tween(u, u.hx, u.hy, 7); gh.end();
}
function* atkWave(u, t) { // charcos: se aplasta y manda una ola de tinta por el suelo
  u.pose = 'hurt'; u.poseT = 30; yield* wait(6); Audio.sfx('ink_jet');
  const wv = fx(999, () => { const k = clamp(wv.t / 16, 0, 1), x = lerp(u.x, t.x, k); g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(x, t.y, 12 + k * 6, 4 + k * 3, 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4460'; g.fillRect(Math.round(x - 6), t.y - 5 - (k * 4 | 0), 12, 2); }, true);
  yield* wait(16); wv.dur = 0;
  for (let i = 0; i < 10; i++) B.particles.push({ x: t.x + R(-8, 8), y: t.y, vx: R(-.5, .5), vy: -R(1.5, 3), g: .15, col: C('negro'), t: 0, life: 22 });
  hitBasic(u, t); goop(t, C('negro'), 60); yield* wait(12); u.pose = 'idle';
}
function* actAttack(u, target) {
  tickStatus(u); say(u.name + ' ataca');
  if (u.kind === 'party') { const w = u.data.weapon; yield* (w === 'brocha' ? atkBrocha : w === 'lapiz' ? atkLapiz : atkPincel)(u, target); return; }
  const s = u.data.shape; yield* (s === 'splash' ? atkSpit : s === 'tall' ? atkSmear : s === 'blob' ? atkWave : atkSlam)(u, target);
}
// Fase de carga común de las techs combinadas: anillos bajo los usuarios, partículas que suben, chorros que convergen
// en un orbe que alterna los colores de origen y, al final, se funde en el color mezclado. Devuelve el orbe (móvil).
function* chargeAndFuse(users, ox, oy, col, frames = 26) {
  const cols = users.map(u => C(u.color)), orb = { x: ox, y: oy, r: 0, mix: 0 };
  const rings = fx(999, () => { users.forEach((u, i) => { const k = ((rings.t + i * 6) % 18) / 18; g.strokeStyle = cols[i]; g.lineWidth = 1; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(u.x, u.y, 6 + k * 16, 3 + k * 6, 0, 0, 6.29); g.stroke(); }); g.globalAlpha = 1; }, true);
  const of = fx(999, () => { if (orb.r <= 0) return; const hex = orb.mix ? C(col) : cols[(of.t >> 2) % cols.length]; g.fillStyle = ramp(hex).dk; g.beginPath(); g.arc(orb.x, orb.y, orb.r + 2, 0, 6.29); g.fill(); g.fillStyle = hex; g.beginPath(); g.arc(orb.x, orb.y, orb.r, 0, 6.29); g.fill(); g.fillStyle = ramp(hex).hi; g.fillRect(Math.round(orb.x - orb.r * .4), Math.round(orb.y - orb.r * .5), 2, 2); for (let i = 0; i < 6; i++) { const a = of.t * .25 + i * 1.05; g.fillStyle = cols[i % cols.length]; g.fillRect(Math.round(orb.x + Math.cos(a) * (orb.r + 6)), Math.round(orb.y + Math.sin(a) * (orb.r + 3)), 2, 2); } });
  for (let i = 0; i < frames; i++) {
    users.forEach((u, k) => { u.y = u.hy - Math.abs(Math.sin((i + k * 4) * .35)) * 5; if (i % 3 === k % 3) B.particles.push({ x: u.x + R(-8, 8), y: u.y - R(0, u.def.h), vx: 0, vy: -R(.6, 1.4), g: -.02, col: cols[k], t: 0, life: 20 }); });
    if (i === 4) users.forEach((u, k) => { stream(u.x, u.y - 12, ox, oy, C(u.color), 14, frames - 8); Audio.sfx('charge', { semi: SEMI[u.id], when: k * .05 }); });
    if (i > 8) orb.r = Math.min(10, orb.r + 1);
    if (i === frames - 4) { orb.mix = 1; Audio.sfx('mix'); burst(ox, oy, C(col), 16, 2, 18, 0); B.flash = { col: C(col), a: .35 }; }
    yield;
  }
  users.forEach(u => { u.y = u.hy; u.pose = 'idle'; }); rings.dur = 0;
  return { of, orb };
}
// ---- Techs: cada mezcla tiene su propia puesta en escena
function* actTech(users, tech, targets, col) {
  users.forEach(u => { tickStatus(u); u.pose = 'attack'; });
  const isCombo = users.length > 1, id = Object.keys(DATA.techs).find(k => DATA.techs[k] === tech);
  say((isCombo ? users.map(u => u.name).join('+') + ': ' : users[0].name + ': ') + tech.name + ' (' + DATA.colors[col].name + ')', C(col));
  Audio.sfx('banner');
  const atk = users.reduce((s, u) => s + u.atk * statusMult(u, 'tiznado'), 0) / users.length;
  const hitAll = function* (stagger = 0) { for (const t of targets) { if (!t.alive) continue; burst(t.x, t.y - 12, C(col), 14, 2.2, 26); damage(t, baseDmg(atk, t.dfn, tech.power), col, null); if (tech.status && t.alive) { t.status[tech.status] = 3; num(t.x, t.y - 36, tech.status.toUpperCase(), C(col)); Audio.sfx('slow_drip', { when: .3 }); } if (stagger) yield* wait(stagger); } };
  const enemyCx = alive(B.enemies).reduce((s, e) => s + e.x, 0) / Math.max(1, alive(B.enemies).length);
  if (id === 'brochazo') { // la brocha, enorme, pinta una Z roja sobre el enemigo
    const u = users[0], t = targets[0], fac = facing(u); yield* tween(u, lerp(u.hx, t.x, .3), u.hy, 5);
    const X = t.x, yt = t.y - t.def.h - 12, yb = t.y + 2, pts = [[X - fac * 22, yt], [X + fac * 18, yt - 2], [X - fac * 18, yb - 4], [X + fac * 22, yb]];
    let hits = 0; B.flash = { col: C(col), a: .25 }; Audio.sfx('brush_big', { pan: -.3 }); Audio.sfx('brush_sweep', { when: .3, len: 1.4, pan: -.3 });
    yield* toolStroke({ kind: 'brocha', color: C(col), pts, w: 14, col: C(col), frames: 14, fac, scale: 1.4, life: 64, onTip: (k, x, y) => { if (Math.random() < .6) B.particles.push({ x, y, vx: R(-1.2, 1.2), vy: R(-2, .5), g: .14, col: C(col), t: 0, life: 24 }); if (k > .95 && !hits) { hits = 1; } } });
    for (const e of targets) goop(e, C(col), 100); yield* hitAll(); yield* wait(10); u.pose = 'idle'; yield* tween(u, u.hx, u.hy, 6);
  } else if (id === 'trazo') { // el lápiz cruza al enemigo con una X gigante mientras Ámbar lo atraviesa dos veces
    const u = users[0], t = targets[0], fac = facing(u), gh = ghostsOf(u), yt = t.y - t.def.h - 8, yb = t.y + 4;
    for (let pass = 0; pass < 2; pass++) {
      const from = pass ? t.x - fac * 34 : u.hx, to = pass ? u.hx : t.x - fac * 34, ya = pass ? t.y + 2 : t.y - 2;
      const pts = pass ? [[t.x + fac * 20, yt], [t.x - fac * 20, yb]] : [[t.x - fac * 20, yt], [t.x + fac * 20, yb]]; let done = false;
      Audio.sfx('whip'); Audio.sfx('scratch_long', { when: .08, pan: -.3 });
      const dash = (function* () { for (let i = 1; i <= 7; i++) { if (i % 2) gh.add(); const k = i / 7; u.x = lerp(from, to, k); u.y = lerp(u.y, ya, k); yield; } })();
      yield* toolStroke({ kind: 'lapiz', pts, w: 3, col: C(col), under: '#3a3448', frames: 7, fac, scale: 1.3, life: 56, onTip: (k) => { dash.next(); if (k > .6 && !done) { done = true; if (t.alive) damage(t, baseDmg(atk, t.dfn, tech.power), col, null); } } });
    }
    gh.end(); u.x = u.hx; u.y = u.hy; u.pose = 'idle'; yield* wait(6);
  } else if (id === 'salpicon') { // Añil salta y el pincel restalla como un látigo salpicando a todos
    const u = users[0], fac = facing(u), img = propSprite('pincel', C(col)); yield* hop(u, u.hx, u.hy, 12, 30); u.pose = 'hurt'; u.poseT = 10;
    const wh = { a: -1.7 }, px = u.x + fac * 8, py = u.y - u.def.h - 12, f = fx(999, () => drawProp(img, px, py, wh.a, fac, 2, 8, 1.4));
    sparkle(px, py - 4);
    for (let i = 0; i < 7; i++) { wh.a = lerp(-1.7, 0.7, (i + 1) / 7); if (i === 3) { Audio.sfx('whip'); Audio.sfx('splash_clean', { when: .2 }); B.shake = 3; const tx = px + fac * Math.cos(wh.a) * 60, ty = py + Math.sin(wh.a) * 60; for (const t of targets) if (t.alive) stream(tx, ty, t.x, t.y - t.def.h * .5, C(col), 14, 14); for (let j = 0; j < 10; j++) B.particles.push({ x: tx, y: ty, vx: fac * R(0, 3), vy: -R(1, 3), g: .18, col: C(col), t: 0, life: 22 }); } yield; }
    yield* wait(8); f.dur = 0; for (const t of targets) if (t.alive) { mark({ kind: 'blob', x0: t.x, y0: t.y - t.def.h * .5, w: 10, col: C(col), seed: B.t + t.idx }); goop(t, C(col)); }
    yield* hitAll(6); u.pose = 'idle'; yield* wait(10);
  } else if (id === 'llamarada') { // carga → el orbe naranja cae al suelo → lenguas de fuego bajo cada enemigo
    const { of, orb } = yield* chargeAndFuse(users, enemyCx, 62, col, 26);
    Audio.sfx('drop_fall'); for (let i = 1; i <= 8; i++) { orb.y = lerp(62, 122, (i / 8) ** 2); yield; } of.dur = 0; B.shake = 4; Audio.sfx('fwoom'); Audio.sfx('crackle', { when: .15 });
    const fire = fx(44, () => { const t = fire.t, a = t < 32 ? 1 : (44 - t) / 12; g.globalAlpha = a; for (const e of targets) { if (!e.alive && e.dead > 1.2) continue; const h = e.def.h + 26 + Math.sin(t * .5 + e.idx) * 6, w = Math.max(12, e.def.w * .8); [[C('rojo'), 1, 1], [C('naranja'), .82, .8], [C('amarillo'), .6, .58], ['#fff3c0', .32, .3]].forEach(([c, hw, hh], L) => { const wob = L ? Math.sin(t * .7 + L * 2 + e.idx) * 2 : 0; g.fillStyle = c; g.beginPath(); g.ellipse(e.x + wob, e.y - h * hh * .5, w * hw, h * hh * .5, 0, 0, 6.29); g.fill(); for (let f = 0; f < 3; f++) { const fy = e.y - h * hh - 2 - ((t * 1.3 + f * 7 + L * 3) % 12); g.fillRect(Math.round(e.x + wob + (f - 1) * w * hw * .5 + Math.sin(t * .9 + f) * 2), Math.round(fy), 2 + (L < 2 ? 1 : 0), 3); } }); } g.globalAlpha = 1; }, true);
    for (const e of targets) if (e.alive) flames(e.x, e.y, 30, e.def.w * .5);
    yield* wait(10); B.flash = { col: C(col), a: .4 }; yield* hitAll(5); yield* wait(22);
  } else if (id === 'brote') { // carga → el orbe verde se hunde → onda por el suelo, zarcillos que trepan y brotes con flor bajo el grupo
    const { of, orb } = yield* chargeAndFuse(users, enemyCx, 98, col, 24);
    for (let i = 1; i <= 6; i++) { orb.y = lerp(98, 128, i / 6); orb.r = 10 - i; yield; } of.dur = 0; Audio.sfx('grow'); Audio.sfx('leaves', { when: .3 }); Audio.sfx('heal_bells', { when: .5 });
    const wave = fx(22, () => { const k = wave.t / 22; g.strokeStyle = C(col); g.lineWidth = 2; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(enemyCx, 128, 10 + k * 160, 4 + k * 44, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; }, true);
    const sh = ramp(C(col)).sh;
    const vines = fx(48, () => { const k = clamp(vines.t / 14, 0, 1); g.globalAlpha = vines.t > 38 ? (48 - vines.t) / 10 : 1; for (const e of targets) { if (!e.alive) continue; const pts = []; for (let i = 0; i <= 6; i++) pts.push([e.x + Math.sin(i * 1.3) * e.def.w * .45, e.y + 2 - i * e.def.h / 5]); drawPath(pts, 3, sh, k); const n = Math.floor(6 * k); g.fillStyle = C(col); for (let i = 1; i <= n; i++) { const [lx, ly] = pts[i]; g.fillRect(Math.round(lx + (i % 2 ? 3 : -5)), Math.round(ly - 1), 3, 2); } } g.globalAlpha = 1; });
    const sprout = fx(54, () => { const k = clamp(sprout.t / 16, 0, 1); g.globalAlpha = sprout.t > 44 ? (54 - sprout.t) / 10 : 1; for (const p of alive(B.party)) { const sx = p.x + 10, sy = p.y + 1, top = sy - 14 * k; pstroke(sx, sy, sx, top, 2, sh, 1, 0, false); if (k > .4) { g.fillStyle = C(col); g.fillRect(sx - 4, Math.round(top) + 4, 4, 2); g.fillRect(sx + 1, Math.round(top) + 7, 4, 2); } if (k > .8) { g.fillStyle = C(p.color); g.fillRect(sx - 2, Math.round(top) - 3, 5, 4); g.fillStyle = '#fbe28a'; g.fillRect(sx, Math.round(top) - 2, 1, 2); } } g.globalAlpha = 1; });
    yield* wait(10);
    for (const u of alive(B.party)) { heal(u, Math.round(u.maxhp * tech.heal)); for (let i = 0; i < 8; i++) B.particles.push({ x: u.x + R(-10, 10), y: u.y, vx: 0, vy: -R(.5, 1.2), g: -.01, col: i % 2 ? C(col) : '#fbe28a', t: -RI(0, 12), life: 24 }); }
    yield* wait(6); yield* hitAll(4); yield* wait(22);
  } else if (id === 'eclipse') { // carga → el orbe se vuelve un eclipse (disco negro con corona violeta), oscurece el campo y se estrella
    const t = targets[0]; const { of } = yield* chargeAndFuse(users, t.x, t.y - 60, col, 24); of.dur = 0;
    const dark = fx(999, () => { g.fillStyle = 'rgba(11,9,18,' + Math.min(.55, dark.t * .04) + ')'; g.fillRect(0, 0, W, H); });
    const disc = { x: t.x, y: t.y - 60, r: 8 }, hi = ramp(C(col)).hi, dk = ramp(C(col)).dk;
    Audio.sfx('hum_down'); const df = fx(999, () => { const d = disc; g.fillStyle = C(col); g.beginPath(); g.arc(d.x, d.y, d.r + 3 + Math.sin(df.t * .5), 0, 6.29); g.fill(); g.fillStyle = hi; g.beginPath(); g.arc(d.x, d.y, d.r + 1.5, 0, 6.29); g.fill(); g.fillStyle = '#14121c'; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.29); g.fill(); g.fillStyle = dk; g.beginPath(); g.arc(d.x - d.r * .25, d.y - d.r * .2, d.r * .65, 0, 6.29); g.fill(); for (let i = 0; i < 8; i++) { const a = df.t * .1 + i * .785; g.fillStyle = i % 2 ? C(col) : hi; g.fillRect(Math.round(d.x + Math.cos(a) * (d.r + 7)), Math.round(d.y + Math.sin(a) * (d.r + 7)), 2, 2); } });
    for (let i = 1; i <= 16; i++) { disc.r = lerp(8, 20, i / 16); disc.y = lerp(t.y - 60, t.y - 56, i / 16); yield; }
    yield* wait(8); Audio.sfx('drop_fall', { vol: .6 });
    for (let i = 1; i <= 8; i++) { disc.y = lerp(t.y - 56, t.y - t.def.h * .5, (i / 8) ** 2); yield; }
    df.dur = 0; dark.dur = 0; B.flash = { col: C(col), a: .7 }; B.shake = 7; Audio.sfx('impact_sub'); Audio.sfx('glass', { when: .05 });
    const shock = fx(16, () => { const k = shock.t / 16; g.strokeStyle = C(col); g.lineWidth = 2; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(t.x, t.y, 6 + k * 60, 3 + k * 20, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; }, true);
    for (let i = 0; i < 16; i++) B.particles.push({ x: t.x, y: t.y - t.def.h * .5, vx: R(-3, 3), vy: R(-4, -1), g: .2, col: i % 2 ? C(col) : hi, t: 0, life: 26, size: 3 });
    mark({ kind: 'blob', x0: t.x, y0: t.y - t.def.h * .5, w: 16, col: dk, seed: B.t, life: 60 }); goop(t, dk, 90);
    yield* hitAll(); yield* wait(22);
  } else { // arcoíris: tres orbes de color orbitan y se funden en uno blanco; del orbe sale un prisma de seis haces
    const cx = 246, cy = 78, cols = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'], orbs = users.map((u, i) => ({ col: C(u.color), a: i * 2.094 }));
    const rings = fx(999, () => { users.forEach((u, i) => { const k = ((rings.t + i * 6) % 18) / 18; g.strokeStyle = orbs[i].col; g.lineWidth = 1; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(u.x, u.y, 6 + k * 16, 3 + k * 6, 0, 0, 6.29); g.stroke(); }); g.globalAlpha = 1; }, true);
    const of = fx(999, () => { const t = of.t, rad = Math.max(0, 24 - t * .8); orbs.forEach(o => { const a = o.a + t * .2, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * .5; g.fillStyle = ramp(o.col).dk; g.beginPath(); g.arc(x, y, 6, 0, 6.29); g.fill(); g.fillStyle = o.col; g.beginPath(); g.arc(x, y, 4.5, 0, 6.29); g.fill(); g.fillStyle = ramp(o.col).hi; g.fillRect(Math.round(x - 2), Math.round(y - 2), 2, 2); }); if (rad < 2) { g.fillStyle = '#f4f0ea'; g.beginPath(); g.arc(cx, cy, 9 + Math.sin(t) * 2, 0, 6.29); g.fill(); g.fillStyle = '#fff3c0'; g.fillRect(cx - 3, cy - 4, 3, 3); } });
    for (let i = 0; i < 32; i++) { users.forEach((u, k) => { u.y = u.hy - Math.abs(Math.sin((i + k * 3) * .35)) * 8; if (i % 2 === 0) B.particles.push({ x: u.x + R(-8, 8), y: u.y - R(0, u.def.h), vx: 0, vy: -1, g: -.02, col: C(u.color), t: 0, life: 18 }); }); if (i === 6) users.forEach(u => stream(u.x, u.y - 12, cx, cy, C(u.color), 14, 20)); yield; }
    users.forEach(u => { u.y = u.hy; u.pose = 'idle'; }); rings.dur = 0; B.flash = { col: '#f4f0ea', a: .8 }; Audio.sfx('rainbow'); B.rainbow = 40; B.shake = 4;
    const beams = fx(30, () => { const k = clamp(beams.t / 10, 0, 1); g.globalAlpha = beams.t > 20 ? (30 - beams.t) / 10 : 1; cols.forEach((c, i) => { const ty = 66 + i * 12, tx = 56; pstroke(cx, cy, lerp(cx, tx, k), lerp(cy, ty, k), 3, C(c), 1, 0, false); }); g.globalAlpha = 1; });
    const arc = fx(60, () => { const k = clamp(arc.t / 20, 0, 1); cols.forEach((c, i) => { const n = 40 * k | 0; g.fillStyle = C(c); for (let s = 0; s <= n; s++) { const q = s / 40, x = lerp(cx, enemyCx, q), y = 110 - Math.sin(q * Math.PI) * 70 + i * 3; g.fillRect(Math.round(x) - 2, Math.round(y), 4, 3); } }); });
    yield* wait(10); of.dur = 0;
    for (const t of targets) if (t.alive) { goop(t, '#f4f0ea', 90); cols.forEach((c, i) => mark({ kind: 'blob', x0: t.x + (i - 2.5) * 5, y0: t.y - t.def.h * .5, w: 6, col: C(c), seed: i + t.idx, life: 56 })); }
    yield* hitAll(4); yield* wait(24);
  }
}
// ---- Objetos: el objeto aparece y hace lo que dice
function* actItem(u, itemId, target) {
  tickStatus(u); const it = DATA.items[itemId]; Game.inventory[itemId]--; say(u.name + ' usa ' + it.name);
  u.pose = 'attack'; yield* wait(6);
  if (it.kind === 'heal') { // una gota de agua cae del cielo sobre el aliado
    const def = { color: C('azul'), shape: 'tall', w: 10, h: 14 }, y1 = target.y - target.def.h * .5;
    const d = fx(999, () => { const k = clamp(d.t / 14, 0, 1); drawDrop(def, target.x, lerp(target.y - 80, y1, k * k), 'hop', 0); });
    Audio.sfx('drop_fall'); yield* wait(14); d.dur = 0; Audio.sfx('splash_clean'); for (let i = 0; i < 10; i++) B.particles.push({ x: target.x, y: y1, vx: R(-2, 2), vy: -R(.5, 2.5), g: .15, col: C('azul'), t: 0, life: 20 });
    heal(target, it.amount);
  } else if (it.kind === 'mp') { // el tubo aparece sobre el aliado, apunta hacia abajo y se exprime
    const img = propSprite('tubo', C(target.color)), P = PROP.tubo, px = target.x, py = target.y - target.def.h - 6; sparkle(px, py - 30);
    const tb = fx(999, () => { const sq = tb.t > 8 ? Math.sin(tb.t * .8) * .12 : 0; drawProp(img, px, py - 24 + Math.min(8, tb.t) * 2, P.a + sq, 1, P.tip[0], P.tip[1], 1.2); });
    Audio.sfx('squeeze'); yield* wait(8); Audio.sfx('plop', { when: .1 }); for (let i = 0; i < 16; i++) { B.particles.push({ x: px + R(-2, 2), y: py - 2, vx: R(-.4, .4), vy: R(.4, 1.4), g: .1, col: C(target.color), t: 0, life: 18, size: 3 }); yield; }
    tb.dur = 0; heal(target, it.amount, true); goop(target, C(target.color), 50);
  } else { // la goma, grande, frota al enemigo de lado a lado y lo va borrando (virutas rosas)
    const img = propSprite('goma'), P = PROP.goma, rub = { x: 0 }, gm = fx(999, () => drawProp(img, target.x + rub.x, target.y - target.def.h * .55, 0.25, 1, P.tip[0], P.tip[1], 1.2));
    sparkle(target.x, target.y - target.def.h - 6); target.erasing = true;
    for (let i = 0; i < 26; i++) { rub.x = Math.sin(i * .75) * 10; if (i % 2 === 0) B.particles.push({ x: target.x + rub.x + R(-6, 6), y: target.y - target.def.h * .3, vx: R(-.6, .6), vy: R(-1.2, 0), g: .12, col: i % 4 ? '#e86a8a' : '#f4f0ea', t: 0, life: 22 }); if (i % 6 === 0) Audio.sfx('rub'); if (i % 8 === 4) Audio.sfx('crumbs'); yield; }
    gm.dur = 0; target.erasing = false;
    const d = target.color === 'negro' ? it.amount : Math.round(it.amount / 3); target.hp = Math.max(0, target.hp - d); target.pose = 'hurt'; target.poseT = 14; num(target.x, target.y - 26, d, '#f4f0ea'); Audio.sfx('hit'); B.hitstop = 3; if (target.hp <= 0) kill(target);
  }
  u.pose = 'idle'; yield* wait(12);
}
function* actEnemy(u) {
  tickStatus(u); u.acts++;
  const targets = alive(B.party); if (!targets.length) return;
  let target = pick(targets);
  if (u.ai === 'hunter' || u.ai === 'boss') { // busca a quien más daño le haga (complementario)
    const weak = targets.filter(t => colorMult(u.color, t.color) >= 2); if (weak.length && Math.random() < .7) target = pick(weak);
  }
  if (u.ai === 'tiznar' && Math.random() < .35) {
    say(u.name + ': Tiznar', C('violeta')); u.pose = 'attack'; Audio.sfx('ink_jet'); stream(u.x, u.y - 10, target.x, target.y - 12, C('negro'), 14, 20); yield* wait(22);
    if (DATA.accessories[target.acc] && DATA.accessories[target.acc].immune === 'tiznado') { num(target.x, target.y - 26, 'GOMA!', '#f4f0ea'); say(target.name + ' lo borra con la Goma', '#f4f0ea'); Audio.sfx('rub'); Audio.sfx('rub', { when: .12 }); Audio.sfx('crumbs', { when: .2 }); const img = propSprite('goma'), gm = fx(14, () => drawProp(img, target.x + Math.sin(gm.t) * 6, target.y - target.def.h * .6, 0.25, 1, PROP.goma.tip[0], PROP.goma.tip[1])); }
    else { target.status.tiznado = 3; num(target.x, target.y - 30, 'TIZNADO', C('violeta')); mark({ kind: 'stroke', x0: target.x - 8, y0: target.y - 4, x1: target.x + 8, y1: target.y - target.def.h + 2, w: 4, col: C('negro'), jit: 1, life: 70 }); burst(target.x, target.y - 10, C('negro'), 12, 1.5); }
    u.pose = 'idle'; yield* wait(16); return;
  }
  if (u.ai === 'boss' && u.acts % 3 === 0) { // marea negra: una ola de tinta cruza el suelo hacia el grupo
    say('La Tinta: Marea negra', '#8c8ab0'); u.pose = 'hurt'; u.poseT = 24; Audio.sfx('ink_jet'); Audio.sfx('hum_down', { vol: .6 }); yield* wait(8);
    const wv = fx(999, () => { const k = clamp(wv.t / 20, 0, 1), x = lerp(u.x + 20, 236, k); g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(x, 116, 22 + k * 10, 26, 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4460'; g.fillRect(Math.round(x) - 14, 116 - 30 - (k * 6 | 0), 28, 2); }, true);
    for (let i = 0; i < 20; i++) { B.particles.push({ x: u.x + R(-20, 20), y: u.y - R(0, 30), vx: R(2, 4), vy: R(-1.5, .5), col: C('negro'), t: 0, life: 40, g: .08 }); yield; }
    wv.dur = 0; B.flash = { col: '#0b0912', a: .5 }; B.shake = 5;
    for (const t of alive(B.party)) { damage(t, baseDmg(u.atk, t.dfn, .8), 'negro'); mark({ kind: 'blob', x0: t.x, y0: t.y - t.def.h * .4, w: 10, col: C('negro'), seed: t.idx }); goop(t, C('negro'), 70); }
    u.pose = 'idle'; yield* wait(24); return;
  }
  yield* actAttack(u, target);
}
// --- Menú de batalla
function techsFor(u) {
  return Object.entries(DATA.techs).filter(([, t]) => t.users.includes(u.id)).map(([id, t]) => {
    const users = t.users.map(uid => B.party.find(p => p.id === uid));
    const cost = uid => Math.max(1, t.mp - (DATA.accessories[B.party.find(p => p.id === uid).acc].techDiscount || 0));
    const ready = users.every(p => p.alive && (p === u || (p.atb >= 100 && !p.acting))), mpOk = users.every(p => p.mp >= cost(p.id));
    return { id, t, users, ready, mpOk, avail: ready && mpOk, cost: cost(u.id), combo: users.length > 1 };
  });
}
function openCmd(u) { B.menu = { unit: u, level: 'cmd', idx: 0 }; }
function updateBattleMenu() {
  const m = B.menu, u = m.unit;
  if (m.level === 'cmd') {
    if (hit('down')) { m.idx = (m.idx + 1) % 3; Audio.sfx('cursor', semiOf(u)); } if (hit('up')) { m.idx = (m.idx + 2) % 3; Audio.sfx('cursor', semiOf(u)); }
    if (hit('back') || hit('swap')) { if (B.queue.length > 1) { B.queue.push(B.queue.shift()); B.menu = null; Audio.sfx('page'); } return; }
    if (hit('ok')) {
      Audio.sfx('confirm', semiOf(u));
      if (m.idx === 0) { m.level = 'target'; m.pending = { type: 'attack' }; m.targets = alive(B.enemies); m.tidx = 0; }
      else if (m.idx === 1) { m.level = 'tech'; m.list = techsFor(u); m.tidx = 0; m.idx = 0; }
      else { m.level = 'item'; m.list = Object.entries(Game.inventory).filter(([, n]) => n > 0).map(([k, n]) => ({ id: k, n, it: DATA.items[k] })); m.idx = 0; }
    }
    return;
  }
  if (m.level === 'tech' || m.level === 'item') {
    const L = m.list; if (!L.length) { if (hit('back') || hit('ok')) { m.level = 'cmd'; m.idx = m.level === 'tech' ? 1 : 2; Audio.sfx('back'); } return; }
    if (hit('down')) { m.idx = (m.idx + 1) % L.length; Audio.sfx('cursor', semiOf(u)); } if (hit('up')) { m.idx = (m.idx + L.length - 1) % L.length; Audio.sfx('cursor', semiOf(u)); }
    if (hit('back')) { const was = m.level; m.level = 'cmd'; m.idx = was === 'tech' ? 1 : 2; Audio.sfx('cancel'); return; }
    if (hit('ok')) {
      const e = L[m.idx];
      if (m.level === 'tech') {
        if (!e.avail) { Audio.sfx('nope'); say(!e.ready ? 'El compañero aún no está listo' : 'Falta pigmento (MP)', '#8c8ab0'); return; }
        Audio.sfx('confirm', semiOf(u)); m.pending = { type: 'tech', tech: e };
        if (e.t.target === 'enemy') { m.level = 'target'; m.targets = alive(B.enemies); m.tidx = 0; }
        else commit(alive(B.enemies));
      } else {
        Audio.sfx('confirm', semiOf(u)); m.pending = { type: 'item', item: e.id }; m.level = 'target'; m.targets = e.it.target === 'enemy' ? alive(B.enemies) : B.party.filter(p => p.alive); m.tidx = 0;
      }
    }
    return;
  }
  if (m.level === 'target') {
    const T = m.targets;
    if (hit('down') || hit('right')) { m.tidx = (m.tidx + 1) % T.length; Audio.sfx('cursor', semiOf(u)); } if (hit('up') || hit('left')) { m.tidx = (m.tidx + T.length - 1) % T.length; Audio.sfx('cursor', semiOf(u)); }
    if (hit('back')) { m.level = m.pending.type === 'attack' ? 'cmd' : m.pending.type; if (m.level === 'cmd') m.idx = 0; else m.idx = m.list.findIndex(e => e.id === (m.pending.tech ? m.pending.tech.id : m.pending.item)); Audio.sfx('cancel'); return; }
    if (hit('ok')) { Audio.sfx('confirm', semiOf(u)); commit([T[m.tidx]]); }
  }
}
function commit(targets) {
  const m = B.menu, u = m.unit, p = m.pending; let gen, users = [u];
  if (p.type === 'attack') gen = actAttack(u, targets[0]);
  else if (p.type === 'tech') { users = p.tech.users; users.forEach(x => { x.mp -= Math.max(1, p.tech.t.mp - (DATA.accessories[x.acc].techDiscount || 0)); }); gen = actTech(users, p.tech.t, targets, p.tech.t.color); }
  else gen = actItem(u, p.item, targets[0]);
  users.forEach(x => { x.atb = 0; B.queue = B.queue.filter(q => q !== x); });
  B.menu = null; B.actions.push(tracked(u, gen)); B.busy = true;
}
function updateBattle() {
  B.t++;
  if (B.msgT > 0 && --B.msgT === 0) B.msg = null;
  if (B.flash) { B.flash.a -= .04; if (B.flash.a <= 0) B.flash = null; }
  if (B.rainbow > 0) B.rainbow--;
  if (B.shake > 0 && B.t % 2 === 0) B.shake--;
  // partículas y números siguen incluso en hitstop (menos el mundo)
  for (const p of B.particles) {
    if (p.stream) { if (++p.t < 0) continue; const k = clamp(p.t / p.dur, 0, 1); p.x = lerp(p.x0 ?? (p.x0 = p.x), p.tx, k); p.y = lerp(p.y0 ?? (p.y0 = p.y), p.ty, k) + Math.sin(k * 3.14) * p.arc; if (p.t >= p.dur) p.dead = true; }
    else { if (p.t < 0) { p.t++; continue; } p.x += p.vx; p.y += p.vy; p.vy += p.g; if (++p.t > p.life) p.dead = true; }
  }
  B.particles = B.particles.filter(p => !p.dead);
  for (const n of B.nums) { n.t++; n.y += n.vy; n.vy += .12; if (n.vy > 0 && n.t < 20) n.vy = -0.4; } B.nums = B.nums.filter(n => n.t < 44);
  for (const u of B.units) { if (u.poseT > 0 && --u.poseT === 0 && u.alive) u.pose = 'idle'; if (u.dead) u.dead += .04; if (u.goop) { const G = u.goop; G.t++; for (const d of G.drips) d.len = Math.min(d.max, d.len + d.speed); if (G.t > G.life || !u.alive) u.goop = null; } }
  if (B.hitstop > 0) { B.hitstop--; return; }
  for (const f of B.fx) f.t++; B.fx = B.fx.filter(f => f.t <= f.dur);
  for (const m of B.marks) m.t++; B.marks = B.marks.filter(m => m.t <= m.life);
  if (B.phase === 'intro') { if (B.t > 24) { B.phase = 'fight'; say('¡Gotas Negras!', '#8c8ab0'); Audio.sfx('banner'); } return; }
  if (B.phase === 'victory' || B.phase === 'defeat') { updateEnd(); return; }
  // acciones concurrentes: todas avanzan un frame
  if (B.actions.length) { B.actions = B.actions.filter(a => !a.next().done); B.busy = B.actions.length > 0; }
  if (!alive(B.enemies).length || !alive(B.party).length) { if (!B.actions.length) checkEnd(); return; }
  if (B.menu) updateBattleMenu();
  if (B.menu && !ATB_ACTIVE) return; // modo Wait: el ATB se detiene con el menú abierto
  // tick ATB (modo Active: sigue corriendo mientras eliges)
  for (const u of alive(B.units)) { if (u.acting) continue; u.atb = Math.min(100, u.atb + u.spd * statusMult(u, 'lento') * ATB_RATE); if (u.atb >= 100 && u.kind === 'party' && !B.queue.includes(u)) { const other = B.party.some(p => p !== u && p.alive && p.atb >= 100 && !p.acting); B.queue.push(u); Audio.sfx(other ? 'combo_ready' : 'ready', semiOf(u)); }
    if (u.kind === 'enemy' && u.atb >= 82 && !u.warned) { u.warned = true; Audio.sfx('enemy_soon'); } }
  const e = alive(B.enemies).find(u => u.atb >= 100 && !u.acting);
  if (e && B.actions.length < 3) { e.atb = 0; B.actions.push(tracked(e, actEnemy(e))); B.busy = true; }
  if (B.queue.length && !B.menu) openCmd(B.queue[0]);
}
// marca la unidad como "actuando" mientras dura su corrutina (no acumula ATB ni se le encola otra acción)
function* tracked(u, gen) { u.acting = true; u.warned = false; try { yield* gen; } finally { u.acting = false; } }
function checkEnd() {
  if (!alive(B.enemies).length) { B.phase = 'victory'; B.t = 0; Audio.stop(); if (typeof MUSIC !== 'undefined' && MUSIC.victory) Audio.play('victory'); else Audio.sfx('victory'); B.party.forEach(u => { if (u.alive) u.pose = 'happy'; }); }
  else if (!alive(B.party).length) { B.phase = 'defeat'; B.t = 0; Audio.stop(); if (typeof MUSIC !== 'undefined' && MUSIC.gameover) Audio.play('gameover'); }
}
function updateEnd() {
  if (B.phase === 'victory') {
    if (B.t === 60) { const exp = B.enemies.reduce((s, u) => s + u.data.exp, 0); Game.pigmento += exp; B.result = exp; Audio.sfx('tinkle'); }
    if (B.t > 70 && hit('ok')) {
      B.party.forEach(u => { u.data.cur.hp = u.hp; u.data.cur.mp = u.mp; }); Game.defeated.add(B.foe.key);
      if (B.foe.boss) { Game.bossDown = true; Game.palette = 'vivo'; Audio.sfx('saturate'); Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); OW.msg = { lines: DATA.texts.ending, t: 0 }; }
      setState('overworld'); Audio.play('map');
    }
  } else if (B.t > 80 && hit('ok')) { resetGame(); }
}
function resetGame() {
  Game.pigmento = 0; Game.palette = 'gris'; Game.inventory = { ...DATA.inventory }; Game.defeated = new Set(); Game.bossDown = false; Game.ended = false;
  Party.forEach((p, i) => { p.acc = DATA.party[i].acc; const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; });
  initOverworld(); setState('overworld'); Audio.play('map');
}
// --- Render de batalla
function drawBattleBg() {
  const gris = Game.palette === 'gris', sky = gris ? ['#4a4f6a', '#5f6680', '#767c96'] : ['#3a7fd0', '#62a8ec', '#9ed0f6'];
  sky.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 22, W, 22); });
  g.fillStyle = gris ? '#8b91a8' : '#bde2fa'; g.fillRect(0, 66, W, 8);
  const hill = gris ? '#6a7a62' : '#4aa348', hill2 = gris ? '#5d6c56' : '#3d8a3c';
  g.fillStyle = hill2; for (let x = 0; x < W; x += 40) { g.beginPath(); g.arc(x + 20, 82, 26, 3.14, 0); g.fill(); }
  g.fillStyle = hill; for (let x = -20; x < W; x += 56) { g.beginPath(); g.arc(x + 28, 86, 30, 3.14, 0); g.fill(); }
  const gr = gris ? PAL.gris : PAL.vivo; g.fillStyle = gr.grass; g.fillRect(0, 74, W, 70); g.fillStyle = gr.grass2;
  const rnd = seeded(99); for (let i = 0; i < 90; i++) g.fillRect(rnd() * W | 0, 76 + rnd() * 66 | 0, 2, 1);
  // charco de tinta bajo los enemigos
  g.fillStyle = '#2a2438'; g.beginPath(); g.ellipse(84, 128, 62, 22, 0, 0, 6.29); g.fill(); g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(84, 130, 50, 15, 0, 0, 6.29); g.fill();
  for (const p of B.puddles) { g.fillStyle = ramp(p.col).base; g.beginPath(); g.ellipse(p.x, p.y, p.w * .45, 3, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).hi; g.fillRect(p.x - 3, p.y - 1, 3, 1); }
}
function drawBattle() {
  const sx = B.shake ? RI(-B.shake, B.shake) : 0, sy = B.shake ? RI(-B.shake, B.shake) / 2 | 0 : 0;
  g.save(); g.translate(sx, sy);
  drawBattleBg();
  for (const f of B.fx) if (f.under) f.draw();
  const ents = [...B.units].sort((a, b) => a.y - b.y);
  for (const u of ents) {
    if (u.dead && u.dead > 1.6) continue;
    if (u.dead) { g.globalAlpha = clamp(1.6 - u.dead, 0, 1); }
    if (u.erasing && (B.t >> 1) & 1) g.globalAlpha = .35;
    if (!u.dead) shadow(u.x, u.y, u.shadowW);
    const frame = (B.t / 9 + u.idx * 2 | 0) % 4, ready = u.kind === 'party' && u.atb >= 100 && u.alive && !u.acting;
    const G = u.goop, ga = G ? (G.t > G.life - 20 ? (G.life - G.t) / 20 : 1) : 0;
    drawDrop(u.def, u.x, u.y - (ready ? Math.abs(Math.sin(B.t * .25)) * 2 | 0 : 0), u.pose, frame, { dark: u.kind === 'enemy' && !u.def.core, tint: G ? G.col : null, tintA: .55 * ga });
    if (G) drawGoop(u);
    g.globalAlpha = 1;
    if (u.kind === 'enemy' && u.alive && u.boss) { bar(u.x - 20, u.y + 4, 40, 4, u.hp / u.maxhp, '#8b48c8'); }
    if (u.status.tiznado && u.alive) { g.fillStyle = '#2a2438'; g.fillRect(u.x - 3, u.y - u.def.h - 6, 6, 2); }
    if (u.status.lento && u.alive) { txt('z', u.x + 6, u.y - u.def.h - 10, C('violeta'), null); }
  }
  drawMarks(); for (const f of B.fx) if (!f.under) f.draw();
  for (const p of B.particles) { if (p.t < 0) continue; g.fillStyle = p.pal ? p.pal[Math.min(p.pal.length - 1, Math.floor(p.t / p.life * p.pal.length))] : p.col; const s = p.stream ? 2 : (p.t > p.life * .7 ? 1 : (p.size || 2)); g.fillRect(Math.round(p.x), Math.round(p.y), s, s); }
  // cursor de objetivo
  if (B.menu && B.menu.level === 'target') {
    const T = B.menu.targets, ucol = C(B.menu.unit.color); T.forEach((t, i) => { if (i !== B.menu.tidx) return; const bob = Math.abs(Math.sin(B.t * .2)) * 3 | 0; g.drawImage(iconSprite('drop', ucol), Math.round(t.x - 6), Math.round(t.y - t.def.h - 16 - bob));
      const label = t.name + (t.kind === 'enemy' ? '  ' + t.hp + '/' + t.maxhp : '  HP ' + t.hp); g.font = FONT; const w = g.measureText(label).width + 20, x0 = clamp(t.x - w / 2, 2, W - w - 2); win(x0, 4, w, 14); swatch(x0 + 4, 7, t.color === 'negro' ? '#2a2438' : C(t.color)); ui(label, x0 + 14, 7, INK); });
  }
  g.restore();
  if (B.flash) { g.fillStyle = B.flash.col; g.globalAlpha = B.flash.a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (B.rainbow > 0) { const cols = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta']; cols.forEach((c, i) => { g.fillStyle = C(c); g.globalAlpha = .5 * B.rainbow / 40; const off = (40 - B.rainbow) * 12 + i * 10; g.fillRect(off - 200, 0, 8, H); g.fillRect(W - off + 200 - 8, 0, 8, H); }); g.globalAlpha = 1; }
  for (const n of B.nums) { g.font = FONT; if (n.big) { txt(n.v, Math.round(n.x) + 1, Math.round(n.y) + 1, n.col, null); } txt(n.v, Math.round(n.x), Math.round(n.y), n.col); }
  // mensaje superior
  if (B.msg && !(B.menu && B.menu.level === 'target')) banner(B.msg.s, B.msg.col === '#f4f0ea' ? INK : B.msg.col);
  drawBattleUI();
  if (B.phase === 'intro') { const k = clamp(1 - B.t / 24, 0, 1); if (k > 0) { g.fillStyle = '#0b0912'; g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H / 2 + 10, (1 - k) * 300, 0, 6.29, true); g.fill(); } }
  if (B.phase === 'victory' && B.t > 60) { win(80, 56, 160, 46); banner('¡VICTORIA!', C('amarillo'), 58); g.font = FONT; const rs = 'Pigmento +' + B.result; ui(rs, W / 2 - g.measureText(rs).width / 2 | 0, 80, INK); if ((B.t / 20 | 0) % 2) ui('▼', W / 2 - 4, 90, INK2); }
  if (B.phase === 'defeat') { g.fillStyle = 'rgba(11,9,18,' + clamp(B.t / 60, 0, .8) + ')'; g.fillRect(0, 0, W, H); if (B.t > 40) DATA.texts.gameover.forEach((l, i) => txtC(l, W / 2, 70 + i * 12, i === 0 ? '#8c8ab0' : '#f4f0ea')); }
}
// ---- GUI temática: cuaderno de pintor (papel, tinta, paleta, herramientas)
const INK = '#2a2438', INK2 = '#6a6480', INK3 = '#9a90a8', PAPER = '#f1e9d6', PAPER2 = '#e3d8bd', GOLD = '#b8860b';
function ui(s, x, y, col = INK) { txt(s, x, y, col, '#d9cdb0'); }
function iconSprite(name, color) {
  return cached(`icon|${name}|${color || ''}`, () => {
    const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d'); const F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const rp = color ? ramp(color) : null;
    switch (name) {
      case 'brocha': for (let i = 0; i < 5; i++) F('#b07a48', 1 + i, 10 - i, 2, 1); F('#5a4630', 0, 11, 1, 1); F('#c9c4d4', 5, 5, 3, 2); F('#8c8ab0', 6, 6, 2, 1); F(rp.base, 7, 1, 4, 5); F(rp.hi, 7, 1, 4, 1); F(rp.dk, 10, 2, 1, 4); F(rp.sh, 7, 5, 4, 1); break;
      case 'lapiz': for (let i = 0; i < 8; i++) { F('#f2c93a', 1 + i, 10 - i, 2, 1); F('#c9a02a', 2 + i, 11 - i, 1, 1); } F('#e89aa8', 0, 11, 2, 1); F('#e8cf9a', 9, 2, 2, 1); F('#2a2438', 11, 0, 1, 2); F('#e8cf9a', 10, 1, 1, 1); break;
      case 'pincel': for (let i = 0; i < 7; i++) F('#1e1a2c', 1 + i, 10 - i, 1, 1); F('#4a4460', 1, 9, 1, 1); F('#c9c4d4', 8, 3, 1, 1); F('#c9c4d4', 7, 4, 1, 1); F(rp.base, 9, 1, 2, 2); F(rp.dk, 11, 0, 1, 1); F(rp.hi, 9, 1, 1, 1); break;
      case 'tech': x.fillStyle = '#d9b07a'; x.beginPath(); x.ellipse(6, 6.5, 5.5, 4.5, 0, 0, 6.29); x.fill(); x.fillStyle = '#8a5a34'; x.beginPath(); x.ellipse(6, 6.5, 5.5, 4.5, 0, 0, 6.29); x.stroke(); F('#8a5a34', 2, 7, 2, 2); F(C('rojo'), 4, 3, 2, 2); F(C('amarillo'), 7, 3, 2, 2); F(C('azul'), 8, 7, 2, 2); F(C('verde'), 5, 8, 2, 1); break;
      case 'item': F('#8c8ab0', 4, 0, 4, 2); F('#c9c4d4', 3, 2, 6, 7); F('#f0eef6', 4, 2, 1, 7); F('#f4f0ea', 4, 4, 4, 2); F(rp ? rp.base : C('rojo'), 5, 4, 2, 2); F('#6a6480', 4, 9, 4, 1); F(rp ? rp.base : C('rojo'), 4, 10, 4, 2); break;
      case 'drop': F(rp.out, 5, 0, 2, 1); F(rp.out, 4, 1, 4, 1); F(rp.out, 3, 2, 6, 4); F(rp.out, 4, 6, 4, 1); F(rp.base, 5, 1, 2, 1); F(rp.base, 4, 2, 4, 3); F(rp.hi, 4, 2, 1, 2); F(rp.sh, 5, 5, 2, 1); break;
    }
    return c;
  });
}
function dropCursor(x, y, col) { const s = iconSprite('drop', col); g.drawImage(s, Math.round(x), Math.round(y) + (((B.t || Game.t) >> 3) & 1)); }
// brocha en miniatura que se carga de pintura = barra ATB
function atbBrush(x, y, f, col, t) {
  g.fillStyle = '#5a4630'; g.fillRect(x, y + 1, 8, 4); g.fillStyle = '#b07a48'; g.fillRect(x + 1, y + 2, 6, 2); g.fillStyle = '#d9a06a'; g.fillRect(x + 1, y + 2, 6, 1);
  g.fillStyle = '#8c8ab0'; g.fillRect(x + 8, y, 3, 6); g.fillStyle = '#e8e6f0'; g.fillRect(x + 8, y, 3, 1);
  g.fillStyle = '#d8cbaa'; g.fillRect(x + 11, y, 9, 6); g.fillStyle = '#b8a888'; g.fillRect(x + 11, y + 2, 9, 1); g.fillRect(x + 11, y + 5, 9, 1);
  const rp = ramp(col), n = Math.round(9 * clamp(f, 0, 1)); if (n) { g.fillStyle = rp.base; g.fillRect(x + 11, y, n, 6); g.fillStyle = rp.hi; g.fillRect(x + 11, y, n, 1); g.fillStyle = rp.sh; g.fillRect(x + 11, y + 5, n, 1); }
  g.fillStyle = INK; g.fillRect(x + 20, y, 1, 6); g.fillRect(x + 11, y - 1, 9, 1); g.fillRect(x + 11, y + 6, 9, 1);
  if (f >= 1) { const k = (t >> 2) & 3; g.fillStyle = k < 2 ? '#fff3c0' : rp.hi; g.fillRect(x + 21, y - 2 + k, 1, 1); g.fillRect(x + 22 + (k & 1), y + 1, 1, 1); g.fillRect(x + 19, y + 6 + (k >> 1), 1, 1); }
}
function paintBar(x, y, w, h, f, col) { g.fillStyle = INK; g.fillRect(x, y, w, h); g.fillStyle = PAPER2; g.fillRect(x + 1, y + 1, w - 2, h - 2); const n = Math.round((w - 2) * clamp(f, 0, 1)); if (n) { g.fillStyle = ramp(col).base; g.fillRect(x + 1, y + 1, n, h - 2); g.fillStyle = ramp(col).hi; g.fillRect(x + 1, y + 1, n, 1); } }
function swatch(x, y, col, dim) { g.fillStyle = INK; g.fillRect(x, y, 7, 7); g.fillStyle = dim ? '#b8b0a0' : ramp(col).base; g.fillRect(x + 1, y + 1, 5, 5); if (!dim) { g.fillStyle = ramp(col).hi; g.fillRect(x + 1, y + 1, 2, 1); } }
// letrero superior como pincelada del color de la acción
function banner(s, col, y = 4) {
  g.font = FONT; const w = g.measureText(s).width + 20, x0 = (W - w) / 2 | 0; pstroke(x0, y + 6, x0 + w, y + 6, 13, ramp(col).sh, 1, 0, true); pstroke(x0 + 3, y + 5, x0 + w - 3, y + 5, 11, col, 1, 0, true);
  const light = rgbHsl(...hexRgb(col))[2] > .6; txt(s, x0 + 10, y + 2, light ? INK : '#f4f0ea', light ? null : '#14121c');
}
function drawBattleUI() {
  const y0 = 128; win(0, y0, W, H - y0); g.fillStyle = INK; g.fillRect(100, y0 + 4, 1, H - y0 - 8);
  // ---- paleta de estado: brocha ATB · nombre · HP · MP
  B.party.forEach((u, i) => {
    const y = y0 + 5 + i * 15, active = B.menu && B.menu.unit === u, col = C(u.color), nm = u.alive ? ramp(col).sh : INK3;
    if (active) { g.globalAlpha = .16; pstroke(104, y + 6, 314, y + 6, 12, col, 1, 0, true); g.globalAlpha = 1; }
    atbBrush(104, y + 2, u.alive ? u.atb / 100 : 0, col, B.t);
    ui(u.name, 130, y, nm);
    ui('HP', 184, y, INK2); ui(String(u.hp).padStart(3), 202, y, u.hp <= 0 ? INK3 : u.hp < u.maxhp * .25 ? C('rojo') : INK); paintBar(184, y + 9, 42, 4, u.hp / u.maxhp, col);
    ui('MP', 236, y, INK2); ui(String(u.mp).padStart(2), 254, y, INK); paintBar(236, y + 9, 42, 4, u.mp / u.maxmp, desat(col, .5, .15));
    if (u.status.tiznado) { g.fillStyle = INK; g.fillRect(292, y + 2, 6, 3); } if (u.status.lento) ui('z', 300, y, C('violeta'));
  });
  const m = B.menu; if (!m) { ui('...', 8, y0 + 6, INK3); return; }
  const u = m.unit, ucol = C(u.color);
  if (m.level === 'cmd' || m.level === 'target' && m.pending.type === 'attack') {
    // ---- bandeja de herramientas
    const entries = [[u.data.weapon, 'Atacar'], ['tech', 'Tech'], ['item', 'Objeto']];
    entries.forEach(([ic, label], i) => { const y = y0 + 5 + i * 15, sel = m.level === 'cmd' && m.idx === i; if (sel) { g.globalAlpha = .2; pstroke(6, y + 6, 96, y + 6, 12, ucol, 1, 0, true); g.globalAlpha = 1; dropCursor(2, y + 2, ucol); } g.drawImage(iconSprite(ic, ucol), 14, y); ui(label, 30, y + 2, sel ? INK : INK2); });
  } else {
    const L = m.list, sel = m.level === 'target' ? L.findIndex(e => e.id === (m.pending.tech ? m.pending.tech.id : m.pending.item)) : m.idx;
    const top = clamp(sel - 1, 0, Math.max(0, L.length - 3));
    if (!L.length) ui('Nada', 14, y0 + 6, INK3);
    L.slice(top, top + 3).forEach((e, k) => {
      const i = top + k, y = y0 + 5 + k * 15; if (i === sel) { g.globalAlpha = .2; pstroke(6, y + 6, 96, y + 6, 12, ucol, 1, 0, true); g.globalAlpha = 1; dropCursor(2, y + 2, ucol); }
      if (m.level === 'tech' || m.pending && m.pending.tech) {
        swatch(12, y + 2, C(e.t.color), !e.avail); if (e.combo) { g.fillStyle = e.avail ? INK : INK3; g.fillRect(20, y + 1, 3, 1); g.fillRect(21, y, 1, 3); }
        ui(e.t.name, 26, y + 2, e.avail ? INK : INK3);
      } else { g.drawImage(iconSprite('item', e.it.kind === 'mp' ? C('azul') : e.it.kind === 'heal' ? C('verde') : '#e86a8a'), 12, y); ui(e.it.short || e.it.name, 28, y + 2, INK); ui('x' + e.n, 82, y + 2, INK2); }
    });
    if (L.length > 3) { ui(top > 0 ? '▲' : ' ', 90, y0 + 2, INK2); ui(top + 3 < L.length ? '▼' : ' ', 90, H - 10, INK2); }
    if (m.level === 'tech' && L[sel]) { const e = L[sel]; const head = e.t.name + ' · ' + e.cost + ' MP' + (e.combo ? ' · con ' + e.users.filter(x => x !== u).map(x => x.name).join(' y ') : ''); win(0, y0 - 27, W, 25); e.users.forEach((us, j) => swatch(6 + j * 5, y0 - 22, C(us.color))); if (e.combo) { ui('=', 8 + e.users.length * 5, y0 - 23, INK2); swatch(18 + e.users.length * 5, y0 - 22, C(e.t.color)); } ui(head, e.combo ? 30 + e.users.length * 5 : 16, y0 - 23, e.avail ? ramp(C(e.t.color)).sh : INK3); ui(e.t.desc.slice(0, 38), 6, y0 - 13, e.avail ? INK : INK3); if (!e.avail) ui(!e.ready ? '(compañero no listo)' : '(sin MP)', W - 168, y0 - 23, C('rojo')); }
    if (m.level === 'item' && L[sel]) { win(0, y0 - 16, W, 14); ui(L[sel].it.desc, 6, y0 - 12, INK); }
  }
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
