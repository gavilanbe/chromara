// CHROMARA — attacks.js: coreografías de todos los ataques. Cada acción se ve como lo que es: la herramienta es un prop
// que entra en escena y actúa sobre el objetivo; la cámara Golden Sun se gira hacia la acción y vuelve.
'use strict';
const GRAPHITE = '#4a4460', GRAPHITE2 = '#2a2438';
// --- utilidades de coreografía
function above(u, k = .5, dx = 0, dy = 0) { return [u.wx + dx, u.wy + dy, u.def.h * k]; } // punto de mundo sobre una unidad
function towards(a, b, k) { return [lerp(a.wx, b.wx, k), lerp(a.wy, b.wy, k)]; }
function side(u, d) { const { rx, ry } = B.axis; return [u.wx + rx * d, u.wy + ry * d]; } // desplazamiento lateral al eje del combate
function fwdOf(u, d) { const { dx, dy } = B.axis; return [u.wx + dx * d, u.wy + dy * d]; } // hacia los enemigos (d>0) o hacia el grupo (d<0)
function overlay(dur, col, aIn = .6, fadeIn = 8, fadeOut = 10) { const f = fx(dur, () => { const k = f.t < fadeIn ? f.t / fadeIn : f.t > dur - fadeOut ? (dur - f.t) / fadeOut : 1; g.fillStyle = col; g.globalAlpha = aIn * clamp(k, 0, 1); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }); return f; }
function ghostsOf(u) { const gh = []; const f = fx(999, () => { for (const q of gh) { const c = project(q.wx, q.wy, q.wz); if (!c) continue; g.globalAlpha = Math.max(0, .4 * (1 - q.t / 10)); const info = unitSpriteInfo(u, 0); drawSprite(info.spr, c[0], c[1], c[2] * B.unitScale * info.sx, false, info.sy); q.t++; } g.globalAlpha = 1; }); return { add: () => gh.push({ wx: u.wx, wy: u.wy, wz: u.wz, t: 0 }), end: () => { f.dur = 0; } }; }
function shadowFx(wx, wy, r, dur) { const f = fx(dur, () => { const c = project(wx, wy, 0); if (c) shadow(c[0], c[1], Math.round(r * c[2])); }, true); return f; }
function flakes(t, col, n = 8) { for (let i = 0; i < n; i++) B.particles.push({ wx: t.wx + R(-t.def.w * .4, t.def.w * .4), wy: t.wy + R(-3, 3), wz: R(2, t.def.h), vx: R(-.2, .2), vy: 0, vz: 0, g: .05, col, t: 0, life: 26, size: 2 }); }
function drips(wx, wy, wz, col, n = 6) { for (let i = 0; i < n; i++) B.particles.push({ wx: wx + R(-6, 6), wy: wy + R(-3, 3), wz, vx: 0, vy: 0, vz: -R(.2, .6), g: .06, col, t: RI(-8, 0), life: 22, size: 2 }); }
function* returnHome(u, n = 12) { u.pose = 'idle'; yield* whop(u, u.hx, u.hy, n, 10); u.wz = 0; u.pose = 'hurt'; u.poseT = 5; yield* wait(6); }
// Anticipación: la gota se encoge y tiembla un instante antes de actuar, y su color se le concentra (partículas que entran)
function* anticipate(u, n = 12) { u.pose = 'charge'; Audio.sfx('charge', { semi: SEMI[u.id] || -5, vol: .5 }); for (let i = 0; i < n; i++) { u.wz = i > n - 4 ? (n - i) * 1.5 : Math.sin(i * 1.3) * .8; if (i % 2 === 0) { const a = R(0, 6.28), d = 14; B.particles.push({ wx: u.wx + Math.cos(a) * d, wy: u.wy + Math.sin(a) * d * .5, wz: R(0, u.def.h), tx: u.wx, ty: u.wy, tz: u.def.h * .5, col: C(u.color), t: 0, life: 8, dur: 8, arc: 0, stream: true }); } yield; } u.wz = 0; }

