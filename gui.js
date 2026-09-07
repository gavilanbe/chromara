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
// Estuche de equipo: marcapáginas, ficha del personaje y dos bolsillos de tela.
// ↑↓ personaje · Z entra en el equipo · ↑↓ arma/accesorio · ◄► cambia (la herramienta entra de golpe y salpica) · X vuelve/cierra
// =====================================================================
const ACC_LIST = Object.keys(DATA.accessories), WPN_LIST = Object.keys(DATA.weapons);
const easeBack = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
function openMenu() { ARTUI.tracks.delete('equipment'); OW.menu = { idx: 0, level: 'chars', row: 0, t: 0, hl: 30, pop: 0, swing: 0, spl: [], delta: null, flip: 99 }; Audio.sfx('book_open'); }
function menuStats(p) { return effStats(p); }
function updateMenu() {
  const m = OW.menu; if (m.closing) { if (m.t - m.closeT > 10) OW.menu = null; return; }
  if (m.t < 8) return; // evita que la pulsación de apertura cambie equipo
  const p = Party[m.idx], note = () => Audio.sfx('cursor', { semi: SEMI[p.id] || 0 });
  if (m.level === 'chars') {
    if (hit('down')) { m.idx = (m.idx + 1) % 3; m.delta=null; m.swapped=null; m.pop = 1; m.flip = 0; note(); Audio.sfx('page', { vol: .5 }); } if (hit('up')) { m.idx = (m.idx + 2) % 3; m.delta=null; m.swapped=null; m.pop = 1; m.flip = 0; note(); Audio.sfx('page', { vol: .5 }); }
    if (hit('ok')) { m.level = 'equip'; m.row = 0; Audio.sfx('page'); }
    if (hit('back')) { m.closing = true; m.closeT = m.t; Audio.sfx('book_close'); }
    return;
  }
  if (hit('down') || hit('up')) { m.row = 1 - m.row; note(); }
  if (hit('back')) { m.level = 'chars'; Audio.sfx('cancel'); return; }
  const dir = hit('right') ? 1 : hit('left') ? -1 : 0;
  if (dir) changeEquipment(m, dir);
}
function changeEquipment(m, dir) {
  const p=Party[m.idx], before=effStats(p);
  if (m.row === 0) { const L = WPN_LIST.filter(k => !DATA.weapons[k].found || Game.owned[k]); const i = L.indexOf(p.weapon), nw = L[(i + dir + L.length) % L.length], other = Party.find(q => q !== p && q.weapon === nw); if (other) other.weapon = p.weapon; p.weapon = nw; m.swapped = other ? other.name : null; } // si otro la lleva, se la cambias; las armas encontradas entran en la rueda
  else { const i = ACC_LIST.indexOf(p.acc); p.acc = ACC_LIST[(i + dir + ACC_LIST.length) % ACC_LIST.length]; }
  const after = effStats(p); p.cur.hp = clamp(p.cur.hp + after.hp - before.hp, 1, after.hp); p.cur.mp = clamp(p.cur.mp + after.mp - before.mp, 0, after.mp);
  m.delta = { atk: after.atk - before.atk, def: after.def - before.def, spd: after.spd - before.spd, hp: after.hp - before.hp, mp: after.mp - before.mp, t: 0 };
  m.swing = 1; m.swingDir = dir; Audio.sfx('fwip'); Audio.sfx('equip', { when: .06 }); Audio.sfx('plop', { when: .14, semi: SEMI[p.id] || 0 });
  m.changedAt=ARTUI.t;
  artBurst(128, m.row ? 129 : 103, C(p.color));
}

