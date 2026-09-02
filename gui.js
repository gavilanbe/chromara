// CHROMARA — gui.js: GUI de cuaderno de pintor. Páginas de bloc con anillas y borde rasgado, pegatinas, barras a lápiz
// rellenas de pintura, brocha que se carga (ATB), hoja que se pasa para las techs, cinta de carrocero para el objetivo.
'use strict';
const INK = '#2a2438', TXT = '#2a2438', TXT2 = '#6a6480', TXT3 = '#9a90a8', GOLD = '#b8860b', PAPER = '#f1e9d6', PAPER2 = '#e3d8bd', PENCIL = '#5a5670';
const GUI = { lastLevel: null, flip: 99 };
function ui(s, x, y, col = TXT) { txt(s, x, y, col, col === TXT ? '#d9cdb0' : null); }
// Página de bloc: papel con grano, borde rasgado arriba, línea a lápiz, anillas a la izquierda (opt.rings), sombra
function page(x, y, w, h, opt = {}) {
  const rnd = seeded(x * 31 + y * 17 + w);
  g.fillStyle = 'rgba(20,18,28,.35)'; g.fillRect(x + 2, y + 3, w, h);
  g.fillStyle = opt.solid || PAPER; g.fillRect(x, y + 2, w, h - 2);
  if (!opt.solid) { g.fillStyle = PAPER2; for (let i = 0; i < w * h / 40; i++) g.fillRect(x + 1 + rnd() * (w - 2) | 0, y + 3 + rnd() * (h - 5) | 0, 1, 1); }
  // borde rasgado superior
  for (let i = 0; i < w; i++) { const d = rnd() < .5 ? 0 : rnd() < .6 ? 1 : 2; g.fillStyle = opt.solid || PAPER; g.fillRect(x + i, y + d, 1, 3 - d); g.fillStyle = '#c9bd9c'; g.fillRect(x + i, y + d, 1, 1); }
  // línea a lápiz (un poco temblona) por dentro
  g.fillStyle = PENCIL; for (let i = 2; i < w - 2; i++) { g.fillRect(x + i, y + h - 2 - (rnd() < .08 ? 1 : 0), 1, 1); } for (let j = 4; j < h - 2; j++) { g.fillRect(x + w - 2 - (rnd() < .08 ? 1 : 0), y + j, 1, 1); }
  g.fillStyle = '#c9bd9c'; g.fillRect(x + 1, y + h - 1, w - 2, 1); g.fillRect(x, y + 3, 1, h - 4);
  if (opt.rings) for (let j = y + 10; j < y + h - 6; j += 12) { g.fillStyle = '#0b0912'; g.fillRect(x + 3, j, 4, 3); g.fillStyle = '#8c8ab0'; g.fillRect(x - 2, j - 2, 8, 2); g.fillRect(x - 2, j - 2, 2, 5); g.fillStyle = '#e8e6f0'; g.fillRect(x - 1, j - 2, 4, 1); }
  if (opt.tint) { g.globalAlpha = .1; g.fillStyle = opt.tint; g.fillRect(x + 2, y + 3, w - 4, h - 5); g.globalAlpha = 1; }
}
const win = (x, y, w, h, opt = {}) => page(x, y, w, h, opt);
// Cinta de carrocero: tira beige translúcida con extremos rasgados
function tape(x, y, w, h = 12) { g.globalAlpha = .9; g.fillStyle = '#e9dcb5'; g.fillRect(x + 2, y, w - 4, h); for (let j = 0; j < h; j++) { const l = (j * 7) % 3, r = (j * 5) % 3; g.fillRect(x + l, y + j, 2, 1); g.fillRect(x + w - 2 - r, y + j, 2, 1); } g.globalAlpha = .35; g.fillStyle = '#c9b98a'; for (let i = 0; i < w; i += 3) g.fillRect(x + i, y + (i % 2 ? 2 : h - 3), 1, 1); g.globalAlpha = 1; }
// Pegatina-retrato: la cara del personaje dentro de un círculo blanco con borde
function sticker(x, y, u, r = 7) { const col = C(u.color); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r + 1, 0, 6.29); g.fill(); g.fillStyle = ramp(col).base; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); g.fillStyle = ramp(col).hi; g.fillRect(x - r + 2, y - r + 2, 3, 1); g.fillRect(x - r + 2, y - r + 3, 1, 2);
  const spr = buildSprite(`${u.id}_front`, col, null, { eyes: !u.alive ? 'ko' : u.hp < u.maxhp * .25 ? 'hurt' : 'normal' }); g.save(); g.beginPath(); g.arc(x, y, r, 0, 6.29); g.clip(); g.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - spr.height / 2) + 2); g.restore(); if (!u.alive) { g.globalAlpha = .5; g.fillStyle = '#9a90a8'; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); g.globalAlpha = 1; } }
