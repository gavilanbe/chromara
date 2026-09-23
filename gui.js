// CHROMARA — gui.js: GUI de cuaderno de pintor. Páginas de bloc con anillas y borde rasgado, pegatinas, barras a lápiz
// rellenas de pintura, brocha que se carga (ATB), hoja que se pasa para las techs, cinta de carrocero para el objetivo.
'use strict';
const INK = '#2a2438', TXT = '#2a2438', TXT2 = '#6a6480', TXT3 = '#9a90a8', GOLD = '#b8860b', PAPER = '#f1e9d6', PAPER2 = '#e3d8bd', PENCIL = '#5a5670';
const GUI = { lastLevel: null, flip: 99 };
// A separate, fixed-step UI clock keeps menus alive while the world is paused.
// Feedback is deterministic and never consumes the game's random sequence.
const ARTUI = { t: 0, tracks: new Map(), motes: [] };
function tickArtUI() {
  ARTUI.t++;
  ARTUI.motes = Prefs.shake ? ARTUI.motes.filter(p => ARTUI.t - p.at < 20) : [];
}
function artObserve(id, value) {
  let e = ARTUI.tracks.get(id);
  if (!e || e.value !== value) { e = {value, at:ARTUI.t}; ARTUI.tracks.set(id, e); }
  return e.at;
}
function artPop(at, duration = 16) {
  const k = clamp((ARTUI.t - at) / duration, 0, 1);
  return Prefs.shake ? Math.sin(k * Math.PI) * (1-k) * Prefs.shake : 0;
}
function artBurst(x, y, col = '#c79b45') {
  if (!Prefs.shake) return;
  for (let i=0; i<6; i++) ARTUI.motes.push({x,y,col,at:ARTUI.t,a:i*2.4});
  ARTUI.motes = ARTUI.motes.slice(-36);
}
function drawArtFeedback() {
  for (const p of ARTUI.motes) {
    const t = ARTUI.t-p.at;
    g.globalAlpha = 1-t/20; g.fillStyle=p.col;
    g.fillRect(Math.round(p.x+Math.cos(p.a)*t*.55),Math.round(p.y-Math.abs(Math.sin(p.a))*t*.65+t*t*.015),t<9?2:1,1);
  }
  g.globalAlpha=1;
}
function artFocus(o, i) {
  if (o.idx===i || o.capture) return;
  o.idx=i; o.message=''; o.notice=null; Audio.sfx('cursor',{vol:.3});
}
// Loose cut paper, a folded corner and a real metal clip; grain stays off type.
function artSheet(x,y,w,h,col='#aa8554') {
  maskingLabel(x,y,w,h);
  g.fillStyle='#d6c8a9';
  for(let i=8;i<w-8;i+=19)g.fillRect(x+i,y+h-3,2,1);
  g.beginPath();g.moveTo(x+w-9,y+h-1);g.lineTo(x+w-1,y+h-9);g.lineTo(x+w-1,y+h-1);g.fill();
  g.fillStyle=col;g.fillRect(x+8,y-2,17,3);
  g.fillStyle='#6d6871';g.fillRect(x+13,y-4,7,3);
  g.fillStyle='#eee9dc';g.fillRect(x+14,y-4,4,1);
}
function artTag(label,x,y,col='#c49d58',max=308) {
  const w=Math.min(max,textWidth(label)+16); maskingLabel(x,y,w,15);
  brushBand(x+2,y+3,3,9,col);smallText(label,x+9,y+4);return w;
}
function artButton(id,label,x,y,w,h,col,run,opt={}) {
  const at=artObserve('button:'+id,!!opt.selected), lift=opt.selected?Math.round(artPop(at)*3):0;
  const by=y-lift, disabled=!!opt.disabled;
  brushBand(x,by+2,w,h,'#302635');
  brushBand(x,by,w,h,disabled?'#c8bdab':col);
  g.fillStyle=disabled?'#ddd3bf':ramp(col).hi;g.fillRect(x+7,by+2,w-15,1);
  textCenter(label,x+w/2,by+Math.floor((h-7)/2),disabled?UI_MUTED:accentInk(col));
  if(opt.selected)g.drawImage(iconSprite('pincel',col),x-5,by+h-8,12,12);
  uiHit(x,y,w,h,run,opt.hover);
}
function artSeal(label,x,y,col,r=16,at=-99) {
  const pop=artPop(at),rr=r+Math.round(pop*3);
  g.strokeStyle=col;g.lineWidth=1;g.beginPath();g.arc(x,y,rr,0,6.29);g.stroke();
  g.beginPath();g.arc(x,y,rr-3,.3,5.8);g.stroke();
  maskingLabel(x-textWidth(label)/2-3,y-5,textWidth(label)+6,11);
  textCenter(label,x,y-3,col);
}
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
  const fade = pigmentFade(u.mp, u.maxmp), spr = desatSprite(buildSprite(`${u.id}_front`, col, null, { eyes: !u.alive ? 'ko' : u.hp < u.maxhp * .25 ? 'hurt' : 'normal' }), fade); if (fade) { g.fillStyle = desat(col, fade * .8, fade * .15); g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); } g.save(); g.beginPath(); g.arc(x, y, r, 0, 6.29); g.clip(); g.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - spr.height / 2) + 2); g.restore(); if (!u.alive) { g.globalAlpha = .5; g.fillStyle = '#9a90a8'; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); g.globalAlpha = 1; } }
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
  const w = rotuloWidth(s) + 20, x0 = (W - w) / 2 | 0; pstroke(x0, y + 6, x0 + w, y + 6, 13, ramp(col).sh, 1, 0, true); pstroke(x0 + 3, y + 5, x0 + w - 3, y + 5, 11, col, 1, 0, true);
  const light = rgbHsl(...hexRgb(col))[2] > .6; bigText(s, x0 + 10, y + 2, light ? INK : '#f4f0ea', { outline: light ? null : '#14121c' });
}
function hilite(x0, y, x1, w, col, a = .3) { // banda de pincelada translúcida (pstroke acumula alpha al solapar cuadrados)
  g.globalAlpha = a; g.fillStyle = col; const len = x1 - x0;
  for (let i = 0; i <= len; i++) { const t = i / len, ww = Math.max(1, Math.round(w * (0.55 + 0.45 * Math.sin(Math.PI * t)))); g.fillRect(x0 + i, Math.round(y - ww / 2), 1, ww); }
  g.globalAlpha = 1;
}
function smudgeIcon(x, y) { g.fillStyle = '#0b0912'; g.fillRect(x, y, 6, 3); g.fillRect(x + 1, y - 1, 4, 1); g.fillRect(x + 1, y + 3, 3, 1); g.fillStyle = '#7d7899'; g.fillRect(x + 1, y, 1, 1); }
// ---- GUI de batalla: página izquierda = comandos del que actúa, página derecha = fichas del grupo. Todo con el mismo papel:
// pegatinas, pinceladas que se deslizan, HP a lápiz que salta al recibir daño, MP como tubo de pintura, ATB como pincelada.
function tubeGauge(x, y, f, col, dry) { // tubo de pintura en miniatura: el cuerpo se vacía de derecha a izquierda
  const rp = ramp(col); g.fillStyle = '#6a6480'; g.fillRect(x, y + 1, 2, 4); g.fillStyle = '#2a2438'; g.fillRect(x + 2, y, 14, 6); g.fillStyle = '#e9e1cc'; g.fillRect(x + 3, y + 1, 12, 4);
  const n = Math.round(12 * clamp(f, 0, 1)); if (n) { g.fillStyle = dry ? '#9a90a8' : rp.base; g.fillRect(x + 15 - n, y + 1, n, 4); g.fillStyle = dry ? '#b8b0c0' : rp.hi; g.fillRect(x + 15 - n, y + 1, n, 1); }
  g.fillStyle = '#2a2438'; g.fillRect(x + 16, y + 1, 3, 4); g.fillStyle = dry ? '#9a90a8' : rp.sh; g.fillRect(x + 16, y + 2, 2, 2); if (f < .999 && !dry) { g.fillStyle = '#9a90a8'; g.fillRect(x + 4, y + 2, 1, 1); g.fillRect(x + 6, y + 3, 1, 1); } // pliegues del tubo vacío
}
// =====================================================================
// El estuche: a la izquierda, la ficha de la gota en una hoja de cuaderno (pestañas de las tres, retrato sobre una acuarela de su
// color, pintura y trazos que miden sus números); a la derecha, el estuche de tela abierto con las herramientas en sus gomas y
// los accesorios en sus bolsillos, cada uno con la pegatina de quien lo lleva. Todo se ve a la vez: el cursor previsualiza
// el cambio (+ATK, −SPD) y sólo se equipa al confirmar; entonces la herramienta vuela del estuche al retrato.
// ←→/↑↓ gota · Z equipar · ↑↓ herramientas/bolsillos · ←→ elegir · Z ponérselo · X vuelve/cierra
// =====================================================================
const ACC_LIST = Object.keys(DATA.accessories), WPN_LIST = Object.keys(DATA.weapons);
const easeBack = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
const MENU_SLOTS = { wx: i => 186 + i * 35, wy: 30, ax: i => 170 + i * 28, ay: 110 };
function openMenu() { ARTUI.tracks.delete('equipment'); OW.menu = { idx: 0, level: 'chars', row: 0, cur: [0, 0], t: 0, hopAt: 0, fly: null, stats: null, delta: null }; Audio.sfx('book_open'); Audio.sfx('scratch_long', { when: .08, vol: .4 }); }
function menuStats(p) { return effStats(p); }
function menuWeapons() { return WPN_LIST; }
function menuAvailable(key) { return !DATA.weapons[key].found || !!Game.owned[key]; }
function menuList(row) { return row === 0 ? WPN_LIST : ACC_LIST; }
function menuCurrent(p, row) { return menuList(row).indexOf(row === 0 ? p.weapon : p.acc); }
function menuPreview(p, row, key) { const before = effStats(p), after = effStats({ ...p, [row === 0 ? 'weapon' : 'acc']: key }); return { atk: after.atk - before.atk, def: after.def - before.def, spd: after.spd - before.spd, hp: after.hp - before.hp, mp: after.mp - before.mp }; }
function menuSelectChar(m, i) { if (m.idx === i) return; m.idx = i; m.hopAt = m.t; m.stats = null; m.delta = null; m.swapped = null; Audio.sfx('cursor', { semi: SEMI[Party[i].id] || 0 }); Audio.sfx('page', { vol: .4 }); }
function menuEnter(m, row) { const p = Party[m.idx]; m.level = 'equip'; m.row = row; m.cur[row] = Math.max(0, menuCurrent(p, row)); Audio.sfx('page'); }
function updateMenu() {
  const m = OW.menu; if (m.closing) { if (m.t - m.closeT > 12) OW.menu = null; return; }
  if (m.t < 8) return; // evita que la pulsación de apertura cambie nada
  const p = Party[m.idx], note = () => Audio.sfx('cursor', { semi: SEMI[p.id] || 0 });
  if (m.level === 'chars') {
    const step = hit('down') || hit('right') ? 1 : hit('up') || hit('left') ? -1 : 0; if (step) menuSelectChar(m, (m.idx + step + 3) % 3);
    if (hit('ok')) menuEnter(m, 0);
    if (hit('back')) { m.closing = true; m.closeT = m.t; Audio.sfx('book_close'); }
    return;
  }
  if (hit('down') || hit('up')) { m.row = 1 - m.row; m.cur[m.row] = Math.max(0, menuCurrent(p, m.row)); note(); }
  if (hit('back')) { m.level = 'chars'; Audio.sfx('cancel'); return; }
  const dir = hit('right') ? 1 : hit('left') ? -1 : 0, L = menuList(m.row);
  if (dir) { let i = m.cur[m.row]; for (let n = 0; n < L.length; n++) { i = (i + dir + L.length) % L.length; if (m.row === 1 || menuAvailable(L[i])) break; } m.cur[m.row] = i; m.movedAt = m.t; note(); }
  if (hit('ok')) menuEquip(m, m.row, L[m.cur[m.row]]);
}
// Ponerse algo: si otra gota lleva esa herramienta, se la cambias; la pieza vuela del estuche al retrato.
function menuEquip(m, row, key) {
  const p = Party[m.idx], before = effStats(p);
  if (row === 0 && !menuAvailable(key)) { Audio.sfx('nope'); return false; }
  if ((row === 0 ? p.weapon : p.acc) === key) { Audio.sfx('nope', { vol: .3 }); m.bumpAt = m.t; return false; }
  const i = menuList(row).indexOf(key);
  if (row === 0) { const other = Party.find(q => q !== p && q.weapon === key); if (other) other.weapon = p.weapon; m.swapped = other ? other.name : null; p.weapon = key; }
  else { p.acc = key; m.swapped = null; }
  const after = effStats(p); p.cur.hp = clamp(p.cur.hp + after.hp - before.hp, 1, after.hp); p.cur.mp = clamp(p.cur.mp + after.mp - before.mp, 0, after.mp);
  m.stats = before; m.delta = { atk: after.atk - before.atk, def: after.def - before.def, spd: after.spd - before.spd, hp: after.hp - before.hp, mp: after.mp - before.mp }; m.changedAt = m.t; m.changedWall = ARTUI.t;
  m.fly = { row, key, at: m.t, from: row === 0 ? [MENU_SLOTS.wx(i), MENU_SLOTS.wy + 12] : [MENU_SLOTS.ax(i) + 12, MENU_SLOTS.ay + 12] };
  Audio.sfx('fwip'); Audio.sfx('equip', { when: .12 }); Audio.sfx('plop', { when: .3, semi: SEMI[p.id] || 0 });
  return true;
}
// Compatibilidad: cambia al siguiente/anterior de la fila (lo usan los atajos y las pruebas).
function changeEquipment(m, dir) {
  const p = Party[m.idx], L = menuList(m.row); let i = menuCurrent(p, m.row);
  for (let n = 0; n < L.length; n++) { i = (i + dir + L.length) % L.length; if (m.row === 1 || menuAvailable(L[i])) break; }
  m.cur[m.row] = i; menuEquip(m, m.row, L[i]);
}
function menuIn(m, duration = 16, delay = 0) {
  if (!Prefs.shake) return 1;
  const open = Math.max(0, easeBack(clamp((m.t - delay) / (duration * UI_TEMPO), 0, 1)));
  return m.closing ? easeBack(clamp(1 - (m.t - m.closeT) / 12, 0, 1)) * open : open;
}
// Iconos de los bolsillos, dibujados a mano en 16×16.
function menuAccIcon(kind, x, y, col, dim) {
  const F = (c, a, b, w = 1, h = 1) => { g.fillStyle = dim ? '#9a8f83' : c; g.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
  if (kind === 'paleta') { F('#241e32', 2, 4, 12, 9); F('#c9955a', 3, 5, 10, 7); F('#dcae72', 3, 5, 10, 1); F('#241e32', 10, 9, 2, 2); F(C('rojo'), 4, 6, 2, 2); F(C('amarillo'), 7, 6, 2, 2); F(C('azul'), 5, 9, 2, 2); }
  else if (kind === 'goma') { F('#241e32', 1, 5, 14, 8); F('#f0b8b5', 2, 6, 7, 6); F('#fff0f0', 2, 6, 7, 1); F('#6fa6d8', 9, 6, 5, 6); F('#a8c8e8', 9, 6, 5, 1); }
  else if (kind === 'sacapuntas') { F('#241e32', 3, 4, 10, 9); F('#c9c4d4', 4, 5, 8, 7); F('#f0eef6', 4, 5, 8, 1); F('#241e32', 6, 7, 4, 3); F('#8c8ab0', 11, 5, 1, 7); F('#e8cf9a', 7, 8, 2, 1); }
  else if (kind === 'lienzo') { F('#6b4424', 3, 2, 10, 12); F('#f4f0ea', 4, 3, 8, 10); F(col, 5, 6, 4, 3); F(ramp(col).hi, 5, 6, 4, 1); F('#6b4424', 2, 13, 2, 2); F('#6b4424', 12, 13, 2, 2); }
  else { F('#241e32', 6, 1, 4, 14); F('#e8e0d0', 7, 2, 2, 12); F('#6a6480', 7, 2, 2, 3); F('#b8b0a0', 8, 5, 1, 8); }
}
function drawMenu() {
  const m = OW.menu; m.t++;
  UI_HITS.length = 0; UI_TEXT.length = 0;
  const p = Party[m.idx], col = C(p.color), rp = ramp(col), s = effStats(p), shake = Prefs.shake;
  const dim = shake ? clamp(m.closing ? 1 - (m.t - m.closeT) / 12 : m.t / 10, 0, 1) : 1;
  g.fillStyle = 'rgba(20,15,28,' + (.55 * dim).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
  // ---- la hoja de la ficha entra desde la izquierda
  g.save(); g.translate(Math.round((1 - menuIn(m, 16)) * -160), 0);
  artSheet(6, 10, 146, 164, col);
  // pestañas de las tres gotas, cosidas al borde de la hoja; la elegida sube y lleva una cinta de su color
  [...Party.keys()].sort((a, b) => (a === m.idx) - (b === m.idx)).forEach(i => { const q = Party[i]; // la elegida, encima de las otras
    const x = 11 + i * 46, sel = i === m.idx, qc = C(q.color), up = sel ? 3 : 0, qs = effStats(q);
    g.save(); g.translate(0, Math.round((1 - menuIn(m, 12, 4 + i * 3)) * -24));
    maskingLabel(x, 13 - up, 44, 17, sel ? '#fff3d2' : '#dcd1bb'); if (sel) brushBand(x + 3, 27 - up, 38, 3, qc);
    sticker(x + 7, 21 - up, { ...q, alive: q.cur.hp > 0, hp: q.cur.hp, maxhp: qs.hp, mp: q.cur.mp, maxmp: qs.mp }, 5);
    if (sel) smallText(q.name, x + 13, 17 - up, UI_INK); else { g.fillStyle = '#cfc1a9'; g.fillRect(x + 18, 19, 20, 2); g.fillStyle = qc; g.fillRect(x + 18, 19, Math.round(20 * q.cur.hp / qs.hp), 2); g.fillStyle = '#6fa6d8'; g.fillRect(x + 18, 23, Math.round(20 * q.cur.mp / qs.mp), 1); } // las otras: su pintura de un vistazo
    g.restore();
    uiHit(x, 10, 42, 22, () => { menuSelectChar(m, i); }, () => { if (m.level === 'chars') menuSelectChar(m, i); });
  });
  // retrato: una acuarela de su color que respira y la gota encima; salta al elegirla y al equiparse
  const hop = shake ? Math.max(0, Math.sin(clamp((m.t - m.hopAt) / 16, 0, 1) * Math.PI)) : 0, got = shake && m.changedAt ? Math.max(0, 1 - (m.t - m.changedAt - 16) / 14) * ((m.t - m.changedAt) >= 16 ? 1 : 0) : 0;
  const breathe = shake ? Math.sin(m.t * .06) : 0, px = 44, py = 90;
  g.save(); g.globalAlpha *= .55; g.fillStyle = rp.hi; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.283, r = 27 + Math.sin(a * 5 + p.id.length) * 2 + breathe; const X = px + Math.cos(a) * r, Y = 62 + Math.sin(a) * r * .9; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } g.fill(); g.restore();
  g.save(); g.globalAlpha *= .35; g.fillStyle = col; g.beginPath(); g.ellipse(px + 4, 70, 19, 16, .3, 0, 6.29); g.fill(); g.restore();
  paintRing(px, 62, clamp((m.t - m.hopAt) / 18, 0, 1), col, 34);
  shadow(px, py, 22 - Math.round(hop * 6));
  const spr = buildSprite(p.id + '_title', col, null, { eyes: p.cur.hp <= 0 ? 'ko' : got > .3 || hop > .3 ? 'happy' : ((m.t + m.idx * 40) % 170) < 6 ? 'blink' : 'normal' });
  const sq = hop > 0 ? [1 - hop * .12, 1 + hop * .14] : got > 0 ? [1 + got * .16, 1 - got * .14] : [1 + breathe * .015, 1 - breathe * .015];
  const ps = Math.min(1.5, 46 / spr.height); drawSprite(spr, px, py - Math.round(hop * 10), ps * sq[0], false, ps * sq[1]);
  // nombre y rol, escritos al elegir la gota
  bigText(p.name, 80, 36, col, { progress: shake ? (m.t - m.hopAt) * 1.2 + 1 : null, outline: '#2a2438' }); smallText(p.role, 80, 49, UI_MUTED);
  // pintura (HP) y pigmento (MP)
  smallText('HP', 80, 61, UI_MUTED); textRight(p.cur.hp + '/' + s.hp, 146, 61, p.cur.hp < s.hp * .3 ? '#a12f42' : UI_INK); kitBar(80, 70, 66, p.cur.hp / s.hp, col);
  smallText('MP', 80, 76, UI_MUTED); textRight(p.cur.mp + '/' + s.mp, 146, 76); tubeGauge(80, 85, p.cur.mp / s.mp, col, !p.cur.mp); kitBar(102, 86, 44, p.cur.mp / s.mp, '#6fa6d8');
  // los números como trazos de pincel: el largo es el valor; al cambiar, queda la sombra del anterior y el trazo crece o mengua
  const L = m.level === 'equip' ? menuList(m.row)[m.cur[m.row]] : null, preview = L && (m.row === 1 || menuAvailable(L)) ? menuPreview(p, m.row, L) : null;
  const grow = m.stats ? clamp((m.t - m.changedAt - 14) / 18, 0, 1) : 1;
  [['ATK', 'atk'], ['DEF', 'def'], ['SPD', 'spd']].forEach(([label, k], i) => {
    const y = 102 + i * 13, now = s[k], was = m.stats ? m.stats[k] : now, shown = lerp(was, now, 1 - (1 - grow) ** 3), len = v => Math.round(clamp(v / 28, 0, 1) * 80), intro = menuIn(m, 14, 8 + i * 3);
    smallText(label, 14, y, UI_MUTED);
    g.fillStyle = '#e2d6bd'; g.fillRect(40, y + 2, 80, 5);
    if (m.stats && grow < 1 && was !== now) { g.globalAlpha *= .45; brushBand(40, y + 1, len(was), 7, rp.hi); g.globalAlpha /= .45; }
    brushBand(40, y + 1, Math.max(3, Math.round(len(shown) * intro)), 7, col); g.fillStyle = rp.hi; g.fillRect(42, y + 2, Math.max(0, Math.round(len(shown) * intro) - 4), 1);
    const d = preview ? preview[k] : 0; // lo que cambiaría con la pieza bajo el cursor
    if (d) { const x0 = 40 + len(now), x1 = 40 + len(now + d); g.save(); g.globalAlpha *= .75; if (d > 0) brushBand(x0 - 1, y + 1, Math.max(2, x1 - x0 + 1), 7, '#8fc07a'); else { g.fillStyle = '#e2a0a0'; g.fillRect(x1, y + 2, x0 - x1, 5); } g.restore(); }
    textRight(Math.round(shown), 132, y, UI_INK);
    if (d) smallText((d > 0 ? '+' : '') + d, 135, y, d > 0 ? '#34733e' : '#a83e3e');
    else if (m.delta && m.delta[k] && ARTUI.t - m.changedWall < 80) { const q = (ARTUI.t - m.changedWall) / 80; g.save(); g.globalAlpha *= 1 - q; smallText((m.delta[k] > 0 ? '+' : '') + m.delta[k], 135, y - Math.round(q * 6), m.delta[k] > 0 ? '#34733e' : '#a83e3e'); g.restore(); }
  });
  // su habilidad de rol
  const role = { carmin: ['Proteger', 'Cubre el próximo golpe a un aliado: recibe la mitad.'], ambar: ['Interrumpir', 'Golpe ligero (2 MP) que corta una carga anunciada.'], anil: ['Preparar', 'Deja una capa azul (2 MP) para la siguiente mezcla.'] }[p.id];
  maskingLabel(11, 139, 136, 32, '#f7efd6'); paintDab(18, 145, 3, col); smallText(role[0], 24, 142, UI_INK); paragraph(role[1], 16, 152, 128, UI_MUTED, 2);
  g.restore();
  // ---- el estuche de tela, abierto: entra desde la derecha y abre su cremallera
  g.save(); g.translate(Math.round((1 - menuIn(m, 16, 2)) * 170), 0);
  brushBand(158, 10, 156, 164, '#3a2a1c'); brushBand(159, 9, 154, 162, '#8a6440'); brushBand(163, 13, 146, 154, '#a37a4c');
  g.fillStyle = '#d8b882'; for (let x = 166; x < 306; x += 5) { g.fillRect(x, 13, 2, 1); g.fillRect(x, 165, 2, 1); } for (let y = 16; y < 164; y += 5) { g.fillRect(163, y, 1, 2); g.fillRect(308, y, 1, 2); }
  const zip = shake ? clamp(m.closing ? 1 - (m.t - m.closeT) / 10 : (m.t - 6) / 20, 0, 1) : 1; // la cremallera se abre de izquierda a derecha
  for (let x = 162; x < 312; x += 2) { const open = (x - 162) / 150 < zip; g.fillStyle = (x / 2) % 2 ? '#c9c4d4' : '#6a6480'; g.fillRect(x, open ? 8 : 9, 2, open ? 1 : 2); }
  { const zx = 162 + zip * 148; g.fillStyle = '#241e32'; g.fillRect(zx - 2, 5, 6, 8); g.fillStyle = '#e8c070'; g.fillRect(zx - 1, 6, 4, 6); g.fillStyle = '#fff3c0'; g.fillRect(zx - 1, 6, 1, 4); }
  artButton('equip-close', battleKey('back') + (m.level === 'equip' ? ' volver' : ' cerrar'), 252, 16, 56, 12, '#d6c29c', () => { pressed.back = true; });
  smallText('Herramientas', 168, 18, m.level === 'equip' && m.row === 0 ? '#fff3d2' : '#e8d5b0');
  // herramientas en sus gomas: de pie, con la punta arriba; la pegatina dice quién la lleva
  g.fillStyle = '#e8dcc0'; g.fillRect(166, 56, 140, 5); g.fillStyle = '#c9b88f'; g.fillRect(166, 60, 140, 1);
  WPN_LIST.forEach((key, i) => {
    const x = MENU_SLOTS.wx(i), have = menuAvailable(key), holder = Party.find(q => q.weapon === key), mine = holder === p, sel = m.level === 'equip' && m.row === 0 && m.cur[0] === i;
    const pop = shake ? Math.max(0, easeBack(clamp((m.t - 10 - i * 4) / 12, 0, 1))) : 1, flying = m.fly && m.fly.row === 0 && m.fly.key === key && m.t - m.fly.at < 16;
    if (sel) { g.save(); g.globalAlpha *= .35; brushBand(x - 14, 28, 28, 58, col); g.restore(); dropCursor(x - 4, 22 - (shake ? Math.round(Math.abs(Math.sin(m.t * .15)) * 2) : 0), col); }
    if (!have) { g.strokeStyle = '#6b4a33'; g.setLineDash([2, 2]); g.strokeRect(x - 6.5, 34.5, 13, 40); g.setLineDash([]); smallText('?', x - 2, 48, '#e8d5b0'); }
    else if (!flying) { const lift = (mine ? 6 : 0) + (sel && shake ? Math.round(Math.sin(m.t * .2) * 1.5) : 0), wig = sel && shake ? Math.sin(m.t * .3) * .06 : 0, pc = holder ? C(holder.color) : '#b8ad96';
      const img = propSprite(key, pc), sc = .8, ox = (img.height / 2 - PROP[key].tip[1]) * sc; // centrada en su goma aunque la punta no esté en medio del dibujo
      g.save(); g.globalAlpha *= mine ? 1 : .85; drawProp(img, x - ox, 30 - lift + (1 - pop) * 30, -1.57 + wig, 1, PROP[key].tip[0], PROP[key].tip[1], sc); g.restore(); }
    g.fillStyle = '#d9c9a0'; g.fillRect(x - 7, 55, 14, 7); g.fillStyle = '#b8a37a'; g.fillRect(x - 7, 61, 14, 1); // su goma elástica, por encima
    if (holder && have) { const qs = effStats(holder); sticker(x, 80, { ...holder, alive: holder.cur.hp > 0, hp: holder.cur.hp, maxhp: qs.hp, mp: holder.cur.mp, maxmp: qs.mp }, 5); }
    textCenter(DATA.weapons[key].name, x, 89, sel ? '#fff3d2' : have ? '#e8d5b0' : '#b8a37a');
    uiHit(x - 16, 26, 32, 70, () => { if (m.level !== 'equip' || m.row !== 0) menuEnter(m, 0); m.cur[0] = i; menuEquip(m, 0, key); }, () => { if (have && (m.level !== 'equip' || m.row !== 0 || m.cur[0] !== i)) { m.level = 'equip'; m.row = 0; m.cur[0] = i; Audio.sfx('cursor', { vol: .3 }); } });
  });
  // bolsillos de los accesorios
  smallText('Bolsillos', 168, 100, m.level === 'equip' && m.row === 1 ? '#fff3d2' : '#e8d5b0');
  ACC_LIST.forEach((key, i) => {
    const x = MENU_SLOTS.ax(i), y = MENU_SLOTS.ay, mine = p.acc === key, sel = m.level === 'equip' && m.row === 1 && m.cur[1] === i, pop = shake ? Math.max(0, easeBack(clamp((m.t - 18 - i * 3) / 12, 0, 1))) : 1;
    const lift = sel ? 3 + (shake ? Math.round(Math.sin(m.t * .2)) : 0) : 0;
    g.fillStyle = '#5a3e26'; g.fillRect(x, y + 3, 25, 22); g.fillStyle = mine ? '#c9a06a' : '#b08a58'; g.fillRect(x + 1, y + 2, 23, 21); g.fillStyle = '#d8b882'; for (let k = 0; k < 23; k += 3) g.fillRect(x + 1 + k, y + 3, 2, 1);
    if (sel) { g.save(); g.globalAlpha *= .4; g.fillStyle = col; g.fillRect(x + 1, y + 2, 23, 21); g.restore(); dropCursor(x + 7, y - 12 - lift, col); }
    if (!(m.fly && m.fly.row === 1 && m.fly.key === key && m.t - m.fly.at < 16)) menuAccIcon(key, x + 4.5, y + 3 - lift - (1 - pop) * 14, col);
    const holders = Party.filter(q => q.acc === key); holders.forEach((q, n) => paintDab(x + 5 + n * 6, y + 26, 2.5, C(q.color)));
    uiHit(x - 1, y - 2, 27, 32, () => { if (m.level !== 'equip' || m.row !== 1) menuEnter(m, 1); m.cur[1] = i; menuEquip(m, 1, key); }, () => { if (m.level !== 'equip' || m.row !== 1 || m.cur[1] !== i) { m.level = 'equip'; m.row = 1; m.cur[1] = i; Audio.sfx('cursor', { vol: .3 }); } });
  });
  // la ficha de la pieza bajo el cursor (o, sin cursor, lo que lleva puesto): nombre, qué hace y qué cambiaría
  const row = m.level === 'equip' ? m.row : 0, key = m.level === 'equip' ? menuList(row)[m.cur[row]] : p.weapon, item = row === 0 ? DATA.weapons[key] : DATA.accessories[key];
  const worn = (row === 0 ? p.weapon : p.acc) === key, have = row === 1 || menuAvailable(key), info = have ? item.desc : 'Aún no la tienes: está guardada en algún estuche del mapa.';
  maskingLabel(166, 140, 142, 30, '#f7efd6');
  smallText(have ? item.name : '???', 172, 144, UI_INK); smallText(worn ? 'puesto' : m.level === 'equip' && have ? battleKey('ok') + ' ponérselo' : '', 302 - textWidth(worn ? 'puesto' : battleKey('ok') + ' ponérselo'), 144, worn ? '#34733e' : UI_MUTED);
  const noteAt = artObserve('equipment-note', key + ':' + row); paragraph(info, 172, 154, 132, UI_MUTED, 2, { progress: shake ? (ARTUI.t - noteAt) * 2.2 : Infinity, wet: col });
  g.restore();
  // la pieza recién elegida vuela del estuche al retrato y salpica al llegar
  if (m.fly && m.t - m.fly.at < 16) { const q = (m.t - m.fly.at) / 16, e = q * q * (3 - 2 * q), x = lerp(m.fly.from[0], 44, e), y = lerp(m.fly.from[1], 66, e) - Math.sin(q * Math.PI) * 30;
    for (let k = 1; k <= 3; k++) { const q2 = Math.max(0, q - k * .06), e2 = q2 * q2 * (3 - 2 * q2); g.fillStyle = rp.hi; g.globalAlpha = .5 - k * .12; g.fillRect(Math.round(lerp(m.fly.from[0], 44, e2)), Math.round(lerp(m.fly.from[1], 66, e2) - Math.sin(q2 * Math.PI) * 30), 3, 3); } g.globalAlpha = 1;
    if (m.fly.row === 0) drawProp(propSprite(m.fly.key, col), x, y, -1.57 + q * 6.28, 1, PROP[m.fly.key].tip[0], PROP[m.fly.key].tip[1], .8); else menuAccIcon(m.fly.key, x - 8, y - 8, col); }
  if (m.fly && m.t - m.fly.at === 16) artBurst(44, 66, col);
  if (m.fly && m.t - m.fly.at >= 16 && m.t - m.fly.at < 34) paintRing(44, 66, (m.t - m.fly.at - 16) / 18, col, 30);
  if (m.swapped && m.changedAt && m.t - m.changedAt < 90) { const q = (m.t - m.changedAt) / 90, label = 'Cambio con ' + m.swapped, w = textWidth(label) + 16; g.save(); g.globalAlpha *= Math.min(1, (1 - q) * 3); maskingLabel(Math.round(44 - w / 2), 84, w, 13, '#fff3d2'); smallText(label, Math.round(44 - w / 2 + 8), 87, UI_INK); g.restore(); }
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

// =====================================================================
// Diálogo: página abajo con retrato en pegatina, nombre en su color y texto a máquina de escribir. Z completa/avanza.
// =====================================================================
const SPEAKERS = { tinta: { name: 'La Tinta', col: '#8c8ab0', spr: () => buildSprite('tinta', C('negro'), null, { eyes: 'normal' }), sc: 1 }, carmin: { name: 'Carmín', col: 'rojo', spr: () => buildSprite('carmin_title', C('rojo'), null, {}), sc: 1 }, ambar: { name: 'Ámbar', col: 'amarillo', spr: () => buildSprite('ambar_title', C('amarillo'), null, {}), sc: .9 }, anil: { name: 'Añil', col: 'azul', spr: () => buildSprite('anil_title', C('azul'), null, {}), sc: .9 } };
// Retratos del diálogo. Las gotas: su dibujo grande sobre una mancha de acuarela de su color, con la cara y los detalles de su
// emoción. La Tinta: un borrón vivo que respira, con ojos y boca que cambian según lo que dice.
const MOOD_EYES = { determined: 'angry', calm: 'normal', happy: 'happy', worried: 'worried', surprised: 'wide' };
function drawPortrait(who, mood, x, y, t, talk, at) {
  const shake = Prefs.shake, heroes = ['carmin', 'ambar', 'anil'];
  if (who === 'tinta') {
    const angry = mood === 'angry', jit = angry && shake ? Math.round(Math.sin(t * 1.3) * 1.5) : 0, R = 19 + (shake ? Math.sin(t * .08) * 1.2 : 0) + (mood === 'menace' ? 2 : 0);
    g.save(); g.globalAlpha = .55; g.fillStyle = angry ? '#8a2a3a' : mood === 'menace' ? '#5a2a6a' : '#3a3652'; g.beginPath(); g.ellipse(x, y + 2, 27, 23, 0, 0, 6.29); g.fill(); g.restore();
    inkBlob(x + jit, y, R, t * (angry ? 3 : 1), 7);
    const ex = x + jit, ey = y - 4, glow = mood === 'menace' || angry, eye = glow ? '#ff5a6a' : '#efe4bf';
    const E = (cx, lid, slant) => { if (mood === 'smug') { g.fillStyle = eye; g.fillRect(cx - 3, ey, 7, 2); g.fillRect(cx - 2, ey - 1, 5, 1); return; } // ojos entornados
      if (mood === 'cold') { g.fillStyle = eye; g.fillRect(cx - 3, ey, 7, 2); g.fillStyle = '#0b0912'; g.fillRect(cx, ey, 2, 2); return; } // rendijas
      g.fillStyle = eye; g.fillRect(cx - 3, ey - 3, 7, 6); g.fillStyle = glow ? '#fff0f0' : '#0b0912'; g.fillRect(cx - 1 + (glow ? 0 : 1), ey - 1, 2, 2); // ojos abiertos
      g.fillStyle = '#0b0912'; for (let i = 0; i < 7; i++) g.fillRect(cx - 3 + i, ey - 4 - Math.round(i * slant), 1, 2); };
    E(ex - 7, 0, angry ? -.4 : mood === 'menace' ? -.2 : 0); E(ex + 7, 0, angry ? .4 : mood === 'menace' ? .2 : 0);
    const my = y + 7; g.fillStyle = '#efe4bf';
    if (mood === 'smug') { for (let i = -6; i <= 7; i++) g.fillRect(ex + i, my + 1 - Math.round(Math.max(0, i) * Math.max(0, i) / 12), 1, 1); g.fillRect(ex + 7, my - 4, 1, 1); } // sonrisa torcida, sube por un lado
    else if (mood === 'menace') { g.fillStyle = '#0b0912'; g.fillRect(ex - 8, my - 1, 17, 5); g.fillStyle = '#efe4bf'; for (let i = -7; i <= 7; i += 3) { g.fillRect(ex + i, my - 1, 2, 2); g.fillRect(ex + i + 1, my + 2, 2, 2); } } // dientes
    else if (angry) { g.fillStyle = '#6a1a2a'; g.fillRect(ex - 6, my, 13, 4); g.fillStyle = '#efe4bf'; for (let i = -6; i <= 6; i += 2) g.fillRect(ex + i, my + (i % 4 ? 0 : 3), 1, 1); }
    else g.fillRect(ex - 3, my + 1, 7, 1);
    if (glow && shake) for (let i = 0; i < 4; i++) { const ph = ((t + i * 9) % 30) / 30; g.fillStyle = '#0b0912'; g.fillRect(Math.round(x - 18 + i * 12), Math.round(y + 16 + ph * 10), 2, 3); } // goterones
    return;
  }
  const sp = SPEAKERS[who]; if (!heroes.includes(who)) { drawSprite(sp.spr(), x, y + 14, sp.sc); return; }
  const p = Party.find(q => q.id === who) || DATA.party.find(q => q.id === who), col = C(p.color), rp = ramp(col);
  // mancha de acuarela detrás, que respira
  g.save(); for (let k = 0; k < 3; k++) { g.globalAlpha = [.5, .35, .7][k]; g.fillStyle = [rp.hi, col, rp.base][k]; g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * 6.283, rr = (22 - k * 5) * (1 + .09 * Math.sin(a * 5 + k * 2 + t * .03)); const X = x + Math.cos(a) * rr + (k - 1) * 2, Y = y + Math.sin(a) * rr * .9; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } g.fill(); } g.restore();
  const eyes = talk > .5 && ((t >> 3) & 1) === 0 && mood === 'calm' ? 'blink' : MOOD_EYES[mood] || 'normal', spr = buildSprite(who + '_title', col, null, { eyes });
  const bob = Math.round(Math.max(0, talk) * 1.5), sc = Math.min(1.2, 34 / spr.height), shk = mood === 'determined' && shake ? Math.round(Math.sin(t * .9) * .6) : 0;
  drawSprite(spr, x + shk, y + 19 - bob - Math.round(artPop(at) * 3), sc * (1 + talk * .02), false, sc * (1 - talk * .03));
  // detalles de la emoción
  if (mood === 'worried') { const dy = shake ? (t % 40) / 40 * 4 : 0; g.fillStyle = '#8ec8e8'; g.fillRect(x + 12, y - 12 + dy, 2, 3); g.fillRect(x + 11, y - 10 + dy, 4, 3); g.fillStyle = '#e8f6fb'; g.fillRect(x + 12, y - 10 + dy, 1, 1); } // gota de sudor
  if (mood === 'determined') for (let i = 0; i < 3; i++) pstroke(x + 14 + i * 3, y - 16 + i, x + 18 + i * 3, y - 20 + i, 1, rp.hi, 1, 0, false); // trazos de energía
  if (mood === 'happy' || mood === 'calm') for (let i = 0; i < 3; i++) { const a = t * .05 + i * 2.1, sx = Math.round(x + Math.cos(a) * 20), sy = Math.round(y - 8 + Math.sin(a) * 8); g.fillStyle = '#fff8e6'; if (mood === 'happy' || i === 0) { g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); } }
}
// La hoja del diálogo: las gotas hablan sobre una página de cuaderno pautada con el margen de su color; la Tinta, sobre una hoja
// empapada de tinta con letra clara. El retrato va pegado con cinta en su tarjeta al lado.
function drawDialogue(dlg) {
  UI_HITS.length=0; UI_TEXT.length=0;
  const line=DATA.bossDialogue[Math.min(dlg.i,DATA.bossDialogue.length-1)],sp=SPEAKERS[line.who],ink=line.who==='tinta'||!['carmin','ambar','anil'].includes(line.who);
  const col=sp.col.startsWith('#')?sp.col:C(sp.col),left=['carmin','ambar','anil'].includes(line.who),mood=line.mood||'calm';
  const lines=wrapSmall(line.text,214),h=Math.max(46,lines.length*10+26),y=H-h-5;
  const at=artObserve('dialogue',dlg.i),ready=dlg.ch>=line.text.length,talk=!ready&&Prefs.shake?Math.sin(ARTUI.t*.55):0;
  const sx=left?74:8,sw=238,px2=left?38:282,rise=Math.round((1-artIn(at,18))*(h+30)),sway=Prefs.shake?Math.sin(ARTUI.t*.05)*.02:0;
  g.save();g.translate(0,rise);
  // la hoja
  if(ink){brushBand(sx+1,y+2,sw,h,'#0b0912');brushBand(sx,y,sw,h,'#1e1a2c');g.fillStyle='#2a2438';for(let i=0;i<sw;i+=7)g.fillRect(sx+4+i,y+3+((i*3)%5),3,1);g.fillStyle='#3a3652';for(let r=0;r<3;r++)g.fillRect(sx+8,y+17+r*10,sw-16,1);}
  else{artSheet(sx,y,sw,h,col);g.fillStyle='#c3d3e4';for(let r=0;r<3;r++)g.fillRect(sx+6,y+16+r*10,sw-12,1);g.fillStyle=col;g.fillRect(sx+13,y+3,1,h-6);}
  // el nombre, a brocha, en su color
  const nw=rotuloWidth(sp.name)+20,nx=left?sx+6:sx+sw-nw-6;brushBand(nx+1,y-12,nw,15,'#0b0912');brushBand(nx,y-13,nw,15,ink?'#2a2438':KIT_INK);bigText(sp.name,nx+10,y-10,ink?'#dbbae8':col,{outline:'#0b0912'});
  writtenLines(lines,sx+18,y+8,ink?'#e8e0f0':UI_INK,dlg.ch,{wet:ink?'#8c8ab0':col,nib:!!Prefs.shake});
  const key=battleKey('ok')+(ready?' seguir':' completar'),kx=sx+sw-8;textRight(key,kx,y+h-11,ink?'#9a98b0':UI_MUTED);if(ready)dropCursor(kx-textWidth(key)-11,y+h-12,ink?'#dbbae8':col);
  // la tarjeta del retrato, con cinta
  g.save();g.translate(px2,y+h/2-4);g.rotate((left?-.05:.05)+sway);maskingLabel(-30,-28,60,54,ink?'#2a2438':'#f7efd6');g.restore();
  g.fillStyle='rgba(233,220,181,.85)';g.fillRect(px2-8,y+h/2-34,16,6);
  drawPortrait(line.who,mood,px2,y+h/2-6,ARTUI.t,talk,at);
  g.restore();
  uiHit(0,y-16,W,h+21,()=>pressed.ok=true);
}
