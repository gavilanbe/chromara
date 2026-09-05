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
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', z: 'ok', Enter: 'ok', ' ': 'ok', x: 'back', Escape: 'back', Tab: 'swap', c: 'ring', F1: 'debug' };
addEventListener('keydown', e => {
  if (e.key === 'Tab' && (Game.state === 'cover' || Game.state === 'title')) return;
  const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  if (!k) return;
  e.preventDefault();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  Audio.init();
});
addEventListener('keyup', e => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
let ANYKEY = false; addEventListener('keydown', e => { if (e.repeat) return; ANYKEY = true; Audio.init(); }); // cualquier tecla (portada)
const hit = k => { const v = pressed[k]; pressed[k] = false; return !!v; };

addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm' && !e.repeat) {
    Audio.init(); Audio.muted = !Audio.muted;
    if (Audio.master) Audio.master.gain.setTargetAtTime(Audio.muted ? 0 : .55, Audio.ctx.currentTime, .025);
    document.getElementById('hint').textContent = 'Flechas/WASD mover · Z/Enter confirmar · X/Esc atrás · Enter: menú · M ' + (Audio.muted ? 'activar sonido' : 'silenciar') + ' · F1 debug';
  }
});
// Pause audio with the tab and release held keys, avoiding a hidden ambient loop.
document.addEventListener('visibilitychange', () => {
  for (const k in keys) keys[k] = false;
  if (!Audio.ctx) return;
  if (document.hidden) Audio.ctx.suspend().catch(() => {});
  else Audio.ctx.resume().catch(() => {});
});

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
// 1. Patrones de emergencia (el motor de audio vive en audio.js)
// =====================================================================

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
          rock: '#8a8a90', rock2: '#6e6e76', rock3: '#a3a3a9', rockOut: '#454550',
          hatch: '#66685a', crayon: '#8e9a78', wood: '#a08a6a', wood2: '#6e5a42', wood3: '#c9b48e', ferrule: '#9a9aa8', ferrule2: '#5e5e6c', ferruleHi: '#dcdce6', bristle: '#7c8a74', bristle2: '#5c6a56', bristleHi: '#94a08c', tip: '#4a5446', ruler: '#d8cba6', ruler2: '#a8987a', rulerInk: '#3a3648', eraser: '#b8b0b8', eraser2: '#8c8490', eraserHi: '#d8d2d8', wash: '#7c98aa', washDk: '#5a7488', washHi: '#9ab4c2', ripple: '#4e6678' },
  vivo: { grass: '#5fb64a', grass2: '#4fa23c', grassHi: '#7ecb60', grassDk: '#3d8a2f', flower: '#fbf6ff', flower2: '#f0578a',
          ink: '#5fb64a', ink2: '#4fa23c', inkHi: '#7ecb60', inkDk: '#3d8a2f',
          water: '#3a8fe0', water2: '#62b0f2', waterDk: '#2d76c2', foam: '#c8ecff', bank: '#6e5230', bank2: '#cfae70',
          path: '#e8cf8a', path2: '#d9bd74', path3: '#f5e3aa', plank: '#b98450', plank2: '#865a2e', plank3: '#d8a66c',
          tree: '#2f9a48', tree2: '#227a38', treeHi: '#62c463', treeOut: '#0f4a1c', trunk: '#8a5a34', trunk2: '#59371d',
          rock: '#a8a4b8', rock2: '#7c7890', rock3: '#cbc7d8', rockOut: '#454060',
          hatch: '#3d8a2f', crayon: '#8ad66a', wood: '#c9a06a', wood2: '#8a5a34', wood3: '#e8cf9a', ferrule: '#c9c4d4', ferrule2: '#6a6480', ferruleHi: '#f4f0ea', bristle: '#4faf4a', bristle2: '#2f8a38', bristleHi: '#7ecb60', tip: '#227a38', ruler: '#f2e2b0', ruler2: '#c9a878', rulerInk: '#2a2438', eraser: '#f0a0b8', eraser2: '#c06a88', eraserHi: '#fbd0dc', wash: '#4a9ce6', washDk: '#2f78c4', washHi: '#8ac6f4', ripple: '#1f5a9a' },
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

