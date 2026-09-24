// Magias de campo: las herramientas del pintor actúan sobre la página. Colorear da cuerpo a un boceto (si recibe el color que
// pide; los colores se mezclan sobre el propio objeto), Trazar dibuja una línea de grafito entre dos chinchetas, Borrar quita lo
// que es lápiz (y el color mal puesto) y Aguada diluye la Tinta. Se abre el anillo con C, se elige con ←/→ y la magia sale
// hacia donde mira el líder, sobre lo primero que haya delante. Gastan pintura (MP), que vuelve al caminar.
'use strict';
const FIELD = DATA.fieldArts;
const FIELD_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const FIELD_MIX = { 'amarillo+rojo': 'naranja', 'amarillo+azul': 'verde', 'azul+rojo': 'violeta' };
function fieldPuzzleState() { return { erased: {}, lines: {}, paint: {}, real: {}, washed: {}, looted: {}, opened: false, opening: false }; }
function fieldMixOf(colors) { const u = [...new Set(colors)].sort(); return u.length === 0 ? null : u.length === 1 ? u[0] : u.length === 2 ? FIELD_MIX[u.join('+')] : 'barro'; }
function fieldArt(id) { return FIELD.find(a => a.id === id); }
function fieldOwners(art) { return art.users.map(id => Party.find(p => p.id === id)).filter(Boolean); }
function fieldOk(art) { return fieldOwners(art).every(p => p.cur.hp > 0); }
function fieldAfford(art) { return fieldOwners(art).every(p => p.cur.mp >= art.mp); }
function fieldNotice(text) { OW.fieldToast = { text, t: 200 }; }
// ---- Las piezas del mapa se agrupan al leerlo: garabatos, charcos y bocetos contiguos son una sola pieza; las chinchetas
// van por parejas en línea recta con agua o tinta entre ellas.
function fieldGroups() {
  const p = MAP.pz; if (!p) return null; if (p._groups) return p._groups;
  const key = (x, y) => x + ',' + y, comps = (tiles, same = () => true) => { const left = new Map(tiles.map(t => [key(t[0], t[1]), t])), out = [];
    for (const [k, t] of left) { if (!left.has(k)) continue; const group = [], q = [t]; left.delete(k);
      while (q.length) { const c = q.pop(); group.push(c); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = left.get(key(c[0] + a, c[1] + b)); if (n && same(c, n)) { left.delete(key(n[0], n[1])); q.push(n); } } }
      out.push(group.sort((a, b) => a[1] - b[1] || a[0] - b[0])); } return out; };
  const inkSet = new Set(p.ink.map(t => key(t[0], t[1]))), passable = (x, y) => tileAt(x, y) === '~' || inkSet.has(key(x, y));
  const pairs = [], used = new Set();
  for (const a of p.pins) { if (used.has(key(...a))) continue;
    for (const b of p.pins) { if (a === b || used.has(key(...b)) || (a[0] !== b[0] && a[1] !== b[1])) continue; const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), line = [];
      let x = a[0] + dx, y = a[1] + dy, ok = true; while (x !== b[0] || y !== b[1]) { if (!passable(x, y)) { ok = false; break; } line.push([x, y]); x += dx; y += dy; }
      if (ok && line.length) { pairs.push({ id: 'p@' + key(...a), pins: [a, b], line }); used.add(key(...a)); used.add(key(...b)); break; } } }
  return p._groups = {
    scribbles: comps(p.torn).map(t => ({ id: 'H@' + key(...t[0]), tiles: t })),
    puddles: comps(p.puddle).map(t => ({ id: 'N@' + key(...t[0]), tiles: t })),
    sketches: comps(p.sketch, (a, b) => a[2] === b[2]).map(t => ({ id: 'S@' + key(...t[0]), tiles: t, color: t[0][2] })),
    pairs, inkSet,
  };
}
function fieldTile(x, y) { return [(x + .5) * TILE, (y + .5) * TILE]; }
function fieldTargets() {
  const G = fieldGroups(), z = Game.puzzle, p = MAP.pz; if (!G || !z || Game.page >= 1) return [];
  const T = DATA.puzzle.things, list = [], thing = (id, kind, tiles, extra = {}) => { const cx = tiles.reduce((s, t) => s + t[0], 0) / tiles.length, cy = tiles.reduce((s, t) => s + t[1], 0) / tiles.length; list.push({ id, kind, name: T[kind].name, tiles, tx: tiles[0][0], ty: tiles[0][1], tw: 1, th: 1, x: (cx + .5) * TILE, y: (cy + .5) * TILE, ...extra }); };
  for (const s of G.scribbles) if (!z.erased[s.id]) thing(s.id, 'scribble', s.tiles);
  for (const q of G.pairs) { q.pins.forEach((pin, i) => thing(q.id + '#' + i, z.lines[q.id] ? 'line' : 'pin', [pin], { pair: q, pin: i })); if (z.lines[q.id]) thing(q.id + '#line', 'line', q.line, { pair: q }); }
  for (const s of G.sketches) thing(s.id, 'sketch', s.tiles, { sketch: s, real: !!z.real[s.id], name: T.sketch.name + (z.real[s.id] ? '' : ' (pide ' + s.color + ')') });
  for (const n of G.puddles) if (!z.washed[n.id]) thing(n.id, 'puddle', n.tiles);
  if (p.estuche) thing('chest', 'chest', [p.estuche], { pluma: true });
  for (const c of p.chests) thing('e@' + c[0] + ',' + c[1], 'chest', [c]);
  return list;
}
// ¿Esta casilla la cierran (true) o la abren (false) las piezas? undefined: decide el terreno.
function fieldPuzzleOverride(tx, ty) {
  const G = fieldGroups(), z = Game.puzzle, p = MAP.pz; if (!G || !z) return undefined;
  const at = t => t[0] === tx && t[1] === ty;
  for (const s of G.scribbles) if (s.tiles.some(at)) return z.erased[s.id] ? undefined : true;
  for (const s of G.sketches) if (s.tiles.some(at)) return z.real[s.id] ? false : true;
  for (const q of G.pairs) if (z.lines[q.id] && q.line.some(at)) return false;
  if (G.inkSet.has(tx + ',' + ty)) return true;
  for (const n of G.puddles) if (n.tiles.some(at)) return z.washed[n.id] ? undefined : true;
  if ((p.estuche && at(p.estuche)) || p.chests.some(at)) return true;
  return undefined;
}
function fieldPuzzleSolid(tx, ty) { return fieldPuzzleOverride(tx, ty) === true; }
// Lo primero que hay delante del líder, en su dirección, hasta tres casillas; devuelve también la casilla tocada.
function fieldFacing(dir = OW.dir) {
  const [dx, dy] = FIELD_DIRS[dir] || FIELD_DIRS.down, things = fieldTargets(), ox = OW.x, oy = OW.y - 3;
  for (let d = 6; d <= 52; d += 3) {
    const px = ox + dx * d, py = oy + dy * d, tx = px / TILE | 0, ty = py / TILE | 0;
    const hits = things.filter(t => t.tiles.some(q => q[0] === tx && q[1] === ty)).sort((a, b) => (a.kind === 'line') - (b.kind === 'line'));
    const hit = hits[0];
    if (hit && !(hit.kind === 'line' && d < 12)) { const [x, y] = fieldTile(tx, ty); return { ...hit, hitX: x, hitY: y }; }
    const o = fieldPuzzleOverride(tx, ty); if (o === false) continue;
    if (solid(tileAt(tx, ty)) && tileAt(tx, ty) !== '~') return null; // una pared corta el trazo; el agua no
  }
  return null;
}
function fieldCheck(art, target) {
  if (!art) return { ok: false, why: '' };
  if (!fieldOk(art)) return { ok: false, why: fieldOwners(art).filter(p => p.cur.hp <= 0).map(p => p.name).join(' y ') + ' necesita descansar en el vaso.' };
  if (!fieldAfford(art)) return { ok: false, why: 'Falta pintura. Camina un poco y volverá.' };
  if (!target) return { ok: false, why: 'No hay nada delante. Mira hacia algo.' };
  const z = Game.puzzle, T = DATA.puzzle.things, k = target.kind;
  if (k === 'chest') return { ok: false, why: 'Ábrelo con ' + keyLabel('ok') + '.' };
  if (art.kind === 'color') {
    if (k === 'sketch') { const s = target.sketch, have = z.paint[s.id] || []; if (z.real[s.id]) return { ok: false, why: T.sketch.done }; if (have.includes(art.color)) return { ok: false, why: 'Ya tiene ' + art.color + '.' }; if (have.length >= 2) return { ok: false, why: 'Hay demasiado color encima. Bórralo y prueba otra vez.' }; return { ok: true, mix: fieldMixOf([...have, art.color]) }; }
    if (k === 'scribble') return { ok: false, why: 'Pintar encima no lo quita: es grafito.' };
    return { ok: false, why: T[k]?.hint || 'Ahí no hay nada que colorear.' };
  }
  if (art.kind === 'trazar') { if (k === 'pin') return { ok: true }; if (k === 'line') return { ok: false, why: 'La línea ya está trazada.' }; return { ok: false, why: 'Trazar necesita una chincheta delante.' }; }
  if (art.kind === 'borrar') {
    if (k === 'scribble') return { ok: true };
    if (k === 'line') return { ok: true, erase: 'line' };
    if (k === 'sketch') { const s = target.sketch; return (z.paint[s.id] || []).length && !z.real[s.id] ? { ok: true, erase: 'paint' } : { ok: false, why: z.real[s.id] ? 'La pintura ya se secó: no se borra.' : 'Es un boceto sin color: no hay nada que borrar.' }; }
    if (k === 'puddle') return { ok: false, why: 'La goma no puede con la Tinta.' };
    return { ok: false, why: 'Aquí no hay lápiz que borrar.' };
  }
  if (art.kind === 'aguada') { if (k === 'puddle') return { ok: true }; if (k === 'sketch') return { ok: false, why: 'El agua sola no da color.' }; return { ok: false, why: 'El agua no le hace nada.' }; }
  return { ok: false, why: '' };
}
function fieldNearby() { const t = fieldFacing(); if (!t || t.kind !== 'chest' || Math.hypot(t.hitX - OW.x, t.hitY - OW.y) > 30) return []; const z = Game.puzzle; return (t.pluma ? z.opened : z.looted[t.id]) ? [] : [t]; }
function fieldReachable(target) { return !!target && fieldFacing()?.id === target.id; }
function fieldInteract() { const t = fieldNearby()[0]; if (!t) return false; OW.act = t.pluma ? openEstucheGen() : openChestGen(t); return true; }
// ---- La paleta de magias de campo (C): elegir en la paleta y luego apuntar.
function openRing() {
  ARTUI.tracks.delete('field');
  OW.ring = { idx: OW.fieldSelection || 0, t: 0, notice: null, spin: OW.fieldSelection || 0 };
  OW.moving = false; OW.vx = OW.vy = 0; Audio.sfx('book_open', { vol: .4 });
}
// Apuntar, como en Golden Sun: tras elegir la magia, el líder se gira hacia donde la lanzará. Se mira qué hay en cada
// una de las cuatro direcciones y se apunta sola al primer sitio donde funcionará.
const FIELD_AIM = ['up', 'right', 'down', 'left'];
function fieldAimOptions(art) { return FIELD_AIM.map(dir => { const target = fieldFacing(dir); return { dir, target, check: fieldCheck(art, target) }; }); }
function fieldRingCache(r) { if (!r.cache || r.cache.x !== OW.x || r.cache.y !== OW.y) r.cache = { x: OW.x, y: OW.y, opts: FIELD.map(a => fieldAimOptions(a)) }; return r.cache; }
function fieldAim() {
  const r = OW.ring; if (!r || OW.act) return; const art = FIELD[r.idx];
  if (!fieldOk(art) || !fieldAfford(art)) { r.notice = fieldCheck(art, null).why; r.deniedAt = r.t; Audio.sfx('nope', { vol: .3 }); return; }
  const valid = fieldRingCache(r).opts[r.idx].filter(o => o.check.ok);
  if (!valid.length) { r.notice = 'Aquí cerca no hay nada que pida ' + art.name.toLowerCase() + '.'; r.deniedAt = r.t; Audio.sfx('nope', { vol: .3 }); return; }
  const best = valid.find(o => o.dir === OW.dir) || valid[0];
  r.mode = 'aim'; r.aimAt = r.t; r.backAt = null; r.aimAng = null; r.aimDir = best.dir; OW.dir = best.dir; r.notice = null; Audio.sfx('page', { vol: .35 }); Audio.sfx('cursor', { semi: 7 });
}
// Con las flechas: si en esa dirección hay sitio, a él; si no, al siguiente (o anterior) de los que hay.
function fieldAimStep(dir) {
  const r = OW.ring, valid = fieldRingCache(r).opts[r.idx].filter(o => o.check.ok); if (!valid.length) return;
  const exact = valid.find(o => o.dir === dir), i = valid.findIndex(o => o.dir === r.aimDir), step = dir === 'right' || dir === 'down' ? 1 : -1;
  const next = exact || valid[(i + step + valid.length) % valid.length];
  if (next.dir === r.aimDir) { r.deniedAt = r.t; Audio.sfx('cursor', { vol: .2, semi: -5 }); return; }
  fieldAimTo(next.dir);
}
function fieldAimBack() { const r = OW.ring; if (!r) return; r.mode = null; r.notice = null; r.backAt = r.t; Audio.sfx('cancel'); }
function fieldAimTo(dir) { const r = OW.ring; if (!r || r.aimDir === dir) return; r.aimDir = dir; OW.dir = dir; r.notice = null; r.turnAt = r.t; Audio.sfx('cursor', { semi: FIELD_AIM.indexOf(dir) * 2 }); }
function fieldCast() {
  const r = OW.ring; if (!r || OW.act) return;
  const art = FIELD[r.idx], target = fieldFacing(), check = fieldCheck(art, target);
  if (!check.ok) { r.notice = check.why; r.deniedAt = r.t; Audio.sfx('nope', { vol: .3 }); return; }
  OW.fieldSelection = r.idx; OW.ring = null; OW.act = fieldGen(art, target, check);
}
function updateRing() {
  const r = OW.ring; r.t++;
  if (r.mode === 'aim') { // apuntando: las flechas giran al líder; A lanza; B vuelve a la rueda
    if (hit('ring')) { OW.ring = null; Audio.sfx('cancel'); return; }
    if (hit('back')) { fieldAimBack(); return; }
    for (const d of FIELD_AIM) if (hit(d)) fieldAimStep(d);
    if (hit('ok')) { OW.dir = r.aimDir; fieldCast(); }
    return;
  }
  if (hit('back') || hit('ring')) { OW.ring = null; Audio.sfx('cancel'); return; }
  const step = hit('right') || hit('down') ? 1 : hit('left') || hit('up') ? -1 : 0;
  if (step) { r.idx = (r.idx + step + FIELD.length) % FIELD.length; r.notice = null; r.pickAt = r.t; Audio.sfx('cursor', { semi: [0, 4, 7, 2, 5, 9][r.idx] }); }
  if (hit('ok')) fieldAim();
}
function fieldArtIcon(art, x, y, r, dim) {
  const col = dim ? '#8d8276' : C(art.color);
  if (art.kind === 'color') { paintDab(x, y, r, col); g.drawImage(iconSprite(art.tool, dim ? '#bdb3a4' : ramp(col).hi), Math.round(x - 6), Math.round(y - 6), 12, 12); return; }
  paintDab(x, y, r, dim ? '#8d8276' : '#e8dcc0');
  if (art.kind === 'borrar') { const s = r / 9; g.fillStyle = '#241e32'; g.fillRect(Math.round(x - 6 * s), Math.round(y - 3 * s), Math.round(12 * s), Math.round(7 * s)); g.fillStyle = dim ? '#bdb3a4' : '#f0b8b5'; g.fillRect(Math.round(x - 5 * s), Math.round(y - 2 * s), Math.round(6 * s), Math.round(5 * s)); g.fillStyle = dim ? '#a89c8c' : '#8ab0d8'; g.fillRect(Math.round(x + 1 * s), Math.round(y - 2 * s), Math.round(4 * s), Math.round(5 * s)); }
  else if (art.kind === 'trazar') { const s = r / 9; g.fillStyle = dim ? '#9a8f83' : '#4a4460'; g.fillRect(Math.round(x - 7 * s), Math.round(y + 3 * s), Math.round(14 * s), 1); g.fillStyle = dim ? '#9a8f83' : '#c5848b'; g.fillRect(Math.round(x - 8 * s), Math.round(y + 1 * s), 2, 3); g.fillRect(Math.round(x + 7 * s), Math.round(y + 1 * s), 2, 3); g.drawImage(iconSprite('lapiz', dim ? '#bdb3a4' : C('amarillo')), Math.round(x - 5), Math.round(y - 8), 10, 10); }
  else { g.fillStyle = dim ? '#9a8f83' : '#6fb4d8'; g.beginPath(); g.moveTo(x, y - r * .7); g.lineTo(x + r * .45, y + r * .1); g.arc(x, y + r * .15, r * .45, 0, Math.PI); g.closePath(); g.fill(); g.fillStyle = '#e8f6fb'; g.fillRect(Math.round(x - r * .2), Math.round(y - r * .05), 1, 2); }
}
// El color de la pintura de cada magia: los colores primarios son el suyo; el lápiz, grafito; la goma, rosa; el agua, agua.
function fieldArtPaint(art) { return art.kind === 'color' ? C(art.color) : art.kind === 'trazar' ? '#6a6480' : art.kind === 'borrar' ? '#e88aa0' : '#6fb4d8'; }
// ---- La paleta de campo: la misma paleta de madera del combate, sostenida abajo como en la mano. Seis pocillos, uno por
// magia; el pincel moja en el elegido. Arriba, siempre en el mismo sitio, la ficha: qué es, quién la pinta y cuánto gasta.
// En el mapa, cada sitio donde sirve lleva una chincheta de pintura con su herramienta.
const FP = { x: 57, y: 138, w: 206, h: 50, hole: [241, 21] }; // se sale por abajo de la pantalla, como agarrada
function fieldWell(i) { return [FP.x + 24 + i * 29, FP.y + 19 - Math.round(Math.sin(i / (FIELD.length - 1) * Math.PI) * 3)]; }
function fieldPalettePath(q, x, y, grow = 0) {
  const cx = x + FP.w / 2, cy = y + FP.h / 2 + 2, rx = FP.w / 2 + grow, ry = FP.h / 2 + grow, n = 3.4;
  q.beginPath();
  for (let i = 0; i <= 56; i++) { const a = i / 56 * 6.283, c = Math.cos(a), s = Math.sin(a), X = cx + rx * Math.sign(c) * Math.abs(c) ** (2 / n), Y = cy + ry * Math.sign(s) * Math.abs(s) ** (2 / n); if (i) q.lineTo(X, Y); else q.moveTo(X, Y); }
  q.closePath(); const hx = x + FP.hole[0], hy = y + FP.hole[1], hr = Math.max(2, 7 - grow * .6); q.moveTo(hx + hr, hy); q.ellipse(hx, hy, hr, hr * .72, 0, 0, 6.283);
}
function fieldPaletteWood() {
  return cached('field-palette-wood', () => {
    const c = document.createElement('canvas'); c.width = FP.w + 8; c.height = FP.h + 10; const q = c.getContext('2d'), X = 3, Y = 3;
    q.save(); q.translate(1, 3); fieldPalettePath(q, X, Y, 1); q.fillStyle = 'rgba(20,16,28,.45)'; q.fill('evenodd'); q.restore();
    fieldPalettePath(q, X, Y, 1); q.fillStyle = '#201926'; q.fill('evenodd');
    fieldPalettePath(q, X, Y); q.fillStyle = '#77492f'; q.fill('evenodd');
    q.save(); q.translate(-1, -1); fieldPalettePath(q, X, Y, -1.5); q.fillStyle = '#e6be83'; q.fill('evenodd'); q.restore();
    fieldPalettePath(q, X, Y, -2.5); q.fillStyle = '#c39660'; q.fill('evenodd');
    q.save(); fieldPalettePath(q, X, Y, -2.5); q.clip('evenodd'); // la veta rodea el agujero; pintura vieja seca entre los pocillos
    for (let i = 0; i < 10; i++) { q.strokeStyle = i % 2 ? '#cda266' : '#b3834f'; q.lineWidth = 1; q.beginPath(); q.ellipse(X + FP.hole[0], Y + FP.hole[1], 14 + i * 17, 7 + i * 5, -.04, 1.75, 4.55); q.stroke(); }
    [['#ac554b', 40, 38, 5], ['#6a8d85', 96, 40, 4], ['#967287', 150, 37, 4], ['#e8cc94', 70, 42, 3], ['#5c7fa6', 180, 41, 3], ['#c49a52', 124, 44, 4]].forEach(([col, px, py, r]) => { q.globalAlpha = .5; q.fillStyle = col; q.beginPath(); q.ellipse(X + px, Y + py, r * 1.5, r * .55, .15, 0, 6.29); q.fill(); q.globalAlpha = 1; q.fillStyle = ramp(col).hi; q.fillRect(X + px - 1, Y + py - 1, 2, 1); });
    q.restore();
    q.strokeStyle = '#4a2e20'; q.lineWidth = 1; q.beginPath(); q.ellipse(X + FP.hole[0] + .5, Y + FP.hole[1] + .5, 6.5, 4.8, 0, 3.4, 6.2); q.stroke(); q.strokeStyle = '#e6be83'; q.beginPath(); q.ellipse(X + FP.hole[0], Y + FP.hole[1], 7.5, 5.4, 0, .3, 2.7); q.stroke();
    return c;
  });
}
// Una chincheta de pintura clavada sobre algo del mapa: la herramienta de la magia, en una gota con la punta hacia abajo.
function fieldPin(art, x, y, s, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; x = Math.round(x); y = Math.round(y);
  g.fillStyle = KIT_INK; g.beginPath(); g.moveTo(x - 4, y + s - 3); g.lineTo(x + 4, y + s - 3); g.lineTo(x, y + s + 4); g.fill();
  g.fillStyle = fieldArtPaint(art); g.beginPath(); g.moveTo(x - 2, y + s - 3); g.lineTo(x + 2, y + s - 3); g.lineTo(x, y + s + 2); g.fill();
  fieldArtIcon(art, x, y, s, false); g.restore();
}
// Esquinas de pintura alrededor de un objetivo del mapa
function fieldMarkBox(target) { const xs = target.tiles.map(q => q[0]), ys = target.tiles.map(q => q[1]); return { x: (Math.min(...xs) + Math.max(...xs) + 1) / 2 * TILE - OW.cam.x, y: (Math.min(...ys) + Math.max(...ys) + 1) / 2 * TILE - OW.cam.y, w: (Math.max(...xs) - Math.min(...xs) + 1) * 8 + 3, h: (Math.max(...ys) - Math.min(...ys) + 1) * 8 + 3 }; }
function fieldMark(target, col, alpha = 1, pulse = 0) {
  const b = fieldMarkBox(target); g.save(); g.globalAlpha = alpha;
  for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const X = b.x + a * (b.w + pulse), Y = b.y + c * (b.h + pulse); pstroke(X, Y, X - a * 5, Y, 2, '#241e32', 1, 0, false); pstroke(X, Y, X, Y - c * 5, 2, '#241e32', 1, 0, false); pstroke(X - a, Y - c, X - a * 5, Y - c, 1, col, 1, 0, false); pstroke(X - a, Y - c, X - a, Y - c * 5, 1, col, 1, 0, false); }
  g.restore(); return b;
}
function drawRing() {
  UI_HITS.length = 0; UI_TEXT.length = 0;
  const r = OW.ring, shake = Prefs.shake, art = FIELD[r.idx], paint = fieldArtPaint(art), rp = ramp(paint), cache = fieldRingCache(r), opts = cache.opts[r.idx], valid = opts.filter(o => o.check.ok), able = fieldOk(art) && fieldAfford(art), aiming = r.mode === 'aim';
  const ease = q => shake ? easeBack(clamp(q, 0, 1)) : 1, intro = ease(r.t / 14), aimK = shake ? (aiming ? clamp((r.t - r.aimAt) / 10, 0, 1) : r.backAt != null ? 1 - clamp((r.t - r.backAt) / 10, 0, 1) : 0) : aiming ? 1 : 0;
  const lx = Math.round(OW.x - OW.cam.x), ly = Math.round(OW.y - OW.cam.y - 8), cur = aiming ? valid.find(o => o.dir === r.aimDir) || valid[0] : null;
  // el tiempo se detiene: el papel se oscurece hacia los bordes y queda la luz alrededor del líder, teñida de la magia
  const veil = g.createRadialGradient(lx, ly, 18, lx, ly, 170); veil.addColorStop(0, 'rgba(28,20,36,.08)'); veil.addColorStop(1, 'rgba(28,20,36,' + (.58 * Math.min(1, r.t / 8 + (shake ? 0 : 1))).toFixed(2) + ')');
  g.fillStyle = veil; g.fillRect(0, 0, W, H); g.save(); g.globalAlpha = .1; g.fillStyle = paint; g.fillRect(0, 0, W, H); g.restore();
  // dónde sirve: chinchetas de pintura sobre cada sitio; al apuntar, el elegido late y los demás esperan
  if (able) valid.forEach((o, i) => { const sel = o === cur, b = fieldMark(o.target, paint, aiming && !sel ? .45 : .9 * intro, sel && shake ? Math.round(Math.sin(r.t * .22) * 1.5) : 0), bob = shake ? Math.round(Math.sin(r.t * .12 + i * 1.7) * 2) : 0; if (!sel) fieldPin(art, b.x, b.y - b.h - 13 + bob, 5, aiming ? .5 : intro); });
  if (aiming && cur) { valid.forEach(o => { if (o === cur) return; const b = fieldMarkBox(o.target), hx = clamp(Math.round(b.x - b.w - 6), 0, W - 1), hy = clamp(Math.round(b.y - b.h - 20), 0, H - 1); uiHit(hx, hy, Math.min(W - hx, b.w * 2 + 12), Math.min(H - hy, b.h * 2 + 26), () => fieldAimTo(o.dir)); }); drawFieldAim(r, art, cur, lx, ly, aimK); }
  drawFieldPalette(r, intro, aimK);
  drawFieldCard(r, art, able, valid, cur, intro);
}
// La paleta con sus pocillos. Al apuntar se baja fuera de la vista; al volver, sube.
function drawFieldPalette(r, intro, aimK) {
  const shake = Prefs.shake, art = FIELD[r.idx], paint = fieldArtPaint(art), cache = fieldRingCache(r), denied = r.deniedAt != null && r.t - r.deniedAt < 14 && shake ? Math.sin((r.t - r.deniedAt) * 1.6) * (1 - (r.t - r.deniedAt) / 14) * 3 : 0;
  const dy = Math.round((1 - intro) * 60 + aimK * 62), dx = Math.round(denied), pickNow = r.mode !== 'aim';
  // los pocillos se tocan siempre en su sitio final, aunque la paleta aún esté entrando
  if (pickNow) FIELD.forEach((a, i) => { const [X, Y] = fieldWell(i); uiHit(X - 13, Y - 12, 26, 24, () => { if (r.idx === i) fieldAim(); else { r.idx = i; r.notice = null; r.pickAt = r.t; Audio.sfx('cursor'); } }, () => { if (r.idx !== i) { r.idx = i; r.notice = null; r.pickAt = r.t; Audio.sfx('cursor', { vol: .3 }); } }); });
  if (dy >= 60) return;
  g.save(); g.translate(dx, dy); const cxp = FP.x + FP.w / 2, cyp = FP.y + FP.h / 2; g.translate(cxp, cyp); g.rotate((1 - intro) * .12 - aimK * .05); g.translate(-cxp, -cyp);
  g.drawImage(fieldPaletteWood(), FP.x - 3, FP.y - 3);
  FIELD.forEach((a, i) => {
    const [X, Y] = fieldWell(i), sel = i === r.idx, near = cache.opts[i].filter(o => o.check.ok).length, usable = fieldOk(a) && fieldAfford(a), grow = shake ? clamp((r.t - 3 - i * 2) / 6, 0, 1) : 1, pop = sel && shake ? Math.round(artPop(r.pickAt ?? -99) * 2) : 0;
    // el pocillo, hundido en la madera
    g.fillStyle = '#4a2e20'; g.beginPath(); g.ellipse(X, Y + 2, 12, 9, 0, 0, 6.29); g.fill(); g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(X, Y + 2, 11, 8, 0, 0, 6.29); g.fill(); g.fillStyle = '#e6be83'; g.fillRect(X - 6, Y + 10, 12, 1);
    if (grow <= 0) return;
    if (!usable) { paintDab(X, Y + 1, 7 * grow, '#b8ad9d'); g.fillStyle = '#8d8276'; g.fillRect(X - 3, Y, 3, 1); g.fillRect(X, Y + 1, 1, 2); g.fillRect(X + 1, Y + 3, 3, 1); g.save(); g.globalAlpha = .55; fieldArtIcon(a, X, Y, 6 * grow, true); g.restore(); } // seca y cuarteada: sin pintura o sin quien la pinte
    else fieldArtIcon(a, X, Y - (sel ? 2 : 0) - pop, (sel ? 8 : 7) * grow, false);
    if (sel) { g.save(); g.globalAlpha = .7 + (shake ? .3 * Math.sin(r.t * .2) : .3); g.strokeStyle = usable ? '#fff3d8' : '#d8cfc0'; g.lineWidth = 1; g.beginPath(); g.ellipse(X + .5, Y + 1.5, 13, 10, 0, 0, 6.29); g.stroke(); g.restore(); }
    if (usable && near && grow >= 1) { const tx = X + 9, ty = Y - 9; paintDab(tx, ty, 4, '#fff3d8'); smallText(String(near), tx - 2, ty - 4, '#3a2f2a'); } // cuántos sitios hay cerca
  });
  // el pincel moja en el pocillo elegido: sube, se desliza y baja
  const [wx, wy] = fieldWell(r.idx), c = r.brush = glide(r.brush || { x: wx, y: wy }, wx, wy, .3), lift = Math.abs(c.x - wx) > 2 ? Math.min(6, Math.abs(c.x - wx) * .3) : 0, dip = shake ? Math.round(Math.sin(r.t * .12)) : 0;
  drawProp(propSprite('pincel', FIELD[r.idx] && fieldOk(art) && fieldAfford(art) ? paint : '#b8ad9d'), c.x - 3, c.y - 4 + dip - lift, .8, 1, PROP.pincel.tip[0], PROP.pincel.tip[1], .6);
  g.restore();
}
// Apuntando: una chincheta grande de la magia salta de sitio en sitio (el cursor); del líder cae hasta ella un reguero de
// su pintura. El líder se gira hacia allí.
function drawFieldAim(r, art, cur, lx, ly, k) {
  const shake = Prefs.shake, paint = fieldArtPaint(art), rp = ramp(paint), b = fieldMarkBox(cur.target), hop = r.pin = glide(r.pin || { x: b.x, y: b.y }, b.x, b.y, .28);
  const far = Math.hypot(hop.x - b.x, hop.y - b.y), jump = far > 1 ? Math.min(14, far * .5) : 0, bob = shake ? Math.abs(Math.sin(r.t * .14)) * 3 : 0, py = hop.y - b.h - 16 - jump - bob;
  // el reguero: gotas de pintura que salen del líder y caen en el sitio
  const sx = lx, sy = ly - 4, mx = (sx + hop.x) / 2, my = Math.min(sy, hop.y) - 14;
  for (let i = 0; i < 14; i++) { const q = ((i + (shake ? r.t * .12 : 0)) % 14) / 14, e = q * k, u = 1 - e, px = u * u * sx + 2 * u * e * mx + e * e * hop.x, pyy = u * u * sy + 2 * u * e * my + e * e * hop.y; g.globalAlpha = .3 + q * .65; g.fillStyle = i % 3 ? paint : rp.hi; const sz = q > .5 ? 2 : 1; g.fillRect(Math.round(px), Math.round(pyy), sz, sz); } g.globalAlpha = 1;
  // donde caerá: una mancha húmeda que se abre y late
  const sp = shake ? .85 + .15 * Math.sin(r.t * .2) : 1; g.save(); g.globalAlpha = .35 * k; g.fillStyle = paint; g.beginPath(); g.ellipse(b.x, b.y + 1, b.w * .8 * sp, b.h * .55 * sp, 0, 0, 6.29); g.fill(); g.restore();
  // la sombra y la chincheta
  g.save(); g.globalAlpha = .35; g.fillStyle = KIT_INK; g.beginPath(); g.ellipse(Math.round(hop.x), Math.round(hop.y - b.h - 3), 5 - Math.min(3, (jump + bob) * .2), 2, 0, 0, 6.29); g.fill(); g.restore();
  fieldPin(art, hop.x, py, 9, k);
  // tocar el sitio lo lanza
  const hx = clamp(Math.round(b.x - b.w - 6), 0, W - 1), hy = clamp(Math.round(b.y - b.h - 26), 0, H - 1);
  uiHit(hx, hy, Math.min(W - hx, b.w * 2 + 12), Math.min(H - hy, b.h * 2 + 32), () => { OW.dir = r.aimDir; fieldCast(); });
}
// La ficha de arriba: siempre en el mismo sitio. Eligiendo dice qué es la magia; apuntando, a qué se lanza y qué saldrá.
function drawFieldCard(r, art, able, valid, cur, intro) {
  const shake = Prefs.shake, paint = fieldArtPaint(art), owners = fieldOwners(art), aiming = r.mode === 'aim' && cur, y = Math.round(4 - (1 - intro) * 44);
  g.save(); g.translate(0, y - 4);
  maskingLabel(6, 4, 308, 34, '#f7efd6'); brushBand(8, 6, 4, 30, paint);
  fieldArtIcon(art, 23, 19, 9, !able);
  const head = aiming ? art.name + ' → ' + cur.target.name : art.name; smallText(head, 37, 8, able ? UI_INK : UI_MUTED);
  if (!aiming) { let ox = 37 + textWidth(head) + 8; owners.forEach(p => { const s = effStats(p); sticker(ox + 5, 12, { id: p.id, color: p.color, alive: p.cur.hp > 0, hp: p.cur.hp, maxhp: s.hp, mp: p.cur.mp, maxmp: s.mp }, 5); tubeGauge(ox + 12, 7, p.cur.mp / s.mp, C(p.color), p.cur.mp < art.mp); smallText('-' + art.mp, ox + 33, 8, p.cur.mp >= art.mp ? UI_MUTED : '#9c4539'); ox += 48; }); }
  let note, noteX = 37, noteW = 196;
  if (aiming) {
    const sk = cur.target.kind === 'sketch' && art.kind === 'color' ? cur.target.sketch : null, have = sk ? Game.puzzle.paint[sk.id] || [] : [], cname = c => (DATA.colors[c]?.name || c).toLowerCase();
    note = r.notice || (sk ? (cur.check.mix === sk.color ? '¡Justo el ' + cname(sk.color) + ' que pide! Se volverá real.' : cur.check.mix === 'barro' ? 'Saldrá barro. Pide ' + cname(sk.color) + '.' : 'Quedará ' + cname(cur.check.mix) + '. Pide ' + cname(sk.color) + '.') : art.desc);
    if (sk && have.length) { const all = [...(Game.puzzle.paint[cur.target.sketch.id] || []), art.color]; let x = 41; all.forEach((c, i) => { paintDab(x, 25, 3, C(c)); x += i < all.length - 1 ? 8 : 0; }); g.fillStyle = UI_MUTED; g.fillRect(x + 6, 23, 4, 1); g.fillRect(x + 6, 25, 4, 1); paintDab(x + 16, 25, 4, cur.check.mix === 'barro' ? '#78644d' : C(cur.check.mix || art.color)); noteX = x + 25; noteW = 233 - noteX; } // la mezcla que saldrá
    if (valid.length > 1) valid.forEach((o, i) => paintDab(226 - (valid.length - 1 - i) * 6, 31, o === cur ? 2 : 1.4, o === cur ? paint : '#b3a898')); // cuál de los sitios
  } else note = r.notice || (able ? art.desc : fieldCheck(art, null).why);
  const noteAt = artObserve('field-card', note + (aiming ? cur.target.id : r.idx));
  paragraph(note, noteX, 19, noteW, r.notice ? '#9c4539' : UI_MUTED, 2, { progress: shake ? (ARTUI.t - noteAt) * 2.4 : Infinity, wet: r.notice ? '#c4384a' : paint });
  if (aiming) {
    artButton('field-go', battleKey('ok') + ' lanzar', 240, 7, 68, 14, paint, () => { OW.dir = r.aimDir; fieldCast(); }, { selected: true });
    artButton('field-back', battleKey('back') + ' volver', 240, 23, 68, 12, '#d2bc95', fieldAimBack);
  } else {
    artButton('field-aim', battleKey('ok') + ' apuntar', 240, 7, 68, 14, paint, fieldAim, { disabled: !able || !valid.length, selected: able && valid.length > 0 });
    artButton('field-close', battleKey('back') + ' cerrar', 240, 23, 68, 12, '#d2bc95', () => { OW.ring = null; Audio.sfx('cancel'); });
  }
  g.restore();
}
// ---- Usar una magia: la gota alza su color, la herramienta va hasta el objeto y actúa. El estado cambia al llegar.
function fieldCasterPosition(owner) { const i = Party.indexOf(owner), h = OW.hist[Math.min(OW.hist.length - 1, i * 12)]; return i === 0 ? [OW.x, OW.y] : h ? [...h] : [OW.x - i * 12, OW.y]; }
function* fieldGen(art, target, check) {
  const z = Game.puzzle, owners = fieldOwners(art), col = C(art.color), T = DATA.puzzle.things;
  const s = { art, target, check, from: [OW.x, OW.y - 12], aim: [target.hitX ?? target.x, target.hitY ?? target.y], t: 0, col };
  if (art.kind === 'trazar') { const q = target.pair, other = q.pins[1 - target.pin], here = q.pins[target.pin]; s.aim = fieldTile(...here); s.aim2 = fieldTile(...other); }
  OW.moving = false; OW.vx = OW.vy = 0; OW.fieldCast = s; OW.cast = { p: owners[0], x: OW.x, y: OW.y, col, aura: 1 };
  owners.forEach(q => q.cur.mp -= art.mp);
  Audio.sfx('charge', { semi: SEMI[owners[0].id] || 0, vol: .45 });
  const dur = { color: 76, trazar: 92, borrar: 84, aguada: 96 }[art.kind];
  let committed = false; const id = target.sketch?.id || target.pair?.id || target.id;
  const commit = () => {
    if (committed) return; committed = true;
    if (art.kind === 'color') { const have = [...(z.paint[id] || []), art.color]; z.paint[id] = have; if (fieldMixOf(have) === target.sketch.color) z.real[id] = true; }
    if (art.kind === 'trazar') z.lines[id] = true;
    if (art.kind === 'borrar') { if (check.erase === 'line') delete z.lines[id]; else if (check.erase === 'paint') z.paint[id] = []; else z.erased[id] = true; }
    if (art.kind === 'aguada') z.washed[id] = true;
  };
  try {
    // Invocación: el líder se eleva y se ilumina, un círculo mágico se dibuja en el suelo, sube una columna de luz y se
    // manifiesta el espíritu de la herramienta. Sólo entonces la magia sale hacia el objeto.
    // Un compás traza el círculo a grafito y la acuarela lo inunda; encima, la herramienta se dibuja a lápiz, se llena de
    // su color como un boceto que se vuelve real y salta del papel. Sólo entonces coge impulso y sale.
    const INV = FIELD_INV, semi = SEMI[owners[0].id] || 0; Audio.sfx('scratch_long', { vol: .35 }); Audio.sfx('charge', { semi: 12, vol: .25, when: .2 });
    for (let i = 0; i < INV; i++) { s.inv = i; s.t = -1; const q = i / INV; OW.cast.lift = Math.sin(Math.min(1, q * 1.4) * Math.PI / 2) * 7; OW.cast.glow = q;
      if (i === 13) Audio.sfx('brush_hiss', { vol: .35 }); if (i === 17 || i === 22 || i === 26) Audio.sfx('scratch', { vol: .3, semi: (i - 17) / 2 });
      if (i === 29) Audio.sfx('brush_sweep', { vol: .4 }); if (i === 39) { Audio.sfx('mix_bell', { vol: .5, semi }); Audio.sfx('shimmer', { vol: .45 }); if (Prefs.shake) OW.shake = 1; }
      yield; }
    s.inv = INV; const launch = art.kind === 'aguada' ? 14 : 16;
    for (let t = 0; t < dur; t++) {
      s.t = t; OW.cast.aura = Math.max(0, 1 - t / 30); OW.cast.lift = Math.max(0, 7 - t * .4); OW.cast.glow = Math.max(0, 1 - t / 16); s.inv = INV + t;
      if (t === launch - 3) Audio.sfx('whip', { vol: .5 });
      if (Prefs.shake && ((art.kind === 'color' && t === 44) || (art.kind === 'trazar' && t === 70) || (art.kind === 'aguada' && t === 40))) OW.shake = 2; // el golpe de la magia se nota
      if (t === dur - 14) Audio.sfx('tinkle', { vol: .3, semi: semi + 12 }); // la pintura sobrante vuelve a quien la puso
      if (t === 16) Audio.sfx(art.kind === 'color' ? 'brush_sweep' : art.kind === 'trazar' ? 'scratch_long' : art.kind === 'borrar' ? 'rub' : 'brush_hiss', { vol: .6 });
      if (art.kind === 'color' && t === 34) Audio.sfx('plop', { semi: -6, vol: .4 }); // se posa
      if (art.kind === 'color' && t === 38) { Audio.sfx('plop', { semi: 14, vol: .5 }); Audio.sfx('tinkle', { semi: 7, vol: .3 }); } // ¡pop! la tapa
      if (art.kind === 'color' && t === 40) Audio.sfx('brush_hiss', { vol: .45, semi: -4 }); // el chorro
      if (art.kind === 'color' && t === 44) { commit(); Audio.sfx(z.real[id] ? 'grow' : 'plop', { semi: SEMI[owners[0].id] || 0, vol: .6 }); if (z.real[id]) Audio.sfx('discovery', { vol: .4, when: .15 }); }
      if (art.kind === 'trazar') { s.draw = clamp((t - 30) / 40, 0, 1); if (t % 8 === 0 && t > 30 && t < 70) Audio.sfx('scratch', { vol: .35, semi: t / 8 }); if (t === 70) { commit(); Audio.sfx('tinkle', { semi: 4, vol: .5 }); } }
      if (art.kind === 'borrar') { if (t === 33) { Audio.sfx('plop', { semi: -9, vol: .55 }); Audio.sfx('crumbs', { vol: .45 }); if (Prefs.shake) OW.shake = 1; } if (t === 71) { Audio.sfx('whip', { vol: .45, semi: 5 }); Audio.sfx('brush_hiss', { vol: .3 }); } if (t === 75) Audio.sfx('tinkle', { semi: 16, vol: .35 }); if (t > 34 && t < 68 && t % Math.max(4, 10 - ((t - 34) / 6 | 0)) === 0) Audio.sfx('rub', { vol: .45 }); if (t % 12 === 6 && t > 24 && t < 70) Audio.sfx('crumbs', { vol: .3 }); s.fade = clamp((t - 30) / 40, 0, 1); if (t === 70) commit(); }
      if (art.kind === 'aguada') { s.wash = clamp((t - 24) / 56, 0, 1); if (t === 40) Audio.sfx('splash_clean', { vol: .5 }); if (t === 64) Audio.sfx('bubbles', { vol: .4 }); if (t === 80) commit(); }
      yield;
    }
    commit();
    const mix = art.kind === 'color' ? fieldMixOf(z.paint[id]) : null;
    fieldNotice(art.kind === 'color' ? (z.real[id] ? T.sketch.done : mix === 'barro' ? 'Se ha hecho barro. Borra el color y vuelve a probar.' : 'El boceto se tiñe de ' + mix + '. ' + (z.paint[id].length === 1 ? 'Aún no es el color que pide.' : 'No es el color que pide: bórralo.')) : art.kind === 'trazar' ? T.pin.done : art.kind === 'borrar' ? (check.erase === 'line' ? 'La línea se borra.' : check.erase === 'paint' ? 'La goma levanta el color: el boceto vuelve a estar limpio.' : T.scribble.done) : T.puddle.done);
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
// Un cofre del mapa: se abre la tapa, sale lo que guarda y queda abierto.
function* openChestGen(t) {
  const z = Game.puzzle, loot = DATA.chests[t.tx + ',' + t.ty] || { item: 'gota_agua', n: 1 }; if (z.looted[t.id]) return;
  OW.moving = false; OW.vx = OW.vy = 0; z.lid = { id: t.id, k: 0 };
  try { for (let i = 0; i <= 34; i++) { z.lid.k = clamp(i / 14, 0, 1); z.lid.rise = clamp((i - 12) / 20, 0, 1); if (i === 2) Audio.sfx('page'); if (i === 14) Audio.sfx('discovery', { vol: .5 }); yield; } }
  finally { z.looted[t.id] = true; z.lid = null; Game.inventory[loot.item] = (Game.inventory[loot.item] || 0) + loot.n; }
  OW.msg = { lines: ['Has encontrado ' + (loot.n > 1 ? loot.n + ' × ' : '') + DATA.items[loot.item].name + '.', DATA.items[loot.item].desc], t: 0 };
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
// ---- Dibujo de las piezas, estén donde estén
function fieldInkTile(tx, ty, cx, cy) { const x = tx * TILE - cx, y = ty * TILE - cy; g.fillStyle = '#282536'; g.fillRect(x, y, 16, 16); g.fillStyle = '#474157'; g.fillRect(x + 3, y + ((OW.t / 4 + ty * 3 + tx) % 14 | 0), 5, 1); g.fillRect(x + 10, y + ((OW.t / 5 + ty * 7 + tx * 2) % 14 | 0), 3, 1);
  const ink = (a, b) => fieldGroups().inkSet.has((tx + a) + ',' + (ty + b)); g.fillStyle = '#f2e8d2'; // borde de papel rasgado donde la tinta toca el suelo
  for (let i = 0; i < 16; i += 3) { if (!ink(0, -1)) g.fillRect(x + i, y - 1 + (i % 2), 2, 1); if (!ink(0, 1)) g.fillRect(x + i + 1, y + 16 - (i % 2), 2, 1); if (!ink(-1, 0)) g.fillRect(x - 1 + (i % 2), y + i, 1, 2); if (!ink(1, 0)) g.fillRect(x + 16 - (i % 2), y + i + 1, 1, 2); } }
function drawFieldPuzzle(ents, cx, cy, pal) {
  const G = fieldGroups(); if (!Game.puzzle || !G || Game.page >= 1) return;
  const z = Game.puzzle, p = MAP.pz, s = OW.fieldCast, vis = (tx, ty) => tx * TILE - cx > -32 && tx * TILE - cx < W + 16 && ty * TILE - cy > -32 && ty * TILE - cy < H + 16;
  for (const [tx, ty] of p.ink) if (vis(tx, ty)) fieldInkTile(tx, ty, cx, cy);
  // garabatos: una maraña de grafito sobre el suelo; la goma la va levantando
  for (const sc of G.scribbles) { if (z.erased[sc.id]) continue; const fade = s && s.art.kind === 'borrar' && s.target.id === sc.id ? s.fade || 0 : 0;
    for (const [tx, ty] of sc.tiles) { if (!vis(tx, ty)) continue; const x = tx * TILE - cx, y = ty * TILE - cy, rnd = seeded(tx * 31 + ty * 7); g.save(); g.globalAlpha = 1 - fade; let px = x + 3, py = y + 4;
      for (let i = 0; i < 20; i++) { const nx = x + 1 + rnd() * 14, ny = y + 1 + rnd() * 14; pstroke(px, py, nx, ny, i % 4 ? 1 : 2, i % 3 ? '#4a4460' : '#2a2438', 1, 0, false); px = nx; py = ny; } g.restore(); } }
  // chinchetas y líneas de grafito
  for (const q of G.pairs) { const drawing = s && s.art.kind === 'trazar' && s.target.pair === q, k = drawing ? s.draw || 0 : z.lines[q.id] ? 1 : 0;
    if (k > 0) { const from = fieldTile(...q.pins[drawing ? s.target.pin : 0]), to = fieldTile(...q.pins[drawing ? 1 - s.target.pin : 1]), fx = from[0] - cx, fy = from[1] - cy + 2, ex = lerp(fx, to[0] - cx, k), ey = lerp(fy, to[1] - cy + 2, k), vert = q.pins[0][0] === q.pins[1][0];
      const off = (d, c, w) => vert ? pstroke(fx + d, fy, ex + d, ey, w, c, 1, 0, false) : pstroke(fx, fy + d, ex, ey + d, w, c, 1, 0, false);
      off(-2, '#2a2438', 1); off(-1, '#6a6480', 3); off(0, '#9a98b0', 1); off(2, '#2a2438', 1); } // una tabla de grafito de tres trazos, con su sombra
    for (const [tx, ty] of q.pins) { if (!vis(tx, ty)) continue; const x = tx * TILE + 8 - cx, y = ty * TILE + 10 - cy; ents.push({ y: ty * TILE + 12, draw: () => { g.fillStyle = 'rgba(34,25,46,.3)'; g.fillRect(x - 3, y + 2, 7, 2); g.fillStyle = '#8c8ab0'; g.fillRect(x, y - 4, 1, 5); g.fillStyle = '#241e32'; g.fillRect(x - 3, y - 8, 7, 5); g.fillStyle = '#c5484b'; g.fillRect(x - 2, y - 7, 5, 3); g.fillStyle = '#f08a80'; g.fillRect(x - 2, y - 7, 2, 1); } }); } }
  // bocetos: líneas grises sin cuerpo; se tiñen con cada color y, con el que piden, se vuelven reales en su color
  for (const sk of G.sketches) { const real = z.real[sk.id], mix = fieldMixOf(z.paint[sk.id] || []), col = C(sk.color), rp = ramp(col), vert = sk.tiles.length > 1 && sk.tiles[0][0] === sk.tiles[1][0];
    for (const [tx, ty] of sk.tiles) { if (!vis(tx, ty)) continue; const x = tx * TILE - cx, y = ty * TILE - cy;
      if (real) { g.fillStyle = rp.out; g.fillRect(x, y, 16, 16); for (let i = 0; i < 16; i += 4) { g.fillStyle = (i / 4) % 2 ? rp.base : rp.hi; if (vert) g.fillRect(x + 1, y + i, 14, 3); else g.fillRect(x + i, y + 1, 3, 14); } g.fillStyle = rp.sh; if (vert) { g.fillRect(x + 1, y, 1, 16); g.fillRect(x + 14, y, 1, 16); } else { g.fillRect(x, y + 1, 16, 1); g.fillRect(x, y + 14, 16, 1); }
        if (sk.color === 'verde') { g.fillStyle = '#c9d781'; g.fillRect(x + 3, y + 5, 2, 1); g.fillRect(x + 10, y + 9, 2, 1); } continue; }
      g.save(); g.globalAlpha = .85; for (let i = 1; i < 16; i += 4) { if (vert) pstroke(x + 1, y + i, x + 15, y + i, 1, '#b8ad96', 1, 0, false); else pstroke(x + i, y + 1, x + i, y + 15, 1, '#b8ad96', 1, 0, false); }
      if (vert) { pstroke(x + 1, y, x + 1, y + 16, 1, '#b8ad96', 1, 0, false); pstroke(x + 15, y, x + 15, y + 16, 1, '#b8ad96', 1, 0, false); } else { pstroke(x, y + 1, x + 16, y + 1, 1, '#b8ad96', 1, 0, false); pstroke(x, y + 15, x + 16, y + 15, 1, '#b8ad96', 1, 0, false); }
      if (mix) { g.globalAlpha = .55; g.fillStyle = mix === 'barro' ? '#78644d' : C(mix); g.fillRect(x + 2, y + 2, 12, 12); } g.restore(); }
    if (!real) { const [tx, ty] = sk.tiles[0]; if (vis(tx, ty)) { const w = sk.color.length * 4 + 7, x = tx * TILE - cx + (sk.tiles.length === 1 ? 18 : 0), y = ty * TILE - cy - (sk.tiles.length === 1 ? -4 : 9); g.fillStyle = '#f2e8d2'; g.fillRect(x - 2, y, w, 7); g.fillStyle = col; g.fillRect(x - 2, y, 2, 7); worldTinyText(sk.color.toUpperCase(), x + 2, y + 1, rp.sh); } } } // la nota del margen: el color que pide
  // charcos de Tinta: espesos y con ojos; el agua los aclara hasta que se escurren
  for (const n of G.puddles) { if (z.washed[n.id]) continue; const w = s && s.art.kind === 'aguada' && s.target.id === n.id ? s.wash || 0 : 0;
    for (const [tx, ty] of n.tiles) { if (!vis(tx, ty)) continue; const x = tx * TILE - cx, y = ty * TILE - cy; g.save(); g.globalAlpha = 1 - w * .9; g.fillStyle = w > .3 ? '#6a6480' : '#1e1a2c'; g.beginPath(); g.ellipse(x + 8, y + 9, 9, 7, 0, 0, 6.29); g.fill(); g.fillStyle = '#3a3652'; g.fillRect(x + 4, y + 5, 4, 1); g.restore(); }
    const [tx, ty] = n.tiles[0]; if (w < .2 && (OW.t + tx * 13) % 150 > 6 && vis(tx, ty)) { g.fillStyle = '#efe4bf'; g.fillRect(tx * TILE + 5 - cx, ty * TILE + 7 - cy, 2, 2); g.fillRect(tx * TILE + 10 - cx, ty * TILE + 7 - cy, 2, 2); } }
  // cofres: una cajita de madera con cierre de latón; abierta, la tapa queda levantada
  for (const c of p.chests) { const id = 'e@' + c[0] + ',' + c[1]; if (!vis(...c)) continue; const x = c[0] * TILE + 8 - cx, y = c[1] * TILE + 12 - cy, open = z.looted[id] ? 1 : z.lid?.id === id ? z.lid.k : 0, rise = z.lid?.id === id ? z.lid.rise : 0;
    ents.push({ y: c[1] * TILE + 14, draw: () => { shadow(x, y + 2, 16); const F = (col, a, b, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x + a, y + b, w, h); }; // caja de pinturas de madera en tres cuartos, con cantoneras de latón y salpicaduras
      F('#241e32', -8, -9, 16, 11); F('#8a5a34', -7, -8, 14, 9); F('#6b4424', -7, -2, 14, 3); F('#a8784a', -7, -8, 14, 1); for (let i = -5; i < 7; i += 4) F('#6b4424', i, -7, 1, 5); // cuerpo con tablas
      F('#e8c070', -8, -9, 2, 2); F('#e8c070', 6, -9, 2, 2); F('#e8c070', -8, 0, 2, 2); F('#e8c070', 6, 0, 2, 2); F('#e8c070', -1, -6, 3, 4); F('#fff3c0', -1, -6, 1, 1); F('#241e32', 0, -4, 1, 1); // latón y cerradura
      F(C('rojo'), -5, -3, 2, 1); F(C('azul'), 3, -5, 1, 2); F(C('amarillo'), 4, -1, 2, 1); // salpicaduras
      const ly = -12 - open * 5; F('#241e32', -8, ly, 16, 4); F(open ? '#5a3a20' : '#b07a48', -7, ly + 1, 14, 2); F(open ? '#6b4424' : '#d8a870', -7, ly + 1, 14, 1); if (open) { F('#fff3c0', -6, -9, 12, 1); } // tapa (abierta, deja ver el brillo de dentro)
      if (rise > 0) { g.globalAlpha = Math.sin(rise * Math.PI); g.fillStyle = '#fff3c0'; g.fillRect(x - 1, y - 14 - rise * 12, 3, 3); g.globalAlpha = 1; } } }); }
  if (p.estuche) { const x = p.estuche[0] * TILE + 8 - cx, y = p.estuche[1] * TILE + 10 - cy;
    ents.push({ y: p.estuche[1] * TILE + 22, draw: () => { shadow(x, y + 10, 17); g.drawImage(pzSprite('estuche', pal), x - 12, y - 13);
      if (!z.opened) { g.fillStyle = '#9ec267'; g.fillRect(x - 6, y - 5, 12, 5); if (z.opening) { g.fillStyle = '#fcf2d8'; g.fillRect(x - 9 + z.zip * 18, y - 1, 2, 2); } }
      if (z.open || z.opened) { g.fillStyle = '#64536f'; g.fillRect(x - 9, y - 8 - (z.open || 1) * 6, 18, 6); g.fillStyle = '#e9dfc7'; g.fillRect(x - 9, y - 6, 18, 3); }
      if (z.rise) { const img = propSprite('pluma', C('azul')); g.save(); g.translate(x, y - z.rise * 24); g.rotate(-1.05); g.drawImage(img, -24, -8); g.restore(); } } }); }
}
// ---- Efectos al usar cada magia. Tres tiempos: la gota se carga (remolino de su color y anillo en el suelo), la herramienta
// crece por encima de ella y viaja dejando una cinta de pintura, y actúa en grande sobre el objeto con su propio impacto.
function fieldBand(x0, y0, x1, y1, w, col) { const rp = ramp(col), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let k = -w / 2; k <= w / 2; k += 1) pstroke(x0 + nx * k, y0 + ny * k, x1 + nx * k, y1 + ny * k, 1, Math.abs(k) > w / 2 - 1 ? rp.out : k < -w / 4 ? rp.hi : (Math.round(k * 3) % 3 === 0 ? rp.sh : col), 1, 0, false); } // brochazo con cerdas y canto
// Columna de luz que sube de un círculo: bandas verticales tramadas que se afinan hacia arriba, con chispas que ascienden.
function fieldPillar(x, y, w, h, col, t, alpha = 1) {
  if (alpha <= 0 || !Prefs.flash) return; const prev = g.globalAlpha, rp = ramp(col);
  for (let i = -w; i <= w; i++) { const e = 1 - Math.abs(i) / (w + 1); g.globalAlpha = prev * alpha * .55 * e * Prefs.flash; g.fillStyle = Math.abs(i) < w * .35 ? '#fff8e6' : rp.hi; g.fillRect(Math.round(x + i), Math.round(y - h * e), 1, Math.round(h * e)); }
  g.globalAlpha = prev * alpha; for (let i = 0; i < 8; i++) { const ph = ((t * 1.6 + i * 13) % 40) / 40, sx = x + Math.sin(i * 2.3 + t * .05) * w * .8, sy = y - ph * h; g.fillStyle = i % 2 ? '#fff8e6' : rp.hi; g.fillRect(Math.round(sx), Math.round(sy), 1, 2); }
  g.globalAlpha = prev;
}
// Herramienta espiritual: la misma herramienta, translúcida y con un halo de luz de su color.
function fieldSpirit(img, key, x, y, a, sc, col, alpha, tip) {
  const halo = cached('spirit|' + key + '|' + col, () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const q = c.getContext('2d'); q.drawImage(img, 0, 0); q.globalCompositeOperation = 'source-atop'; q.fillStyle = col; q.fillRect(0, 0, c.width, c.height); return c; });
  const prev = g.globalAlpha; g.globalAlpha = prev * alpha * .5; for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]]) drawProp(halo, x + ox, y + oy, a, 1, tip[0], tip[1], sc);
  g.globalAlpha = prev * alpha * .85; drawProp(img, x, y, a, 1, tip[0], tip[1], sc); g.globalAlpha = prev;
}
function fieldSpiritKind(art) { return art.kind === 'color' ? 'bote' : art.kind === 'trazar' ? 'lapiz' : art.kind === 'borrar' ? 'goma' : 'pincel'; }
function fieldSpiritColor(art) { return art.kind === 'aguada' ? '#8ec8e8' : C(art.color); }
const FIELD_INV = 46; // fotogramas de la invocación
// El boceto de una herramienta: su silueta en papel, contorno a grafito y trama en las sombras. Sale del propio sprite.
function spiritSketch(kind) {
  return cached('spirit-sketch|' + kind, () => {
    const S = SPIRITS[kind], img = spiritSprite(kind, '#c9c4d4'), c = document.createElement('canvas'); c.width = S.w; c.height = S.h; const q = c.getContext('2d');
    const src = document.createElement('canvas'); src.width = S.w; src.height = S.h; const sq = src.getContext('2d'); sq.drawImage(img, 0, 0); const d = sq.getImageData?.(0, 0, S.w, S.h)?.data; if (!d) return c;
    const A = (x, y) => x < 0 || y < 0 || x >= S.w || y >= S.h ? 0 : d[(y * S.w + x) * 4 + 3], L = (x, y) => { const i = (y * S.w + x) * 4; return (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255; };
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { if (!A(x, y)) continue; const lum = L(x, y), edge = !A(x - 1, y) || !A(x + 1, y) || !A(x, y - 1) || !A(x, y + 1);
      const seam = !edge && ((A(x + 1, y) && Math.abs(L(x + 1, y) - lum) > .09) || (A(x, y + 1) && Math.abs(L(x, y + 1) - lum) > .09)); // donde cambia el color, una línea de lápiz
      const shade = lum < .45 || y > S.h * .66, hatch = shade && (x + y) % 3 === 0;
      q.fillStyle = edge ? '#3e3852' : seam ? ((x * 7 + y * 3) % 5 ? '#6a6480' : '#8c86a0') : hatch ? '#9a94b0' : '#f4eee0'; q.fillRect(x, y, 1, 1); }
    q.fillStyle = '#8c86a0'; for (let y = 0; y < S.h; y += 5) for (let x = 0; x < S.w; x++) if (A(x, y) && !A(x - 1, y)) { q.fillRect(Math.max(0, x - 2), y, 2, 1); break; } // el trazo se pasa un poco, como a mano
    return c;
  });
}
// La herramienta a medio nacer: sk (0..1) cuánto boceto hay, pt (0..1) cuánto color lo ha inundado, con su canto húmedo.
function drawSpiritBorn(kind, color, glow, x, y, sk, pt, opt = {}) {
  if (pt >= 1) { drawSpirit(kind, color, glow, x, y, opt); return; }
  const S = SPIRITS[kind], img = spiritSprite(kind, color), sketch = spiritSketch(kind), rp = ramp(glow), f = cached('spirit-born|' + kind, () => { const c = document.createElement('canvas'); c.width = S.w; c.height = S.h; return c; }), q = f.getContext('2d');
  q.clearRect(0, 0, S.w, S.h); const sw = Math.round(sk * S.w); if (sw > 0) q.drawImage(sketch, 0, 0, sw, S.h, 0, 0, sw, S.h);
  if (pt > 0) for (let yy = 0; yy < S.h; yy++) { const e = Math.min(S.w, Math.round(pt * (S.w + 8) - 4 + Math.sin(yy * .8 + pt * 11) * 2)); if (e > 0) { q.drawImage(img, 0, yy, e, 1, 0, yy, e, 1); q.fillStyle = rp.hi; if (e < S.w) q.fillRect(e, yy, 1, 1); } } // la ola de color
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(opt.a || 0); g.scale((opt.sx || 1) * (opt.flip ? -1 : 1), opt.sy || 1); g.globalAlpha *= opt.alpha ?? 1; g.imageSmoothingEnabled = false;
  g.drawImage(f, -S.tip[0], -S.tip[1]);
  if (sk < 1 && sk > 0) { const nx = sw - S.tip[0], ny = -S.tip[1] + Math.round((Math.sin(OW.t * .9) * .5 + .5) * (S.h - 2)); g.fillStyle = '#3a3652'; g.fillRect(nx, ny, 2, 2); g.fillStyle = '#fff8e6'; g.fillRect(nx + 1, ny - 1, 1, 1); } // la punta del lápiz que lo dibuja
  g.restore();
}
// Fantasma de la herramienta en vuelo: su silueta teñida, para el rastro.
function spiritGhost(kind, color, glow, x, y, a, alpha, flip = false) {
  const S = SPIRITS[kind], img = cached('spirit-ghost|' + kind + '|' + glow, () => { const c = document.createElement('canvas'); c.width = S.w; c.height = S.h; const q = c.getContext('2d'); q.drawImage(spiritSprite(kind, color), 0, 0); q.globalCompositeOperation = 'source-atop'; q.fillStyle = glow; q.fillRect(0, 0, S.w, S.h); return c; });
  g.save(); g.globalAlpha *= alpha; g.translate(Math.round(x), Math.round(y)); g.rotate(a); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = false; g.drawImage(img, -S.tip[0], -S.tip[1]); g.restore();
}
// Cuánto hay que correr la punta para que la herramienta quede centrada sobre un punto.
function spiritCenter(kind, flip) { const S = SPIRITS[kind]; return (S.w / 2 - S.tip[0]) * (flip ? 1 : -1); }
// El compás: la aguja en el centro, el lápiz en el borde, trazando el círculo en perspectiva sobre el suelo.
function fieldCompass(x, y, r, k, alpha) {
  if (alpha <= 0) return; const ry = .42, a = -Math.PI / 2 + k * 6.283, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * ry, hx = (x + px) / 2, hy = (y + py) / 2 - 30;
  g.save(); g.globalAlpha *= alpha;
  pstroke(x, y, hx, hy, 2, '#241e32', 1, 0, false); pstroke(px, py, hx, hy, 2, '#241e32', 1, 0, false);
  pstroke(x, y - 1, hx, hy, 1, '#c9c4d4', 1, 0, false); pstroke(px, py - 1, hx, hy, 1, '#9a98b0', 1, 0, false);
  g.fillStyle = '#241e32'; g.fillRect(Math.round(hx) - 2, Math.round(hy) - 2, 5, 4); g.fillStyle = '#e8c890'; g.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 3, 2); g.fillRect(Math.round(hx), Math.round(hy) - 5, 1, 3); // bisagra y mango
  g.fillStyle = '#3a3652'; g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2); g.fillStyle = '#fff8e6'; g.fillRect(Math.round(px), Math.round(py) - 2, 1, 1);
  g.restore();
}
// El círculo de invocación: primero grafito (el compás), luego una aguada del color de quien pinta, con canto húmedo más
// oscuro, y las seis gotas del círculo cromático girando encima. draw y wash van de 0 a 1.
function fieldRosette(x, y, r, draw, wash, t, col, alpha = 1) {
  if (alpha <= 0 || r < 2) return; const ry = .42, rp = ramp(col), prev = g.globalAlpha; g.globalAlpha = prev * alpha;
  const pt = (a, rr, w = 0) => [x + Math.cos(a) * rr * (1 + w), y + Math.sin(a) * rr * ry * (1 + w)], wob = a => .06 * Math.sin(a * 5 + 1.3) + .04 * Math.sin(a * 9 + t * .02);
  if (wash > 0) { // la aguada: un anillo de acuarela que se abre desde el trazo, más claro dentro, canto oscuro
    const R = r * (.9 + .12 * wash);
    g.globalAlpha = prev * alpha * .34 * wash; g.fillStyle = col; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283, [X, Y] = pt(a, R, wob(a)); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } g.closePath(); g.fill();
    g.globalAlpha = prev * alpha * .3 * wash; g.fillStyle = rp.hi; g.beginPath(); g.ellipse(x, y, R * .55, R * .55 * ry, 0, 0, 6.29); g.fill();
    g.globalAlpha = prev * alpha * .85 * wash; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, b = (i + 1) / 40 * 6.283, [X0, Y0] = pt(a, R, wob(a)), [X1, Y1] = pt(b, R, wob(b)); pstroke(X0, Y0, X1, Y1, 1, rp.sh, 1, 0, false); }
    g.globalAlpha = prev * alpha * wash; for (let i = 0; i < 12; i++) { const a = t * .02 + i * .5236, [X0, Y0] = pt(a, R * .72), [X1, Y1] = pt(a, R * (i % 2 ? .8 : .9)); pstroke(X0, Y0, X1, Y1, 1, i % 2 ? rp.hi : '#fff8e6', 1, 0, false); } // marcas de pincel, como las horas de un reloj
    const cols = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta']; for (let i = 0; i < 6; i++) { const k = clamp(wash * 6 - i, 0, 1); if (k <= 0) break; const a = -t * .035 + i * 1.047, [X, Y] = pt(a, R * .86); paintDab(Math.round(X), Math.round(Y), 2 * (Prefs.shake ? easeBack(k) : 1), C(cols[i])); }
  }
  g.globalAlpha = prev * alpha * (1 - wash * .6); const n = Math.round(48 * draw); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / 48 * 6.283, b = -Math.PI / 2 + (i + 1) / 48 * 6.283, [X0, Y0] = pt(a, r), [X1, Y1] = pt(b, r); pstroke(X0, Y0, X1, Y1, 1, '#4a4460', 1, 0, false); } // el trazo a grafito
  if (draw > 0 && wash < 1) { g.fillStyle = '#4a4460'; g.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); } // la cruz del centro
  g.globalAlpha = prev;
}
// Una flor de acuarela que se abre en el suelo bajo el objeto: mancha irregular, clara dentro y con el canto oscuro.
function fieldBloom(x, y, r, k, col, alpha = 1, seed = 0) {
  if (k <= 0 || alpha <= 0) return; const rp = ramp(col), prev = g.globalAlpha, R = r * (Prefs.shake ? easeBack(k) : 1), ry = .5, rad = a => R * (1 + .16 * Math.sin(a * 3 + seed) + .09 * Math.sin(a * 7 + seed * 2));
  g.globalAlpha = prev * alpha * .3; g.fillStyle = col; g.beginPath(); for (let i = 0; i <= 36; i++) { const a = i / 36 * 6.283; if (i) g.lineTo(x + Math.cos(a) * rad(a), y + Math.sin(a) * rad(a) * ry); else g.moveTo(x + Math.cos(a) * rad(a), y + Math.sin(a) * rad(a) * ry); } g.closePath(); g.fill();
  g.globalAlpha = prev * alpha * .25; g.fillStyle = rp.hi; g.beginPath(); g.ellipse(x - R * .12, y - 1, R * .45, R * .45 * ry, 0, 0, 6.29); g.fill();
  g.globalAlpha = prev * alpha * .8; for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283, b = (i + 1) / 36 * 6.283; pstroke(x + Math.cos(a) * rad(a), y + Math.sin(a) * rad(a) * ry, x + Math.cos(b) * rad(b), y + Math.sin(b) * rad(b) * ry, 1, rp.sh, 1, 0, false); }
  g.globalAlpha = prev;
}
function drawFieldEffects(cx, cy) {
  const s = OW.fieldCast; if (!s) return;
  const INV = FIELD_INV, launch = s.art.kind === 'aguada' ? 14 : 16;
  { // invocación
    const inv = s.inv ?? 999, owner = fieldOwners(s.art)[0], oc = C(owner.color), paint = fieldArtPaint(s.art), x = s.from[0] - cx, y = s.from[1] - cy + 13, t = OW.t, shake = Prefs.shake;
    const out = s.t >= 0 ? clamp(s.t / 22, 0, 1) : 0, dim = Math.sin(Math.min(1, inv / 20) * Math.PI / 2) * (1 - clamp((s.t - 40) / 30, 0, 1));
    if (dim > 0) { g.fillStyle = 'rgba(24,16,36,' + (.4 * dim).toFixed(2) + ')'; g.fillRect(0, 0, W, H); } // el mundo contiene el aliento
    const draw = clamp(inv / 13, 0, 1), wash = clamp((inv - 11) / 11, 0, 1), R = 24;
    fieldRosette(x, y, R, draw, wash, t, oc, 1 - out);
    fieldCompass(x, y, R, draw, inv < 13 ? 1 : 1 - clamp((inv - 13) / 5, 0, 1));
    // la herramienta nace sobre el líder: boceto, color, y salta del papel
    const key = fieldSpiritKind(s.art), scol = key === 'goma' ? null : fieldSpiritColor(s.art), hx = x, hy = y - 44, sk = clamp((inv - 15) / 13, 0, 1), pt = clamp((inv - 27) / 11, 0, 1), popK = clamp((inv - 38) / 8, 0, 1);
    if (inv < INV) for (let i = 0; i < 12; i++) { const ph = ((inv * 1.5 + i * 9) % 30) / 30, a = i * .52 + t * .06, d = 34 * (1 - ph); g.globalAlpha = Math.min(1, ph * 3) * (1 - out); g.fillStyle = i % 3 === 0 ? '#fff8e6' : i % 2 ? oc : paint; g.fillRect(Math.round(hx + Math.cos(a) * d * 1.3), Math.round(hy + Math.sin(a) * d * .7), 2, 2); } g.globalAlpha = 1; // motas que acuden a la herramienta
    const burst = inv >= 38 && s.t < 12 ? 1 - clamp((inv - 38) / 14, 0, 1) : 0; fieldPillar(x, y, 8, 74, paint, t, burst); // al saltar del papel, una columna de luz
    if (s.t < launch && sk > 0) {
      const wind = s.t >= 0 ? Math.sin(clamp(s.t / (launch - 2), 0, 1) * Math.PI / 2) : 0, dir = Math.sign((s.aim[0] - cx) - x) || 1; // coge impulso hacia atrás antes de salir
      const bob = shake ? Math.sin(t * .15) * 2 : 0, sq = shake && popK > 0 && popK < 1 ? Math.sin(popK * Math.PI * 2) * (1 - popK) * .35 : 0, rise = shake ? (1 - (Prefs.shake ? easeBack(clamp((inv - 15) / 12, 0, 1)) : 1)) * 10 : 0;
      const flip = dir > 0, px = hx + spiritCenter(key, flip) - dir * wind * 7 + (shake && wind > .8 ? Math.sin(t * 2) : 0), py = hy + bob + rise - wind * 4;
      if (popK > 0) { g.save(); g.globalAlpha = .3; g.fillStyle = KIT_INK; g.beginPath(); g.ellipse(x, y + 1, 9, 3, 0, 0, 6.29); g.fill(); g.restore(); } // ya es real: tiene sombra
      drawSpiritBorn(key, scol, paint, px, py, sk, pt, { sx: 1 + sq, sy: 1 - sq, a: -wind * .5 * dir, flip });
      if (popK > 0 && popK < 1) { paintRing(hx, py - 6, popK, '#fff8e6', 30); if (shake) for (let i = 0; i < 10; i++) { const a = i * .628, d = 8 + popK * 26; g.globalAlpha = 1 - popK; g.fillStyle = i % 2 ? paint : '#fff8e6'; const X = Math.round(hx + Math.cos(a) * d), Y = Math.round(py - 6 + Math.sin(a) * d * .7); g.fillRect(X - 1, Y, 3, 1); g.fillRect(X, Y - 1, 1, 3); } g.globalAlpha = 1; }
      if (pt > 0 && pt < 1 && shake) for (let i = 0; i < 3; i++) { const ph = ((t * .9 + i * 10) % 24) / 24; g.fillStyle = paint; g.globalAlpha = 1 - ph; g.fillRect(Math.round(px + (flip ? -1 : 1) * (pt * SPIRITS[key].w - SPIRITS[key].tip[0] + i * 3)), Math.round(py + 4 + ph * 22), 1, 2); } g.globalAlpha = 1; // gotea el color fresco
    }
    if (inv < INV) return;
    // en el objeto: una flor de acuarela que se abre mientras la magia actúa
    if (s.t >= launch) { const ax = s.aim[0] - cx, ay = s.aim[1] - cy + 7, k2 = clamp((s.t - launch - 4) / 12, 0, 1), end = clamp((s.t - 64) / 24, 0, 1);
      fieldBloom(ax, ay, 22, k2, paint, 1 - end, s.aim[0] * .1); }
    // al final, lo que sobra vuelve: gotas que regresan en arco a quien pintó
    const dur = { color: 76, trazar: 92, borrar: 84, aguada: 96 }[s.art.kind], back = clamp((s.t - (dur - 16)) / 16, 0, 1);
    if (back > 0 && back < 1) { const ax = s.aim[0] - cx, ay = s.aim[1] - cy, lx = x, ly = y - 20; for (let i = 0; i < 6; i++) { const q = clamp(back * 1.6 - i * .1, 0, 1); if (q <= 0 || q >= 1) continue; const u = 1 - q, mx = (ax + lx) / 2, my = Math.min(ay, ly) - 26 - i * 2; g.fillStyle = i % 2 ? paint : ramp(paint).hi; g.fillRect(Math.round(u * u * ax + 2 * u * q * mx + q * q * lx), Math.round(u * u * ay + 2 * u * q * my + q * q * ly), 2, 2); } }
  }
  const t = s.t, col = s.col, rp = ramp(col), fx = s.from[0] - cx, fy = s.from[1] - cy, ax = s.aim[0] - cx, ay = s.aim[1] - cy, k = s.art.kind, shake = Prefs.shake, paint = fieldArtPaint(s.art), pr = ramp(paint);
  const owner = fieldOwners(s.art)[0], oc = C(owner.color);
  // 1) carga: anillo de pintura en el suelo, remolino que sube y un destello en la cabeza del líder
  if (t < 0) return;
  const faceR = ax > fx, fl = A => faceR ? -A : A, sx0 = fx + spiritCenter(fieldSpiritKind(s.art), faceR), arc = q => { const sy = fy - 31, mx = (fx + ax) / 2, my = Math.min(sy, ay) - 24, u = 1 - q; return [u * u * sx0 + 2 * u * q * mx + q * q * ax, u * u * sy + 2 * u * q * my + q * q * (ay - 8)]; }; // sale de donde nació la herramienta
  const ghosts = (q, kind, gcol, glow, a) => { if (!shake) return; for (let j = 3; j >= 1; j--) { const [gx, gy] = arc(Math.max(0, q - j * .08)); spiritGhost(kind, gcol, glow, gx, gy, fl(a), .22 * (4 - j) / 3, faceR); } };
  const trail = (q, w, c) => { const n = 10; let prev = arc(Math.max(0, q - .35)); for (let i = 1; i <= n; i++) { const qq = Math.max(0, q - .35 + .35 * i / n), p = arc(qq); pstroke(prev[0], prev[1], p[0], p[1], Math.max(1, w * i / n), c, 1, 0, false); prev = p; } };
  if (k === 'color') { // el bote vuela dando una voltereta, salta la tapa, se vuelca y un chorro espeso empapa el boceto
    const dir = faceR ? 1 : -1, lipX = ax - dir * 7, lipY = ay - 36, sy0 = fy - 31, E = q => 1 - (1 - q) ** 3;
    const arcB = q => { const mx = (sx0 + lipX) / 2, my = Math.min(sy0, lipY) - 20, u = 1 - q; return [u * u * sx0 + 2 * u * q * mx + q * q * lipX, u * u * sy0 + 2 * u * q * my + q * q * lipY]; };
    if (t >= 16 && t < 34) { const q = (t - 16) / 18, e = E(q), [x, y] = arcB(e), spin = shake ? dir * e * 6.283 : 0; // vuela y da una vuelta entera
      if (shake) for (let j = 3; j >= 1; j--) { const [gx, gy] = arcB(E(Math.max(0, q - j * .07))); spiritGhost('bote', col, rp.hi, gx, gy, dir * E(Math.max(0, q - j * .07)) * 6.283, .2 * (4 - j) / 3, faceR); }
      drawSpirit('bote', col, rp.hi, x, y, { a: spin, flip: faceR }); }
    // el vuelco: se asienta, coge aire, se inclina (en torno al labio) y al final se sacude y se endereza
    const tilt = t < 34 ? 0 : t < 38 ? -.18 * Math.sin((t - 34) / 4 * Math.PI) : t < 46 ? (shake ? easeBack(clamp((t - 38) / 8, 0, 1)) : 1) * 1.95 : t < 56 ? 1.95 + Math.sin(t * .8) * .04 : t < 63 ? 1.95 + Math.sin((t - 56) * 2.2) * .22 * (1 - (t - 56) / 7) : t < 70 ? 1.95 * (1 - E((t - 63) / 7)) : 0;
    const land = t >= 34 && t < 38 ? Math.sin((t - 34) / 4 * Math.PI) : 0, gone = clamp((t - 69) / 7, 0, 1);
    // el charco y la corona de salpicaduras donde cae
    if (t >= 43) { const q = clamp((t - 43) / 10, 0, 1), fade = 1 - clamp((t - 62) / 14, 0, 1), rx = Math.max(1, 17 * (shake ? easeBack(q) : 1)), ry = Math.max(1, 6.5 * (shake ? easeBack(q) : 1));
      g.save(); g.globalAlpha = fade; g.fillStyle = rp.out || rp.sh; g.beginPath(); g.ellipse(ax, ay + 3, rx + 1, ry + 1, 0, 0, 6.29); g.fill(); g.fillStyle = rp.sh; g.beginPath(); g.ellipse(ax, ay + 3, rx, ry, 0, 0, 6.29); g.fill();
      g.fillStyle = col; g.beginPath(); g.ellipse(ax - 1, ay + 2, Math.max(.5, rx - 1.5), Math.max(.5, ry - 1.5), 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(Math.round(ax - rx * .55), Math.round(ay - ry * .3 + 2), Math.round(rx * .5), 1); g.fillStyle = '#ffffff'; g.fillRect(Math.round(ax - rx * .45), Math.round(ay + 1), 2, 1);
      for (let i = 0; i < 5; i++) { const a = i * 1.3 + 1, bx = ax + Math.cos(a) * (rx + 2), by = ay + 3 + Math.sin(a) * (ry + 1.5); g.fillStyle = col; if (q > .05) { g.beginPath(); g.ellipse(bx, by, 2 * q, 1.2 * q, 0, 0, 6.29); g.fill(); } } g.restore(); // gotas sueltas alrededor
      if (shake && t < 50) { const c = (t - 43) / 7; for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI, X = Math.round(ax + Math.cos(a) * (6 + c * 8)), H = Math.round(Math.sin(c * Math.PI) * (4 + (i % 3) * 2)); g.fillStyle = i % 2 ? col : rp.hi; g.fillRect(X, Math.round(ay + 2 - H), 2, H); g.fillRect(X, Math.round(ay + 1 - H), 2, 2); } } // la corona
      for (let i = 0; i < 18; i++) { const birth = 43 + (i % 6) * 2, age = t - birth; if (age < 0 || age > 20) continue; const a = -Math.PI * (.12 + (i * .41) % .76), sp = 1.3 + (i % 4) * .45; g.globalAlpha = 1 - age / 20; g.fillStyle = i % 3 ? col : rp.hi; g.fillRect(Math.round(ax + Math.cos(a) * sp * age * 1.2), Math.round(ay + Math.sin(a) * sp * age + .13 * age * age), i % 4 ? 2 : 1, 2); } g.globalAlpha = 1; }
    // el chorro: sale del labio, se curva y cae; lleva tragos que bajan por él
    if (t >= 40 && t < 59) { const head = clamp((t - 40) / 4, 0, 1), tail = clamp((t - 54) / 5, 0, 1), W = 4.2 * Math.min(1, (t - 40) / 3) * (1 - tail * .5);
      const pt = q => { const u = 1 - q, cxp = lipX + dir * 9, cyp = lipY + 4; let X = u * u * lipX + 2 * u * q * cxp + q * q * (ax + dir), Y = u * u * lipY + 2 * u * q * cyp + q * q * (ay + 1); if (shake) X += Math.sin(t * .9 + q * 7) * q * 1.3; return [X, Y]; };
      for (let i = 0; i < 16; i++) { const q0 = i / 16, q1 = (i + 1) / 16; if (q1 > head || q0 < tail) continue; const [x0, y0] = pt(q0), [x1, y1] = pt(q1), w = Math.max(1.5, W * (1 - q0 * .25));
        pstroke(x0, y0, x1, y1, w + 2, rp.sh, 1, 0, false); pstroke(x0, y0, x1, y1, w, col, 1, 0, false); pstroke(x0 - dir, y0, x1 - dir, y1, 1, rp.hi, 1, 0, false); }
      if (shake) for (let i = 0; i < 3; i++) { const q = ((t * .09 + i / 3) % 1); if (q > head || q < tail) continue; const [X, Y] = pt(q); g.fillStyle = col; g.beginPath(); g.ellipse(X, Y, W * .75 + 1, W * .75 + 1.5, 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(Math.round(X - 1), Math.round(Y - 1), 1, 1); } } // los tragos
    if (t >= 56 && t < 66) for (let i = 0; i < 3; i++) { const age = t - 56 - i * 3; if (age < 0) continue; g.fillStyle = col; g.fillRect(Math.round(lipX + dir * 2), Math.round(lipY + 2 + age * age * .35), 2, 3); } // las últimas gotas al sacudirlo
    // la tapa sale disparada girando
    if (t >= 38 && t < 62) { const age = t - 38, lx = lipX + dir * (10 + age * 1.6), ly = lipY - 4 - age * 3.2 + age * age * .22, sp = age * .45; g.save(); g.globalAlpha = 1 - clamp((age - 16) / 8, 0, 1); g.translate(Math.round(lx), Math.round(ly)); g.rotate(sp * dir);
      g.fillStyle = KIT_INK; g.beginPath(); g.ellipse(0, 0, 11, Math.max(1.2, Math.abs(Math.cos(sp * 1.7)) * 4), 0, 0, 6.29); g.fill(); g.fillStyle = '#c9c4d4'; g.beginPath(); g.ellipse(0, 0, 10, Math.max(.6, Math.abs(Math.cos(sp * 1.7)) * 3), 0, 0, 6.29); g.fill(); g.fillStyle = '#f4f0ea'; g.fillRect(-7, -1, 6, 1); g.fillStyle = col; g.fillRect(5, -1, 3, 1); g.restore();
      if (age < 5 && shake) { g.fillStyle = '#fff8e6'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .5, d = 4 + age * 2.5; g.fillRect(Math.round(lipX + dir * 10 + Math.cos(a) * d), Math.round(lipY - 3 + Math.sin(a) * d), 2, 1); } } } // ¡pop!
    // el bote: posado, volcado o desapareciendo
    if (t >= 34 && gone < 1) { const kind2 = t >= 38 ? 'bote_abierto' : 'bote', sq = shake ? land * .2 : 0, sc = 1 - gone, twirl = gone * dir * 2;
      drawSpirit(kind2, col, rp.hi, lipX, lipY + land * 2, { a: dir * tilt + twirl, flip: faceR, sx: (1 + sq) * sc, sy: (1 - sq) * sc, alpha: 1 - gone * .5 });
      if (gone > 0 && gone < 1) paintRing(lipX + dir * 10, lipY + 8, gone, rp.hi, 20); }
    if (t >= 44 && t < 76) { const q = (t - 44) / 32, real = Game.puzzle.real[s.target.sketch?.id]; if (real) { paintRing(ax, ay, q, C(s.target.sketch.color), 40);
      if (shake) for (let i = 0; i < 8; i++) { const a = i * .785 + t * .1, d = 10 + q * 26; g.fillStyle = i % 2 ? '#fff8e6' : C(s.target.sketch.color); const X = Math.round(ax + Math.cos(a) * d), Y = Math.round(ay + Math.sin(a) * d * .6); g.fillRect(X - 1, Y, 3, 1); g.fillRect(X, Y - 1, 1, 3); } } } } // se vuelve real: estalla en su color
  if (k === 'trazar') { // el lápiz, enorme, se clava en la chincheta y arrastra la línea; saltan virutas y la línea vibra al tensarse
    const P = PROP.lapiz, img = propSprite('lapiz', C('amarillo')), [bx, by] = [s.aim2[0] - cx, s.aim2[1] - cy], d = s.draw || 0;
    if (t >= 16 && t < 30) { const q = (t - 16) / 14, [x, y] = arc(q); trail(q, 2, '#6a6480'); ghosts(q, 'lapiz', C('amarillo'), '#fff3c0', -.5); drawSpirit('lapiz', C('amarillo'), '#fff3c0', x, y, { a: fl(-.5), flip: faceR }); }
    if (t >= 30 && t < 78) { const x = lerp(ax, bx, d), y = lerp(ay + 2, by + 2, d); drawSpirit('lapiz', C('amarillo'), '#fff3c0', x, y, { a: (bx > ax ? .5 : -.5) + Math.sin(t * .9) * .05, flip: bx > ax });
      for (let i = 0; i < 5; i++) { const ph = ((t + i * 5) % 16) / 16; g.fillStyle = i % 2 ? '#e8cf9a' : '#4a4460'; g.fillRect(Math.round(x - 4 + i * 2 - ph * 6), Math.round(y - ph * 12 + ph * ph * 16), 2, 1); } }
    if (t >= 70 && t < 92) { const q = (t - 70) / 22, amp = Math.sin(q * Math.PI * 6) * (1 - q) * 3; for (const [px, py] of [[ax, ay], [bx, by]]) paintRing(px, py, q, '#6a6480', 14); if (shake) { g.fillStyle = '#9a98b0'; for (let i = 0; i <= 12; i++) { const f = i / 12; g.fillRect(Math.round(lerp(ax, bx, f)), Math.round(lerp(ay, by, f) + 3 + Math.sin(f * Math.PI) * amp), 1, 1); } } } }
  if (k === 'borrar') { // la goma cae de golpe, frota cada vez más rápido gastándose y ensuciándose, y al final sopla las virutas
    const dir = faceR ? 1 : -1, W = 'goma', GL = '#ffd0dc';
    if (t >= 16 && t < 30) { const q = (t - 16) / 14, [x, y] = arc(q), lift = q > .75 ? (q - .75) / .25 * 8 : 0; ghosts(q, W, null, GL, 0); drawSpirit(W, null, GL, x, y - lift, { a: Math.sin(q * Math.PI) * .35 * dir }); } // llega y coge altura
    const ph = t >= 34 ? (t - 34) * (.42 + (t - 34) * .0075) : 0, amp = 11 + clamp((t - 34) / 30, 0, 1) * 4, wear = 1 - clamp((t - 34) / 34, 0, 1) * .2, scrubX = ax + Math.sin(ph) * amp;
    if (t >= 30 && t < 34) { const q = (t - 30) / 4, y = lerp(ay - 16, ay + 4, q * q); drawSpirit(W, null, GL, ax, y, { sx: 1 - q * .1, sy: 1 + q * .25 }); } // ¡cae!
    if (t >= 34 && t < 38 && shake) { const q = (t - 34) / 4; paintRing(ax, ay + 5, q, '#e88aa0', 22); for (let i = 0; i < 10; i++) { const a = -Math.PI * (i / 9), d = 4 + q * 16; g.fillStyle = i % 3 ? '#e88aa0' : '#f4f0ea'; g.fillRect(Math.round(ax + Math.cos(a) * d * 1.3), Math.round(ay + 4 + Math.sin(a) * d * .7 + q * q * 6), 2, 1); } } // el golpe: anillo y virutas
    if (t >= 34 && t < 68) {
      // papel limpio donde ya ha pasado: franjas claras sobre el garabato
      g.save(); g.globalAlpha = .55 * clamp((t - 36) / 20, 0, 1); g.fillStyle = '#f4eee0'; for (let i = 0; i < 4; i++) { const yy = Math.round(ay - 4 + i * 3), w = Math.round(amp * 2 * clamp((t - 34 - i * 4) / 14, 0, 1)); g.fillRect(Math.round(ax - w / 2), yy, w, 1); } g.restore();
      const land = t < 38 ? 1 - (t - 34) / 4 : 0, vel = Math.cos(ph), sq = shake ? Math.abs(vel) * .16 : 0; // se aplasta al invertir el sentido y se estira al correr
      if (shake) for (let j = 2; j >= 1; j--) { const pj = Math.max(0, ph - j * .35); spiritGhost(W, null, GL, ax + Math.sin(pj) * amp, ay + 4, Math.cos(pj) * .2, .22 * (3 - j) / 2); }
      drawSpirit(W, null, GL, scrubX, ay + 4 + Math.abs(Math.sin(ph * 2)) * -1, { sx: (1 + sq + land * .25) * wear, sy: (1 - sq - land * .2) * wear, a: vel * .22 });
      g.save(); g.globalAlpha = clamp((t - 38) / 24, 0, 1) * .8; g.fillStyle = '#4a4460'; for (let i = 0; i < 6; i++) g.fillRect(Math.round(scrubX - 8 * wear + i * 3 * wear), Math.round(ay + 3), 2, 1); g.restore(); // se ensucia de grafito
      for (let i = 0; i < 14; i++) { const q = ((t * 1.5 + i * 9) % 22) / 22, side = i % 2 ? 1 : -1, X = Math.round(scrubX + side * (7 + q * 16)), Y = Math.round(ay - 3 + q * 12 - Math.sin(q * Math.PI) * 10); g.globalAlpha = 1 - q * .6; g.fillStyle = i % 4 === 0 ? '#6a6480' : i % 3 ? '#e88aa0' : '#f4f0ea'; g.fillRect(X, Y, 1, 1); g.fillRect(X + 1, Y - 1, 1, 1); g.fillRect(X + 2, Y, 1, 1); } g.globalAlpha = 1; // virutas rizadas
      for (let i = 0; i < 5; i++) { const q = ((t + i * 11) % 30) / 30; g.fillStyle = '#4a4460'; g.globalAlpha = 1 - q; g.fillRect(Math.round(ax - 8 + i * 4), Math.round(ay - 6 - q * 24), 1, 1); } g.globalAlpha = 1; } // el grafito se levanta en motas
    // el montón de virutas; al final, un soplido se lo lleva
    if (t >= 34) { const blow = clamp((t - 71) / 12, 0, 1), n = Math.min(18, (t - 34) >> 1); for (let i = 0; i < n; i++) { const bx = ax - 16 + (i * 7) % 32, by = ay + 7 + (i % 3), fly = blow * (20 + (i % 5) * 9); g.globalAlpha = 1 - blow; g.fillStyle = i % 3 ? '#e88aa0' : i % 2 ? '#c96a86' : '#f4f0ea'; g.fillRect(Math.round(bx + dir * fly * 1.6), Math.round(by - Math.sin(blow * Math.PI) * (4 + i % 4) - fly * .2), 2, 1); } g.globalAlpha = 1; }
    if (t >= 68 && t < 84) { const q = (t - 68) / 16, hop = Math.sin(clamp(q * 1.6, 0, 1) * Math.PI) * 14, gone = clamp((q - .6) / .4, 0, 1);
      if (gone < 1) drawSpirit(W, null, GL, ax - dir * 10 * q, ay + 4 - hop, { sx: wear * (1 - gone), sy: wear * (1 - gone) * (1 + Math.sin(q * 6) * .1), a: -dir * q * .6 }); // salta y se va
      if (t >= 71 && t < 80 && shake) { const b = (t - 71) / 9; g.strokeStyle = '#fff8e6'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.globalAlpha = (1 - b) * .9; g.beginPath(); g.arc(ax - dir * 20 + dir * b * 34, ay + 2 - i * 4, 6 + i * 2, dir > 0 ? -1.2 : 1.9, dir > 0 ? 1.2 : 4.3); g.stroke(); } g.globalAlpha = 1; } // el soplido
      if (t >= 74) { const b = clamp((t - 74) / 10, 0, 1); for (let i = 0; i < 3; i++) { const X = Math.round(ax - 8 + i * 8), Y = Math.round(ay - 2 - (i % 2) * 5), r = Math.round(Math.sin(clamp(b * 1.4 - i * .15, 0, 1) * Math.PI) * 3); if (r <= 0) continue; g.fillStyle = '#fff8e6'; g.fillRect(X - r, Y, r * 2 + 1, 1); g.fillRect(X, Y - r, 1, r * 2 + 1); } } } } // ¡limpio! destellos
  if (k === 'aguada') { // el pincel se carga de agua y pinta una nube de acuarela; llueve, el charco se abre en ondas y la tinta se deshace en volutas grises
    const P = PROP.pincel, w = s.wash || 0, cloudK = clamp((t - 20) / 14, 0, 1), fade = t > 84 ? (96 - t) / 12 : 1;
    if (t >= 14 && t < 30) { const q = (t - 14) / 16, [x, y] = arc(q); trail(q, 3, '#9fd0ea'); ghosts(q, 'pincel', '#8ec8e8', '#e8f6fb', -.3); drawSpirit('pincel', '#8ec8e8', '#e8f6fb', x, y, { a: fl(-.3), flip: faceR }); }
    if (t >= 20) { g.save(); g.globalAlpha = fade; [[-10, 2, 8], [0, -2, 11], [11, 1, 8], [-4, 4, 7], [6, 5, 7]].forEach(([dx, dy, r]) => { g.fillStyle = '#6fa6d8'; g.beginPath(); g.ellipse(ax + dx, ay - 34 + dy + 1, r * cloudK, r * .7 * cloudK, 0, 0, 6.29); g.fill(); g.fillStyle = '#b8e0f0'; g.beginPath(); g.ellipse(ax + dx, ay - 34 + dy, r * cloudK, r * .65 * cloudK, 0, 0, 6.29); g.fill(); g.fillStyle = '#e8f6fb'; g.fillRect(Math.round(ax + dx - r * .5), Math.round(ay - 37 + dy), Math.round(r * .6 * cloudK), 1); });
      if (t > 30 && t < 84) for (let i = 0; i < 10; i++) { const ph = ((t * 3 + i * 13) % 30) / 30; g.fillStyle = i % 3 ? '#6fb4d8' : '#e8f6fb'; g.fillRect(Math.round(ax - 16 + i * 3.4), Math.round(ay - 26 + ph * 30), 1, 3); }
      for (let r = 0; r < 3; r++) { const q = ((t - 30 + r * 12) % 36) / 36; if (t < 30) break; g.strokeStyle = '#9fd0ea'; g.globalAlpha = (1 - q) * .8 * fade; g.beginPath(); g.ellipse(ax, ay + 5, 4 + q * 20, 1.5 + q * 7, 0, 0, 6.29); g.stroke(); }
      g.globalAlpha = fade; for (let i = 0; i < 5; i++) { const ph = ((t * 1.2 + i * 9) % 40) / 40; if (w < .2) break; g.fillStyle = ph < .5 ? '#6a6480' : '#9a98b0'; g.globalAlpha = w * (1 - ph) * fade; g.beginPath(); g.ellipse(ax - 8 + i * 4 + Math.sin(ph * 6 + i) * 3, ay - ph * 26, 1.5 + ph * 2, 1.2 + ph * 1.5, 0, 0, 6.29); g.fill(); } // la tinta se deshace
      g.restore(); } }
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
// =====================================================================
// Espíritus de las herramientas: dibujos propios a su tamaño real (nada se amplía), en vista de tres cuartos con cara de arriba,
// frente y costado. Cada uno tiene su punto de contacto (tip). Se pintan con halo de luz de su color, un destello que los recorre
// y chispas; así la parte más vistosa de la magia es la herramienta misma.
// =====================================================================
const SPIRITS = {
  goma: { w: 38, h: 26, tip: [15, 24] },
  lapiz: { w: 58, h: 18, tip: [2, 15] },
  brocha: { w: 60, h: 30, tip: [4, 24] },
  pincel: { w: 56, h: 16, tip: [2, 13] },
  bote: { w: 28, h: 31, tip: [3, 10] }, // el bote de pintura: la punta es el labio del borde, por donde se vuelca
  bote_abierto: { w: 28, h: 31, tip: [3, 10] },
};
function spiritSprite(kind, color) {
  return cached('spirit2|' + kind + '|' + color, () => {
    const S = SPIRITS[kind], c = document.createElement('canvas'); c.width = S.w; c.height = S.h; const x = c.getContext('2d'), rp = ramp(color || '#c0c0c0');
    const F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); }, poly = (col, pts) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); };
    const INK = '#241e32';
    if (kind === 'bote' || kind === 'bote_abierto') { // bote de pintura de latón en tres cuartos: asa de alambre, etiqueta de su color, chorretones secos
      const open = kind === 'bote_abierto', ell = (cx, cy, rx, ry, col, ring = 0) => { for (let yy = Math.floor(cy - ry - 1); yy <= cy + ry + 1; yy++) for (let xx = Math.floor(cx - rx - 1); xx <= cx + rx + 1; xx++) { const d = ((xx + .5 - cx) / rx) ** 2 + ((yy + .5 - cy) / ry) ** 2; if (d <= 1 && d >= ring) F(col, xx, yy); } };
      for (let a = Math.PI; a <= 2 * Math.PI + .01; a += .05) { const hx = Math.round(14 + Math.cos(a) * 12), hy = Math.round(12 + Math.sin(a) * 10); F('#4a4460', hx, hy); F('#c9c4d4', hx, hy - 1); } // el asa
      F(INK, 10, 0, 8, 4); F('#b0703a', 11, 1, 6, 2); F('#e0a060', 11, 1, 6, 1); // el mango de madera del asa
      ell(14, 27, 12, 4, INK); for (let yy = 10; yy <= 27; yy++) { F(INK, 1, yy, 26, 1); }
      for (let yy = 10; yy <= 27; yy++) for (let xx = 2; xx <= 25; xx++) F(xx < 5 ? '#f4f0ea' : xx < 8 ? '#dcd8e4' : xx > 22 ? '#8c8ab0' : '#c9c4d4', xx, yy);
      ell(14, 27, 11, 3, '#8c8ab0'); for (let xx = 2; xx <= 25; xx++) F(xx < 5 ? '#f4f0ea' : xx < 8 ? '#dcd8e4' : xx > 22 ? '#8c8ab0' : '#c9c4d4', xx, 26);
      F(INK, 2, 14, 24, 1); F(INK, 2, 23, 24, 1); for (let yy = 15; yy <= 22; yy++) for (let xx = 2; xx <= 25; xx++) F(xx < 6 ? rp.hi : xx > 21 ? rp.sh : rp.base, xx, yy); // la etiqueta
      F('#fff8e6', 13, 16, 2, 1); F('#fff8e6', 12, 17, 4, 3); F('#fff8e6', 13, 20, 2, 1); F(rp.hi, 13, 18, 1, 1); // una gota blanca en la etiqueta
      for (const [dx, len] of [[6, 8], [15, 11], [21, 5]]) { F(rp.sh, dx, 11, 2, len); F(rp.base, dx, 11, 1, len - 1); F(rp.hi, dx, len + 10, 2, 1); } // chorretones secos
      ell(14, 10, 12.5, 4.5, INK); ell(14, 10, 11.5, 3.6, '#e8e4f0'); ell(14, 10, 11.5, 3.6, '#8c8ab0', .72); // el borde
      if (open) { ell(14, 10.4, 9.6, 2.6, rp.sh); ell(14, 10.6, 9, 2.2, rp.base); F(rp.hi, 8, 9, 6, 1); F('#ffffff', 9, 9, 2, 1); F(rp.base, 3, 10, 2, 2); } // abierto: la pintura dentro
      else { ell(14, 9.6, 10, 3, '#c9c4d4'); ell(14, 9.6, 5, 1.4, '#8c8ab0', .5); F('#f4f0ea', 7, 8, 7, 1); F(rp.base, 20, 8, 3, 1); } // la tapa, con pintura seca en el canto
      F('#ffffff', 3, 16, 1, 5); F('#ffffff', 4, 12, 1, 2);
    } else if (kind === 'goma') { // goma bicolor en tres cuartos: rosa y azul fieltro, funda de cartón impresa, bordes gastados
      const top = [[3,9],[9,3],[35,3],[29,9]], front = [[3,9],[29,9],[29,23],[3,23]], side = [[29,9],[35,3],[35,17],[29,23]];
      poly(INK, [[2,9],[9,2],[36,2],[36,17],[29,24],[2,24]]);
      poly('#e88a9e', front); poly('#f4b8c4', top); poly('#c46a82', side);
      poly('#6fa0d0', [[19,9],[29,9],[29,23],[19,23]]); poly('#a8cce8', [[19,9],[25,3],[35,3],[29,9]]); poly('#4a78a8', [[29,9],[35,3],[35,17],[29,23]]); // mitad de fieltro azul
      poly('#f4ecd8', [[11,9],[18,9],[18,23],[11,23]]); poly('#fffaf0', [[11,9],[17,3],[24,3],[18,9]]); // funda de cartón
      F('#c9bfa8', 11, 21, 7, 2); F('#8a5a8a', 12, 13, 5, 1); F('#8a5a8a', 12, 15, 4, 1); F('#e8a830', 13, 17, 3, 2); // etiqueta impresa
      F('#fff0f4', 4, 10, 6, 1); F('#fff0f4', 4, 10, 1, 8); F('#dff0ff', 20, 10, 6, 1); // luz en el canto
      F('#b0506a', 3, 22, 8, 1); F('#3a5a88', 19, 22, 10, 1); // sombra abajo
      x.fillStyle = '#d87a90'; x.beginPath(); x.moveTo(3, 20); x.lineTo(7, 24); x.lineTo(3, 24); x.fill(); // esquina gastada
      F('#fff', 31, 6, 1, 1); F('#fff', 10, 5, 3, 1);
    } else if (kind === 'lapiz') { // lápiz hexagonal: tres caras (luz, medio, sombra), cono de madera con veta, mina con brillo, virola y goma
      const y0 = 3; poly(INK, [[1,15],[12,y0 - 1],[48,y0 - 1],[57,y0],[57,y0 + 12],[48,y0 + 13],[12,y0 + 13]]);
      F('#fbe28a', 13, y0, 34, 4); F('#f2c93a', 13, y0 + 4, 34, 4); F('#c9a02a', 13, y0 + 8, 34, 4); F('#fff3c0', 13, y0, 34, 1); F('#a8801a', 13, y0 + 11, 34, 1); // facetas
      for (let i = 16; i < 46; i += 7) F('#e8b830', i, y0 + 4, 3, 1); // reflejo de la laca
      poly('#e8c890', [[12,y0],[2,14],[12,y0 + 12]]); poly('#c9a070', [[12,y0 + 6],[2,14],[12,y0 + 12]]); F('#b08850', 7, 9, 1, 3); F('#b08850', 9, 7, 1, 2); // madera y veta
      poly('#3a3652', [[5,11],[1,15],[5,14]]); F('#8c8ab0', 3, 12, 1, 1); // mina
      F('#8c8ab0', 47, y0, 4, 12); F('#c9c4d4', 47, y0, 4, 2); F('#5a5670', 47, y0 + 10, 4, 2); for (let i = 0; i < 4; i += 2) F('#6a6480', 48 + i, y0, 1, 12); // virola
      F('#e89aa8', 51, y0, 5, 12); F('#f4c0c8', 51, y0, 5, 3); F('#c46a82', 51, y0 + 9, 5, 3); // goma
      F('#fff', 20, y0 + 1, 8, 1);
    } else if (kind === 'brocha') { // brocha plana: mango lacado, virola engarzada con clavos, cerdas cargadas que gotean
      poly(INK, [[22,6],[58,1],[59,6],[24,13]]); poly('#b0703a', [[23,7],[57,2],[58,5],[24,12]]); poly('#e0a060', [[23,7],[57,2],[57,3],[24,9]]); F('#6b4424', 25, 11, 20, 1); // mango
      poly(INK, [[12,2],[25,4],[25,16],[12,18]]); poly('#9aa0b0', [[13,3],[24,5],[24,15],[13,17]]); poly('#d8dce8', [[13,3],[24,5],[24,7],[13,6]]); F('#5a5f70', 13, 15, 11, 2); F(INK, 17, 9, 2, 2); F(INK, 21, 9, 2, 2); F('#fff', 15, 4, 4, 1); // virola
      poly(INK, [[1,4],[13,1],[13,19],[1,27]]); poly(rp.base, [[2,5],[12,2],[12,18],[2,26]]);
      for (let i = 0; i < 10; i++) F(i % 3 ? rp.hi : rp.sh, 3 + (i % 5) * 2, 4 + (i >> 1), 1, 16 - (i % 4)); // cerdas
      poly(rp.hi, [[2,5],[12,2],[12,5],[2,8]]); F(rp.dk, 2, 22, 6, 4); F(rp.base, 3, 26, 2, 3); F(rp.out, 3, 29, 2, 1); F('#fff', 4, 6, 3, 1); // punta cargada y goterón
    } else { // pincel redondo: mango fino y largo, virola, mechón que termina en punta cargada
      poly(INK, [[20,6],[55,4],[55,9],[20,10]]); poly('#2a2438', [[21,7],[54,5],[54,8],[21,9]]); F('#5a5670', 22, 7, 30, 1); F('#8c8ab0', 24, 7, 6, 1); // mango negro lacado
      poly(INK, [[12,4],[21,5],[21,11],[12,12]]); poly('#c9c4d4', [[13,5],[20,6],[20,10],[13,11]]); F('#f4f0ea', 13, 5, 6, 1); F('#8c8ab0', 13, 10, 7, 1); // virola
      poly(INK, [[1,13],[5,7],[13,4],[13,12],[6,13]]); poly(rp.base, [[2,12],[6,7],[12,5],[12,11],[6,12]]); poly(rp.hi, [[4,10],[7,7],[12,5],[12,7],[7,9]]); F(rp.dk, 2, 12, 3, 1); F('#fff', 8, 7, 2, 1); // mechón
    }
    c.__key = 'spirit2|' + kind + '|' + color; return c;
  });
}
// Pinta un espíritu: halo de su color, el cuerpo, un destello que lo recorre y chispas. (x,y) es el punto de contacto.
function drawSpirit(kind, color, glow, x, y, opt = {}) {
  const S = SPIRITS[kind], img = spiritSprite(kind, color), a = opt.a || 0, sx = opt.sx || 1, sy = opt.sy || 1, alpha = opt.alpha ?? 1, t = OW.t;
  const halo = cached('spirit-halo|' + kind + '|' + color + '|' + glow, () => { const c = document.createElement('canvas'); c.width = S.w + 6; c.height = S.h + 6; const q = c.getContext('2d'); for (const [ox, oy] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,1],[1,-1],[-1,1]]) q.drawImage(img, 3 + ox, 3 + oy); q.globalCompositeOperation = 'source-in'; q.fillStyle = glow; q.fillRect(0, 0, c.width, c.height); return c; });
  const shine = cached('spirit-shine|' + kind, () => { const c = document.createElement('canvas'); c.width = S.w; c.height = S.h; return c; }), sq = shine.getContext('2d');
  sq.clearRect(0, 0, S.w, S.h); sq.globalCompositeOperation = 'source-over'; sq.drawImage(img, 0, 0); sq.globalCompositeOperation = 'source-atop'; const band = ((t * 2) % (S.w + 40)) - 20; sq.fillStyle = 'rgba(255,248,230,.75)'; sq.beginPath(); sq.moveTo(band, 0); sq.lineTo(band + 5, 0); sq.lineTo(band - 5, S.h); sq.lineTo(band - 10, S.h); sq.fill();
  g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(a); g.scale(sx * (opt.flip ? -1 : 1), sy); g.imageSmoothingEnabled = false;
  const pulse = .55 + .25 * Math.sin(t * .2); g.globalAlpha = alpha * pulse; g.drawImage(halo, -S.tip[0] - 3, -S.tip[1] - 3);
  g.globalAlpha = alpha; g.drawImage(shine, -S.tip[0], -S.tip[1]); g.restore();
  if (Prefs.shake && alpha > .3) for (let i = 0; i < 5; i++) { const ph = ((t * .7 + i * 11) % 30) / 30, an = i * 1.26 + t * .05, d = 6 + ph * 16; g.globalAlpha = (1 - ph) * alpha; g.fillStyle = i % 2 ? '#fff8e6' : glow; const px = Math.round(x + Math.cos(an) * d * 1.3 - S.tip[0] * .0), py = Math.round(y - S.h * .4 + Math.sin(an) * d * .6 - ph * 8); g.fillRect(px - 1, py, 3, 1); g.fillRect(px, py - 1, 1, 3); } g.globalAlpha = 1;
}
