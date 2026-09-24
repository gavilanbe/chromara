// =====================================================================
// Encuentro: la mancha. La tinta se comporta como tinta sobre papel: un núcleo negro con vetas húmedas, un borde que se
// abre en fibras (el papel la chupa) y un halo pálido donde apenas llega. Todo se dibuja píxel a píxel sobre la hoja de
// 320×180 a partir de dos campos de ruido fijos (grano y fibra), así que es determinista y no gasta azar al pintar.
//   alerta → salto → impacto (flash, negativo, corona, salpicaduras, gotas que manchan la pantalla) →
//   la mancha se traga el mapa y le roba el color → en la oscuridad se abren sus ojos → la tinta se escurre a su charco
// =====================================================================
const INKF = { noise: null, fiber: null, canvas: null, ctx: null, img: null, px: null };
const inkRGBA = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const INK_COL = { core: inkRGBA(11, 9, 18), sheen: inkRGBA(30, 26, 44), rim: inkRGBA(58, 54, 82), fringe: inkRGBA(42, 36, 56), halo: inkRGBA(42, 36, 56, 84) };
function inkFields() {
  if (INKF.noise) return;
  const n = W * H, rnd = seeded(911), noise = new Float32Array(n), fiber = new Float32Array(n);
  // grano: ruido de valor en cuatro octavas (manchas grandes, lóbulos, grumos)
  for (const [cell, wgt] of [[56, .46], [26, .28], [12, .16], [5, .1]]) {
    const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, grid = new Float32Array(gw * gh); for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    for (let y = 0; y < H; y++) { const fy = y / cell, iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < W; x++) { const fx = x / cell, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx), a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], d = grid[(iy + 1) * gw + ix + 1];
        noise[y * W + x] += wgt * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy); } }
  }
  // fibra: vetas alargadas en diagonal (las fibras del papel que conducen la tinta), suaves a lo largo y con poco grano
  const cw = 3, ch = 11, gw = Math.ceil((W + H) / cw) + 4, gh = Math.ceil(H / ch) + 2, grid = new Float32Array(gw * gh); for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const fx = (x + y * .45) / cw, X = fx | 0, tx = fx - X, fy = y / ch, Y = fy | 0, ty = fy - Y, sy = ty * ty * (3 - 2 * ty);
    const a = grid[Y * gw + X], b = grid[Y * gw + X + 1], c = grid[(Y + 1) * gw + X], d = grid[(Y + 1) * gw + X + 1], v = a + (b - a) * tx + (c - a) * sy + (a - b - c + d) * tx * sy;
    fiber[y * W + x] = v * .88 + rnd() * .12; }
  INKF.noise = noise; INKF.fiber = fiber;
}
function inkSurface() {
  if (!INKF.canvas) { INKF.canvas = document.createElement('canvas'); INKF.canvas.width = W; INKF.canvas.height = H; INKF.ctx = INKF.canvas.getContext('2d'); INKF.img = INKF.ctx.createImageData(W, H); INKF.px = new Uint32Array(INKF.img.data.buffer); }
  return INKF;
}
// Capa de tinta alrededor de (cx, cy) con radio R. fr: ancho del borde fibroso. stain > 0 deja, por fuera del borde, el
// cerco húmedo de una tinta que se retira (drenaje). sq aplasta en vertical (perspectiva del suelo).
function inkLayer(cx, cy, R, o = {}) {
  inkFields(); const S = inkSurface(), px = S.px, N = INKF.noise, F = INKF.fiber, fr = o.fr ?? 14, sq = o.sq ?? 1.2, stain = o.stain || 0, sw = o.stainW ?? 30, t = o.t || 0;
  const sheenLo = .47 + Math.sin(t * .05) * .015, sheenHi = sheenLo + .035;
  for (let y = 0, i = 0; y < H; y++) { const dy = (y - cy) * sq, dy2 = dy * dy;
    for (let x = 0; x < W; x++, i++) {
      const dx = x - cx, n = N[i], f = F[i], e = Math.sqrt(dx * dx + dy2) * (.6 + .8 * n) - f * f * 9;
      if (o.invert) { // al revés: la tinta está fuera del radio y avanza desde los bordes hacia dentro
        if (e > R) { px[i] = e < R + 2.2 && dx + dy > 0 ? INK_COL.rim : n > sheenLo && n < sheenHi ? INK_COL.sheen : INK_COL.core; continue; }
        const u = (R - e) / fr; px[i] = u < 1 ? (f > u * .9 + .08 ? INK_COL.fringe : f > u * .5 + .5 ? INK_COL.halo : 0) : 0; continue; }
      if (e < R) { // dentro: negro con vetas húmedas y un canto de luz arriba a la izquierda
        px[i] = e > R - 2.2 && dx + dy < 0 ? INK_COL.rim : n > sheenLo && n < sheenHi ? INK_COL.sheen : INK_COL.core; continue; }
      const u = (e - R) / fr;
      if (u < 1) { px[i] = f > u ? INK_COL.fringe : f > u * .55 + .42 ? INK_COL.halo : 0; continue; }
      if (stain > 0) { const v = (e - R) / sw; if (v < 1 && f > v * .8 + .15) { px[i] = inkRGBA(11, 9, 18, Math.round(stain * 120 * (1 - v))); continue; } }
      px[i] = 0;
    } }
  S.ctx.putImageData(S.img, 0, 0); g.drawImage(S.canvas, 0, 0);
}

