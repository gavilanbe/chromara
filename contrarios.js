// =====================================================================
// Los Contrarios: no son gotas, son manchas que no se lavan. Lo que arruina un cuadro, del color complementario de cada
// gota y podrido. Tienen su propio cuerpo, sus propias armas, magias y mezclas:
//   Moho     colonia de moho peluda con tallos de esporas · arma: el trapo mojado que borra · magia: Esporas
//   Moratón  mancha de tinta violeta que sale de un tampón, con un sello de goma por sombrero · arma: el sello · magia: Censura
//   Óxido    lámina de metal oxidada, con remaches y una cuchilla de cúter · arma: el cúter · magia: Herrumbre
// Mezclas: Podredumbre (moho+sello), Carcoma (trapo+cúter), Tachadura (sello+cúter) y, los tres, Agua negra.
// =====================================================================
'use strict';
const CONTRARIOS = {
  moho:    { hero: 'carmin', hex: '#6f8a3a', name: 'Moho',    col: 'verde' },
  moraton: { hero: 'ambar',  hex: '#6a3f86', name: 'Moratón', col: 'violeta' },
  oxido:   { hero: 'anil',   hex: '#b0582a', name: 'Óxido',   col: 'naranja' },
};
const CONTRA_TRIO = ['moho', 'moraton', 'oxido'], CONTRA_HERO = { moho: 'carmin', moraton: 'ambar', oxido: 'anil' };

// ---- cuerpos: rejillas de píxeles generadas a cualquier tamaño (batalla, retrato, mapa) ----
function contraGrid(w, h) { const G = Array.from({ length: h }, () => Array(w).fill('.')); G.w = w; G.h = h; G.set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) G[y][x] = c; }; G.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : G[y][x]; return G; }
const CONTRA_BODY = 'BSHDWxyzfmnklr';
function contraOutline(G, skip = '') { const body = (x, y) => { const c = G.get(x, y); return c !== '.' && c !== 'O' && !skip.includes(c); };
  const out = []; for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (G[y][x] === '.' && (body(x - 1, y) || body(x + 1, y) || body(x, y - 1) || body(x, y + 1))) out.push([x, y]); out.forEach(([x, y]) => G[y][x] = 'O'); }
function contraShade(G, cx, cy, R, test) { for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { if (!test(x, y)) continue; const k = -((x - cx) + (y - cy)) / R; G[y][x] = k > .55 ? 'H' : k > -.2 ? 'B' : k > -.65 ? 'S' : 'D'; } }
function mohoGrid(s) {
  const w = Math.round(32 * s), h = Math.round(30 * s), G = contraGrid(w, h), cx = w / 2, cy = h * .6, R = 11.5 * s, rnd = seeded(71 + Math.round(s * 10));
  const r = a => R * (1 + .12 * Math.sin(3 * a + 1) + .08 * Math.sin(5 * a + 2) + .05 * Math.sin(9 * a));
  const inside = (x, y) => { const dx = x + .5 - cx, dy = (y + .5 - cy) * 1.1, d = Math.hypot(dx, dy); return d <= r(Math.atan2(dy, dx)); };
  contraShade(G, cx, cy, R, inside);
  // colonias: anillos claros con el centro oscuro, como el moho en un vaso olvidado
  const face = [cx - .5, cy - 1 * s]; // la cara queda limpia: las colonias crecen alrededor
  if (s > .6) for (let n = 0, tries = 0; n < 4 && tries < 40; tries++) { const ax = cx + (rnd() - .5) * R * 1.5, ay = cy + (rnd() - .5) * R * 1.1, rr = (1.6 + rnd() * 1.6) * s; if (Math.hypot(ax - face[0], ay - face[1]) < rr + 6 * s) continue; n++;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!inside(x, y)) continue; const d = Math.hypot(x - ax, y - ay); if (Math.abs(d - rr) < .6) G[y][x] = 'x'; else if (d < .9) G[y][x] = 'y'; } }
  // tallos de esporas en lo alto
  const tops = s > .6 ? 3 : 2; for (let i = 0; i < tops; i++) { const sx = Math.round(cx + (i - (tops - 1) / 2) * 6 * s), top = Math.round(cy - r(-Math.PI / 2) / 1.1) + 1, L = Math.round((4 + i % 2 * 2) * s);
    for (let k = 1; k <= L; k++) G.set(sx, top - k, 'D'); const hy = top - L - Math.max(1, Math.round(1.4 * s)); for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (s > .6 || !(xx && yy)) G.set(sx + xx, hy + yy, yy < 0 && xx < 0 ? 'z' : 'x'); }
  contraOutline(G);
  // pelusa: filamentos que asoman del borde
  if (s > .6) for (let n = 0; n < 26; n++) { const a = rnd() * 6.283, rr = r(a) + 1.5, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr / 1.1; if (G.get(Math.round(x), Math.round(y)) === '.') G.set(x, y, 'f'); if (rnd() < .4) G.set(x + Math.cos(a), y + Math.sin(a), 'f'); }
  return { rows: G.map(r => r.join('')), eyes: [[Math.round(cx - 4 * s), Math.round(cy - 1 * s)], [Math.round(cx + 3 * s), Math.round(cy - 1 * s)]] };
}
function moratonGrid(s) {
  const w = Math.round(26 * s), h = Math.round(36 * s), G = contraGrid(w, h), cx = w / 2, trayTop = h - Math.round(6 * s), rnd = seeded(83 + Math.round(s * 10));
  // la mancha: una columna de tinta que sale del tampón y se ensancha arriba
  const bodyTop = Math.round(9 * s), half = y => { const v = (trayTop - y) / (trayTop - bodyTop); return (5.5 + 3 * Math.sin(v * Math.PI * .9) + (v < .15 ? (1 - v / .15) * 3 : 0)) * s; };
  const inside = (x, y) => y >= bodyTop && y < trayTop && Math.abs(x + .5 - cx + Math.sin(y * .35) * .8 * s) <= half(y);
  contraShade(G, cx, (bodyTop + trayTop) / 2, 9 * s, inside);
  // marcas de sello en el cuerpo: cuadraditos más claros, como estampados a medias
  if (s > .6) for (let n = 0; n < 3; n++) { const bx = Math.round(cx + (n % 2 ? 2 : -5) * s), by = Math.round(bodyTop + (6 + n * 6) * s); for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) if (inside(bx + xx, by + yy) && (xx + yy) % 2 === 0) G.set(bx + xx, by + yy, 'x'); }
  // el tampón de lata a sus pies
  for (let y = trayTop; y < h; y++) for (let x = Math.round(1 * s); x < w - Math.round(1 * s); x++) G.set(x, y, y === trayTop ? 'n' : y === h - 1 ? 'r' : (x + y) % 2 ? 'm' : 'B');
  // el sello de goma por sombrero: base de goma, cuello de madera y pomo
  const sealW = Math.round(6 * s), sealY = bodyTop - Math.round(2 * s); for (let x = -sealW; x <= sealW; x++) { G.set(cx + x, sealY, 'y'); G.set(cx + x, sealY + 1, 'y'); }
  for (let y = sealY - Math.round(4 * s); y < sealY; y++) for (let x = -1; x <= 1; x++) G.set(cx + x, y, x < 0 ? 'l' : 'k');
  const knob = Math.max(1, Math.round(2.4 * s)), ky = sealY - Math.round(4 * s) - knob; for (let y = -knob; y <= knob; y++) for (let x = -knob - 1; x <= knob + 1; x++) if ((x / (knob + 1)) ** 2 + (y / knob) ** 2 <= 1) G.set(cx + x, ky + y, x + y < 0 ? 'l' : 'k');
  contraOutline(G);
  return { rows: G.map(r => r.join('')), eyes: [[Math.round(cx - 3 * s), Math.round(bodyTop + 7 * s)], [Math.round(cx + 2 * s), Math.round(bodyTop + 7 * s)]] };
}
function oxidoGrid(s) {
  const w = Math.round(40 * s), h = Math.round(28 * s), G = contraGrid(w, h), rnd = seeded(97 + Math.round(s * 10));
  const P = [[3, 9], [9, 3], [17, 6], [24, 2], [30, 5], [31, 14], [28, 24], [18, 26], [8, 25], [2, 18]].map(([x, y]) => [x * s, y * s]);
  const inside = (x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) c = !c; } return c; };
  contraShade(G, 16 * s, 14 * s, 13 * s, inside);
  // herrumbre: picaduras, escamas y regueros
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!inside(x, y)) continue; const n = rnd(); if (n < .08) G[y][x] = 'D'; else if (n < .14) G[y][x] = 'x'; else if ((x * 2 + y) % 9 === 0 && n < .5) G[y][x] = 'S'; }
  // remaches
  if (s > .6) for (const [x, y] of [[8, 7], [26, 6], [26, 21], [9, 21]]) { G.set(x * s, y * s, 'r'); G.set(x * s + 1, y * s, 'r'); G.set(x * s, y * s + 1, 'r'); G.set(x * s + 1, y * s + 1, 'r'); G.set(x * s, y * s, 'n'); }
  // la cuchilla del cúter asomando por un lado, en segmentos
  const by = Math.round(11 * s), bx0 = Math.round(30 * s), bx1 = w - 1; for (let x = bx0; x <= bx1; x++) for (let y = 0; y < Math.max(2, Math.round(4 * s)); y++) { const tip = x > bx1 - 2 * s && y > (x - (bx1 - 2 * s)) ; if (tip) continue; G.set(x, by + y, y === 0 ? 'n' : (x - bx0) % Math.max(2, Math.round(4 * s)) === 0 ? 'D' : 'm'); }
  contraOutline(G);
  return { rows: G.map(r => r.join('')), eyes: [[Math.round(13 * s), Math.round(12 * s)], [Math.round(20 * s), Math.round(12 * s)]] };
}
const CONTRA_GRID = { moho: mohoGrid, moraton: moratonGrid, oxido: oxidoGrid };
function contraPal(id) { const rp = ramp(CONTRARIOS[id].hex); return { O: '#140f14', D: mixHex(rp.dk, '#140f14', .3), S: rp.sh, B: rp.base, H: mixHex(rp.hi, rp.base, .3), W: rp.spec,
  x: id === 'oxido' ? '#d98a4a' : id === 'moraton' ? '#9a72b8' : '#c9d09a', y: id === 'moraton' ? '#2a1a30' : '#3a3a22', z: '#eef0c8', f: '#a8b890', m: '#7a7e86', n: '#c9ccd2', k: '#8a5a34', l: '#c08a5a', r: '#4a4e56' }; }
