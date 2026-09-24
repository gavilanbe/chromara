// Índice del cuaderno: desde el título, «elegir hoja» abre las tres hojas extendidas sobre la mesa. Cada una lleva su
// nombre, un mapa en miniatura dibujado con sus propias filas (bosques de pinceles, ríos, caminos, el lago sucio), la
// marca de tinta donde espera su jefe y sus opciones: explorar desde el principio o ir directamente al combate final
// (en la tercera, a Los Contrarios o a El Negro). Flechas, clic o toque; A entra, B vuelve a la paleta.
'use strict';
const LEVELS = [
  { page: 0, roman: 'I', name: 'El jardín de Chromara', paper: '#f1e6c8', edge: '#c9b48a', tint: null,
    bosses: [{ key: 'B', label: 'La Tinta', sprite: 'tinta_mini' }] },
  { page: 1, roman: 'II', name: 'El reverso del lienzo', paper: '#d2c9da', edge: '#9d93ad', tint: '#6f6388',
    bosses: [{ key: 'N', label: 'Devoralíneas', sprite: 'devoralineas_mini' }] },
  { page: 2, roman: 'III', name: 'El agua sucia', paper: '#c6cbb8', edge: '#8b8f80', tint: '#4e5a3e',
    bosses: [{ key: 'X', label: 'Los Contrarios', sprite: 'trio' }, { key: 'Z', label: 'El Negro', sprite: 'el_negro_mini' }] },
];
function levelOptions(L) { return [{ label: 'Explorar', boss: null }, ...L.bosses.map(b => ({ label: b.label, boss: b }))]; }
// Filas y jefes de cada hoja, sin instalarla: la primera es el mapa del juego tal y como se cargó
function levelSource(page) {
  if (page === 0) { const leaf = typeof CHAPTER !== 'undefined' && CHAPTER.pages[0]; const map = Game.page === 0 || !leaf ? MAP : leaf.map; return { rows: map.rows, spots: map.spots || [] }; }
  const m = page === 1 ? chapterMap() : dirtyMap(); return { rows: m.rows, spots: m.spots };
}
function levelThumb(L) {
  return cached('level-thumb|' + L.page, () => {
    const src = levelSource(L.page), c = document.createElement('canvas'); c.width = 80; c.height = 60; const x = c.getContext('2d');
    const mixT = col => L.tint ? mixHex(col, L.tint, .38) : col;
    const COL = { T: '#5d7a4f', '~': L.page === 2 ? '#4a5a44' : '#6f9fc8', '=': '#eadfbd', '.': '#dccfab', ',': '#cfc19d' };
    src.rows.forEach((row, ty) => { for (let tx = 0; tx < row.length; tx++) { const ch = row[tx]; let col = COL[ch] || COL[','];
      if (ch === 'T' && (tx + ty) % 3 === 0) col = '#7a9a62'; if (ch === '~' && (tx * 3 + ty) % 5 === 0) col = L.page === 2 ? '#5d6c4c' : '#8fb8dc';
      x.fillStyle = mixT(col); x.fillRect(tx * 2, ty * 2, 2, 2); } });
    // los caminos se oscurecen en su borde, como trazados a lápiz
    x.fillStyle = 'rgba(58,47,42,.25)'; src.rows.forEach((row, ty) => { for (let tx = 0; tx < row.length; tx++) if (row[tx] === '=' && (row[tx + 1] || '=') !== '=') x.fillRect(tx * 2 + 1, ty * 2, 1, 2); });
    return c;
  });
}
function levelBossSpot(L, key) { const s = levelSource(L.page).spots.find(s => s.key === key) || (key === 'Z' && levelSource(L.page).spots.find(s => s.key === 'X')); return s ? [s.x * 2 + 1, s.y * 2 + 1] : null; }