// Rectángulo a lápiz relleno de pintura
function pencilBar(x, y, w, h, f, col) { g.fillStyle = PENCIL; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); g.fillStyle = '#e9e1cc'; g.fillRect(x + 1, y + 1, w - 2, h - 2); const n = Math.round((w - 2) * clamp(f, 0, 1)); if (n) { g.fillStyle = ramp(col).base; g.fillRect(x + 1, y + 1, n, h - 2); g.fillStyle = ramp(col).hi; g.fillRect(x + 1, y + 1, n, 1); g.fillStyle = ramp(col).sh; g.fillRect(x + n, y + 1, 1, h - 2); } }
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
function atbBrush(x, y, f, col, t) {
  g.fillStyle = '#5a4630'; g.fillRect(x, y + 1, 8, 4); g.fillStyle = '#b07a48'; g.fillRect(x + 1, y + 2, 6, 2); g.fillStyle = '#d9a06a'; g.fillRect(x + 1, y + 2, 6, 1);
  g.fillStyle = '#8c8ab0'; g.fillRect(x + 8, y, 3, 6); g.fillStyle = '#e8e6f0'; g.fillRect(x + 8, y, 3, 1);
  g.fillStyle = '#d8cbaa'; g.fillRect(x + 11, y, 9, 6); g.fillStyle = '#b8a888'; g.fillRect(x + 11, y + 2, 9, 1); g.fillRect(x + 11, y + 5, 9, 1);
  const rp = ramp(col), n = Math.round(9 * clamp(f, 0, 1)); if (n) { g.fillStyle = rp.base; g.fillRect(x + 11, y, n, 6); g.fillStyle = rp.hi; g.fillRect(x + 11, y, n, 1); g.fillStyle = rp.sh; g.fillRect(x + 11, y + 5, n, 1); }
  g.fillStyle = INK; g.fillRect(x + 20, y, 1, 6); g.fillRect(x + 11, y - 1, 9, 1); g.fillRect(x + 11, y + 6, 9, 1);
  if (f >= 1) { const k = (t >> 2) & 3; g.fillStyle = k < 2 ? '#fff3c0' : rp.hi; g.fillRect(x + 21, y - 2 + k, 1, 1); g.fillRect(x + 22 + (k & 1), y + 1, 1, 1); g.fillRect(x + 19, y + 6 + (k >> 1), 1, 1); }
}
function paintBar(x, y, w, h, f, col) { g.fillStyle = INK; g.fillRect(x, y, w, h); g.fillStyle = '#3a3860'; g.fillRect(x + 1, y + 1, w - 2, h - 2); const n = Math.round((w - 2) * clamp(f, 0, 1)); if (n) { g.fillStyle = ramp(col).base; g.fillRect(x + 1, y + 1, n, h - 2); g.fillStyle = ramp(col).hi; g.fillRect(x + 1, y + 1, n, 1); } }
function swatch(x, y, col, dim) { g.fillStyle = INK; g.fillRect(x, y, 7, 7); g.fillStyle = dim ? '#b8b0a0' : ramp(col).base; g.fillRect(x + 1, y + 1, 5, 5); if (!dim) { g.fillStyle = ramp(col).hi; g.fillRect(x + 1, y + 1, 2, 1); } }
function banner(s, col, y = 4) {
  g.font = FONT; const w = g.measureText(s).width + 20, x0 = (W - w) / 2 | 0; pstroke(x0, y + 6, x0 + w, y + 6, 13, ramp(col).sh, 1, 0, true); pstroke(x0 + 3, y + 5, x0 + w - 3, y + 5, 11, col, 1, 0, true);
  const light = rgbHsl(...hexRgb(col))[2] > .6; txt(s, x0 + 10, y + 2, light ? INK : '#f4f0ea', light ? null : '#14121c');
}
function hilite(x0, y, x1, w, col, a = .3) { // banda de pincelada translúcida (pstroke acumula alpha al solapar cuadrados)
  g.globalAlpha = a; g.fillStyle = col; const len = x1 - x0;
  for (let i = 0; i <= len; i++) { const t = i / len, ww = Math.max(1, Math.round(w * (0.55 + 0.45 * Math.sin(Math.PI * t)))); g.fillRect(x0 + i, Math.round(y - ww / 2), 1, ww); }
  g.globalAlpha = 1;
}
function smudgeIcon(x, y) { g.fillStyle = '#0b0912'; g.fillRect(x, y, 6, 3); g.fillRect(x + 1, y - 1, 4, 1); g.fillRect(x + 1, y + 3, 3, 1); g.fillStyle = '#7d7899'; g.fillRect(x + 1, y, 1, 1); }
// ---- GUI de batalla: página izquierda = comandos, página derecha = estado del grupo; hoja que se pasa para techs/objetos
function drawBattleUI() {
  const y0 = 128, m = B.menu, act = m ? m.unit : null, tint = act ? C(act.color) : null;
  page(104, y0, W - 104, H - y0); page(0, y0, 102, H - y0, { rings: true, tint });
  B.party.forEach((u, i) => {
    const y = y0 + 8 + i * 15, active = act === u, col = C(u.color);
    if (active) hilite(112, y + 5, 314, 12, col, .35);
    sticker(118, y + 5, u, 6);
    ui(u.name, 128, y, u.alive ? ramp(col).sh : TXT3);
    ui('HP', 186, y, TXT2); ui(String(u.hp).padStart(3), 202, y, u.hp <= 0 ? TXT3 : u.hp < u.maxhp * .25 ? C('rojo') : TXT); pencilBar(186, y + 9, 40, 4, u.hp / u.maxhp, col);
    ui('MP', 232, y, TXT2); ui(String(u.mp).padStart(2), 248, y, TXT); pencilBar(232, y + 9, 32, 4, u.mp / u.maxmp, desat(col, .4, .1));
    atbBrush(270, y + 3, u.alive ? u.atb / 100 : 0, col, B.t);
    if (u.atb >= 100 && u.alive) { const k = (B.t >> 2) % 12; g.fillStyle = ramp(col).base; g.fillRect(290, y + 9 + (k < 6 ? k : 5), 1, 2); }
    if (u.status.tiznado) smudgeIcon(300, y + 1); if (u.status.lento) ui('z', 306, y - 1, C('violeta')); if (u.status.contorno) { g.strokeStyle = '#4a4460'; g.setLineDash([1, 1]); g.strokeRect(299.5, y + .5, 8, 8); g.setLineDash([]); }
  });
  if (!m) { ui('...', 12, y0 + 8, TXT3); GUI.lastLevel = null; return; }
  const u = m.unit, ucol = C(u.color), listing = m.level === 'tech' || m.level === 'item' || (m.level === 'target' && m.pending.type !== 'attack');
  const cmdSel = m.level === 'cmd' ? m.idx : (m.level === 'target' && m.pending.type === 'attack') ? 0 : (m.level === 'tech' || m.pending && m.pending.type === 'tech') ? 1 : 2;
  [[u.data.weapon, 'Atacar'], ['tech', 'Tech'], ['item', 'Objeto']].forEach(([ic, label], i) => {
    const y = y0 + 8 + i * 15, sel = cmdSel === i;
    if (sel) { hilite(12, y + 5, 98, 12, ucol, listing ? .18 : .35); if (!listing) dropCursor(10, y + 1, ucol); }
    g.drawImage(iconSprite(ic, ucol), 22, y - 1); ui(label, 38, y + 1, sel ? TXT : TXT2);
  });
  const lv = listing ? (m.pending && m.pending.type === 'item' || m.level === 'item' ? 'item' : 'tech') : null;
  if (lv !== GUI.lastLevel) { GUI.lastLevel = lv; GUI.flip = 0; } GUI.flip++;
  if (!listing) return;
  // ---- hoja que se pasa: lista de techs/objetos
  const isTech = lv === 'tech', L = m.list;
  const sel = m.level === 'target' ? L.findIndex(e => e.id === (m.pending.tech ? m.pending.tech.id : m.pending.item)) : m.idx;
  const rows = Math.max(1, Math.min(4, L.length)), top = clamp(sel - 3, 0, Math.max(0, L.length - 4));
  const ww = 160, wh = rows * 12 + 12, wy = y0 - wh - 2, k = clamp(GUI.flip / 7, 0, 1), sc = Math.sin(k * Math.PI / 2);
  g.save(); g.translate(4, 0); g.scale(Math.max(.05, sc), 1);
  page(0, wy, ww, wh, { rings: true, tint });
  if (!L.length) ui('Nada', 20, wy + 7, TXT3);
  L.slice(top, top + 4).forEach((e, kk) => {
    const i = top + kk, y = wy + 7 + kk * 12;
    if (i === sel) { hilite(14, y + 3, ww - 6, 11, ucol, .35); dropCursor(10, y - 1, ucol); }
    if (isTech) {
      swatch(20, y, C(e.col), !e.avail); ui(e.t.name, 31, y, e.avail ? TXT : TXT3);
      e.users.filter(x => x !== u).forEach((x, q) => { g.globalAlpha = e.avail ? 1 : .4; g.drawImage(iconSprite('drop', C(x.color)), 122 + q * 9, y - 3); g.globalAlpha = 1; });
      const cs = String(e.cost); ui(cs, ww - 8 - cs.length * 8, y, e.avail ? TXT2 : TXT3);
    } else {
      g.drawImage(iconSprite('item', e.it.kind === 'mp' ? C('azul') : e.it.kind === 'heal' ? C('verde') : '#e86a8a'), 20, y - 2); ui(e.it.short || e.it.name, 36, y, TXT);
      const ns = 'x' + e.n; ui(ns, ww - 8 - ns.length * 8, y, TXT2);
    }
  });
  if (L.length > 4) { ui(top > 0 ? '▲' : ' ', ww - 14, wy + 3, TXT2); ui(top + 4 < L.length ? '▼' : ' ', ww - 14, wy + wh - 9, TXT2); }
  g.restore();
  // ---- arriba: cinta con la ecuación de color y la descripción
  if (isTech && L[sel]) {
    const e = L[sel]; tape(0, 3, W, 24);
    let x = 8; e.users.forEach((us, j) => { swatch(x, 7, C(us.color)); x += 8; if (j < e.users.length - 1) { ui('+', x, 7, TXT2); x += 9; } });
    if (e.combo) { ui('=', x + 1, 7, TXT2); x += 10; swatch(x, 7, C(e.col)); x += 10; }
    ui(e.t.name + ' · ' + e.cost + ' MP', x + 2, 7, e.avail ? ramp(C(e.col)).sh : TXT3);
    if (e.combo) { const cs = 'con ' + e.users.filter(q => q !== u).map(q => q.name).join(' y '); ui(cs, W - 8 - cs.length * 8, 7, e.avail ? TXT2 : TXT3); }
    ui(e.t.desc.slice(0, 38), 8, 17, e.avail ? TXT : TXT3);
    if (!e.avail) { const ns = !e.ready ? '(compañero no listo)' : '(sin MP)'; ui(ns, W - 8 - ns.length * 8, 17, C('rojo')); }
  }
  if (!isTech && L[sel]) { tape(0, 3, W, 14); ui(L[sel].it.desc, 8, 6, TXT); }
}
// Etiqueta del objetivo: cinta de carrocero con nombre y HP
// Etiqueta del objetivo: cinta pegada justo encima del cursor; si no cabe arriba, bajo los pies del objetivo. Nunca tapa el cursor.
function targetLabel(t, cursorY, top) { const label = t.name + (t.kind === 'enemy' ? '  ' + t.hp + '/' + t.maxhp : '  HP ' + t.hp); g.font = FONT; const w = g.measureText(label).width + 22, x0 = clamp(t.x - w / 2, 2, W - w - 2) | 0;
  let y = Math.round(cursorY - 16); if (y < 2) y = Math.min(112, Math.round(t.y + 6)); tape(x0, y, w, 14); swatch(x0 + 5, y + 3, t.color === 'negro' ? '#2a2438' : C(t.color)); ui(label, x0 + 15, y + 3, TXT); }