function contraDef(id, s, mini = false) { const g0 = CONTRA_GRID[id](s); return { rows: g0.rows, pal: contraPal(id), eyes: g0.eyes, eyeKind: 'ink', mini }; }
for (const id of CONTRA_TRIO) { lazySprite(id, () => contraDef(id, 1)); lazySprite(id + '_title', () => contraDef(id, 1.2)); lazySprite(id + '_mini', () => contraDef(id, .5, true)); }
// El Negro: los tres fundidos. Primero aún se ven los tres cuerpos con su color y seis ojos; luego la mezcla los
// ensucia; al final sólo queda negro agrietado por los tres colores.
function elNegroMatrix(phase = 1, mini = false) {
  const w = 64, h = 46, rows = Array.from({ length: h }, () => Array(w).fill('.')), parts = [['moho', 0, 16, 'x'], ['oxido', 24, 18, 'z'], ['moraton', 20, 0, 'y']], coreOf = {};
  for (const [id, ox, oy, key] of parts) { const d = CONTRA_GRID[id](1); d.rows.forEach((r, y) => r.split('').forEach((c, x) => { if (c === '.') return; const X = ox + x, Y = oy + y; if (X >= w || Y >= h) return; const cur = rows[Y][X]; if (c === 'O' && cur !== '.' && cur !== 'O') return;
      rows[Y][X] = c === 'O' ? 'O' : 'BSHD'.includes(c) ? c : 'S'; })); coreOf[key] = [ox + d.rows[0].length * .45, oy + d.rows.length * .55, d.rows[0].length * .26]; }
  const rnd = seeded(40 + phase);
  for (const [, , , key] of parts) { const [cx, cy, r0] = coreOf[key], r = phase === 1 ? r0 : phase === 2 ? r0 * .55 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] !== '.' && rows[y][x] !== 'O' && ((x - cx) / r) ** 2 + ((y - cy) / (r * .8)) ** 2 <= 1) rows[y][x] = key;
    if (phase > 1) { let x = Math.round(cx), y = Math.round(cy); for (let n = 0; n < 14; n++) { if (rows[y] && rows[y][x] && rows[y][x] !== '.' && rows[y][x] !== 'O') rows[y][x] = key; x += Math.round(rnd() * 2 - 1); y += rnd() < .6 ? 1 : -1; } } }
  const pal = { x: CONTRARIOS.moho.hex, y: CONTRARIOS.moraton.hex, z: CONTRARIOS.oxido.hex };
  const eyes = phase === 1 ? [[11, 32], [17, 32], [26, 12], [31, 12], [37, 30], [44, 30]] : phase === 2 ? [[18, 28], [27, 18], [35, 18], [44, 28]] : [[25, 22], [39, 22]];
  if (mini) { const small = []; for (let y = 0; y < h; y += 2) small.push(rows[y].filter((_, x) => x % 2 === 0).join('')); return { rows: small, pal, eyes: eyes.map(([x, y]) => [x >> 1, y >> 1]), eyeKind: 'ink', mini: true }; }
  return { rows: rows.map(r => r.join('')), pal, eyes, eyeKind: 'ink', big: phase === 3 };
}
lazySprite('el_negro', () => elNegroMatrix(1)); lazySprite('el_negro_2', () => elNegroMatrix(2)); lazySprite('el_negro_3', () => elNegroMatrix(3)); lazySprite('el_negro_mini', () => elNegroMatrix(1, true));