function drawGrassTile(x, p, pal, kind, vr) { // la página: fondo de papel-hierba con trazos de lápiz (hatch), rayas de cera y garabatos
  const rnd = seeded(vr * 97 + kind.charCodeAt(0) * 7);
  x.fillStyle = kind === 'T' ? p.grass2 : p.grass; x.fillRect(0, 0, 16, 16);
  for (let i = 0; i < (kind === 'T' ? 7 : 4); i++) { const hx = rnd() * 14 | 0, hy = rnd() * 14 | 0, L = 2 + (rnd() * 2 | 0); x.fillStyle = kind === 'T' ? p.grassDk : p.hatch; for (let k = 0; k < L; k++) x.fillRect(hx + k, hy + L - 1 - k, 1, 1); } // rayitas diagonales de lápiz
  for (let i = 0; i < 2; i++) { x.fillStyle = p.crayon; x.fillRect(rnd() * 12 | 0, rnd() * 16 | 0, 2 + (rnd() * 3 | 0), 1); } // vetas de cera
  if (kind === 'T') return;
  if (kind === '.') {
    if (vr === 3 || vr === 9) tuft(x, p, 3 + rnd() * 8 | 0, 3 + rnd() * 8 | 0);
    else if (vr === 6) { tuft(x, p, 2, 3); tuft(x, p, 9, 9); }
    else if (vr === 12 || (pal === 'vivo' && vr === 14)) flower(x, p, 4 + rnd() * 6 | 0, 3 + rnd() * 6 | 0, vr === 14);
    else if (vr === 15) { const cx = 5 + (rnd() * 6 | 0), cy = 5 + (rnd() * 6 | 0); x.fillStyle = p.hatch; x.fillRect(cx - 1, cy, 3, 1); x.fillRect(cx, cy - 1, 1, 3); x.fillRect(cx - 2, cy - 2, 1, 1); x.fillRect(cx + 2, cy + 2, 1, 1); } // estrellita garabateada
    else if (vr === 10) { x.fillStyle = pal === 'vivo' ? '#e23c3c' : '#8c8490'; x.fillRect(6, 6, 3, 3); x.fillStyle = '#f4f0ea'; x.fillRect(6, 6, 1, 1); x.fillStyle = p.ferrule2; x.fillRect(7, 9, 1, 3); } // chincheta
  } else if (kind === 'r') { // goma de borrar bicolor
    px(x, p.grassDk, 3, 13, 11, 1); px(x, p.grassDk, 4, 14, 10, 1);
    px(x, p.rockOut, 2, 5, 12, 9); px(x, p.eraser, 3, 6, 6, 7); px(x, p.eraserHi, 3, 6, 6, 1); px(x, p.eraserHi, 3, 6, 1, 6); px(x, p.eraser2, 3, 12, 6, 1);
    px(x, p.ferrule, 9, 6, 4, 7); px(x, p.ferruleHi, 9, 6, 4, 1); px(x, p.ferrule2, 9, 12, 4, 1); px(x, p.ferrule2, 12, 7, 1, 5); px(x, p.rockOut, 8, 6, 1, 7);
  } else if (kind === 'x') stain(x, '#2a2438', '#3e3852');
}
function drawWaterTile(x, p, m, vr, frame) { // aguada: azul lavado con charcos más claros que se mueven, borde oscuro que florece y un hilo de papel en el canto; ondas a lápiz
  const rnd = seeded(vr * 53 + 11), sh = [0, 1, 2, 1][frame];
  x.fillStyle = p.wash; x.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 3; i++) { const cx = (rnd() * 16 | 0) + sh, cy = rnd() * 16 | 0, r = 2 + (rnd() * 3 | 0); x.fillStyle = p.washHi; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && ((cx + dx + cy + dy) & 1)) x.fillRect((cx + dx) & 15, (cy + dy) & 15, 1, 1); } // charcos claros (trama)
  const dashes = [[2, 4, 4], [10, 10, 3], [6, 13, 2]]; dashes.forEach(([dx, dy, len], i) => { const s2 = i & 1 ? -sh : sh; x.fillStyle = p.ripple; for (let k = 0; k < len; k++) x.fillRect((dx + s2 + k) & 15, dy, 1, 1); });
  const has = b => m & b, bloom = () => rnd() < .35 ? 2 : 1;
  if (!has(1)) { for (let i = 0; i < 16; i++) { const d = bloom(); px(x, p.washDk, i, 0, 1, d); if (rnd() < .5) px(x, p.grass, i, 0); } px(x, p.washDk, 0, 1, 16, 1); }
  if (!has(4)) { for (let i = 0; i < 16; i++) { const d = bloom(); px(x, p.washDk, i, 16 - d, 1, d); if (rnd() < .5) px(x, p.grass, i, 15); } }
  if (!has(8)) { for (let i = 0; i < 16; i++) { const d = bloom(); px(x, p.washDk, 0, i, d, 1); if (rnd() < .5) px(x, p.grass, 0, i); } }
  if (!has(2)) { for (let i = 0; i < 16; i++) { const d = bloom(); px(x, p.washDk, 16 - d, i, d, 1); if (rnd() < .5) px(x, p.grass, 15, i); } }
  if (has(1) && has(2) && !has(16)) px(x, p.washDk, 14, 0, 2, 2); if (has(4) && has(2) && !has(32)) px(x, p.washDk, 14, 14, 2, 2); if (has(4) && has(8) && !has(64)) px(x, p.washDk, 0, 14, 2, 2); if (has(1) && has(8) && !has(128)) px(x, p.washDk, 0, 0, 2, 2);
}
function drawRoadTile(x, p, pm, wm, vr) { // brochazo de ocre: vetas de cerdas en la dirección del camino y borde irregular donde asoma el papel. Sobre el agua: una regla.
  const rnd = seeded(vr * 31 + 3);
  if (wm) { // regla: canto de madera clara, marcas de centímetros en tinta
    const horiz = (wm & 1 && wm & 4) ? true : (wm & 8 && wm & 2) ? false : !!(wm & 10);
    x.fillStyle = p.ruler; x.fillRect(0, 0, 16, 16);
    if (horiz) { px(x, p.ruler2, 0, 0, 16, 2); px(x, p.ruler2, 0, 14, 16, 2); px(x, p.rulerInk, 0, 0, 16, 1); px(x, p.rulerInk, 0, 15, 16, 1); for (let i = 0; i < 16; i += 2) { px(x, p.rulerInk, i, 2, 1, i % 8 === 0 ? 4 : i % 4 === 0 ? 3 : 2); px(x, p.rulerInk, i, 14 - (i % 8 === 0 ? 4 : i % 4 === 0 ? 3 : 2), 1, i % 8 === 0 ? 4 : i % 4 === 0 ? 3 : 2); } px(x, p.rulerInk, 7, 8, 2, 1); px(x, p.rulerInk, 8, 7, 1, 3); }
    else { px(x, p.ruler2, 0, 0, 2, 16); px(x, p.ruler2, 14, 0, 2, 16); px(x, p.rulerInk, 0, 0, 1, 16); px(x, p.rulerInk, 15, 0, 1, 16); for (let i = 0; i < 16; i += 2) { const L = i % 8 === 0 ? 4 : i % 4 === 0 ? 3 : 2; px(x, p.rulerInk, 2, i, L, 1); px(x, p.rulerInk, 14 - L, i, L, 1); } px(x, p.rulerInk, 8, 7, 1, 2); px(x, p.rulerInk, 7, 8, 3, 1); }
    return;
  }
  x.fillStyle = p.path; x.fillRect(0, 0, 16, 16);
  const ns = !!(pm & 1 || pm & 4), ew = !!(pm & 2 || pm & 8), vert = ns && !ew, hor = ew && !ns;
  for (let i = 0; i < 6; i++) { const a = rnd() * 16 | 0, b2 = rnd() * 16 | 0, L = 3 + (rnd() * 6 | 0); x.fillStyle = i % 3 === 0 ? p.path3 : p.path2; if (vert) x.fillRect(a, b2, 1, L); else if (hor) x.fillRect(b2, a, L, 1); else x.fillRect(a, b2, 2, 1); } // vetas de las cerdas
  const edge = (bit, fn) => { if (pm & bit) return; for (let i = 0; i < 16; i++) { const d = rnd() < .45 ? 2 : rnd() < .2 ? 3 : 1; fn(i, d); } };
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
// Bosque de utensilios 16×24: pinceles clavados (mechón de cerdas cargado de color arriba, mango de madera) y lápices (cuerpo de color, cono de madera, mina). Los contiguos juntan sus mechones en setos.
const TREE_COLS = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'];
function treeSprite(pal, mL, mR, vr) {
  return cached(`tree|${pal}|${mL ? 1 : 0}|${mR ? 1 : 0}|${vr}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d');
    const tint = pal === 'vivo' ? ramp(C(TREE_COLS[vr % 6])) : null, pencil = vr % 3 === 2;
    if (pencil) { // lápiz: mina, cono de madera, cuerpo facetado, goma abajo
      const body = tint ? tint.base : p.rock2, bodyHi = tint ? tint.hi : p.rock3, bodyDk = tint ? tint.sh : p.rockOut;
      px(x, '#14121c', 7, 0, 2, 2); px(x, p.wood2, 6, 2, 4, 1); px(x, p.wood, 5, 3, 6, 2); px(x, p.wood3, 6, 3, 2, 1); px(x, p.wood2, 5, 4, 1, 1); px(x, p.wood2, 10, 4, 1, 1);
      px(x, '#2a2438', 4, 5, 8, 17); px(x, body, 5, 5, 6, 16); px(x, bodyHi, 5, 5, 2, 16); px(x, bodyDk, 9, 5, 2, 16); px(x, bodyHi, 6, 6, 1, 14);
      px(x, p.ferrule, 5, 19, 6, 2); px(x, p.ferruleHi, 5, 19, 6, 1); px(x, '#2a2438', 4, 21, 8, 1); px(x, '#e89aa8', 5, 21, 6, 2); px(x, '#b86a7c', 5, 23, 6, 1);
      return c;
    }
    // pincel: mango, virola, mechón redondo (fusionado a los lados si hay vecinos) con la punta cargada de color
    const brush = tint ? tint : { base: p.bristle, hi: p.bristleHi, sh: p.bristle2, dk: p.tip, out: '#2a2438' };
    px(x, '#2a2438', 6, 13, 4, 11); px(x, p.wood2, 7, 13, 3, 11); px(x, p.wood, 7, 13, 2, 10); px(x, p.wood3, 7, 14, 1, 8);
    px(x, p.ferrule2, 5, 11, 6, 3); px(x, p.ferrule, 6, 11, 4, 2); px(x, p.ferruleHi, 6, 11, 4, 1);
    const ph1 = vr * 1.3, ph2 = vr * 2.1, ell = (X, Y) => { const u = (X + .5 - 8) / 7.4, w = (Y + .5 - 6) / 6.2; return u * u + w * w <= 1 + 0.07 * Math.sin(X * 2.1 + ph1) * Math.sin(Y * 1.7 + ph2); };
    const inside = (X, Y) => { if (Y < 0 || Y > 12) return false; if (X < 0) return mL && (ell(X + 16, Y) || Y >= 2 && Y <= 10); if (X > 15) return mR && (ell(X - 16, Y) || Y >= 2 && Y <= 10); if (mL && X < 8 && (ell(X + 16, Y) || Y >= 2 && Y <= 10)) return true; if (mR && X >= 8 && (ell(X - 16, Y) || Y >= 2 && Y <= 10)) return true; return ell(X, Y); };
    for (let Y = 0; Y <= 12; Y++) for (let X = 0; X < 16; X++) {
      if (!inside(X, Y)) continue;
      if (!inside(X - 1, Y) || !inside(X + 1, Y) || !inside(X, Y - 1) || !inside(X, Y + 1)) { px(x, brush.out, X, Y); continue; }
      const streak = (X + vr) % 3 === 0; // cerdas: vetas verticales
      px(x, Y < 3 ? brush.hi : Y > 9 ? brush.dk : streak ? brush.sh : brush.base, X, Y);
    }
    if (!tint) { px(x, p.bristleHi, 6, 2, 2, 1); } else { px(x, '#ffffff', 6, 2, 2, 1); px(x, tint.hi, 5, 3, 1, 1); }
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
    else if (ch === 'V') { MAP.jar = { x, y }; ch = '.'; }
    else if (ch === 'S') { (MAP.signs = MAP.signs || []).push({ x, y, lines: DATA.signs[x + ',' + y] || ['Post-it'] }); ch = '.'; }
    else if ('HRGWEw'.includes(ch)) { const P = MAP.pz = MAP.pz || { river: [], shelf: [], torn: [] }; if (ch === 'H') P.torn.push([x, y]); else if (ch === 'R') P.river.push([x, y]); else if (ch === 'G') P.block0 = [x, y]; else if (ch === 'W') P.shelf.push([x, y]); else if (ch === 'E') P.estuche = [x, y]; else if (ch === 'w') P.seed = [x, y]; ch = ch === 'R' ? ',' : '.'; }
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
const PUZ0 = () => ({ block: MAP.pz ? [...MAP.pz.block0] : [0, 0], painted: 0, strokes: [], sun: 0, sunBend: 0, ladder: 0, revealed: false, reveal: 0, opened: false });
const Game = { state: 'cover', owned: {}, puzzle: null, t: 0, pigmento: 0, palette: 'gris', inventory: { ...DATA.inventory }, defeated: new Set(), met: new Set(), bossDown: false, intro: true, debug: false }; // met: grupos de enemigos ya vistos (transición corta)
function effStats(p) { // base + arma + accesorio
  const wpn = DATA.weapons[p.weapon] || {}, acc = DATA.accessories[p.acc] || {};
  const s = { hp: p.hp, mp: p.mp, atk: p.atk, def: p.def, spd: p.spd };
  for (const k in s) s[k] += (wpn[k] || 0) + (acc[k] || 0);
  return s;
}
// Estado persistente del grupo (HP/MP actuales entre batallas)
const Party = DATA.party.map(p => { const s = effStats(p); return { ...p, cur: { hp: s.hp, mp: s.mp } }; });
function setState(s) {
  Game.state = s; Game.t = 0;
  document.getElementById('hint').hidden = s === 'cover' || s === 'title';
  if (s !== 'title') titleStartButton.style.display = 'none';
}

// =====================================================================
// 4. Mapa del mundo (overworld)
// =====================================================================
const OW = { x: 0, y: 0, cam: { x: 0, y: 0 }, hist: [], moving: false, t: 0, msg: null, menu: null, foes: [] };
function initOverworld() {
  if (!Game.puzzle) Game.puzzle = PUZ0();
  OW.x = MAP.spawn[0] * TILE + 8; OW.y = MAP.spawn[1] * TILE + 12; OW.hist = []; OW.puddles = []; OW.dust = []; OW.vx = OW.vy = 0; OW.bob = 0; OW.dir = 'down'; OW.landT = 0; OW.landZ = null; OW.landed = [0, 0, 0]; OW.jar = { bubbles: [], tint: [], hidden: [false, false, false], jump: [null, null, null], pos: [], wob: 0, glow: 0, cd: 0 }; OW.heal = null; OW.floats = []; OW.cam.x = clamp(OW.x - W / 2, 0, MAP.w * TILE - W); OW.cam.y = clamp(OW.y - H / 2, 0, MAP.h * TILE - H);
  OW.hideFoe = null; OW.scare = null; OW.foes = MAP.spots.map(s => ({ key: s.key, hx: s.x * TILE + 8, hy: s.y * TILE + 12, x: s.x * TILE + 8, y: s.y * TILE + 12, tx: 0, ty: 0, t: RI(0, 60), enemies: DATA.encounters[s.key], boss: s.key === 'B', seed: s.x * 7 + s.y }));
  if (Game.intro) OW.msg = { lines: DATA.texts.intro, t: 0 };
  OW.msgWait = true;
}
function pzSolidTile(tx, ty) { // objetos del puzle que bloquean el paso
  const P = MAP.pz, Z = Game.puzzle; if (!P || !Z) return false;
  if (P.torn.some(([x, y]) => x === tx && y === ty)) return Z.painted < 1; // página rota: agujero hasta que se pinta
  if (Z.block[0] === tx && Z.block[1] === ty) return true;
  if (P.estuche && tx === P.estuche[0] && ty === P.estuche[1]) return true;
  if (P.shelf.some(([x, y]) => x === tx && y === ty)) return !(Z.ladder >= 1 && P.ladderAt && tx === P.ladderAt[0] && ty === P.ladderAt[1]);
  if (P.river.some(([x, y]) => x === tx && y === ty)) return !(Z.sunBend >= 1 && P.seed && ty === P.seed[1]); // el girasol doblado hace de puente en su fila
  return false;
}
function walkable(px, py) { // hitbox pies 8×6
  for (const [dx, dy] of [[-4, -1], [3, -1], [-4, 3], [3, 3]]) if (pzSolidTile((px + dx) / TILE | 0, (py + dy) / TILE | 0)) return false;
  if (MAP.jar) { const jx = MAP.jar.x * TILE, jy = MAP.jar.y * TILE; if (px > jx - 4 && px < jx + 36 && py > jy - 2 && py < jy + 30) return false; }
  for (const [dx, dy] of [[-4, -1], [3, -1], [-4, 3], [3, 3]]) if (solid(tileAt((px + dx) / TILE | 0, (py + dy) / TILE | 0))) return false;
  return true;
}
// A room change settles for 24 frames before switching; crossing the doorway
// cannot repeatedly restart the cues. Returning from combat resumes the phrase.
function worldCue() {
  if (Game.palette === 'vivo') return 'restored';
  return OW.x >= 28 * TILE && OW.y >= 16 * TILE && OW.y < 25 * TILE ? 'atelier' : 'map';
}
function updateWorldMusic() {
  const cue = worldCue();
  if (OW.musicWant !== cue) { OW.musicWant = cue; OW.musicWait = 0; Audio.prepare(cue); }
  if (++OW.musicWait >= 24 && Audio.cur !== cue) Audio.play(cue, { resume: true, fade: .65 });
}
function updateOverworld() {
  OW.t++;
  if (!OW.landT) updateWorldMusic();
  if (OW.landT > 0) { // entrada: caen del cielo y salpican, uno tras otro
    if (OW.landT > 900) return; OW.landT--; OW.landZ = OW.landZ || [0, 0, 0];
    Party.forEach((p, i) => { const k = clamp((48 - OW.landT - i * 6) / 26, 0, 1); OW.landZ[i] = k >= 1 ? 0 : 120 * (1 - k * k); if (k >= 1 && !OW.landed[i]) { OW.landed[i] = 1; Audio.sfx('plop', { semi: [0, 4, 7][i] }); for (let j = 0; j < 8; j++) OW.dust.push({ x: OW.x - i * 12 + R(-4, 4), y: OW.y + 1, vx: R(-1.2, 1.2), vy: -R(.5, 1.6), col: C(p.color), t: 0, life: RI(12, 20) }); } });
    if (OW.landT === 0) { OW.landZ = null; Audio.play(worldCue(), { resume: true }); Audio.sfx('page', { vol: .4 }); }
    for (const d of OW.dust) { d.x += d.vx; d.y += d.vy; d.vy += .12; d.t++; } OW.dust = OW.dust.filter(d => d.t < d.life);
    return;
  }
  if (OW.msg) { if (OW.landT > 0) return; OW.msg.t++; if (OW.msg.t > 20 && (hit('ok') || hit('back'))) { OW.msg = null; Audio.sfx('page'); Game.intro = false; if (OW.msg === null && Game.bossDown && !Game.ended) Game.ended = true; } return; }
  const J = OW.jar; for (const b of J.bubbles) { b.y += b.vy; b.t++; } J.bubbles = J.bubbles.filter(b => b.t < 40 && b.y > MAP.jar.y * TILE + 12); if (OW.t % 40 === 0 && !OW.heal) J.bubbles.push({ x: MAP.jar.x * TILE + 16 + R(-6, 6), y: MAP.jar.y * TILE + 28, vy: -.35, r: 1, t: 0 });
  for (const f of OW.floats || []) f.t++; OW.floats = (OW.floats || []).filter(f => f.t < 50);
  if (OW.heal) { if (OW.heal.next().done) OW.heal = null; for (const d of OW.dust) { d.x += d.vx; d.y += d.vy; d.vy += .12; d.t++; } OW.dust = OW.dust.filter(d => d.t < d.life); return; }
  for (const sg of MAP.signs || []) { const d = Math.hypot(OW.x - sg.x * TILE - 8, OW.y - sg.y * TILE - 8); if (d < 14 && !sg.read) { sg.read = true; OW.msg = { lines: sg.lines, t: 0 }; Audio.sfx('page'); return; } if (d > 24) sg.read = false; }
  if (OW.hint > 0) OW.hint--;
  if (MAP.jar) { const jx = MAP.jar.x * TILE + 16, jy = MAP.jar.y * TILE + 34, d = Math.hypot(OW.x - jx, OW.y - jy); if (d > 40) J.cd = 0; if (d < 16 && !J.cd) { J.pos = Party.map((p, i) => { const h = OW.hist[Math.min(OW.hist.length - 1, i * 12)]; return i === 0 ? [OW.x, OW.y] : (h ? [h[0], h[1]] : [OW.x - i * 12, OW.y]); }); OW.vx = OW.vy = 0; OW.moving = false; OW.heal = healGen(); return; } }
  if (OW.act) { if (OW.act.next().done) OW.act = null; for (const d of OW.dust) { d.x += d.vx; d.y += d.vy; d.vy += .12; d.t++; } OW.dust = OW.dust.filter(d => d.t < d.life); return; }
  if (OW.ring) { updateRing(); return; }
  if (OW.menu) { updateMenu(); return; }
  if (hit('ok')) { if (MAP.pz && MAP.pz.estuche && !Game.puzzle.opened && Math.hypot(OW.x - MAP.pz.estuche[0] * TILE - 8, OW.y - MAP.pz.estuche[1] * TILE - 8) < 26) { OW.act = openEstucheGen(); return; } openMenu(); return; }
  if (hit('ring')) { openRing(); return; }
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
    if (d < 56 && !f.seen) { f.seen = true; f.alert = 30; if (f.boss) { Audio.sfx('impact_sub', { vol: .35 }); OW.shake = 2; } else Audio.sfx('detect'); } else if (d > 96) f.seen = false; // la jefa no grita "!": el suelo retumba
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
// ---- El vaso de agua del pintor (cura): tarro de cristal con agua donde se aclaran los pinceles. 32×36, ocupa 2×2 tiles.
function jarSprite(pal) {
  return cached(`jar|${pal}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 32; c.height = 36; const x = c.getContext('2d');
    const G = '#c9c4d4', G2 = '#8c8ab0', GH = '#ffffff';
    px(x, G2, 5, 4, 22, 30); px(x, G, 6, 5, 20, 28); // cristal
    px(x, p.wash, 7, 14, 18, 18); px(x, p.washDk, 7, 30, 18, 2); px(x, p.washHi, 8, 14, 16, 1); px(x, p.washHi, 8, 16, 3, 1); px(x, p.washHi, 8, 18, 2, 6); // agua
    px(x, G2, 4, 2, 24, 3); px(x, G, 5, 2, 22, 1); px(x, GH, 6, 3, 8, 1); px(x, G2, 5, 33, 22, 1); // boca y base
    px(x, GH, 7, 6, 1, 26); px(x, GH, 8, 6, 1, 4); px(x, 'rgba(255,255,255,.35)', 22, 8, 2, 22); // reflejos
    px(x, p.wood2, 20, -2, 3, 20); px(x, p.wood, 20, 0, 2, 16); px(x, p.wood3, 20, 1, 1, 8); px(x, p.ferrule, 19, 16, 5, 3); px(x, p.bristle, 19, 19, 5, 6); px(x, p.bristle2, 19, 23, 5, 2); // pincel apoyado dentro
    px(x, G2, 5, 4, 1, 30); px(x, G2, 26, 4, 1, 30);
    return c;
  });
}
function signSprite() { // post-it amarillo con chincheta y garabato
  return cached('sign', () => { const c = document.createElement('canvas'); c.width = 14; c.height = 16; const x = c.getContext('2d');
    px(x, '#2a2438', 2, 4, 11, 11); px(x, '#f2d96a', 1, 3, 11, 11); px(x, '#fbe98a', 1, 3, 11, 1); px(x, '#d9b93a', 1, 13, 11, 1); px(x, '#d9b93a', 11, 4, 1, 10);
    px(x, '#6a6480', 3, 6, 6, 1); px(x, '#6a6480', 3, 8, 7, 1); px(x, '#6a6480', 3, 10, 5, 1); px(x, '#e23c3c', 5, 1, 3, 3); px(x, '#ffffff', 5, 1, 1, 1); px(x, '#6a6480', 6, 4, 1, 2);
    return c; });
}
function* healGen() { // el grupo salta dentro del vaso, el agua se tiñe de sus colores, burbujea, y salen aclarados con HP y MP al máximo
  const J = OW.jar, cx = MAP.jar.x * TILE + 16, top = MAP.jar.y * TILE + 4, bottom = MAP.jar.y * TILE + 32;
  J.tint = []; J.hidden = [false, false, false]; J.wob = 0; OW.floats = OW.floats || [];
  Audio.sfx('page', { vol: .4 });
  for (let i = 0; i < 3; i++) { const p = Party[i], from = J.pos[i]; Audio.sfx('whip', { semi: [0, 4, 7][i], vol: .5 });
    for (let k = 1; k <= 14; k++) { const q = k / 14; J.jump[i] = [lerp(from[0], cx, q), lerp(from[1], top + 8, q), Math.sin(q * Math.PI) * 26 + q * 8]; yield; }
    J.jump[i] = null; J.hidden[i] = true; J.tint.push(C(p.color)); J.wob = 1; Audio.sfx('splash_clean', { semi: [0, 4, 7][i] }); for (let j = 0; j < 8; j++) OW.dust.push({ x: cx + R(-8, 8), y: top + 10, vx: R(-1.2, 1.2), vy: -R(.8, 2), col: C(p.color), t: 0, life: RI(12, 20) }); yield* wait(6); }
  for (let i = 0; i < 70; i++) { if (i % 6 === 0) J.bubbles.push({ x: cx + R(-8, 8), y: bottom - 6, vy: -R(.3, .7), r: RI(1, 2), t: 0 }); if (i % 18 === 0) Audio.sfx('slow_drip', { semi: RI(-4, 8), vol: .4 }); J.wob = Math.max(0, J.wob - .02); if (i === 50) { Audio.sfx('heal_bells'); J.glow = 1; } yield; }
  for (let i = 0; i < 3; i++) { const p = Party[i], to = J.pos[i], s = effStats(p), dh = s.hp - p.cur.hp, dm = s.mp - p.cur.mp; J.hidden[i] = false; Audio.sfx('plop', { semi: [0, 4, 7][i] });
    for (let k = 1; k <= 12; k++) { const q = k / 12; J.jump[i] = [lerp(cx, to[0], q), lerp(top + 8, to[1], q), Math.sin(q * Math.PI) * 24]; yield; }
    J.jump[i] = null; p.cur.hp = s.hp; p.cur.mp = s.mp; Audio.sfx('tinkle', { semi: [0, 4, 7][i] });
    OW.floats.push({ x: to[0], y: to[1] - 14, s: '+' + Math.max(0, dh) + ' HP', col: '#2f9a48', t: 0 }); OW.floats.push({ x: to[0], y: to[1] - 6, s: '+' + Math.max(0, dm) + ' MP', col: C('azul'), t: -8 });
    for (let j = 0; j < 6; j++) OW.dust.push({ x: to[0] + R(-3, 3), y: to[1], vx: R(-.8, .8), vy: -R(.5, 1.2), col: C(p.color), t: 0, life: RI(10, 16) }); yield* wait(4); }
  J.glow = 0; yield* wait(10);
  OW.msg = { lines: ['Aclaráis las gotas en el vaso.', '', '¡HP y MP al máximo!'], t: 0 }; J.cd = 1;
}
// ---- Ruedita de utensilios (la psinergia de Chromara): cada arma da habilidades de campo que se lanzan hacia delante.
// El dueño se adelanta, se concentra (aura y partículas de su color), la herramienta actúa y el escenario cambia.
const FIELD = [
  { id: 'pintar', name: 'Pintar', weapon: 'brocha', mp: 2, desc: 'Repara la página rota' },
  { id: 'empujar', name: 'Empujar', weapon: 'brocha', mp: 0, desc: 'Aparta gomas y trastos' },
  { id: 'trazar', name: 'Trazar', weapon: 'lapiz', mp: 2, desc: 'Dibuja una escalera' },
  { id: 'regar', name: 'Regar', weapon: 'pincel', mp: 2, desc: 'Hace brotar semillas' },
  { id: 'revelar', name: 'Revelar', combo: ['carmin', 'anil'], mp: 3, desc: 'Destapa la tinta invisible' },
];
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function fieldOwner(f) { return f.weapon ? Party.find(p => p.weapon === f.weapon && p.cur.hp > 0) : Party.find(q => q.id === f.combo[0]); }
function fieldOk(f) { if (f.combo) return f.combo.every(id => { const p = Party.find(q => q.id === id); return p && p.cur.hp > 0 && p.cur.mp >= f.mp; }); const o = fieldOwner(f); return !!o && o.cur.mp >= f.mp; }
function openRing() { OW.ring = { idx: 0, t: 0, rot: 0 }; Audio.sfx('book_open', { vol: .6 }); }
function updateRing() {
  const r = OW.ring; r.t++; const n = FIELD.length;
  if (hit('left')) { r.idx = (r.idx + n - 1) % n; r.spin = 8; Audio.sfx('cursor', { semi: r.idx * 2 }); } if (hit('right')) { r.idx = (r.idx + 1) % n; r.spin = 8; Audio.sfx('cursor', { semi: r.idx * 2 }); }
  if (hit('back') || hit('ring')) { OW.ring = null; Audio.sfx('cancel'); return; }
  if (hit('ok') || hit('up')) { const f = FIELD[r.idx]; if (!fieldOk(f)) { Audio.sfx('nope'); r.shake = 8; OW.msg = { lines: [f.name + ': ' + (f.combo ? 'hacen falta Carmín y Añil con MP.' : fieldOwner(f) ? 'sin pigmento suficiente.' : 'nadie lleva ' + DATA.weapons[f.weapon].name.toLowerCase() + '.')], t: 0 }; OW.ring = null; return; } OW.ring = null; Audio.sfx('confirm', { semi: SEMI[fieldOwner(f).id] || 0 }); OW.act = fieldGen(f); }
}
function drawRing() { // rueda de pegatinas sobre el líder: la elegida arriba, grande, con la cara del dueño y su nombre en una cinta
  const r = OW.ring, cx = OW.x - Math.round(OW.cam.x), cy = OW.y - Math.round(OW.cam.y) - 4, k = clamp(r.t / 7, 0, 1), e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), n = FIELD.length;
  g.fillStyle = 'rgba(11,9,18,.3)'; g.fillRect(0, 0, W, H);
  r.rot = r.rot == null ? r.idx : r.rot + ((((r.idx - r.rot) % n) + n * 1.5) % n - n / 2) * .3; if (r.spin > 0) r.spin--;
  FIELD.forEach((f, i) => { let rel = ((i - r.rot) % n + n) % n; if (rel > n / 2) rel -= n; const a = -Math.PI / 2 + rel * (Math.PI * 2 / n), rad = 30 * e, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * .6 - 6, sel = i === r.idx, ok = fieldOk(f), owner = fieldOwner(f), col = owner ? C(owner.color) : '#9a90a8', sc = (sel ? 1.35 : .85) * e, shk = sel && r.shake > 0 ? (r.shake-- & 1 ? 1.5 : -1.5) : 0;
    g.save(); g.translate(Math.round(x + shk), Math.round(y)); g.scale(sc, sc); g.rotate(sel ? Math.sin(r.t * .12) * .06 : 0);
    g.fillStyle = 'rgba(11,9,18,.35)'; g.beginPath(); g.arc(1, 2, 10, 0, 6.29); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 10, 0, 6.29); g.fill(); g.fillStyle = ok ? col : '#c9c4d4'; g.beginPath(); g.arc(0, 0, 8.5, 0, 6.29); g.fill(); g.fillStyle = ok ? ramp(col).hi : '#e8e6f0'; g.beginPath(); g.arc(-2, -3, 3, 0, 6.29); g.fill();
    g.globalAlpha = ok ? 1 : .45; g.drawImage(iconSprite(f.weapon || 'tech', col), -6, -6); g.globalAlpha = 1;
    if (owner && ok) { g.save(); g.beginPath(); g.arc(7, 6, 4.5, 0, 6.29); g.clip(); g.fillStyle = ramp(C(owner.color)).base; g.fillRect(2, 1, 10, 10); const m = buildSprite(`${owner.id}_front_mini`, C(owner.color), null, { eyes: 'normal' }); g.drawImage(m, 7 - m.width / 2, 6 - m.height / 2 + 2); g.restore(); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(7, 6, 4.5, 0, 6.29); g.stroke(); }
    g.restore();
    if (sel) { const label = f.name + (owner ? ' · ' + owner.name : ''), w = label.length * 8 + 16; tape(cx - w / 2, cy + 22, w, 14); ui(label, cx - w / 2 + 8, cy + 25, TXT); const d = f.desc + (f.mp ? ' · ' + f.mp + ' MP' : ''); ui(d, W / 2 - d.length * 4, H - 14, TXT2); } });
  ui('◄►', cx - 8, cy + 38, TXT3);
}
// El que lanza se adelanta hacia donde mira, se concentra con un aura de su color y la cámara se acerca un poco
function* castIntro(f, owner, dir) {
  const col = C(owner.color); OW.cast = { p: owner, x: OW.x, y: OW.y, k: 0, col }; const tx = OW.x + dir[0] * 12, ty = OW.y + dir[1] * 8;
  Audio.sfx('charge', { semi: SEMI[owner.id] || 0, vol: .6 });
  for (let i = 1; i <= 10; i++) { const q = i / 10; OW.cast.x = lerp(OW.x, tx, q); OW.cast.y = lerp(OW.y, ty, q); OW.cast.k = q; OW.camNudge = [dir[0] * 10 * q, dir[1] * 6 * q]; yield; }
  for (let i = 0; i < 14; i++) { OW.cast.aura = i / 14; if (i % 2 === 0) { const a = R(0, 6.28), d = 14; OW.dust.push({ x: OW.cast.x + Math.cos(a) * d, y: OW.cast.y + Math.sin(a) * d * .5, vx: -Math.cos(a) * 1.4, vy: -Math.sin(a) * .7 - .3, col, t: 0, life: 10 }); } yield; }
  OW.flash = { col, a: .25 }; Audio.sfx('mix', { vol: .5 });
}
function* castOutro() { for (let i = 1; i <= 8; i++) { const q = 1 - i / 8; OW.cast.x = lerp(OW.x, OW.cast.x, q); OW.cast.y = lerp(OW.y, OW.cast.y, q); OW.cast.aura = 0; OW.camNudge = [OW.camNudge[0] * q, OW.camNudge[1] * q]; yield; } OW.cast = null; OW.camNudge = null; }
function* fieldGen(f) {
  const P = MAP.pz, Z = Game.puzzle, owner = fieldOwner(f), dir = DIRV[OW.dir] || [0, 1], lx = OW.x / TILE | 0, ly = (OW.y + 2) / TILE | 0, say2 = lines => { OW.msg = { lines, t: 0 }; };
  const ahead = n => [lx + dir[0] * n, ly + dir[1] * n];
  if (f.id === 'pintar') { // la brocha grande cae y pinta una banda de su color tres casillas hacia delante; sobre la página rota, la repara
    const cells = [1, 2, 3].map(ahead), torn = cells.filter(([x, y]) => P.torn.some(([a, b]) => a === x && b === y)); if (!torn.length && !cells.some(([x, y]) => P.torn.some(([a, b]) => a === x && b === y))) { say2(['Aquí no hay nada roto que pintar.']); return; }
    owner.cur.mp -= f.mp; yield* castIntro(f, owner, dir); const col = C(owner.color);
    const img = propSprite('brocha', col), st = { k: 0, wz: 40 }, x0 = OW.cast.x + dir[0] * 10, y0 = OW.cast.y + dir[1] * 6, x1 = x0 + dir[0] * 52, y1 = y0 + dir[1] * 52;
    OW.fx = () => { const x = lerp(x0, x1, st.k) - Math.round(OW.cam.x), y = lerp(y0, y1, st.k) - Math.round(OW.cam.y) - st.wz; drawProp(img, x, y, dir[0] ? (dir[0] > 0 ? .9 : -.9) : dir[1] > 0 ? 1.6 : .2, dir[0] < 0 ? -1 : 1, PROP.brocha.tip[0], PROP.brocha.tip[1], .9); };
    Audio.sfx('brush_big'); for (let i = 1; i <= 8; i++) { st.wz = 40 * (1 - i / 8) * (1 - i / 8); yield; } OW.shake = 4; Audio.sfx('brush_sweep');
    const stroke = { x0, y0, x1, y1, col, k: 0, w: 12 }; Z.strokes.push(stroke);
    for (let i = 1; i <= 14; i++) { st.k = i / 14; stroke.k = i / 14; for (let j = 0; j < 2; j++) OW.dust.push({ x: lerp(x0, x1, st.k) + R(-6, 6), y: lerp(y0, y1, st.k) + R(-4, 4), vx: R(-.6, .6), vy: -R(.3, 1), col, t: 0, life: RI(8, 14) }); yield; }
    for (let i = 1; i <= 6; i++) { st.wz = i * 6; yield; } OW.fx = null;
    Z.painted = 1; Audio.sfx('page', { vol: .5 }); Audio.sfx('tinkle', { semi: 2, when: .1 }); yield* castOutro(); say2(['La pincelada tapa la rotura:', 'ya se puede pisar.']); return;
  }
  if (f.id === 'empujar') { // el mango de la brocha empuja la goma: se desliza una casilla
    const bx = Z.block[0], by = Z.block[1]; if (bx - lx !== dir[0] || by - ly !== dir[1]) { say2(['No hay nada que empujar por ahí.']); return; }
    const tx = bx + dir[0], ty = by + dir[1]; if (solid(tileAt(tx, ty)) || pzSolidTile(tx, ty)) { Audio.sfx('nope'); say2(['La goma no pasa por ahí.']); return; }
    yield* castIntro(f, owner, dir); const img = propSprite('brocha', C(owner.color)), st = { k: 0 };
    OW.fx = () => { const x = OW.cast.x - Math.round(OW.cam.x) + dir[0] * (6 + st.k * 10), y = OW.cast.y - Math.round(OW.cam.y) - 6 + dir[1] * (4 + st.k * 8); drawProp(img, x, y, dir[0] ? 0 : dir[1] > 0 ? 1.57 : -1.57, dir[0] < 0 ? -1 : 1, 4, 11, .7); };
    for (let i = 1; i <= 6; i++) { st.k = i / 6; yield; } Audio.sfx('rub'); Z.push = { from: [bx, by], to: [tx, ty], k: 0 };
    for (let i = 1; i <= 12; i++) { Z.push.k = i / 12; if (i % 3 === 0) for (let j = 0; j < 3; j++) OW.dust.push({ x: bx * TILE + 8 + R(-6, 6), y: by * TILE + 14, vx: -dir[0] * R(.3, 1), vy: -R(.2, .6), col: '#e86a8a', t: 0, life: RI(8, 14) }); yield; }
    Z.block = [tx, ty]; Z.push = null; OW.shake = 3; Audio.sfx('impact_sub', { vol: .4 }); for (let i = 1; i <= 4; i++) { st.k = 1 - i / 4; yield; } OW.fx = null; yield* castOutro(); return;
  }
  if (f.id === 'trazar') { // frente al estante, el lápiz dibuja una escalera peldaño a peldaño
    const [tx, ty] = ahead(1), sh = P.shelf.find(([x, y]) => x === tx && y === ty); if (!sh) { say2(['Aquí no hay dónde dibujar', 'una escalera.']); return; }
    if (Z.block[0] === tx && Z.block[1] === ty + 1 && !(lx === tx && ly === ty + 1)) { say2(['La goma estorba.']); return; }
    if (Z.ladder >= 1) { say2(['La escalera ya está dibujada.']); return; }
    owner.cur.mp -= f.mp; yield* castIntro(f, owner, dir); P.ladderAt = [tx, ty]; const img = propSprite('lapiz', C(owner.color)), st = { k: 0 };
    OW.fx = () => { const x = tx * TILE + 8 - Math.round(OW.cam.x) + Math.sin(st.k * 40) * 4, y = ty * TILE + 15 - st.k * 14 - Math.round(OW.cam.y); drawProp(img, x, y, -.95, 1, PROP.lapiz.tip[0], PROP.lapiz.tip[1], .9); };
    for (let i = 1; i <= 24; i++) { st.k = i / 24; Z.ladder = i / 24; if (i % 6 === 1) Audio.sfx('scratch', { vol: .4, semi: i }); if (i % 2 === 0) OW.dust.push({ x: tx * TILE + 8 + R(-4, 4), y: ty * TILE + 15 - st.k * 14, vx: R(-.4, .4), vy: -R(.2, .6), col: '#6a6480', t: 0, life: 10 }); yield; }
    OW.fx = null; Z.ladder = 1; Audio.sfx('tinkle', { semi: 4 }); yield* castOutro(); say2(['Una escalera a lápiz', 'sube por el estante.']); return;
  }
  if (f.id === 'regar') { // el pincel se moja en Añil y riega la semilla: brota un girasol que crece, florece y se dobla sobre el río como puente
    const [tx, ty] = ahead(1); if (!P.seed || !((tx === P.seed[0] && ty === P.seed[1]) || (lx === P.seed[0] && ly === P.seed[1]))) { say2(['Aquí no hay nada que regar.']); return; }
    if (Z.sun >= 1) { say2(['El girasol ya hace de puente.']); return; }
    owner.cur.mp -= f.mp; yield* castIntro(f, owner, dir); const sx = P.seed[0] * TILE + 8, sy = P.seed[1] * TILE + 12;
    Audio.sfx('brush_hiss'); for (let i = 0; i < 16; i++) { for (let j = 0; j < 2; j++) OW.dust.push({ x: OW.cast.x + R(-3, 3), y: OW.cast.y - 8, vx: (sx - OW.cast.x) / 16 + R(-.3, .3), vy: -1.8 + R(-.3, .3), col: j ? C('azul') : ramp(C('azul')).hi, t: 0, life: 16 }); yield; }
    Audio.sfx('splash_clean'); Audio.sfx('grow', { when: .2 }); for (let i = 1; i <= 36; i++) { Z.sun = i / 36; if (i % 9 === 0) Audio.sfx('leaves', { vol: .5 }); if (i % 3 === 0) OW.dust.push({ x: sx + R(-6, 6), y: sy - Z.sun * 30, vx: R(-.3, .3), vy: -R(.2, .5), col: '#7ecb60', t: 0, life: 14 }); yield; }
    yield* wait(10); Audio.sfx('leaves'); Audio.sfx('hum_down', { vol: .3 }); for (let i = 1; i <= 24; i++) { Z.sunBend = i / 24; yield; } OW.shake = 3; Audio.sfx('plop', { semi: -2 }); for (let j = 0; j < 8; j++) OW.dust.push({ x: sx + 36 + R(-6, 6), y: sy + R(-2, 2), vx: R(-.6, .6), vy: -R(.3, .9), col: '#f2c93a', t: 0, life: 14 });
    yield* castOutro(); say2(['El girasol se dobla sobre la', 'tinta y hace de puente.']); return;
  }
  if (f.id === 'revelar') { // Carmín y Añil oscurecen la página: lo escrito con tinta invisible aparece
    f.combo.forEach(id => { const q = Party.find(p => p.id === id); q.cur.mp -= f.mp; }); yield* castIntro(f, owner, dir); Audio.sfx('hum_down'); Audio.sfx('glass', { when: .3 });
    for (let i = 1; i <= 90; i++) { Z.reveal = i < 15 ? i / 15 : i > 70 ? (90 - i) / 20 : 1; if (i === 24 && !Z.revealed) { Z.revealed = true; Audio.sfx('tinkle', { semi: 2 }); Audio.sfx('mix', { vol: .4 }); } if (i > 20 && i < 60 && i % 4 === 0 && P.estuche) OW.dust.push({ x: P.estuche[0] * TILE + 8 + R(-10, 10), y: P.estuche[1] * TILE + 8 + R(-6, 6), vx: 0, vy: -R(.2, .5), col: '#fff3c0', t: 0, life: 16 }); yield; }
    Z.reveal = 0; yield* castOutro(); say2(P.estuche ? ['Con la página a oscuras aparece', 'algo escrito con tinta invisible:', 'un estuche en lo alto del estante.'] : ['No había nada oculto.']); return;
  }
}
function* openEstucheGen() {
  const P = MAP.pz, Z = Game.puzzle; Z.zip = 0; OW.vx = OW.vy = 0; OW.moving = false;
  for (let i = 1; i <= 24; i++) { Z.zip = i / 24; if (i % 3 === 0) Audio.sfx('scratch', { vol: .3, semi: i }); yield; }
  Z.open = 0; Audio.sfx('page'); for (let i = 1; i <= 10; i++) { Z.open = i / 10; yield; }
  Audio.sfx('discovery');
  Z.rise = 0; for (let i = 1; i <= 40; i++) { Z.rise = i / 40; if (i % 4 === 0) OW.dust.push({ x: P.estuche[0] * TILE + 8 + R(-10, 10), y: P.estuche[1] * TILE + 6 - Z.rise * 20, vx: R(-.4, .4), vy: -R(.2, .6), col: i % 2 ? '#fff3c0' : '#c9c4d4', t: 0, life: 20 }); yield; }
  yield* wait(20); Z.opened = true; Game.owned.pluma = true; Z.rise = 0;
  OW.msg = { lines: ['¡Has conseguido la Pluma!', 'Estilográfica del delineante:', 'escribe con el color de quien', 'la empuña. Equípala en el menú.'], t: 0 };
}
function pzSprite(kind, pal) {
  return cached(`pz|${kind}|${pal}`, () => {
    const c = document.createElement('canvas'); c.width = 24; c.height = 24; const x = c.getContext('2d');
    if (kind === 'tintero') { px(x, '#2a2438', 5, 4, 14, 18); px(x, '#3e3852', 6, 5, 12, 16); px(x, '#5a5670', 7, 6, 3, 12); px(x, '#c9c4d4', 8, 1, 8, 4); px(x, '#8c8ab0', 8, 4, 8, 1); px(x, '#f4f0ea', 8, 10, 8, 6); px(x, '#2a2438', 9, 12, 6, 1); px(x, '#2a2438', 9, 14, 4, 1); px(x, '#0b0912', 5, 20, 14, 2); }
    else if (kind === 'goma') { px(x, '#2a2438', 2, 8, 20, 12); px(x, '#f0a0b8', 3, 9, 11, 10); px(x, '#fbd0dc', 3, 9, 11, 2); px(x, '#c06a88', 3, 17, 11, 2); px(x, '#c9c4d4', 14, 9, 7, 10); px(x, '#f4f0ea', 14, 9, 7, 2); px(x, '#6a6480', 14, 17, 7, 2); px(x, '#2a2438', 13, 9, 1, 10); }
    else if (kind === 'estuche') { px(x, '#2a2438', 1, 8, 22, 12); px(x, C('violeta'), 2, 9, 20, 10); px(x, ramp(C('violeta')).hi, 2, 9, 20, 2); px(x, ramp(C('violeta')).sh, 2, 17, 20, 2); for (let i = 3; i < 21; i += 2) px(x, i % 4 === 3 ? '#c9c4d4' : '#8c8ab0', i, 12, 1, 2); px(x, '#f4f0ea', 9, 13, 6, 3); px(x, '#2a2438', 10, 14, 4, 1); }
    else if (kind === 'semilla') { px(x, '#5e4229', 10, 14, 4, 4); px(x, '#8a6a48', 10, 14, 2, 2); px(x, '#3d8a2f', 11, 12, 1, 2); }
    return c;
  });
}
function drawVine(x, y, k) {
  const H = k * 30; g.strokeStyle = '#227a38'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); for (let i = 1; i <= 8; i++) { const q = i / 8; g.lineTo(x + Math.sin(q * 6) * 3, y - H * q); } g.stroke();
  for (let i = 0; i < 4; i++) { const q = .2 + i * .2; if (k < q) break; const lx = x + Math.sin(q * 6) * 3, ly = y - H * q, dir = i % 2 ? 1 : -1; g.fillStyle = i % 2 ? '#4fb84a' : '#2f9a48'; g.beginPath(); g.ellipse(lx + dir * 4, ly, 4, 2, dir * -.5, 0, 6.29); g.fill(); }
}
// Sprite de un miembro del grupo en el mapa: vista según dirección (espaldas al subir, frente al bajar, perfil a los lados)
const DIRVIEW = { up: 'back', down: 'front', left: 'side', right: 'side' };
function mapDrop(p, x, y, dir, bob, moving, t, idx) {
  const sc = OW.scare, sk = sc ? clamp(sc.k - idx * .12, 0, 1) : 0; // sobresalto durante la transición (el líder primero, los demás en cadena)
  const col = C(p.color), dead = p.cur.hp <= 0, view = dead ? 'front' : sk > 0 ? 'front' : DIRVIEW[dir] || 'back';
  const blink = !moving && ((t + idx * 53) % 170) < 6, spr = desatSprite(buildSprite(`${p.id}_${view}_mini`, col, null, { eyes: dead ? 'ko' : sk > 0 ? 'wide' : blink ? 'blink' : 'normal' }), pigmentFade(p.cur.mp, effStats(p).mp));
  const lz = OW.landZ ? OW.landZ[idx] || 0 : 0;
  const hop = moving ? Math.abs(Math.sin(bob * Math.PI)) : 0, wz = hop * 3 + lz; let sq = moving ? (hop < .15 ? [1.1, .9] : hop > .85 ? [.94, 1.06] : [1, 1]) : (((t / 14 | 0) + idx) % 4 === 1 ? [1.03, .97] : [1, 1]);
  // reacción: en 'detect' se giran hacia la sombra con los ojos como platos y tiemblan; en 'fall' se van encogiendo; en el salpicón quedan aplastados
  if (sk > 0 && !dead) { if (sc.stage === 'detect') { if (sk > .4) x += ((Game.t >> 1) & 1) ? 1 : -1; sq = [1 + sk * .08, 1 - sk * .08]; } else if (sc.stage === 'fall') sq = [1.06 + sk * .18, .94 - sk * .18]; else sq = [1.3, .6]; }
  shadow(x, y, Math.max(2, Math.round((p.w * .42) * (1 - hop * .3) * (1 - lz / 160))));
  if (dead) { drawSprite(spr, x, y, 1, false, .45); return; }
  drawSprite(spr, x, Math.round(y - wz), lz > 0 ? .9 : sq[0], dir === 'right', lz > 0 ? 1.15 : sq[1]);
  if (p.id === 'anil') drawSatellites(x, y - wz, t + idx * 10, col, .4);
}
function drawOverworld() {
  const nud = OW.camNudge || [0, 0], shk = OW.shake > 0 ? [R(-OW.shake, OW.shake) | 0, R(-OW.shake, OW.shake) / 2 | 0] : [0, 0]; if (OW.shake > 0 && OW.t % 2 === 0) OW.shake--;
  const cx = Math.round(OW.cam.x + nud[0]) + shk[0], cy = Math.round(OW.cam.y + nud[1]) + shk[1], wf = (OW.t / 9 | 0) % 4, pal = Game.palette;
  const ents = [];
  for (let ty = cy / TILE | 0; ty <= (cy + H) / TILE + 1; ty++) for (let tx = cx / TILE | 0; tx <= (cx + W) / TILE; tx++) {
    const ch = tileAt(tx, ty); g.drawImage(groundTile(tx, ty, pal, ch === '~' ? wf : 0), tx * TILE - cx, ty * TILE - cy);
    if (ch === 'T' && ty < MAP.h) ents.push({ y: ty * TILE + TILE, draw: () => g.drawImage(treeSprite(pal, tileAt(tx - 1, ty) === 'T', tileAt(tx + 1, ty) === 'T', hash2(tx, ty) & 7), tx * TILE - cx, ty * TILE - 8 - cy) });
  }
  for (const p of OW.puddles || []) { const x = p.x - cx, y = p.y - cy; if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue; g.fillStyle = ramp(p.col).sh; g.beginPath(); g.ellipse(x, y + 2, p.w, p.w * .45, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).base; g.beginPath(); g.ellipse(x - 1, y + 1, p.w - 2, p.w * .4 - 1, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).hi; g.fillRect(x - p.w * .5 | 0, y - 1, 3, 1); }
  // grupo: líder y seguidores por la estela (estilo CT), cada uno mirando hacia donde avanza
  if (MAP.pz && Game.puzzle) { const P = MAP.pz, Z = Game.puzzle;
    // página rota: agujero con bordes desgarrados que deja ver el cartón de la tapa
    for (const [tx, ty] of P.torn) { const x = tx * TILE - cx, y = ty * TILE - cy; if (x < -16 || y < -16 || x > W || y > H) continue; const rnd = seeded(tx * 7 + ty * 13); g.fillStyle = '#7a5a3a'; g.fillRect(x, y, 16, 16); g.fillStyle = '#5e4229'; for (let i = 0; i < 12; i++) g.fillRect(x + (rnd() * 16 | 0), y + (rnd() * 16 | 0), 1, 1); g.fillStyle = PAPER; for (let i = 0; i < 16; i++) { if (rnd() < .5) g.fillRect(x + i, y, 1, 1 + (rnd() * 2 | 0)); if (rnd() < .5) g.fillRect(x + i, y + 14 + (rnd() * 2 | 0), 1, 2); if (rnd() < .4) g.fillRect(x, y + i, 1 + (rnd() * 2 | 0), 1); if (rnd() < .4) g.fillRect(x + 14 + (rnd() * 2 | 0), y + i, 2, 1); } }
    // pinceladas de reparación (permanentes)
    for (const st of Z.strokes) { const x0 = st.x0 - cx, y0 = st.y0 - cy, x1 = lerp(st.x0, st.x1, st.k) - cx, y1 = lerp(st.y0, st.y1, st.k) - cy; pstroke(x0, y0, x1, y1, st.w, ramp(st.col).sh, 1, 1, false); pstroke(x0, y0, x1, y1, st.w - 4, st.col, 1, 0, false); pstroke(x0 - 2, y0 - 2, x1 - 2, y1 - 2, 2, ramp(st.col).hi, 1, 1, false); }
    // río de tinta húmeda
    for (const [tx, ty] of P.river) { const x = tx * TILE - cx, y = ty * TILE - cy; if (x < -16 || y < -16 || x > W || y > H) continue; g.fillStyle = 'rgba(11,9,18,.5)'; g.fillRect(x, y, 16, 16); g.fillStyle = '#3a3652'; const fl = (OW.t + ty * 5) % 16; g.fillRect(x + 3, y + fl, 2, 3); g.fillRect(x + 11, y + (fl + 8) % 16, 2, 2); g.fillStyle = '#5a5670'; g.fillRect(x + 6, y + (fl + 4) % 16, 1, 1); }
    // goma empujable
    const bx = Z.push ? lerp(Z.push.from[0], Z.push.to[0], Z.push.k) : Z.block[0], by = Z.push ? lerp(Z.push.from[1], Z.push.to[1], Z.push.k) : Z.block[1];
    ents.push({ y: by * TILE + 15, draw: () => { shadow(bx * TILE + 8 - cx, by * TILE + 15 - cy, 16); g.drawImage(pzSprite('goma', pal), Math.round(bx * TILE - 4 - cx), Math.round(by * TILE - 6 - cy)); } });
    // estante (regla tumbada) y escalera a lápiz
    for (const [tx, ty] of P.shelf) { const x = tx * TILE - cx, y = ty * TILE - cy; g.fillStyle = PAL[pal].ruler; g.fillRect(x, y + 4, 16, 12); g.fillStyle = PAL[pal].ruler2; g.fillRect(x, y + 4, 16, 2); g.fillRect(x, y + 14, 16, 2); g.fillStyle = PAL[pal].rulerInk; for (let i = 0; i < 16; i += 2) g.fillRect(x + i, y + 6, 1, i % 8 === 0 ? 4 : i % 4 === 0 ? 3 : 2);
      if (P.ladderAt && P.ladderAt[0] === tx && P.ladderAt[1] === ty && Z.ladder > 0) { const n = Math.round(Z.ladder * 5); g.fillStyle = INK; g.fillRect(x + 4, y + 16 - Math.round(Z.ladder * 16), 1, Math.round(Z.ladder * 16)); g.fillRect(x + 11, y + 16 - Math.round(Z.ladder * 16), 1, Math.round(Z.ladder * 16)); for (let i = 0; i < n; i++) g.fillRect(x + 5, y + 13 - i * 3, 6, 1); } }
    // semilla y girasol (crece, florece y se dobla hacia el río)
    if (P.seed) { const sx = P.seed[0] * TILE + 8, sy = P.seed[1] * TILE + 12; ents.push({ y: P.seed[1] * TILE + 12, draw: () => { const x = sx - cx, y = sy - cy; if (Z.sun <= 0) { g.drawImage(pzSprite('semilla', pal), x - 12, y - 16); return; }
      const H2 = Z.sun * 34, bend = Z.sunBend, ang = -Math.PI / 2 + bend * Math.PI / 2; g.save(); g.translate(x, y); g.strokeStyle = '#2f9a48'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); for (let i = 1; i <= 8; i++) { const q = i / 8, a = -Math.PI / 2 + (bend * Math.PI / 2) * q * q, L = H2 * q; g.lineTo(Math.cos(a) * L + Math.sin(q * 5) * (1 - bend) * 2, Math.sin(a) * L); } g.stroke(); g.strokeStyle = '#7ecb60'; g.lineWidth = 1; g.stroke();
      for (let i = 1; i <= 3; i++) { const q = .25 * i, a = -Math.PI / 2 + (bend * Math.PI / 2) * q * q, L = H2 * q, lx2 = Math.cos(a) * L, ly2 = Math.sin(a) * L, dir = i % 2 ? 1 : -1; g.fillStyle = i % 2 ? '#4fb84a' : '#2f9a48'; g.beginPath(); g.ellipse(lx2 + Math.cos(a + dir * 1.2) * 5, ly2 + Math.sin(a + dir * 1.2) * 5, 5, 2.2, a + dir * 1.2, 0, 6.29); g.fill(); }
      const hx = Math.cos(ang) * H2, hy = Math.sin(ang) * H2, rr = 4 + Z.sun * 4; if (Z.sun > .5) { for (let i = 0; i < 10; i++) { const a2 = i / 10 * 6.28 + OW.t * .01; g.fillStyle = C('amarillo'); g.beginPath(); g.ellipse(hx + Math.cos(a2) * rr, hy + Math.sin(a2) * rr, rr * .5, rr * .28, a2, 0, 6.29); g.fill(); } g.fillStyle = '#5e4229'; g.beginPath(); g.arc(hx, hy, rr * .6, 0, 6.29); g.fill(); g.fillStyle = '#8a6a48'; g.fillRect(hx - 1, hy - 1, 1, 1); }
      g.restore(); } }); }
    // estuche (tinta invisible hasta Revelar)
    if (P.estuche) { const x = P.estuche[0] * TILE - cx, y = P.estuche[1] * TILE - cy, vis = Z.revealed ? 1 : Z.reveal; if (vis > 0) ents.push({ y: P.estuche[1] * TILE + 16, draw: () => { g.globalAlpha = vis; shadow(x + 8, y + 15, 18); const spr = pzSprite('estuche', pal); g.drawImage(spr, x - 4, y - 4);
      if (!Z.revealed) { g.strokeStyle = '#f4f0ea'; g.setLineDash([2, 2]); g.strokeRect(x - 4.5, y + 3.5, 23, 12); g.setLineDash([]); }
      if (Z.zip != null && !Z.opened) { g.fillStyle = '#f4f0ea'; g.fillRect(x - 2 + Math.round(Z.zip * 18), y + 8, 2, 2); }
      if (Z.open != null && !Z.opened) { g.fillStyle = ramp(C('violeta')).sh; g.fillRect(x - 2, y + 5 - Math.round(Z.open * 6), 20, Math.round(Z.open * 6)); g.fillStyle = '#e9e1cc'; g.fillRect(x - 1, y + 5, 18, 3); }
      if (Z.rise > 0) { const ry = y + 4 - Z.rise * 26, img = propSprite('pluma', C('azul')); g.save(); g.translate(x + 8, ry); g.rotate(-1.2 + Math.sin(OW.t * .2) * .1); g.drawImage(img, -24, -8); g.restore(); if (Z.rise > .5) { const w = 'La Pluma'.length * 8 + 16; tape(x + 8 - w / 2, ry - 26, w, 14); ui('La Pluma', x + 8 - w / 2 + 8, ry - 23, TXT); } g.fillStyle = '#fff3c0'; g.globalAlpha = .6 * Math.sin(Z.rise * Math.PI); g.beginPath(); g.arc(x + 8, ry, 14, 0, 6.29); g.fill(); g.globalAlpha = 1; }
      if (Z.opened) { g.fillStyle = ramp(C('violeta')).sh; g.fillRect(x - 2, y - 1, 20, 6); g.fillStyle = '#e9e1cc'; g.fillRect(x - 1, y + 5, 18, 3); } g.globalAlpha = 1; } }); }
    if (Z.reveal > 0) { g.fillStyle = 'rgba(11,9,18,' + (.6 * Z.reveal).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
  }
  for (const sg of MAP.signs || []) ents.push({ y: sg.y * TILE + 14, draw: () => { shadow(sg.x * TILE + 8 - cx, sg.y * TILE + 14 - cy, 8); g.drawImage(signSprite(), sg.x * TILE + 1 - cx, sg.y * TILE - 2 - cy); } });
  if (MAP.jar) { const J = OW.jar, jx = MAP.jar.x * TILE, jy = MAP.jar.y * TILE; ents.push({ y: jy + 32, draw: () => {
    const x = jx - cx, y = jy - cy, wob = J.wob > 0 ? Math.sin(OW.t * .8) * J.wob * .08 : 0; g.save(); g.translate(x + 16, y + 34); g.scale(1 + wob, 1 - wob); g.translate(-16, -34);
    shadow(16, 34, 24); g.drawImage(jarSprite(pal), 0, 0);
    if (J.tint.length) { J.tint.forEach((c, i) => { g.globalAlpha = .55; g.fillStyle = c; g.beginPath(); g.ellipse(16 + Math.cos(OW.t * .07 + i * 2.1) * 5, 23 + Math.sin(OW.t * .11 + i * 2.1) * 4, 7, 4, OW.t * .02 + i, 0, 6.29); g.fill(); }); g.globalAlpha = 1; g.save(); g.globalCompositeOperation = 'destination-over'; g.restore(); }
    for (const b of J.bubbles) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(Math.round(b.x - jx), Math.round(b.y - jy), b.r, b.r); }
    if (J.glow) { g.strokeStyle = '#f4f0ea'; g.globalAlpha = .5 + Math.sin(OW.t * .3) * .3; g.lineWidth = 1; g.strokeRect(5.5, 4.5, 21, 29); g.globalAlpha = 1; }
    const hurt = Party.some(q => q.cur.hp < effStats(q).hp * .5 || q.cur.mp < effStats(q).mp * .25), gl = (OW.t % (hurt ? 50 : 140)); if (gl < 12) { const r = gl < 6 ? gl : 12 - gl; g.fillStyle = '#ffffff'; g.fillRect(9 - r, 8, r * 2 + 1, 1); g.fillRect(9, 8 - r, 1, r * 2 + 1); } // destello del cristal, más frecuente si alguien va tocado
    g.restore(); } }); }
  if (!(OW.landT > 900)) Party.forEach((p, i) => {
    let x = OW.x, y = OW.y, dir = OW.dir || 'down';
    if (OW.cast && OW.cast.p === p) { const cst = OW.cast; ents.push({ y: cst.y + 1, draw: () => { const x = cst.x - cx, y = cst.y - cy; if (cst.aura > 0) { g.strokeStyle = cst.col; g.globalAlpha = .7; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 1, 9 + Math.sin(OW.t * .4) * 1.5, 4, 0, 0, 6.29); g.stroke(); g.globalAlpha = .25; g.fillStyle = cst.col; g.fill(); g.globalAlpha = 1; } const sq = cst.aura > 0 ? [1.1, .9] : [1, 1]; shadow(x, y, 8); const spr = buildSprite(`${p.id}_${DIRVIEW[OW.dir] || 'front'}_mini`, C(p.color), null, { eyes: 'normal' }); drawSprite(spr, x, y - (cst.aura > 0 ? Math.abs(Math.sin(OW.t * .5)) * 1.5 : 0), sq[0], OW.dir === 'right', sq[1]); } }); return; }
    if (OW.heal) { const J = OW.jar; if (J.hidden[i]) return; if (J.jump[i]) { const jp = J.jump[i]; ents.push({ y: jp[1] + 1, draw: () => { shadow(jp[0] - cx, jp[1] - cy, 8); drawSprite(buildSprite(`${p.id}_front_mini`, C(p.color), null, { eyes: 'happy' }), jp[0] - cx, Math.round(jp[1] - jp[2] - cy), 1, false, 1.1); } }); return; } if (J.pos[i]) { x = J.pos[i][0]; y = J.pos[i][1]; ents.push({ y, draw: () => mapDrop(p, x - cx, y - cy, 'down', 0, false, OW.t, i) }); return; } }
    if (i > 0) { const h = OW.hist[Math.min(OW.hist.length - 1, i * 12)], h2 = OW.hist[Math.min(OW.hist.length - 1, i * 12 + 4)]; if (h) { x = h[0]; y = h[1]; if (h2) { const ddx = h[0] - h2[0], ddy = h[1] - h2[1]; if (Math.abs(ddx) + Math.abs(ddy) > .5) dir = Math.abs(ddx) >= Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : (ddy < 0 ? 'up' : 'down'); else dir = OW.dir || 'down'; } } else { x = OW.x - i * 12; } }
    const moving = OW.moving && (i === 0 || OW.hist.length > i * 12);
    ents.push({ y, draw: () => mapDrop(p, x - cx, y - cy, dir, (OW.bob || 0) + i * .33, moving, OW.t, i) });
  });
  for (const f of OW.foes) {
    if (Game.defeated.has(f.key) || OW.hideFoe === f) continue; // hideFoe: la transición lo dibuja ella (se agazapa y salta)
    const e = DATA.enemies[f.enemies[0]], core = e.color === 'negro' ? null : C(e.color);
    if (f.boss) { // la jefa no bota ni avisa con "!": es una masa pesada que respira sobre su charco y, cuando te acercas, el charco hace ondas
      ents.push({ y: f.y, draw: () => { const x = f.x - cx, y = f.y - cy, br = 1 + Math.sin(OW.t * .045 + f.seed) * .035; g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(x, y + 4, 14, 4, 0, 0, 6.29); g.fill();
        if (f.seen) for (let r = 0; r < 2; r++) { const q = ((OW.t / 70 + r * .5) % 1); g.strokeStyle = 'rgba(74,70,100,' + (.55 * (1 - q)).toFixed(2) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 4, 14 + q * 34, 4 + q * 12, 0, 0, 6.29); g.stroke(); }
        const spr = buildSprite(f.enemies[0] + '_mini', C('negro'), core, { eyes: 'normal' }); drawSprite(spr, x, y + 2, br, f.dirLeft, 1 / (br * br)); } });
      continue;
    }
    ents.push({ y: f.y, draw: () => { const hop = Math.abs(Math.sin((OW.t + f.seed * 7) * (f.seen ? .25 : .12))) * (f.seen ? 4 : 2), x = f.x - cx, y = f.y - cy; shadow(x, y, 8); const spr = buildSprite(f.enemies[0] + '_mini', C('negro'), core, { eyes: f.alert > 0 ? 'happy' : 'normal' }); drawSprite(spr, x, Math.round(y - hop), 1, f.dirLeft); if (f.alert > 0) { const by = y - spr.height - 10 + (f.alert > 24 ? (30 - f.alert) : 0); g.fillStyle = '#f4f0ea'; g.fillRect(x - 1, by, 2, 6); g.fillRect(x - 1, by + 8, 2, 2); } } });
  }
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  for (const d of OW.dust) { g.fillStyle = d.t < d.life * .6 ? ramp(d.col).base : ramp(d.col).sh; g.fillRect(Math.round(d.x - cx), Math.round(d.y - cy), 1, 1); }
  if (OW.fx) OW.fx();
  if (OW.flash) { g.fillStyle = OW.flash.col; g.globalAlpha = OW.flash.a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; OW.flash.a -= .03; if (OW.flash.a <= 0) OW.flash = null; }
  for (const f of OW.floats || []) { if (f.t < 0) continue; txt(f.s, Math.round(f.x - cx - f.s.length * 4), Math.round(f.y - cy - f.t * .4), f.col); }
  // bocadillo del líder tras una batalla dura: piensa en el vaso
  if (OW.hint > 0 && MAP.jar && !OW.msg) { const lx = OW.x - cx, ly = OW.y - cy - 22, k = clamp(OW.hint / 10, 0, 1) * clamp((150 - OW.hint) / 8, 0, 1); g.globalAlpha = k; page(lx - 12, ly - 14, 26, 18); g.drawImage(jarSprite(pal), lx - 6, ly - 12, 12, 13); g.fillStyle = PAPER; g.fillRect(lx - 3, ly + 5, 2, 2); g.fillRect(lx - 1, ly + 8, 1, 1); g.globalAlpha = 1; }
  // HUD
  win(4, 4, 124, 16); swatch(8, 8, C('amarillo')); ui('PIGMENTO ' + Game.pigmento, 18, 8, TXT);
  // brújula al vaso cuando alguien va tocado y no está cerca
  if (MAP.jar) { const jx = MAP.jar.x * TILE + 16, jy = MAP.jar.y * TILE + 34, d = Math.hypot(jx - OW.x, jy - OW.y), hurt = Party.some(q => q.cur.hp < effStats(q).hp * .5 || q.cur.mp < effStats(q).mp * .25);
    if (hurt && d > 48 && !OW.heal) { win(W - 44, 4, 40, 18); g.drawImage(jarSprite(pal), W - 40, 6, 11, 13); const a = Math.atan2(jy - OW.y, jx - OW.x), ax = W - 18, ay = 13, bl = (OW.t / 20 | 0) % 2; g.fillStyle = bl ? '#e23c3c' : '#2a2438'; g.beginPath(); g.moveTo(ax + Math.cos(a) * 6, ay + Math.sin(a) * 6); g.lineTo(ax + Math.cos(a + 2.5) * 5, ay + Math.sin(a + 2.5) * 5); g.lineTo(ax + Math.cos(a - 2.5) * 5, ay + Math.sin(a - 2.5) * 5); g.closePath(); g.fill(); } }
  if (OW.ring) drawRing();
  if (OW.msg && !(OW.landT > 0)) drawMessage(OW.msg.lines);
  if (OW.menu) drawMenu();
}
function drawMessage(lines) {
  const h = lines.length * 10 + 14; win(8, H - h - 8, W - 16, h);
  lines.forEach((l, i) => ui(l, 16, H - h - 1 + i * 10, i === 0 ? GOLD : TXT));
  if ((Game.t / 20 | 0) % 2) ui('▼', W - 24, H - 16, TXT2);
}
// (El menú de estado/equipo vive en gui.js)

