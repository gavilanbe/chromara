// Magias de campo: las herramientas del pintor actúan sobre la página. Colorear da cuerpo a un boceto (si recibe el color que
// pide; los colores se mezclan sobre el propio objeto), Trazar dibuja una línea de grafito entre dos chinchetas, Borrar quita lo
// que es lápiz (y el color mal puesto) y Aguada diluye la Tinta. Se abre el anillo con C, se elige con ←/→ y la magia sale
// hacia donde mira el líder, sobre lo primero que haya delante. Gastan pintura (MP), que vuelve al caminar.
'use strict';
const FIELD = DATA.fieldArts;
const FIELD_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const FIELD_MIX = { 'amarillo+rojo': 'naranja', 'amarillo+azul': 'verde', 'azul+rojo': 'violeta' };
function fieldPuzzleState() { return { erased: 0, line: 0, sketch: [], real: 0, washed: 0, opened: false, opening: false }; }
function fieldMixOf(colors) { const u = [...new Set(colors)].sort(); return u.length === 0 ? null : u.length === 1 ? u[0] : u.length === 2 ? FIELD_MIX[u.join('+')] : 'barro'; }
function fieldArt(id) { return FIELD.find(a => a.id === id); }
function fieldOwners(art) { return art.users.map(id => Party.find(p => p.id === id)).filter(Boolean); }
function fieldOk(art) { return fieldOwners(art).every(p => p.cur.hp > 0); }
function fieldAfford(art) { return fieldOwners(art).every(p => p.cur.mp >= art.mp); }
function fieldNotice(text) { OW.fieldToast = { text, t: 200 }; }
// ---- El taller: sus piezas salen del mapa (MAP.pz) y de Game.puzzle; posiciones en casillas y en píxeles de mundo.
function fieldTargets() {
  const p = MAP.pz, z = Game.puzzle; if (!p || !z || Game.page === 1) return [];
  const T = DATA.puzzle.things, at = (id, kind, [tx, ty], w = 1, h = 1, extra = {}) => ({ id, kind, name: T[kind].name, tx, ty, tw: w, th: h, x: (tx + w / 2) * TILE, y: (ty + h / 2) * TILE, ...extra });
  const list = [];
  if (p.torn.length && z.erased < 1) { const xs = p.torn.map(t => t[0]), ys = p.torn.map(t => t[1]); list.push(at('scribble', 'scribble', [Math.min(...xs), Math.min(...ys)], Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1)); }
  p.pins.forEach((q, i) => list.push(at('pin' + i, z.line >= 1 ? 'line' : 'pin', q)));
  if (z.line >= 1 && p.pins.length === 2) { const [a, b] = p.pins; for (let x = Math.min(a[0], b[0]) + 1; x < Math.max(a[0], b[0]); x++) list.push(at('line' + x, 'line', [x, a[1]])); }
  if (p.sketch) list.push(at('sketch', 'sketch', p.sketch, 1, 1, { real: z.real >= 1 }));
  for (const q of p.pit) if (!(p.sketch && q[0] === p.sketch[0] && q[1] === p.sketch[1])) list.push(at('pit' + q[0], 'pit', q));
  if (z.washed < 1) for (const q of p.puddle) list.push(at('puddle' + q[0] + '_' + q[1], 'puddle', q));
  if (p.estuche) list.push(at('chest', 'chest', p.estuche));
  return list;
}
function fieldPuzzleSolid(tx, ty) {
  const p = MAP.pz, z = Game.puzzle; if (!p || !z) return false;
  const on = list => list.some(([x, y]) => x === tx && y === ty);
  if (on(p.torn)) return z.erased < 1;
  if (on(p.river)) return !(z.line >= 1 && p.pins.length === 2 && ty === p.pins[0][1] && tx > Math.min(p.pins[0][0], p.pins[1][0]) && tx < Math.max(p.pins[0][0], p.pins[1][0]));
  if (p.sketch && p.sketch[0] === tx && p.sketch[1] === ty) return z.real < 1;
  if (on(p.pit)) return true;
  if (on(p.puddle)) return z.washed < 1;
  if (p.estuche && p.estuche[0] === tx && p.estuche[1] === ty) return true;
  return false;
}
// Lo primero que hay delante del líder, en su dirección, hasta tres casillas.
function fieldFacing(dir = OW.dir) {
  const [dx, dy] = FIELD_DIRS[dir] || FIELD_DIRS.down, things = fieldTargets(), ox = OW.x, oy = OW.y - 3;
  for (let d = 6; d <= 52; d += 3) {
    const px = ox + dx * d, py = oy + dy * d, tx = px / TILE | 0, ty = py / TILE | 0;
    const hit = things.filter(t => tx >= t.tx && tx < t.tx + t.tw && ty >= t.ty && ty < t.ty + t.th).sort((a, b) => (a.kind === 'line') - (b.kind === 'line'))[0];
    if (hit && !(hit.kind === 'line' && d < 12)) return hit;
    if (solid(tileAt(tx, ty)) && tileAt(tx, ty) !== '~') return null; // una pared corta el trazo; el agua no
  }
  return null;
}
// ¿Qué haría esta magia sobre esto? { ok, why, ... } sin tocar nada.
function fieldCheck(art, target) {
  if (!art) return { ok: false, why: '' };
  if (!fieldOk(art)) return { ok: false, why: fieldOwners(art).filter(p => p.cur.hp <= 0).map(p => p.name).join(' y ') + ' necesita descansar en el vaso.' };
  if (!fieldAfford(art)) return { ok: false, why: 'Falta pintura. Camina un poco y volverá.' };
  if (!target) return { ok: false, why: 'No hay nada delante. Mira hacia algo.' };
  const z = Game.puzzle, T = DATA.puzzle.things, k = target.kind;
  if (art.kind === 'color') {
    if (k === 'sketch') { if (z.real >= 1) return { ok: false, why: T.sketch.done }; if (z.sketch.includes(art.color)) return { ok: false, why: 'Ya tiene ' + art.color + '.' }; if (z.sketch.length >= 2) return { ok: false, why: 'Hay demasiado color encima. Bórralo y prueba otra vez.' }; const mix = fieldMixOf([...z.sketch, art.color]); return { ok: true, mix }; }
    if (k === 'puddle') return { ok: false, why: T.puddle.hint };
    if (k === 'scribble') return { ok: false, why: 'Pintar encima no lo quita: es grafito.' };
    return { ok: false, why: T[k]?.hint || 'Ahí no hay nada que colorear.' };
  }
  if (art.kind === 'trazar') { if (k === 'pin') return { ok: true }; if (k === 'line') return { ok: false, why: 'La línea ya está trazada.' }; return { ok: false, why: 'Trazar necesita una chincheta delante.' }; }
  if (art.kind === 'borrar') {
    if (k === 'scribble') return { ok: true };
    if (k === 'line') return { ok: true, erase: 'line' };
    if (k === 'sketch') return z.sketch.length && z.real < 1 ? { ok: true, erase: 'paint' } : { ok: false, why: z.real >= 1 ? 'La pintura ya se secó: no se borra.' : 'Es un boceto sin color: no hay nada que borrar.' };
    if (k === 'puddle') return { ok: false, why: 'La goma no puede con la Tinta.' };
    return { ok: false, why: 'Aquí no hay lápiz que borrar.' };
  }
  if (art.kind === 'aguada') { if (k === 'puddle') return { ok: true }; if (k === 'sketch') return { ok: false, why: 'El agua sola no da color.' }; return { ok: false, why: 'El agua no le hace nada.' }; }
  return { ok: false, why: '' };
}
function fieldNearby() { const t = fieldFacing(); return t && t.kind === 'chest' && !Game.puzzle.opened && Math.hypot(t.x - OW.x, t.y - OW.y) < 30 ? [t] : []; }
function fieldReachable(target) { return !!target && fieldFacing()?.id === target.id; }
function fieldInteract() { const t = fieldNearby()[0]; if (!t) return false; OW.act = openEstucheGen(); return true; }
// ---- El anillo de magias: giran alrededor del líder; la elegida queda arriba.
function openRing() {
  ARTUI.tracks.delete('field');
  OW.ring = { idx: OW.fieldSelection || 0, t: 0, notice: null, spin: OW.fieldSelection || 0 };
  OW.moving = false; OW.vx = OW.vy = 0; Audio.sfx('book_open', { vol: .4 });
}
function fieldCast() {
  const r = OW.ring; if (!r || OW.act) return;
  const art = FIELD[r.idx], target = fieldFacing(), check = fieldCheck(art, target);
  if (!check.ok) { r.notice = check.why; Audio.sfx('nope', { vol: .3 }); return; }
  OW.fieldSelection = r.idx; OW.ring = null; OW.act = fieldGen(art, target, check);
}
function updateRing() {
  const r = OW.ring; r.t++;
  if (hit('back') || hit('ring')) { OW.ring = null; Audio.sfx('cancel'); return; }
  const step = hit('right') || hit('down') ? 1 : hit('left') || hit('up') ? -1 : 0;
  if (step) { r.idx = (r.idx + step + FIELD.length) % FIELD.length; r.notice = null; Audio.sfx('cursor', { semi: [0, 4, 7, 2, 5, 9][r.idx] }); }
  if (hit('ok')) fieldCast();
}
function fieldArtIcon(art, x, y, r, dim) {
  const col = dim ? '#8d8276' : C(art.color);
  if (art.kind === 'color') { paintDab(x, y, r, col); g.drawImage(iconSprite(art.tool, dim ? '#bdb3a4' : ramp(col).hi), Math.round(x - 6), Math.round(y - 6), 12, 12); return; }
  paintDab(x, y, r, dim ? '#8d8276' : '#e8dcc0');
  if (art.kind === 'borrar') { const s = r / 9; g.fillStyle = '#241e32'; g.fillRect(Math.round(x - 6 * s), Math.round(y - 3 * s), Math.round(12 * s), Math.round(7 * s)); g.fillStyle = dim ? '#bdb3a4' : '#f0b8b5'; g.fillRect(Math.round(x - 5 * s), Math.round(y - 2 * s), Math.round(6 * s), Math.round(5 * s)); g.fillStyle = dim ? '#a89c8c' : '#8ab0d8'; g.fillRect(Math.round(x + 1 * s), Math.round(y - 2 * s), Math.round(4 * s), Math.round(5 * s)); }
  else if (art.kind === 'trazar') { const s = r / 9; g.fillStyle = dim ? '#9a8f83' : '#4a4460'; g.fillRect(Math.round(x - 7 * s), Math.round(y + 3 * s), Math.round(14 * s), 1); g.fillStyle = dim ? '#9a8f83' : '#c5848b'; g.fillRect(Math.round(x - 8 * s), Math.round(y + 1 * s), 2, 3); g.fillRect(Math.round(x + 7 * s), Math.round(y + 1 * s), 2, 3); g.drawImage(iconSprite('lapiz', dim ? '#bdb3a4' : C('amarillo')), Math.round(x - 5), Math.round(y - 8), 10, 10); }
  else { g.fillStyle = dim ? '#9a8f83' : '#6fb4d8'; g.beginPath(); g.moveTo(x, y - r * .7); g.lineTo(x + r * .45, y + r * .1); g.arc(x, y + r * .15, r * .45, 0, Math.PI); g.closePath(); g.fill(); g.fillStyle = '#e8f6fb'; g.fillRect(Math.round(x - r * .2), Math.round(y - r * .05), 1, 2); }
}
function drawRing() {
  UI_HITS.length = 0; UI_TEXT.length = 0;
  const r = OW.ring, art = FIELD[r.idx], col = C(art.color), target = fieldFacing(), check = fieldCheck(art, target);
  const intro = Prefs.shake ? Math.max(0, easeBack(clamp(r.t / 14, 0, 1))) : 1, at = artObserve('field', r.idx + ':' + r.notice); // entra con el propio reloj del anillo
  g.fillStyle = 'rgba(28,20,36,' + (.35 * intro).toFixed(2) + ')'; g.fillRect(0, 0, W, H); // el tiempo se detiene mientras eliges
  if (!Prefs.shake) r.spin = r.idx; else { let d = r.idx - r.spin; if (d > FIELD.length / 2) d -= FIELD.length; if (d < -FIELD.length / 2) d += FIELD.length; r.spin += d * .3; if (Math.abs(d) < .01) r.spin = r.idx; }
  const cx = clamp(Math.round(OW.x - OW.cam.x), 48, W - 48), cy = clamp(Math.round(OW.y - OW.cam.y - 12), 44, 104), R0 = 34 * intro; // cerca del líder, pero siempre entero en pantalla
  g.save(); g.globalAlpha = .5 * intro; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, R0, R0 * .78, 0, 0, 6.29); g.stroke(); g.restore();
  FIELD.forEach((a, i) => {
    const ang = -Math.PI / 2 + (i - r.spin) / FIELD.length * 6.283, x = Math.round(cx + Math.cos(ang) * R0), y = Math.round(cy + Math.sin(ang) * R0 * .78), sel = i === r.idx, dim = !fieldOk(a) || !fieldAfford(a);
    fieldArtIcon(a, x, y, sel ? 9 + artPop(at) : 6, dim);
    if (sel) { g.strokeStyle = '#fff3d8'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, 12, 10, 0, 0, 6.29); g.stroke(); }
    uiHit(x - 11, y - 11, 22, 22, () => { if (r.idx === i) fieldCast(); else { r.idx = i; r.notice = null; Audio.sfx('cursor'); } }, () => { if (r.idx !== i) { r.idx = i; r.notice = null; Audio.sfx('cursor', { vol: .3 }); } });
  });
  // arriba: el nombre, quién la hace y cuánta pintura cuesta
  const owners = fieldOwners(art), head = art.name, hw = rotuloWidth(head) + 28 + owners.length * 16 + 34, hx = Math.round((W - hw) / 2), hy = Math.round(4 - (1 - intro) * 30);
  brushBand(hx, hy, hw, 17, KIT_INK); paintDab(hx + 10, hy + 9, 4, col, artPop(at)); bigText(head, hx + 19, hy + 4, col, { outline: '#0b0912' });
  let ox = hx + 25 + rotuloWidth(head);
  owners.forEach(p => { const s = effStats(p); sticker(ox + 6, hy + 9, { id: p.id, color: p.color, alive: p.cur.hp > 0, hp: p.cur.hp, maxhp: s.hp, mp: p.cur.mp, maxmp: s.mp }, 6); ox += 16; });
  const enough = fieldAfford(art); miniTube(ox + 2, hy + 5, col, !enough); smallText(art.mp + ' MP', ox + 9, hy + 5, enough ? '#f4f0ea' : '#e58a8a');
  // el objetivo: esquinas de lápiz que laten y un reguero de pintura desde el líder; si es un boceto, la mezcla que quedaría
  if (target) {
    const tx = target.x - OW.cam.x, ty = target.y - OW.cam.y, w = target.tw * 8 + 3, h = target.th * 8 + 3, pulse = Prefs.shake ? Math.round(Math.sin(r.t * .2) * 1.5) : 0, c2 = check.ok ? col : '#9a8f83';
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const X = tx + a * (w + pulse), Y = ty + b * (h + pulse); pstroke(X, Y, X - a * 5, Y, 2, c2, 1, 0, false); pstroke(X, Y, X, Y - b * 5, 2, c2, 1, 0, false); }
    for (let i = 1; i < 8; i++) { const k = ((i + r.t * .08) % 8) / 8; g.fillStyle = c2; g.globalAlpha = .3 + k * .6; g.fillRect(Math.round(lerp(cx, tx, k)), Math.round(lerp(cy + 10, ty, k)), 2, 2); } g.globalAlpha = 1;
    if (target.kind === 'sketch' && art.kind === 'color' && check.ok) { const z = Game.puzzle; let x = tx - 16; [...z.sketch, art.color].forEach((c, i, all) => { paintDab(x, ty - h - 10, 3, C(c)); x += 8; if (i < all.length - 1) { smallText('+', x - 4, ty - h - 13, '#f4f0ea'); } }); smallText('=', x - 2, ty - h - 13, '#f4f0ea'); paintDab(x + 7, ty - h - 10, 4, check.mix === 'barro' ? '#78644d' : C(check.mix)); }
  }
  const aim = target ? 'Delante: ' + target.name : 'Delante: nada', note = r.notice || (check.ok ? art.desc : check.why || art.desc), noteAt = artObserve('field-note', note);
  g.save(); g.translate(0, Math.round((1 - intro) * 40));
  maskingLabel(6, 136, 308, 38); smallText(aim, 14, 140, check.ok ? UI_INK : UI_MUTED); if (target && check.ok) paintDab(9, 144, 2, col);
  paragraph(note, 14, 151, 292, r.notice || !check.ok ? '#9c4539' : UI_MUTED, 2, { progress: Prefs.shake ? (ARTUI.t - noteAt) * 2.2 : Infinity, wet: r.notice ? '#c4384a' : col });
  artButton('field-cast', battleKey('ok') + ' usar', 244, 118, 70, 15, col, fieldCast, { disabled: !check.ok, selected: check.ok });
  artButton('field-close', battleKey('back'), 6, 118, 26, 15, '#d2bc95', () => { OW.ring = null; Audio.sfx('cancel'); });
  g.restore();
}
// ---- Usar una magia: la gota alza su color, la herramienta va hasta el objeto y actúa. El estado cambia al llegar.
function fieldCasterPosition(owner) { const i = Party.indexOf(owner), h = OW.hist[Math.min(OW.hist.length - 1, i * 12)]; return i === 0 ? [OW.x, OW.y] : h ? [...h] : [OW.x - i * 12, OW.y]; }
function* fieldGen(art, target, check) {
  const z = Game.puzzle, owners = fieldOwners(art), col = C(art.color), p = MAP.pz, T = DATA.puzzle.things;
  const s = { art, target, check, from: [OW.x, OW.y - 12], aim: [target.x, target.y], t: 0, col };
  if (art.kind === 'trazar') { const other = p.pins.find(q => q[0] !== target.tx || q[1] !== target.ty); s.aim2 = [(other[0] + .5) * TILE, (other[1] + .5) * TILE]; }
  OW.moving = false; OW.vx = OW.vy = 0; OW.fieldCast = s; OW.cast = { p: owners[0], x: OW.x, y: OW.y, col, aura: 1 };
  owners.forEach(q => q.cur.mp -= art.mp);
  Audio.sfx('charge', { semi: SEMI[owners[0].id] || 0, vol: .45 });
  const dur = { color: 76, trazar: 92, borrar: 84, aguada: 96 }[art.kind];
  let committed = false; const was = { sketch: [...z.sketch] };
  const commit = () => {
    if (committed) return; committed = true;
    if (art.kind === 'color') { z.sketch = [...z.sketch, art.color]; if (fieldMixOf(z.sketch) === T.sketch.need) z.real = 1; }
    if (art.kind === 'trazar') z.line = 1;
    if (art.kind === 'borrar') { if (check.erase === 'line') z.line = 0; else if (check.erase === 'paint') z.sketch = []; else z.erased = 1; }
    if (art.kind === 'aguada') z.washed = 1;
  };
  try {
    for (let t = 0; t < dur; t++) {
      s.t = t; OW.cast.aura = Math.max(0, 1 - t / 30);
      if (t === 16) Audio.sfx(art.kind === 'color' ? 'brush_sweep' : art.kind === 'trazar' ? 'scratch_long' : art.kind === 'borrar' ? 'rub' : 'brush_hiss', { vol: .6 });
      if (art.kind === 'color' && t === 44) { commit(); Audio.sfx(z.real >= 1 ? 'grow' : 'plop', { semi: SEMI[owners[0].id] || 0, vol: .6 }); if (z.real >= 1) Audio.sfx('discovery', { vol: .4, when: .15 }); }
      if (art.kind === 'trazar') { s.draw = clamp((t - 30) / 40, 0, 1); if (t % 8 === 0 && t > 30 && t < 70) Audio.sfx('scratch', { vol: .35, semi: t / 8 }); if (t === 70) { commit(); Audio.sfx('tinkle', { semi: 4, vol: .5 }); } }
      if (art.kind === 'borrar') { if (t > 24 && t < 70 && t % 10 === 0) Audio.sfx('rub', { vol: .45 }); if (t % 12 === 6 && t > 24 && t < 70) Audio.sfx('crumbs', { vol: .3 }); s.fade = clamp((t - 30) / 40, 0, 1); if (t === 70) commit(); }
      if (art.kind === 'aguada') { s.wash = clamp((t - 24) / 56, 0, 1); if (t === 40) Audio.sfx('splash_clean', { vol: .5 }); if (t === 64) Audio.sfx('bubbles', { vol: .4 }); if (t === 80) commit(); }
      yield;
    }
    commit();
    fieldNotice(art.kind === 'color' ? (z.real >= 1 ? T.sketch.done : fieldMixOf(z.sketch) === 'barro' ? 'Se ha hecho barro. Borra el color y vuelve a probar.' : 'El boceto se tiñe de ' + fieldMixOf(z.sketch) + '. ' + (z.sketch.length === 1 ? 'Aún no es el color que pide.' : 'No es el color que pide: bórralo.')) : art.kind === 'trazar' ? T.pin.done : art.kind === 'borrar' ? (check.erase === 'line' ? 'La línea se borra.' : check.erase === 'paint' ? 'La goma levanta el color: el boceto vuelve a estar limpio.' : T.scribble.done) : T.puddle.done);
  } finally {
    if (!committed && Game.puzzle === z) commit();
    OW.cast = null; OW.fieldCast = null;
  }
}
// La pintura vuelve al caminar: cada 64 px andados, una gota de MP para cada gota viva.
function fieldWalk(dist) {
  OW.walked = (OW.walked || 0) + dist; if (OW.walked < 64) return; OW.walked -= 64;
  Party.forEach(p => { if (p.cur.hp > 0 && p.cur.mp < effStats(p).mp) p.cur.mp++; });
}
function* openEstucheGen() {
  const z = Game.puzzle; if (z.opened || z.opening) return;
  z.opening = true; z.zip = 0; OW.moving = false; OW.vx = OW.vy = 0; let complete = false;
  try {
    for (let t = 0; t <= 88; t++) {
      z.zip = clamp(t / 26, 0, 1); z.open = clamp((t - 26) / 15, 0, 1); z.rise = clamp((t - 41) / 32, 0, 1);
      if (t < 26 && t % 5 === 0) Audio.sfx('scratch', { vol: .3, semi: t }); if (t === 28) Audio.sfx('page'); if (t === 42) Audio.sfx('discovery');
      yield;
    }
    z.opened = true; Game.owned.pluma = true; complete = true;
    OW.msg = { lines: ['¡Has conseguido la Pluma!', 'Borrar, trazar, colorear, diluir:', 'el taller está resuelto. La Pluma escribe', 'con el color de quien la empuña.'], t: 0 };
  } finally { z.opening = false; z.rise = 0; if (!complete) { z.zip = 0; z.open = 0; } }
}
// ---- Dibujo del taller
function drawFieldPuzzle(ents, cx, cy, pal) {
  if (!Game.puzzle || !MAP.pz || Game.page === 1) return;
  const z = Game.puzzle, p = MAP.pz, s = OW.fieldCast;
  g.fillStyle = '#ddd1b7'; g.fillRect(28 * TILE - cx, 15 * TILE - cy, 11 * TILE, 9 * TILE);
  g.fillStyle = '#efe5cf'; g.fillRect(31 * TILE - cx, 15 * TILE - cy, 8 * TILE - 2, 9 * TILE - 2);
  g.fillStyle = '#e3d7bf'; for (let y = 246; y < 382; y += 8) g.fillRect(498 - cx, y - cy, 122, 1);
  worldTinyText('ATELIER / TRES TINTAS', 505 - cx, 360 - cy, '#867762');
  const inkTile = (tx, ty) => { const x = tx * TILE - cx, y = ty * TILE - cy; g.fillStyle = '#282536'; g.fillRect(x, y, 16, 16); g.fillStyle = '#474157'; g.fillRect(x + 3, y + ((OW.t / 4 + ty * 3 + tx) % 14 | 0), 5, 1); g.fillRect(x + 10, y + ((OW.t / 5 + ty * 7 + tx * 2) % 14 | 0), 3, 1); };
  for (const [tx, ty] of p.river) inkTile(tx, ty);
  for (const [tx, ty] of p.pit) { inkTile(tx, ty); const x = tx * TILE - cx, y = ty * TILE - cy; for (let i = 0; i < 16; i += 3) { g.fillStyle = '#f2e8d2'; g.fillRect(x + i, y - 1 + (i % 2), 2, 1); g.fillRect(x + i + 1, y + 16 - (i % 2), 2, 1); } }
  // el garabato: una maraña de grafito sobre el papel doblado; la goma lo va levantando
  if (p.torn.length && z.erased < 1) { const xs = p.torn.map(t => t[0]), ys = p.torn.map(t => t[1]), wx = Math.min(...xs) * TILE - cx, wy = Math.min(...ys) * TILE - cy, fade = s && s.art.kind === 'borrar' && !s.check.erase ? s.fade || 0 : 0;
    g.fillStyle = '#eaddbd'; g.fillRect(wx, wy, 32, 32); g.save(); g.globalAlpha = 1 - fade;
    const rnd = seeded(41); let px = wx + 4, py = wy + 6; for (let i = 0; i < 46; i++) { const nx = wx + 3 + rnd() * 26, ny = wy + 3 + rnd() * 26; pstroke(px, py, nx, ny, 2, i % 3 ? '#4a4460' : '#2a2438', 1, 0, false); px = nx; py = ny; }
    g.restore(); }
  // las chinchetas y, entre ellas, la línea de grafito que sostiene el paso
  const drawn = s && s.art.kind === 'trazar' ? s.draw || 0 : z.line;
  if (p.pins.length === 2 && drawn > 0) { const [a, b] = p.pins, x0 = (a[0] + .5) * TILE - cx, x1 = (b[0] + .5) * TILE - cx, y = (a[1] + .5) * TILE - cy + 2, from = s && s.art.kind === 'trazar' && s.target.tx === b[0] ? x1 : x0, to = from === x0 ? x1 : x0, xe = lerp(from, to, drawn);
    pstroke(from, y + 2, xe, y + 2, 4, '#2a2438', 1, 0, false); pstroke(from, y + 1, xe, y + 1, 2, '#6a6480', 1, 0, false); pstroke(from, y, xe, y, 1, '#9a98b0', 1, 0, false); }
  for (const [tx, ty] of p.pins) { const x = tx * TILE + 8 - cx, y = ty * TILE + 10 - cy; g.fillStyle = 'rgba(34,25,46,.3)'; g.fillRect(x - 3, y + 2, 7, 2); g.fillStyle = '#8c8ab0'; g.fillRect(x, y - 4, 1, 5); g.fillStyle = '#241e32'; g.fillRect(x - 3, y - 8, 7, 5); g.fillStyle = '#c5484b'; g.fillRect(x - 2, y - 7, 5, 3); g.fillStyle = '#f08a80'; g.fillRect(x - 2, y - 7, 2, 1); }
  // el puente en boceto: líneas grises sin cuerpo sobre el canal; se tiñe con cada color y, en verde, se vuelve de hojas
  if (p.sketch) { const x = p.sketch[0] * TILE - cx, y = p.sketch[1] * TILE - cy, mix = fieldMixOf(z.sketch);
    if (z.real >= 1) { g.fillStyle = '#36733a'; g.fillRect(x - 1, y, 18, 16); for (let i = 0; i < 16; i += 4) { g.fillStyle = i % 8 ? '#689949' : '#9fbf61'; g.fillRect(x + i, y + 1, 3, 14); g.fillStyle = '#c9d781'; g.fillRect(x + i, y + 2, 1, 12); } }
    else { g.save(); g.globalAlpha = .8; for (let i = 0; i < 16; i += 4) { pstroke(x + i, y + 1, x + i, y + 15, 1, '#b8ad96', 1, 0, false); } pstroke(x, y + 1, x + 16, y + 1, 1, '#b8ad96', 1, 0, false); pstroke(x, y + 15, x + 16, y + 15, 1, '#b8ad96', 1, 0, false); g.restore();
      if (mix) { g.save(); g.globalAlpha = .6; g.fillStyle = mix === 'barro' ? '#78644d' : C(mix); g.fillRect(x + 1, y + 3, 14, 10); g.restore(); }
      g.fillStyle = '#f2e8d2'; g.fillRect(x + 18, y - 5, 18, 7); worldTinyText('VERDE', x + 19, y - 4, '#6b8f4a'); } } // la nota del margen
  // el charco de Tinta: espeso y con ojos; el agua lo aclara hasta que se escurre
  if (z.washed < 1 && p.puddle.length) { const w = s && s.art.kind === 'aguada' ? s.wash || 0 : 0;
    for (const [tx, ty] of p.puddle) { const x = tx * TILE - cx, y = ty * TILE - cy; g.save(); g.globalAlpha = 1 - w * .9; g.fillStyle = w > .3 ? '#6a6480' : '#1e1a2c'; g.beginPath(); g.ellipse(x + 8, y + 9, 9, 7, 0, 0, 6.29); g.fill(); g.fillStyle = '#3a3652'; g.fillRect(x + 4, y + 5, 4, 1); g.restore(); }
    if (w < .2 && OW.t % 150 > 6) { const [tx, ty] = p.puddle[0]; g.fillStyle = '#efe4bf'; g.fillRect(tx * TILE + 5 - cx, ty * TILE + 7 - cy, 2, 2); g.fillRect(tx * TILE + 10 - cx, ty * TILE + 7 - cy, 2, 2); } }
  if (p.estuche) { const x = p.estuche[0] * TILE + 8 - cx, y = p.estuche[1] * TILE + 10 - cy;
    ents.push({ y: p.estuche[1] * TILE + 22, draw: () => { shadow(x, y + 10, 17); g.drawImage(pzSprite('estuche', pal), x - 12, y - 13);
      if (!z.opened) { g.fillStyle = '#9ec267'; g.fillRect(x - 6, y - 5, 12, 5); if (z.opening) { g.fillStyle = '#fcf2d8'; g.fillRect(x - 9 + z.zip * 18, y - 1, 2, 2); } }
      if (z.open || z.opened) { g.fillStyle = '#64536f'; g.fillRect(x - 9, y - 8 - (z.open || 1) * 6, 18, 6); g.fillStyle = '#e9dfc7'; g.fillRect(x - 9, y - 6, 18, 3); }
      if (z.rise) { const img = propSprite('pluma', C('azul')); g.save(); g.translate(x, y - z.rise * 24); g.rotate(-1.05); g.drawImage(img, -24, -8); g.restore(); } } }); }
}
// ---- Efectos al usar cada magia
function drawFieldEffects(cx, cy) {
  const s = OW.fieldCast; if (!s) return;
  const t = s.t, col = s.col, fx = s.from[0] - cx, fy = s.from[1] - cy, ax = s.aim[0] - cx, ay = s.aim[1] - cy, k = s.art.kind;
  if (t < 20) { const c0 = C(fieldOwners(s.art)[0].color); for (let i = 0; i < 8; i++) { const a = i * .785 + t * .16, rr = 18 - t * .7; g.fillStyle = c0; g.fillRect(Math.round(fx + Math.cos(a) * rr), Math.round(fy + 6 + Math.sin(a) * rr * .6), 2, 2); } }
  const fly = q => [lerp(fx, ax, q), lerp(fy, ay - 6, q) - Math.sin(q * Math.PI) * 16];
  if (k === 'color') { // la herramienta vuela, pinta tres pinceladas sobre el objeto y vuelve
    const P = PROP[s.art.tool];
    if (t >= 16 && t < 36) { const [x, y] = fly((t - 16) / 20); drawProp(propSprite(s.art.tool, col), x, y, -.6, 1, P.tip[0], P.tip[1], .7); }
    if (t >= 36 && t < 60) { const q = (t - 36) / 24, sweep = Math.sin(q * Math.PI * 3) * 8; drawProp(propSprite(s.art.tool, col), ax + sweep, ay - 2, -.6, 1, P.tip[0], P.tip[1], .7); for (let i = 0; i < 3; i++) if (q > i / 3) pstroke(ax - 8, ay - 4 + i * 4, ax + 8, ay - 5 + i * 4, 2, col, 1, 0, false); }
    if (t >= 44 && t < 70) { const q = (t - 44) / 26; for (let i = 0; i < 8; i++) { const a = i * .785; g.fillStyle = i % 2 ? col : ramp(col).hi; g.globalAlpha = 1 - q; g.fillRect(Math.round(ax + Math.cos(a) * q * 16), Math.round(ay + Math.sin(a) * q * 8 - Math.sin(q * Math.PI) * 6), 2, 2); } g.globalAlpha = 1; } }
  if (k === 'trazar') { // el lápiz va a la chincheta y arrastra la línea hasta la otra; saltan virutas de grafito
    const P = PROP.lapiz, [bx, by] = [s.aim2[0] - cx, s.aim2[1] - cy], d = s.draw || 0;
    if (t >= 16 && t < 30) { const [x, y] = fly((t - 16) / 14); drawProp(propSprite('lapiz', col), x, y, -.95, 1, P.tip[0], P.tip[1], .8); }
    if (t >= 30 && t < 78) { const x = lerp(ax, bx, d), y = lerp(ay + 2, by + 2, d); drawProp(propSprite('lapiz', col), x, y, -.95, 1, P.tip[0], P.tip[1], .8); if (t % 2 === 0 && d < 1) { g.fillStyle = '#6a6480'; g.fillRect(Math.round(x - 2 + (t % 5)), Math.round(y + 1 + (t % 3)), 1, 1); } } }
  if (k === 'borrar') { // una goma enorme frota de lado a lado; las virutas rosas caen
    if (t >= 16 && t < 76) { const q = t < 28 ? (t - 16) / 12 : 1, rub = t >= 28 ? Math.sin((t - 28) * .6) * 9 : 0, [x, y] = t < 28 ? fly(q) : [ax + rub, ay - 4], img = propSprite('goma'); drawProp(img, x, y, .25, 1, PROP.goma.tip[0], PROP.goma.tip[1], 1.4);
      if (t >= 28) for (let i = 0; i < 5; i++) { const ph = ((t + i * 7) % 20) / 20; g.fillStyle = i % 2 ? '#e86a8a' : '#f4f0ea'; g.fillRect(Math.round(ax - 8 + i * 4 + Math.sin(i + t * .2) * 2), Math.round(ay + 2 + ph * 12), 2, 1); } } }
  if (k === 'aguada') { // el pincel descarga agua: una mancha de acuarela se abre sobre la tinta y la aclara
    const P = PROP.pincel, w = s.wash || 0;
    if (t >= 16 && t < 34) { const [x, y] = fly((t - 16) / 18); drawProp(propSprite('pincel', '#8ec8e8'), x, y, -.6, 1, P.tip[0], P.tip[1], .7); }
    if (t >= 24) { g.save(); g.globalAlpha = .5 * (1 - Math.max(0, (t - 80) / 16)); g.fillStyle = '#9fd0ea'; g.beginPath(); g.ellipse(ax, ay + 4, 6 + w * 22, 3 + w * 12, 0, 0, 6.29); g.fill(); g.fillStyle = '#e8f6fb'; g.fillRect(Math.round(ax - w * 12), Math.round(ay - w * 6), Math.round(w * 10) + 1, 1); g.restore();
      for (let i = 0; i < 6; i++) { const ph = ((t * 2 + i * 9) % 30) / 30; g.fillStyle = '#6fb4d8'; g.fillRect(Math.round(ax - 10 + i * 4), Math.round(ay - 20 + ph * 22), 1, 2); } } }
}
function drawFieldUI() {
  if (OW.ring || OW.menu || OW.msg || OW.heal || OW.landT || OW.jar?.toast > 0) return;
  const s = OW.fieldCast, toast = OW.fieldToast;
  if (s) { const label = fieldOwners(s.art).map(p => p.name).join(' + ') + ' / ' + s.art.name, castAt = artObserve('field-cast', s); g.save(); g.translate(Math.round((1 - artIn(castAt, 14)) * -90), 0); artTag(label, 6, 160, s.col); g.restore(); }
  else if (toast?.t > 0) {
    const lines = wrapSmall(toast.text, 280), w = Math.max(...lines.map(textWidth)) + 18, y = 176 - lines.length * 10 - 7, toastAt = artObserve('field-toast', toast);
    g.save(); g.translate(0, Math.round((1 - artIn(toastAt, 14)) * 30)); maskingLabel(Math.round((W - w) / 2), y, w, 7 + lines.length * 10);
    writtenLines(lines, Math.round((W - w) / 2) + 9, y + 4, UI_INK, Prefs.shake ? (ARTUI.t - toastAt) * 1.6 : Infinity, { wet: '#9c4539' }); g.restore();
  } else {
    const t = fieldNearby()[0]; if (!t) return;
    const label = t.name + ' / ' + battleKey('ok') + ' abrir', w = textWidth(label) + 16, x = Math.round((W - w) / 2), at = artObserve('field-nearby', t.id);
    g.save(); g.translate(0, Math.round((1 - artIn(at, 14)) * 26)); artTag(label, x, 159 - Math.round(artPop(at) * 3), '#9ec267'); g.restore();
    uiHit(x, 154, w, 24, () => fieldInteract());
  }
}
