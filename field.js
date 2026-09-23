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
  const G = fieldGroups(), z = Game.puzzle, p = MAP.pz; if (!G || !z || Game.page === 1) return [];
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
// ---- El anillo de magias: giran alrededor del líder; la elegida queda arriba.
function openRing() {
  ARTUI.tracks.delete('field');
  OW.ring = { idx: OW.fieldSelection || 0, t: 0, notice: null, spin: OW.fieldSelection || 0 };
  OW.moving = false; OW.vx = OW.vy = 0; Audio.sfx('book_open', { vol: .4 });
}
function fieldCast() {
  const r = OW.ring; if (!r || OW.act) return;
  const art = FIELD[r.idx], target = fieldFacing(), check = fieldCheck(art, target);
  if (!check.ok) { r.notice = check.why; r.deniedAt = r.t; Audio.sfx('nope', { vol: .3 }); return; }
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
// El color de la pintura de cada magia: los colores primarios son el suyo; el lápiz, grafito; la goma, rosa; el agua, agua.
function fieldArtPaint(art) { return art.kind === 'color' ? C(art.color) : art.kind === 'trazar' ? '#6a6480' : art.kind === 'borrar' ? '#e88aa0' : '#6fb4d8'; }
// El anillo es un círculo cromático: seis gajos pintados a la acuarela alrededor del líder, uno por magia. La rueda gira hasta
// dejar arriba la elegida, que sobresale y gotea; el mapa se tiñe de su color; arriba, su nombre y la pintura que gastará.
function drawRing() {
  UI_HITS.length = 0; UI_TEXT.length = 0;
  const r = OW.ring, art = FIELD[r.idx], paint = fieldArtPaint(art), rp = ramp(paint), target = fieldFacing(), check = fieldCheck(art, target), shake = Prefs.shake;
  const intro = shake ? Math.max(0, easeBack(clamp(r.t / 14, 0, 1))) : 1, at = artObserve('field', r.idx + ':' + r.notice), pop = artPop(at), denied = r.deniedAt != null && r.t - r.deniedAt < 14 ? Math.sin((r.t - r.deniedAt) * 1.6) * (1 - (r.t - r.deniedAt) / 14) * 3 : 0;
  if (!shake) r.spin = r.idx; else { let d = r.idx - r.spin; if (d > FIELD.length / 2) d -= FIELD.length; if (d < -FIELD.length / 2) d += FIELD.length; r.spin += d * .25; if (Math.abs(d) < .01) r.spin = r.idx; }
  const [fdx, fdy] = FIELD_DIRS[OW.dir] || [0, 1]; // la rueda se aparta hacia atrás para dejar a la vista lo que hay delante
  const cx = clamp(Math.round(OW.x - OW.cam.x - fdx * 46), 52, W - 52) + Math.round(denied), cy = clamp(Math.round(OW.y - OW.cam.y - 10 - fdy * 34), 50, 100);
  // el tiempo se detiene y el papel se tiñe del color de la magia, en capas de acuarela que se abren desde el líder
  g.fillStyle = 'rgba(28,20,36,' + (.3 * intro).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
  g.save(); for (let k = 0; k < 3; k++) { g.globalAlpha = (.14 - k * .035) * intro; g.fillStyle = k === 1 ? rp.hi : paint; g.beginPath(); for (let i = 0; i <= 36; i++) { const a = i / 36 * 6.283, rr = (70 + k * 38) * intro * (1 + .06 * Math.sin(a * 5 + k * 2 + r.t * .02)); const X = cx + Math.cos(a) * rr, Y = cy + Math.sin(a) * rr * .8; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } g.fill(); } g.restore();
  // la rueda: cada gajo es un trazo de pincel curvo de su color, con canto de tinta, brillo en el borde y cerdas
  const R0 = 44 * intro, R1 = 17, n = FIELD.length, span = 6.283 / n;
  g.save(); g.globalAlpha = .45; g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(cx + 2, cy + 3, R0 + 3, (R0 + 3) * .86, 0, 0, 6.29); g.fill(); g.restore();
  FIELD.forEach((a, i) => {
    const sel = i === r.idx, usable = fieldOk(a) && fieldAfford(a), col = usable ? fieldArtPaint(a) : '#9a8f83', rr = ramp(col), mid = -Math.PI / 2 + (i - r.spin) * span, out = sel ? 6 + pop * 3 : 0, a0 = mid - span / 2 + .04, a1 = mid + span / 2 - .04;
    if (intro * n * 1.3 < i) return; // se pinta gajo a gajo
    const ox = Math.cos(mid) * out, oy = Math.sin(mid) * out * .86, pts = [];
    for (let k = 0; k <= 10; k++) { const t = lerp(a0, a1, k / 10); pts.push([cx + ox + Math.cos(t) * (R0 + (sel ? 3 : 0)), cy + oy + Math.sin(t) * (R0 + (sel ? 3 : 0)) * .86]); }
    for (let k = 10; k >= 0; k--) { const t = lerp(a0, a1, k / 10); pts.push([cx + ox + Math.cos(t) * R1, cy + oy + Math.sin(t) * R1 * .86]); }
    g.fillStyle = '#241e32'; g.beginPath(); pts.forEach(([X, Y], k) => k ? g.lineTo(X + 1, Y + 1) : g.moveTo(X + 1, Y + 1)); g.closePath(); g.fill();
    g.fillStyle = col; g.beginPath(); pts.forEach(([X, Y], k) => k ? g.lineTo(X, Y) : g.moveTo(X, Y)); g.closePath(); g.fill();
    for (let k = 1; k < 5; k++) { const t = lerp(a0, a1, k / 5); pstroke(cx + ox + Math.cos(t) * (R1 + 3), cy + oy + Math.sin(t) * (R1 + 3) * .86, cx + ox + Math.cos(t) * (R0 - 3), cy + oy + Math.sin(t) * (R0 - 3) * .86, 1, rr.sh, 1, 0, false); } // cerdas
    for (let k = 0; k < 10; k++) { const t = lerp(a0, a1, k / 10), t2 = lerp(a0, a1, (k + 1) / 10); pstroke(cx + ox + Math.cos(t) * (R0 - 2), cy + oy + Math.sin(t) * (R0 - 2) * .86, cx + ox + Math.cos(t2) * (R0 - 2), cy + oy + Math.sin(t2) * (R0 - 2) * .86, 1, sel ? '#fff8e6' : rr.hi, 1, 0, false); } // brillo del canto
    const ix = Math.round(cx + ox + Math.cos(mid) * (R0 + R1) / 2), iy = Math.round(cy + oy + Math.sin(mid) * (R0 + R1) / 2 * .86);
    fieldArtIcon(a, ix, iy, sel ? 7 : 5, !usable);
    if (sel && shake && usable) { const q = (r.t % 50) / 50; g.fillStyle = col; const dx = Math.round(cx + ox + Math.cos(mid + .3) * R0), dy = Math.round(cy + oy + Math.sin(mid + .3) * R0 * .86); g.fillRect(dx, dy, 2, 2 + Math.round(q * 3)); if (q > .6) { g.globalAlpha = 1 - (q - .6) / .4; g.fillRect(dx, dy + 5 + Math.round((q - .6) * 30), 2, 2); g.globalAlpha = 1; } } // gotea
    uiHit(ix - 11, iy - 11, 22, 22, () => { if (r.idx === i) fieldCast(); else { r.idx = i; r.notice = null; Audio.sfx('cursor'); } }, () => { if (r.idx !== i) { r.idx = i; r.notice = null; Audio.sfx('cursor', { vol: .3 }); } });
  });
  // la aguja arriba de la rueda y el hueco del centro, donde queda el líder
  g.fillStyle = '#241e32'; g.beginPath(); g.moveTo(cx - 4, cy - R0 * .86 - 11); g.lineTo(cx + 4, cy - R0 * .86 - 11); g.lineTo(cx, cy - R0 * .86 - 5); g.fill(); g.fillStyle = '#fff3d8'; g.beginPath(); g.moveTo(cx - 3, cy - R0 * .86 - 10); g.lineTo(cx + 3, cy - R0 * .86 - 10); g.lineTo(cx, cy - R0 * .86 - 6); g.fill();
  g.strokeStyle = '#fff3d8'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, R1, R1 * .86, 0, 0, 6.29); g.stroke();
  { const own = fieldOwners(art); g.fillStyle = '#f1e9d6'; g.beginPath(); g.ellipse(cx, cy, R1 - 1, (R1 - 1) * .86, 0, 0, 6.29); g.fill(); own.forEach((p, i) => { const spr = buildSprite(p.id + '_front_mini', C(p.color), null, { eyes: 'happy' }); drawSprite(spr, cx + (own.length > 1 ? (i ? 6 : -6) : 0), cy + 7, 1); }); } // en el centro, quien pinta
  // cabecera: el nombre a brocha sobre una banda de su pintura, quién la hace y la pintura que gastará cada uno
  const owners = fieldOwners(art), head = art.name, hw = rotuloWidth(head) + 30 + owners.length * 46, hx = Math.round((W - hw) / 2), hy = Math.round(3 - (1 - intro) * 30);
  brushBand(hx + 1, hy + 2, hw, 19, '#1e1a2c'); brushBand(hx, hy, hw, 19, KIT_INK); brushBand(hx + 2, hy + 15, hw - 4, 3, paint);
  paintDab(hx + 10, hy + 9, 5, paint, pop); bigText(head, hx + 19, hy + 4, rp.hi, { outline: '#0b0912' });
  let ox = hx + 25 + rotuloWidth(head);
  owners.forEach(p => { const s = effStats(p), after = Math.max(0, p.cur.mp - art.mp); sticker(ox + 6, hy + 9, { id: p.id, color: p.color, alive: p.cur.hp > 0, hp: p.cur.hp, maxhp: s.hp, mp: p.cur.mp, maxmp: s.mp }, 6);
    tubeGauge(ox + 14, hy + 4, p.cur.mp / s.mp, C(p.color), p.cur.mp < art.mp); if (p.cur.mp >= art.mp && shake && (r.t >> 3) % 2) { g.fillStyle = '#fff8e6'; g.fillRect(ox + 29 - Math.round(12 * p.cur.mp / s.mp), hy + 5, Math.max(1, Math.round(12 * art.mp / s.mp)), 1); } // parpadea lo que se gastará
    smallText('-' + art.mp, ox + 35, hy + 5, p.cur.mp >= art.mp ? '#f4f0ea' : '#e58a8a'); ox += 46; });
  // el objetivo: esquinas de pintura que laten y un reguero de gotas desde la rueda; su nombre, al lado
  if (target) {
    const xs = target.tiles.map(q => q[0]), ys = target.tiles.map(q => q[1]), tx = (Math.min(...xs) + Math.max(...xs) + 1) / 2 * TILE - OW.cam.x, ty = (Math.min(...ys) + Math.max(...ys) + 1) / 2 * TILE - OW.cam.y, w = (Math.max(...xs) - Math.min(...xs) + 1) * 8 + 3, h = (Math.max(...ys) - Math.min(...ys) + 1) * 8 + 3, pulse = shake ? Math.round(Math.sin(r.t * .2) * 1.5) : 0, c2 = check.ok ? paint : '#9a8f83';
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const X = tx + a * (w + pulse), Y = ty + b * (h + pulse); pstroke(X, Y, X - a * 5, Y, 2, '#241e32', 1, 0, false); pstroke(X, Y, X, Y - b * 5, 2, '#241e32', 1, 0, false); pstroke(X - a, Y - b, X - a * 5, Y - b, 1, c2, 1, 0, false); pstroke(X - a, Y - b, X - a, Y - b * 5, 1, c2, 1, 0, false); }
    const mid = -Math.PI / 2, sx = cx + Math.cos(mid) * R0, sy = cy + Math.sin(mid) * R0 * .86;
    for (let i = 1; i < 10; i++) { const k = ((i + r.t * .07) % 10) / 10; g.fillStyle = c2; g.globalAlpha = .35 + k * .6; const q = 1 - k; g.fillRect(Math.round(q * q * sx + 2 * q * k * ((sx + tx) / 2) + k * k * tx), Math.round(q * q * sy + 2 * q * k * (Math.min(sy, ty) - 18) + k * k * ty), k > .5 ? 2 : 1, k > .5 ? 2 : 1); } g.globalAlpha = 1;
    if (target.kind === 'sketch' && art.kind === 'color' && check.ok) { const z = Game.puzzle; let x = tx - 16; [...(z.paint[target.sketch.id] || []), art.color].forEach((c, i, all) => { paintDab(x, ty - h - 10, 3, C(c)); x += 8; if (i < all.length - 1) smallText('+', x - 4, ty - h - 13, '#f4f0ea'); }); smallText('=', x - 2, ty - h - 13, '#f4f0ea'); paintDab(x + 7, ty - h - 10, 4, check.mix === 'barro' ? '#78644d' : C(check.mix)); }
  }
  // la ficha: qué hay delante, si funcionará y por qué
  const aim = target ? target.name : 'nada delante', note = r.notice || (check.ok ? art.desc : check.why || art.desc), noteAt = artObserve('field-note', note);
  g.save(); g.translate(0, Math.round((1 - intro) * 50));
  maskingLabel(6, 134, 308, 40, '#f7efd6'); brushBand(8, 136, 4, 36, paint);
  paintDab(20, 142, 3, check.ok ? '#8fc07a' : '#c4665a'); smallText((check.ok ? 'Delante: ' : 'Delante: ') + aim, 27, 139, check.ok ? UI_INK : UI_MUTED);
  paragraph(note, 17, 151, 214, r.notice || !check.ok ? '#9c4539' : UI_MUTED, 2, { progress: shake ? (ARTUI.t - noteAt) * 2.2 : Infinity, wet: r.notice ? '#c4384a' : paint });
  artButton('field-cast', battleKey('ok') + ' usar', 240, 142, 68, 15, paint, fieldCast, { disabled: !check.ok, selected: check.ok });
  artButton('field-close', battleKey('back') + ' cerrar', 240, 158, 68, 13, '#d2bc95', () => { OW.ring = null; Audio.sfx('cancel'); });
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
    for (let t = 0; t < dur; t++) {
      s.t = t; OW.cast.aura = Math.max(0, 1 - t / 30);
      if (t === 16) Audio.sfx(art.kind === 'color' ? 'brush_sweep' : art.kind === 'trazar' ? 'scratch_long' : art.kind === 'borrar' ? 'rub' : 'brush_hiss', { vol: .6 });
      if (art.kind === 'color' && t === 44) { commit(); Audio.sfx(z.real[id] ? 'grow' : 'plop', { semi: SEMI[owners[0].id] || 0, vol: .6 }); if (z.real[id]) Audio.sfx('discovery', { vol: .4, when: .15 }); }
      if (art.kind === 'trazar') { s.draw = clamp((t - 30) / 40, 0, 1); if (t % 8 === 0 && t > 30 && t < 70) Audio.sfx('scratch', { vol: .35, semi: t / 8 }); if (t === 70) { commit(); Audio.sfx('tinkle', { semi: 4, vol: .5 }); } }
      if (art.kind === 'borrar') { if (t > 24 && t < 70 && t % 10 === 0) Audio.sfx('rub', { vol: .45 }); if (t % 12 === 6 && t > 24 && t < 70) Audio.sfx('crumbs', { vol: .3 }); s.fade = clamp((t - 30) / 40, 0, 1); if (t === 70) commit(); }
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
  const G = fieldGroups(); if (!Game.puzzle || !G || Game.page === 1) return;
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
    ents.push({ y: c[1] * TILE + 14, draw: () => { shadow(x, y + 2, 14); g.fillStyle = '#241e32'; g.fillRect(x - 7, y - 9, 14, 11); g.fillStyle = '#8a5a34'; g.fillRect(x - 6, y - 8, 12, 9); g.fillStyle = '#b07a48'; g.fillRect(x - 6, y - 8, 12, 2); g.fillStyle = '#e8c070'; g.fillRect(x - 1, y - 6, 2, 3);
      g.fillStyle = '#241e32'; g.fillRect(x - 7, y - 12 - open * 5, 14, 4); g.fillStyle = open ? '#6b4424' : '#a8784a'; g.fillRect(x - 6, y - 11 - open * 5, 12, 2);
      if (rise > 0) { g.globalAlpha = Math.sin(rise * Math.PI); g.fillStyle = '#fff3c0'; g.fillRect(x - 1, y - 14 - rise * 12, 3, 3); g.globalAlpha = 1; } } }); }
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