// =====================================================================
// 7. Título, bucle principal, debug
// =====================================================================
// ---- Título: el logo se pinta y sus gotas dan vida a una ilustración a lápiz.
const TITLE = { t: 0, exit: 0, letters: 'CHROMARA', cols: ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'rojo', 'amarillo'], sfxd: {} };
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
  word.split('').forEach((ch, i) => { const S = TITLE.L[i]; if (S.painted < 0) return; const q = clamp((t - S.painted) / 40, 0, 1), col = C(TITLE.cols[i]), x = x0 + i * cw + LOGO_W / 2 + 1; if (q <= 0) return; g.fillStyle = ramp(col).sh; g.beginPath(); g.ellipse(x, baseY + 2, (6 + q * 10) * 1.1, 2 + q * 2.2, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(col).base; g.beginPath(); g.ellipse(x - 1, baseY + 1.5, 5 + q * 9, 1.5 + q * 1.6, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(col).hi; g.fillRect(x - 5, baseY + 1, 3, 1); });
  word.split('').forEach((ch, i) => {
    const S = TITLE.L[i], k = clamp((t - 12 - i * 9) / 12, 0, 1); if (k <= 0) return;
    const col = C(TITLE.cols[i]), rp = ramp(col), spr = logoLetter(ch, col), x = x0 + i * cw;
    if (k < 1) titleSfx('l' + i, 'brush_sweep', { pan: (i - 4) * .1, vol: .5 });
    if (k >= 1 && S.painted < 0) { S.painted = t; Audio.sfx('plop', { semi: i * 2 - 6 }); for (let j = 0; j < 10; j++) S.spl.push({ x: x + LOGO_W / 2 + R(-6, 6), y: y0 + LOGO_H / 2 + R(-8, 8), vx: R(-1.6, 1.6), vy: -R(.5, 2.4), t: 0 }); S.drips = [{ x: (POOLS[ch] || [[10, 20]])[0][0] + R(-1, 1), len: 0, max: R(5, 11), speed: R(.08, .16) }]; if (POOLS[ch] && POOLS[ch][1] && Math.random() < .6) S.drips.push({ x: POOLS[ch][1][0], len: 0, max: R(3, 8), speed: R(.06, .12) }); }
    const since = S.painted < 0 ? 0 : t - S.painted, pop = S.painted < 0 ? 0 : Math.max(0, 1 - since / 26), popS = 1 + Math.sin(since * .5) * .28 * pop;
    // Tras el brochazo, la pintura se asienta. Un brillo muy ocasional cruza el nombre.
    const wv = t > 600 ? ((t - 600) % 900) / 100 : -1, wk = wv < 0 ? 0 : clamp(1 - Math.abs(wv * (word.length + 3) - 1.5 - i), 0, 1), boing = Math.sin(wk * Math.PI);
    const wob = .15 + pop * 4, sy = popS * (1 + Math.sin(t * .025 + i * .9) * .006), phase = t * .08 + i * 1.3;
    if (boing > .85 && S.drips[0] && S.drips[0].len < S.drips[0].max) S.drips[0].len += .5;
    const bob = 0, y = Math.round(y0) + (k < 1 ? (1 - k) * 6 | 0 : 0);
    if (y > H + 10) return;
    g.save(); g.beginPath(); g.rect(x - 3, y - 6, Math.round((spr.width + 6) * k), spr.height + 10); g.clip();
    g.globalAlpha = .4; g.drawImage(spr, x + 2, y + 3); g.globalAlpha = 1; // sombra de tinta
    drawGooey(spr, x, y, wob, sy, phase);
    g.restore();
    if (boing > .6) { const q = (boing - .6) / .4, r = Math.round(1 + q * 3), cx2 = x + 5, cy2 = y + 5 - Math.round(boing * 3); g.fillStyle = '#ffffff'; g.fillRect(cx2 - r, cy2, r * 2 + 1, 1); g.fillRect(cx2, cy2 - r, 1, r * 2 + 1); g.fillStyle = rp.hi; g.fillRect(cx2 - 1, cy2 - 1, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(cx2, cy2, 1, 1); }
    // goterones que crecen y se desprenden
    for (const d of S.drips) { d.len = Math.min(d.max, d.len + d.speed); const dx = x + d.x + 1, dy = baseY + Math.round(bob), L = Math.round(d.len); g.fillStyle = rp.out; g.fillRect(dx - 1, dy - 2, 3, L + 3); g.fillStyle = rp.base; g.fillRect(dx, dy - 2, 1, L + 1); g.fillStyle = rp.sh; g.fillRect(dx + 1, dy - 1, 1, L); g.fillStyle = rp.out; g.fillRect(dx - 1, dy + L + 1, 3, 1); g.fillRect(dx, dy + L + 2, 1, 1); g.fillStyle = rp.hi; g.fillRect(dx, dy, 1, 1);
      if (d.len >= d.max && Math.random() < .0015) { (TITLE.drips = TITLE.drips || []).push({ x: dx, y: dy + L, vy: .3, col, t: 0 }); d.len = d.max * .35; d.max = R(3, 6); } }
    // salpicaduras del pop
    for (const p of S.spl) { p.t++; p.x += p.vx; p.y += p.vy; p.vy += .12; g.fillStyle = p.t < 10 ? rp.hi : rp.base; g.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); } S.spl = S.spl.filter(p => p.t < 22);
    if (k < 1) { const img = propSprite('brocha', col), P = PROP.brocha; hilite(x - 4, y + LOGO_H / 2, x + Math.round(spr.width * k) + 4, LOGO_H + 6, rp.base, .35); drawProp(img, x + spr.width * k + 6, y + 8 + k * 14, P.a - 1.4 + Math.sin(t * .8) * .15, 1, P.tip[0], P.tip[1], .85); }
  });
  for (const d of TITLE.drips || []) { d.t++; d.vy += .05; d.y += d.vy; g.save(); g.globalAlpha = clamp((y0 + 48 - d.y) / 12, 0, 1); g.fillStyle = ramp(d.col).out; g.fillRect(Math.round(d.x) - 1, Math.round(d.y), 3, 3); g.fillStyle = ramp(d.col).base; g.fillRect(Math.round(d.x), Math.round(d.y), 1, 2); g.restore(); }
  TITLE.drips = (TITLE.drips || []).filter(d => d.y < y0 + 48);
}
// ---- Portada breve y automática. Cualquier tecla adelanta su apertura y desbloquea el audio.
const COVER = { t: 0, open: 0 };
function updateCover() {
  COVER.t++; COVER.dust = COVER.dust || []; for (const d of COVER.dust) { d.x += d.vx; d.y += d.vy; d.vy += .1; d.t++; } COVER.dust = COVER.dust.filter(d => d.t < d.life);
  if (COVER.open) { if (COVER.t - COVER.open === 1) Audio.sfx('book_open'); if (COVER.t - COVER.open >= 40) { setState('title'); TITLE.t = 0; TITLE.L = null; TITLE.drips = []; TITLE.sfxd = {}; COVER.snap = null; Audio.play('title'); } ANYKEY = false; return; }
  const t = Math.floor(COVER.t * 1.35), prev = Math.floor((COVER.t - 1) * 1.35), done = t >= 175;
  if (t > 20 && t <= 110 && (t - 20) % 10 === 1) Audio.sfx('scratch', { vol: .35, semi: RI(-2, 4) }); // el lápiz escribe
  if (t >= 112 && prev < 112) Audio.sfx('scratch_long', { vol: .5 }); if (t >= 126 && prev < 126) Audio.sfx('fwip', { vol: .6 }); // subrayado y floritura
  if (t >= 146 && prev < 146) { Audio.sfx('impact_sub', { vol: .5 }); Audio.sfx('plop', { semi: 2, when: .03 }); for (let i = 0; i < 12; i++) COVER.dust.push({ x: W / 2 + 64 + R(-30, 30), y: 118 + R(-6, 6), vx: R(-1.4, 1.4), vy: -R(.2, 1.2), t: 0, life: RI(12, 20), col: '#e9e1cc' }); } // el sticker se pega
  if (ANYKEY || done) { ANYKEY = false; COVER.t = Math.max(COVER.t, 130); COVER.open = COVER.t; Audio.sfx('page'); for (const k in pressed) pressed[k] = false; }
}
// Letras manuscritas como trazos (rejilla 8×14: ascendente 0, altura de x 4, base 10, descendente 14). Cada letra = lista de trazos (polilíneas).
const arcPts = (cx, cy, r, a0, a1, n = 14) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
const HAND = {
  g: [[...arcPts(3.5, 7, 3, 0, -6.28), [6.5, 4.5], [6.5, 12], ...arcPts(4, 12, 2.5, 0, 3.14)]],
  a: [[...arcPts(3.5, 7, 3, 0, -6.28), [6.5, 4.5], [6.5, 10], [8, 9.4]]],
  v: [[[0.5, 4], [3.5, 10], [6.5, 4]]],
  i: [[[3.5, 4], [3.5, 10], [5.2, 9.4]], [[3.5, 1.4], [3.6, 2.2]]],
  l: [[[3, 0], [3, 9.4], [3.6, 10.1], [5.6, 9.6]]],
  n: [[[1, 4], [1, 10], [1, 6.6], ...arcPts(4, 7, 3, 3.14, 6.28), [7, 10]]],
  b: [[[1, 0], [1, 10], [1, 7], ...arcPts(4, 7, 3, 3.14, -3.14)]],
  e: [[[1, 7], [7, 7], ...arcPts(4, 7, 3, 0, -5.3)]],
  c: [[...arcPts(4, 7, 3, -.9, -5.4)]],
  r: [[[1.5, 4], [1.5, 10], [1.5, 6.5], ...arcPts(4.5, 7, 3, 3.14, 4.9)]],
  m: [[[0.5, 4], [0.5, 10], [0.5, 6.5], ...arcPts(2.5, 6.5, 2, 3.14, 6.28), [4.5, 10], [4.5, 6.5], ...arcPts(6.5, 6.5, 2, 3.14, 6.28), [8.5, 10]]],
  'ñ': [[[1, 4], [1, 10], [1, 6.6], ...arcPts(4, 7, 3, 3.14, 6.28), [7, 10]], [[1.5, 2], [3, 1], [5, 2.2], [6.5, 1.2]]],
  'í': [[[3.5, 4], [3.5, 10], [5.2, 9.4]], [[3, 2.4], [4.4, 1]]],
  'á': [[...arcPts(3.5, 7, 3, 0, -6.28), [6.5, 4.5], [6.5, 10], [8, 9.4]], [[3.5, 2.4], [5, 1]]],
  o: [[...arcPts(4, 7, 3, 0, 6.28)]],
  z: [[[1, 4], [7, 4], [1, 10], [7, 10]]],
};
// trazos de una palabra a mano en pantalla: [{pts,len,start}] y longitud total
function handStrokes(word, x0, y0, S = 1.4, cw = 12) { const out = []; let acc = 0; word.split('').forEach((ch, i) => { for (const st of HAND[ch] || []) { const pts = st.map(([x, y]) => [x0 + i * cw + x * S, y0 + y * S]); let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); out.push({ pts, len, start: acc }); acc += len + 4; } }); return { list: out, total: acc }; }
function drawHand(HS, dist, col, w = 2) { for (const st of HS.list) { if (dist <= st.start) break; const k = clamp((dist - st.start) / st.len, 0, 1), P = st.pts; for (let i = 1; i < P.length; i++) { const segEnd = i / (P.length - 1), segStart = (i - 1) / (P.length - 1); if (k <= segStart) break; const kk = clamp((k - segStart) / (segEnd - segStart), 0, 1); pstroke(P[i - 1][0], P[i - 1][1], lerp(P[i - 1][0], P[i][0], kk), lerp(P[i - 1][1], P[i][1], kk), w, col, 1, 0, false); } } }
function coverStrokes() { // trazos de "gavilanbe" en pantalla, con longitudes acumuladas
  if (COVER.strokes) return COVER.strokes;
  const word = 'gavilanbe', S = 2.2, cw = 19, x0 = W / 2 - word.length * cw / 2 + 2, ty = 60, out = []; let acc = 0;
  word.split('').forEach((ch, i) => { for (const st of HAND[ch]) { const pts = st.map(([x, y]) => [x0 + i * cw + x * S, ty + y * S]); let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); out.push({ pts, len, start: acc, letter: i }); acc += len + 6; } });
  return COVER.strokes = { list: out, total: acc, x0, ty, cw, S };
}
function drawCoverArt(t) { // tapa de cartón con anillas y una etiqueta donde un lápiz escribe "gavilanbe" a mano; luego un sticker de "presenta" se pega de un golpe
  g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, W, H); const rnd = seeded(21); g.fillStyle = '#8a6a48'; for (let i = 0; i < 1800; i++) g.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1); g.fillStyle = '#5e4229'; for (let i = 0; i < 500; i++) g.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1);
  g.fillStyle = '#5e4229'; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2); g.fillRect(W - 2, 0, 2, H);
  for (let y = 10; y < H - 6; y += 12) { g.fillStyle = '#2a1a10'; g.fillRect(6, y, 5, 4); g.fillStyle = '#8c8ab0'; g.fillRect(2, y - 2, 9, 2); g.fillRect(2, y - 2, 2, 6); g.fillStyle = '#e8e6f0'; g.fillRect(3, y - 2, 5, 1); }
  const writing = t > 20 && t < 112, slap = t >= 140 && t < 152, shx = writing && t % 4 === 0 ? R(-.6, .6) : slap ? R(-1.5, 1.5) * (1 - (t - 140) / 12) : 0, shy = slap ? R(-1, 1) * (1 - (t - 140) / 12) : 0;
  g.save(); g.translate(Math.round(shx), Math.round(shy));
  page(66, 56, 188, 66); tape(60, 52, 40, 9); tape(220, 52, 40, 9);
  const CS = coverStrokes(), word = 'gavilanbe', cw = CS.cw, x0 = CS.x0, ty = CS.ty + 14;
  // línea guía a lápiz, muy tenue, que aparece antes de escribir
  const gk = clamp((t - 8) / 12, 0, 1); if (gk > 0) { g.fillStyle = '#c9bd9c'; g.fillRect(x0 - 4, ty + 9, Math.round((word.length * cw + 8) * gk), 1); }
  // el lápiz recorre los trazos: los completos se dibujan enteros, el actual hasta donde va la punta
  const prog = clamp((t - 20) / 90, 0, 1), dist = prog * CS.total; let penX = x0, penY = ty + 8, lifting = true;
  for (const st of CS.list) { if (dist <= st.start) break; const k = clamp((dist - st.start) / st.len, 0, 1); const S2 = st.pts; g.fillStyle = INK;
    for (let i = 1; i < S2.length; i++) { const segEnd = i / (S2.length - 1), segStart = (i - 1) / (S2.length - 1); if (k <= segStart) break; const kk = clamp((k - segStart) / (segEnd - segStart), 0, 1); const ex = lerp(S2[i - 1][0], S2[i][0], kk), ey = lerp(S2[i - 1][1], S2[i][1], kk); pstroke(S2[i - 1][0], S2[i - 1][1], ex, ey, 2, INK, 1, 0, false); }
    if (k < 1) { const q = pointAt(S2, k); penX = q[0]; penY = q[1]; lifting = false; } }
  if (prog >= 1) { lifting = true; }
  if (t > 20 && t < 112 && lifting) { const nx = CS.list.find(st => st.start >= dist); if (nx) { penX = nx.pts[0][0]; penY = nx.pts[0][1] - 4; } }
  // subrayado a mano al acabar, y floritura: el lápiz sube girando y se va
  const uk = clamp((t - 112) / 12, 0, 1); if (uk > 0) { g.fillStyle = INK; for (let i = 0; i < Math.round((word.length * cw + 6) * uk); i++) g.fillRect(x0 - 3 + i, ty + 12 + Math.round(Math.sin(i * .35) * 1.2), 1, 1); if (uk < 1) { penX = x0 - 3 + (word.length * cw + 6) * uk; penY = ty + 13; lifting = false; } }
  if (t > 20 && t < 140) { const img = propSprite('lapiz', C('amarillo')), P = PROP.lapiz, fk = clamp((t - 124) / 16, 0, 1), lift = lifting && uk >= 1 ? 1 : 0;
    const px = lift ? lerp(x0 + word.length * cw + 4, W + 40, fk * fk) : penX, py = lift ? lerp(ty + 13, -30, fk) : penY, ang = lift ? -.95 + fk * 5 : -.95 + Math.sin(t * .8) * .05;
    drawProp(img, px, py, ang, 1, P.tip[0], P.tip[1], 1, lift ? 1 - fk * .6 : 1); if (!lifting && t % 2 === 0) COVER.dust.push({ x: penX + R(-2, 2), y: penY - 1, vx: R(-.5, .5), vy: -R(.3, .9), t: 0, life: RI(8, 14), col: '#6a6480' }); }
  g.restore();
  // sticker de "presenta": estrella troquelada con borde blanco, se pega de un golpe girando, luego brilla y se menea
  if (t > 138) { const k = clamp((t - 138) / 10, 0, 1), e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), sc = lerp(2.6, 1, e), rot = lerp(-1.1, -.12, e) + (k >= 1 ? Math.sin(t * .09) * .03 : 0), sq = k >= 1 && t < 156 ? 1 + Math.sin((t - 148) / 8 * Math.PI) * .12 : 1;
    g.save(); g.translate(W / 2 + 64, 118); g.rotate(rot); g.scale(sc * sq, sc / sq);
    const star = (rx, ry, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28, r = i % 2 ? .82 : 1; if (i) g.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r); else g.moveTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r); } g.closePath(); g.fill(); };
    g.globalAlpha = .35; star(50, 26, '#2a1a10'); g.globalAlpha = 1; g.translate(-2, -2); star(50, 26, '#ffffff'); star(45, 22, C('violeta')); star(41, 19, ramp(C('violeta')).hi); star(38, 16, C('violeta'));
    txt('presenta', -32, -4, '#fff3c0', '#4a2a6a');
    if (k >= 1) { const sh = ((t - 148) % 150) / 150; if (sh < .3) { g.globalAlpha = .45; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-44 + sh * 300, -6, 6, 14, .4, 0, 6.29); g.fill(); g.globalAlpha = 1; } g.globalAlpha = .5; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-18, -10, 12, 3, -.1, 0, 6.29); g.fill(); g.globalAlpha = 1; }
    g.restore(); }
  for (const d of COVER.dust || []) { g.fillStyle = d.col; g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }
}
function drawCover() {
  const t = COVER.t;
  if (!COVER.open) { drawCoverArt(t * 1.35); return; }
  if (!COVER.snap) { COVER.snap = document.createElement('canvas'); COVER.snap.width = W; COVER.snap.height = H; COVER.snap.getContext('2d').drawImage(buf, 0, 0); }
  TITLE.t = 0; drawTitle(); TITLE.t = 0; // debajo, la primera página del título
  const k = clamp((t - COVER.open) / 38, 0, 1); pageCurl(COVER.snap, k * k * (3 - 2 * k), '#b8905e', '#a57f50');
}
// Pencil outlines and translucent washes share the same silhouette: colour really
// lands inside the drawing. All illustration coordinates are native 320×180.
function titleLine(points, col = '#969080', width = 1) {
  for (let i = 1; i < points.length; i++) pstroke(...points[i - 1], ...points[i], width, col, 1, 0, false);
}
function titlePath(points) {
  g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
}
function titleWash(points, col, amount, source, ink = '#8d8879', base = '#ebe4d2') {
  titlePath(points); g.fillStyle = base; g.fill();
  if (amount > 0) {
    g.save(); titlePath(points); g.clip();
    if (amount < 1) { g.beginPath(); g.arc(source[0], source[1], amount * 210, 0, Math.PI * 2); g.clip(); }
    g.globalAlpha = .7; g.fillStyle = col; g.fillRect(20, 98, 285, 74);
    const rnd = seeded(points[0][0] * 71 + points[0][1]);
    g.globalAlpha = .16; g.fillStyle = '#fff9e8';
    for (let i = 0; i < 100; i++) g.fillRect(24 + rnd() * 272 | 0, 102 + rnd() * 66 | 0, 2 + rnd() * 5 | 0, 1);
    g.restore();
  }
  titleLine([...points, points[0]], ink);
}
function titlePaper() {
  return cached('title-paper', () => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), rnd = seeded(614);
    x.fillStyle = '#d1c5ad'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { x.fillStyle = i & 1 ? '#a99b82' : '#e6dac2'; x.fillRect(7 + i, 3 + i, 307, 173 - i); }
    x.fillStyle = '#f5eedc'; x.fillRect(5, 2, 307, 172);
    x.fillStyle = '#e6dcc6'; x.fillRect(5, 2, 13, 172); x.fillStyle = '#eee5d1'; x.fillRect(18, 2, 6, 172);
    x.fillStyle = '#e5dcc7';
    for (let i = 0; i < 900; i++) x.fillRect(25 + rnd() * 284 | 0, 4 + rnd() * 166 | 0, 1, 1);
    x.fillStyle = '#fff9ea';
    for (let i = 0; i < 460; i++) x.fillRect(25 + rnd() * 284 | 0, 4 + rnd() * 166 | 0, 1, 1);
    for (let y = 15; y < 169; y += 22) {
      x.fillStyle = '#a59a82'; x.fillRect(10, y, 4, 3);
      x.fillStyle = '#665f55'; x.fillRect(1, y - 2, 12, 2); x.fillRect(0, y, 3, 3);
      x.fillStyle = '#c3bdaf'; x.fillRect(2, y - 2, 9, 1); x.fillStyle = '#fff8e6'; x.fillRect(3, y - 1, 3, 1);
    }
    return c;
  });
}
const TITLE_DROPS = [
  { at: 99, from: [67, 64], to: [87, 113], col: 'rojo', sound: 0 },
  { at: 132, from: [177, 64], to: [176, 151], col: 'azul', sound: 7 },
  { at: 165, from: [120, 64], to: [229, 145], col: 'amarillo', sound: 4 },
  { at: 183, from: [177, 64], to: [229, 145], col: 'azul', sound: 7 },
];
const titleProgress = (t, at, duration = 42) => clamp((t - at) / duration, 0, 1);
// Hand-pixelled art supplies: the landscape is built from actual drawing tools.
// The same sprite produces its graphite underdrawing and its painted reveal.
function titleObject(kind, col, paint, x, y, scale = 1, tilt = 0) {
  const spr = cached('title-object|' + kind + '|' + col, () => {
    const c = document.createElement('canvas'); c.width = 48; c.height = 58;
    const q = c.getContext('2d'), rp = ramp(col), out = '#534451';
    const F = (colour, a, b, w = 1, h = 1) => { q.fillStyle = colour; q.fillRect(a, b, w, h); };
    const poly = (points, colour) => { q.fillStyle = colour; q.beginPath(); points.forEach(([a, b], i) => i ? q.lineTo(a, b) : q.moveTo(a, b)); q.closePath(); q.fill(); };
    const oval = (cx, cy, rx, ry, colour) => { for (let row = -ry; row <= ry; row++) { const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry)))); F(colour, cx - half, cy + row, half * 2 + 1, 1); } };
    if (kind === 'brush') {
      // Lacquered handle, silver ferrule and individual loaded bristles.
      F(out, 20, 25, 7, 33); F('#aa7048', 21, 25, 5, 32); F('#e1b57a', 21, 29, 2, 25); F('#77503d', 25, 27, 1, 29);
      F(out, 13, 19, 21, 13); F('#8092a0', 14, 20, 19, 10); F('#dce3dc', 15, 21, 16, 2); F('#b7c3c2', 16, 24, 13, 4); F('#f8f3df', 15, 22, 2, 7); F('#596776', 30, 21, 2, 9); F('#ede9d4', 14, 30, 19, 1);
      poly([[12,20],[11,7],[14,3],[15,7],[17,1],[19,5],[21,0],[24,5],[28,2],[30,5],[33,3],[35,8],[34,20]], out);
      poly([[14,19],[13,8],[15,5],[17,8],[19,4],[21,7],[23,4],[26,8],[29,5],[32,7],[33,10],[32,20]], rp.base);
      for (let i = 0; i < 9; i++) { const a = 14 + i * 2, start = 7 + (i * 3) % 5; F(i % 3 ? rp.hi : rp.sh, a, start, 1, 18 - start); }
      F(rp.dk, 14, 17, 18, 3); F(rp.hi, 15, 6, 2, 3); F(rp.spec, 19, 5, 1, 3);
    } else if (kind === 'pencil') {
      poly([[17,57],[17,13],[23,0],[30,13],[30,57]], out);
      poly([[18,14],[23,2],[29,14]], '#dfb780'); poly([[21,6],[23,1],[26,7]], '#4b4654');
      F(rp.sh, 18, 14, 11, 37); F(rp.base, 19, 14, 6, 37); F(rp.hi, 20, 15, 2, 36); F(rp.dk, 27, 14, 2, 37);
      F('#7b8a99', 18, 50, 11, 4); F('#d1d6cb', 19, 51, 9, 1); F('#c5848b', 18, 54, 11, 3); F('#f0b3af', 19, 54, 8, 1);
      for (let b = 23; b < 42; b += 4) F('#f4dc89', 23, b, 1, 2);
    } else if (kind === 'jar') {
      // A home in a pigment jar: threaded lid, glass shoulders, paper label,
      // a little door cut in the label and a brush propped through the lid.
      poly([[33,21],[36,3],[39,2],[36,22]], '#544654'); poly([[34,20],[37,4],[38,4],[35,21]], '#c3935a');
      F('#e8e3d1', 35, 3, 5, 4); F(rp.dk, 35, 0, 5, 4); F(rp.base, 36, 0, 3, 3);
      oval(24, 54, 19, 3, out);
      poly([[8,52],[6,31],[10,23],[38,23],[42,31],[40,53],[34,57],[14,57]], out);
      poly([[10,51],[8,31],[12,25],[36,25],[40,31],[38,52],[32,55],[15,55]], '#b3c2b6');
      poly([[12,50],[10,32],[14,27],[34,27],[38,32],[36,52],[17,53]], rp.sh);
      F(rp.base, 12, 34, 24, 17); F(rp.hi, 13, 32, 8, 16); F(rp.dk, 34, 35, 3, 16);
      oval(24, 35, 12, 3, rp.base); F(rp.hi, 16, 33, 13, 1);
      F('#edf0dc', 9, 30, 2, 17); F('#f9f5e2', 10, 30, 1, 10); F('#d3ddc9', 37, 30, 1, 8);
      poly([[13,38],[33,37],[33,51],[13,52]], '#eee1b8'); F('#d0be91', 31, 38, 2, 13); F('#fff2ca', 14, 38, 16, 1);
      F('#73605b', 21, 44, 7, 10); F('#3f3544', 22, 45, 5, 9); F('#d4a459', 22, 45, 1, 8);
      F('#7c6b61', 15, 42, 4, 4); F('#f5c650', 16, 43, 2, 2); F('#7c6b61', 28, 41, 3, 4); F('#f5c650', 29, 42, 1, 2);
      oval(24, 23, 17, 4, out); F('#6f7a86', 7, 18, 35, 6); oval(24, 18, 17, 4, '#abb5b4'); oval(24, 17, 14, 2, '#e2e2cb');
      for (let a = 10; a < 40; a += 4) { F('#485360', a, 21, 1, 3); F('#d4d8cb', a + 1, 20, 1, 3); }
      oval(25, 17, 8, 1, rp.base); F(rp.hi, 21, 16, 5, 1);
    } else if (kind === 'tube') {
      poly([[3,40],[11,34],[33,44],[36,50],[29,55],[8,48]], out);
      poly([[5,40],[12,36],[32,45],[33,49],[28,52],[10,47]], '#c2c3b6');
      poly([[8,39],[12,37],[29,44],[24,48],[10,44]], '#f1edda');
      poly([[16,39],[24,42],[20,48],[13,45]], rp.base); poly([[18,40],[21,41],[18,46],[16,45]], rp.hi);
      for (let i = 0; i < 3; i++) F('#858c8d', 5 + i, 40 + i * 2, 2, 1);
      F('#655665', 32, 47, 6, 6); F(rp.base, 37, 49, 4, 3); F(rp.hi, 38, 49, 2, 1);
    } else if (kind === 'eraser') {
      poly([[8,46],[19,40],[40,46],[40,53],[29,58],[8,52]], out);
      poly([[10,46],[19,42],[37,46],[28,51]], '#f0b8b5'); poly([[10,47],[28,52],[28,56],[10,51]], '#bc788b'); poly([[29,52],[38,48],[38,52],[29,56]], '#d5909e');
      poly([[17,45],[24,43],[32,45],[24,50]], '#eee9d1'); poly([[17,48],[24,50],[24,55],[17,53]], '#aab8b4'); F('#597f94', 19, 50, 3, 1);
    }
    c.__key = 'title-object|' + kind + '|' + col;
    return c;
  });
  const sketch = cached(spr.__key + '|sketch', () => {
    const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height;
    const q = c.getContext('2d'), src = spr.getContext('2d').getImageData(0, 0, c.width, c.height), dest = q.createImageData(c.width, c.height), s = src.data, d = dest.data;
    for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
      const i = (yy * c.width + xx) * 4; if (s[i + 3] < 80) continue;
      const edge = xx === 0 || yy === 0 || xx === c.width - 1 || yy === c.height - 1 || !s[i - 4 + 3] || !s[i + 4 + 3] || !s[i - c.width * 4 + 3] || !s[i + c.width * 4 + 3];
      const dark = s[i] + s[i + 1] + s[i + 2] < 300, hatch = dark && (xx + yy * 2) % 4 === 0;
      const color = edge || hatch ? [151, 137, 115] : [236, 225, 199];
      d[i] = color[0]; d[i + 1] = color[1]; d[i + 2] = color[2]; d[i + 3] = 255;
    }
    q.putImageData(dest, 0, 0); return c;
  });
  if (paint > 0) {
    g.save(); g.globalAlpha = paint * .17; g.fillStyle = '#514354'; g.beginPath();
    g.ellipse(x + 2, y + 1, (kind === 'jar' ? 17 : kind === 'eraser' || kind === 'tube' ? 14 : 6) * scale, 2 * scale, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(tilt); g.scale(scale, scale);
  g.drawImage(sketch, -24, -58);
  if (paint > 0) { g.save(); if (paint < 1) { g.beginPath(); g.arc(0, kind === 'jar' || kind === 'brush' ? -41 : -22, paint * 85, 0, Math.PI * 2); g.clip(); } g.drawImage(spr, -24, -58); g.restore(); }
  g.restore();
}
function titleInkPool(x, y, w, t, eyes = false) {
  g.fillStyle = '#3d344e'; g.beginPath(); g.ellipse(x, y, w, w * .27, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#241f36'; g.beginPath(); g.ellipse(x - 1, y - 1, w * .75, w * .19, -.1, 0, Math.PI * 2); g.fill();
  titleLine([[x - w * .5, y - 2], [x - w * .15, y - 3]], '#6b597d');
  if (eyes && t % 270 > 9) { g.fillStyle = '#efe4bf'; g.fillRect(x + 1, y - 3, 2, 2); g.fillRect(x + 6, y - 3, 2, 2); }
}
function titleLandscape(t) {
  const red = titleProgress(t, 127), blue = titleProgress(t, 160), gold = titleProgress(t, 193), green = titleProgress(t, 211, 56);
  // Light abandoned construction lines make the unfinished parts legible.
  titleLine([[30, 143], [44, 124], [58, 129], [73, 113], [103, 117], [130, 130]], '#d3c4a7');
  titleLine([[226, 126], [240, 100], [273, 109], [293, 131]], '#d3c4a7');
  // The left shore is a painter's wooden palette; the right shore is a torn leaf.
  const palette = [[30,150],[36,140],[55,133],[78,129],[107,132],[131,143],[137,151],[128,162],[108,168],[54,168],[35,159]];
  titlePath(palette.map(([x,y]) => [x + 1,y + 3])); g.fillStyle = '#b5a68a'; g.fill();
  titleWash(palette, '#c2945e', red, [83,123], '#978163');
  if (red > 0) { g.save(); titlePath(palette); g.clip(); g.globalAlpha = red * .4;
    for (let y = 135; y < 172; y += 4) titleLine([[29,y],[57,y - 1],[104,y + 2],[134,y - 1]], '#97683f'); g.restore(); }
  g.fillStyle = '#78634f'; g.beginPath(); g.ellipse(46,150,7,4,-.4,0,6.29); g.fill();
  g.fillStyle = '#efe4c9'; g.beginPath(); g.ellipse(47,149,5,3,-.4,0,6.29); g.fill();
  const sheet = [[146,134],[173,124],[192,126],[206,121],[223,125],[243,122],[269,128],[289,141],[300,154],[291,161],[282,160],[272,167],[261,165],[249,169],[232,166],[211,170],[198,168],[181,170],[171,165],[151,162],[155,155],[149,151],[153,146],[146,142]];
  titlePath(sheet.map(([x,y]) => [x + 1,y + 3])); g.fillStyle = '#a99b82'; g.fill();
  titleWash(sheet, '#f0dbaa', gold, [175,140], '#baaa88', '#f1e7d0');
  titleLine([[166,165],[180,168],[196,166],[211,168],[230,164],[248,167],[262,163],[271,165],[282,158]], '#fff2d5');
  // A ragged ink-filled tear divides the paper. Carmín repairs the missing path.
  titleInkPool(142,153,17,t);
  for (let i = 0; i < 6; i++) { g.fillStyle = '#b6a789'; g.fillRect(127 + i * 5, 155 + (i % 3), 2, 1); }
  if (red > 0) {
    const repair = titleProgress(t,153,60), pts = [[114,151],[130,151],[140,148],[153,150],[163,147]];
    g.save(); g.beginPath(); g.rect(112,141,55 * repair,18); g.clip();
    titleLine(pts,'#994653',7); titleLine(pts,'#df6b62',5); titleLine(pts,'#f39a77',2); g.restore();
  }
  // Blue paint curls across the paper and drips over its torn edge.
  const stream = [[195,121],[199,128],[194,134],[183,139],[180,145],[187,151],[189,157],[179,168],[164,169],[174,158],[172,151],[167,145],[169,137],[182,131],[186,124]];
  titleWash(stream,'#539dcc',blue,[176,151],'#958a87');
  if (blue > 0) {
    g.save(); g.globalAlpha = blue;
    titleLine([[189,128],[185,134],[175,140],[176,147],[182,155],[174,165]],'#93d0db',2);
    titleLine([[194,132],[180,140],[182,147]],'#327eaf',2);
    for (let i = 0; i < 5; i++) { const shift = Math.sin(t * .025 + i) * 2; titleLine([[174 + shift,139 + i * 6],[178 + shift,139 + i * 6]],'#d2eadb'); }
    const fall = t % 75; if (fall < 40) { g.fillStyle = '#4a8bbb'; g.fillRect(169,169 + fall * .08 | 0,2,2); }
    g.restore();
  }
  // Back-to-front prop order gives the tiny tableau depth and recognisable scale.
  titleObject('pencil',C('violeta'),blue,48,141,.58,-.14);
  titleObject('pencil',C('amarillo'),gold,60,139,.74,.1);
  titleObject('jar',C('rojo'),red,87,143,.8);
  // Steps into the label-door are stacked squares of an eraser.
  titleLine([[83,145],[96,145]],'#827583',3); titleLine([[81,148],[96,148]],'#e1b0a7',3); titleLine([[81,147],[95,147]],'#f5d1b6');
  titleObject('brush','#5b9995',green,252,139,.58,.2);
  titleObject('brush','#71a04b',green,233,148,.79,-.13);
  titleObject('pencil',C('azul'),blue,271,149,.68,.2);
  titleObject('brush','#d49445',gold,285,150,.5,.08);
  // A ruler is cantilevered between the two shores. Ámbar adds its last marks.
  titleWash([[124,137],[185,133],[191,140],[129,145]],'#dcab53',gold,[160,140],'#82715b');
  titleLine([[129,145],[191,140],[191,143],[129,148],[129,145]],'#816340');
  if (gold > 0) { g.save(); g.globalAlpha = gold; titleLine([[129,144],[189,139]],'#f8d78b');
    for (let x = 131; x < 187; x += 4) { const y = 137 - (x - 131) * .065; titleLine([[x,y],[x + 1,y + ((x - 131) % 12 ? 2 : 4)]],'#705b45'); }
    g.restore(); }
  // Pigment pools on the palette are thick dabs with a wet highlight.
  [[64,159,'rojo',red],[77,163,'amarillo',gold],[94,161,'azul',blue]].forEach(([x,y,col,k]) => {
    if (!k) return; g.save(); g.globalAlpha = k; g.fillStyle = ramp(C(col)).sh;
    g.beginPath(); g.ellipse(x,y,6,2.5,0,0,6.29); g.fill(); g.fillStyle = C(col); g.fillRect(x - 4,y - 2,7,2); g.fillStyle = ramp(C(col)).hi; g.fillRect(x - 3,y - 2,3,1); g.restore();
  });
  titleObject('tube',C('rojo'),red,47,164,.65,-.08);
  titleObject('eraser',C('rojo'),gold,263,166,.66,-.08);
  // The ink has not disappeared: two quiet eyes watch from an unfinished corner.
  titleInkPool(287,158,10,t,true);
  for (const [x,y] of [[209,137],[200,157],[242,162],[291,144]]) {
    titleLine([[x,y],[x + 3,y - 2],[x + 2,y + 1],[x + 5,y - 1]],'#bdac8b');
  }
  // Añil's water and the yellow pigment make a plant grow out of a pencil shaving.
  titleLine([[221,151],[229,150],[231,153],[224,156],[219,154],[221,151]],'#a68051');
  if (green > 0) {
    const tipY = 153 - green * 18;
    titleLine([[225,154],[226,145],[230,tipY]],'#537e47',2);
    titleLine([[226,147],[220,143],[218,143],[222,147],[226,147]],'#7ba450',2);
    titleLine([[228,142],[234,140],[236,141],[231,144]],'#94b960',2);
    if (green > .65) { g.fillStyle = '#eac35b'; g.fillRect(228,tipY - 3,5,5); g.fillStyle = '#8b693e'; g.fillRect(230,tipY - 1,2,2); g.fillStyle = '#ffeb97'; g.fillRect(228,tipY - 3,2,1); }
  }
}
function titleDroplets(t) {
  TITLE_DROPS.forEach((d, i) => {
    const age = t - d.at; if (age < 0 || age > 55) return;
    if (age < 28) {
      const q = age / 28, x = lerp(d.from[0], d.to[0], q), y = lerp(d.from[1], d.to[1], q * q);
      g.fillStyle = ramp(C(d.col)).out; g.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 5);
      g.fillStyle = C(d.col); g.fillRect(Math.round(x), Math.round(y) - 2, 2, 4); g.fillStyle = '#fff7dd'; g.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
    } else {
      const q = (age - 28) / 27; g.save(); g.globalAlpha = 1 - q;
      for (let n = 0; n < 7; n++) { const a = n * Math.PI * 2 / 7; g.fillStyle = C(d.col); g.fillRect(Math.round(d.to[0] + Math.cos(a) * q * 13), Math.round(d.to[1] + Math.sin(a) * q * 6 - Math.sin(q * Math.PI) * 3), 2, 1); }
      g.restore();
    }
  });
}
function titleResidents(t) {
  // Each protagonist uses their own tool on the world, then settles into a quiet
  // working pose. Their gestures are staggered so they do not compete with the logo.
  const actor = (id, col, x, y, appear, flip = true) => {
    if (appear <= 0) return;
    g.save(); g.globalAlpha = appear;
    drawSprite(buildSprite(id + '_side_mini', C(col), null, { eyes: t % 240 < 7 ? 'blink' : 'normal' }), x, y, 1, flip);
    g.restore();
  };
  const red = titleProgress(t,127,25), blue = titleProgress(t,160,25), gold = titleProgress(t,193,25);
  if (red > 0) {
    const painting = titleProgress(t,153,60), idle = t % 600, working = t < 230 || idle > 480;
    const x = 108 + painting * 12, tip = [x + 15, 151 + (working ? Math.sin(t * .1) : 0)];
    actor('carmin','rojo',Math.round(x),158,red);
    g.save(); g.globalAlpha = red;
    const P = PROP.brocha; drawProp(propSprite('brocha',C('rojo')),tip[0],tip[1],-.1 + (working ? Math.sin(t * .08) * .12 : 0),1,P.tip[0],P.tip[1],.3);
    if (working && t % 32 < 12) { g.fillStyle = '#e16f68'; g.fillRect(tip[0] + 2,tip[1] + 2,2,1); }
    g.restore();
  }
  if (gold > 0) {
    const cycle = t % 720, travel = clamp((cycle - 280) / 150,0,1) - clamp((cycle - 580) / 100,0,1), x = 147 + travel * 22, y = 137 - travel * 2;
    actor('ambar','amarillo',Math.round(x),Math.round(y),gold,cycle <= 580);
    if (cycle < 270 || cycle > 695) { g.save(); g.globalAlpha = gold;
      const P = PROP.lapiz; drawProp(propSprite('lapiz',C('amarillo')),x + 10,y + 2,-.6 + Math.sin(t * .12) * .08,1,P.tip[0],P.tip[1],.38); g.restore(); }
  }
  if (blue > 0) {
    actor('anil','azul',207,165,blue);
    g.save(); g.globalAlpha = blue;
    const P = PROP.pincel, watering = t < 270 || t % 480 < 100;
    drawProp(propSprite('pincel',C('azul')),221,150,-.72 + (watering ? Math.sin(t * .06) * .12 : 0),1,P.tip[0],P.tip[1],.36);
    if (watering) { const fall = (t % 32) / 32; g.fillStyle = '#438dbd'; g.fillRect(222 + fall * 2 | 0,150 + fall * 5 | 0,1,2); }
    g.restore();
  }
}
// The transparent native button supplies pointer, keyboard focus and an accessible
// name while its visible lettering belongs to the same pixel-art canvas.
const titleStartButton = document.createElement('button');
titleStartButton.type = 'button'; titleStartButton.textContent = 'Comenzar'; titleStartButton.setAttribute('aria-label', 'Comenzar aventura');
titleStartButton.style.cssText = 'position:fixed;display:none;border:0;padding:0;background:transparent;color:transparent;cursor:pointer;outline:none;';
document.body.appendChild(titleStartButton);
function placeTitleButton() {
  const r = cv.getBoundingClientRect();
  Object.assign(titleStartButton.style, { left: r.left + 111 * SCALE + 'px', top: r.top + 77 * SCALE + 'px', width: 105 * SCALE + 'px', height: 27 * SCALE + 'px' });
}
addEventListener('resize', placeTitleButton);
titleStartButton.addEventListener('click', () => { if (Game.state === 'title' && !TITLE.exit) { Audio.init(); beginTitleGame(); } });
function beginTitleGame() {
  if (TITLE.exit) return;
  TITLE.t = Math.max(TITLE.t, 280); TITLE.exit = TITLE.t;
  TITLE.snap = null; titleStartButton.style.display = 'none';
  Audio.sfx('confirm', { semi: 0 }); Audio.sfx('confirm', { semi: 4, when: .08 }); Audio.sfx('confirm', { semi: 7, when: .16 });
}
function updateTitle() {
  TITLE.t++;
  if (TITLE.exit) {
    const ex = TITLE.t - TITLE.exit;
    // Snapshot before changing state; world setup belongs to the update, not render.
    if (ex === 20) {
      TITLE.snap = document.createElement('canvas'); TITLE.snap.width = W; TITLE.snap.height = H; TITLE.snap.getContext('2d').drawImage(buf, 0, 0);
      initOverworld(); OW.landT = 999; OW.msgHold = true; Audio.prepare(worldCue()); Audio.sfx('page');
    }
    if (ex >= 60) { TITLE.exit = 0; TITLE.snap = null; OW.landT = 48; OW.msgHold = false; setState('overworld'); }
    return;
  }
  if (TITLE.t === 90) { titleStartButton.style.display = 'block'; placeTitleButton(); }
  for (const d of TITLE_DROPS) if (TITLE.t === d.at + 28) Audio.sfx('plop', { semi: d.sound, vol: .4 });
  if (TITLE.t === 213) Audio.sfx('grow', { vol: .25, semi: 4 });
  if (hit('ok')) beginTitleGame();
}
function drawTitle() {
  const t = TITLE.t, ex = TITLE.exit ? t - TITLE.exit : 0;
  if (ex >= 20 && TITLE.snap) { drawOverworld(); const q = clamp((ex - 20) / 40, 0, 1); pageCurl(TITLE.snap, q * q * (3 - 2 * q)); return; }
  g.drawImage(titlePaper(), 0, 0);
  titleLandscape(t); titleResidents(t);
  // Retain the original brush-painted letterforms, with more room and a calm idle.
  g.save(); g.translate(46, 25); g.scale(1.25, 1.25); drawLogo(t, 0, 0); g.restore();
  titleDroplets(t);
  if (t >= 90) {
    const k = titleProgress(t, 90, 36), pressed = TITLE.exit > 0, focused = titleStartButton.matches(':hover, :focus-visible');
    const label = handStrokes('comenzar', 117, 79, 1.25, 12);
    // The wash beneath the handwriting becomes a full brushstroke on confirmation.
    if (pressed || focused) { g.save(); g.globalAlpha = pressed ? .3 : .14; titleLine([[117, 94], [148, 93], [211, 94]], '#d5a13a', 5); g.restore(); }
    drawHand(label, label.total * k, '#645c51', 2);
    const underline = titleProgress(t, 123, 18);
    titleLine([[118, 96], [118 + 92 * underline, 96]], pressed ? '#b37c27' : '#aaa08a', pressed ? 2 : 1);
    if (k >= 1) { g.fillStyle = pressed ? '#ba8735' : '#8e826c'; g.fillRect(106, 87, 2, 5); g.fillRect(108, 88, 2, 3); }
  }
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
  if (typeof SFX !== 'undefined') { const want = (Game.state === 'overworld' || Game.state === 'title') ? Game.palette : null; if ((SFX.amb ? SFX.amb.mode : null) !== want) SFX.ambient(want); }
  if (Game.paused) { for (const k in pressed) pressed[k] = false; return; }
  Game.t++;
  switch (Game.state) {
    case 'cover': updateCover(); break;
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
    case 'cover': drawCover(); break;
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
  Game, Party, OW, B, DATA, MAP, Audio, SFX,
  battle(key) { const f = OW.foes.find(x => x.key === String(key)); if (f) { startTransition(f); } return !!f; },
  heal() { Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); },
  atb() { if (B.party) B.party.forEach(u => u.atb = 100); },
  kill() { if (B.enemies) B.enemies.forEach(u => u.alive && (u.hp = 1)); },
  win() { if (B.enemies) B.enemies.forEach(u => u.alive && kill(u)); checkEnd(); },
  start() { if (Game.state === 'title' || Game.state === 'cover') { initOverworld(); setState('overworld'); Audio.play(worldCue()); } },
  title(t) { setState('title'); TITLE.t = t; },
  pause(v = !Game.paused) { Game.paused = v; },
  colorize() { Game.palette = Game.palette === 'gris' ? 'vivo' : 'gris'; },
  sprite(o) { return makeDrop(o); },
};
const boot = () => { document.getElementById('hint').hidden = true; requestAnimationFrame(frame); };
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(boot, boot); else boot();