// =====================================================================
// Menú de estado/equipo: el cuaderno del pintor. Se abre con rebote, fichas a la izquierda, retrato y equipo a la derecha.
// ↑↓ personaje · Z entra en el equipo · ↑↓ arma/accesorio · ◄► cambia (la herramienta entra de golpe y salpica) · X vuelve/cierra
// =====================================================================
const ACC_LIST = Object.keys(DATA.accessories), WPN_LIST = Object.keys(DATA.weapons);
const easeBack = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
function openMenu() { OW.menu = { idx: 0, level: 'chars', row: 0, t: 0, hl: 30, pop: 0, swing: 0, spl: [], delta: null, flip: 99 }; Audio.sfx('book_open'); }
function menuStats(p) { return effStats(p); }
function updateMenu() {
  const m = OW.menu; if (m.closing) { if (m.t - m.closeT > 10) OW.menu = null; return; }
  if (m.t < 8) return; // abriéndose
  const p = Party[m.idx], note = () => Audio.sfx('cursor', { semi: SEMI[p.id] || 0 });
  if (m.level === 'chars') {
    if (hit('down')) { m.idx = (m.idx + 1) % 3; m.pop = 1; m.flip = 0; note(); Audio.sfx('page', { vol: .5 }); } if (hit('up')) { m.idx = (m.idx + 2) % 3; m.pop = 1; m.flip = 0; note(); Audio.sfx('page', { vol: .5 }); }
    if (hit('ok')) { m.level = 'equip'; m.row = 0; Audio.sfx('page'); }
    if (hit('back')) { m.closing = true; m.closeT = m.t; Audio.sfx('book_close'); }
    return;
  }
  if (hit('down') || hit('up')) { m.row = 1 - m.row; note(); }
  if (hit('back')) { m.level = 'chars'; Audio.sfx('cancel'); return; }
  if (hit('left') || hit('right')) {
    const dir = keys.right ? 1 : -1, before = effStats(p);
    if (m.row === 0) { const i = WPN_LIST.indexOf(p.weapon), nw = WPN_LIST[(i + dir + WPN_LIST.length) % WPN_LIST.length], other = Party.find(q => q !== p && q.weapon === nw); if (other) other.weapon = p.weapon; p.weapon = nw; m.swapped = other ? other.name : null; } // si otro la lleva, se la cambias
    else { const i = ACC_LIST.indexOf(p.acc); p.acc = ACC_LIST[(i + dir + ACC_LIST.length) % ACC_LIST.length]; }
    const after = effStats(p); p.cur.hp = clamp(p.cur.hp + after.hp - before.hp, 1, after.hp); p.cur.mp = clamp(p.cur.mp + after.mp - before.mp, 0, after.mp);
    m.delta = { atk: after.atk - before.atk, def: after.def - before.def, spd: after.spd - before.spd, hp: after.hp - before.hp, mp: after.mp - before.mp, t: 0 };
    m.swing = 1; m.swingDir = dir; Audio.sfx('fwip'); Audio.sfx('equip', { when: .06 }); Audio.sfx('plop', { when: .14, semi: SEMI[p.id] || 0 });
    const col = C(p.color); for (let j = 0; j < 8; j++) m.spl.push({ x: 226 + R(-10, 10), y: (m.row ? 130 : 98) + R(-4, 4), vx: R(-1.4, 1.4), vy: -R(.4, 1.8), col, t: 0 });
  }
}
function drawMenu() {
  const m = OW.menu; m.t++; m.flip++;
  const k = m.closing ? clamp(1 - (m.t - m.closeT) / 10, 0, 1) : clamp(m.t / 16, 0, 1), e = m.closing ? k * k : easeBack(k), oy = Math.round((1 - e) * 200);
  g.fillStyle = 'rgba(11,9,18,' + (.5 * e).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(0, oy);
  const p = Party[m.idx], col = C(p.color), rp = ramp(col), s = effStats(p);
  // ---- página izquierda: fichas
  page(6, 8, 128, 164, { rings: true });
  ui('CUADERNO', 22, 14, GOLD); swatch(94, 14, C('amarillo')); ui(String(Game.pigmento), 104, 14, TXT);
  const hy = 34 + m.idx * 44; m.hl = lerp(m.hl, hy, .3);
  hilite(18, Math.round(m.hl) + 18, 128, 34, col, m.level === 'chars' ? .28 : .14);
  Party.forEach((q, i) => {
    const y = 34 + i * 44, qs = effStats(q), qc = C(q.color), sel = i === m.idx, popS = sel && m.pop > 0 ? 1 + m.pop * .25 : 1;
    if (sel) m.pop = Math.max(0, m.pop - .12);
    g.save(); g.translate(30, y + 14); g.scale(popS, popS); g.translate(-30, -y - 14); sticker(30, y + 14, { id: q.id, color: q.color, alive: q.cur.hp > 0, hp: q.cur.hp, maxhp: qs.hp }, 9); g.restore();
    ui(q.name, 46, y + 2, ramp(qc).sh); ui(q.role, 46, y + 12, TXT2);
    ui('HP', 46, y + 24, TXT3); pencilBar(64, y + 25, 34, 4, q.cur.hp / qs.hp, qc); ui('MP', 102, y + 24, TXT3); pencilBar(118, y + 25, 12, 4, q.cur.mp / qs.mp, desat(qc, .4, .1));
    if (sel && m.level === 'chars') dropCursor(10, y + 10, qc);
  });
  // ---- página derecha: retrato, stats y equipo (pasa hoja al cambiar de personaje)
  const fk = clamp(m.flip / 7, 0, 1), fsc = Math.sin(fk * Math.PI / 2);
  g.save(); g.translate(140, 0); g.scale(Math.max(.05, fsc), 1);
  page(0, 8, 174, 164);
  // retrato con esquinas de cinta
  const spr = buildSprite(`${p.id}_title`, col, null, { eyes: ((m.t + 20) % 150) < 6 ? 'blink' : p.cur.hp <= 0 ? 'ko' : 'normal' });
  const px = 38, py = 44, pw = 64, ph = 56; g.fillStyle = '#e9e1cc'; g.fillRect(px - pw / 2, py - ph / 2 + 4, pw, ph); g.fillStyle = PENCIL; g.strokeStyle = PENCIL; g.strokeRect(px - pw / 2 + .5, py - ph / 2 + 4.5, pw - 1, ph - 1);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => tape(px + a * (pw / 2 - 8) - 7, py + b * (ph / 2 - 3) + 1, 14, 5));
  const bounce = m.pop > 0 ? 1 + Math.sin(m.pop * Math.PI) * .15 : 1, breathe = 1 + Math.sin(m.t * .08) * .02;
  shadow(px, py + ph / 2 - 2, 20); drawSprite(spr, px, py + ph / 2 - 2, bounce, false, breathe * (2 - bounce)); if (p.id === 'anil') drawSatellites(px, py + ph / 2 - 6, m.t, col, .8);
  ui(p.name, 80, 16, rp.sh); ui(p.role, 80, 26, TXT2);
  const D = m.delta && m.delta.t < 50 ? m.delta : null; if (m.delta) m.delta.t++;
  const stat = (label, val, x, y, d) => { ui(label, x, y, TXT3); ui(String(val), x + label.length * 8 + 4, y, TXT); if (d) { const dx = x + label.length * 8 + 4 + String(val).length * 8 + 4; ui((d > 0 ? '+' : '') + d, dx, y - Math.round((1 - clamp(D.t / 12, 0, 1)) * 4), d > 0 ? '#2f9a48' : C('rojo')); } };
  stat('HP', p.cur.hp + '/' + s.hp, 80, 38, D && D.hp); stat('MP', p.cur.mp + '/' + s.mp, 80, 48, D && D.mp);
  stat('ATK', s.atk, 80, 60, D && D.atk); stat('DEF', s.def, 80, 70, D && D.def); stat('SPD', s.spd, 80, 80, D && D.spd);
  // equipo
  const rows = [['ARMA', DATA.weapons[p.weapon].name, DATA.weapons[p.weapon].desc], ['ACCESORIO', DATA.accessories[p.acc].name, DATA.accessories[p.acc].desc]];
  if (m.swing > 0) m.swing = Math.max(0, m.swing - .09);
  rows.forEach(([label, name, desc], r) => {
    const y = 92 + r * 28, sel = m.level === 'equip' && m.row === r; ui(label, 12, y, TXT3);
    if (sel) { hilite(10, y + 17, 166, 16, col, .3); ui('◄', 10, y + 12, rp.sh); ui('►', 158, y + 12, rp.sh); }
    const sw = sel && m.swing > 0 ? m.swingDir * Math.sin(m.swing * Math.PI) * 14 * m.swing : 0, ang = sel && m.swing > 0 ? Math.sin(m.swing * Math.PI * 2) * .3 * m.swing : 0;
    if (r === 0) { const img = propSprite(p.weapon, col), P = PROP[p.weapon]; drawProp(img, 46 + sw, y + 20, ang - .2, 1, P.tip[0], P.tip[1], .62); }
    else { const icons = { paleta: 'tech', goma: 'item', sacapuntas: 'lapiz', lienzo: 'item', difumino: 'pincel' }; g.save(); g.translate(30 + sw, y + 18); g.rotate(ang); g.drawImage(iconSprite(icons[p.acc] || 'item', col), -6, -6); g.restore(); }
    ui(name, 66, y + 12, sel ? TXT : TXT2);
  });
  const wrap = (txt, n) => { const out = []; let line = ''; for (const w of txt.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out.slice(0, 2); };
  const desc = m.level === 'equip' ? (m.row === 0 && m.swapped && m.delta && m.delta.t < 90 ? 'Se la cambias a ' + m.swapped + '. ' + rows[0][2] : rows[m.row][2]) : p.role === 'Guardia' ? 'Sostiene el dibujo hasta el final.' : p.role === 'Veloz' ? 'Corre para que nadie la borre.' : 'Pinta por pintar.';
  wrap(desc, 20).forEach((l, i) => ui(l, 10, 141 + i * 10, TXT));
  ui(m.level === 'equip' ? '◄► cambiar · X volver' : 'Z equipo · X cerrar', 10, 161, TXT3);
  for (const q of m.spl) { q.t++; q.x += q.vx; q.y += q.vy; q.vy += .12; g.fillStyle = q.t < 8 ? ramp(q.col).hi : ramp(q.col).base; g.fillRect(Math.round(q.x - 140), Math.round(q.y), 2, 2); } m.spl = m.spl.filter(q => q.t < 24);
  g.restore(); g.restore();
}

