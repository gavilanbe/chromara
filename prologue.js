// CHROMARA — prologue.js: la cinemática de inicio, entre la tapa del cuaderno y el título. Un corto en cuatro planos, con
// bandas de cine, subtítulos escritos a plumilla en la banda de abajo, grano de papel y viñeta:
//   1) Chromara vivía del color: amanecer de acuarela con parallax (cielo, colinas, el mundo pintado y útiles de dibujo
//      desenfocados en primer plano), rayos de luz y polen de pigmento.
//   2) La Tinta: el cielo se apaga, una gota enorme cae a cámara lenta, golpea la página y la tinta (la misma de los
//      encuentros, fibrosa) se come el paisaje robándole el color; los vecinos huyen; en la mancha se abren sus ojos.
//   3) Tres gotas: un mundo gris bajo un foco; las gotas caen a la luz (lo único con color), se miran y mezclan su
//      pigmento, que brilla; la tinta acecha desde los bordes.
//   4) El salto: se agachan, saltan en un barrido vertical con estelas y la cámara sube hasta el título, que pintan.
// Cualquier tecla la salta. Todo depende de PRO.t: redibujar no avanza nada ni consume azar; los sonidos salen de updatePrologue.
'use strict';
const PRO = { t: 0 };
const PRO_BEATS = { drop: 188, impact: 232, heroes: 404, leap: 588, climb: 612, end: 676 };
const PRO_LINES = [
  { at: 24, until: 176, text: 'Chromara vivía del color.' },
  { at: 250, until: 392, text: 'Hasta que la Tinta empezó a bebérselo.' },
  { at: 426, until: 580, text: 'Pero tres gotas recordaban cómo mezclarse.' },
];
const PRO_HEROES = [
  { id: 'carmin', col: 'rojo', x: 118, home: [120, 158] },
  { id: 'ambar', col: 'amarillo', x: 160, home: [147, 137] },
  { id: 'anil', col: 'azul', x: 202, home: [207, 165] },
];
function startPrologue() { setState('prologue'); PRO.t = 0; ANYKEY = false; for (const k in pressed) pressed[k] = false; }
function endPrologue() { setState('title'); TITLE.t = 8; TITLE.exit = 0; TITLE.snap = null; ANYKEY = false; for (const k in pressed) pressed[k] = false; }
function updatePrologue() {
  const t = ++PRO.t;
  if (t > 12 && (ANYKEY || pressed.ok || pressed.back || pressed.options)) { Audio.sfx('page'); endPrologue(); return; }
  ANYKEY = false;
  const B0 = PRO_BEATS, at = n => t === n;
  if (at(4)) Audio.sfx('shimmer', { vol: .4 });
  if (at(90)) Audio.sfx('tinkle', { vol: .25, semi: 12 });
  if (at(B0.drop)) { Audio.sfx('hum_down', { vol: .55 }); Audio.sfx('fall', { vol: .5, when: .4 }); }
  if (at(B0.impact)) { Audio.sfx('ink_tide', { vol: .85 }); Audio.sfx('impact_sub', { vol: .7 }); Audio.sfx('splash', { vol: .5 }); }
  if (at(B0.impact + 20)) Audio.sfx('ink_jet', { vol: .6 });
  if (t > B0.impact + 30 && t < B0.heroes - 30 && t % 26 === 0) Audio.sfx('slow_drip', { vol: .4 });
  if (at(B0.impact + 110)) Audio.sfx('dissolve', { vol: .5 });
  if (at(B0.impact + 128)) Audio.sfx('detect', { vol: .35, semi: -12 });
  if (at(B0.heroes)) Audio.sfx('page', { vol: .4 });
  PRO_HEROES.forEach((h, i) => { if (at(B0.heroes + 30 + i * 18)) Audio.sfx('plop', { semi: SEMI[h.id], vol: .6 }); });
  [[B0.heroes + 96, [0, 4]], [B0.heroes + 116, [4, 7]], [B0.heroes + 136, [0, 7]]].forEach(([n, c]) => { if (at(n + 20)) Audio.sfx('mix', { colours: c }); });
  if (at(B0.heroes + 162)) Audio.sfx('mix_bell', { vol: .6 });
  if (at(B0.leap)) Audio.sfx('charge', { semi: 0, vol: .5 });
  if (at(B0.leap + 16)) { Audio.sfx('whip'); Audio.sfx('fwip', { semi: 7, when: .05 }); }
  if (at(B0.climb + 30)) Audio.sfx('shimmer', { vol: .35 });
  if (t >= B0.end) endPrologue();
}
const ease = k => k * k * (3 - 2 * k);
const proQ = k => Math.round(clamp(k, 0, 1) * 40) / 40; // mezclas de color cuantizadas: la caché de mixHex no crece
// Capas: se pintan en el búfer y se copian a su propio lienzo, para componerlas luego con parallax
function proLayer(name) { return cached('pro-layer|' + name, () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }); }
function proGrab(name, draw) { g.clearRect(0, 0, W, H); draw(); const c = proLayer(name), x = c.getContext('2d'); x.clearRect(0, 0, W, H); x.drawImage(buf, 0, 0); return c; }
// El color se va (saturación) y la noche tiñe la capa, sin tocar lo transparente
function proDrain(c, k, night = 0) {
  if (k <= 0 && night <= 0) return; const x = c.getContext('2d'); x.save();
  if (k > 0) { x.globalCompositeOperation = 'saturation'; x.globalAlpha = Math.min(1, k); x.fillStyle = '#808080'; x.fillRect(0, 0, W, H); }
  if (night > 0) { x.globalCompositeOperation = 'source-atop'; x.globalAlpha = night * .55; x.fillStyle = '#2a2438'; x.fillRect(0, 0, W, H); }
  x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1; x.drawImage(proLayer('mask'), 0, 0); x.restore();
}
// Cámara con parallax: p = profundidad (0 = infinito, 1 = el mundo)
function proDraw(c, cam, p = 1) {
  const z = 1 + (cam.z - 1) * p, cx = W / 2 + (cam.x - W / 2) * p, cy = H / 2 + (cam.y - H / 2) * p, vw = W / z, vh = H / z;
  g.drawImage(c, cx - vw / 2, cy - vh / 2, vw, vh, 0, 0, W, H);
}
// ---- piezas del cielo y del paisaje ----
function proSky(k, night) { // k: amanecer; night: la tinta apaga el cielo
  const top = mixHex(mixHex('#9fc4d8', '#f2c79a', proQ(k * .35)), '#2a2438', proQ(night)), bot = mixHex(mixHex('#f8e3b8', '#fbe0b0', proQ(k)), '#5a5070', proQ(night));
  const gr = g.createLinearGradient(0, 0, 0, 130); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const rnd = seeded(212); g.save(); // manchas de acuarela y nubes
  for (let i = 0; i < 9; i++) { const x = rnd() * W, y = 14 + rnd() * 60, r = 18 + rnd() * 30; g.globalAlpha = .18 * (1 - night * .7); g.fillStyle = i % 3 ? '#fff4dc' : '#f4c0a0'; g.beginPath(); g.ellipse(x, y, r, r * .35, 0, 0, 6.29); g.fill(); }
  g.restore();
}
function proSun(x, y, t, a) {
  if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const ang = Math.PI * .55 + (i - 3) * .19 + Math.sin(t * .01 + i) * .02, len = 190 + (i % 3) * 30; g.globalAlpha = a * (.06 + (i % 2) * .03); g.fillStyle = '#fff1c8';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang - .05) * len, y + Math.sin(ang - .05) * len); g.lineTo(x + Math.cos(ang + .05) * len, y + Math.sin(ang + .05) * len); g.fill(); }
  g.globalAlpha = 1; const gr = g.createRadialGradient(x, y, 2, x, y, 46); gr.addColorStop(0, 'rgba(255,246,214,' + (.9 * a).toFixed(2) + ')'); gr.addColorStop(.3, 'rgba(255,226,170,' + (.35 * a).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = gr; g.fillRect(x - 50, y - 50, 100, 100); g.restore();
}
function proHills(seed, base, amp, col, edge) {
  const rnd = seeded(seed), pts = []; for (let x = -40; x <= W + 40; x += 20) pts.push([x, base - rnd() * amp - Math.sin(x * .02 + seed) * amp * .4]);
  const path = () => { for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i], [nx, ny] = pts[Math.min(pts.length - 1, i + 1)]; if (!i) g.lineTo(x, y); g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2); } };
  g.fillStyle = col; g.beginPath(); g.moveTo(-40, H); path(); g.lineTo(W + 40, H); g.fill();
  g.strokeStyle = edge; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); path(); g.stroke();
}
// Útiles de dibujo enormes y desenfocados, muy cerca de la cámara (se pintan pequeños y se amplían suavizados)
function proForeground(k) {
  if (k >= 1) return; const s = cached('pro-fg', () => { const c = document.createElement('canvas'); c.width = 80; c.height = 45; return c; }), x = s.getContext('2d'), off = ease(k) * 70;
  x.clearRect(0, 0, 80, 45);
  // la punta de un lápiz gigante asoma abajo a la izquierda y sale de cuadro mientras la cámara avanza
  x.fillStyle = '#4a3a30'; x.beginPath(); x.moveTo(-14 - off, 38); x.lineTo(18 - off, 30); x.lineTo(20 - off, 35); x.lineTo(-12 - off, 47); x.fill();
  x.fillStyle = '#c89a5a'; x.beginPath(); x.moveTo(18 - off, 30); x.lineTo(27 - off, 30); x.lineTo(20 - off, 35); x.fill(); x.fillStyle = '#2a2233'; x.fillRect(25 - off, 30, 2, 2);
  g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = .85 * (1 - k * k); g.drawImage(s, 0, 0, 80, 45, 0, 0, W, H); g.restore(); g.imageSmoothingEnabled = false;
}
// Polen de pigmento que flota en la luz
function proPollen(t, a, cols = ['rojo', 'amarillo', 'azul', 'verde', 'naranja', 'violeta']) {
  if (a <= 0) return; const rnd = seeded(33);
  for (let i = 0; i < 26; i++) { const x0 = rnd() * W, y0 = rnd() * H, sp = .1 + rnd() * .25, ph = rnd() * 6.28, x = ((x0 + t * sp * .6) % (W + 20)) - 10, y = y0 + Math.sin(t * .02 + ph) * 8 - (t * sp * .15) % 40;
    g.globalAlpha = a * (.4 + .4 * Math.sin(t * .05 + ph)); g.fillStyle = C(cols[i % cols.length]); g.fillRect(Math.round(x), Math.round(y), 1 + (i % 4 === 0), 1 + (i % 4 === 0)); }
  g.globalAlpha = 1;
}
// Bandas de cine, subtítulo en la banda de abajo, grano y viñeta
function proFrame(t, bars) {
  const vg = cached('pro-vignette', () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), gr = x.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 210); gr.addColorStop(0, 'rgba(11,9,18,0)'); gr.addColorStop(1, 'rgba(11,9,18,.55)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); return c; });
  g.drawImage(vg, 0, 0);
  const rnd = seeded(t * 7 + 1); for (let i = 0; i < 70; i++) { g.fillStyle = i & 1 ? 'rgba(255,248,230,.07)' : 'rgba(11,9,18,.08)'; g.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1); }
  const h = Math.round(20 * bars); if (h <= 0) return;
  g.fillStyle = '#07060c'; g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h);
  for (const L of PRO_LINES) { if (t < L.at || t > L.until + 14) continue;
    const age = t - L.at, out = clamp((t - L.until) / 14, 0, 1), x = Math.round((W - textWidth(L.text)) / 2);
    g.save(); g.globalAlpha = (1 - out) * bars; writtenLines([L.text], x, H - h + 6, '#efe2c4', Prefs.shake ? age * .9 : Infinity, { nib: !!Prefs.shake, wet: '#b8a8d8' }); g.restore(); }
}
function proHero(h, x, y, s, eyes = 'normal', sx = 1, sy = 1, view = 'front', flip = false) {
  const spr = buildSprite(h.id + '_' + view, C(h.col), null, { eyes });
  shadow(x, y + 1, Math.round(spr.width * s * .6 * sx));
  drawSprite(spr, x, y, s * sx, flip, sy);
}
function proGlow(x, y, r, col, a) { if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = Math.min(1, a); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
function proEyes(x, y, o, t) {
  if (o <= 0) return; const blink = (t % 90) < 5 ? .15 : 1, h = Math.max(1, 8 * easeBack(Math.min(1, o)) * blink);
  proGlow(x, y, 30, 'rgba(120,90,170,.8)', o * .6);
  for (const s of [-1, 1]) { const ex = x + s * 8; g.fillStyle = '#efe4bf'; g.beginPath(); g.ellipse(ex, y, 4.5, h / 2 + .5, s * .15, 0, 6.29); g.fill(); if (h > 4) { g.fillStyle = '#0b0912'; g.fillRect(Math.round(ex - 1 - s), Math.round(y - 1), 2, 3); g.fillStyle = '#fff'; g.fillRect(Math.round(ex - 2), Math.round(y - h / 2 + 1), 1, 1); } }
}
// ---- los planos ----
function proShotWorld(t) {
  const B0 = PRO_BEATS, sky = clamp(t / 150, 0, 1), night = clamp((t - B0.drop) / 40, 0, 1), inkT = t - B0.impact, drain = clamp((inkT - 20) / 120, 0, 1);
  // cámara: travelling lento a la derecha acercándose; al caer la gota encuadra el impacto; luego se aleja para verlo todo
  const d = ease(clamp(t / B0.drop, 0, 1)), fk = ease(clamp((t - B0.drop) / 40, 0, 1)), cam = { x: lerp(lerp(118, 196, d), 236, fk), y: lerp(122, 118, fk), z: lerp(lerp(1.5, 1.28, d), 1.55, fk) };
  if (inkT > 0) { const b = ease(clamp(inkT / 90, 0, 1)); cam.x = lerp(236, 190, b); cam.y = lerp(118, 124, b); cam.z = lerp(1.55, 1.18, b); }
  const quake = Prefs.shake && inkT >= 0 && inkT < 18 ? Math.round(Math.sin(t * 2.3) * 3 * (1 - inkT / 18)) : 0;
  // capas: fondo (cielo, sol, colinas) y el mundo pintado con sus vecinos
  const back = proGrab('back', () => { proSky(sky, night); proSun(236, 58, t, (1 - night) * sky);
    proHills(7, 112, 18, mixHex('#c9d6b8', '#6e6680', proQ(night)), mixHex('#a6b894', '#4a4664', proQ(night))); proHills(19, 124, 14, mixHex('#b3c8a4', '#5a5470', proQ(night)), mixHex('#8fa886', '#3a3652', proQ(night))); });
  const lt = Math.round(lerp(430, 0, ease(drain)));
  const mid = proGrab('mid', () => { titleLandscape(lt); if (inkT < 30) titleResidents(430 + t);
    else PRO_HEROES.forEach((h, i) => { const flee = clamp((inkT - 40 - i * 12) / 22, 0, 1); if (flee >= 1) return; const [hx, hy] = h.home, jit = Prefs.shake && flee === 0 ? ((t + i) & 2 ? 1 : -1) : 0, x = lerp(hx, -30, flee), y = hy - Math.sin(flee * Math.PI) * 18;
      shadow(x, hy, 6); drawSprite(buildSprite(h.id + '_side_mini', C(h.col), null, { eyes: 'wide' }), Math.round(x + jit), Math.round(y), 1, false); }); });
  proLayer('mask').getContext('2d').clearRect(0, 0, W, H); proLayer('mask').getContext('2d').drawImage(mid, 0, 0); proDrain(mid, drain, night * .6);
  g.clearRect(0, 0, W, H); g.save(); g.translate(quake, 0);
  proDraw(back, cam, .35); proDraw(mid, cam, 1);
  // la gota enorme a cámara lenta, en coordenadas del mundo vistas por la cámara
  const vw = W / cam.z, vh = H / cam.z, ix = (250 - (cam.x - vw / 2)) * cam.z, iy = (128 - (cam.y - vh / 2)) * cam.z;
  if (t >= B0.drop && inkT < 0) { const q = (t - B0.drop) / (B0.impact - B0.drop), yy = lerp(-40, iy, q * q), r = 7 * cam.z / 1.3, st = 1 + q * .5;
    g.fillStyle = 'rgba(11,9,18,' + (.2 + q * .4).toFixed(2) + ')'; g.beginPath(); g.ellipse(ix, iy + 2, r * (.5 + q), r * .3 * (.5 + q), 0, 0, 6.29); g.fill();
    g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(ix, yy, r, r * st, 0, 0, 6.29); g.fill(); g.beginPath(); g.moveTo(ix - r * .6, yy - r * st * .6); g.lineTo(ix, yy - r * st * 2.2); g.lineTo(ix + r * .6, yy - r * st * .6); g.fill();
    g.fillStyle = '#4a4664'; g.fillRect(Math.round(ix - r * .45), Math.round(yy - r * .5), 2, Math.max(2, r * .6 | 0)); g.fillStyle = '#8c8ab0'; g.fillRect(Math.round(ix - r * .4), Math.round(yy - r * .55), 1, 1);
    for (let i = 1; i < 6; i++) { g.fillStyle = 'rgba(11,9,18,' + (.3 - i * .05).toFixed(2) + ')'; g.fillRect(Math.round(ix - 1), Math.round(yy - r * st * 2.2 - i * 6), 2, 4); } }
  if (inkT >= 0) { // la tinta se come el paisaje desde el impacto y en ella se abren sus ojos
    inkLayer(ix, iy, ease(clamp(inkT / 150, 0, 1)) * 210 * cam.z / 1.2 + inkT * .05, { fr: 16, t, sq: 1.9 });
    if (inkT < 26) drawImpact(null, ix, iy, inkT / 26);
    proEyes(ix, iy - 16, clamp((inkT - 128) / 16, 0, 1), t);
  }
  g.restore();
  proPollen(t, (1 - night) * clamp(t / 40, 0, 1));
  proForeground(clamp(t / 150, 0, 1));
  if (inkT >= 0 && inkT < 3 && Prefs.flash) { g.fillStyle = 'rgba(244,231,200,' + (.85 - inkT * .25).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
}
function proShotHeroes(t) {
  const B0 = PRO_BEATS, k = t - B0.heroes, cam = { x: 160, y: lerp(112, 106, ease(clamp(k / 180, 0, 1))), z: lerp(1.08, 1.22, ease(clamp(k / 180, 0, 1))) };
  // el mundo gris, de noche
  const back = proGrab('back2', () => { proSky(0, 1); proHills(7, 112, 18, '#4a4664', '#3a3652'); proHills(19, 124, 14, '#3e3a55', '#2a2438'); });
  const mid = proGrab('mid2', () => titleLandscape(0));
  proLayer('mask').getContext('2d').clearRect(0, 0, W, H); proLayer('mask').getContext('2d').drawImage(mid, 0, 0); proDrain(mid, 1, 1);
  g.clearRect(0, 0, W, H); g.fillStyle = '#1e1a2c'; g.fillRect(0, 0, W, H); proDraw(back, cam, .3); proDraw(mid, cam, 1);
  g.fillStyle = 'rgba(11,9,18,.45)'; g.fillRect(0, 0, W, H);
  // el foco: un cono de luz de papel desde arriba y su charco en el suelo, con polvo en el haz
  const on = ease(clamp((k - 6) / 24, 0, 1)); g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, 'rgba(255,240,200,' + (.22 * on).toFixed(2) + ')');
  g.fillStyle = gr; g.beginPath(); g.moveTo(140, -10); g.lineTo(180, -10); g.lineTo(250, 140); g.lineTo(70, 140); g.fill();
  const pool = g.createRadialGradient(160, 136, 4, 160, 136, 90); pool.addColorStop(0, 'rgba(255,240,200,' + (.45 * on).toFixed(2) + ')'); pool.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = pool; g.beginPath(); g.ellipse(160, 136, 95, 22, 0, 0, 6.29); g.fill(); g.restore();
  const rnd = seeded(71); for (let i = 0; i < 18; i++) { const x = 110 + rnd() * 100, y = (rnd() * 140 + k * (.1 + rnd() * .2)) % 140; g.globalAlpha = on * .5; g.fillStyle = '#fff4d8'; g.fillRect(Math.round(x + (y / 140) * (x - 160) * .4), Math.round(y), 1, 1); } g.globalAlpha = 1;
  // la tinta acecha desde los bordes, respirando
  inkLayer(160, 118, 150 + Math.sin(t * .04) * 6 - on * 12, { fr: 14, t, sq: 1.5, invert: true });
  // las tres gotas caen a la luz, una a una: lo único con color
  PRO_HEROES.forEach((h, i) => {
    const land = k - 30 - i * 18, fall = clamp((land + 16) / 16, 0, 1); if (fall <= 0) return;
    let x = h.x, y = lerp(-30, 131, fall * fall), sx = 1, sy = 1, eyes = k < 90 ? 'wide' : 'normal';
    if (fall < 1) { sx = .82; sy = 1.25; } else if (land < 10) { const q = Math.sin(land / 10 * Math.PI); sx = 1 + q * .3; sy = 1 - q * .26; }
    const look = k > 80 && k < 170, view = look && i !== 1 ? 'side' : 'front', flip = i === 2;
    if (t >= B0.leap) { const q = t - B0.leap; if (q < 16) { sx = 1 + q / 16 * .32; sy = 1 - q / 16 * .32; } else { const up = (q - 16) / 8; y -= up * up * 160; sx = .7; sy = 1.5; } eyes = 'normal'; }
    proGlow(x, y - 14, 34, C(h.col), (fall >= 1 ? .35 : .15) + (k > 150 ? .15 : 0));
    if (land >= 0 && land < 18) paintRing(x, 132, land / 18, C(h.col), 26);
    if (y > -60) proHero(h, Math.round(x), Math.round(y), 2.1, k > 170 && t < B0.leap ? 'happy' : eyes, sx, sy, view, flip);
  });
  // la mezcla: de cada pareja sale una gota; en el aire nacen el naranja, el verde y el violeta, que brillan
  [[96, 0, 1, 'naranja', [138, 64]], [116, 1, 2, 'verde', [182, 64]], [136, 0, 2, 'violeta', [160, 42]]].forEach(([at, a, b, res, m]) => {
    const q = k - at; if (q < 0) return;
    const fly = clamp(q / 20, 0, 1), A = PRO_HEROES[a], Bh = PRO_HEROES[b];
    if (q < 20) [A, Bh].forEach(h => { const x = lerp(h.x, m[0], ease(fly)), y = lerp(100, m[1], ease(fly)) - Math.sin(fly * Math.PI) * 14; proGlow(x, y, 14, C(h.col), .5); paintDab(Math.round(x), Math.round(y), 5, C(h.col)); });
    else { const pop = q - 20, r = 8 + Math.max(0, 4 - pop * .3) + Math.sin(t * .15 + at) * .5, yy = m[1] + Math.round(Math.sin(t * .07 + at) * 2);
      proGlow(m[0], yy, 30, C(res), .55 + Math.sin(t * .1 + at) * .1); paintDab(m[0], yy, r, C(res), 0);
      if (pop < 16) paintRing(m[0], m[1], pop / 16, C(res), 30);
      if (pop < 20 && Prefs.shake) for (let n = 0; n < 8; n++) { const an = n / 8 * 6.28 + at, dd = pop * 1.6; g.fillStyle = n % 2 ? C(res) : ramp(C(res)).hi; g.fillRect(Math.round(m[0] + Math.cos(an) * dd), Math.round(m[1] + Math.sin(an) * dd * .8 + pop * pop * .02), 2, 2); } }
  });
  // el salto: estelas de su pigmento y líneas de velocidad (barrido vertical)
  if (t >= B0.leap + 16) { const q = clamp((t - B0.leap - 16) / 8, 0, 1);
    PRO_HEROES.forEach((h, i) => { const top = 131 - q * q * 160; pstroke(h.x, 128, h.x + (i - 1) * 4, Math.max(-10, top), 8, C(h.col), 1, 0, false); pstroke(h.x - 2, 128, h.x + (i - 1) * 4 - 2, Math.max(-10, top), 2, ramp(C(h.col)).hi, 1, 0, false); proGlow(h.x, Math.max(0, top), 30, C(h.col), .5); });
    if (Prefs.shake) { const r2 = seeded(t); g.fillStyle = 'rgba(255,244,216,.5)'; for (let i = 0; i < 18; i++) g.fillRect(Math.round(r2() * W), Math.round(r2() * H), 1, 12 + Math.round(r2() * 20)); } }
  proPollen(t, on * .8, ['rojo', 'amarillo', 'azul']);
}
function proShotClimb(t) {
  // la cámara sube por la página hasta el título: las estelas llegan a las letras dibujadas a lápiz
  const B0 = PRO_BEATS, q = ease(clamp((t - B0.climb) / (B0.end - B0.climb), 0, 1)), saved = TITLE.t;
  const page = proGrab('title', () => { TITLE.t = 8; drawTitle(); TITLE.t = saved;
    PRO_HEROES.forEach((h, i) => { const x = LOGO.x0 + [0, 2, 4][i] * LOGO.cw + 14, y0 = 180, y1 = lerp(y0, LOGO.y0 + 20, clamp(q * 1.6 - i * .15, 0, 1)); if (y1 < y0) { pstroke(x, y0, x, y1, 6, C(h.col), 1, 0, false); pstroke(x - 2, y0, x - 2, y1, 1, ramp(C(h.col)).hi, 1, 0, false); paintDab(Math.round(x), Math.round(y1), 4, C(h.col)); proGlow(x, y1, 22, C(h.col), .4); } }); });
  g.clearRect(0, 0, W, H); g.fillStyle = '#d1c5ad'; g.fillRect(0, 0, W, H);
  // entra con un barrido vertical: la imagen llega desde abajo, emborronada por la velocidad
  const whip = clamp(1 - (t - B0.climb) / 10, 0, 1), cam = { x: 160, y: lerp(150, 90, q) + whip * 60, z: lerp(1.8, 1, q) };
  if (whip > 0 && Prefs.shake) { g.save(); for (let i = 3; i >= 1; i--) { g.globalAlpha = .25; proDraw(page, { ...cam, y: cam.y + i * 10 * whip }, 1); } g.restore(); }
  proDraw(page, cam, 1);
}
function drawPrologue() {
  const t = PRO.t, B0 = PRO_BEATS;
  if (t < B0.heroes) proShotWorld(t);
  else if (t < B0.climb) proShotHeroes(t);
  else proShotClimb(t);
  // el corte al plano de las gotas llega con un destello de papel
  if (Prefs.flash && t >= B0.heroes && t < B0.heroes + 6) { g.fillStyle = 'rgba(244,231,200,' + (.7 * (1 - (t - B0.heroes) / 6)).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
  const bars = t < 20 ? ease(t / 20) : t < B0.climb ? 1 : 1 - ease(clamp((t - B0.climb) / 30, 0, 1));
  proFrame(t, bars);
}