function levelSelectOpen() {
  if (TITLE.exit || TITLE.select) return; Audio.init();
  TITLE.select = { i: 0, opt: 0, at: ARTUI.t }; titleStartButton.style.display = 'none'; if (typeof chapterTitleButton !== 'undefined' && chapterTitleButton) chapterTitleButton.style.display = 'none';
  Audio.sfx('page', { vol: .5 }); for (const k in pressed) pressed[k] = false;
}
function levelSelectClose() { TITLE.select = null; titleStartButton.style.display = 'block'; placeTitleButton(); Audio.sfx('page', { vol: .4 }); for (const k in pressed) pressed[k] = false; }
function levelSelectGo(i = TITLE.select.i, opt = TITLE.select.opt) {
  const L = LEVELS[i], o = levelOptions(L)[opt]; if (!o) return;
  TITLE.go = { page: L.page, boss: o.boss ? o.boss.key : null }; TITLE.select = null; beginTitleGame();
}
function levelSelectUpdate() {
  const S = TITLE.select, n = LEVELS.length;
  if (hit('back')) { levelSelectClose(); return; }
  const dx = hit('right') ? 1 : hit('left') ? -1 : 0, dy = hit('down') ? 1 : hit('up') ? -1 : 0;
  if (dx) { S.i = (S.i + dx + n) % n; S.opt = Math.min(S.opt, levelOptions(LEVELS[S.i]).length - 1); S.moved = ARTUI.t; Audio.sfx('page', { vol: .3, semi: S.i * 2 }); }
  if (dy) { const m = levelOptions(LEVELS[S.i]).length; S.opt = (S.opt + dy + m) % m; Audio.sfx('cursor'); }
  if (hit('ok')) levelSelectGo();
}
// Al salir del título hacia una hoja o un jefe: se prepara el destino (lo revela el pase de página del título)
function levelSelectSetup(go) {
  Game.intro = go.page === 0 && !go.boss; initOverworld(); OW.msg = go.page === 0 && !go.boss ? OW.msg : null;
  Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; });
  if (go.page >= 1) { if (go.page === 2) CHAPTER.complete = true; chapterInstall(1); if (go.page === 2) chapterInstall(2); for (let p = 1; p <= go.page; p++) CHAPTER.visited.add(p); }
  if (go.boss) {
    if (go.page === 1) ['7', '8', '9'].forEach(k => Game.defeated.add(k));
    if (go.page === 2) { ['m', 'v', 'o'].forEach(k => Game.defeated.add(k)); if (go.boss === 'Z') { Game.defeated.add('X'); contraFuse(); } }
    const f = OW.foes.find(f => f.key === go.boss); if (f) { OW.x = f.x; OW.y = f.y + 40; OW.hist = []; OW.dir = 'up'; }
  }
  OW.cam.x = clamp(OW.x - W / 2, 0, MAP.w * TILE - W); OW.cam.y = clamp(OW.y - H / 2, 0, MAP.h * TILE - H);
  OW.landT = 999; OW.msgHold = true; Audio.prepare(worldCue());
}
function levelSelectFinish(go) {
  if (go.boss) { OW.landT = 0; OW.landZ = null; OW.msgHold = false; setState('overworld'); const f = OW.foes.find(f => f.key === go.boss); if (f) startTransition(f); return true; }
  if (go.page >= 1 && CHAPTER_FIRST[go.page]) OW.msg = { lines: CHAPTER_FIRST[go.page], t: 0 };
  return false;
}