// Opening: the bookmarks slide in from the spine, the sheet drops and the pockets rise.
// Closing runs the same choreography backwards during the ten frames before the case disappears.
function menuIn(m, duration = 16, delay = 0) {
  if (!Prefs.shake) return 1;
  const open = Math.max(0, easeBack(clamp((m.t - delay) / (duration * UI_TEMPO), 0, 1)));
  return m.closing ? easeBack(clamp(1 - (m.t - m.closeT) / 10, 0, 1)) * open : open;
}
function drawMenu() {
  const m=OW.menu; m.t++; m.flip++;
  UI_HITS.length=0; UI_TEXT.length=0;
  const p=Party[m.idx], col=C(p.color), s=effStats(p);
  const at=artObserve('equipment',p.id+':'+m.level+':'+m.row);
  g.fillStyle='rgba(20,15,28,'+(.48*(Prefs.shake?clamp(m.closing?1-(m.t-m.closeT)/10:m.t/10,0,1):1)).toFixed(2)+')';g.fillRect(0,0,W,H);
  // Three loose portrait bookmarks stay put while the tool roll changes owner.
  g.save();g.translate(Math.round((1-menuIn(m,16))*-110),0);
  brushBand(5,7,90,19,'#34283d');smallText('ESTUCHE',15,13,KIT_LIGHT);
  g.restore();
  Party.forEach((q,i)=>{
    const y=37+i*43,qs=effStats(q),qc=C(q.color),sel=i===m.idx;
    g.save();g.translate(Math.round((1-menuIn(m,16,3+i*4))*-110),0);
    maskingLabel(7,y,85,35,sel?'#fff3d2':'#dfd5c1');
    if(sel)brushBand(29,y+30,57,3,qc);
    const lift=sel?Math.round(artPop(at)*4):0;
    sticker(18,y+13-lift,{...q,alive:q.cur.hp>0,hp:q.cur.hp,maxhp:qs.hp,mp:q.cur.mp,maxmp:qs.mp},10);
    smallText(q.name,33,y+4,sel?UI_INK:UI_MUTED);
    smallText('HP',33,y+16,UI_MUTED);kitBar(48,y+18,34,q.cur.hp/qs.hp,qc);
    tubeGauge(34,y+25,q.cur.mp/qs.mp,qc,!q.cur.mp);
    textRight(q.cur.mp,82,y+25,UI_MUTED);
    g.restore();
    const focus=()=>{if(m.idx!==i){artFocus(m,i);m.delta=null;m.swapped=null;}};
    uiHit(5,y-2,89,40,()=>{focus();m.level='equip';m.row=0;Audio.sfx('page');},focus);
  });
  g.save();g.translate(Math.round((1-menuIn(m,16,14))*-110),0);
  artButton('equip-close',battleKey('back')+' cerrar',7,166,85,12,'#d6c29c',()=>{pressed.back=true;});
  g.restore();
  // The portrait is a clipped sketch; numeric stats are pencil annotations.
  g.save();g.translate(0,Math.round((1-menuIn(m,18,4))*-100));
  artSheet(104,12,208,74,col);
  g.fillStyle='#e2d5b9';g.beginPath();g.ellipse(131,49,23,24,-.1,0,6.29);g.fill();
  const spr=buildSprite(p.id+'_title',col,null,{eyes:p.cur.hp<=0?'ko':'normal'});
  drawSprite(spr,131,70-Math.round(artPop(at)*3),1.3,false,1.3);
  smallText(p.name,165,20);smallText(p.role,165,31,UI_MUTED);
  smallText('HP',165,44,UI_MUTED);smallText(p.cur.hp+'/'+s.hp,184,44);kitBar(251,47,49,p.cur.hp/s.hp,col);
  smallText('MP',165,55,UI_MUTED);smallText(p.cur.mp+'/'+s.mp,184,55);tubeGauge(269,56,p.cur.mp/s.mp,col,!p.cur.mp);
  const delta=m.delta&&ARTUI.t-(m.changedAt??-99)<95?m.delta:null;
  [['ATK',s.atk],['DEF',s.def],['SPD',s.spd]].forEach(([label,n],i)=>{
    const x=116+i*64;smallText(label,x,74,UI_MUTED);smallText(n,x+22,74);
    const d=delta?.[label.toLowerCase()];if(d)smallText((d>0?'+':'')+d,x+37,74,d>0?'#34733e':'#a83e3e');
  });
  g.restore();
  // Canvas tool pockets: stitched fabric, projecting tools and masking labels.
  g.save();g.translate(0,Math.round((1-menuIn(m,18,10))*100));
  brushBand(103,93,210,49,'#806947');brushBand(107,96,202,43,'#ac9062');
  g.fillStyle='#dec799';for(let x=109;x<306;x+=5){g.fillRect(x,96,2,1);g.fillRect(x,138,2,1);}
  const rows=[['ARMA',DATA.weapons[p.weapon]],['ACCESORIO',DATA.accessories[p.acc]]];
  rows.forEach(([label,item],r)=>{
    const y=97+r*23,sel=m.level==='equip'&&m.row===r;
    maskingLabel(143,y,119,19,sel?'#fff2ce':'#e0d1ad');
    smallText(label,150,y+2,UI_MUTED);smallText(item.name,150,y+11);
    const move=sel?Math.round(artPop(m.changedAt??-99)*9):0;
    if(r===0){const prop=PROP[p.weapon];drawProp(propSprite(p.weapon,col),124+move,y+17,-.3,1,prop.tip[0],prop.tip[1],.7);}
    else g.drawImage(iconSprite(({paleta:'tech',sacapuntas:'lapiz',difumino:'pincel'})[p.acc]||'item',col),114+move,y-1,20,20);
    if(sel){g.drawImage(iconSprite('pincel',col),134,y+8);brushBand(146,y+20,112,2,col);}
    const focus=()=>{m.level='equip';if(m.row!==r){m.row=r;Audio.sfx('cursor',{vol:.3});}};
    uiHit(107,y,154,21,focus);
    artButton('equip-left'+r,'<',265,y,20,19,sel?col:'#c4b28d',()=>{focus();changeEquipment(m,-1);});
    artButton('equip-right'+r,'>',289,y,20,19,sel?col:'#c4b28d',()=>{focus();changeEquipment(m,1);});
  });
  g.restore();
  const role={carmin:'Proteger cubre un golpe a mitad de daño.',ambar:'Interrumpir (2 MP) corta una carga.',anil:'Preparar (2 MP) deja una capa azul.'};
  g.save();g.translate(0,Math.round((1-menuIn(m,16,16))*60));
  maskingLabel(104,145,209,33);
  const noteAt=artObserve('equipment-note',(m.level==='equip'?rows[m.row][1].desc:role[p.id])+(m.swapped||''));
  paragraph(m.level==='equip'?rows[m.row][1].desc:role[p.id],111,149,194,UI_INK,2,{progress:Prefs.shake?(ARTUI.t-noteAt)*2.2:Infinity,wet:col});
  smallText(m.swapped&&delta?'Cambio con '+m.swapped:m.level==='equip'?'< > cambiar material':battleKey('ok')+' elegir material',111,170,UI_MUTED);
  g.restore();
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
function drawDialogue(dlg) {
  UI_HITS.length=0; UI_TEXT.length=0;
  const line=DATA.bossDialogue[Math.min(dlg.i,DATA.bossDialogue.length-1)],sp=SPEAKERS[line.who];
  const col=sp.col.startsWith('#')?sp.col:C(sp.col),left=['carmin','ambar','anil'].includes(line.who);
  const lines=wrapSmall(line.text,237),h=lines.length*10+23,y=H-h-5;
  const at=artObserve('dialogue',dlg.i),portraitX=left?26:294,tx=left?52:14,ready=dlg.ch>=line.text.length;
  // The sheet slides up from the page edge; the speaker leans in and nods while the pen writes.
  const rise=Math.round((1-artIn(at,18))*(h+26)),talk=!ready&&Prefs.shake?Math.sin(ARTUI.t*.55):0;
  g.save();g.translate(0,rise);
  artSheet(left?44:7,y,269,h,col);
  paintDab(portraitX,y+14,19,col);
  drawSprite(sp.spr(),portraitX,y+29-Math.round(artPop(at)*3)-Math.round(Math.max(0,talk)*1.5),sp.sc*(1+talk*.02),false,sp.sc*(1-talk*.03));
  artTag(sp.name,left?49:13,y-15,col,170);
  // The whole line is wrapped first, so words never jump while the ink is revealed.
  writtenLines(lines,tx,y+7,UI_INK,dlg.ch,{wet:col,nib:!!Prefs.shake});
  const key=battleKey('ok')+(ready?' seguir':' completar'),kx=left?304:265;
  textRight(key,kx,y+h-11,UI_MUTED);
  if(ready)dropCursor(kx-textWidth(key)-11,y+h-12,col);
  g.restore();
  uiHit(0,y-16,W,h+21,()=>pressed.ok=true);
}