// ---- sus armas: el trapo mojado, el sello de goma y el cúter ----
function contraProp(kind) {
  return cached('contra-prop|' + kind, () => {
    const c = document.createElement('canvas'), x = c.getContext('2d'), F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    if (kind === 'trapo') { c.width = 16; c.height = 12; F('#140f14', 1, 1, 13, 8); F('#8a9a74', 2, 2, 11, 6); F('#a8b890', 2, 2, 7, 2); F('#6f7a5a', 3, 5, 9, 2); for (const [a, L] of [[3, 3], [7, 2], [11, 3]]) { F('#140f14', a - 1, 9, 3, L); F('#8a9a74', a, 9, 1, L); } F('#c9d09a', 5, 3, 2, 1); }
    else if (kind === 'sello') { c.width = 18; c.height = 20; F('#140f14', 6, 0, 6, 6); F('#c08a5a', 7, 1, 4, 4); F('#8a5a34', 9, 1, 2, 4); F('#140f14', 7, 6, 4, 6); F('#8a5a34', 8, 6, 2, 6); F('#140f14', 1, 12, 16, 7); F('#3a2a40', 2, 13, 14, 3); F('#6a3f86', 2, 16, 14, 2); F('#9a72b8', 3, 16, 5, 1); }
    else { c.width = 22; c.height = 7; F('#140f14', 0, 1, 9, 5); F('#e0b030', 1, 2, 7, 3); F('#f4d060', 1, 2, 7, 1); F('#140f14', 9, 1, 12, 4); F('#c9ccd2', 9, 2, 11, 2); F('#eef0f4', 9, 2, 11, 1); for (let a = 11; a < 20; a += 3) F('#7a7e86', a, 2, 1, 2); F('#c9ccd2', 20, 3, 1, 1); }
    return c;
  });
}
function contraDrawProp(img, x, y, a, s, flip = false) { g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(a); g.scale(flip ? -s : s, s); g.drawImage(img, -img.width / 2, -img.height / 2); g.restore(); }

// ---- ataques ----
function contraHit(u, t, power, opt = {}) { return damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, power), u.color, u.name, opt); }
function contraDrain(t, n) { if (!t.alive) return; const d = Math.min(t.mp, n); if (d <= 0) return; t.mp -= d; num(t, '-' + d, '#8ec8e8'); }
function* contraTrapazo(u, t) { // Moho frota al objetivo con un trapo mojado y le borra el color
  camFocus(u.wx, u.wy, { dist: 72, turn: -.25, h: 42, ease: .1 }); yield* anticipate(u, 12);
  camFocus(t.wx, t.wy, { dist: 80, turn: .25, h: 44 }); u.pose = 'attack'; yield* whop(u, ...infront(u, t, t.def.w * .7 + 16), 10, 12);
  const rag = contraProp('trapo'), st = { x: 0, a: 0 }, f = fx(999, () => { const c = PJ([t.wx + st.x, t.wy, t.def.h * .6]); contraDrawProp(rag, c[0], c[1], st.a, c[2] * 1.4); });
  for (let s = 0; s < 3; s++) { Audio.sfx('rub', { vol: .6 }); for (let i = 0; i < 8; i++) { const q = i / 8; st.x = Math.sin(q * Math.PI * 2) * 13 * (s % 2 ? -1 : 1); st.a = Math.sin(q * 6) * .35;
    if (i % 3 === 0) B.particles.push({ wx: t.wx + st.x, wy: t.wy, wz: t.def.h * .5, vx: R(-.4, .4), vy: 0, vz: -R(.1, .4), g: .06, col: '#a8b890', t: 0, life: 16 });
    if (s === 1 && i === 4) { contraHit(u, t, 1, { point: [t.wx, t.wy, t.def.h * .6] }); goop(t, '#d8d2bc', 90); mark({ kind: 'path', pts: [[t.wx - 14, t.wy - 3, t.def.h * .6], [t.wx + 14, t.wy + 3, t.def.h * .6]], w: 6, col: '#d8d2bc', life: 90, grow: 3 }); Audio.sfx('crumbs', { vol: .4 }); }
    yield; } }
  f.dur = 0; burst(t.wx, t.wy, t.def.h * .5, '#9fb07a', 8, 1.2, 20, .1); yield* wait(10); yield* returnHome(u); u.pose = 'idle'; camReset();
}
function* contraEsporas(u, targets, power = .75) { // Moho suelta esporas que se posan en el grupo y le chupan el pigmento
  camFocus(u.wx, u.wy, { dist: 84, turn: -.2, h: 48, ease: .1 }); u.pose = 'charge'; Audio.sfx('bubbles', { vol: .6 });
  for (let i = 0; i < 22; i++) { u.wz = Math.abs(Math.sin(i * .6)) * 3; if (i % 2 === 0) B.particles.push({ wx: u.wx + R(-8, 8), wy: u.wy + R(-4, 4), wz: u.def.h, vx: R(-.3, .3), vy: 0, vz: R(.4, .9), g: -.01, col: i % 4 ? '#c9d09a' : '#6f8a3a', t: 0, life: 30 }); yield; }
  u.wz = 0; Audio.sfx('fwip', { semi: -5 }); camFocus(partyC()[0], partyC()[1], { dist: 100, turn: .2, h: 54, subjects: alive(B.party) });
  for (const t of targets) stream(u, t, '#c9d09a', 14, 26); yield* wait(28);
  for (const t of targets) { if (!t.alive) continue; contraHit(u, t, power, { accent: 'tap' }); contraDrain(t, 3); burst(t.wx, t.wy, t.def.h * .6, '#9fb07a', 10, 1, 26, -.02); mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * .6, col: '#6f8a3a', grow: 6, life: 120, under: true }); }
  Audio.sfx('dissolve', { vol: .5 }); yield* wait(24); u.pose = 'idle'; camReset();
}
function* contraSellazo(u, t) { // Moratón salta y cae con el sello de su cabeza sobre el objetivo
  camFocus(t.wx, t.wy, { dist: 84, turn: .2, h: 52, pitch: .65 }); yield* anticipate(u, 12); u.pose = 'attack'; Audio.sfx('fwip', { semi: -3 });
  yield* whop(u, t.wx + 6, t.wy - 2, 16, 48); B.shake = 5; B.hitstop = 3; Audio.sfx('impact_sub', { vol: .6 }); Audio.sfx('plop', { semi: -10 });
  contraHit(u, t, 1, { point: [t.wx, t.wy, t.def.h], accent: 'finish' }); goop(t, CONTRARIOS.moraton.hex, 80);
  mark({ kind: 'blob', p: [t.wx, t.wy, 1], w: 14, col: CONTRARIOS.moraton.hex, seed: t.idx + 3, life: 140 }); burst(t.wx, t.wy, 4, '#9a72b8', 10, 1.6, 20, .12);
  yield* wait(10); yield* returnHome(u, 14); u.pose = 'idle'; camReset();
}
function contraSealFx(t, life = 70) { const f = fx(life, () => { const c = PJ([t.wx, t.wy, t.def.h + 14]), k = Math.min(1, f.t / 6), s = c[2] * (1.6 - .6 * k), a = f.t > life - 12 ? (life - f.t) / 12 : 1;
  g.save(); g.globalAlpha = a; g.strokeStyle = CONTRARIOS.moraton.hex; g.lineWidth = 2; g.beginPath(); g.arc(c[0], c[1], 8 * s, 0, 6.29); g.stroke(); g.beginPath(); g.moveTo(c[0] - 5 * s, c[1] - 5 * s); g.lineTo(c[0] + 5 * s, c[1] + 5 * s); g.moveTo(c[0] + 5 * s, c[1] - 5 * s); g.lineTo(c[0] - 5 * s, c[1] + 5 * s); g.stroke(); g.restore(); }); return f; }