// ---- dibujo ----
function levelBossIcon(o, x, y, t, s = 1) {
  if (!o.boss) { [['rojo', -6], ['amarillo', 0], ['azul', 6]].forEach(([c, d], n) => paintDab(x + d, y - 3 + (Prefs.shake ? Math.round(Math.sin(t * .15 + n) * 1) : 0), 2.5, C(c))); return; }
  if (o.boss.sprite === 'trio') { ['moho', 'moraton', 'oxido'].forEach((id, n) => drawSprite(buildSprite(id + '_mini', C('negro'), null, { eyes: 'angry' }), x + (n - 1) * 5, y + 1, s * .6, n === 2)); return; }
  drawSprite(buildSprite(o.boss.sprite, C('negro'), null, { eyes: 'normal' }), x, y + 2, s * (o.boss.sprite === 'tinta_mini' ? .75 : .45));
}
function drawLevelSelect(t) {
  const S = TITLE.select; if (!S) return;
  const age = ARTUI.t - S.at, fade = clamp(age / 12, 0, 1), sh = Prefs.shake;
  g.fillStyle = 'rgba(11,9,18,' + (.74 * fade).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
  // cabecera a brocha
  const title = 'ÍNDICE DEL CUADERNO', tw = rotuloWidth(title) + 26, tx = Math.round((W - tw) / 2), ty = 4 - Math.round((1 - fade) * 12);
  brushBand(tx + 1, ty + 2, tw, 16, '#07060c'); brushBand(tx, ty, tw, 16, '#2a2438'); bigText(title, tx + 13, ty + 3, '#efe2c4', { outline: '#07060c' });
  LEVELS.forEach((L, i) => {
    const sel = i === S.i, enter = sh ? easeBack(clamp((age - i * 4) / 14, 0, 1)) : 1, lift = sel ? -5 : 0, cw = 92, ch = 136, x0 = 12 + i * 100, y0 = 26 + lift + Math.round((1 - enter) * 120);
    const tilt = sel ? 0 : (i - S.i) * .035, sc = sel ? 1.04 : .96, t0 = t + i * 30;
    g.save(); g.translate(x0 + cw / 2, y0 + ch / 2); g.rotate(tilt); g.scale(sc, sc); g.translate(-cw / 2, -ch / 2);
    // la hoja: sombra, papel, canto y cinta
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(3, 4, cw, ch);
    g.fillStyle = L.edge; g.fillRect(0, 0, cw, ch); g.fillStyle = L.paper; g.fillRect(1, 1, cw - 2, ch - 2);
    const r = seeded(40 + i); g.fillStyle = 'rgba(58,47,42,.08)'; for (let n = 0; n < 60; n++) g.fillRect(r() * cw | 0, r() * ch | 0, 1, 1);
    g.fillStyle = 'rgba(233,220,181,.85)'; g.fillRect(cw / 2 - 12, -4, 24, 8);
    smallText('HOJA ' + L.roman, 6, 4, '#7a6e5c');
    const lines = wrapSmall(L.name, cw - 12); lines.slice(0, 2).forEach((ln, n) => smallText(ln, 6, 14 + n * 9, '#3a2f2a'));
    // mapa en miniatura con la marca del jefe
    const my = 34; g.fillStyle = '#3a2f2a'; g.fillRect(5, my - 1, 82, 62); g.drawImage(levelThumb(L), 6, my);
    const opts = levelOptions(L), cur = opts[sel ? S.opt : 0];
    for (const b of L.bosses) { const spot = levelBossSpot(L, b.key); if (!spot) continue; const hot = sel && cur.boss && cur.boss.key === b.key, pr = sh ? Math.sin(t0 * .15) * .8 : 0;
      g.fillStyle = '#0b0912'; g.beginPath(); g.arc(6 + spot[0], my + spot[1], (hot ? 3.4 : 2.4) + pr, 0, 6.29); g.fill(); if (hot) { g.strokeStyle = '#e76b55'; g.lineWidth = 1; g.beginPath(); g.arc(6 + spot[0], my + spot[1], 8 + pr * 2, 0, 6.29); g.stroke(); levelBossIcon(cur, 6 + spot[0], my + spot[1] + 3, t0, 1.1); } } // el jefe elegido aparece en su sitio del mapa
    if (!sel) { const b = L.bosses[L.bosses.length - 1]; smallText(b.label, 6, 100, '#6b5d4c'); }
    // opciones: explorar o cada jefe final
    if (sel) opts.forEach((o, n) => { const oy = 98 + n * 12, on = n === S.opt;
      if (on) { g.save(); g.globalAlpha = .45; titleLine([[16, oy + 7], [cw - 6, oy + 6]], o.boss ? '#8a5aa8' : '#e76b55', 5); g.restore(); }
      if (on) [['rojo', 0], ['amarillo', 3], ['azul', 6]].forEach(([c, d], k) => paintDab(6 + (k === 1 ? 3 : 0), oy + 2 + d * .6 + (sh ? Math.round(Math.sin(t0 * .15 + k) * .8) : 0), 1.8, C(c))); // el cursor de tres gotas
      smallText(o.boss ? o.label : 'Explorar', 14, oy + 1, on ? '#2a1f24' : '#6b5d4c');

      uiHit(x0 + 2, y0 + oy - 1, cw - 4, 12, () => { S.opt = n; levelSelectGo(i, n); }, () => { if (S.opt !== n) { S.opt = n; Audio.sfx('cursor'); } });
    });
    g.restore();
    if (!sel) uiHit(x0, y0, cw, ch, () => { S.i = i; S.opt = 0; Audio.sfx('page', { vol: .3, semi: i * 2 }); });
  });
  const hint = keyLabel('left') + keyLabel('right') + ' hoja · ' + keyLabel('up') + keyLabel('down') + ' elegir · ' + keyLabel('ok') + ' entrar · ' + keyLabel('back') + ' volver';
  smallText(hint, Math.round((W - textWidth(hint)) / 2), H - 11, '#b8a8c8');
  uiHit(0, H - 14, W, 14, () => levelSelectClose());
}