// =====================================================================
// Ataques básicos: cada herramienta hace lo suyo
// =====================================================================
function* atkBrocha(u, t) { // la brocha entra enorme por el borde, en primer plano, y cruza hasta el enemigo dejando un trazo de cerdas que lo tapa; se seca y se descascarilla
  const col = C(u.color); camFocus(u.wx, u.wy, { dist: 70, turn: .3, h: 40, ease: .1 }); yield* anticipate(u, 12); camFocus(t.wx, t.wy, { dist: 78, turn: -.3, h: 44 }); u.pose = 'attack'; const [ax, ay] = infront(u, t, t.def.w * .7 + 18); yield* whop(u, ax, ay, 10, 12); yield* wait(4);
  const img = propSprite('brocha', col), P = PROP.brocha, st = { k: 0 }; Audio.sfx('brush_sweep', { pan: .3 });
  const end = above(t, .55, 4, 0), pf = fx(999, () => { const e = PJ(end), k = st.k, sc = lerp(2.6, 1.1 * e[2], k), x = lerp(W + 40, e[0], k), y = lerp(H - 10, e[1], k); drawProp(img, x, y, P.a - .6 + k * .5, -1, P.tip[0], P.tip[1], sc); });
  for (let i = 1; i <= 14; i++) { st.k = (i / 14) ** 1.6; yield; } yield* wait(3);
  // el trazo: cerdas gruesas que cruzan al enemigo en diagonal
  const pts = [[t.wx - 14, t.wy - 6, t.def.h + 6], [t.wx + 12, t.wy + 6, -2]]; mark({ kind: 'path', pts, w: 11, col, grow: 5, life: 70, jit: 1 }); mark({ kind: 'path', pts: pts.map(p => [p[0] + 2, p[1] + 2, p[2]]), w: 4, col: ramp(col).hi, grow: 5, life: 60 });
  for (let i = 1; i <= 8; i++) { st.k = 1; const e = PJ(end); pf.draw = () => { const k = i / 8; drawProp(img, e[0] - 10 + k * 22, e[1] - 18 + k * 30, P.a - .1 + k * .3, -1, P.tip[0], P.tip[1], 1.1 * e[2]); }; if (i === 4) { hitBasic(u, t); goop(t, col, 90); drips(t.wx, t.wy, t.def.h * .6, col); B.slowmo = Math.max(B.slowmo, 6); } yield; }
  yield* wait(6); for (let i = 1; i <= 9; i++) { const e = PJ(end); pf.draw = () => drawProp(img, e[0] + 12 + i * 6, e[1] + 12 - i * 7, P.a + .2 - i * .06, -1, P.tip[0], P.tip[1], 1.1 * e[2] * (1 + i * .1), 1 - i / 10); yield; }
  pf.dur = 0; const dry = fx(70, () => { if (dry.t === 48) { flakes(t, col, 10); Audio.sfx('crumbs'); } });
  yield* wait(22); yield* returnHome(u); yield* wait(8); camReset();
}
function* atkLapiz(u, t) { // el lápiz garabatea alrededor del enemigo a toda velocidad y lo tacha con dos rayas; saltan virutas
  const col = C(u.color); camFocus(u.wx, u.wy, { dist: 70, turn: .3, h: 40, ease: .1 }); yield* anticipate(u, 10); camFocus(t.wx, t.wy, { dist: 74, turn: -.2, h: 40 }); u.pose = 'attack'; const gh = ghostsOf(u); Audio.sfx('dash');
  const [ax, ay] = infront(u, t, t.def.w * .7 + 16); for (let i = 1; i <= 8; i++) { const k = i / 8; u.wx = lerp(u.hx, ax, k * (2 - k)); u.wy = lerp(u.hy, ay, k * (2 - k)); if (i % 2) gh.add(); yield; }
  // garabato: espiral alrededor del cuerpo
  const pts = []; for (let i = 0; i < 12; i++) { const a = i * 1.9, r = t.def.w * (.5 + (i % 3) * .12); pts.push([t.wx + Math.cos(a) * r, t.wy + Math.sin(a) * r * .5, t.def.h * (.15 + (i / 12) * .8)]); }
  Audio.sfx('scratch'); Audio.sfx('scratch', { when: .12 });
  yield* wait(4); yield* toolStroke({ kind: 'lapiz', color: col, pts, w: 2, col: GRAPHITE, under: GRAPHITE2, frames: 16, fac: -1, life: 80, jit: 1, scale: 1.1, onTip: (k, wp) => { if (Math.random() < .5) B.particles.push({ wx: wp[0], wy: wp[1], wz: wp[2], vx: R(-.4, .4), vy: 0, vz: R(.2, .8), g: .08, col: '#e8cf9a', t: 0, life: 14 }); } });
  // tachón: dos rayas amarillas
  const X1 = [[t.wx - 12, t.wy - 4, t.def.h + 4], [t.wx + 12, t.wy + 4, 0]], X2 = [[t.wx + 12, t.wy - 4, t.def.h + 4], [t.wx - 12, t.wy + 4, 0]];
  yield* wait(5); Audio.sfx('scratch_long'); yield* toolStroke({ kind: 'lapiz', color: col, pts: X1, w: 3, col, frames: 6, fac: -1, life: 80, scale: 1.1 });
  hitBasic(u, t); goop(t, col, 60); burst(t.wx, t.wy, t.def.h * .5, '#e8cf9a', 8, 1.4, 18, .1);
  yield* toolStroke({ kind: 'lapiz', color: col, pts: X2, w: 3, col, frames: 6, fac: -1, life: 80, scale: 1.1 });
  gh.end(); yield* wait(20); yield* returnHome(u, 8); yield* wait(6); camReset();
}
function* atkPincel(u, t) { // el pincel se moja en Añil (se agita), pinta una voluta en el aire que sale disparada como latigazo de tinta y salpica gotas que ruedan por el suelo
  const col = C(u.color); camFocus(u.wx, u.wy, { dist: 70, turn: .35, h: 40 }); u.pose = 'charge';
  const img = propSprite('pincel', col), P = PROP.pincel, st = { dip: 0 }; sparkle(u.wx, u.wy, u.def.h + 22);
  const pf = fx(999, () => { const c = PJ(above(u, 1)); drawProp(img, c[0] + 6, c[1] - 26 * c[2] + st.dip, -1.35, 1, P.tip[0], P.tip[1], 1.2 * c[2]); });
  Audio.sfx('brush_hiss'); for (let i = 0; i < 20; i++) { st.dip = i < 10 ? i * 2.2 : (20 - i) * 2.2; u.wz = i > 6 && i < 15 ? R(-1, 1) : 0; if (i > 7 && i % 2) drips(u.wx, u.wy, u.def.h * .6, col, 2); yield; }
  yield* wait(4);
  pf.dur = 0; u.wz = 0; camFocus(t.wx, t.wy, { dist: 80, turn: -.25, h: 46 });
  // voluta: espiral en el aire que se lanza hacia el objetivo
  const pts = []; for (let i = 0; i <= 14; i++) { const k = i / 14, [x, y] = towards(u, t, k * k), a = k * 9; pts.push([x + B.axis.rx * Math.sin(a) * 10 * (1 - k), y + B.axis.ry * Math.sin(a) * 10 * (1 - k), u.def.h * .8 + Math.cos(a) * 8 * (1 - k) + k * t.def.h * .4]); }
  Audio.sfx('fwip'); const wp = pts[0]; sparkle(wp[0], wp[1], wp[2]);
  yield* toolStroke({ kind: 'pincel', color: col, pts, w: 4, col, frames: 14, fac: -1, life: 60, scale: 1, onTip: (k, p) => { if (k > .9 && !t.__hit) { t.__hit = 1; hitBasic(u, t); goop(t, col, 80); Audio.sfx('splash_clean'); burst(p[0], p[1], p[2], col, 12, 2, 24, .1); for (let i = 0; i < 6; i++) B.particles.push({ wx: t.wx, wy: t.wy, wz: 2, vx: R(-1.5, 1.5), vy: R(-.8, .8), vz: R(.2, .8), g: .05, col, t: 0, life: 40, size: 2 }); } } });
  t.__hit = 0; yield* wait(26); u.pose = 'idle'; yield* wait(6); camReset();
}
// =====================================================================
// Techs simples
// =====================================================================
function* techBrochazo(u, t, tech, col) { // la brocha cae desde arriba como un mazo y estampa una Z roja en tres golpes; el suelo bajo el enemigo queda pintado
  camFocus(u.wx, u.wy, { dist: 70, turn: .3, h: 40, ease: .1 }); yield* anticipate(u, 14); camFocus(t.wx, t.wy, { dist: 84, turn: -.3, h: 56, pitch: .7 }); u.pose = 'attack'; yield* whop(u, ...infront(u, t, t.def.w * .8 + 24), 10, 14); yield* wait(6);
  const img = propSprite('brocha', C(col)), P = PROP.brocha, st = { wz: 110, a: 0 }, anchor = [t.wx, t.wy];
  const pf = fx(999, () => { const c = PJ([anchor[0], anchor[1], st.wz]); drawProp(img, c[0] + 22 * c[2], c[1], -1.2 + st.a, -1, P.tip[0], P.tip[1], 1.7 * c[2]); });
  const strokes = [[[t.wx - 16, t.wy - 12], [t.wx + 16, t.wy - 12]], [[t.wx + 16, t.wy - 12], [t.wx - 16, t.wy + 12]], [[t.wx - 16, t.wy + 12], [t.wx + 16, t.wy + 12]]];
  const sh = shadowFx(t.wx, t.wy, 4, 999);
  for (let s = 0; s < 3; s++) {
    Audio.sfx('brush_big'); for (let i = 1; i <= 9; i++) { st.wz = lerp(110, 4, (i / 9) ** 2.2); sh.draw = () => { const c = project(t.wx, t.wy, 0); if (c) shadow(c[0], c[1], Math.round((8 + i * 4) * c[2])); }; yield; }
    B.shake = 5; B.hitstop = 3; mark({ kind: 'path', pts: strokes[s].map(p => [p[0], p[1], 0]), w: 7, col: C(col), grow: 4, life: 140, jit: 1 }); burst(t.wx, t.wy, 4, C(col), 10, 2, 20, .12);
    if (s === 2) { B.slowmo = 14; damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name); goop(t, C(col), 90); mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * .8, col: ramp(C(col)).sh, grow: 10, life: 160, under: true }); }
    else { t.pose = 'hurt'; t.poseT = 8; }
    yield* wait(4); for (let i = 1; i <= 6; i++) { st.wz = lerp(4, 40, i / 6); anchor[0] = strokes[s][1][0]; anchor[1] = strokes[s][1][1]; yield; } st.wz = 110; if (s < 2) { anchor[0] = strokes[s + 1][0][0]; anchor[1] = strokes[s + 1][0][1]; }
  }
  pf.dur = 0; sh.dur = 0; yield* wait(24); yield* returnHome(u); yield* wait(8); camReset();
}
function* techTrazo(u, t, tech, col) { // Ámbar se convierte en una línea de lápiz que atraviesa al enemigo ida y vuelta dejando una X de grafito
  camFocus(t.wx, t.wy, { dist: 80, turn: -.15, h: 44 }); u.pose = 'charge'; const gh = ghostsOf(u); yield* anticipate(u, 16); u.pose = 'attack';
  const [lx, ly] = side(t, 26), [rx, ry] = side(t, -26), from1 = fwdOf({ wx: lx, wy: ly }, -22), to1 = fwdOf({ wx: rx, wy: ry }, 22), from2 = fwdOf({ wx: rx, wy: ry }, -22), to2 = fwdOf({ wx: lx, wy: ly }, 22);
  for (let pass = 0; pass < 2; pass++) {
    const A = pass ? from2 : from1, Z = pass ? to2 : to1; u.wx = A[0]; u.wy = A[1]; Audio.sfx('dash'); Audio.sfx('scratch_long', { when: .05 });
    mark({ kind: 'path', pts: [[A[0], A[1], t.def.h * .3], [Z[0], Z[1], t.def.h * .6]], w: 3, col: GRAPHITE, grow: 5, life: 80 }); mark({ kind: 'path', pts: [[A[0] + 1, A[1] + 1, t.def.h * .3], [Z[0] + 1, Z[1] + 1, t.def.h * .6]], w: 2, col: C(col), grow: 5, life: 70 });
    for (let i = 1; i <= 7; i++) { const k = i / 7; u.wx = lerp(A[0], Z[0], k); u.wy = lerp(A[1], Z[1], k); u.wz = t.def.h * .3; gh.add(); if (i === 4) { damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name); goop(t, C(col), 50); burst(t.wx, t.wy, t.def.h * .5, '#e8cf9a', 6, 1.2, 16, .1); } yield; }
    yield* wait(9);
  }
  gh.end(); u.wz = 0; yield* wait(22); yield* returnHome(u, 8); yield* wait(6); camReset();
}
function* techSalpicon(u, targets, tech, col) { // Añil salta, el pincel gira como aspa y llueven gotas azules en arco sobre todos, con sombras que anuncian dónde cae cada una
  const ec = enemyC(); camFocus(lerp(u.wx, ec[0], .5), lerp(u.wy, ec[1], .5), { dist: 120, turn: -.1, h: 70, pitch: .68 }); u.pose = 'charge';
  const img = propSprite('pincel', C(col)), P = PROP.pincel, st = { a: 0 }; Audio.sfx('whip');
  const pf = fx(999, () => { const c = PJ(above(u, 1.2)); drawProp(img, c[0], c[1], st.a, 1, 24, 8, 1.2 * c[2]); });
  yield* anticipate(u, 12); for (let i = 0; i < 24; i++) { u.wz = Math.sin(i / 24 * Math.PI) * 48; st.a += .8; if (i > 4 && i % 2 === 0) for (const tt of targets) B.particles.push({ wx: u.wx, wy: u.wy, wz: u.wz + u.def.h, tx: tt.wx + R(-14, 14), ty: tt.wy + R(-8, 8), tz: 0, col: C(col), t: 0, life: 14, dur: 14, arc: 30, stream: true }); yield; }
  pf.dur = 0; u.wz = 0; u.pose = 'attack';
  // gotas grandes con sombra que crece
  const drops = []; for (const tt of targets) for (let k = 0; k < 3; k++) drops.push({ t: tt, ox: R(-tt.def.w * .4, tt.def.w * .4), oy: R(-6, 6), delay: k * 7 + RI(0, 4), h: 100, hit: false });
  const def = { color: C(col), shape: 'tall', w: 8, h: 12 }, df = fx(999, () => { for (const d of drops) { if (d.k === undefined || d.k >= 1) continue; const c = project(d.t.wx + d.ox, d.t.wy + d.oy, 0); if (c) { g.globalAlpha = .35 * d.k; shadow(c[0], c[1], Math.round(10 * d.k * c[2])); g.globalAlpha = 1; } const p = project(d.t.wx + d.ox, d.t.wy + d.oy, lerp(d.h, 0, d.k * d.k)); if (p) drawSprite(dropSprite(def, 'hop', 0), p[0], p[1], p[2]); } });
  for (let i = 0; i < 44; i++) { for (const d of drops) { if (i < d.delay) continue; d.k = clamp((i - d.delay) / 16, 0, 1); if (d.k >= 1 && !d.hit) { d.hit = true; Audio.sfx('splash_clean', { pan: -.2 }); burst(d.t.wx + d.ox, d.t.wy + d.oy, 2, C(col), 8, 1.6, 20, .1); mark({ kind: 'pool', p: [d.t.wx + d.ox, d.t.wy + d.oy + 2, 0], w: 8, col: ramp(C(col)).sh, grow: 4, life: 90, under: true }); if (!d.t.__hit) { d.t.__hit = 1; damage(d.t, baseDmg(u.atk * statusMult(u, 'tiznado'), d.t.dfn, tech.power), col, u.name); goop(d.t, C(col), 80); } } } yield; }
  df.dur = 0; targets.forEach(tt => tt.__hit = 0); yield* wait(26); u.pose = 'idle'; yield* wait(6); camReset();
}
// =====================================================================
// Combos: carga y fusión común, liberación propia de cada mezcla
// =====================================================================
function* chargeAndFuse(users, wx, wy, wz, col, frames = 26) { // anillos bajo los usuarios, partículas que suben, chorros que convergen en un orbe que se funde en el color mezclado
  const cols = users.map(u => C(u.color)); users.forEach((u, k) => { u.pose = 'charge'; Audio.sfx('charge', { semi: SEMI[u.id] || 0, when: k * .05 }); });
  const rings = fx(999, () => { for (const u of users) { const [x, y, s] = PJ([u.wx, u.wy, 0]); g.strokeStyle = C(u.color); g.globalAlpha = .6; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, (10 + Math.sin(rings.t * .3) * 3) * s, 4 * s, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; } }, true);
  for (let i = 0; i < frames; i++) { users.forEach((u, k) => { u.wz = Math.abs(Math.sin((i + k * 4) * .35)) * 5; if (i % 3 === k % 3) B.particles.push({ wx: u.wx + R(-8, 8), wy: u.wy + R(-4, 4), wz: R(0, u.def.h), vx: 0, vy: 0, vz: R(.6, 1.4), g: -.02, col: cols[k], t: 0, life: 20 }); }); yield; }
  users.forEach(u => stream(u, { wx, wy, def: { h: wz * 2 } }, C(u.color), 12, 16));
  const orb = { wx, wy, wz, r: 4, t: 0 }, of = fx(999, () => { const [x, y, s] = PJ([orb.wx, orb.wy, orb.wz]); const c = orb.t < 12 ? cols[(orb.t >> 1) % cols.length] : col; g.fillStyle = ramp(c).base; g.beginPath(); g.arc(x, y, orb.r * s, 0, 6.29); g.fill(); g.fillStyle = ramp(c).hi; g.fillRect(x - 2, y - orb.r * s * .6, 2, 2); orb.t++; });
  for (let i = 0; i < 24; i++) { orb.r = 4 + i * .45; if (i > 16) orb.r += Math.sin(i * 2) * 1.5; yield; } Audio.sfx('mix'); B.flash = { col: col, a: .4 }; burst(wx, wy, wz, col, 18, 1.8, 24, 0); B.slowmo = 14; B.hitstop = 6; B.shake = 3;
  users.forEach(u => { u.wz = 0; }); rings.dur = 0;
  return { of, orb };
}
function* fuseAt(users, wx, wy, wz, col) { const r = yield* chargeAndFuse(users, wx, wy, wz, col, 34); return r; }
function* techLlamarada(users, targets, tech, col) { // lápiz y brocha se cruzan como una cerilla, el lápiz raspa, prende, y un fuego naranja de pintura recorre el suelo hasta los enemigos
  const mid = centroid(users), ec = enemyC(); camFocus(mid[0], mid[1], { dist: 96, turn: .25, h: 60 });
  const { of, orb } = yield* fuseAt(users, mid[0], mid[1], 46, C(col)); yield* wait(4);
  const bro = propSprite('brocha', C('rojo')), lap = propSprite('lapiz', C('amarillo')), st = { k: 0 };
  const pf = fx(999, () => { const c = PJ([mid[0], mid[1], 46]); drawProp(bro, c[0] + 18 * c[2], c[1] + 14 * c[2], -.9, -1, PROP.brocha.tip[0], PROP.brocha.tip[1], 1.2 * c[2]); drawProp(lap, c[0] - 14 * c[2] + st.k * 40 * c[2], c[1] - 12 * c[2] + st.k * 22 * c[2], .6, -1, PROP.lapiz.tip[0], PROP.lapiz.tip[1], 1.2 * c[2]); });
  Audio.sfx('scratch_long'); for (let i = 1; i <= 14; i++) { st.k = i / 14; B.particles.push({ wx: mid[0] + R(-3, 3), wy: mid[1], wz: 40 + R(0, 8), vx: R(-.5, .5), vy: 0, vz: R(.5, 1.5), g: .06, col: i & 1 ? C('amarillo') : C('naranja'), t: 0, life: 12 }); yield; }
  of.dur = 0; pf.dur = 0; Audio.sfx('fwoom'); Audio.sfx('crackle', { when: .1 }); B.flash = { col: C('naranja'), a: .35 }; flames(mid[0], mid[1], 12, 8);
  // el fuego corre por el suelo hacia los enemigos
  B.slowmo = 8; yield* wait(6); for (let i = 1; i <= 26; i++) { const k = i / 26, x = lerp(mid[0], ec[0], k), y = lerp(mid[1], ec[1], k); flames(x, y, 4, 10); if (i % 3 === 0) mark({ kind: 'pool', p: [x, y, 0], w: 9, col: '#5a3a2a', grow: 3, life: 120, under: true }); if (i === 8) camFocus(ec[0], ec[1], { dist: 104, turn: -.2, h: 62 }); yield; }
  B.shake = 4; for (let i = 0; i < 32; i++) { for (const t of targets) { flames(t.wx, t.wy, 3, t.def.w * .5); if (i === 8) { damage(t, baseDmg(users.reduce((s, u) => s + u.atk, 0) / users.length, t.dfn, tech.power), col, 'Llamarada'); goop(t, C(col), 80); } } yield; }
  yield* wait(26); users.forEach(u => u.pose = 'idle'); camReset();
}
function* techBrote(users, targets, tech, col) { // el pincel pinta un tallo desde el suelo que trepa por el enemigo y florece; el polen cura al grupo
  const mid = centroid(users), ec = enemyC(); camFocus(ec[0], ec[1], { dist: 100, turn: -.2, h: 58 });
  const { of, orb } = yield* fuseAt(users, ec[0], ec[1], 60, C(col)); Audio.sfx('drop_fall');
  for (let i = 1; i <= 10; i++) { orb.wz = lerp(60, 2, (i / 10) ** 2); orb.r = 12 - i * .6; yield; } of.dur = 0; B.shake = 3; yield* wait(4); Audio.sfx('grow'); Audio.sfx('leaves', { when: .3 });
  const wave = fx(22, () => { const k = wave.t / 22, c = PJ([ec[0], ec[1], 0]); g.strokeStyle = C(col); g.lineWidth = 2; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(c[0], c[1], (10 + k * 120) * c[2], (4 + k * 40) * c[2], 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; }, true);
  const img = propSprite('pincel', C(col)), P = PROP.pincel;
  for (const t of targets) { // tallo pintado con el pincel
    const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([t.wx - t.def.w * .35 + Math.sin(k * 6) * 5, t.wy + 4, k * (t.def.h + 10)]); }
    yield* toolStroke({ kind: 'pincel', color: C(col), pts, w: 3, col: '#2f9a48', frames: 14, fac: -1, life: 160, scale: 1, onTip: (k, p) => { if (Math.random() < .5) mark({ kind: 'blob', p: [p[0] + R(-3, 3), p[1], p[2]], w: 3, col: C(col), grow: 3, life: 120, seed: (k * 99) | 0 }); } });
    damage(t, baseDmg(users.reduce((s, u) => s + u.atk, 0) / users.length, t.dfn, tech.power), col, 'Brote'); goop(t, C(col), 90);
    // flor y polen
    const top = pts[pts.length - 1], fl = fx(130, () => { const c = PJ(top), s = Math.max(1, Math.round(c[2])); const petals = [[0, -2], [2, 0], [0, 2], [-2, 0]]; petals.forEach(([a, b], i) => { g.fillStyle = i % 2 ? C('amarillo') : C('azul'); g.fillRect(c[0] + a * s - s, c[1] + b * s - s, 2 * s, 2 * s); }); g.fillStyle = '#f4f0ea'; g.fillRect(c[0] - s + 1, c[1] - s + 1, s, s); });
    sparkle(top[0], top[1], top[2] + 4, C('amarillo')); yield* wait(6);
  }
  yield* wait(8);
  Audio.sfx('heal_bells'); for (const p of alive(B.party)) { for (const t of targets) B.particles.push({ wx: t.wx, wy: t.wy, wz: t.def.h + 10, tx: p.wx, ty: p.wy, tz: p.def.h * .6, col: i2(C('amarillo'), C('verde')), t: -RI(0, 8), life: 26, dur: 26, arc: 30, stream: true }); }
  yield* wait(30); for (const p of alive(B.party)) heal(p, Math.round(p.maxhp * tech.heal));
  yield* wait(24); users.forEach(u => u.pose = 'idle'); yield* wait(6); camReset();
}
const i2 = (a, b) => Math.random() < .5 ? a : b;
function* techEclipse(users, t, tech, col) { // la pantalla se oscurece, un disco rojo y otro azul se superponen, y el violeta cae como un tampón de tinta que deja la silueta del enemigo estampada
  camFocus(t.wx, t.wy, { dist: 90, turn: -.25, h: 50 }); const dark = overlay(80, '#0b0912', .65, 12, 14); Audio.sfx('hum_down');
  users.forEach(u => u.pose = 'charge'); const discs = users.map(u => ({ u, wx: u.wx, wy: u.wy, wz: u.def.h + 10, col: C(u.color), r: 6 }));
  const goal = above(t, 1, 0, 0); goal[2] += 40;
  const df = fx(999, () => { discs.forEach((d, i) => { const c = PJ([d.wx, d.wy, d.wz]); g.fillStyle = d.col; g.beginPath(); g.arc(c[0], c[1], d.r * c[2], 0, 6.29); g.fill(); }); if (discs.length === 2) { const a = PJ([discs[0].wx, discs[0].wy, discs[0].wz]), b = PJ([discs[1].wx, discs[1].wy, discs[1].wz]); const dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy), rr = discs[0].r * a[2]; if (dd < rr * 2) { g.fillStyle = C('violeta'); g.beginPath(); g.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(1, rr - dd / 2), 0, 6.29); g.fill(); } } });
  for (let i = 1; i <= 34; i++) { const k = i / 34; discs.forEach((d, j) => { d.wx = lerp(d.u.wx, goal[0] + (j ? 1 : -1) * 18 * (1 - k), k); d.wy = lerp(d.u.wy, goal[1], k); d.wz = lerp(d.u.def.h + 10, goal[2], k); d.r = 6 + k * 10; }); yield; }
  Audio.sfx('mix'); B.flash = { col: C('violeta'), a: .4 }; discs.length = 1; discs[0].col = C('violeta'); discs[0].r = 17; discs[0].wx = goal[0]; discs[0].wy = goal[1];
  const sh = shadowFx(t.wx, t.wy, 6, 999); yield* wait(10);
  for (let i = 1; i <= 10; i++) { const k = i / 10; discs[0].wz = lerp(goal[2], 2, k * k * k); sh.draw = () => { const c = project(t.wx, t.wy, 0); if (c) shadow(c[0], c[1], Math.round((6 + k * 22) * c[2])); }; yield; }
  df.dur = 0; sh.dur = 0; Audio.sfx('impact_sub'); Audio.sfx('glass', { when: .1 }); B.hitstop = 10; B.shake = 8; B.slowmo = 16;
  damage(t, baseDmg(users.reduce((s, u) => s + u.atk, 0) / users.length, t.dfn, tech.power), col, 'Eclipse'); if (tech.status) t.status[tech.status] = 3; goop(t, C(col), 100);
  mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * .9, col: ramp(C(col)).dk, grow: 3, life: 200, under: true }); mark({ kind: 'blob', p: [t.wx, t.wy, 0], w: t.def.w * .5, col: C(col), grow: 3, life: 200, seed: 3, under: true });
  burst(t.wx, t.wy, 6, C(col), 16, 2.2, 26, .1); yield* wait(36); users.forEach(u => u.pose = 'idle'); dark.dur = Math.min(dark.dur, dark.t + 14); camReset();
}
function* techArcoiris(users, targets, tech, col) { // los tres orbitan, la pantalla se vuelve papel blanco, un prisma dibuja una cinta de arcoíris que barre el campo y colorea a los enemigos hasta borrarlos
  const ec = enemyC(), pc = partyC(), mid = [(ec[0] + pc[0]) / 2, (ec[1] + pc[1]) / 2]; camFocus(mid[0], mid[1], { dist: 150, turn: 0, h: 96, pitch: .7, f: 170 });
  users.forEach(u => u.pose = 'charge'); Audio.sfx('charge', { semi: 0 }); Audio.sfx('charge', { semi: 4, when: .1 }); Audio.sfx('charge', { semi: 7, when: .2 });
  const home = users.map(u => [u.wx, u.wy]);
  for (let i = 0; i < 60; i++) { const k = i / 60; users.forEach((u, j) => { const a = k * k * 16 + j * 2.09, r = lerp(30, 12, k); u.wx = lerp(home[j][0], mid[0] + Math.cos(a) * r, Math.min(1, k * 3)); u.wy = lerp(home[j][1], mid[1] + Math.sin(a) * r * .6, Math.min(1, k * 3)); u.wz = 20 + Math.sin(a) * 6; if (i % 2 === 0) B.particles.push({ wx: u.wx, wy: u.wy, wz: u.wz + 8, vx: 0, vy: 0, vz: .6, g: -.01, col: C(u.color), t: 0, life: 14 }); }); yield; }
  const paper = overlay(90, '#f1e9d6', .85, 10, 16); Audio.sfx('rainbow'); B.rainbow = 40;
  const RB = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'].map(C), pr = { k: 0 };
  const prism = fx(999, () => { const c = PJ([mid[0], mid[1], 26]); g.fillStyle = '#f4f0ea'; g.beginPath(); g.moveTo(c[0], c[1] - 12); g.lineTo(c[0] + 11, c[1] + 8); g.lineTo(c[0] - 11, c[1] + 8); g.closePath(); g.fill(); g.strokeStyle = '#2a2438'; g.lineWidth = 1; g.stroke();
    for (const t of targets) { const e = PJ(above(t, .5)); const n = Math.round(60 * pr.k); for (let i = 0; i < n; i++) { const k = i / 60, x = lerp(c[0], e[0], k), y = lerp(c[1], e[1], k) - Math.sin(k * Math.PI) * 40; RB.forEach((cc, j) => { g.fillStyle = cc; g.fillRect(Math.round(x), Math.round(y) + j * 2 - 6, 2, 2); }); } } });
  yield* wait(8); for (let i = 1; i <= 34; i++) { pr.k = i / 34; yield; } yield* wait(6);
  B.flash = { col: '#ffffff', a: .8 }; B.shake = 4; Audio.sfx('mix'); B.slowmo = 12;
  for (let i = 0; i < 30; i++) { for (const t of targets) { t.goop = null; goop(t, RB[i % 6], 30); if (i === 10) { damage(t, baseDmg(users.reduce((s, u) => s + u.atk, 0) / users.length, t.dfn, tech.power), col, 'Arcoíris'); } if (i % 3 === 0) burst(t.wx, t.wy, t.def.h * .5, RB[i % 6], 6, 1.5, 20, .05); } yield; }
  prism.dur = 0; paper.dur = Math.min(paper.dur, paper.t + 16); yield* wait(24);
  users.forEach((u, j) => { u.wz = 0; u.pose = 'idle'; }); for (const u of users) yield* whop(u, u.hx, u.hy, 8, 6); camReset();
}
// =====================================================================
// Despacho de acciones
// =====================================================================
function* actAttack(u, target) {
  tickStatus(u); const t = target;
  if (u.kind === 'party') { say(u.name + ' ataca'); if (u.data.weapon === 'brocha') yield* atkBrocha(u, t); else if (u.data.weapon === 'lapiz') yield* atkLapiz(u, t); else yield* atkPincel(u, t); return; }
  yield* enemyAttack(u, t);
}
function* actTech(users, tech, targets, col) {
  users.forEach(tickStatus); const names = users.map(u => u.name).join('+'); say(names + ': ' + tech.name, C(col));
  const id = Object.keys(DATA.techs).find(k => DATA.techs[k] === tech);
  if (id === 'brochazo') yield* techBrochazo(users[0], targets[0], tech, col);
  else if (id === 'trazo') yield* techTrazo(users[0], targets[0], tech, col);
  else if (id === 'salpicon') yield* techSalpicon(users[0], targets, tech, col);
  else if (id === 'llamarada') yield* techLlamarada(users, targets, tech, col);
  else if (id === 'brote') yield* techBrote(users, targets, tech, col);
  else if (id === 'eclipse') yield* techEclipse(users, targets[0], tech, col);
  else if (id === 'arcoiris') yield* techArcoiris(users, targets, tech, col);
  users.forEach(u => { u.pose = 'idle'; u.wz = 0; });
}
// =====================================================================
// Objetos
// =====================================================================
function* actItem(u, itemId, target) {
  tickStatus(u); const it = DATA.items[itemId]; Game.inventory[itemId]--; say(u.name + ' usa ' + it.name);
  camFocus(target.wx, target.wy, { dist: 80, turn: target.kind === 'party' ? .4 : -.2, h: 46 }); yield* anticipate(u, 10); u.pose = 'attack'; yield* wait(6);
  if (it.kind === 'heal') { // una nube dibujada a lápiz llueve sobre el aliado
    const cl = fx(999, () => { const c = PJ(above(target, 1, 0, 0)); c[1] -= 34 * c[2]; const s = c[2]; g.strokeStyle = GRAPHITE; g.lineWidth = 1; g.beginPath(); [[-12, 4, 7], [-4, -2, 9], [6, 0, 8], [12, 6, 6]].forEach(([dx, dy, r]) => { g.moveTo(c[0] + (dx + r) * s, c[1] + dy * s); g.arc(c[0] + dx * s, c[1] + dy * s, r * s, 0, 6.29); }); g.stroke(); g.fillStyle = '#e9e1cc'; g.globalAlpha = .6; [[-12, 4, 6], [-4, -2, 8], [6, 0, 7], [12, 6, 5]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(c[0] + dx * s, c[1] + dy * s, r * s, 0, 6.29); g.fill(); }); g.globalAlpha = 1; });
    sparkle(target.wx, target.wy, target.def.h + 34); Audio.sfx('drop_fall');
    yield* wait(8); for (let i = 0; i < 34; i++) { if (i % 2 === 0) B.particles.push({ wx: target.wx + R(-12, 12), wy: target.wy + R(-4, 4), wz: target.def.h + 30, vx: 0, vy: 0, vz: -R(1, 2), g: .1, col: C('azul'), t: 0, life: 20, size: 2 }); if (i === 18) { Audio.sfx('splash_clean'); heal(target, it.amount); goop(target, C('azul'), 40); } yield; }
    cl.dur = 0;
  } else if (it.kind === 'mp') { // el tubo se coloca encima, apunta abajo y se exprime como un bote de salsa
    const img = propSprite('tubo', C(target.color)), P = PROP.tubo; sparkle(target.wx, target.wy, target.def.h + 30);
    const tb = fx(999, () => { const sq = tb.t > 8 ? Math.sin(tb.t * .8) * .12 : 0, c = PJ([target.wx, target.wy, target.def.h + 30 - Math.min(8, tb.t) * 2]); drawProp(img, c[0], c[1], P.a + sq, 1, P.tip[0], P.tip[1], 1.2 * c[2]); });
    Audio.sfx('squeeze'); yield* wait(8); Audio.sfx('plop', { when: .1 }); for (let i = 0; i < 16; i++) { B.particles.push({ wx: target.wx + R(-2, 2), wy: target.wy, wz: target.def.h + 12, vx: R(-.4, .4), vy: 0, vz: -R(.4, 1.4), g: .1, col: C(target.color), t: 0, life: 18, size: 3 }); yield; }
    tb.dur = 0; heal(target, it.amount, true); goop(target, C(target.color), 50);
  } else { // la goma: el enemigo se vuelve un dibujo a lápiz y se borra en virutas
    const img = propSprite('goma'), P = PROP.goma, rub = { x: 0 }, gm = fx(999, () => { const c = PJ([target.wx, target.wy, target.def.h * .55]); drawProp(img, c[0] + rub.x, c[1], 0.25, 1, P.tip[0], P.tip[1], 1.2 * c[2]); });
    sparkle(target.wx, target.wy, target.def.h + 6); target.goop = null; target.sketch = 1;
    for (let i = 0; i < 26; i++) { rub.x = Math.sin(i * .75) * 10; if (i > 8) target.erasing = true; if (i % 2 === 0) B.particles.push({ wx: target.wx + R(-6, 6), wy: target.wy, wz: target.def.h * .3, vx: R(-.6, .6), vy: 0, vz: R(0, 1.2), g: .12, col: i % 4 ? '#e86a8a' : '#f4f0ea', t: 0, life: 22 }); if (i % 6 === 0) Audio.sfx('rub'); if (i % 8 === 4) Audio.sfx('crumbs'); yield; }
    gm.dur = 0; target.erasing = false; target.sketch = 0;
    const d = target.color === 'negro' ? it.amount : Math.round(it.amount / 3); target.hp = Math.max(0, target.hp - d); target.pose = 'hurt'; target.poseT = 14; num(target, d, '#f4f0ea'); Audio.sfx('hit'); B.hitstop = 3; if (target.hp <= 0) kill(target);
  }
  yield* wait(12); u.pose = 'idle'; yield* wait(8); camReset();
}
// =====================================================================
// Enemigos: cada forma ataca como lo que es
// =====================================================================
function* enemyAttack(u, t) {
  const shape = u.data.shape; say(u.name + ' ataca');
  camFocus(lerp(u.wx, t.wx, .5), lerp(u.wy, t.wy, .5), { dist: 96, turn: .2, h: 52 });
  if (shape === 'round') { // salta alto y se estampa contra el objetivo (planchazo)
    yield* anticipate(u, 14); u.pose = 'attack'; const sh = shadowFx(t.wx, t.wy, 4, 999);
    for (let i = 1; i <= 20; i++) { const k = i / 20; u.wx = lerp(u.hx, t.wx, k); u.wy = lerp(u.hy, t.wy - 2, k); u.wz = Math.sin(k * Math.PI) * 60; sh.draw = () => { const c = project(t.wx, t.wy, 0); if (c) shadow(c[0], c[1], Math.round((4 + k * 16) * c[2])); }; yield; }
    sh.dur = 0; u.wz = 0; B.shake = 6; Audio.sfx('splash'); hitBasic(u, t); goop(t, C('negro'), 60); mark({ kind: 'blob', p: [t.wx, t.wy, 0], w: 12, col: C('negro'), seed: 7, life: 90, under: true });
    yield* wait(16); yield* whop(u, u.hx, u.hy, 12, 22);
  } else if (shape === 'splash') { // escupe tres pegotes en arco
    yield* anticipate(u, 10); u.pose = 'attack'; for (let k = 0; k < 3; k++) { Audio.sfx('ink_jet', { pan: -.3 }); const p = { wx: u.wx, wy: u.wy, wz: u.def.h * .5, tx: t.wx + R(-4, 4), ty: t.wy + R(-3, 3), tz: t.def.h * .5, col: C('negro'), t: 0, life: 12, dur: 12, arc: 26, stream: true, size: 3 }; B.particles.push(p); u.wz = 4; yield* wait(5); u.wz = 0; yield* wait(9); burst(t.wx, t.wy, t.def.h * .5, C('negro'), 5, 1.2, 14, .1); if (k === 2) { hitBasic(u, t); goop(t, C('negro'), 60); } else { t.pose = 'hurt'; t.poseT = 6; } }
    yield* wait(8);
  } else if (shape === 'tall') { // embiste atravesando al objetivo y deja un tachón en el suelo
    yield* anticipate(u, 12); u.pose = 'attack'; Audio.sfx('dash'); const gh = ghostsOf(u); const to = fwdOf(t, -22);
    mark({ kind: 'path', pts: [[u.wx, u.wy, 0], [t.wx - 6, t.wy + 4, 0], [t.wx + 6, t.wy - 4, 0], [to[0], to[1], 0]], w: 4, col: C('negro'), grow: 8, life: 100, jit: 2, under: true });
    for (let i = 1; i <= 11; i++) { const k = i / 11; u.wx = lerp(u.hx, to[0], k); u.wy = lerp(u.hy, to[1], k); gh.add(); if (i === 6) { hitBasic(u, t); goop(t, C('negro'), 60); } yield; }
    gh.end(); yield* wait(14); yield* whop(u, u.hx, u.hy, 12, 12);
  } else { // charco: se aplasta y manda una ola de tinta por el suelo
    yield* anticipate(u, 12); u.pose = 'hurt'; u.poseT = 24; Audio.sfx('ink_jet'); const wv = fx(999, () => { const k = clamp(wv.t / 22, 0, 1), c = PJ([lerp(u.wx, t.wx, k), lerp(u.wy, t.wy, k), 0]); g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(c[0], c[1], (14 + k * 8) * c[2], 6 * c[2], 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4460'; g.fillRect(Math.round(c[0] - 8 * c[2]), Math.round(c[1] - 8 * c[2]), Math.round(16 * c[2]), 2); }, true);
    for (let i = 0; i < 22; i++) { B.particles.push({ wx: lerp(u.wx, t.wx, i / 22), wy: lerp(u.wy, t.wy, i / 22), wz: 2, vx: 0, vy: 0, vz: R(.5, 1.5), g: .08, col: C('negro'), t: 0, life: 16 }); yield; }
    wv.dur = 0; hitBasic(u, t); goop(t, C('negro'), 70); mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: 14, col: '#1e1a2c', grow: 4, life: 100, under: true }); yield* wait(12);
  }
  u.pose = 'idle'; u.wz = 0; yield* wait(14); camReset();
}
function* actEnemy(u) {
  tickStatus(u); u.acts++;
  const targets = alive(B.party); if (!targets.length) return;
  let target = pick(targets);
  if (u.ai === 'hunter' || u.ai === 'boss') { const weak = targets.filter(t => colorMult(u.color, t.color) >= 2); if (weak.length && Math.random() < .7) target = pick(weak); }
  if (u.ai === 'tiznar' && Math.random() < .35) {
    say(u.name + ': Tiznar', C('violeta')); u.pose = 'attack'; Audio.sfx('ink_jet'); camFocus(target.wx, target.wy, { dist: 84, turn: .3, h: 46 }); stream(u, target, C('negro'), 14, 20); yield* wait(22);
    if (DATA.accessories[target.acc] && DATA.accessories[target.acc].immune === 'tiznado') { num(target, 'GOMA!', '#f4f0ea'); say(target.name + ' lo borra con la Goma', '#f4f0ea'); Audio.sfx('rub'); Audio.sfx('crumbs', { when: .2 }); const img = propSprite('goma'), gm = fx(14, () => { const c = PJ([target.wx, target.wy, target.def.h * .6]); drawProp(img, c[0] + Math.sin(gm.t) * 6, c[1], .25, 1, PROP.goma.tip[0], PROP.goma.tip[1], 1.1 * c[2]); }); burst(target.wx, target.wy, target.def.h * .5, '#e86a8a', 10, 1.2, 20, .1); yield* wait(14); }
    else { target.status.tiznado = 3; num(target, 'TIZNADO', C('violeta')); mark({ kind: 'blob', p: [target.wx, target.wy, target.def.h * .4], w: 10, col: C('negro'), seed: target.idx, life: 70 }); burst(target.wx, target.wy, target.def.h * .5, C('negro'), 12, 1.5); goop(target, C('negro'), 60); }
    u.pose = 'idle'; yield* wait(10); camReset(); return;
  }
  if (u.ai === 'boss' && u.acts % 3 === 0) { // marea negra: la página se inunda desde La Tinta hacia el grupo
    say('La Tinta: Marea negra', '#8c8ab0'); u.pose = 'hurt'; u.poseT = 30; Audio.sfx('ink_jet'); Audio.sfx('hum_down', { vol: .6 }); const pc = partyC(); camFocus(lerp(u.wx, pc[0], .4), lerp(u.wy, pc[1], .4), { dist: 120, turn: .1, h: 70, pitch: .7 }); yield* wait(8);
    const wv = fx(999, () => { const k = clamp(wv.t / 24, 0, 1), c = PJ([lerp(u.wx, pc[0], k), lerp(u.wy, pc[1], k), 0]); g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(c[0], c[1], (40 + k * 60) * c[2], (10 + k * 8) * c[2], 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4460'; g.beginPath(); g.ellipse(c[0], c[1] - 6 * c[2], (30 + k * 50) * c[2], 3 * c[2], 0, 0, 6.29); g.fill(); }, true);
    for (let i = 0; i < 24; i++) { for (let j = 0; j < 3; j++) B.particles.push({ wx: lerp(u.wx, pc[0], i / 24) + R(-30, 30), wy: lerp(u.wy, pc[1], i / 24) + R(-10, 10), wz: R(0, 10), vx: 0, vy: 0, vz: R(.8, 2), g: .08, col: C('negro'), t: 0, life: 24, size: 2 }); yield; }
    wv.dur = 0; B.flash = { col: '#0b0912', a: .6 }; B.shake = 6; Audio.sfx('splash');
    for (const t of alive(B.party)) { damage(t, baseDmg(u.atk, t.dfn, .8), 'negro'); mark({ kind: 'blob', p: [t.wx, t.wy, t.def.h * .4], w: 10, col: C('negro'), seed: t.idx }); goop(t, C('negro'), 70); }
    u.pose = 'idle'; yield* wait(24); camReset(); return;
  }
  yield* actAttack(u, target);
}
