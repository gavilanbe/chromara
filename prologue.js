// CHROMARA — prologue.js: la cinemática de inicio, entre la tapa del cuaderno y el título. Cuatro planos dibujados en la misma
// página del título: Chromara vive en color; la Tinta rezuma por el papel y se bebe el color; tres gotas lo recuerdan y se
// mezclan; saltan hacia el título dejando estelas de su pigmento. Cualquier tecla la salta. Todo depende de PRO.t: redibujar
// un fotograma no avanza nada ni consume azar; los sonidos salen de updatePrologue.
'use strict';
const PRO = { t: 0 };
const PRO_BEATS = { ink: 170, heroes: 380, leap: 560, end: 650 };
const PRO_LINES = [
  { at: 18, until: 160, text: 'Chromara vivía del color.' },
  { at: 196, until: 360, text: 'Hasta que la Tinta empezó a bebérselo.' },
  { at: 404, until: 548, text: 'Pero tres gotas recordaban cómo mezclarse.' },
];
const PRO_HEROES = [
  { id: 'carmin', col: 'rojo', x: 104, home: [120, 158] },
  { id: 'ambar', col: 'amarillo', x: 160, home: [147, 137] },
  { id: 'anil', col: 'azul', x: 216, home: [207, 165] },
];
function startPrologue() { setState('prologue'); PRO.t = 0; ANYKEY = false; for (const k in pressed) pressed[k] = false; }
function endPrologue() { setState('title'); TITLE.t = 8; TITLE.exit = 0; TITLE.snap = null; ANYKEY = false; for (const k in pressed) pressed[k] = false; }
function updatePrologue() {
  const t = ++PRO.t;
  if (t > 12 && (ANYKEY || pressed.ok || pressed.back || pressed.options)) { Audio.sfx('page'); endPrologue(); return; }
  ANYKEY = false;
  const B0 = PRO_BEATS, at = n => t === n;
  if (at(4)) Audio.sfx('shimmer', { vol: .4 });
  if (at(B0.ink)) { Audio.sfx('ink_tide', { vol: .8 }); Audio.sfx('impact_sub', { vol: .5, when: .05 }); }
  if (at(B0.ink + 30)) Audio.sfx('hum_down', { vol: .6 });
  if (t > B0.ink + 30 && t < B0.heroes - 20 && t % 22 === 0) Audio.sfx('slow_drip', { vol: .45 });
  if (at(B0.ink + 110)) Audio.sfx('dissolve', { vol: .5 });
  PRO_HEROES.forEach((h, i) => { if (at(B0.heroes + 6 + i * 16)) Audio.sfx('plop', { semi: SEMI[h.id], vol: .6 }); });
  [[470, [0, 4]], [490, [4, 7]], [510, [0, 7]]].forEach(([n, c]) => { if (at(n)) { Audio.sfx('mix', { colours: c }); } });
  if (at(526)) Audio.sfx('mix_bell', { vol: .6 });
  if (at(B0.leap)) Audio.sfx('charge', { semi: 0, vol: .5 });
  if (at(B0.leap + 16)) { Audio.sfx('whip'); Audio.sfx('fwip', { semi: 7, when: .05 }); }
  if (t >= B0.end) endPrologue();
}
// Cámara: dibuja el plano completo y lo vuelve a pintar recortado y ampliado (zoom de píxel duro), con temblor opcional.
function proCamera(draw, cx, cy, zoom, shake = 0) {
  draw();
  const snap = cached('prologue-cam', () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }), q = snap.getContext('2d');
  q.clearRect(0, 0, W, H); q.drawImage(buf, 0, 0);
  const vw = W / zoom, vh = H / zoom, sx = clamp(cx - vw / 2, 0, W - vw) + shake, sy = clamp(cy - vh / 2, 0, H - vh);
  g.save(); g.imageSmoothingEnabled = false; g.fillStyle = '#d1c5ad'; g.fillRect(0, 0, W, H); g.drawImage(snap, sx, sy, vw, vh, 0, 0, W, H); g.restore();
}
const ease = k => k * k * (3 - 2 * k);
// La Tinta: un borrón que rezuma por el papel desde arriba a la derecha y extiende tentáculos hacia el paisaje.
const PRO_TENDRILS = [[[292, 112], [270, 122], [248, 130], [236, 140]], [[288, 116], [262, 132], [214, 138], [182, 136], [160, 141]], [[284, 118], [240, 150], [190, 160], [142, 153]], [[290, 118], [232, 124], [150, 124], [96, 132], [80, 146]]];
function proInk(t, k) {
  if (k <= 0) return;
  // tentáculos: tinta espesa que repta por el papel ondulando, gruesa en la raíz y fina en la punta, con un filo húmedo
  PRO_TENDRILS.forEach((pts, j) => { const reach = clamp(k * 1.4 - j * .12, 0, 1); if (reach <= 0) return; const N = 28, upto = Math.floor(reach * N);
    let prev = null; for (let i = 0; i <= upto; i++) { const q = i / N, p = pointAt(pts, q), nx = pointAt(pts, Math.min(1, q + .02)), dx = nx[0] - p[0], dy = nx[1] - p[1], L = Math.hypot(dx, dy) || 1, wob = Math.sin(q * 14 + t * .09 + j * 2) * 2.2 * q, cur = [p[0] - dy / L * wob, p[1] + dx / L * wob];
      if (prev) { const w = Math.max(1, 4.2 * (1 - q) + 1); pstroke(prev[0], prev[1], cur[0], cur[1], w, '#0b0912', 1, 0, false); if (i % 2) pstroke(prev[0], prev[1] - w * .5, cur[0], cur[1] - w * .5, 1, '#3a3652', 1, 0, false); } prev = cur; }
    if (prev && reach < 1) { g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(prev[0], prev[1], 2.2, 1.8, 0, 0, 6.29); g.fill(); } });
  inkSplat(292, 112, 5 + ease(Math.min(1, k * 2)) * 14, Math.min(1, k * 1.6), t, 7, true);
  // la Tinta mira: dos ojos claros que parpadean en el borrón
  if (k > .25 && t % 140 > 6) { g.fillStyle = '#efe4bf'; g.fillRect(286, 107, 3, 3); g.fillRect(294, 107, 3, 3); g.fillStyle = '#0b0912'; g.fillRect(287 - (k > .6 ? 1 : 0), 108, 1, 1); g.fillRect(295 - (k > .6 ? 1 : 0), 108, 1, 1); }
}
// Una gota protagonista: sprite grande de frente o de lado, con estiramiento y ojos.
function proHero(h, x, y, s, eyes = 'normal', sx = 1, sy = 1, view = 'front', flip = false) {
  const spr = buildSprite(h.id + '_' + view, C(h.col), null, { eyes });
  shadow(x, y + 1, Math.round(spr.width * s * .6 * sx));
  drawSprite(spr, x, y, s * sx, flip, sy);
}
function proCaption(t) {
  for (const L of PRO_LINES) {
    if (t < L.at || t > L.until + 12) continue;
    const age = t - L.at, out = clamp((t - L.until) / 12, 0, 1), w = textWidth(L.text) + 18, x = Math.round((W - w) / 2), y = 8;
    g.save(); g.globalAlpha = 1 - out; g.translate(0, Math.round((1 - clamp(age / 10, 0, 1)) * -10 - out * 6));
    maskingLabel(x, y, w, 15, '#f7efd6'); writtenLines([L.text], x + 9, y + 4, '#3a2f2a', Prefs.shake ? age * .9 : Infinity, { nib: !!Prefs.shake });
    g.restore();
  }
}
function drawPrologue() {
  const t = PRO.t, B0 = PRO_BEATS;
  if (t < B0.heroes) {
    // 1-2) el mundo en color; luego llega la Tinta y el color se va, de lo último pintado a lo primero
    const drain = clamp((t - (B0.ink + 30)) / 130, 0, 1), inkK = clamp((t - B0.ink) / 150, 0, 1), lt = Math.round(lerp(430, 0, ease(drain)));
    const z = t < B0.ink ? lerp(2, 1.7, ease(t / B0.ink)) : lerp(1.7, 1.25, ease(clamp((t - B0.ink) / 60, 0, 1))), cx = t < B0.ink ? 160 : 190, cy = 138;
    const quake = Prefs.shake && t >= B0.ink && t < B0.ink + 16 ? Math.round(Math.sin(t * 2.1) * 2 * (1 - (t - B0.ink) / 16)) : 0;
    proCamera(() => {
      g.drawImage(titlePaper(), 0, 0); titleLandscape(lt);
      if (t < B0.ink + 30) titleResidents(430 + t);
      else PRO_HEROES.forEach((h, i) => { // miedo: tiemblan con los ojos como platos y huyen de un salto hacia la izquierda
        const flee = clamp((t - (B0.ink + 70 + i * 12)) / 22, 0, 1); if (flee >= 1) return;
        const [hx, hy] = h.home, jit = Prefs.shake && flee === 0 ? ((t + i) & 2 ? 1 : -1) : 0, x = lerp(hx, -30, flee), y = hy - Math.sin(flee * Math.PI) * 18;
        shadow(x, hy, 6); drawSprite(buildSprite(h.id + '_side_mini', C(h.col), null, { eyes: 'wide' }), Math.round(x + jit), Math.round(y), 1, false); });
      proInk(t, inkK);
    }, cx, cy, z, quake);
    proCaption(t);
    return;
  }
  if (t < B0.leap + 24) {
    // 3) primer plano: la página gris y la tinta rodeándolos; las tres gotas llegan, se miran y mezclan su pigmento
    const k = t - B0.heroes, z = lerp(1, 1.12, ease(clamp(k / 180, 0, 1)));
    proCamera(() => {
      g.drawImage(titlePaper(), 0, 0); titleLandscape(0);
      g.fillStyle = 'rgba(233,225,204,.72)'; g.fillRect(0, 0, W, H);
      // la tinta acecha por los bordes, respirando
      const breathe = Math.sin(t * .05) * 3;
      inkSplat(-6, 176, 44 + breathe, 1, t, 3, false); inkSplat(330, 172, 40 - breathe, 1, t, 5, false); inkSplat(326, -4, 30 + breathe, 1, t, 9, false); inkSplat(-4, 0, 26 - breathe, 1, t, 11, false);
      // suelo: una sombra de lápiz bajo los tres
      titleLine([[70, 131], [250, 131]], '#c9bd9c');
      PRO_HEROES.forEach((h, i) => {
        const arrive = clamp((k - 6 - i * 16) / 18, 0, 1), from = i === 0 ? [-30, 131] : i === 1 ? [h.x, -40] : [350, 131];
        let x = lerp(from[0], h.x, ease(arrive)), y = i === 1 ? lerp(-40, 131, arrive * arrive) : 131 - Math.sin(arrive * Math.PI) * 26;
        let sx = 1, sy = 1, eyes = k < 70 ? 'wide' : 'normal';
        if (arrive < 1) { sx = .85; sy = 1.2; } else { const land = k - 6 - i * 16 - 18; if (land < 8) { const q = Math.sin(land / 8 * Math.PI); sx = 1 + q * .25; sy = 1 - q * .22; } }
        // se miran: los de los lados se giran hacia el centro
        const look = k > 60 && k < 170, view = look && i !== 1 ? 'side' : 'front', flip = i === 2;
        if (t >= B0.leap) { const q = t - B0.leap; if (q < 16) { sx = 1 + q / 16 * .3; sy = 1 - q / 16 * .3; } else { const up = (q - 16) / 8; y -= up * up * 160; sx = .7; sy = 1.5; } eyes = 'normal'; }
        if (y > -60) proHero(h, Math.round(x), Math.round(y), 2.2, k > 150 && t < B0.leap ? 'happy' : eyes, sx, sy, view, flip);
      });
      // la mezcla: de cada pareja sale una gota de su color; se encuentran en el aire y nacen el naranja, el verde y el violeta
      [[90, 0, 1, 'naranja', [132, 70]], [110, 1, 2, 'verde', [188, 70]], [130, 0, 2, 'violeta', [160, 46]]].forEach(([at, a, b, res, mid]) => {
        const q = k - at; if (q < 0) return;
        const fly = clamp(q / 20, 0, 1), done = q >= 20, A = PRO_HEROES[a], Bh = PRO_HEROES[b];
        if (!done) { [A, Bh].forEach(h => { const x = lerp(h.x, mid[0], ease(fly)), y = lerp(96, mid[1], ease(fly)) - Math.sin(fly * Math.PI) * 14; paintDab(Math.round(x), Math.round(y), 6, C(h.col)); }); }
        else { const pop = q - 20, r = 9 + Math.max(0, 4 - pop * .3) + Math.sin(t * .15 + at) * .5; paintDab(mid[0], mid[1] + Math.round(Math.sin(t * .07 + at) * 2), r, C(res), 0);
          if (pop < 16) paintRing(mid[0], mid[1], pop / 16, C(res), 30);
          if (pop < 20 && Prefs.shake) for (let n = 0; n < 8; n++) { const an = n / 8 * 6.28 + at, d = pop * 1.6; g.fillStyle = n % 2 ? C(res) : ramp(C(res)).hi; g.fillRect(Math.round(mid[0] + Math.cos(an) * d), Math.round(mid[1] + Math.sin(an) * d * .8 + pop * pop * .02), 2, 2); } }
      });
      // 4) el salto: tres estelas de su pigmento suben y salen por arriba
      if (t >= B0.leap + 16) PRO_HEROES.forEach((h, i) => { const q = clamp((t - B0.leap - 16) / 8, 0, 1), top = 131 - q * q * 160; pstroke(h.x, 128, h.x + (i - 1) * 4, Math.max(-10, top), 7, C(h.col), 1, 0, false); pstroke(h.x - 2, 128, h.x + (i - 1) * 4 - 2, Math.max(-10, top), 2, ramp(C(h.col)).hi, 1, 0, false); });
    }, 160, 100, z);
    proCaption(t);
    return;
  }
  // 4b) la cámara sube por la página hasta el título: las estelas llegan a las letras dibujadas a lápiz
  const q = ease(clamp((t - B0.leap - 24) / (B0.end - B0.leap - 24), 0, 1)), saved = TITLE.t;
  proCamera(() => {
    TITLE.t = 8; drawTitle(); TITLE.t = saved;
    PRO_HEROES.forEach((h, i) => { const x = 46 + ([0, 2, 4][i] * 23 + 11) * 1.25, y0 = 180, y1 = lerp(y0, 40, clamp(q * 1.6 - i * .15, 0, 1)); if (y1 < y0) { pstroke(x, y0, x, y1, 6, C(h.col), 1, 0, false); pstroke(x - 2, y0, x - 2, y1, 1, ramp(C(h.col)).hi, 1, 0, false); paintDab(Math.round(x), Math.round(y1), 4, C(h.col)); } });
  }, 160, lerp(150, 90, q), lerp(1.8, 1, q));
}
