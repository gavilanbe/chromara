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
  const area = typeof mobileViewport === 'function' ? mobileViewport() : { width:innerWidth, height:innerHeight - 20 };
  const available = Math.max(.1, Math.min(area.width / W, area.height / H));
  SCALE = Math.max(1, Math.floor(available));
  const displayScale = area.fractional || available < 1 ? available : SCALE;
  if (cv.width !== W * SCALE || cv.height !== H * SCALE) { cv.width = W * SCALE; cv.height = H * SCALE; }
  cv.style.width = W * displayScale + 'px'; cv.style.height = H * displayScale + 'px';
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
  if (typeof chapterTitleButton !== 'undefined' && e.target === chapterTitleButton && ['Enter',' '].includes(e.key)) return;
  if (e.key === 'Tab' && (Game.state === 'cover' || Game.state === 'prologue' || Game.state === 'title')) return;
  if (captureBinding(e)) return;
  const k = actionForKey(e.key);
  if (!k) return;
  e.preventDefault();
  keyboardAction(k, true);
  Audio.init();
});
addEventListener('keyup', e => { const k = actionForKey(e.key); if (k) keyboardAction(k, false); });
let ANYKEY = false; addEventListener('keydown', e => { if (e.repeat) return; ANYKEY = true; Audio.init(); }); // cualquier tecla (portada)
const hit = k => { const v = pressed[k]; pressed[k] = false; return !!v; };

addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm' && !e.repeat) {
    toggleSound();
    document.getElementById('hint').textContent = 'Flechas/WASD mover · Z/Enter confirmar · X/Esc atrás · Enter: menú · M ' + (Audio.muted ? 'activar sonido' : 'silenciar') + ' · F1 debug';
  }
});
// Pause audio with the tab and release held keys, avoiding a hidden ambient loop.
document.addEventListener('visibilitychange', () => {
  releaseInputs();
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
  } else if (kind === 'r') { // goma de borrar bicolor en tres cuartos, medio hundida en el papel
    px(x, p.grassDk, 2, 14, 13, 1);
    px(x, '#3a2c3e', 1, 5, 14, 9); px(x, '#3a2c3e', 3, 3, 13, 2);
    px(x, '#e88a9e', 2, 6, 7, 7); px(x, '#f4b8c4', 3, 4, 7, 2); px(x, '#6fa0d0', 9, 6, 5, 7); px(x, '#a8cce8', 10, 4, 5, 2); px(x, '#4a78a8', 14, 5, 1, 7); // rosa y azul, cara de arriba y costado
    px(x, '#f4ecd8', 7, 6, 3, 7); px(x, '#fffaf0', 7, 4, 3, 2); px(x, '#e8a830', 8, 8, 1, 2); // funda
    px(x, '#fff0f4', 2, 6, 1, 5); px(x, '#b0506a', 2, 12, 5, 1); px(x, '#3a5a88', 10, 12, 4, 1); px(x, '#ffffff', 4, 4, 2, 1);
  } else if (kind === 'x') stain(x, '#2a2438', '#3e3852');
}
function drawWaterTile(x, p, m, vr, frame) { // aguada: azul lavado con charcos más claros que se mueven, borde oscuro que florece y un hilo de papel en el canto; ondas a lápiz
  const rnd = seeded(vr * 53 + 11), sh = [0, 1, 2, 1][frame];
  x.fillStyle = p.wash; x.fillRect(0, 0, 16, 16);
  x.globalAlpha = .24;
  for (let i = 0; i < 2; i++) { const cx = (rnd() * 16 | 0) + sh, cy = rnd() * 16 | 0, r = 3 + (rnd() * 3 | 0); x.fillStyle = p.washHi; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy * 2 <= r * r) x.fillRect((cx + dx) & 15, (cy + dy) & 15, 1, 1); }
  x.globalAlpha = .65;
  const dashes = [[2, 4, 4], [10, 11, 3]]; dashes.forEach(([dx, dy, len], i) => { const s2 = i & 1 ? -sh : sh; x.fillStyle = i ? p.washDk : p.foam; for (let k = 0; k < len; k++) x.fillRect((dx + s2 + k) & 15, dy, 1, 1); });
  x.globalAlpha = 1;
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
  const ch = tileAt(tx, ty), cls = tileCls(tx, ty, pal), v = hash2(tx, ty), p = worldGroundPalette(tx, ty, pal);
  let key, draw;
  if (cls === 'w') { const m = nbMask(tx, ty, 'w', pal), vr = v & 3; key = `w|${m}|${vr}|${frame}`; draw = x => drawWaterTile(x, p, m, vr, frame); }
  else if (cls === 'p') { const wm = nbMask(tx, ty, 'w', pal) & 15, pm = nbMask(tx, ty, 'p', pal) | wm, vr = v & 7; key = `p|${pm}|${wm}|${vr}`; draw = x => drawRoadTile(x, p, pm, wm, vr); }
  else if (cls === 'i') { const m = nbMask(tx, ty, 'i', pal), vr = v & 7; key = `i|${m}|${vr}|${ch === 'x' ? 1 : 0}`; draw = x => drawInkTile(x, p, m, vr, ch === 'x'); }
  else { const kind = ch === 'T' ? 'T' : ch === 'r' ? 'r' : (ch === 'x' && pal === 'gris') ? 'x' : '.', vr = (v >>> 8) & 15; key = `g|${kind}|${vr}`; draw = x => drawGrassTile(x, p, pal, kind, vr); }
  return cached(`tile|${p.key}|${key}`, () => { const c = document.createElement('canvas'); c.width = c.height = TILE; draw(c.getContext('2d')); c.__key = `${p.key}|${key}`; return c; });
}
// Bosque de utensilios 16×24: pinceles clavados (mechón de cerdas cargado de color arriba, mango de madera) y lápices (cuerpo de color, cono de madera, mina). Los contiguos juntan sus mechones en setos.
const TREE_COLS = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'];
function treeSprite(pal, mL, mR, vr, zone) { // zone: el color de la región tiñe su seto; sin zona, el arcoíris de siempre
  return cached(`tree2|${pal}|${mL ? 1 : 0}|${mR ? 1 : 0}|${vr}|${zone ? zone.color + (zone.drained ? 'd' : '') : ''}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d');
    const hue = zone ? (vr % 4 === 3 ? TREE_COLS[(TREE_COLS.indexOf(zone.color) + (vr & 4 ? 1 : 5)) % 6] : zone.color) : TREE_COLS[vr % 6], tint = ramp(worldPigment(hue, pal, !!zone?.drained)), pencil = vr % 3 === 2 && !mL && !mR;
    const INK = '#2a2438', F = (col, a, b, w = 1, h = 1) => px(x, col, a, b, w, h);
    // montoncito de tierra y sombra donde se clava
    F('rgba(40,28,20,.28)', 3, 22, 10, 2); F('#8a7050', 5, 22, 6, 1); F('#a88a64', 6, 21, 4, 1);
    if (pencil) { // lápiz clavado: tres caras de laca, cono de madera con veta, mina con brillo, virola rayada y goma
      F(INK, 4, 3, 8, 19); F(INK, 6, 1, 4, 3); F(INK, 7, 0, 2, 1);
      F(tint.hi, 5, 6, 2, 13); F(tint.base, 7, 6, 2, 13); F(tint.sh, 9, 6, 2, 13); F('#ffffff', 5, 7, 1, 4); F(tint.dk, 10, 6, 1, 13); // facetas
      F('#e8c890', 5, 3, 6, 3); F('#c9a070', 8, 3, 3, 3); F('#b08850', 7, 4, 1, 2); F('#3a3652', 7, 1, 2, 2); F('#8c8ab0', 7, 1, 1, 1); // cono y mina
      F('#c9c4d4', 5, 18, 6, 2); F('#8c8ab0', 5, 19, 6, 1); F('#6a6480', 7, 18, 1, 2); F('#e89aa8', 5, 20, 6, 2); F('#f4c0c8', 5, 20, 2, 1); // virola y goma
      return c;
    }
    // pincel clavado: mango de madera con veta, virola engarzada y mechón de cerdas cargado de pintura, que se une al vecino
    F(INK, 6, 13, 4, 10); F(p.wood2, 7, 13, 2, 9); F(p.wood, 7, 13, 1, 9); F('#8a5a34', 8, 16, 1, 2); F('#8a5a34', 8, 19, 1, 1); // mango
    F(INK, 4, 10, 8, 4); F('#9aa0b0', 5, 10, 6, 3); F('#d8dce8', 5, 10, 6, 1); F('#5a5f70', 5, 12, 6, 1); F(INK, 7, 11, 1, 1); // virola
    const ph = vr * 1.3, inside = (X, Y) => { if (Y < 0 || Y > 11) return false; const u = (X + .5 - 8) / 7.2, w = (Y + .5 - 5.5) / 5.8, ell = u * u + w * w <= 1 + .08 * Math.sin(X * 2.3 + ph);
      if (X < 0) return mL && Y >= 1 && Y <= 10; if (X > 15) return mR && Y >= 1 && Y <= 10; return ell || (mL && X < 8 && Y >= 1 && Y <= 10) || (mR && X > 7 && Y >= 1 && Y <= 10); };
    for (let Y = 0; Y <= 11; Y++) for (let X = 0; X < 16; X++) { if (!inside(X, Y)) continue;
      if (!inside(X - 1, Y) || !inside(X + 1, Y) || !inside(X, Y - 1) || !inside(X, Y + 1)) { F(INK, X, Y); continue; }
      const k = (X - 8) * -.5 + (5.5 - Y) * .9 + ((X + vr) % 3 === 0 ? -.8 : 0); F(k > 2.4 ? tint.hi : k > 0 ? tint.base : k > -2.2 ? tint.sh : tint.dk, X, Y); } // cerdas con volumen: luz arriba a la izquierda y vetas
    F('#ffffff', 5, 2, 2, 1); F(tint.hi, 4, 3, 1, 2);
    if (vr % 4 === 1) { F(tint.base, 11, 12, 1, 3); F(tint.sh, 10, 14, 3, 1); F(INK, 11, 15, 1, 1); } // un goterón de pintura
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
    else if (ch === 'M') { MAP.merchant = { x, y }; ch = '.'; }
    else if (ch === 'S') { (MAP.signs = MAP.signs || []).push({ x, y, lines: DATA.signs[x + ',' + y] || ['Post-it'] }); ch = '.'; }
    else if (ch === 'f') { MAP.fold = [x, y]; ch = '.'; }
    else if ('HRQpNgoveE'.includes(ch)) { // piezas de las magias de campo (field.js): se agrupan por vecindad al leerlas
      const P = MAP.pz = MAP.pz || { torn: [], ink: [], pins: [], puddle: [], sketch: [], chests: [] }, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => (DATA.map[y + b] || '')[x + a]);
      if (ch === 'H') P.torn.push([x, y]); else if (ch === 'R' || ch === 'Q') P.ink.push([x, y]); else if (ch === 'p') P.pins.push([x, y]); else if (ch === 'N') P.puddle.push([x, y]);
      else if (ch === 'E') P.estuche = [x, y]; else if (ch === 'e') P.chests.push([x, y]);
      else { const water = nb.includes('~'); if (!water) P.ink.push([x, y]); P.sketch.push([x, y, { g: 'verde', o: 'naranja', v: 'violeta' }[ch]]); ch = water ? '~' : 'R'; }
      ch = ch === '~' ? '~' : ch === 'R' || ch === 'Q' ? ',' : '.'; // debajo: agua, tinta (suelo tiznado, sólido por field.js) o hierba
    }
    else if (DATA.encounters[ch]) { MAP.spots.push({ key: ch, x, y }); ch = ch === 'B' ? ',' : (ch === '5' ? ',' : '.'); }
    out += ch;
  }
  MAP.rows.push(out);
});
const tileAt = (tx, ty) => (ty < 0 || ty >= MAP.h || tx < 0 || tx >= MAP.w) ? 'T' : MAP.rows[ty][tx];
const solid = ch => ch === 'T' || ch === '~' || ch === 'r';

// --- Texto y ventanas
// Los números y rótulos del mundo usan la letra de brocha del cuaderno (font.js).
function txt(s, x, y, col = '#f4f0ea', shadowCol = '#14121c') { return bigText(s, x, y, col, { outline: shadowCol || null }); }
function txtC(s, cx, y, col, sh) { txt(s, Math.round(cx - rotuloWidth(s) / 2), y, col, sh); }
function bar(x, y, w, h, t, col, bg = '#0b0912') { g.fillStyle = bg; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x + 1, y + 1, Math.round((w - 2) * clamp(t, 0, 1)), h - 2); }
function cursor(x, y, col = '#f4f0ea') { g.fillStyle = col; g.fillRect(x, y, 1, 5); g.fillRect(x + 1, y + 1, 1, 3); g.fillRect(x + 2, y + 2, 1, 1); g.fillStyle = '#14121c'; g.fillRect(x, y + 5, 3, 1); }

// =====================================================================
// 3. Estado global de partida
// =====================================================================
const PUZ0 = () => fieldPuzzleState();
const Game = { state: 'cover', owned: {}, puzzle: null, t: 0, pigmento: 0, palette: 'gris', inventory: { ...DATA.inventory }, studies: {}, techLevels: {}, seenTechs: new Set(), overlay: null, defeated: new Set(), met: new Set(), bossDown: false, intro: true, debug: false }; // met: grupos de enemigos ya vistos (transición corta)
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
  if (typeof chapterTitleButton !== 'undefined' && chapterTitleButton && s !== 'title') chapterTitleButton.style.display = 'none';
  document.getElementById('hint').hidden = s === 'cover' || s === 'prologue' || s === 'title';
  if (s !== 'title') titleStartButton.style.display = 'none';
}

// =====================================================================
// 4. Mapa del mundo (overworld)
// =====================================================================
const OW = { x: 0, y: 0, cam: { x: 0, y: 0 }, hist: [], moving: false, t: 0, msg: null, menu: null, foes: [] };
function initOverworld() {
  if (!Game.puzzle) Game.puzzle = PUZ0();
  if (OW.act) OW.act.return();
  OW.act = OW.ring = OW.cast = OW.fieldCast = OW.fieldToast = null; OW.fieldSelection = 0;
  OW.x = MAP.spawn[0] * TILE + 8; OW.y = MAP.spawn[1] * TILE + 12; OW.hist = []; OW.puddles = []; OW.dust = []; OW.vx = OW.vy = 0; OW.bob = 0; OW.dir = 'down'; OW.landT = 0; OW.landZ = null; OW.landed = [0, 0, 0]; OW.jar = rinseState(); OW.heal = null; OW.floats = []; OW.cam.x = clamp(OW.x - W / 2, 0, MAP.w * TILE - W); OW.cam.y = clamp(OW.y - H / 2, 0, MAP.h * TILE - H);
  OW.hideFoe = null; OW.scare = null; OW.foes = MAP.spots.map(s => ({ key: s.key, hx: s.x * TILE + 8, hy: s.y * TILE + 12, x: s.x * TILE + 8, y: s.y * TILE + 12, tx: 0, ty: 0, t: RI(0, 60), enemies: DATA.encounters[s.key], boss: !!DATA.enemies[DATA.encounters[s.key][0]].boss, seed: s.x * 7 + s.y }));
  if (Game.intro) OW.msg = { lines: DATA.texts.intro, t: 0 };
  OW.msgWait = true;
}
function pzSolidTile(tx, ty) { return fieldPuzzleOverride(tx, ty) === true; }
function walkable(px, py) { // hitbox pies 8×6
  if (typeof chapterBlocked === 'function' && chapterBlocked(px, py)) return false;
  if (worldBlocked(px, py) || merchantBlocked(px, py)) return false;
  if (MAP.jar) { const jx = MAP.jar.x * TILE, jy = MAP.jar.y * TILE; if (px > jx - 4 && px < jx + 36 && py > jy - 2 && py < jy + 30) return false; }
  for (const [dx, dy] of [[-4, -1], [3, -1], [-4, 3], [3, 3]]) {
    const tx = (px + dx) / TILE | 0, ty = (py + dy) / TILE | 0, o = fieldPuzzleOverride(tx, ty); // las magias abren (o cierran) casillas
    if (o === true) return false; if (o === false) continue;
    if (solid(tileAt(tx, ty))) return false;
  }
  return true;
}
// A room change settles for 24 frames before switching; crossing the doorway
// cannot repeatedly restart the cues. Returning from combat resumes the phrase.
function worldCue() {
  if (Game.page === 1) return typeof CHAPTER !== 'undefined' && CHAPTER.complete ? 'restored' : 'atelier';
  if (Game.palette === 'vivo') return 'restored';
  return OW.x >= 28 * TILE && OW.y >= 16 * TILE ? 'atelier' : 'map';
}
function updateWorldMusic() {
  const cue = worldCue();
  if (OW.musicWant !== cue) { OW.musicWant = cue; OW.musicWait = 0; Audio.prepare(cue); }
  if (++OW.musicWait >= 24 && Audio.cur !== cue) Audio.play(cue, { resume: true, fade: .65 });
}
function updateOverworld() {
  OW.t++; rinseTick();
  if (OW.fieldToast?.t > 0) OW.fieldToast.t--;
  if (!OW.landT) updateWorldMusic();
  if (OW.landT > 0) { // entrada: caen del cielo y salpican, uno tras otro
    if (OW.landT > 900) return; OW.landT--; OW.landZ = OW.landZ || [0, 0, 0];
    Party.forEach((p, i) => { const k = clamp((48 - OW.landT - i * 6) / 26, 0, 1); OW.landZ[i] = k >= 1 ? 0 : 120 * (1 - k * k); if (k >= 1 && !OW.landed[i]) { OW.landed[i] = 1; Audio.sfx('plop', { semi: [0, 4, 7][i] }); for (let j = 0; j < 8; j++) OW.dust.push({ x: OW.x - i * 12 + R(-4, 4), y: OW.y + 1, vx: R(-1.2, 1.2), vy: -R(.5, 1.6), col: C(p.color), t: 0, life: RI(12, 20) }); } });
    if (OW.landT === 0) { OW.landZ = null; Audio.play(worldCue(), { resume: true }); Audio.sfx('page', { vol: .4 }); }
    for (const d of OW.dust) { d.x += d.vx; d.y += d.vy; d.vy += .12; d.t++; } OW.dust = OW.dust.filter(d => d.t < d.life);
    return;
  }
  if (OW.msg) {
    if (OW.landT > 0) return; OW.msg.t++;
    // The pen writes the note; confirming finishes the ink first and closes the note after.
    const body = OW.msg.lines.slice(1).filter(Boolean).join(' '), wrote = OW.msg.wrote || 0; if (OW.msg.ch == null) OW.msg.ch = 0;
    const done = writerAdvance(OW.msg, body); if (Math.floor((OW.msg.wrote || 0) / 3) !== Math.floor(wrote / 3)) Audio.sfx('text', { vol: .4 });
    if (OW.msg.t > 20 && (hit('ok') || hit('back'))) { if (!done) { OW.msg.ch = Infinity; return; } OW.msg = null; Audio.sfx('page'); Game.intro = false; if (OW.msg === null && Game.bossDown && !Game.ended) Game.ended = true; }
    return;
  }
  const J = OW.jar;
  for (const f of OW.prints || []) f.t++; if (OW.prints) OW.prints = OW.prints.filter(f => f.t < 150);
  for (const f of OW.floats || []) f.t++; OW.floats = (OW.floats || []).filter(f => f.t < 50);
  if (OW.heal) { if (OW.heal.next().done) OW.heal = null; for (const d of OW.dust) { d.x += d.vx; d.y += d.vy; d.vy += .12; d.t++; } OW.dust = OW.dust.filter(d => d.t < d.life); return; }
  if (OW.act) { if (OW.act.next().done) OW.act = null; for (const d of OW.dust) { d.x += d.vx; d.y += d.vy; d.vy += .12; d.t++; } OW.dust = OW.dust.filter(d => d.t < d.life); return; }
  if (OW.ring) { updateRing(); return; }
  if (OW.menu) { updateMenu(); return; }
  if (MAP.jar) { const jx = MAP.jar.x * TILE + 16, jy = MAP.jar.y * TILE + 34, d = Math.hypot(OW.x - jx, OW.y - jy); if (d > 40) J.cd = 0; if (d < 16 && !J.cd && !OW.act && !OW.ring && !OW.menu) { J.pos = Party.map((p, i) => { const h = OW.hist[Math.min(OW.hist.length - 1, i * 12)]; return i === 0 ? [OW.x, OW.y] : (h ? [h[0], h[1]] : [OW.x - i * 12, OW.y]); }); OW.vx = OW.vy = 0; OW.moving = false; for (const sign of MAP.signs || []) if (Math.hypot(sign.x * TILE + 8 - OW.x, sign.y * TILE + 8 - OW.y) < 30) sign.read = true; OW.heal = healGen(); return; } }
  for (const sg of MAP.signs || []) { const d = Math.hypot(OW.x - sg.x * TILE - 8, OW.y - sg.y * TILE - 8); if (d < 14 && !sg.read) { sg.read = true; OW.msg = { lines: sg.lines, t: 0 }; Audio.sfx('page'); return; } if (d > 24) sg.read = false; }
  if (OW.hint > 0) OW.hint--;

  if (hit('ok')) { if (typeof chapterInteract === 'function' && chapterInteract()) return; if (fieldInteract()) return; if (merchantNear()) { openShop(); return; } const landmark = worldNearby(); if (landmark) { OW.msg = { lines: [landmark.title, ...landmark.lines], t: 0 }; Audio.sfx('page'); return; } openMenu(); return; }
  if (hit('ring')) { openRing(); return; }
  // movimiento con aceleración y frenada; el líder bota al andar (es una gota)
  let dx = 0, dy = 0; if (keys.left) dx--; if (keys.right) dx++; if (keys.up) dy--; if (keys.down) dy++;
  if (dx && dy) { dx *= .707; dy *= .707; }
  if (typeof tapSteer === 'function') { if (dx || dy) tapCancel(); else [dx, dy] = tapSteer(); } // tocar el mapa para ir
  const sp = 1.35; OW.vx = lerp(OW.vx || 0, dx * sp, dx ? .3 : .45); OW.vy = lerp(OW.vy || 0, dy * sp, dy ? .3 : .45);
  if (Math.abs(OW.vx) < .04) OW.vx = 0; if (Math.abs(OW.vy) < .04) OW.vy = 0;
  const speed = Math.hypot(OW.vx, OW.vy); OW.moving = speed > .1;
  if (dx || dy) OW.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  if (OW.moving) {
    const nx = OW.x + OW.vx, ny = OW.y + OW.vy;
    if (walkable(nx, OW.y)) OW.x = nx; else OW.vx = 0; if (walkable(OW.x, ny)) OW.y = ny; else OW.vy = 0;
    OW.hist.unshift([OW.x, OW.y]); if (OW.hist.length > 40) OW.hist.pop(); fieldWalk(speed);
    const prev = OW.bob || 0; OW.bob = prev + speed * .11;
    if (Math.floor(OW.bob) > Math.floor(prev)) { // aterrizaje: gotitas del color del líder y paso según el terreno
      const tx = OW.x / TILE | 0, ty = (OW.y + 3) / TILE | 0, ch = tileAt(tx, ty); const wood = ch === '=' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(tx + a, ty + b) === '~');
      Audio.sfx(wood ? 'step_wood' : ch === '=' ? 'step_path' : 'step_grass', { pan: (Math.floor(OW.bob) & 1) ? .15 : -.15 });
      for (let i = 0; i < 2; i++) OW.dust.push({ x: OW.x + R(-2, 2), y: OW.y + 1, vx: R(-.5, .5), vy: -R(.4, .9), col: C(Party[0].color), t: 0, life: RI(10, 16) });
      (OW.prints ||= []).push({ x: OW.x + ((Math.floor(OW.bob) & 1) ? 2 : -2), y: OW.y + 2, col: C(Party[0].color), t: 0 }); if (OW.prints.length > 40) OW.prints.shift();
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
  const inAtelier = Game.page !== 1 && OW.x >= 28 * TILE && OW.y >= 15 * TILE && OW.y < 24 * TILE;
  const gx = inAtelier ? 320 : clamp(OW.x - W / 2 + (OW.vx || 0) * 16, 0, MAP.w * TILE - W), gy = inAtelier ? 216 : clamp(OW.y - H / 2 + (OW.vy || 0) * 10, 0, MAP.h * TILE - H);
  OW.cam.x = lerp(OW.cam.x, gx, .12); OW.cam.y = lerp(OW.cam.y, gy, .12);
}
// ---- El vaso de agua del pintor (cura): cristal y coreografía en rinse.js, suelo de 2×2 tiles.
function jarSprite(pal) { return rinseSprite(pal); }

function signSprite() { // post-it amarillo clavado con chincheta: esquina levantada, renglones escritos y sombra
  return cached('sign2', () => { const c = document.createElement('canvas'); c.width = 16; c.height = 18; const x = c.getContext('2d'), F = (col, a, b, w = 1, h = 1) => px(x, col, a, b, w, h);
    F('rgba(40,28,20,.3)', 3, 6, 12, 12); F('#2a2438', 1, 4, 13, 13); F('#f2d96a', 2, 5, 11, 11); F('#fbe98a', 2, 5, 11, 2); F('#d9b93a', 2, 14, 11, 2); F('#e8c84a', 12, 6, 1, 8);
    F('#2a2438', 11, 13, 3, 1); F('#2a2438', 13, 11, 1, 3); F('#fff3b0', 11, 14, 2, 1); F('#fff3b0', 12, 12, 1, 2); F('#c9a830', 12, 13, 1, 1); // esquina levantada
    F('#6a5a8a', 4, 8, 6, 1); F('#6a5a8a', 4, 10, 7, 1); F('#6a5a8a', 4, 12, 4, 1); F('#e23c3c', 9, 12, 2, 1); // renglones y un subrayado
    F('#2a2438', 6, 0, 5, 5); F('#e23c3c', 7, 1, 3, 3); F('#ff8a80', 7, 1, 1, 1); F('#8a1a28', 9, 3, 1, 1); F('#8c8ab0', 8, 4, 1, 2); // chincheta
    return c; });
}
function* healGen() { yield* rinseSequence(); }

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
// Sprite de un miembro del grupo en el mapa: vista según dirección (espaldas al subir, frente al bajar, perfil a los lados)
const DIRVIEW = { up: 'back', down: 'front', left: 'side', right: 'side' };
function mapDrop(p, x, y, dir, bob, moving, t, idx) {
  const sc = OW.scare, sk = sc ? clamp(sc.k - idx * .12, 0, 1) : 0; // sobresalto durante la transición (el líder primero, los demás en cadena)
  const col = C(p.color), dead = p.cur.hp <= 0, view = dead ? 'front' : sk > 0 ? 'front' : DIRVIEW[dir] || 'back';
  const blink = !moving && ((t + idx * 53) % 170) < 6;
  const hopFrame = moving ? Math.abs(Math.sin(bob * Math.PI)) : 0;
  const atlasState = dead ? 'ko' : sk > 0 ? (sc.stage === 'detect' ? 'wide' : 'hurt') : blink ? 'blink' : moving ? (hopFrame < .2 ? 'contact' : hopFrame > .65 ? 'hop' : 'idle') : 'idle';
  const atlas = typeof SpriteAtlas !== 'undefined' && SpriteAtlas.mapFrame(p.id, dir, atlasState);
  const spr = desatSprite(atlas || buildSprite(`${p.id}_${view}_mini`, col, null, { eyes: dead ? 'ko' : sk > 0 ? 'wide' : blink ? 'blink' : 'normal' }), pigmentFade(p.cur.mp, effStats(p).mp));
  const lz = OW.landZ ? OW.landZ[idx] || 0 : 0;
  const hop = moving ? Math.abs(Math.sin(bob * Math.PI)) : 0, wz = hop * 3 + lz; let sq = moving ? (hop < .15 ? [1.1, .9] : hop > .85 ? [.94, 1.06] : [1, 1]) : (((t / 14 | 0) + idx) % 4 === 1 ? [1.03, .97] : [1, 1]);
  // reacción: en 'detect' se giran hacia la sombra con los ojos como platos y tiemblan; en 'fall' se van encogiendo; en el salpicón quedan aplastados
  if (sk > 0 && !dead) { if (sc.stage === 'detect') { if (sk > .4) x += ((Game.t >> 1) & 1) ? 1 : -1; sq = [1 + sk * .08, 1 - sk * .08]; } else if (sc.stage === 'fall') sq = [1.06 + sk * .18, .94 - sk * .18]; else sq = [1.3, .6]; }
  shadow(x, y, Math.max(2, Math.round((p.w * .42) * (1 - hop * .3) * (1 - lz / 160))));
  if (dead) { drawSprite(spr, x, y, 1, false, atlas ? 1 : .45); return; }
  drawSprite(spr, x, Math.round(y - wz), lz > 0 ? .9 : atlas ? 1 : sq[0], !atlas && dir === 'right', lz > 0 ? 1.15 : atlas ? 1 : sq[1]);
  if (p.id === 'anil' && !atlas) drawSatellites(x, y - wz, t + idx * 10, col, .4);
}
function drawOverworld() {
  const nud = OW.camNudge || [0, 0], shk = OW.shake > 0 ? [R(-OW.shake, OW.shake) | 0, R(-OW.shake, OW.shake) / 2 | 0] : [0, 0]; if (OW.shake > 0 && OW.t % 2 === 0) OW.shake--;
  const cx = Math.round(OW.cam.x + nud[0]) + shk[0], cy = Math.round(OW.cam.y + nud[1]) + shk[1], wf = (OW.t / 9 | 0) % 4, pal = Game.palette;
  g.save();
  const zoom = OW.jar.zoom || 1; g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-W / 2, -H / 2);
  const ents = [];
  for (let ty = cy / TILE | 0; ty <= (cy + H) / TILE + 1; ty++) for (let tx = cx / TILE | 0; tx <= (cx + W) / TILE; tx++) {
    const ch = tileAt(tx, ty); if (pageEdgeAt(tx, ty)) { g.drawImage(pageEdgeTile(tx, ty), tx * TILE - cx, ty * TILE - cy); continue; } // el borde de la hoja
    g.drawImage(groundTile(tx, ty, pal, ch === '~' ? wf : 0), tx * TILE - cx, ty * TILE - cy);
    if (ch === 'T' && ty < MAP.h) ents.push({ y: ty * TILE + TILE, draw: () => { const spr = treeSprite(pal, tileAt(tx - 1, ty) === 'T', tileAt(tx + 1, ty) === 'T', hash2(tx, ty) & 7, Game.page === 1 ? null : worldRegion(tx, ty)), X = tx * TILE - cx, Y = ty * TILE - 8 - cy, sw = Prefs.shake ? Math.sin(OW.t * .025 + tx * .6 + ty * .4) : 0; // el viento mece las cerdas: la punta más que el mango
      g.drawImage(spr, 0, 0, 16, 6, X + Math.round(sw * 1.4), Y, 16, 6); g.drawImage(spr, 0, 6, 16, 7, X + Math.round(sw * .6), Y + 6, 16, 7); g.drawImage(spr, 0, 13, 16, 11, X, Y + 13, 16, 11); } });
  }
  drawRegionDetails(cx, cy); drawWorldGround(g, cx, cy, pal); drawFootprints(cx, cy);
  drawRinseGround(cx, cy, pal);
  drawWorldObjects(ents, cx, cy, pal);
  if (typeof drawChapterLandmarks === 'function') drawChapterLandmarks(ents,cx,cy);
  for (const p of OW.puddles || []) { const x = p.x - cx, y = p.y - cy; if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue; g.fillStyle = ramp(p.col).sh; g.beginPath(); g.ellipse(x, y + 2, p.w, p.w * .45, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).base; g.beginPath(); g.ellipse(x - 1, y + 1, p.w - 2, p.w * .4 - 1, 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).hi; g.fillRect(x - p.w * .5 | 0, y - 1, 3, 1); }
  // grupo: líder y seguidores por la estela (estilo CT), cada uno mirando hacia donde avanza
  drawFieldPuzzle(ents, cx, cy, pal);
  for (const sg of MAP.signs || []) ents.push({ y: sg.y * TILE + 14, draw: () => { shadow(sg.x * TILE + 8 - cx, sg.y * TILE + 14 - cy, 8); g.drawImage(signSprite(), sg.x * TILE + 1 - cx, sg.y * TILE - 2 - cy); } });
  if (MAP.jar) ents.push({ y: MAP.jar.y * TILE + 34, draw: () => drawRinseVessel(cx, cy, pal) });
  drawMerchant(ents, cx, cy);
  if (!(OW.landT > 900)) Party.forEach((p, i) => {
    if (typeof CHAPTER !== 'undefined' && CHAPTER.turn) { if (CHAPTER.turn.t < 96 || CHAPTER.turn.t >= 166) ents.push({y:OW.y,draw:()=>chapterDrawTraveller(i,cx,cy)}); return; }
    let x = OW.x, y = OW.y, dir = OW.dir || 'down';
    if (OW.cast && OW.cast.p === p) { const cst = OW.cast; ents.push({ y: cst.y + 1, draw: () => { const x = cst.x - cx, y = cst.y - cy; if (cst.aura > 0) { g.strokeStyle = cst.col; g.globalAlpha = .7; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 1, 9 + Math.sin(OW.t * .4) * 1.5, 4, 0, 0, 6.29); g.stroke(); g.globalAlpha = .25; g.fillStyle = cst.col; g.fill(); g.globalAlpha = 1; } const lift = Math.round(cst.lift || 0), sq = cst.lift > 1 ? [.92, 1.1] : cst.aura > 0 ? [1.1, .9] : [1, 1]; shadow(x, y, Math.max(4, 8 - lift)); const spr = buildSprite(`${p.id}_${cst.lift > 1 ? 'front' : DIRVIEW[OW.dir] || 'front'}_mini`, C(p.color), null, { eyes: cst.lift > 1 ? 'happy' : 'normal' }), yy = y - lift - (cst.aura > 0 ? Math.abs(Math.sin(OW.t * .5)) * 1.5 : 0);
      if (cst.glow > 0) { const gl = tintSprite(spr, '#fff8e6', 1); g.save(); g.globalAlpha = .55 * cst.glow; for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawSprite(gl, x + ox, yy + oy, sq[0], OW.dir === 'right', sq[1]); g.restore(); } // se ilumina al invocar
      drawSprite(spr, x, yy, sq[0], OW.dir === 'right', sq[1]); } }); return; }
    if (OW.heal) { const pos = OW.jar.jump[i] || OW.jar.pos[i]; if (pos) ents.push({ y: pos[1] + 1, draw: () => drawRinseParty(i, cx, cy) }); return; }
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
  drawWorldAtmosphere(cx, cy, pal);
  drawRinseSpray(cx, cy); drawRinseBursts(cx, cy);
  drawFieldEffects(cx, cy);
  if (typeof drawTapMark === 'function') drawTapMark(cx, cy);
  for (const d of OW.dust) { g.fillStyle = d.t < d.life * .6 ? ramp(d.col).base : ramp(d.col).sh; g.fillRect(Math.round(d.x - cx), Math.round(d.y - cy), 1, 1); }
  if (OW.fx) OW.fx();
  if (OW.flash) { g.fillStyle = OW.flash.col; g.globalAlpha = OW.flash.a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; OW.flash.a -= .03; if (OW.flash.a <= 0) OW.flash = null; }
  for (const f of OW.floats || []) { if (f.t < 0) continue; txt(f.s, Math.round(f.x - cx - f.s.length * 4), Math.round(f.y - cy - f.t * .4), f.col); }
  g.restore();
  // bocadillo del líder tras una batalla dura: piensa en el vaso
  if (Game.state !== 'overworld') return; // los cambios de escena no heredan botones del mapa
  if (OW.hint > 0 && MAP.jar && !OW.msg) { const lx = OW.x - cx, ly = OW.y - cy - 22, k = clamp(OW.hint / 10, 0, 1) * clamp((150 - OW.hint) / 8, 0, 1); g.globalAlpha = k; page(lx - 12, ly - 14, 26, 18); g.drawImage(jarSprite(pal), lx - 6, ly - 12, 12, 13); g.fillStyle = PAPER; g.fillRect(lx - 3, ly + 5, 2, 2); g.fillRect(lx - 1, ly + 8, 1, 1); g.globalAlpha = 1; }
  // HUD
  if (!OW.heal && !OW.menu && !OW.ring && !OW.msg) drawPigmentHUD();
  drawRinseUI();
  drawWorldLabel();
  // brújula al vaso cuando alguien va tocado y no está cerca
  if (MAP.jar) { const jx = MAP.jar.x * TILE + 16, jy = MAP.jar.y * TILE + 34, d = Math.hypot(jx - OW.x, jy - OW.y), hurt = Party.some(q => q.cur.hp < effStats(q).hp * .5 || q.cur.mp < effStats(q).mp * .25);
    if (hurt && d > 48 && !OW.heal && !OW.ring && !OW.menu && !OW.msg) { maskingLabel(W - 44, 4, 40, 18); g.drawImage(jarSprite(pal), W - 40, 6, 11, 13); const a = Math.atan2(jy - OW.y, jx - OW.x), ax = W - 18, ay = 13, bl = (OW.t / 20 | 0) % 2; g.fillStyle = bl ? '#e23c3c' : '#2a2438'; g.beginPath(); g.moveTo(ax + Math.cos(a) * 6, ay + Math.sin(a) * 6); g.lineTo(ax + Math.cos(a + 2.5) * 5, ay + Math.sin(a + 2.5) * 5); g.lineTo(ax + Math.cos(a - 2.5) * 5, ay + Math.sin(a - 2.5) * 5); g.closePath(); g.fill(); } }
  drawFieldUI();
  if (typeof chapterHUD === 'function') chapterHUD();
  if (OW.ring) drawRing();
  if (OW.msg && !(OW.landT > 0)) drawMessage(OW.msg.lines);
  if (OW.menu) drawMenu();
}
function drawPigmentHUD() {
  const value=Game.pigmento,old=ARTUI.tracks.get('pigment')?.value,at=artObserve('pigment',value);
  if(old!=null&&old!==value){ARTUI.pigmentDelta=value-old;artBurst(19,14,C('amarillo'));}
  const age=ARTUI.t-at,delta=ARTUI.pigmentDelta&&age<75?ARTUI.pigmentDelta:null;
  const label=String(value),w=36+textWidth(label),shownAt=artObserve('pigment-hud',Game.state+':'+(Game.page||0));
  g.save();g.translate(Math.round((1-artIn(shownAt,16))*-(w+12)),0);
  maskingLabel(6,5,w,17);g.drawImage(iconSprite('item',C('amarillo')),8,6,14,14);
  smallText(label,27,10-Math.round(artPop(at)*3));
  if(delta){g.save();g.translate(0,Math.round((1-artIn(at,12))*-8));artTag((delta>0?'+':'')+delta,w+9,6,delta>0?C('verde'):C('rojo'));g.restore();}
  g.restore();
  if(!OW.act&&!(OW.landT>0))uiHit(4,3,w+4,22,()=>openOverlay('studies'));
}
function drawMessage(lines) {
  UI_HITS.length=0;UI_TEXT.length=0;
  const title=lines[0]||'Chromara',body=lines.slice(1).filter(Boolean).join(' '),wrapped=wrapSmall(body,270);
  const width=Math.min(304,Math.max(160,textWidth(title)+22,...wrapped.map(l=>textWidth(l)+24)));
  const h=wrapped.length*11+25,x=Math.round((W-width)/2),y=H-h-6,col=Game.bossDown?C('verde'):'#b39159';
  const at=artObserve('message',OW.msg),rise=Math.round((1-artIn(at,18))*(h+30));
  // The note is written in front of the player; a first press finishes the ink, a second one closes it.
  const progress=OW.msg&&OW.msg.lines===lines&&OW.msg.ch!=null?OW.msg.ch:Infinity,ready=progress>=[...compactString(body)].length;
  g.save();g.translate(0,rise);
  artSheet(x,y,width,h,col);
  artTag(title,x+4,y-16,col,width-8);
  writtenLines(wrapped,x+11,y+7,UI_INK,progress,{gap:11,wet:col,nib:!!Prefs.shake});
  const key=battleKey('ok')+(ready?' seguir':' completar');
  textRight(key,x+width-12,y+h-10,UI_MUTED);
  if(ready)dropCursor(x+width-12-textWidth(key)-11,y+h-11,col);
  const reveal=Math.round(artPop(at)*16);brushBand(x+10,y+h-3,width-26-reveal,2,Game.bossDown?C('verde'):'#c6a567');
  g.restore();
  uiHit(x,y-17,width,h+18,()=>pressed.ok=true);
}
// (El menú de estado/equipo vive en gui.js)

// =====================================================================
// 7. Título, bucle principal, debug
// =====================================================================
// ---- Título: el logo se pinta y sus gotas dan vida a una ilustración a lápiz.
const TITLE = { t: 0, exit: 0, letters: 'CHROMARA', cols: ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta', 'rojo', 'amarillo'] };
// ---- El logo, rotulado a brocha plana: cada letra es un trazo de pintura de su color con gruesos y finos según la dirección
// (brocha plana a 45°), cerdas visibles a lo largo del trazo, colas secas que se deshilachan y un canto de tinta. La «O» es una
// paleta de pintor con su agujero para el pulgar: amarillo y azul se funden en un charco verde. Todo a tamaño nativo (1:1).
const LOGO = { x0: 40, y0: 10, cw: 30, gw: 28, gh: 36, base: 30 }, LOGO_BOUNCE = [0, -2, 1, -1, 2, -2, 0, 1];
const LOGO_BEATS = { start: 10, step: 20, stroke: 17, ready: 180 };
const POOLS = { C: [[20, 28]], H: [[6, 30], [21, 30]], R: [[6, 30], [21, 30]], O: [[14, 30]], M: [[5, 30], [23, 30]], A: [[5, 30], [23, 30]] };
function logoArc(cx, cy, rx, ry, a, b, n = 28) { return Array.from({ length: n + 1 }, (_, i) => { const t = lerp(a, b, i / n); return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; }); }
function logoSkeleton(ch) {
  return {
    C: [logoArc(14, 17, 9.5, 11.5, -.75, -5.55, 30)],
    H: [[[6, 5], [6, 29]], [[6, 17], [21, 17]], [[21, 5], [21, 29]]],
    R: [[[6, 29], [6, 5], [14, 5], ...logoArc(14, 11, 6.5, 6, -Math.PI / 2, Math.PI / 2, 12).slice(1), [6, 17]], [[12, 17], [22, 29]]],
    O: [logoArc(14, 17, 10, 12, -Math.PI / 2, Math.PI * 1.5, 32)],
    M: [[[4, 29], [5, 5], [14, 20], [23, 5], [24, 29]]],
    A: [[[4, 29], [14, 5], [24, 29]], [[8, 21], [20, 21]]],
  }[ch];
}
function logoStrokes(ch) {
  return cached('logo-strokes2|' + ch, () => {
    const paths = logoSkeleton(ch); let total = 0; const segments = [];
    paths.forEach((points, index) => {
      if (index) { const previous = paths[index - 1].at(-1); segments.push({ from: previous, to: points[0], start: total, length: 4, lift: true }); total += 4; }
      for (let i = 1; i < points.length; i++) { const from = points[i - 1], to = points[i], length = Math.hypot(to[0] - from[0], to[1] - from[1]); segments.push({ from, to, start: total, length, lift: false, path: index }); total += length; }
    });
    return { segments, total };
  });
}
function logoTip(ch, progress) {
  const path = logoStrokes(ch), distance = clamp(progress, 0, 1) * path.total;
  const segment = path.segments.find(s => distance < s.start + s.length) || path.segments.at(-1);
  const k = clamp((distance - segment.start) / segment.length, 0, 1);
  return { x: lerp(segment.from[0], segment.to[0], k), y: lerp(segment.from[1], segment.to[1], k), lift: segment.lift ? Math.sin(k * Math.PI) * 4 : 0, angle: Math.atan2(segment.to[1] - segment.from[1], segment.to[0] - segment.from[0]) };
}
// La letra terminada: un búfer de tonos pintado cerda a cerda a lo largo del esqueleto.
// Pintura espesa y brillante: el trazo se estampa con discos redondos (se ve gordo y blando), y cada píxel se sombrea
// por su profundidad dentro del trazo, con la luz arriba a la izquierda: canto oscuro abajo, loma clara y un brillo
// húmedo. Así la letra parece gel de pintura recién puesto, no un brochazo seco.
function logoGoo(ch, col) {
  return cached(`logo3|${ch}|${col}`, () => {
    const { gw, gh } = LOGO, rp = ramp(col), m = new Uint8Array(gw * gh), set = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < gw && y < gh) m[y * gw + x] = 1; };
    logoSkeleton(ch).forEach(pts => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), dir = Math.atan2(b[1] - a[1], b[0] - a[0]), r = 2.7 + .9 * Math.abs(Math.sin(dir - .78));
      for (let s = 0; s <= l; s += .35) { const px = lerp(a[0], b[0], s / l), py = lerp(a[1], b[1], s / l); for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) if (xx * xx + yy * yy <= r * r) set(px + xx, py + yy); } } });
    // la pintura se acumula abajo: gotas gordas en los pies de la letra
    for (const [x, y] of POOLS[ch] || []) for (let yy = -3; yy <= 1; yy++) for (let xx = -4; xx <= 4; xx++) if (xx * xx / 16 + (yy + 1) * (yy + 1) / 5 <= 1) set(x + xx, y - 1 + yy);
    // profundidad: distancia al borde (4 vecinos)
    const d = new Uint8Array(gw * gh); for (let i = 0; i < d.length; i++) d[i] = m[i] ? 99 : 0;
    for (let pass = 0; pass < 2; pass++) for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = pass ? (gh - 1 - y) * gw + (gw - 1 - x) : y * gw + x; if (!m[i]) continue; const X = i % gw, Y = i / gw | 0, nb = pass ? [[1, 0], [0, 1]] : [[-1, 0], [0, -1]];
      for (const [dx, dy] of nb) { const a = X + dx, b = Y + dy, v = a < 0 || b < 0 || a >= gw || b >= gh ? 0 : d[b * gw + a]; if (v + 1 < d[i]) d[i] = v + 1; } }
    const D = (x, y) => x < 0 || y < 0 || x >= gw || y >= gh ? 0 : d[y * gw + x];
    const c = document.createElement('canvas'); c.width = gw; c.height = gh; const x = c.getContext('2d'), F = (colr, a, b) => { x.fillStyle = colr; x.fillRect(a, b, 1, 1); };
    for (let y = 0; y < gh; y++) for (let a = 0; a < gw; a++) { const v = D(a, y);
      if (!v) { if (D(a - 1, y) || D(a + 1, y) || D(a, y - 1) || D(a, y + 1)) F(rp.out, a, y); continue; }
      const gx = D(a + 1, y) - D(a - 1, y), gy = D(a, y + 1) - D(a, y - 1), light = -(gx + gy); // mira a la luz si la profundidad crece hacia abajo-derecha
      let colr = rp.base;
      if (v === 1) colr = light > 0 ? rp.hi : light < 0 ? rp.dk : rp.sh;
      else if (v === 2 && light > 0) colr = rp.hi;
      else if (light < 0 && v <= 2) colr = rp.sh;
      F(colr, a, y); }
    // brillo húmedo: una raya clara sobre la loma, arriba a la izquierda de cada trazo
    for (let y = 1; y < gh - 1; y++) for (let a = 1; a < gw - 1; a++) { const v = D(a, y); if (v >= 2 && D(a - 1, y) < v && D(a, y - 1) < v && D(a + 1, y + 1) >= v) F(rp.spec, a, y); }
    c.__key = `logo3|${ch}|${col}`; return c;
  });
}
function logoLetter(ch, col) {
  if (ch !== 'O') return logoGoo(ch, col);
  return cached(`logo2|${ch}|${col}`, () => {
    const { gw, gh } = LOGO, rp = ramp(col), tone = new Array(gw * gh).fill(null), set = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < gw && y < gh) tone[y * gw + x] = v; };
    const hash = n => { let h = (n * 2654435761 + ch.charCodeAt(0) * 97) >>> 0; h ^= h >>> 13; return (h * 1274126177 >>> 0) % 1000 / 1000; };
    if (ch === 'O') {
      // la paleta: madera con canto, agujero para el pulgar, charco verde y las dos gotas que lo hicieron
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const e = ((x - 14) / 11.5) ** 2 + ((y - 17) / 13.5) ** 2; if (e > 1) continue; const hole = Math.hypot(x - 8, y - 23) < 3.2, notch = Math.hypot(x - 26, y - 22) < 4.5; if (hole || notch) continue; set(x, y, e > .78 ? 'wd' : ((x * 3 + y) % 7 === 0 ? 'wl' : 'w')); }
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const pool = ((x - 16) / 6.5) ** 2 + ((y - 16) / 5.5) ** 2 < 1; if (pool) set(x, y, y < 13 ? 'hi' : y > 18 ? 'sh' : 'base'); }
      [[9, 10, '#f5c650', '#fff0b0'], [21, 11, C('azul'), ramp(C('azul')).hi]].forEach(([cx, cy, c1, c2]) => { for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 8) set(cx + x, cy + y, y < -1 ? c2 : c1); });
      for (let i = 0; i < 5; i++) set(12 + i, 12 + (i % 2), 'hi'); // donde se tocan, el verde nace
    } else {
      // brocha plana: ancho según el ángulo del trazo; cada cerda conserva su tono a lo largo de todo el trazo
      logoSkeleton(ch).forEach((pts, pi) => {
        let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
        let acc = 0;
        for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = seg[i - 1], dir = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(dir), ny = Math.cos(dir);
          for (let s = 0; s <= l; s += .4) { const q = (acc + s) / L, px = lerp(a[0], b[0], s / l), py = lerp(a[1], b[1], s / l);
            const w = (2.2 + 1.9 * Math.abs(Math.sin(dir - .78))) * (q < .06 ? .6 + q / .06 * .4 : 1), n = Math.ceil(w * 2);
            for (let k = -n; k <= n; k++) { const off = k / 2, h = hash(k + 40 + pi * 17), dry = q > .82 && h < (q - .82) * 3.2; if (dry) continue;
              set(px + nx * off, py + ny * off, h < .12 ? 'hi' : h < .76 ? 'base' : h < .95 ? 'sh' : 'dk'); } }
          acc += l; }
      });
      for (const [x, y] of POOLS[ch] || []) for (let yy = -3; yy <= 2; yy++) for (let xx = -4; xx <= 4; xx++) if (xx * xx / 16 + yy * yy / 7 <= 1) set(x + xx, y - 1 + yy, yy > 0 ? 'sh' : yy < -1 ? 'base' : tone[(y - 1 + yy) * gw + x + xx] || 'base'); // la pintura se acumula abajo
    }
    const c = document.createElement('canvas'); c.width = gw; c.height = gh; const x = c.getContext('2d'), wood = { w: '#c9955a', wl: '#dcae72', wd: '#7a4e2e' };
    const inside = (a, b) => a >= 0 && b >= 0 && a < gw && b < gh && tone[b * gw + a] !== null;
    for (let y = 0; y < gh; y++) for (let a = 0; a < gw; a++) {
      const v = tone[y * gw + a];
      if (v === null) { if (inside(a - 1, y) || inside(a + 1, y) || inside(a, y - 1) || inside(a, y + 1)) { x.fillStyle = rp.out; x.fillRect(a, y, 1, 1); } continue; }
      let c2 = wood[v] || rp[v] || v; if (v !== 'wd' && !wood[v] && (!inside(a, y - 1) || !inside(a - 1, y)) && ch !== 'O') c2 = rp.hi; // luz arriba a la izquierda
      x.fillStyle = c2; x.fillRect(a, y, 1, 1);
    }
    x.fillStyle = rp.spec; for (let y = 1; y < gh - 1; y++) for (let a = 1; a < gw - 1; a++) if (inside(a, y) && !inside(a - 1, y - 1) && inside(a + 1, y + 1) && hash(a * 31 + y) < .35) x.fillRect(a, y, 1, 1);
    c.__key = `logo2|${ch}|${col}`; return c;
  });
}
function drawGooey(spr, x, y, wob, sy = 1, phase = 0) {
  const h = spr.height, hh = Math.round(h * sy);
  for (let r = 0; r < hh; r += 2) { const srcY = Math.min(h - 1, Math.round(r / sy)), rows = Math.min(2, h - srcY); const off = Math.round(Math.sin(phase + r * .28) * wob * (r / hh)); g.drawImage(spr, 0, srcY, spr.width, rows, Math.round(x + off), Math.round(y + (h - hh) + r), spr.width, rows); }
}
function logoPaint(ch, col, progress) {
  const spr = logoLetter(ch, col);
  if (progress >= 1) return spr;
  const c = cached('logo-wet-mask2', () => { const c = document.createElement('canvas'); c.width = LOGO.gw; c.height = LOGO.gh; return c; });
  const x = c.getContext('2d'), path = logoStrokes(ch), distance = progress * path.total;
  x.clearRect(0, 0, c.width, c.height); x.save(); x.lineCap = x.lineJoin = 'round'; x.lineWidth = ch === 'O' ? 16 : 12; x.strokeStyle = '#fff';
  for (const s of path.segments) { if (s.start >= distance) break; if (s.lift) continue; const k = clamp((distance - s.start) / s.length, 0, 1); x.beginPath(); x.moveTo(s.from[0], s.from[1]); x.lineTo(lerp(s.from[0], s.to[0], k), lerp(s.from[1], s.to[1], k)); x.stroke(); }
  x.globalCompositeOperation = 'source-in'; x.drawImage(spr, 0, 0); x.restore();
  return c;
}
function logoGraphite(ch) {
  return cached('logo-graphite2|' + ch, () => {
    const spr = logoLetter(ch, '#a69c86'), c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height;
    const x = c.getContext('2d'), pixels = spr.getContext('2d').getImageData(0, 0, c.width, c.height).data, inside = (a, b) => a >= 0 && b >= 0 && a < c.width && b < c.height && pixels[(b * c.width + a) * 4 + 3] > 100;
    x.fillStyle = '#8b806d'; for (let y = 0; y < c.height; y++) for (let a = 0; a < c.width; a++) if (inside(a, y) && (!inside(a - 1, y) || !inside(a + 1, y) || !inside(a, y - 1) || !inside(a, y + 1)) && (a * 3 + y) % 5) x.fillRect(a, y, 1, 1);
    return c;
  });
}
function logoGlint(ch, col, age) {
  const spr = logoLetter(ch, col), c = cached('logo-glint2', () => { const c = document.createElement('canvas'); c.width = LOGO.gw; c.height = LOGO.gh; return c; });
  const x = c.getContext('2d'), head = age * 1.9 - 12; x.clearRect(0, 0, c.width, c.height); x.save(); x.drawImage(spr, 0, 0); x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff5d6'; x.beginPath(); x.moveTo(head, 0); x.lineTo(head + 3, 0); x.lineTo(head - 9, 36); x.lineTo(head - 12, 36); x.closePath(); x.fill(); x.restore(); return c;
}
function logoLetterY(i) { return LOGO_BOUNCE[i]; }
function drawLogo(t, x0, y0) {
  const cw = LOGO.cw, motion = Prefs.shake, finished = LOGO_BEATS.start + (TITLE.letters.length - 1) * LOGO_BEATS.step + LOGO_BEATS.stroke, exitAge = TITLE.exit ? t - TITLE.exit : 0;
  for (let i = 0; i < TITLE.letters.length; i++) {
    const ch = TITLE.letters[i], col = C(TITLE.cols[i]), rp = ramp(col), x = x0 + i * cw, ly = y0 + logoLetterY(i), baseY = ly + LOGO.base;
    const start = LOGO_BEATS.start + i * LOGO_BEATS.step, k = clamp((t - start) / LOGO_BEATS.stroke, 0, 1), age = t - start - LOGO_BEATS.stroke;
    if (k < 1) { g.save(); g.globalAlpha = .28 * clamp(t / 10, 0, 1); g.drawImage(logoGraphite(ch), x, ly); g.restore(); }
    if (k <= 0) continue;
    const settled = clamp(age / 34, 0, 1), pool = 1 - Math.pow(1 - settled, 3);
    if (pool > 0) { g.save(); g.globalAlpha = .16; g.fillStyle = rp.base; g.beginPath(); g.ellipse(x + 14, baseY + 3, 12 + pool * 4, 2 + pool * 2, 0, 0, Math.PI * 2); g.fill(); g.restore(); g.fillStyle = rp.sh; g.beginPath(); g.ellipse(x + 14, baseY + 2, 5 + pool * 9, 1 + pool * 1.4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = rp.hi; g.fillRect(x + 9, baseY + 1, 3, 1); }
    if (age > -LOGO_BEATS.stroke) { const r = seeded(900 + i * 31); g.save(); for (let n = 0; n < 8; n++) { const px = x + 14 + (r() - .5) * 44, py = ly + 6 + r() * 40 - 8, rr = .7 + r() * 1.7; if (age + LOGO_BEATS.stroke < n * 2 + 2) continue; g.globalAlpha = .32; g.fillStyle = rp.base; g.beginPath(); g.arc(px, py, rr, 0, 6.29); g.fill(); if (rr > 1.6) g.fillRect(Math.round(px + rr + 1), Math.round(py), 1, 1); } g.restore(); } // salpicaduras en la hoja
    const recoil = age >= 0 ? Math.sin(age * .43) * Math.exp(-age / 8) * motion : 0, sy = 1 - recoil * .2, wob = recoil * 1.5;
    const spr = logoPaint(ch, col, k), raid = titleRaid(t), drain = raid && raid.L === i ? raid.drain : 0;
    if (drain > 0) { g.save(); g.globalAlpha = .7 * drain; g.drawImage(logoGraphite(ch), x, ly); g.restore(); }
    g.save(); g.globalAlpha *= 1 - drain;
    const land = titleLandKick(i, t), wob2 = wob + land * 1.8 * motion, sy2 = sy - land * .12 * motion;
    g.save(); g.globalAlpha *= .35; g.drawImage(spr, x + 1, ly + 2); g.restore(); // espesor: la pintura hace bulto
    drawGooey(spr, x, ly, wob2, sy2, age * .18);
    const pair = TITLE_PAINTERS[TITLE.cols[i]]; if (pair.length > 1 && age < 34) { const mk = clamp(age / 34, 0, 1); g.save(); g.globalAlpha *= 1 - mk * mk; drawGooey(logoMarble(ch, pair, spr, t), x, ly, wob2, sy2, age * .18); g.restore(); } // vetas de los dos colores antes de fundirse
    g.restore();
    // las secundarias nacen de una mezcla: dos gotas de los pigmentos se juntan en la letra y florecen en su color
    const mixOf = TITLE_PAINTERS[TITLE.cols[i]]; if (mixOf.length > 1 && age >= 0 && age < 22) { const q = clamp(age / 10, 0, 1); if (age < 10) mixOf.forEach((id, n) => paintDab(Math.round(x + 14 + (n ? 1 : -1) * 12 * (1 - q)), Math.round(ly + 16 - Math.sin(q * Math.PI) * 7), 3, C(TITLE_HOME[id].col))); else paintRing(x + 14, ly + 16, (age - 10) / 12, col, 18); }
    if (age >= 0) {
      const rnd = seeded(270 + i * 97);
      for (let n = 0; n < 9; n++) { const dx = (rnd() - .5) * 30, speed = .4 + rnd() * .9, launchY = 8 + rnd() * 16, flight = clamp(age, 0, 24), px = x + 14 + dx * (.28 + flight * .04), py = ly + launchY - speed * flight + .043 * flight * flight;
        if (age < 24 && motion) { g.save(); g.globalAlpha = (1 - age / 24) * (.7 + motion * .3); g.fillStyle = n % 3 ? rp.base : rp.hi; g.fillRect(Math.round(px), Math.round(py), n % 4 ? 1 : 2, 1 + (n % 3 === 0 ? 1 : 0)); g.restore(); }
        if (n < 3) { g.save(); g.globalAlpha = .28 * pool; g.fillStyle = col; g.fillRect(Math.round(x + 14 + dx), baseY + 4 + n % 2, n === 0 ? 2 : 1, 1); g.restore(); } }
      // goterones vivos: crecen, se balancean, sueltan una gota que salpica la hoja y vuelven a crecer; al salir, chorrean
      for (const [n, point] of (POOLS[ch] || []).entries()) titleDrip(x + point[0], baseY - 1, age - 6 - n * 14, i * 7 + n, rp, exitAge);
      const shine = t - finished - 4 - i * 3;
      if (Prefs.flash && shine > 0 && shine < 32) { g.save(); g.globalAlpha = Prefs.flash * .55 * Math.sin(shine / 32 * Math.PI); g.drawImage(logoGlint(ch, col, shine), x, ly); g.restore(); }
    }
  }
  titlePaintersDraw(t, x0, y0);
}
// Un goterón vivo al pie de una letra: crece, se balancea, suelta su gota (que cae y salpica la hoja) y vuelve a crecer.
function titleDrip(x, y, age, seed, rp, exitAge = 0) {
  if (age < 0) return; const rnd = seeded(seed * 13 + 1), Lmax = 4 + rnd() * 6, period = 190 + (seed % 5) * 23, cyc = Math.floor(age / period), a = age % period, first = cyc === 0;
  let L, bulb = 1.6, drop = null; const base = first ? 0 : Lmax * .35;
  if (a < 70) L = lerp(base, Lmax, ease(a / 70));
  else if (a < 110) { L = Lmax + Math.sin((a - 70) * .25) * .6 * Prefs.shake; bulb = 1.6 + (a - 70) / 40 * .9; }
  else { L = Lmax * .35; const q = (a - 110) / 18; if (q < 1) drop = { y: y + Lmax + q * q * 22, r: 2.2 }; else if (a < 110 + 18 + 70) drop = { splat: (a - 128) / 70 }; }
  L += exitAge > 0 ? exitAge * (1.6 + seed % 3 * .5) : 0;
  const sway = Prefs.shake ? Math.round(Math.sin(age * .08 + seed) * Math.min(1, L / 8)) : 0, Y = Math.round(y + L);
  g.fillStyle = rp.out; g.fillRect(x - 1, y, 3, Math.round(L) + 1); g.fillStyle = rp.base; g.fillRect(x, y, 1, Math.round(L) + 1); g.fillStyle = rp.hi; g.fillRect(x, y, 1, 2);
  g.fillStyle = rp.out; g.beginPath(); g.arc(x + .5 + sway, Y + 1, bulb + .8, 0, 6.29); g.fill(); g.fillStyle = rp.base; g.beginPath(); g.arc(x + .5 + sway, Y + 1, bulb, 0, 6.29); g.fill(); g.fillStyle = rp.spec; g.fillRect(x + sway, Y, 1, 1);
  if (drop && drop.y != null) { g.fillStyle = rp.base; g.beginPath(); g.ellipse(x + .5, drop.y, drop.r * .8, drop.r * 1.2, 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(x, Math.round(drop.y - 1), 1, 1); }
  else if (drop && drop.splat != null) { const q = drop.splat, fy = y + Lmax + 22; if (q < .25) paintRing(x, fy, q * 4, rp.base, 7); g.save(); g.globalAlpha = .55 * (1 - q); g.fillStyle = rp.base; g.fillRect(x - 2, Math.round(fy), 5, 1); g.fillRect(x - 1, Math.round(fy) - 1, 3, 1); if (q < .3 && Prefs.shake) { g.fillRect(x - 4, Math.round(fy - q * 12), 1, 1); g.fillRect(x + 4, Math.round(fy - q * 10), 1, 1); } g.restore(); }
}
// La letra se sacude como gelatina cuando una gota aterriza en ella (al empezar a pintarla y al sentarse encima)
function titleLandKick(i, t) {
  let k = 0; const [s, e] = titleLetterSpan(i);
  const v = titleVisit(t), evs = [s, e + 8]; if (v && v.L === i) for (const h of TITLE_VISIT_HOPS) evs.push(t - v.p + h);
  for (const ev of evs) { const q = t - ev; if (q >= 0 && q < 20) k += Math.sin(q * .7) * Math.exp(-q / 5); }
  return k;
}
// Letra de dos pintoras mientras aún está fresca: vetas de sus dos colores que se mueven antes de fundirse en la mezcla
function logoMarble(ch, pair, reveal, t) {
  const phase = (t >> 1) % 6, stripes = cached('logo-stripes|' + phase, () => { const c = document.createElement('canvas'); c.width = LOGO.gw; c.height = LOGO.gh; const x = c.getContext('2d'); x.fillStyle = '#fff';
    for (let y = 0; y < LOGO.gh; y++) for (let a = 0; a < LOGO.gw; a++) if (Math.floor((a + y * .7 + Math.sin(y * .45) * 2.5 + phase) / 3) % 2) x.fillRect(a, y, 1, 1); return c; });
  const c = cached('logo-marble', () => { const c = document.createElement('canvas'); c.width = LOGO.gw; c.height = LOGO.gh; return c; }), tmp = cached('logo-marble2', () => { const c = document.createElement('canvas'); c.width = LOGO.gw; c.height = LOGO.gh; return c; });
  const x = c.getContext('2d'), y2 = tmp.getContext('2d');
  x.clearRect(0, 0, LOGO.gw, LOGO.gh); x.globalCompositeOperation = 'source-over'; x.drawImage(logoLetter(ch, C(TITLE_HOME[pair[1]].col)), 0, 0);
  y2.clearRect(0, 0, LOGO.gw, LOGO.gh); y2.globalCompositeOperation = 'source-over'; y2.drawImage(logoLetter(ch, C(TITLE_HOME[pair[0]].col)), 0, 0); y2.globalCompositeOperation = 'destination-in'; y2.drawImage(stripes, 0, 0);
  x.drawImage(tmp, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(reveal, 0, 0); x.globalCompositeOperation = 'source-over';
  return c;
}
// Las gotas pintan con su propio cuerpo: van aplastadas sobre la punta del trazo, con una perla de su pintura debajo,
// salpican gotitas al correr; al despegarse de una letra tiran de un hilo de pintura que se estira y se rompe.
function titlePaintersDraw(t, x0, y0) {
  for (const id of ['carmin', 'ambar', 'anil']) {
    const p = titlePainterAt(id, t); if (!p || p.mode === 'leave') continue;
    const col = C(TITLE_HOME[id].col), rp = ramp(col), X = x0 + p.x, Y = y0 + p.y;
    if (p.mode === 'paint') {
      const i = p.i, ch = TITLE.letters[i], [s] = titleLetterSpan(i), k = clamp((t - s) / LOGO_BEATS.stroke, 0, 1), tip = logoTip(ch, k), left = Math.cos(tip.angle) < -.2;
      if (t - s < 10) { const st = titleBrushTip(i, 0); paintRing(x0 + st[0], y0 + st[1], (t - s) / 10, col, 14); }
      // gotitas que salen despedidas por detrás
      if (Prefs.shake) for (let b = 1; b <= 10; b++) { const birth = t - b; if (birth < s) break; const r = seeded(birth * 7 + i * 131 + id.length), bt = titleBrushTip(i, clamp((birth - s) / LOGO_BEATS.stroke, 0, 1)), a = logoTip(ch, clamp((birth - s) / LOGO_BEATS.stroke, 0, 1)).angle;
        const vx = -Math.cos(a) * 1.1 + (r() - .5) * 1.4, vy = -.9 - r() * 1.1; g.globalAlpha = 1 - b / 11; g.fillStyle = b % 3 ? rp.base : rp.hi; g.fillRect(Math.round(x0 + bt[0] + vx * b), Math.round(y0 + bt[1] + vy * b + .12 * b * b), 1 + (b < 3), 1); }
      g.globalAlpha = 1;
      // la perla de pintura bajo su cuerpo y la gota, aplastada y estirada en la dirección en que corre
      g.fillStyle = rp.out; g.beginPath(); g.ellipse(X, Y - 3, 6, 3.4, 0, 0, 6.29); g.fill(); g.fillStyle = rp.base; g.beginPath(); g.ellipse(X, Y - 3.5, 5, 2.6, 0, 0, 6.29); g.fill(); g.fillStyle = rp.spec; g.fillRect(Math.round(X - 3), Math.round(Y - 5), 2, 1);
      const squish = Prefs.shake ? Math.sin(t * .9 + id.length) * .06 : 0;
      drawSprite(buildSprite(id + '_side_mini', col, null, { eyes: 'angry' }), Math.round(X), Math.round(Y - 2), 2 * (1.16 + squish), left, .8 - squish);
      continue;
    }
    if (p.mode === 'hop' && p.i != null) { // hilo de pintura al despegarse del final de la letra
      const [, e] = titleLetterSpan(p.i), q = (t - e) / 8;
      if (q > 0 && q <= 1) { const end = titleBrushTip(p.i, 1), ax = x0 + end[0], ay = y0 + end[1], mx = (ax + X) / 2, my = (ay + Y - 8) / 2 + 4 * (1 - q);
        if (q < .6) { const w = 2.4 * (1 - q / .6) + .6; for (let n = 0; n <= 12; n++) { const u = n / 12, bx = (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * mx + u * u * X, by = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * my + u * u * (Y - 8), ww = Math.max(1, Math.round(w * (1 - Math.abs(u - .5) * .9))); g.fillStyle = rp.base; g.fillRect(Math.round(bx), Math.round(by), ww, ww); } }
        else { const f = (q - .6) / .4; g.fillStyle = rp.base; for (let n = 0; n < 3; n++) { g.beginPath(); g.arc(mx + (n - 1) * 3, my + f * f * 14 + n, 1.2, 0, 6.29); g.fill(); } } }
    }
    titleDrop(id, X, Y, t, p.flip, 2, p.mode === 'paint' ? 'angry' : undefined);
  }
}
// ---- Portada breve y automática. Cualquier tecla adelanta su apertura y desbloquea el audio.
const COVER = { t: 0, open: 0 };
function updateCover() {
  // El cuaderno espera cerrado hasta la primera tecla, clic o toque: el navegador sólo deja sonar el audio tras un gesto,
  // así la escritura, el sello y la cinemática ya se oyen. Esa primera pulsación no salta nada.
  if (!COVER.started) { COVER.idle = (COVER.idle || 0) + 1; if (ANYKEY || pressed.ok) { ANYKEY = false; for (const k in pressed) pressed[k] = false; COVER.started = true; COVER.t = 0; Audio.init(); Audio.sfx('page', { vol: .5 }); } return; }
  COVER.t++; COVER.dust = COVER.dust || []; for (const d of COVER.dust) { d.x += d.vx; d.y += d.vy; d.vy += .1; d.t++; } COVER.dust = COVER.dust.filter(d => d.t < d.life);
  if (COVER.open) { if (COVER.t - COVER.open === 1) Audio.sfx('book_open'); if (COVER.t - COVER.open >= 40) { COVER.snap = null; Audio.play('title'); startPrologue(); } ANYKEY = false; return; }
  const t = Math.floor(COVER.t * 1.35), prev = Math.floor((COVER.t - 1) * 1.35), done = t >= 175;
  if (t > 20 && t <= 110 && (t - 20) % 10 === 1) Audio.sfx('scratch', { vol: .35, semi: RI(-2, 4) }); // el lápiz escribe
  if (t >= 112 && prev < 112) Audio.sfx('scratch_long', { vol: .5 }); if (t >= 126 && prev < 126) Audio.sfx('fwip', { vol: .6 }); // subrayado y floritura
  if (t >= 138 && prev < 138) { Audio.sfx('impact_sub', { vol: .55 }); Audio.sfx('rub', { when: .02, vol: .4 }); for (let i = 0; i < 12; i++) COVER.dust.push({ x: 200 + R(-40, 40), y: 132 + R(-4, 4), vx: R(-1.4, 1.4), vy: -R(.2, 1.2), t: 0, life: RI(12, 20), col: '#e9e1cc' }); } // el sello golpea
  if (t >= 158 && prev < 158) { Audio.sfx('whip', { vol: .5 }); Audio.sfx('fwip', { when: .12, semi: 5, vol: .5 }); } // la goma elástica salta
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
// La tapa: un cuaderno de dibujo de cartón kraft sobre la mesa del taller. Espiral metálica, goma elástica, esquinas gastadas y
// huellas de los tres pigmentos. Una plumilla escribe «gavilanbe» en una tira de cinta de carrocero, un sello de goma estampa
// «presenta» en violeta, la goma elástica salta y la tapa se abre. Todo depende de t (sin azar): redibujar da la misma imagen.
const COVER_BOOK = { x: 26, y: 10, w: 276, h: 160 };
function coverDesk() {
  return cached('cover-desk', () => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), rnd = seeded(33), F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    // mesa de nogal: tablones con vetas largas y juntas oscuras
    F('#4a3122', 0, 0, W, H);
    for (let y = 0; y < H; y++) { const plank = Math.floor(y / 45); for (let xx = 0; xx < W; xx += 1) { const v = Math.sin(xx * .045 + plank * 3 + Math.sin(y * .3 + plank) * 1.4) + Math.sin(xx * .19 + y * .07) * .3; if (v > .9) F('#5a3d2a', xx, y); else if (v < -1.05) F('#3c2619', xx, y); } if (y % 45 === 0) F('#2a1a10', 0, y, W, 1); }
    for (let i = 0; i < 260; i++) F(rnd() < .5 ? '#553a28' : '#402a1c', rnd() * W | 0, rnd() * H | 0, 2, 1);
    // cosas sobre la mesa: un lápiz, un tubo apretado y unas gotas secas
    const pencil = (px, py, len, col) => { const rp = ramp(col); for (let i = 0; i < len; i++) { F('#241e32', px + i, py - 1, 1, 5); F(rp.base, px + i, py, 1, 3); F(rp.hi, px + i, py, 1, 1); } F('#e8cf9a', px + len, py, 3, 3); F('#241e32', px + len + 3, py + 1, 2, 1); F('#c5848b', px - 3, py, 3, 3); };
    pencil(70, 173, 30, C('amarillo')); pencil(214, 174, 22, C('rojo'));
    x.save(); x.translate(306, 22); x.rotate(1.2); const t = ramp(C('azul')); x.fillStyle = '#241e32'; x.fillRect(-2, -5, 26, 10); x.fillStyle = '#c9c4d4'; x.fillRect(0, -4, 22, 8); x.fillStyle = t.base; x.fillRect(6, -4, 10, 8); x.fillStyle = t.hi; x.fillRect(6, -4, 10, 2); x.fillStyle = '#8c8ab0'; x.fillRect(22, -2, 5, 4); x.restore();
    [[12, 30, 'rojo'], [16, 36, 'rojo'], [306, 150, 'azul'], [300, 120, 'amarillo']].forEach(([a, b, k]) => { const rp = ramp(C(k)); F(rp.sh, a - 2, b, 5, 2); F(rp.base, a - 1, b - 1, 3, 2); F(rp.hi, a - 1, b - 1, 1, 1); });
    // sombra del cuaderno sobre la mesa
    const B0 = COVER_BOOK; x.globalAlpha = .45; F('#1a100a', B0.x + 4, B0.y + 5, B0.w, B0.h); x.globalAlpha = .25; F('#1a100a', B0.x + 7, B0.y + 8, B0.w, B0.h); x.globalAlpha = 1;
    return c;
  });
}
function coverBoard() {
  return cached('cover-board', () => {
    const B0 = COVER_BOOK, c = document.createElement('canvas'); c.width = B0.w; c.height = B0.h; const x = c.getContext('2d'), rnd = seeded(71), F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    // cartón kraft: base cálida, fibras cortas en todas direcciones y motas
    F('#a57c52', 0, 0, B0.w, B0.h);
    for (let i = 0; i < 2600; i++) { const a = rnd() * B0.w | 0, b = rnd() * B0.h | 0, L = 1 + (rnd() * 3 | 0); F(rnd() < .5 ? '#b58b5f' : '#96704a', a, b, rnd() < .5 ? L : 1, rnd() < .5 ? 1 : L); }
    for (let i = 0; i < 180; i++) F(rnd() < .6 ? '#6f5034' : '#caa37a', rnd() * B0.w | 0, rnd() * B0.h | 0);
    // luz desde arriba a la izquierda y un velo más oscuro hacia la esquina de abajo
    for (let y = 0; y < B0.h; y++) for (let a = 0; a < B0.w; a += 2) { const k = (a / B0.w + y / B0.h) / 2; if (((a >> 1) + y) % 3 === 0) { if (k < .22) F('#b99064', a, y); else if (k > .78) F('#8a6440', a, y); } }
    // canto: borde oscuro, bisel claro arriba, y un marco hundido a 7 px
    F('#5e4229', 0, 0, B0.w, 1); F('#5e4229', 0, B0.h - 1, B0.w, 1); F('#5e4229', B0.w - 1, 0, 1, B0.h); F('#caa37a', 1, 1, B0.w - 2, 1); F('#7c5a39', 1, B0.h - 2, B0.w - 2, 1);
    const fr = (col, o) => { F(col, 16 + o, 7 + o, B0.w - 23 - o * 2, 1); F(col, 16 + o, B0.h - 8 - o, B0.w - 23 - o * 2, 1); F(col, 16 + o, 7 + o, 1, B0.h - 14 - o * 2); F(col, B0.w - 8 - o, 7 + o, 1, B0.h - 14 - o * 2); };
    fr('#7c5a39', 0); fr('#c49b70', 1);
    // esquinas gastadas: el cartón se deshilacha en claro
    [[B0.w - 1, 0, -1, 1], [B0.w - 1, B0.h - 1, -1, -1]].forEach(([cx, cy, dx, dy]) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7 - i; j++) if ((i + j) % 2 || i + j < 3) F(i + j < 2 ? '#4a3122' : '#d6b287', cx + dx * i, cy + dy * j); });
    // huellas de pigmento: tres dedos de pintor, rojo, amarillo y azul, con sus crestas
    [[B0.w - 58, 122, 'rojo'], [B0.w - 44, 128, 'amarillo'], [B0.w - 31, 121, 'azul']].forEach(([a, b, k], n) => { const rp = ramp(C(k)); for (let r = 0; r < 7; r++) { const ry = r - 3.5, half = Math.round(4 * Math.sqrt(Math.max(0, 1 - (ry / 4.2) ** 2))); for (let q = -half; q <= half; q++) if ((q + r * 2 + n) % 3) F(r % 2 ? rp.base : rp.sh, a + q, b + r); } F(rp.hi, a - 2, b + 1, 2, 1); });
    // un cerco de café
    x.strokeStyle = '#7a5634'; x.lineWidth = 2; x.globalAlpha = .5; x.beginPath(); x.ellipse(52, 132, 17, 15, 0, .3, 5.6); x.stroke(); x.globalAlpha = .25; x.beginPath(); x.ellipse(52, 132, 15, 13, 0, 2, 4.4); x.stroke(); x.globalAlpha = 1;
    return c;
  });
}
function coverSpiral(t) {
  const B0 = COVER_BOOK;
  for (let y = B0.y + 7; y < B0.y + B0.h - 6; y += 9) {
    g.fillStyle = '#2a1a10'; g.fillRect(B0.x + 6, y + 1, 4, 3); // el agujero en el cartón
    // la espira: entra por el agujero, rodea el canto y sale por detrás; brillo en su curva
    g.fillStyle = '#4a4660'; g.fillRect(B0.x - 5, y - 1, 13, 3); g.fillStyle = '#8c8ab0'; g.fillRect(B0.x - 5, y - 1, 13, 2); g.fillStyle = '#d8d6e6'; g.fillRect(B0.x - 3, y - 1, 6, 1); g.fillStyle = '#4a4660'; g.fillRect(B0.x - 6, y, 2, 3); g.fillStyle = '#b8b6cc'; g.fillRect(B0.x - 6, y, 1, 2);
  }
}
function coverStrokes() { // trazos de "gavilanbe" en pantalla, con longitudes acumuladas
  if (COVER.strokes) return COVER.strokes;
  const word = 'gavilanbe', S = 2.2, cw = 19, x0 = W / 2 - word.length * cw / 2 + 6, ty = 58, out = []; let acc = 0;
  word.split('').forEach((ch, i) => { for (const st of HAND[ch]) { const pts = st.map(([x, y]) => [x0 + i * cw + x * S, ty + y * S]); let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); out.push({ pts, len, start: acc, letter: i }); acc += len + 6; } });
  return COVER.strokes = { list: out, total: acc, x0, ty, cw, S };
}
function drawCoverArt(t) {
  const B0 = COVER_BOOK;
  g.drawImage(coverDesk(), 0, 0);
  // la goma elástica: al final se estira, salta y cae por el canto derecho
  const snap = clamp((t - 158) / 14, 0, 1), bandX = B0.x + B0.w - 22 + (snap < .45 ? snap / .45 * 5 : 5 + (snap - .45) / .55 * 40), bandA = snap > .45 ? 1 - (snap - .45) / .55 : 1;
  const writing = t > 20 && t < 112, stamp = t >= 138 && t < 150, jx = writing && t % 4 === 0 ? .5 : 0, jy = stamp ? Math.round(Math.sin((t - 138) * 1.7) * (1 - (t - 138) / 12) * 2) : 0;
  g.save(); g.translate(Math.round(jx), jy);
  g.drawImage(coverBoard(), B0.x, B0.y); coverSpiral(t);
  // la etiqueta: una tira de cinta de carrocero con los extremos rasgados y la cinta translúcida
  const L = { x: 72, y: 50, w: 190, h: 50 };
  g.fillStyle = 'rgba(40,24,12,.35)'; g.fillRect(L.x + 2, L.y + 3, L.w, L.h);
  g.fillStyle = '#efe4c4'; g.fillRect(L.x, L.y, L.w, L.h); g.fillStyle = '#e3d5ae'; for (let i = 0; i < L.w; i += 3) g.fillRect(L.x + i, L.y + ((i * 7) % 5 < 2 ? 0 : 1), 2, 1);
  g.fillStyle = '#f7efd6'; g.fillRect(L.x, L.y + 2, L.w, 1); g.fillStyle = '#d8c79b'; g.fillRect(L.x, L.y + L.h - 1, L.w, 1);
  for (let j = 0; j < L.h; j++) { const l = (j * 7) % 4, r = (j * 5) % 4; g.fillStyle = '#a57c52'; g.fillRect(L.x, L.y + j, l, 1); g.fillRect(L.x + L.w - r, L.y + j, r, 1); }
  // la plumilla escribe con tinta: los trazos terminados quedan con un brillo húmedo que se seca
  const CS = coverStrokes(), word = 'gavilanbe', cw = CS.cw, x0 = CS.x0, ty = CS.ty + 14;
  const gk = clamp((t - 8) / 12, 0, 1); if (gk > 0) { g.fillStyle = '#cdbf9a'; g.fillRect(x0 - 4, ty + 9, Math.round((word.length * cw + 8) * gk), 1); }
  const prog = clamp((t - 20) / 90, 0, 1), dist = prog * CS.total; let penX = x0, penY = ty + 8, lifting = true;
  for (const st of CS.list) { if (dist <= st.start) break; const k = clamp((dist - st.start) / st.len, 0, 1), S2 = st.pts, fresh = dist - st.start - st.len < 40;
    for (let i = 1; i < S2.length; i++) { const segEnd = i / (S2.length - 1), segStart = (i - 1) / (S2.length - 1); if (k <= segStart) break; const kk = clamp((k - segStart) / (segEnd - segStart), 0, 1), ex = lerp(S2[i - 1][0], S2[i][0], kk), ey = lerp(S2[i - 1][1], S2[i][1], kk), dy = Math.abs(S2[i][1] - S2[i - 1][1]), len = Math.hypot(S2[i][0] - S2[i - 1][0], S2[i][1] - S2[i - 1][1]) || 1;
      pstroke(S2[i - 1][0], S2[i - 1][1], ex, ey, dy / len > .6 ? 3 : 2, INK, 1, 0, false); if (fresh) pstroke(S2[i - 1][0] - 1, S2[i - 1][1] - 1, ex - 1, ey - 1, 1, '#5a5478', 1, 0, false); } // plumilla: más gruesa en los trazos verticales
    if (k < 1) { const q = pointAt(S2, k); penX = q[0]; penY = q[1]; lifting = false; } }
  if (t > 20 && t < 112 && lifting) { const nx = CS.list.find(st => st.start >= dist); if (nx) { penX = nx.pts[0][0]; penY = nx.pts[0][1] - 4; } }
  // subrayado ondulado con un remate
  const uk = clamp((t - 112) / 12, 0, 1); if (uk > 0) { g.fillStyle = INK; for (let i = 0; i < Math.round((word.length * cw + 6) * uk); i++) g.fillRect(x0 - 3 + i, ty + 12 + Math.round(Math.sin(i * .35) * 1.2), 2, 1); if (uk < 1) { penX = x0 - 3 + (word.length * cw + 6) * uk; penY = ty + 13; lifting = false; } }
  if (t > 20 && t < 140) { const img = propSprite('pluma', '#6a4a8a'), P = PROP.pluma, fk = clamp((t - 124) / 16, 0, 1), lift = lifting && uk >= 1 ? 1 : 0;
    const px = lift ? lerp(x0 + word.length * cw + 4, W + 40, fk * fk) : penX, py = lift ? lerp(ty + 13, -30, fk) : penY, ang = lift ? -.95 + fk * 5 : -.95 + Math.sin(t * .8) * .05;
    drawProp(img, px, py, ang, 1, P.tip[0], P.tip[1], 1, lift ? 1 - fk * .6 : 1); }
  // el sello: baja, golpea y se levanta; deja «presenta» en violeta con la tinta desigual de un sello de goma
  if (t > 128) {
    const sx = 200, sy = 122, down = t < 138 ? 1 - (t - 128) / 10 : t < 150 ? 0 : clamp((t - 150) / 10, 0, 1);
    if (t >= 138) { const stampImg = cached('cover-stamp', () => { const c = document.createElement('canvas'); c.width = 84; c.height = 24; const x = c.getContext('2d'), rnd = seeded(12), vi = C('violeta');
        x.fillStyle = '#5a2f86'; x.fillRect(1, 0, 82, 1); x.fillRect(1, 23, 82, 1); x.fillRect(0, 1, 1, 22); x.fillRect(83, 1, 1, 22); x.fillRect(3, 2, 78, 1); x.fillRect(3, 21, 78, 1); x.fillRect(2, 3, 1, 18); x.fillRect(81, 3, 1, 18);
        return c; });
      g.save(); g.translate(sx, sy); g.rotate(-.09); g.globalAlpha = .9; g.drawImage(stampImg, -42, -12); bigText('PRESENTA', -34, -7, '#5a2f86', { outline: 'rgba(0,0,0,0)', hi: '#6e3d9e', shadow: '#4a2470' }); g.globalAlpha = 1;
      // la goma no carga igual en todas partes: calvas de papel dentro de las letras
      const rnd = seeded(5); g.fillStyle = '#a57c52'; for (let i = 0; i < 26; i++) g.fillRect(Math.round(-38 + rnd() * 76), Math.round(-9 + rnd() * 18), 1 + (rnd() * 2 | 0), 1); g.restore(); }
    if (down < 1) { const hy = sy - 16 - down * 70, sq = t >= 138 && t < 142 ? 2 : 0;
      g.fillStyle = 'rgba(40,24,12,.3)'; g.fillRect(sx - 30 + down * 10, sy + 10, 64 - down * 20, 4);
      g.fillStyle = '#241e32'; g.fillRect(sx - 44, hy + 10 + sq, 88, 7); g.fillStyle = '#6b4a8a'; g.fillRect(sx - 43, hy + 14 + sq, 86, 3); // la goma entintada
      g.fillStyle = '#241e32'; g.fillRect(sx - 40, hy + 2 + sq, 80, 9); g.fillStyle = '#b07a48'; g.fillRect(sx - 39, hy + 3 + sq, 78, 7); g.fillStyle = '#d8a870'; g.fillRect(sx - 39, hy + 3 + sq, 78, 2); // taco de madera
      g.fillStyle = '#241e32'; g.fillRect(sx - 7, hy - 22, 14, 25); g.fillStyle = '#8a5a34'; g.fillRect(sx - 6, hy - 21, 12, 24); g.fillStyle = '#b07a48'; g.fillRect(sx - 5, hy - 21, 4, 24); // mango
      g.fillStyle = '#241e32'; g.fillRect(sx - 10, hy - 30, 20, 10); g.fillStyle = '#6a3a3a'; g.fillRect(sx - 9, hy - 29, 18, 8); g.fillStyle = '#a65a5a'; g.fillRect(sx - 8, hy - 29, 7, 3); }
  }
  g.restore();
  // la goma elástica por encima de todo: roja, con brillo; salta al final
  if (bandA > 0) { g.save(); g.globalAlpha = bandA; const bx = Math.round(bandX), sag = snap > .45 ? Math.round((snap - .45) * 60) : 0;
    g.fillStyle = '#241e32'; g.fillRect(bx - 1, 0, 7, H); g.fillStyle = '#9a2f3a'; g.fillRect(bx, 0, 5, H); g.fillStyle = '#d0505c'; g.fillRect(bx + 1, 0, 1, H); g.fillStyle = '#6a1f28'; g.fillRect(bx + 4, 0, 1, H);
    g.fillStyle = 'rgba(20,12,8,.3)'; g.fillRect(bx + 6, B0.y, 2, B0.h); if (sag) g.fillRect(bx, H - sag, 5, sag); g.restore(); }
  // luz de la lámpara del taller: esquinas en penumbra
  const vg = cached('cover-vignette', () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); for (let y = 0; y < H; y++) for (let a = 0; a < W; a++) { const d = Math.hypot((a - W * .42) / W, (y - H * .4) / H); if (d > .5 && (a + y) % 2 === 0) { x.fillStyle = `rgba(20,10,4,${Math.min(.5, (d - .5) * 1.4).toFixed(2)})`; x.fillRect(a, y, 1, 1); } } return c; });
  g.drawImage(vg, 0, 0);
  for (const d of COVER.dust || []) { g.fillStyle = d.col; g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }
}
function drawCover() {
  const t = COVER.t;
  if (!COVER.started) { drawCoverArt(0); // el cuaderno cerrado sobre la mesa y una nota que invita a abrirlo
    const mobile = typeof MOBILE !== 'undefined' && MOBILE.enabled, line = mobile ? 'Toca para abrir el cuaderno' : 'Pulsa una tecla para abrir el cuaderno', w = textWidth(line) + 18, x = Math.round((W - w) / 2), y = 142, pulse = Prefs.shake ? Math.sin((COVER.idle || 0) * .08) : 0;
    g.save(); g.globalAlpha = .75 + .25 * pulse; maskingLabel(x, y, w, 15, '#f7efd6'); smallText(line, x + 9, y + 4, '#3a2f2a'); g.restore(); paintDab(x - 6, y + 7 + Math.round(pulse), 3, C('rojo')); return; }
  if (!COVER.open) { drawCoverArt(t * 1.35); return; }
  if (!COVER.snap) { COVER.snap = document.createElement('canvas'); COVER.snap.width = W; COVER.snap.height = H; COVER.snap.getContext('2d').drawImage(buf, 0, 0); }
  const pt = PRO.t; PRO.t = 0; drawPrologue(); PRO.t = pt; // debajo, el primer plano de la cinemática
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
  { at: 137, from: [60, 42], to: [87, 113], col: 'rojo', sound: 0 },
  { at: 132, from: [174, 44], to: [176, 151], col: 'azul', sound: 7 },
  { at: 165, from: [115, 43], to: [229, 145], col: 'amarillo', sound: 4 },
  { at: 183, from: [174, 44], to: [229, 145], col: 'azul', sound: 7 },
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
  const red = titleProgress(t, 165), blue = titleProgress(t, 160), gold = titleProgress(t, 193), green = titleProgress(t, 211, 56);
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
    const repair = titleProgress(t,185,60), pts = [[114,151],[130,151],[140,148],[153,150],[163,147]];
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
    const age = t-d.at, rp = ramp(C(d.col)); if (age < -10 || age > 57) return;
    if (age < 0) {
      // Surface tension: pigment gathers at the letter before the drop lets go.
      const k = (age+10)/10;
      g.fillStyle = rp.sh; g.fillRect(d.from[0]-1,d.from[1]-4,3,Math.round(k*4));
      g.fillStyle = rp.base; g.beginPath(); g.ellipse(d.from[0],d.from[1]-3+k*3,1+k,1+k*1.8,0,0,Math.PI*2); g.fill();
      g.fillStyle = rp.hi; g.fillRect(d.from[0]-1,d.from[1]-3+Math.round(k*3),1,1);
    } else if (age < 28) {
      const at = a => { const q = clamp(a/28,0,1); return [lerp(d.from[0],d.to[0],q),lerp(d.from[1],d.to[1],q*q)]; };
      const [x,y] = at(age), stretch = 2+Math.floor(age/9);
      if (Prefs.shake) for (let n = 1; n <= 2; n++) {
        const p = at(age-n*2); g.save(); g.globalAlpha = (.24-n*.07)*Prefs.shake;
        g.fillStyle = rp.base; g.fillRect(Math.round(p[0]),Math.round(p[1])-1,1,2); g.restore();
      }
      g.fillStyle = rp.out; g.fillRect(Math.round(x)-1,Math.round(y)-stretch,3,stretch+2);
      g.fillStyle = rp.base; g.fillRect(Math.round(x),Math.round(y)-stretch,2,stretch+1);
      g.fillStyle = rp.hi; g.fillRect(Math.round(x),Math.round(y)-stretch+1,1,2);
    } else {
      const q = (age-28)/29, impact = Math.sin(Math.min(1,q*3)*Math.PI);
      g.save(); g.globalAlpha = (1-q)*.7;
      g.strokeStyle = rp.base; g.lineWidth = 1;
      g.beginPath(); g.ellipse(d.to[0],d.to[1]+1,2+q*15,1+q*4,0,0,Math.PI*2); g.stroke();
      if (Prefs.shake) {
        // A little crown compresses into a wash; the paper never shakes.
        titleLine([[d.to[0]-5,d.to[1]],[d.to[0]-4,d.to[1]-impact*5],[d.to[0]-1,d.to[1]+1],[d.to[0]+2,d.to[1]-impact*4],[d.to[0]+5,d.to[1]]],rp.base,2);
        for (let n = 0; n < 7; n++) {
          const a = n*Math.PI*2/7+i*.7, x = d.to[0]+Math.cos(a)*q*17, y = d.to[1]+Math.sin(a)*q*6-Math.sin(q*Math.PI)*(4+n%3);
          g.fillStyle = n%3 ? rp.base : rp.hi; g.fillRect(Math.round(x),Math.round(y),n%2?1:2,1);
        }
      }
      g.restore();
    }
  });
}
// ---- Las gotas pintan su propio título. Cada letra la pinta la gota de su color; las secundarias, las dos gotas cuyos pigmentos
// la mezclan. Mientras otra pinta, cada gota espera sentada sobre su última letra; al terminar las suyas baja de un salto al paisaje.
const TITLE_PAINTERS = { rojo: ['carmin'], amarillo: ['ambar'], azul: ['anil'], naranja: ['carmin', 'ambar'], verde: ['ambar', 'anil'], violeta: ['carmin', 'anil'] };
const TITLE_HOME = { carmin: { col: 'rojo', home: [120, 158], land: 165 }, ambar: { col: 'amarillo', home: [147, 137], land: 193 }, anil: { col: 'azul', home: [207, 165], land: 160 } };
const logoToScreen = (x, y) => [LOGO.x0 + x, LOGO.y0 + y];
function titleLetterSpan(i) { const s = LOGO_BEATS.start + i * LOGO_BEATS.step; return [s, s + LOGO_BEATS.stroke]; }
function titleLettersOf(id) { return TITLE.letters.split('').map((_, i) => i).filter(i => TITLE_PAINTERS[TITLE.cols[i]].includes(id)); }
function titleBrushTip(i, k) { const tip = logoTip(TITLE.letters[i], k); return [i * LOGO.cw + tip.x, logoLetterY(i) + tip.y - tip.lift]; }
// Dónde está una gota en el instante t, en coordenadas del logo; o 'leave' con su progreso hacia el paisaje.
function titlePainterAt(id, t) {
  const mine = titleLettersOf(id), side = i => TITLE_PAINTERS[TITLE.cols[i]].indexOf(id) ? -1 : 1, bob = Math.sin(t * .2 + id.length) * 1.2;
  const atBrush = (i, k) => { const [x, y] = titleBrushTip(i, side(i) < 0 ? Math.max(0, k - .16) : k); return [x, y + 5 + bob * .3]; }, seat = i => [i * LOGO.cw + 14 + 3 * side(i), logoLetterY(i) + 5]; // la gota ES la brocha: va sobre la punta del trazo (la segunda, un poco detrás)
  const [s0] = titleLetterSpan(mine[0]); if (t < s0 - 10) return null;
  const last = mine[mine.length - 1], [, lastEnd] = titleLetterSpan(last), land = TITLE_HOME[id].land;
  if (t > lastEnd + 8) return t >= land ? null : { mode: 'leave', k: clamp((t - lastEnd - 8) / (land - lastEnd - 8), 0, 1), from: logoToScreen(...seat(last)) };
  for (let n = 0; n < mine.length; n++) {
    const i = mine[n], [s, e] = titleLetterSpan(i);
    if (t >= s - 10 && t < s) { // salta hasta el pincel: desde arriba la primera vez, desde su asiento después
      const q = (t - (s - 10)) / 10, from = n ? seat(mine[n - 1]) : [atBrush(i, 0)[0], -40], to = atBrush(i, 0);
      return { mode: 'hop', x: lerp(from[0], to[0], q), y: lerp(from[1], to[1], q) - Math.sin(q * Math.PI) * 10, flip: side(i) > 0, i };
    }
    if (t >= s && t <= e) { const p = atBrush(i, (t - s) / LOGO_BEATS.stroke); return { mode: 'paint', x: p[0], y: p[1], flip: side(i) > 0, i }; }
    if (t > e && t <= e + 8) { const q = (t - e) / 8, from = atBrush(i, 1), to = seat(i); return { mode: 'hop', x: lerp(from[0], to[0], q), y: lerp(from[1], to[1], q) - Math.sin(q * Math.PI) * 8, flip: false, i }; }
  }
  const done = mine.filter(i => titleLetterSpan(i)[1] + 8 < t).pop(); if (done === undefined) return null;
  const [x, y] = seat(done); return { mode: 'sit', x, y: y + (Math.sin(t * .09 + id.length) > .8 ? -1 : 0), flip: false, i: done };
}
function titleDrop(id, x, y, t, flip, s = 1, eyes) { drawSprite(buildSprite(id + '_side_mini', C(TITLE_HOME[id].col), null, { eyes: eyes || (((t + id.length * 40) % 220) < 6 ? 'blink' : 'normal') }), Math.round(x), Math.round(y), s, flip); }
// La Tinta vuelve cada cierto tiempo: repta por la página hasta una letra y se bebe su color; su pintora sube del paisaje,
// la repinta de un brochazo y la espanta. Es función de t: seguir mirando la portada no cambia nada del juego.
const TITLE_RAID = { from: 480, every: 900, order: [5, 2, 7, 0, 4, 1, 6, 3] };
function titleRaid(t) {
  if (t < TITLE_RAID.from) return null; const n = Math.floor((t - TITLE_RAID.from) / TITLE_RAID.every), p = (t - TITLE_RAID.from) % TITLE_RAID.every; if (p >= 240) return null;
  const L = TITLE_RAID.order[n % TITLE_RAID.order.length], painter = TITLE_PAINTERS[TITLE.cols[L]][0];
  const drain = p < 70 ? 0 : p < 110 ? (p - 70) / 40 : p < 150 ? 1 : p < 186 ? 1 - (p - 150) / 36 : 0;
  return { L, p, painter, drain, away: p >= 110 && p < 232 };
}
function titleRaidAway(id, t) { const r = titleRaid(t); return !!r && r.painter === id && r.away; }
// Visitas: cada poco, una de las gotas sube del paisaje a una letra de su color, bota encima (la letra tiembla como
// gelatina y salpica) y vuelve a su sitio. Nunca coincide con la Tinta.
const TITLE_VISIT = { from: 330, every: 290, dur: 92, who: ['ambar', 'anil', 'carmin'] };
function titleVisit(t) {
  if (t < TITLE_VISIT.from || titleRaid(t)) return null; const n = Math.floor((t - TITLE_VISIT.from) / TITLE_VISIT.every), p = (t - TITLE_VISIT.from) % TITLE_VISIT.every; if (p >= TITLE_VISIT.dur) return null;
  const id = TITLE_VISIT.who[n % 3], own = TITLE.cols.map((c, i) => c === TITLE_HOME[id].col ? i : -1).filter(i => i >= 0), L = own[Math.floor(n / 3) % own.length];
  return { id, L, p, n };
}
function titleAway(id, t) { const v = titleVisit(t); return titleRaidAway(id, t) || (!!v && v.id === id); }
const TITLE_VISIT_HOPS = [24, 38, 50, 60];
function drawTitleVisit(t) {
  const v = titleVisit(t); if (!v) return; const { id, L, p } = v, home = TITLE_HOME[id].home, [sx, sy] = logoToScreen(L * LOGO.cw + 14, logoLetterY(L) + 17), col = C(TITLE_HOME[id].col);
  let x, y, sc = 1.6, sq = [1, 1], eyes = 'normal';
  if (p < 24) { const q = p / 24; x = lerp(home[0], sx, ease(q)); y = lerp(home[1], sy, q) - Math.sin(q * Math.PI) * 40; sc = 1 + q * .6; sq = q < .3 ? [.8, 1.25] : [1, 1]; }
  else if (p < 62) { const hop = TITLE_VISIT_HOPS.findIndex((h, i) => p < (TITLE_VISIT_HOPS[i + 1] ?? 62)), a = TITLE_VISIT_HOPS[hop], b = TITLE_VISIT_HOPS[hop + 1] ?? 62, q = (p - a) / (b - a);
    x = sx; y = sy - Math.sin(q * Math.PI) * (hop === 2 ? 14 : 9); eyes = 'happy'; if (q < .18) sq = [1.3, .72]; else if (q > .85) sq = [.85, 1.2];
    if (q < .3 && Prefs.shake) { const r = seeded(t + L); g.fillStyle = col; for (let n = 0; n < 5; n++) g.fillRect(Math.round(sx + (r() - .5) * 26), Math.round(sy + 2 - r() * 8 - q * 10), 1, 1); } }
  else { const q = (p - 62) / 30; x = lerp(sx, home[0], ease(q)); y = lerp(sy, home[1], q) - Math.sin(q * Math.PI) * 30; sc = 1.6 - q * .6; }
  shadow(Math.round(x), Math.round(p >= 24 && p < 62 ? sy + 1 : y), 6);
  drawSprite(buildSprite(id + '_side_mini', col, null, { eyes }), Math.round(x), Math.round(y), sc * sq[0], x > home[0], sq[1]);
}
function drawTitleRaid(t) {
  const r = titleRaid(t); if (!r) return;
  const { L, p, painter } = r, [lx, ly] = logoToScreen(L * LOGO.cw + 14, logoLetterY(L) + 3), start = [W + 14, 14];
  // la tinta: avanza por el borde superior dejando un rastro, se posa sobre la letra y huye cuando llega la brocha
  const come = clamp(p / 70, 0, 1), flee = clamp((p - 160) / 30, 0, 1), k = come * (1 - flee), hx = lerp(start[0], lx, ease(k)), hy = lerp(start[1], ly - 4, ease(k)) - Math.sin(k * Math.PI) * 6;
  if (k > 0 && (p < 190)) {
    const N = 14; for (let i = 1; i <= N; i++) { const a = (i - 1) / N, b = i / N, ax = lerp(start[0], hx, a), ay = lerp(start[1], hy, a) + Math.sin(a * 9 + t * .1) * 2, bx = lerp(start[0], hx, b), by = lerp(start[1], hy, b) + Math.sin(b * 9 + t * .1) * 2; pstroke(ax, ay, bx, by, 1 + b * 2.5, '#0b0912', 1, 0, false); }
    inkSplat(hx, hy, 5 + (p > 60 && p < 150 ? 3 + Math.sin(t * .2) : 0), 1, t, 13, p > 70);
    if ((t % 120) > 5) { g.fillStyle = '#efe4bf'; g.fillRect(Math.round(hx - 3), Math.round(hy - 2), 2, 2); g.fillRect(Math.round(hx + 1), Math.round(hy - 2), 2, 2); }
    // mientras bebe, hilos de color suben de la letra a la tinta
    if (p > 70 && p < 150) { const col = C(TITLE.cols[L]); for (let j = 0; j < 3; j++) { const q = ((t + j * 7) % 20) / 20; g.fillStyle = col; g.fillRect(Math.round(lerp(lx + (j - 1) * 5, hx, q)), Math.round(lerp(ly + 14, hy, q)), 2, 2); } }
  }
  // la pintora sube del paisaje, repinta la letra con su brocha y vuelve
  const home = TITLE_HOME[painter].home, col = C(TITLE.cols[L]);
  if (p >= 110 && p < 150) { const q = (p - 110) / 40, x = lerp(home[0], lx + 6, ease(q)), y = lerp(home[1], ly - 4, q) - Math.sin(q * Math.PI) * 34; titleDrop(painter, x, y, t, x > home[0], 1 + q, 'normal'); }
  else if (p >= 150 && p < 190) { const k2 = (p - 150) / 36, [tx, ty] = titleBrushTip(L, Math.min(1, k2)), [sx, sy] = logoToScreen(tx, ty), P = PROP.brocha;
    drawProp(propSprite('brocha', col), sx, sy, -2.3, 1, 58, 10, .7); titleDrop(painter, sx + 13, sy - 10 + Math.sin(t * .4), t, false, 2, 'angry'); if (k2 < 1 && Prefs.shake) { g.fillStyle = ramp(col).hi; g.fillRect(Math.round(sx) - 2, Math.round(sy) - 1, 3, 2); } }
  else if (p >= 190 && p < 232) { const q = (p - 190) / 42, x = lerp(lx + 6, home[0], ease(q)), y = lerp(ly - 4, home[1], q) - Math.sin(q * Math.PI) * 26; titleDrop(painter, x, y, t, x > home[0], 2 - q, 'happy'); }
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
  const red = titleAway('carmin',t) ? 0 : titleProgress(t,165,3), blue = titleAway('anil',t) ? 0 : titleProgress(t,160,3), gold = titleAway('ambar',t) ? 0 : titleProgress(t,193,3);
  if (red > 0) {
    const painting = titleProgress(t,185,60), idle = t % 600, working = t < 260 || idle > 480;
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
  const scale = r.width / W;
  const [x, y] = TITLE_MENU.rows[0]; Object.assign(titleStartButton.style, { left: r.left + (x - 8) * scale + 'px', top: r.top + (y - 9) * scale + 'px', width: 116 * scale + 'px', height: 18 * scale + 'px' });
}
addEventListener('resize', placeTitleButton);
titleStartButton.addEventListener('click', () => { if (Game.state === 'title' && !TITLE.exit) { Audio.init(); beginTitleGame(); } });
['pointerenter','focus'].forEach(ev => titleStartButton.addEventListener(ev, () => { if (Game.state === 'title' && !TITLE.exit && TITLE.sel !== 0) { TITLE.sel = 0; Audio.sfx('cursor'); } }));
function beginTitleGame() {
  if (TITLE.exit) return;
  TITLE.t = Math.max(TITLE.t, 280); TITLE.exit = TITLE.t;
  TITLE.snap = null; titleStartButton.style.display = 'none';
  Audio.sfx('confirm', { semi: 0 }); Audio.sfx('confirm', { semi: 4, when: .08 }); Audio.sfx('confirm', { semi: 7, when: .16 });
}
function updateTitle() {
  TITLE.t++;
  if (typeof CHAPTER !== 'undefined' && CHAPTER.direct && TITLE.t >= LOGO_BEATS.ready && !TITLE.exit) { CHAPTER.direct=false;chapterPreview();return; }
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
  if (TITLE.t === LOGO_BEATS.ready) { titleStartButton.style.display = 'block'; placeTitleButton(); }
  for (let i = 0; i < TITLE.letters.length; i++) {
    const age = TITLE.t - LOGO_BEATS.start - i * LOGO_BEATS.step;
    if (age === 0) Audio.sfx('brush_sweep', { pan: (i - 3.5) * .14, vol: .34, len: .75, semi: i % 3 - 1 });
    if (age === LOGO_BEATS.stroke) Audio.sfx('plop', { pan: (i - 3.5) * .14, vol: .22, semi: [-5,-3,0,2,4,7,9,12][i] });
  }
  for (const d of TITLE_DROPS) if (TITLE.t === d.at + 28) Audio.sfx('plop', { semi: d.sound, vol: .4 });
  if (TITLE.t === 213) Audio.sfx('grow', { vol: .25, semi: 4 });
  for (const id of ['carmin','ambar','anil']) if (TITLE.t === TITLE_HOME[id].land) Audio.sfx('plop', { semi: SEMI[id], vol: .35 }); // aterrizan en el paisaje
  const raid = titleRaid(TITLE.t);
  if (raid) { const p = raid.p; if (p === 0) Audio.sfx('ink_tide', { vol: .35 }); if (p === 80) Audio.sfx('slow_drip', { vol: .35 }); if (p === 110) Audio.sfx('fwip', { semi: SEMI[raid.painter], vol: .4 }); if (p === 150) Audio.sfx('brush_sweep', { vol: .4, semi: SEMI[raid.painter] }); if (p === 166) Audio.sfx('ink_hit', { vol: .3 }); if (p === 186) Audio.sfx('plop', { semi: SEMI[raid.painter] + 5, vol: .35 }); }
  if (TITLE.t >= LOGO_BEATS.ready && titleMenuRows() > 1) { const step = hit('down') || hit('right') ? 1 : hit('up') || hit('left') ? -1 : 0; if (step) { TITLE.sel = ((TITLE.sel || 0) + step + 2) % 2; Audio.sfx('cursor'); } }
  if (hit('ok')) { if ((TITLE.sel || 0) === 1 && TITLE.t >= LOGO_BEATS.ready && typeof chapterPreview === 'function') chapterPreview(); else beginTitleGame(); }
}
// El menú es una paleta de madera con dos pocillos: «comenzar» y «pasar página». Las flechas o el ratón llevan el cursor
// de tres gotas de uno a otro; confirmar exprime el pocillo. Los botones HTML transparentes dan foco, clic y nombre accesible.
const TITLE_MENU = { x: 76, y: 64, w: 168, h: 40, rows: [[104, 72], [104, 90]] };
function titleMenuRows() { return typeof chapterTitleButton !== 'undefined' && chapterTitleButton ? 2 : 1; }
function titleMenuPath(grow = 0) {
  const M = TITLE_MENU, cx = M.x + M.w / 2, cy = M.y + M.h / 2; g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283, bite = 1 - .1 * Math.exp(-((a - .15) ** 2) / .04), px = cx + Math.cos(a) * (M.w / 2 + grow) * bite, py = cy + Math.sin(a) * (M.h / 2 + grow) * bite * (1 + .06 * Math.sin(a * 3)); if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath(); g.moveTo(M.x + M.w - 16 + 5, cy + 4); g.ellipse(M.x + M.w - 16, cy + 4, 5 - grow * .3, 3.6 - grow * .3, 0, 0, 6.283);
}
function drawTitleMenu(t) {
  const M = TITLE_MENU, ex = TITLE.exit ? t - TITLE.exit : 0, intro = TITLE.exit ? 1 : titleProgress(t, LOGO_BEATS.ready, 16), rise = Math.round((1 - (1 - (1 - intro) ** 3)) * 40) + Math.round(ex * ex * .12), sel = TITLE.sel || 0, rows = titleMenuRows();
  if (intro <= 0) return;
  g.save(); g.translate(0, rise);
  g.save(); g.translate(1, 3); titleMenuPath(1); g.fillStyle = 'rgba(40,24,12,.3)'; g.fill('evenodd'); g.restore();
  titleMenuPath(1); g.fillStyle = '#5a3a24'; g.fill('evenodd'); titleMenuPath(); g.fillStyle = '#9a6a3e'; g.fill('evenodd');
  g.save(); g.translate(-1, -1); titleMenuPath(-1.5); g.fillStyle = '#e0b377'; g.fill('evenodd'); g.restore(); titleMenuPath(-2.5); g.fillStyle = '#c9955a'; g.fill('evenodd');
  g.save(); titleMenuPath(-2.5); g.clip('evenodd'); for (let i = 0; i < 5; i++) titleLine([[M.x - 4, M.y + 8 + i * 8], [M.x + 60, M.y + 6 + i * 8 + 3], [M.x + M.w + 4, M.y + 9 + i * 8]], i % 2 ? '#b8834c' : '#d6a86c');
  [['#ac554b', 96, 98], ['#5c7fa6', 214, 70], ['#e8cc94', 196, 97]].forEach(([c, x, y]) => { g.fillStyle = c; g.globalAlpha = .6; g.fillRect(x, y, 4, 2); g.fillRect(x + 1, y - 1, 2, 1); g.globalAlpha = 1; }); g.restore();
  // «comenzar», escrito a mano; «pasar página», más pequeño debajo
  const k = TITLE.exit ? 1 : titleProgress(t, LOGO_BEATS.ready + 4, 30), label = handStrokes('comenzar', M.rows[0][0] + 12, M.rows[0][1] - 5, 1.05, 10.5);
  const pressed = TITLE.exit > 0, focus0 = sel === 0, wash = titleProgress(t, LOGO_BEATS.ready + 14, 20);
  if (wash > 0) { g.save(); g.globalAlpha = (pressed ? .5 : focus0 ? .32 : .12) * wash; const x0 = M.rows[0][0] + 10, len = 90 * wash; titleLine([[x0, M.rows[0][1] + 5], [x0 + len, M.rows[0][1] + 4]], '#e76b55', 4); titleLine([[x0, M.rows[0][1] + 8], [x0 + len, M.rows[0][1] + 8]], '#edc65c', 3); titleLine([[x0, M.rows[0][1] + 10], [x0 + len, M.rows[0][1] + 10]], '#638dcd', 2); g.restore(); }
  drawHand(label, label.total * k, focus0 ? '#3a2f2a' : '#6b5d4c', 2);
  if (rows > 1) { const a = titleProgress(t, LOGO_BEATS.ready + 24, 12), focus1 = sel === 1; g.save(); g.globalAlpha *= a; if (focus1) { g.globalAlpha *= .35; titleLine([[M.rows[1][0] + 10, M.rows[1][1] + 4], [M.rows[1][0] + 66, M.rows[1][1] + 4]], '#8a5aa8', 5); g.globalAlpha /= .35; }
    smallText('pasar página', M.rows[1][0] + 12, M.rows[1][1] - 3, focus1 ? '#3a2f2a' : '#6b5d4c'); g.restore(); }
  // los pocillos: uno de mezcla para comenzar y uno de tinta para la otra hoja; el cursor de tres gotas salta entre ellos
  paintDab(M.rows[0][0], M.rows[0][1], 5, '#e8cc94'); paintDab(M.rows[0][0] - 1, M.rows[0][1] - 1, 3, C('naranja'));
  if (rows > 1) { paintDab(M.rows[1][0], M.rows[1][1], 4, '#3a3652'); paintDab(M.rows[1][0] - 1, M.rows[1][1] - 1, 2, '#6a6480'); }
  if (k >= 1 || TITLE.exit) { const [cx, cy] = M.rows[sel] || M.rows[0], b = Prefs.shake ? Math.round(Math.sin(t * .12) * 1.5) : 0, sq = pressed ? Math.min(1, ex / 6) : 0;
    paintDab(cx - 15, cy - 4 + b, 2.5 - sq, C('rojo')); paintDab(cx - 11, cy - 7 - b, 2.5 - sq, C('amarillo')); paintDab(cx - 15, cy + 2 + b, 2.5 - sq, C('azul')); }
  g.restore();
}
function drawTitle() {
  const t = TITLE.t, ex = TITLE.exit ? t - TITLE.exit : 0;
  if (ex >= 20 && TITLE.snap) { drawOverworld(); const q = clamp((ex - 20) / 40, 0, 1); pageCurl(TITLE.snap, q * q * (3 - 2 * q)); return; }
  g.drawImage(titlePaper(), 0, 0);
  titleLandscape(t); if (!ex) titleResidents(t);
  // Wet strokes settle into the original letterforms; the page stays still.
  drawLogo(t, LOGO.x0, LOGO.y0);
  titleDroplets(t);
  // bajan de un salto al paisaje al terminar sus letras
  for (const id of ['carmin','ambar','anil']) { const p = titlePainterAt(id,t); if (!p || p.mode !== 'leave') continue; const h = TITLE_HOME[id].home, x = lerp(p.from[0],h[0],p.k), y = lerp(p.from[1],h[1],p.k) - Math.sin(p.k * Math.PI) * 30; if (p.k > .1) shadow(Math.round(x),Math.round(lerp(p.from[1],h[1],p.k)) + 1,5); titleDrop(id,x,y,t,h[0] > p.from[0],1 + (1 - p.k),'happy'); }
  drawTitleRaid(t); drawTitleVisit(t);
  if (ex > 0) for (const id of ['carmin','ambar','anil']) { const h = TITLE_HOME[id].home, j = Math.abs(Math.sin((ex + id.length * 3) * .35)) * 10; titleDrop(id, h[0], h[1] - j, t, false, 1, 'happy'); } // saltan de alegría al empezar
  // el lema, escrito a plumilla bajo el logo
  if (t >= 190) { const line = 'El color que la Tinta robó', w = textWidth(line); writtenLines([line], Math.round((W - w) / 2), 51, '#8a7e68', Prefs.shake ? (t - 190) * .6 : Infinity, { nib: !!Prefs.shake }); }
  if (t >= LOGO_BEATS.ready || TITLE.exit) drawTitleMenu(t);
}
function drawDebug() {
  win(W - 124, 24, 120, 70, { solid: 'rgba(11,9,18,0.85)' }); txt('DEBUG', W - 114, 28, '#f2c93a');
  [Game.page === 1 ? '7-9/N: lucha' : '1-6/B: batalla', 'H: curar', 'F: ATB lleno', 'K: enemigos 1HP', 'C: paleta', 'W: Active/Wait'].forEach((s, i) => txt(s, W - 114, 38 + i * 9, '#b8b4cc'));
}
addEventListener('keydown', e => {
  if (!Game.debug) return; const k = e.key.toUpperCase();
  if (Game.state === 'overworld' && (DATA.encounters[k])) { const f = OW.foes.find(x => x.key === k); if (f) startTransition(f); }
  if (k === 'H') { Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); if (Game.state === 'battle') B.party.forEach(u => { u.hp = u.maxhp; u.mp = u.maxmp; u.alive = true; u.pose = 'idle'; }); }
  if (k === 'F' && Game.state === 'battle') B.party.forEach(u => { if (u.alive) u.atb = 100; });
  if (k === 'K' && Game.state === 'battle') B.enemies.forEach(u => { if (u.alive) u.hp = 1; });
  if (k === 'C') Game.palette = Game.palette === 'gris' ? 'vivo' : 'gris';
  if (k === 'W') { Prefs.mode = ATB_ACTIVE ? 'wait' : 'active'; savePreferences(); if (Game.state === 'battle') say('ATB ' + (ATB_ACTIVE ? 'ACTIVE' : 'WAIT'), '#f4f0ea'); }
});
let last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (document.hidden || typeof mobilePaused === 'function' && mobilePaused()) { acc = 0; last = ts; return; }
  acc += Math.min(50, ts - last); last = ts;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  render();
}
function update() {
  if (document.hidden || typeof mobilePaused === 'function' && mobilePaused()) return;
  tickArtUI();
  pollGamepad();
  if (typeof updateTouchControls === 'function') updateTouchControls();
  if (Game.overlay) { updateOverlay(); for (const k in pressed) pressed[k] = false; return; }
  if (['overworld', 'battle'].includes(Game.state)) {
    if (hit('options')) { openOverlay('settings'); return; }
    if (hit('help')) { openOverlay('guide'); return; }
    if (hit('journal') && Game.state === 'overworld' && !OW.act && !OW.msg) { openOverlay('studies'); return; }
  }
  if (hit('debug')) Game.debug = !Game.debug;
  if (typeof SFX !== 'undefined') { const want = (Game.state === 'overworld' || Game.state === 'title') ? Game.palette : null; if ((SFX.amb ? SFX.amb.mode : null) !== want) SFX.ambient(want); }
  if (Game.paused) { for (const k in pressed) pressed[k] = false; return; }
  Game.t++;
  switch (Game.state) {
    case 'cover': updateCover(); break;
    case 'prologue': updatePrologue(); break;
    case 'title': updateTitle(); break;
    case 'overworld': updateOverworld(); break;
    case 'pageTurn': chapterTick(); break;
    case 'transition': updateTransition(); break;
    case 'battle': {
      B.stepAcc = (B.stepAcc || 0) + battleUpdateRate();
      const steps = Math.min(4, Math.floor(B.stepAcc)); B.stepAcc -= steps;
      for (let i = 0; i < steps && Game.state === 'battle' && !Game.overlay; i++) updateBattle();
      break;
    }
  }
  for (const k in pressed) pressed[k] = false;
}
function render() {
  UI_HITS.length = 0; UI_TEXT.length = 0;
  g.imageSmoothingEnabled = false;
  if (Game.overlay?.snap) g.drawImage(Game.overlay.snap, 0, 0);
  else switch (Game.state) {
    case 'cover': drawCover(); break;
    case 'prologue': drawPrologue(); break;
    case 'title': drawTitle(); break;
    case 'overworld': drawOverworld(); break;
    case 'pageTurn': chapterDrawTurn(); break;
    case 'transition': drawTransition(); break;
    case 'battle': drawBattle(); break;
  }
  if (Game.state === 'title' && typeof chapterTitleUI === 'function') chapterTitleUI();
  if (Game.debug && !Game.overlay) drawDebug();
  if (Game.overlay) drawOverlay();
  drawArtFeedback();
  const hint = document.getElementById('hint'); const help = contextualHint(); if (hint.textContent !== help) hint.textContent = help;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, W * SCALE, H * SCALE);
}
// Hooks de depuración
window.__chromara = {
  Game, Party, OW, B, DATA, MAP, Audio, SFX, Prefs, UI_TEXT, UI_HITS,
  preview: previewAction, execute: executeCommand, options() { openOverlay('settings'); }, guide() { openOverlay('guide'); },
  battle(key) { const f = OW.foes.find(x => x.key === String(key)); if (f) { startTransition(f); } return !!f; },
  heal() { Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); },
  atb() { if (B.party) B.party.forEach(u => u.atb = 100); },
  kill() { if (B.enemies) B.enemies.forEach(u => u.alive && (u.hp = 1)); },
  win() { if (B.enemies) B.enemies.forEach(u => u.alive && kill(u)); checkEnd(); },
  start() { if (Game.state === 'title' || Game.state === 'cover' || Game.state === 'prologue') { initOverworld(); setState('overworld'); Audio.play(worldCue()); } },
  title(t) { setState('title'); TITLE.t = t; },
  pause(v = !Game.paused) { Game.paused = v; },
  colorize() { Game.palette = Game.palette === 'gris' ? 'vivo' : 'gris'; },
  sprite(o) { return makeDrop(o); },
};
initPlayerControls();
if (typeof initMobileControls === 'function') initMobileControls();
if (typeof chapterInitialize === 'function') chapterInitialize();
const boot = () => { document.getElementById('hint').hidden = true; requestAnimationFrame(frame); };
boot();