function* contraCensura(u, t, power = 1.05) { // Moratón entinta un sello enorme y lo estampa: el objetivo queda sellado (sin técnicas ni mezclas)
  camFocus(u.wx, u.wy, { dist: 80, turn: -.2, h: 46, ease: .1 }); u.pose = 'charge'; Audio.sfx('charge', { semi: -5 });
  for (let i = 0; i < 18; i++) { if (i % 2 === 0) B.particles.push({ wx: u.wx + R(-6, 6), wy: u.wy + R(-3, 3), wz: u.def.h + 4, vx: 0, vy: 0, vz: R(.3, .8), g: -.02, col: '#9a72b8', t: 0, life: 24 }); yield; }
  camFocus(t.wx, t.wy, { dist: 86, turn: .25, h: 58, pitch: .7 }); u.pose = 'attack';
  const img = contraProp('sello'), st = { z: 120 }, sh = shadowFx(t.wx, t.wy, 4, 999), f = fx(999, () => { const c = PJ([t.wx, t.wy, st.z]); contraDrawProp(img, c[0], c[1] - 8 * c[2], 0, c[2] * 2.2); });
  Audio.sfx('fwip', { semi: -7 }); for (let i = 1; i <= 12; i++) { st.z = lerp(120, t.def.h * .9, (i / 12) ** 2.2); sh.draw = () => { const c = project(t.wx, t.wy, 0); if (c) shadow(c[0], c[1], Math.round((6 + i * 2) * c[2])); }; yield; }
  B.shake = 7; B.hitstop = 4; B.slowmo = 10; Audio.sfx('impact_sub', { vol: .8 }); Audio.sfx('ink_hit', { vol: .5 });
  contraHit(u, t, power, { accent: 'finish' }); applyStatus(t, 'sellado', 2); contraSealFx(t, 80); lensSplatter(CONTRARIOS.moraton.hex, 3, 7);
  mark({ kind: 'blob', p: [t.wx, t.wy, 1], w: 18, col: CONTRARIOS.moraton.hex, seed: 9, life: 160 });
  for (let i = 1; i <= 8; i++) { st.z = lerp(t.def.h * .9, 60, i / 8); yield; } f.dur = 0; sh.dur = 0; yield* wait(16); u.pose = 'idle'; camReset();
}
function* contraRaspado(u, t) { // Óxido se lanza con el cúter y raspa tres veces: saltan chispas y escamas
  camFocus(u.wx, u.wy, { dist: 70, turn: -.3, h: 40, ease: .1 }); yield* anticipate(u, 10); camFocus(t.wx, t.wy, { dist: 76, turn: .2, h: 42 }); u.pose = 'attack'; Audio.sfx('dash');
  const [ax, ay] = infront(u, t, t.def.w * .7 + 14); for (let i = 1; i <= 8; i++) { const k = i / 8; u.wx = lerp(u.hx, ax, k * (2 - k)); u.wy = lerp(u.hy, ay, k * (2 - k)); yield; }
  const blade = contraProp('cuter'), st = { k: 0, n: 0 }, f = fx(999, () => { const n = st.n, sx = n % 2 ? 1 : -1, x0 = t.wx - 14 * sx, x1 = t.wx + 14 * sx, c = PJ([lerp(x0, x1, st.k), t.wy, lerp(t.def.h + 6, 2, st.k)]); contraDrawProp(blade, c[0], c[1], sx > 0 ? .7 : -.7 + Math.PI, c[2] * 1.3); });
  for (let n = 0; n < 3; n++) { st.n = n; Audio.sfx('scratch', { vol: .6 }); for (let i = 0; i <= 5; i++) { st.k = i / 5; yield; }
    const sx = n % 2 ? 1 : -1; mark({ kind: 'path', pts: [[t.wx - 14 * sx, t.wy - 2 + n * 2, t.def.h + 4], [t.wx + 14 * sx, t.wy + 2 + n * 2, 2]], w: 2, col: '#7a3a1a', life: 110 });
    burst(t.wx, t.wy, t.def.h * .5, '#f0a050', 6, 1.6, 14, .1); if (n === 2) { contraHit(u, t, 1, { point: [t.wx, t.wy, t.def.h * .5], accent: 'finish' }); goop(t, CONTRARIOS.oxido.hex, 70); } else { materialImpact(t, CONTRARIOS.oxido.hex, .5, { accent: 'tap' }); t.pose = 'hurt'; t.poseT = 6; }
    yield* wait(3); }
  f.dur = 0; yield* wait(10); yield* returnHome(u, 10); u.pose = 'idle'; camReset();
}
function* contraHerrumbre(u, t, power = .9) { // Óxido deja caer escamas de óxido: el objetivo se oxida (recibe más daño)
  camFocus(t.wx, t.wy, { dist: 84, turn: .2, h: 54, pitch: .6 }); u.pose = 'charge'; Audio.sfx('crumbs', { vol: .6 });
  for (let i = 0; i < 30; i++) { for (let n = 0; n < 2; n++) B.particles.push({ wx: t.wx + R(-14, 14), wy: t.wy + R(-6, 6), wz: t.def.h + 40, vx: R(-.2, .2), vy: 0, vz: -R(.8, 1.6), g: .02, col: n ? '#d98a4a' : '#7a3a1a', t: 0, life: 30, size: 2 }); if (i % 8 === 0) Audio.sfx('scratch', { vol: .25, semi: -5 }); yield; }
  B.shake = 4; Audio.sfx('scratch_long', { vol: .5 }); contraHit(u, t, power, { accent: 'finish' }); applyStatus(t, 'oxidado', 3); goop(t, CONTRARIOS.oxido.hex, 110);
  mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * .7, col: '#7a3a1a', grow: 8, life: 160, under: true }); yield* wait(20); u.pose = 'idle'; camReset();
}
// ---- mezclas sucias ----
function* contraPodredumbre(users, targets, power = .85) { // el sello golpea el suelo y de la onda brotan esporas
  const mo = users.find(u => u.id === 'moraton'), mh = users.find(u => u.id === 'moho'), pc = partyC();
  camFocus(pc[0], pc[1], { dist: 104, turn: -.2, h: 58, pitch: .6, subjects: [...alive(B.party), mo] }); yield* anticipate(mo, 10); mo.pose = 'attack';
  yield* whop(mo, pc[0] + 20, pc[1], 16, 50); B.shake = 7; Audio.sfx('impact_sub', { vol: .8 });
  const ring = fx(40, () => { const c = PJ([pc[0], pc[1], 0]), k = ring.t / 40; g.strokeStyle = CONTRARIOS.moraton.hex; g.globalAlpha = 1 - k; g.lineWidth = 2; g.beginPath(); g.ellipse(c[0], c[1], (10 + k * 80) * c[2], (4 + k * 30) * c[2], 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; });
  Audio.sfx('bubbles', { vol: .6 }); for (let i = 0; i < 20; i++) { for (let n = 0; n < 3; n++) { const a = R(0, 6.28), d = i * 4; B.particles.push({ wx: pc[0] + Math.cos(a) * d, wy: pc[1] + Math.sin(a) * d * .6, wz: 2, vx: 0, vy: 0, vz: R(.5, 1.2), g: -.01, col: n ? '#c9d09a' : '#6f8a3a', t: 0, life: 26 }); } yield; }
  for (const t of targets) { if (!t.alive) continue; damage(t, baseDmg((mh.atk + mo.atk) / 2, t.dfn, power), 'moho', 'Podredumbre', { accent: 'tap' }); applyStatus(t, 'tiznado', 2); goop(t, '#6f8a3a', 90); }
  yield* wait(14); yield* returnHome(mo, 14); users.forEach(u => u.pose = 'idle'); camReset();
}
function* contraCarcoma(users, t, power = 1.8) { // el trapo envuelve al objetivo y el cúter lo sierra
  const mh = users.find(u => u.id === 'moho'), ox = users.find(u => u.id === 'oxido'); camFocus(t.wx, t.wy, { dist: 78, turn: .2, h: 46, subjects: [t, mh, ox] });
  yield* anticipate(mh, 8); mh.pose = 'attack'; yield* whop(mh, ...infront(mh, t, t.def.w * .6 + 14), 10, 10); Audio.sfx('rub'); goop(t, '#d8d2bc', 120);
  const rag = contraProp('trapo'), blade = contraProp('cuter'), st = { k: 0 }, f = fx(999, () => { const c = PJ([t.wx, t.wy, t.def.h * .55]); contraDrawProp(rag, c[0], c[1], 0, c[2] * 2); const b = PJ([t.wx + Math.sin(st.k * 20) * 10, t.wy, t.def.h * .55]); contraDrawProp(blade, b[0], b[1] - 2, .2, b[2] * 1.4); });
  ox.pose = 'attack'; for (let i = 0; i < 24; i++) { st.k = i / 24; if (i % 4 === 0) { Audio.sfx('scratch', { vol: .4 }); burst(t.wx, t.wy, t.def.h * .5, i % 8 ? '#f0a050' : '#a8b890', 4, 1.4, 12, .1); } yield; }
  f.dur = 0; B.shake = 6; B.slowmo = 12; damage(t, baseDmg((mh.atk + ox.atk) / 2, t.dfn, power), 'oxido', 'Carcoma', { accent: 'finish' }); applyStatus(t, 'oxidado', 3); goop(t, CONTRARIOS.oxido.hex, 90);
  yield* wait(14); yield* returnHome(mh, 12); users.forEach(u => u.pose = 'idle'); camReset();
}
function* contraTachadura(users, targets, power = .85) { // el cúter tacha al grupo con una X enorme y el sello marca al más fuerte
  const mo = users.find(u => u.id === 'moraton'), ox = users.find(u => u.id === 'oxido'), pc = partyC(), big = alive(targets).sort((a, b) => b.atk - a.atk)[0];
  camFocus(pc[0], pc[1], { dist: 108, turn: .2, h: 56, pitch: .6, subjects: alive(B.party) }); ox.pose = 'attack'; Audio.sfx('scratch_long', { vol: .7 });
  for (const [a, b] of [[[pc[0] - 40, pc[1] - 20, 30], [pc[0] + 40, pc[1] + 20, 2]], [[pc[0] + 40, pc[1] - 20, 30], [pc[0] - 40, pc[1] + 20, 2]]]) { mark({ kind: 'path', pts: [a, b], w: 4, col: '#7a3a1a', life: 150, grow: 6 }); for (let i = 0; i < 8; i++) { if (i % 2) burst(lerp(a[0], b[0], i / 8), lerp(a[1], b[1], i / 8), lerp(a[2], b[2], i / 8), '#f0a050', 3, 1.2, 12, .1); yield; } B.shake = 4; }
  for (const t of targets) if (t.alive) damage(t, baseDmg((mo.atk + ox.atk) / 2, t.dfn, power), 'moraton', 'Tachadura', { accent: 'tap' });
  if (big && big.alive) { mo.pose = 'attack'; Audio.sfx('impact_sub', { vol: .6 }); applyStatus(big, 'sellado', 2); contraSealFx(big, 80); mark({ kind: 'blob', p: [big.wx, big.wy, 1], w: 16, col: CONTRARIOS.moraton.hex, seed: 11, life: 150 }); }
  yield* wait(24); users.forEach(u => u.pose = 'idle'); camReset();
}
// Agua negra: los tres escurren su color en un orbe negro que sube y cae sobre el grupo, bebiéndose su pigmento
function* contraAguaNegra(users, targets, tech) {
  const mid = [users.reduce((a, u) => a + u.wx, 0) / users.length, users.reduce((a, u) => a + u.wy, 0) / users.length], pc = partyC();
  camFocus(mid[0], mid[1], { dist: 96, turn: -.3, h: 52, pitch: .55, ease: .1 });
  const { of, orb } = yield* fuseAt(users, mid[0], mid[1], 22, '#1a1520'); yield* wait(6);
  camFocus(pc[0], pc[1], { dist: 110, turn: .2, h: 58, pitch: .5, ease: .08, subjects: alive(B.party) }); Audio.sfx('fwip', { semi: -7 });
  const oil = CONTRA_TRIO.map(id => CONTRARIOS[id].hex), rays = fx(999, () => { const c = PJ([orb.wx, orb.wy, orb.wz]); for (let i = 0; i < 3; i++) { const a = rays.t * .2 + i * 2.09, r = 26 * c[2]; g.fillStyle = oil[i]; for (let s = 0; s < 8; s++) { const aa = a - s * .25; g.fillRect(Math.round(c[0] + Math.cos(aa) * r * (1 - s * .08)), Math.round(c[1] + Math.sin(aa) * r * .5 * (1 - s * .08)), 2, 2); } } });
  for (let i = 1; i <= 22; i++) { const k = i / 22, e = k * k * (3 - 2 * k); orb.wx = lerp(mid[0], pc[0], e); orb.wy = lerp(mid[1], pc[1], e); orb.wz = lerp(22, 78, Math.sin(k * Math.PI / 2)); orb.r = lerp(orb.r, 14, .08); yield; }
  Audio.sfx('hum_down', { vol: .6 }); for (let i = 0; i < 14; i++) { orb.r += .25; yield; }
  for (let i = 1; i <= 9; i++) { orb.wz = lerp(78, 2, (i / 9) ** 2); yield; }
  rays.dur = 0; of.dur = 0; B.shake = 8; B.hitstop = 4; B.slowmo = 16; if (Prefs.flash) B.flash = { col: '#140f14', a: .55 }; Audio.sfx('ink_tide', { vol: .9 }); Audio.sfx('impact_sub', { vol: .8 });
  lensSplatter('#140f14', 8, 5); mark({ kind: 'pool', p: [pc[0], pc[1], 0], w: 70, col: '#140f14', grow: 14, life: 180, under: true });
  const atk = users.reduce((a, u) => a + u.atk, 0) / users.length;
  for (const t of targets) { if (!t.alive) continue; damage(t, baseDmg(atk, t.dfn, tech.power), 'negro', 'Los Contrarios', { accent: 'finish' }); contraDrain(t, 4); goop(t, '#140f14', 100); burst(t.wx, t.wy, t.def.h * .5, '#140f14', 10, 1.8); }
  yield* wait(30); for (const u of users) { u.pose = 'idle'; u.wz = 0; } yield* wait(8); camReset();
}
// ---- cómo deciden y cómo actúan: como nosotras, cada uno a su turno, con magias y mezclas ----
const CONTRA_MAGIA = { moho: { name: 'Esporas', all: true }, moraton: { name: 'Censura', all: false }, oxido: { name: 'Herrumbre', all: false } };
const CONTRA_MIX = { 'moho+moraton': { name: 'Podredumbre', all: true }, 'moho+oxido': { name: 'Carcoma', all: false }, 'moraton+oxido': { name: 'Tachadura', all: true } };
function contraPlan(u) {
  const mates = alive(B.enemies).filter(e => e !== u && e.ai === 'contrario');
  if (mates.length === 2 && !B.negroPlanned && u.acts >= 3) { B.negroPlanned = true; return { kind: 'negro', name: 'Agua negra', all: true }; }
  if (mates.length && u.acts % 3 === 2) { const p = mates[u.acts % mates.length], key = [u.id, p.id].sort().join('+'), m = CONTRA_MIX[key]; if (m) return { kind: 'mix', name: m.name, partner: p, key, all: m.all }; }
  if (u.acts % 2 === 1) { const m = CONTRA_MAGIA[u.id]; return { kind: 'magia', name: m.name, all: m.all }; }
  return { kind: 'attack', name: u.data.intentNames.attack, all: false };
}
function* contraAct(u, intent, targets, target) {
  if (intent.kind === 'negro') { const users = alive(B.enemies).filter(e => e.ai === 'contrario'); if (users.length < 2) { yield* contraAttack(u, target); return; }
    users.forEach(e => { if (e !== u) { e.atb = 0; e.acting = true; } }); try { yield* contraAguaNegra(users, targets, { power: 1.2 }); } finally { users.forEach(e => { if (e !== u) e.acting = false; }); } return; }
  if (intent.kind === 'mix') { const p = intent.partner; if (!p || !p.alive) { yield* contraAttack(u, target); return; }
    p.atb = 0; p.acting = true; try { const users = [u, p];
      if (intent.key === 'moho+moraton') yield* contraPodredumbre(users, targets); else if (intent.key === 'moho+oxido') yield* contraCarcoma(users, target); else yield* contraTachadura(users, targets);
    } finally { p.acting = false; } return; }
  if (intent.kind === 'magia') { if (u.id === 'moho') yield* contraEsporas(u, targets); else if (u.id === 'moraton') yield* contraCensura(u, target); else yield* contraHerrumbre(u, target); return; }
  yield* contraAttack(u, target);
}
function* contraAttack(u, t) { if (u.id === 'moho') yield* contraTrapazo(u, t); else if (u.id === 'moraton') yield* contraSellazo(u, t); else yield* contraRaspado(u, t); }

// ---- en el mapa y su entrada a batalla ----
function drawContraFoe(f, cx, cy) {
  const x = f.x - cx, y = f.y - cy; g.fillStyle = '#2e2c22'; g.beginPath(); g.ellipse(x, y + 4, 26, 7, 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4a36'; g.beginPath(); g.ellipse(x, y + 3, 22, 5, 0, 0, 6.29); g.fill();
  CONTRA_TRIO.forEach((id, i) => { const bx = x + (i - 1) * 15, by = y + 3 - (i === 1 ? 4 : 0) + Math.round(Math.sin(OW.t * .07 + i * 2) * 1); drawSprite(buildSprite(id + '_mini', C('negro'), null, { eyes: 'normal' }), bx, by, 1, i === 2); });
}
function contraRise(x, y, k, scale) { // salen del agua sucia uno a uno
  CONTRA_TRIO.forEach((id, i) => { const q = clamp((k - i * .26) / .3, 0, 1); if (q <= 0) return; const bx = x + (i - 1) * 22 * scale, sink = (1 - q * q) * 22 * scale;
    g.save(); g.beginPath(); g.rect(0, 0, W, y + 2); g.clip(); drawSprite(buildSprite(id + '_mini', C('negro'), null, { eyes: 'normal' }), Math.round(bx), Math.round(y + sink), scale * (1 + (1 - q) * .2), i === 2, scale); g.restore();
    if (q < 1) { g.strokeStyle = CONTRARIOS[id].hex; g.lineWidth = 1; g.globalAlpha = 1 - q; g.beginPath(); g.ellipse(bx, y + 2, 6 + q * 20, 2 + q * 5, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; } });
}
function drawContraFx(T) { // sólo la llegada y el diálogo; el resto es la mancha del encuentro, a tres colores
  const foe = T.foe, fx0 = foe.x - Math.round(OW.cam.x), fy0 = foe.y - Math.round(OW.cam.y), t = B.t, k = T.stage === 'surface' ? T.k : 1;
  g.fillStyle = 'rgba(20,18,12,' + (.2 + k * .3).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2e2c22'; g.beginPath(); g.ellipse(fx0, fy0 + 4, 26 + k * 20, 7 + k * 5, 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4a36'; g.beginPath(); g.ellipse(fx0, fy0 + 3, 22 + k * 18, 5 + k * 4, 0, 0, 6.29); g.fill();
  for (let i = 0; i < 6; i++) { const q = ((t * .03 + i * .17) % 1); g.fillStyle = 'rgba(111,138,58,' + (.6 * (1 - q)).toFixed(2) + ')'; g.beginPath(); g.arc(fx0 - 30 + i * 12, fy0 + 3 - q * 10, 1 + q * 2, 0, 6.29); g.fill(); }
  contraRise(fx0, fy0 + 3, k, 1.8);
  if (T.stage === 'dialogue' && T.dlg) drawDialogue(T.dlg);
}
function* contraTransitionGen(foe) {
  const T = B.tr; T.contra = true; T.foe = foe; OW.hideFoe = foe; Audio.prepare('prelude'); Audio.prepare('contrarios'); Audio.stop(.6); Audio.sfx('hum_down', { vol: .6 });
  T.stage = 'surface'; for (let i = 0; i < 72; i++) { T.k = i / 72; if (i === 8 || i === 28 || i === 48) Audio.sfx('splash', { vol: .5, semi: [-5, -2, 1][(i - 8) / 20] }); if (i % 12 === 0) Audio.sfx('bubbles', { vol: .25 }); yield; }
  const saved = DATA.bossDialogue; DATA.bossDialogue = TRIO_DIALOGUE; Audio.play('prelude', { fade: .8 });
  T.stage = 'dialogue'; T.dlg = { i: 0, ch: 0, t: 0 };
  try { while (T.dlg.i < TRIO_DIALOGUE.length) { const line = TRIO_DIALOGUE[T.dlg.i]; T.dlg.t++;
      if (T.dlg.ch < line.text.length) { const wrote = T.dlg.wrote || 0; writerAdvance(T.dlg, line.text); if (Math.floor((T.dlg.wrote || 0) / 3) !== Math.floor(wrote / 3)) Audio.sfx('text', { vol: .65, semi: SEMI[line.who] ?? -7 }); }
      if (hit('ok')) { if (T.dlg.ch < line.text.length) T.dlg.ch = line.text.length; else { T.dlg.i++; T.dlg.ch = 0; T.dlg.t = 0; T.dlg.hold = 0; T.dlg.wrote = 0; Audio.sfx('page', { vol: .5 }); } }
      yield; } } finally { DATA.bossDialogue = saved; }
  // y ahora, la mancha de todos los encuentros... pero a tres colores
  T.contra = false; T.dlg = null; yield* transitionGen(foe, { tri: true, music: 'contrarios' });
}
// La mancha del encuentro a tres colores: saltan los tres, cada uno salpica de su color (con fogonazos y negativos
// teñidos), la tinta que se traga el mapa es de tres colores jaspeados que se ennegrecen, y en la oscuridad se abren tres
// pares de ojos de color.
function drawEncounterTri(T, sx, sy, fx0, fy0) {
  const k = T.k || 0, t = B.t, cols = CONTRA_TRIO.map(id => CONTRARIOS[id].hex);
  if (T.stage === 'detect') {
    drawVignette(k * .7, fx0, fy0); g.globalAlpha = .7; drawSpeedLines(fx0, fy0, k, t); g.globalAlpha = 1;
    CONTRA_TRIO.forEach((id, i) => { const sq = 1 + k * .5, tr = k > .4 && Prefs.shake ? (((Game.t + i) >> 1) & 1 ? 1 : -1) : 0; drawSprite(buildSprite(id + '_mini', C('negro'), null, { eyes: 'normal' }), fx0 + (i - 1) * 15 + tr, fy0 + 3 - (i === 1 ? 4 : 0), sq, i === 2, 1 / sq); });
    drawInkBang(fx0, fy0 - 26, T.q || 0);
  } else if (T.stage === 'fall') {
    drawVignette(.7 + k * .2, sx, sy);
    CONTRA_TRIO.forEach((id, i) => { const q = clamp((k - i * .18) / .64, 0, 1); if (q <= 0) { drawSprite(buildSprite(id + '_mini', C('negro'), null, {}), fx0 + (i - 1) * 15, fy0 + 3, 1.4, i === 2, .7); return; }
      const arc = Math.sin(q * Math.PI), x = lerp(fx0 + (i - 1) * 15, sx + (i - 1) * 14, q), yb = lerp(fy0, sy, q), sc = 1 + arc * 1.9;
      g.fillStyle = cols[i]; for (let n = 1; n <= 7; n++) { const qq = q - n * .04; if (qq <= 0) break; const a2 = Math.sin(qq * Math.PI); g.beginPath(); g.arc(lerp(fx0 + (i - 1) * 15, sx + (i - 1) * 14, qq), lerp(fy0, sy, qq) - 2 - a2 * 36, Math.max(.6, (1 + a2 * 2) * (1 - n / 9)), 0, 6.29); g.fill(); }
      drawSprite(buildSprite(id + '_mini', C('negro'), null, { eyes: 'normal' }), x, yb - 2 - arc * 36, sc * (q < .3 ? .8 : 1), i === 2, q < .3 ? 1.35 : 1); });
  } else if (T.stage === 'splash') {
    const hs = T.hs ?? 99; drawVignette(.9, sx, sy);
    CONTRA_TRIO.forEach((id, i) => { const kk = clamp((k - i * .12) / .76, 0, 1); if (kk > 0 || hs < 5) drawImpact(T, sx + (i - 1) * 18, sy + (i === 1 ? -4 : 2), hs < 5 ? 0 : kk, cols[i]); });
    drawLensDrops(T, sx, sy, k);
    if (hs < 5 && Prefs.flash) { // fogonazo de papel y tres negativos, cada uno teñido de un Contrario
      if (hs === 0) { g.fillStyle = 'rgba(244,231,200,.9)'; g.fillRect(0, 0, W, H); }
      else if (hs < 4) { g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = mixHex(cols[hs - 1], '#ffffff', .35); g.fillRect(0, 0, W, H); g.restore(); }
    } else if (Prefs.flash && k < .5) { const i = Math.min(2, Math.floor(k / .17)); g.save(); g.globalAlpha = .18 * (1 - (k % .17) / .17); g.fillStyle = cols[i]; g.fillRect(0, 0, W, H); g.restore(); }
  }
}
// Tinta jaspeada de tres colores: cada píxel toma el color de la mancha que le llega antes; en las costuras entre dos
// colores la mezcla se ensucia en negro, y según avanza (dark) todo se oscurece hasta la tinta.
function inkLayerTri(pts, R, dark, t = 0) {
  inkFields(); const S = inkSurface(), px = S.px, N = INKF.noise, F = INKF.fiber, fr = 14, sq = 1.2;
  const pal = pts.map(p => { const c = hexRgb(mixHex(p.col, '#0b0912', proQDark(.25 + .75 * dark))), d = hexRgb(mixHex(p.col, '#0b0912', proQDark(.55 + .45 * dark))), h = hexRgb(mixHex(p.col, '#f4e7c8', .25 * (1 - dark)));
    return { core: inkRGBA(c[0], c[1], c[2]), rim: inkRGBA(h[0], h[1], h[2]), fringe: inkRGBA(d[0], d[1], d[2]), halo: inkRGBA(d[0], d[1], d[2], 84) }; });
  const seam = INK_COL.core;
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const n = N[i], f = F[i], m = (.6 + .8 * n); let e1 = 1e9, e2 = 1e9, j1 = 0;
    for (let j = 0; j < pts.length; j++) { const dx = x - pts[j].x, dy = (y - pts[j].y) * sq, warp = (N[(i + j * 7919 + 131) % N.length] - .5) * 46 + Math.sin((x + y * .6) * .07 + j * 2.1 + t * .02) * 7, e = Math.sqrt(dx * dx + dy * dy) * m - f * f * 9 + warp; if (e < e1) { e2 = e1; e1 = e; j1 = j; } else if (e < e2) e2 = e; } // cada color con su propio grano: las costuras se jaspean
    const P = pal[j1];
    if (e1 < R) { px[i] = e2 - e1 < 2.5 && e2 < R ? seam : e1 > R - 2.2 ? P.rim : P.core; continue; }
    const u = (e1 - R) / fr; px[i] = u < 1 ? (f > u * .9 + .08 ? P.fringe : f > u * .5 + .5 ? P.halo : 0) : 0;
  }
  S.ctx.putImageData(S.img, 0, 0); g.drawImage(S.canvas, 0, 0);
}
const proQDark = k => Math.round(clamp(k, 0, 1) * 20) / 20;
function drawEncounterBlotTri(T, sx, sy, q) {
  if (T.coverR == null) T.coverR = inkCoverRadius(sx, sy) + 30;
  const k = T.k, grow = k < .56 ? k / .56 : 1, e = 1 - Math.pow(1 - grow, 2.2), R = e * T.coverR, dark = clamp((k - .25) / .5, 0, 1);
  if (grow < 1 && MAPC) { MAPG.save(); MAPG.globalCompositeOperation = 'saturation'; MAPG.globalAlpha = Math.min(1, grow * 1.4); MAPG.fillStyle = '#808080'; MAPG.fillRect(0, 0, W, H); MAPG.restore(); g.drawImage(MAPC, 0, 0); }
  inkLayerTri(CONTRA_TRIO.map((id, i) => ({ x: sx + (i - 1) * 18, y: sy + (i === 1 ? -4 : 2), col: CONTRARIOS[id].hex })), R, dark, B.t);
  drawLensDrops(T, sx, sy, 1 + k * .6);
  if (k > .58 && q) { T.eyes ||= [q[0], q[1] - 26]; const o = clamp((k - .58) / .1, 0, 1);
    CONTRA_TRIO.forEach((id, i) => { const ex0 = T.eyes[0] + (i - 1) * 40, ey0 = T.eyes[1] + (i === 1 ? -10 : 4), blink = k > .8 + i * .03 && k < .84 + i * .03 ? .12 : 1, h = Math.max(1, 9 * easeBack(o) * blink), col = CONTRARIOS[id].hex;
      const gl = g.createRadialGradient(ex0, ey0, 2, ex0, ey0, 26); gl.addColorStop(0, col); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.globalAlpha = .5 * o; g.fillStyle = gl; g.fillRect(ex0 - 28, ey0 - 28, 56, 56); g.restore();
      for (const s of [-1, 1]) { const ex = ex0 + s * 7; g.fillStyle = mixHex(col, '#f4e7c8', .55); g.beginPath(); g.ellipse(ex, ey0, 4, h / 2 + .5, s * .12, 0, 6.29); g.fill(); if (h > 4) { g.fillStyle = '#0b0912'; g.fillRect(Math.round(ex - 1 + s), Math.round(ey0 - 1), 2, 3); } } }); }
}
