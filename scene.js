// CHROMARA — scene.js: escena de batalla estilo Golden Sun.
// Suelo "Mode 7" con la textura del propio mapa cenital, cámara con guiñada/cabeceo/altura y proyección de sprites en coordenadas de mundo.
'use strict';
const SCENE = {
  cam: { x: 0, y: 0, yaw: 0, pitch: 0.62, h: 70, f: 150, hy: 62 }, // hy = centro óptico vertical (fila)
  goal: null, ease: .14, shake: 0, // goal = destino de la cámara (tween), shake en px
  img: null, texCache: {}, fog: null,
};
// Textura cenital del mapa (por paleta): todo el mapa + margen de "vacío" oscuro
function sceneTexture(pal) {
  if (SCENE.texCache[pal]) return SCENE.texCache[pal];
  const tw = MAP.w * TILE, th = MAP.h * TILE, c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d');
  for (let ty = 0; ty < MAP.h; ty++) for (let tx = 0; tx < MAP.w; tx++) x.drawImage(groundTile(tx, ty, pal, 0), tx * TILE, ty * TILE);
  const d = x.getImageData(0, 0, tw, th);
  return SCENE.texCache[pal] = { data: d.data, w: tw, h: th };
}
// Árbol y roca a escala de batalla (siluetas del mapa en la escena)
function bigTree(pal, vr) { // árbol de arena 34×48 (el del mapa a escala de batalla)
  return cached(`bigtree|${pal}|${vr}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 34; c.height = 48; const x = c.getContext('2d');
    const ph1 = vr * 1.3, ph2 = vr * 2.1, cx = 17, cy = 16, rx = 16, ry = 15.5;
    const ell = (X, Y) => { const u = (X + .5 - cx) / rx, w = (Y + .5 - cy) / ry; return u * u + w * w <= 1 + 0.09 * Math.sin(X * 1.1 + ph1) * Math.sin(Y * .9 + ph2); };
    px(x, p.treeOut, 12, 28, 10, 20); px(x, p.trunk2, 13, 28, 8, 20); px(x, p.trunk, 15, 28, 3, 18); px(x, p.treeOut, 10, 46, 2, 2); px(x, p.treeOut, 22, 46, 2, 2); px(x, p.trunk2, 12, 45, 1, 2); px(x, p.trunk2, 21, 45, 1, 2);
    for (let Y = 0; Y < 33; Y++) for (let X = 0; X < 34; X++) {
      if (!ell(X, Y)) continue;
      if (!ell(X - 1, Y) || !ell(X + 1, Y) || !ell(X, Y - 1) || !ell(X, Y + 1)) { px(x, p.treeOut, X, Y); continue; }
      const u = (X + .5 - cx) / rx, w = (Y + .5 - cy) / ry;
      const lam = -u * .45 - w * .7 + .32 * Math.sin(X * .95 + ph1) * Math.sin(Y * .8 + ph2) + .12 * Math.sin(X * .5 + Y * .6 + vr);
      px(x, lam > .5 ? p.treeHi : lam > .05 ? p.tree : lam > -.42 ? p.tree2 : p.treeOut, X, Y);
    }
    return c;
  });
}
function bigRock(pal, vr) { // roca de arena 26×18
  return cached(`bigrock|${pal}|${vr}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 26; c.height = 18; const x = c.getContext('2d');
    const cx = 13, cy = 9.5, rx = 12.5, ry = 8, ph = vr * 1.7;
    const ins = (X, Y) => { const u = (X + .5 - cx) / rx, w = (Y + .5 - cy) / ry; return u * u + w * w <= 1 + 0.12 * Math.sin(X * 1.3 + ph) * Math.sin(Y * 1.1 + ph); };
    for (let Y = 0; Y < 18; Y++) for (let X = 0; X < 26; X++) {
      if (!ins(X, Y)) continue;
      if (!ins(X - 1, Y) || !ins(X + 1, Y) || !ins(X, Y - 1) || !ins(X, Y + 1)) { px(x, p.rockOut, X, Y); continue; }
      const u = (X + .5 - cx) / rx, w = (Y + .5 - cy) / ry, lam = -u * .5 - w * .65 + .25 * Math.sin(X * 1.7 + ph) * Math.sin(Y * 1.9 + ph * 2);
      px(x, lam > .45 ? p.rock3 : lam > 0 ? p.rock : lam > -.5 ? p.rock2 : p.rockOut, X, Y);
    }
    px(x, p.rockOut, 15, 9); px(x, p.rockOut, 16, 10); px(x, p.rockOut, 17, 11); px(x, p.rockOut, 8, 12); px(x, p.rockOut, 9, 13);
    return c;
  });
}
function camBasis(cam) { const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); return { Fx: cy, Fy: sy, Rx: -sy, Ry: cy, cP: Math.cos(cam.pitch), sP: Math.sin(cam.pitch) }; }
// Proyección de un punto de mundo (wx, wy, wz=altura) → [sx, sy, escala, z]
function project(wx, wy, wz = 0, cam = SCENE.cam) {
  const b = camBasis(cam), rx = wx - cam.x, ry = wy - cam.y, fwd = rx * b.Fx + ry * b.Fy, lat = rx * b.Rx + ry * b.Ry;
  const z = fwd * b.cP + (cam.h - wz) * b.sP, yc = (cam.h - wz) * b.cP - fwd * b.sP;
  if (z < 4) return null;
  const k = cam.f / z;
  return [W / 2 + lat * k, cam.hy + yc * k, clamp(Math.pow(110 / z, .55), .7, 1.8), z];
}
// Suelo: por cada fila, un rayo; por cada columna, un punto de la textura (nearest). Niebla hacia el horizonte.
function drawFloor(pal, skyCol, fogCol) {
  const cam = SCENE.cam, tex = sceneTexture(pal), b = camBasis(cam);
  if (!SCENE.img) SCENE.img = g.createImageData(W, H);
  const d = SCENE.img.data, td = tex.data, tw = tex.w, th = tex.h;
  const [fr, fg, fb] = hexRgb(fogCol);
  const fogZ0 = 150, fogZ1 = 520;
  for (let sy = 0; sy < H; sy++) {
    const dy = (sy - cam.hy) / cam.f, down = dy * b.cP + b.sP, row = sy * W * 4;
    if (down <= 0.004) { for (let sx = 0; sx < W; sx++) { const i = row + sx * 4; d[i + 3] = 0; } continue; } // cielo: transparente (se pinta debajo)
    const t = cam.h / down, fwd = (b.cP - dy * b.sP) * t, ox = cam.x + fwd * b.Fx, oy = cam.y + fwd * b.Fy, stepX = t / cam.f * b.Rx, stepY = t / cam.f * b.Ry;
    const fog = clamp((t - fogZ0) / (fogZ1 - fogZ0), 0, .85), inv = 1 - fog;
    let wx = ox - (W / 2) * stepX, wy = oy - (W / 2) * stepY;
    for (let sx = 0; sx < W; sx++, wx += stepX, wy += stepY) {
      const i = row + sx * 4; let r, gg, bb;
      let tx = wx | 0, ty = wy | 0; // fuera del mapa: se repite el borde (anillo de árboles), nunca vacío
      if (tx < 0) tx = 0; else if (tx >= tw) tx = tw - 1; if (ty < 0) ty = 0; else if (ty >= th) ty = th - 1;
      const j = (ty * tw + tx) * 4; r = td[j]; gg = td[j + 1]; bb = td[j + 2];
      d[i] = r * inv + fr * fog; d[i + 1] = gg * inv + fg * fog; d[i + 2] = bb * inv + fb * fog; d[i + 3] = 255;
    }
  }
  g.fillStyle = skyCol; g.fillRect(0, 0, W, H);
  g.putImageData(SCENE.img, 0, 0); // las filas de cielo son transparentes: putImageData las pisa; repintamos el cielo encima de lo transparente
}
// Cielo y horizonte: bandas de color, silueta lejana de árboles y un sol/luna de pintura
function drawSky(pal) {
  const cam = SCENE.cam, gris = pal === 'gris', hz = Math.round(cam.hy - cam.f * Math.tan(cam.pitch));
  const bands = gris ? ['#3a3d55', '#4a4f6a', '#5f6680', '#767c96'] : ['#2f6fc4', '#3a8fe0', '#62b0f2', '#9ed0f6'];
  const top = Math.min(hz, H); bands.forEach((c, i) => { g.fillStyle = c; const y0 = Math.round(top * i / bands.length); g.fillRect(0, y0, W, Math.round(top * (i + 1) / bands.length) - y0 + 1); });
  // sol de pintura (gris: disco pálido; vivo: amarillo con brillo)
  g.fillStyle = gris ? '#8b91a8' : '#f2c93a'; g.beginPath(); g.arc(250 - cam.yaw * 40, Math.max(8, top - 30), 9, 0, 6.29); g.fill(); if (!gris) { g.fillStyle = '#fbe28a'; g.fillRect(246 - cam.yaw * 40 | 0, Math.max(8, top - 30) - 4, 3, 2); }
  // silueta de bosque lejano que gira con la cámara
  const sil = gris ? '#4a5449' : '#2a6f3a', sil2 = gris ? '#3f4840' : '#215a2e';
  for (let x = -20; x < W + 20; x += 9) { const ph = (x + cam.yaw * 120) * .11; const hh = 6 + Math.abs(Math.sin(ph * 1.7) * 6 + Math.sin(ph * .6) * 4); g.fillStyle = sil; g.fillRect(x, top - hh, 9, hh + 2); g.fillStyle = sil2; g.fillRect(x + 4, top - hh + 3, 5, hh); }
}
// Cámara: pose de reposo calculada para que el grupo quede abajo-derecha y los enemigos arriba-izquierda
function camRest(pc, ec) {
  const dx = ec[0] - pc[0], dy = ec[1] - pc[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const yaw = Math.atan2(uy, ux) + 0.7; // giro para la diagonal
  const cx = (pc[0] + ec[0]) / 2, cy = (pc[1] + ec[1]) / 2;
  const back = 128; return { x: cx - Math.cos(yaw) * back - Math.sin(yaw) * 12, y: cy - Math.sin(yaw) * back + Math.cos(yaw) * 12, yaw, pitch: 0.6, h: 86, f: 180, hy: 66 };
}
function camGo(goal, ease = .14) { SCENE.goal = Object.assign({}, SCENE.cam, goal); SCENE.ease = ease; }
function camSet(pose) { Object.assign(SCENE.cam, pose); SCENE.goal = null; }
function camTick() {
  const c = SCENE.cam, gl = SCENE.goal; if (!gl) return;
  for (const k of ['x', 'y', 'pitch', 'h', 'f', 'hy']) c[k] = lerp(c[k], gl[k], SCENE.ease);
  let d = gl.yaw - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw += d * SCENE.ease;
}
// Encuadre sobre un punto de mundo: acerca la cámara y gira un poco hacia él
function camFocus(wx, wy, o = {}) {
  const r = SCENE.rest, dist = (o.dist ?? 80) * 1.15, yaw = r.yaw + (o.turn ?? 0);
  camGo({ x: wx - Math.cos(yaw) * dist, y: wy - Math.sin(yaw) * dist, yaw, pitch: o.pitch ?? .58, h: (o.h ?? 46) * 1.25, f: o.f ?? 170, hy: 70 }, o.ease ?? .12);
}
function camReset(ease = .08) { camGo(SCENE.rest, ease); }