// =====================================================================
// Paso de hoja: la página se dobla por la esquina inferior derecha hacia la superior izquierda. La parte doblada muestra
// el reverso del papel (con lo de delante traslucido, como tinta que traspasa) y proyecta sombra sobre la parte plana.
// =====================================================================
function clipHalf(P, n, keepPositive) { // polígono del rectángulo de pantalla recortado por la recta que pasa por P con normal n
  const pts = [[0, 0], [W, 0], [W, H], [0, H]], out = [], side = q => (q[0] - P[0]) * n[0] + (q[1] - P[1]) * n[1];
  for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4], sa = side(a), sb = side(b), ina = keepPositive ? sa >= 0 : sa <= 0, inb = keepPositive ? sb >= 0 : sb <= 0;
    if (ina) out.push(a); if (ina !== inb) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
  return out;
}
function pathPoly(poly) { g.beginPath(); poly.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); }
function pageCurl(snap, k, back = PAPER, back2 = PAPER2) {
  if (k <= 0) { g.drawImage(snap, 0, 0); return; } if (k >= 1) return;
  const L = Math.hypot(W, H), u = [-W / L, -H / L], P = [W + u[0] * L * k * 1.02, H + u[1] * L * k * 1.02]; // el pliegue avanza por la diagonal desde la esquina inferior derecha
  const flat = clipHalf(P, u, true), peeled = clipHalf(P, u, false); // plana = lejos de la esquina; levantada = hacia la esquina (deja ver lo de debajo)
  const a = 1 - 2 * u[0] * u[0], b = -2 * u[0] * u[1], c = -2 * u[0] * u[1], d = 1 - 2 * u[1] * u[1], e = P[0] - (a * P[0] + c * P[1]), f = P[1] - (b * P[0] + d * P[1]);
  const refl = q => [a * q[0] + c * q[1] + e, b * q[0] + d * q[1] + f], flap = peeled.map(refl); // el reverso de lo levantado cae reflejado sobre la parte plana
  g.save(); pathPoly(flat); g.clip(); g.drawImage(snap, 0, 0);
  const sh = g.createLinearGradient(P[0], P[1], P[0] + u[0] * 30, P[1] + u[1] * 30); sh.addColorStop(0, 'rgba(11,9,18,.5)'); sh.addColorStop(1, 'rgba(11,9,18,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H); g.restore();
  if (flap.length < 3) return;
  g.save(); pathPoly(flap); g.clip();
  g.fillStyle = back; g.fillRect(0, 0, W, H); const rnd = seeded(31); g.fillStyle = back2; for (let i = 0; i < 500; i++) g.fillRect(rnd() * W | 0, rnd() * H | 0, 1, 1);
  g.save(); g.transform(a, b, c, d, e, f); g.globalAlpha = .14; g.drawImage(snap, 0, 0); g.restore();
  const g2 = g.createLinearGradient(P[0], P[1], P[0] + u[0] * 40, P[1] + u[1] * 40); g2.addColorStop(0, 'rgba(255,255,255,.5)'); g2.addColorStop(.35, 'rgba(11,9,18,.1)'); g2.addColorStop(1, 'rgba(11,9,18,0)'); g.fillStyle = g2; g.fillRect(0, 0, W, H);
  g.restore();
  // canto de la hoja sobre el pliegue
  const edge = flat.filter(q => Math.abs((q[0] - P[0]) * u[0] + (q[1] - P[1]) * u[1]) < .5); if (edge.length >= 2) { g.strokeStyle = '#c9bd9c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(edge[0][0], edge[0][1]); g.lineTo(edge[1][0], edge[1][1]); g.stroke(); }
}