// Radio con el que la tinta cubre toda la pantalla desde (cx, cy): se mide una vez sobre el propio campo de ruido
function inkCoverRadius(cx, cy, sq = 1.2) {
  inkFields(); let m = 0; const N = INKF.noise, F = INKF.fiber;
  for (let y = 0, i = 0; y < H; y++) { const dy = (y - cy) * sq; for (let x = 0; x < W; x++, i++) { const dx = x - cx, e = Math.sqrt(dx * dx + dy * dy) * (.6 + .8 * N[i]) - F[i] * F[i] * 9; if (e > m) m = e; } }
  return m + 2;
}
// ---- fase 1-3, sobre el mapa ----
// Zoom de la cámara del mapa durante el encuentro: se acerca al enemigo que te ve, sigue el salto y golpea al caer
function encounterZoom(T, fx0, fy0, sx, sy) {
  if (!Prefs.shake) return null; const k = T.k || 0;
  if (T.stage === 'detect') { const e = 1 - (1 - k) * (1 - k); return { x: fx0, y: fy0, z: 1 + .07 * e }; }
  if (T.stage === 'fall') { const e = k * k * (3 - 2 * k); return { x: lerp(fx0, sx, e), y: lerp(fy0, sy, e), z: 1.07 + .05 * e }; }
  if (T.stage === 'splash') { const p = T.hs != null && T.hs < 5 ? 1 : (T.punch || 0); return { x: sx, y: sy, z: 1 + .14 * p * p }; }
  return null;
}
// Líneas de foco de grafito: cuñas finas desde los bordes hacia el enemigo, que titilan (como en un manga dibujado a lápiz)
function drawSpeedLines(cx, cy, k, t) {
  const rnd = seeded(40 + ((t >> 1) & 3)), reach = Math.min(1, k * 1.8);
  for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283 + rnd() * .1, far = 260, near = 70 + rnd() * 50 + (1 - reach) * 150, w = 1 + rnd() * 2.2;
    if (rnd() < .25) continue;
    g.fillStyle = i & 1 ? '#3a3652' : '#2a2438'; const ca = Math.cos(a), sa = Math.sin(a) * .75;
    for (let d = far; d > near; d -= 1.5) { const ww = Math.max(1, Math.round(w * (d - near) / (far - near) * 1.6)); g.fillRect(Math.round(cx + ca * d - ww / 2), Math.round(cy + sa * d - ww / 2), ww, ww); } }
}
// El «¡!» de tinta: cae sobre el enemigo, rebota, gotea
function drawInkBang(x, y, q) {
  const pop = q < 6 ? easeBack(q / 6) : 1, s = Math.max(.1, pop), drip = Math.min(6, Math.max(0, q - 5) * .5);
  g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(s * 1.5, s * 1.5); g.rotate(Prefs.shake ? Math.sin(q * .9) * .08 * Math.max(0, 1 - q / 12) : 0);
  g.fillStyle = '#f4e7c8'; g.fillRect(-3, -17, 7, 12); g.fillRect(-2, -18, 5, 1); g.fillRect(-2, -3, 5, 5); // canto de papel
  g.fillStyle = '#0b0912'; g.fillRect(-2, -17, 5, 3); g.fillRect(-2, -14, 5, 4); g.fillRect(-1, -10, 3, 4); g.fillRect(-1, -2, 3, 3);
  g.fillStyle = '#4a4664'; g.fillRect(-1, -16, 1, 3);
  if (drip) { g.fillStyle = '#0b0912'; g.fillRect(1, 1, 1, Math.round(drip)); }
  g.restore();
}
function drawVignette(k, x = W / 2, y = H / 2) {
  if (k <= 0) return; const gr = g.createRadialGradient(x, y, 40, x, y, 230); gr.addColorStop(0, 'rgba(11,9,18,0)'); gr.addColorStop(1, 'rgba(11,9,18,' + (k * .6).toFixed(3) + ')');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
// Gotas que vuelan hacia la cámara y se quedan pegadas a la pantalla, escurriendo
function drawLensDrops(T, sx, sy, k) {
  for (const d of T.lens || []) {
    const q = (k - d.at) / .12;
    if (q < 1) { if (q < -2.2) continue; const p = clamp(q / 2.2 + 1, 0, 1), x = lerp(sx, d.x, p * p), y = lerp(sy - 8, d.y, p * p) - Math.sin(p * Math.PI) * 18, r = d.r * (.15 + .85 * p * p * p);
      g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(x, y, r, r * .9, 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4664'; g.fillRect(Math.round(x - r * .4), Math.round(y - r * .45), Math.max(1, r * .25 | 0), 1); continue; }
    drawLensSplat(d, (k - d.at) * 60);
  }
}
function drawLensSplat(d, age) {
  const rnd = seeded(d.seed), R0 = d.r * 1.35, lobes = []; for (let i = 0; i < 7; i++) lobes.push([rnd() * 6.28, .7 + rnd() * .5]);
  const r = a => R0 * (1 + .18 * Math.sin(a * 3 + d.seed) + .1 * Math.sin(a * 5 + d.seed * 2));
  g.fillStyle = '#0b0912'; g.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.283, rr = r(a); if (i) g.lineTo(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr); else g.moveTo(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr); } g.fill();
  for (const [a, l] of lobes) { const X = d.x + Math.cos(a) * R0 * (1.25 + l * .4), Y = d.y + Math.sin(a) * R0 * (1.25 + l * .4); g.beginPath(); g.arc(X, Y, Math.max(1, R0 * .16 * l), 0, 6.29); g.fill(); }
  // escurre: dos regueros que bajan y engordan en la punta
  for (let j = 0; j < 2; j++) { const x = Math.round(d.x + (j ? R0 * .35 : -R0 * .2)), L = Math.min(40, Math.max(0, age - 4 - j * 5) * (.6 + j * .25)); if (L <= 0) continue;
    g.fillRect(x - 1, Math.round(d.y + R0 * .6), 2 + (j ? 0 : 1), Math.round(L)); g.beginPath(); g.arc(x + .5, d.y + R0 * .6 + L, 2 + j * .5, 0, 6.29); g.fill(); }
  g.fillStyle = '#3a3652'; g.fillRect(Math.round(d.x - R0 * .45), Math.round(d.y - R0 * .5), Math.max(2, R0 * .3 | 0), 1); g.fillRect(Math.round(d.x - R0 * .5), Math.round(d.y - R0 * .35), 1, 2);
}
// Impacto: corona de tinta que sube y se deshace en gotas, regueros radiales y anillos de papel
function drawImpact(T, sx, sy, k) {
  const e = 1 - (1 - k) * (1 - k);
  // charco que se abre
  g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(sx, sy, 12 + e * 30, 5 + e * 12, 0, 0, 6.29); g.fill();
  // brazos de la salpicadura: gruesos junto al charco, afinándose, y rematados por gotas sueltas en fila
  const rnd = seeded(77); g.fillStyle = '#0b0912';
  for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283 + rnd() * .45, L = (26 + rnd() * 70) * Math.min(1, k * 3.4), w = 3 + rnd() * 3, ca = Math.cos(a), sa = Math.sin(a) * .55;
    for (let d = 8; d < L; d += 1.5) { const r = w * Math.pow(1 - d / (L + 6), .7); g.beginPath(); g.arc(sx + ca * d, sy + sa * d, Math.max(.7, r), 0, 6.29); g.fill(); }
    if (k > .15) for (let j = 1; j <= 3; j++) { const d = L + j * (5 + w), r = Math.max(.8, w * .55 - j * .5); g.beginPath(); g.arc(sx + ca * d, sy + sa * d, r, 0, 6.29); g.fill(); } }
  // anillos de papel
  for (let r = 0; r < 3; r++) { const kk = clamp(k * 1.5 - r * .22, 0, 1); if (kk <= 0 || kk >= 1) continue; g.strokeStyle = 'rgba(244,231,200,' + (.85 * (1 - kk)).toFixed(2) + ')'; g.lineWidth = 2 - r * .5; g.beginPath(); g.ellipse(sx, sy, 10 + kk * 90, 4 + kk * 36, 0, 0, 6.29); g.stroke(); }
  // corona: columnas que suben alrededor del impacto y sueltan una gota en la punta
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, cx = sx + Math.cos(a) * (13 + e * 8), cy = sy + Math.sin(a) * (5 + e * 3), up = Math.sin(Math.min(1, k * 2.4) * Math.PI / 2) * (1 - clamp((k - .45) / .5, 0, 1)), h = (10 + (i * 7) % 9) * up;
    g.fillStyle = '#0b0912'; if (h > 1) g.fillRect(Math.round(cx - 1), Math.round(cy - h), 2 + (i & 1), Math.round(h));
    const bk = clamp((k - .3) / .7, 0, 1), by = cy - (12 + (i * 7) % 9) * (1 - bk) - Math.sin(bk * Math.PI) * 10 + bk * bk * 16; if (k > .12) { g.beginPath(); g.arc(cx + Math.cos(a) * bk * 16, by, 1.6, 0, 6.29); g.fill(); } }
}
// Dibujo de las fases sobre el mapa (llamado desde drawTransitionFx)
function drawEncounterOverworld(T, sx, sy, fx0, fy0, foe, fspr) {
  const k = T.k || 0, t = B.t;
  if (T.stage === 'detect') {
    drawVignette(k * .7, fx0, fy0); g.globalAlpha = .7; drawSpeedLines(fx0, fy0, k, t); g.globalAlpha = 1;
    const sq = 1 + k * .55, tr = k > .4 && Prefs.shake ? (((Game.t >> 1) & 1) ? 1 : -1) : 0;
    shadow(fx0, fy0, foe.boss ? 18 : 10); drawSprite(fspr, fx0 + tr, fy0, sq, foe.dirLeft, 1 / sq);
    drawInkBang(fx0, fy0 - 16 - fspr.height * .6, T.q || 0);
    g.fillStyle = 'rgba(11,9,18,' + (.15 + k * .4) + ')'; g.beginPath(); g.ellipse(sx, sy, 4 + k * 12, 2 + k * 5, 0, 0, 6.29); g.fill();
  } else if (T.stage === 'fall') {
    const arc = Math.sin(k * Math.PI), x = lerp(fx0, sx, k), yb = lerp(fy0, sy, k), sc = 1 + arc * 2.1, st = k < .3 ? [.75, 1.45] : k > .82 ? [1.4, .7] : [1, 1];
    drawVignette(.7 + k * .2, sx, sy);
    // estela de tinta: gotas que va soltando por el camino
    g.fillStyle = '#0b0912'; for (let i = 1; i <= 9; i++) { const kk = k - i * .035; if (kk <= 0) break; const a2 = Math.sin(kk * Math.PI), X = lerp(fx0, sx, kk), Y = lerp(fy0, sy, kk) - 2 - a2 * 38 + (k - kk) * 40; g.beginPath(); g.arc(X, Y, Math.max(.6, (1 + a2 * 2.4) * (1 - i / 11)), 0, 6.29); g.fill(); }
    g.fillStyle = 'rgba(11,9,18,' + (.45 + k * .45) + ')'; g.beginPath(); g.ellipse(sx, sy, 16 - k * 5, 7 - k * 2.5, 0, 0, 6.29); g.fill();
    drawSprite(fspr, x, yb - 2 - arc * 38, sc * st[0], foe.dirLeft, st[1]);
  } else if (T.stage === 'splash') {
    const hs = T.hs ?? 99;
    drawVignette(.9, sx, sy); drawImpact(T, sx, sy, k); drawLensDrops(T, sx, sy, k);
    if (hs < 5 && Prefs.flash) { // hit-stop: un fogonazo de papel y tres fotogramas en negativo
      if (hs === 0) { g.fillStyle = 'rgba(244,231,200,.9)'; g.fillRect(0, 0, W, H); }
      else if (hs < 4) { g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = '#f4e7c8'; g.fillRect(0, 0, W, H); g.restore(); }
    }
  }
}
// ---- fase 4-5, sobre la escena de batalla ----
function drawEncounterBlot(T, sx, sy, q) {
  if (T.coverR == null) T.coverR = inkCoverRadius(sx, sy);
  const k = T.k, grow = k < .56 ? (k / .56) : 1, e = 1 - Math.pow(1 - grow, 2.2), R = e * T.coverR, t = B.t;
  if (grow < 1 && MAPC) { // el mapa congelado pierde el color según avanza la tinta
    MAPG.save(); MAPG.globalCompositeOperation = 'saturation'; MAPG.globalAlpha = Math.min(1, grow * 1.4); MAPG.fillStyle = '#808080'; MAPG.fillRect(0, 0, W, H); MAPG.restore(); g.drawImage(MAPC, 0, 0); }
  inkLayer(sx, sy, R, { fr: 16, t });
  drawLensDrops(T, sx, sy, 1 + k * .6);
  // en la oscuridad se abren sus ojos, donde va a estar su charco
  if (k > .58 && q) { T.eyes ||= [q[0], q[1] - 26]; const o = clamp((k - .58) / .1, 0, 1), blink = k > .8 && k < .85 ? .12 : 1, h = Math.max(1, 13 * easeBack(o) * blink), rnd = seeded(5), [ex0, ey0] = T.eyes;
    // halo morado alrededor de la mirada
    const gl = g.createRadialGradient(ex0, ey0, 2, ex0, ey0, 38); gl.addColorStop(0, 'rgba(90,70,130,' + (.45 * o).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(90,70,130,0)'); g.fillStyle = gl; g.fillRect(ex0 - 40, ey0 - 40, 80, 80);
    for (const side of [-1, 1]) { const ex = ex0 + side * 12, ey = ey0 - (side > 0 ? 1 : 0); g.fillStyle = '#efe4bf'; g.beginPath(); g.ellipse(ex, ey, 6, h / 2 + .5, side * .12, 0, 6.29); g.fill();
      if (h > 5) { g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(ex + side * 1.5, ey + 1, 2.4, Math.min(4, h / 3), 0, 0, 6.29); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(Math.round(ex - 3), Math.round(ey - h / 2 + 2), 2, 2); }
      g.fillStyle = '#0b0912'; for (let j = 0; j < 8; j++) g.fillRect(Math.round(ex - 6 + j * 1.5), Math.round(ey - h / 2 - 1 - (side > 0 ? 7 - j : j) * .5), 2, 1); } // ceño
    for (let i = 0; i < 8; i++) { const a = rnd() * 6.28, d = 30 + rnd() * 60 + Math.sin(t * .05 + i) * 4; g.fillStyle = 'rgba(74,70,100,' + (.35 * o).toFixed(2) + ')'; g.fillRect(Math.round(ex0 + Math.cos(a) * d), Math.round(ey0 + 6 + Math.sin(a) * d * .6), 2, 1); } }
}
function drawEncounterDrain(T, q) {
  if (T.drainR == null) T.drainR = inkCoverRadius(q[0], q[1], 1.6);
  const k = T.k, e = k < .78 ? Math.pow(k / .78, 1.25) : 1, R = lerp(T.drainR, Math.max(6, B.puddle.rx * .9), e);
  inkLayer(q[0], q[1], R, { fr: 12, stain: 1 - k * .7, stainW: 34, t: B.t, sq: 1.6 });
  if (T.eyes && k < .25) { const a = 1 - k / .25; g.globalAlpha = a; for (const side of [-1, 1]) { g.fillStyle = '#efe4bf'; g.beginPath(); g.ellipse(T.eyes[0] + side * 12, T.eyes[1], 6, 6.5 * a + .5, side * .12, 0, 6.29); g.fill(); } g.globalAlpha = 1; }
  // gotitas que la tinta arrastra hacia el charco
  const rnd = seeded(19);
  for (let i = 0; i < 16; i++) { const a = rnd() * 6.283, d0 = R + 10 + rnd() * 40, p = (k * 2.2 + rnd()) % 1, d = d0 * (1 - p * p); if (d < 6) continue;
    g.fillStyle = '#0b0912'; g.fillRect(Math.round(q[0] + Math.cos(a) * d), Math.round(q[1] + Math.sin(a) * d * .6), 2, 2); }
  g.globalAlpha = Math.max(0, 1 - k * 1.4); drawLensDrops(T, 0, 0, 1.6 + k); g.globalAlpha = 1; // las de la pantalla siguen escurriendo y se lavan
}
