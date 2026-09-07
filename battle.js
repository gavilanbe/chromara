// CHROMARA — battle.js: transición (siete fases), batalla estilo Golden Sun sobre el mapa (ATB Active, techs, IA, efectos en coordenadas de mundo).
'use strict';
// =====================================================================
// 1. Estado, unidades, reglas de color y daño
// =====================================================================
const B = {};
const SEMI = { carmin: 0, ambar: 4, anil: 7 }; // cada gota tiene su nota: acorde mayor Re-Fa#-La
const semiOf = u => ({ semi: SEMI[u.id] ?? -5 });
let ATB_ACTIVE = true; const ATB_RATE = .055; // Active: todos los menús. Wait: pausa sólo en técnicas, objetos y objetivos.
function colorMult(atkCol, defCol) {
  if (atkCol === 'blanco') return defCol === 'negro' ? 3 : 1.5;
  if (defCol === 'negro') return 1;
  if (DATA.complement[atkCol] === defCol) return 2;
  if (atkCol === defCol) return 0.5;
  return 1;
}
function unitFromParty(p, i) {
  const s = effStats(p);
  return { id: p.id, name: p.name, kind: 'party', data: p, color: p.color, def: { color: C(p.color), shape: p.shape, w: p.w, h: p.h, seed: 3 }, hp: p.cur.hp, maxhp: s.hp, mp: p.cur.mp, maxmp: s.mp, atk: s.atk, dfn: s.def, spd: s.spd, atb: R(10, 55), wx: 0, wy: 0, wz: 0, x: 0, y: 0, sc: 1, pose: 'idle', poseT: 0, status: {}, alive: p.cur.hp > 0, acc: p.acc, idx: i, shadowW: p.w * .7 };
}
function unitFromEnemy(id, i, n, group) {
  const dup = group.filter(x => x === id).length > 1, letter = 'ABC'[group.slice(0, i).filter(x => x === id).length];
  const e = DATA.enemies[id], core = e.color === 'negro' ? null : C(e.color);
  return { id, name: e.name + (dup ? ' ' + letter : ''), kind: 'enemy', data: e, color: e.color, def: { color: C('negro'), core, shape: e.shape, w: e.w, h: e.h, seed: 11 + i * 5 }, hp: e.hp, maxhp: e.hp, mp: 0, atk: e.atk, dfn: e.def, spd: e.spd, atb: R(0, 40), wx: 0, wy: 0, wz: 0, x: 0, y: 0, sc: 1, pose: 'idle', poseT: 0, status: {}, alive: true, ai: e.ai, boss: !!e.boss, acts: 0, idx: i, shadowW: e.w * .75 };
}
const alive = arr => arr.filter(u => u.alive);
const centroid = arr => { const P = arr.length ? arr : [{ wx: 0, wy: 0 }]; return [P.reduce((s, u) => s + u.wx, 0) / P.length, P.reduce((s, u) => s + u.wy, 0) / P.length]; };
const partyC = () => centroid(alive(B.party)), enemyC = () => centroid(alive(B.enemies));
const homeC = arr => [arr.reduce((s, u) => s + u.hx, 0) / arr.length, arr.reduce((s, u) => s + u.hy, 0) / arr.length];
function statusMult(u, k) { return u.status[k] ? (k === 'tiznado' ? .7 : .6) : 1; }
function drawContorno(u) { const c = project(u.wx, u.wy, 0); if (!c) return; const s = u.sc * B.unitScale, w = u.def.w * .55 * s, h = u.def.h * .6 * s; g.strokeStyle = '#4a4460'; g.lineWidth = 1; g.setLineDash([2, 2]); g.lineDashOffset = -(B.t >> 1); g.beginPath(); g.ellipse(u.x, u.y - h, w + 3, h + 3, 0, 0, 6.29); g.stroke(); g.setLineDash([]); }
function baseDmg(atk, def, power) { return Math.max(2, (atk * 2 - def * .7) * power); }
function applyStatus(u, key, turns) { u.status[key] = turns; (u.statusRevision ||= {})[key] = (u.statusRevision[key] || 0) + 1; }
function say(s, col = '#f4f0ea') { B.msg = { s, col }; B.msgT = 70; }
function num(u, v, col, big) { B.nums.push({ wx: u.wx, wy: u.wy, wz: u.def.h * .8, offset: -9, dx: R(-3, 3), v: String(v), col, t: 0, vy: -1.2, big }); }
function damage(target, raw, col, src, opt = {}) {
  if (!target || !target.alive) return 0;
  const action = B.currentAction;
  let cover = false;
  if (target.kind === 'party' && action?.users[0].kind === 'enemy') {
    const guardian = B.party.find(p => p.alive && p.guard?.charges && p.guard.target === target);
    if (guardian && !action.command?.all && !action.users[0].intent?.all) { guardian.guard.charges--; target = guardian; cover = true; num(target, 'PROTEGE', C('rojo')); Audio.sfx('rub'); }
  }
  cameraImpact(target);
  if (action) action.previousCoat = target.coat?.col;
  const reaction = opt.noPaint ? null : paintOnHit(target, col, action);
  const mult = attackMultiplier(target, col);
  const value = Math.max(1, Math.round(raw * damageFactor(target, col) * (reaction ? 1.25 : 1) * (cover ? .5 : 1) * R(.92, 1.08)));
  let next = Math.max(0, target.hp - value);
  if (target.boss && target.bossPhase < 3) next = Math.max(next, Math.ceil(target.maxhp * (target.bossPhase === 1 ? .67 : .34)));
  const dealt = target.hp - next; target.hp = next; target.pose = 'hurt'; target.poseT = 12; target.uiHit = 12;
  num(target, dealt, mult >= 2 ? '#f2c93a' : mult < 1 ? '#b4acc8' : '#f4f0ea', mult >= 2);
  const tier = action?.tier || 0, weight = tier >= 3 ? 1.6 : tier >= 1 ? 1.1 : .6;
  impactFx(target, C(col), weight * (mult >= 2 ? 1.25 : 1), opt);
  Audio.sfx(target.kind === 'party' || col === 'negro' ? 'ink_hit' : mult >= 2 ? 'hitweak' : mult < 1 ? 'resist' : 'hit', { pan: target.kind === 'enemy' ? -.4 : .4, vol: tier ? .85 : .6 });
  const stop = opt.accent === 'tap' ? 2 : opt.accent === 'finish' ? 8 : tier >= 3 ? 9 : tier ? 5 : 4;
  B.hitstop = Math.max(B.hitstop, stop); B.shake = Math.max(B.shake, opt.accent === 'tap' ? 1 : tier >= 3 ? 7 : tier ? 4 : 2);
  if (mult >= 2 && tier) B.slowmo = Math.max(B.slowmo, 5);
  if (target.kind === 'party') B.stats.damageTaken += dealt;
  if (target.hp <= 0) kill(target); else bossPhaseCheck(target);
  flushPaintEvents();
  return dealt;
}
// Contacto local al material de la herramienta; no tapa el campo con flashes.
function impactFx(t, col, k = 1, opt = {}) { return materialImpact(t, col, k, opt); }
function heal(target, amount, isMp) {
  if (!target.alive) return;
  cameraImpact(target);
  if (isMp) { const a = Math.min(amount, target.maxmp - target.mp); target.mp += a; num(target, '+' + a, '#3a6fe2'); }
  else { const a = Math.min(amount, target.maxhp - target.hp); target.hp += a; num(target, '+' + a, '#4fb84a'); target.uiHeal = 14; }
  burst(target.wx, target.wy, target.def.h * .4, isMp ? C('azul') : C('verde'), 10, 1, 28, -.03); Audio.sfx('heal');
}
function kill(u) {
  u.alive = false; u.pose = 'ko'; u.atb = 0; u.intent = null; u.coat = null; u.guard = null; Audio.sfx(u.kind === 'enemy' ? 'die' : 'ko');
  if (u.kind === 'enemy') { // outro: la gota negra se derrite en un charco de tinta, el color robado se eleva como un orbe y cae al suelo, devuelto al mundo
    burst(u.wx, u.wy, u.def.h * .4, C('negro'), 10, 1.4, 26, .12); u.dead = 1; u.deathT = 0; B.slowmo = Math.max(B.slowmo, 8);
  }
  B.queue = B.queue.filter(q => q !== u); if (B.menu && B.menu.unit === u) B.menu = null;
}

// =====================================================================
// 2. Formación en el mundo, escena y arranque (la batalla ocurre donde te pillan)
// =====================================================================
function initBattle(foe) {
  SCENE.shot=null;SCENE.orbit=SCENE.orbitGoal=null;
  const retry = { foe, inventory: { ...Game.inventory }, party: Party.map(p => ({ ...p.cur })) };
  Object.assign(B, { foe, retry, viewKey: null, party: [], enemies: [], queue: [], menu: null, actions: [], actQueue: [], busy: false, particles: [], nums: [], puddles: [], fx: [], marks: [], shake: 0, hitstop: 0, flash: null, phase: 'trans', t: 0, msg: null, msgT: 0, result: null, rainbow: 0, tr: { overworld: true }, gen: null, exiting: false, slowmo: 0, fightStart: 0, stepAcc: 0, reservation: null, currentAction: null, paintEvents: [], phaseNotice: null, stats: { actions: 0, mixes: 0, interrupts: 0, damageTaken: 0 } });
  B.party = Party.map(unitFromParty);
  const n = foe.enemies.length; B.enemies = foe.enemies.map((id, i) => unitFromEnemy(id, i, n, foe.enemies));
  B.units = [...B.enemies, ...B.party];
  // eje del combate: del grupo al enemigo
  const E = [foe.x, foe.y]; let dx = E[0] - OW.x, dy = E[1] - OW.y; const L = Math.hypot(dx, dy); if (L < 1) { dx = 1; dy = 0; } else { dx /= L; dy /= L; }
  const rx = -dy, ry = dx, at = (a, r) => [E[0] + dx * a + rx * r, E[1] + dy * a + ry * r];
  B.axis = { dx, dy, rx, ry, E };
  const offE = n === 1 ? [[6, 0]] : n === 2 ? [[4, -23], [10, 23]] : [[-4, 0], [18, -36], [18, 36]];
  B.enemies.forEach((u, i) => { const [x, y] = at(offE[i][0] + (u.boss ? 16 : 0), offE[i][1]); u.hx = x; u.hy = y; u.wx = x; u.wy = y; u.wz = -u.def.h - 4; u.bossPhase = 1; u.shellHits = []; u.coat = null; u.intent = null; });
  const offP = [[-64, 0], [-82, 26], [-86, -24]];
  B.party.forEach((u, i) => {
    const [x, y] = at(offP[i][0], offP[i][1]); u.hx = x; u.hy = y;
    const h = OW.hist[Math.min(OW.hist.length - 1, i * 12)]; u.wx = i === 0 ? OW.x : (h ? h[0] : OW.x - i * 12); u.wy = i === 0 ? OW.y : (h ? h[1] : OW.y);
    if (!u.alive) u.pose = 'ko';
  });
  SCENE.rest = camRest(homeC(B.party), homeC(B.enemies));
  // árboles y rocas del mapa como siluetas de la escena (los que no pisa nadie)
  B.props = []; const homes = B.units.map(u => [u.hx, u.hy]);
  const tx0 = (E[0] / TILE | 0) - 14, ty0 = (E[1] / TILE | 0) - 14;
  for (let ty = ty0; ty < ty0 + 28; ty++) for (let tx = tx0; tx < tx0 + 28; tx++) {
    const ch = tileAt(tx, ty); if (ch !== 'T' && ch !== 'r') continue; const wx = tx * TILE + 8, wy = ty * TILE + 14;
    if (homes.some(([hx, hy]) => Math.hypot(hx - wx, hy - wy) < (ch === 'T' ? 30 : 22))) continue;
    B.props.push({ kind: ch, wx, wy, vr: hash2(tx, ty) & 7 });
  }
  for (const object of worldObjects()) {
    if (object.kind === 'flower' || object.kind === 'boat' || Math.hypot(object.wx - E[0], object.wy - E[1]) > 210) continue;
    if (homes.some(([hx, hy]) => Math.hypot(hx - object.wx, hy - object.wy) < object.size[0] * .7 + 18)) continue;
    B.props.push({ kind: 'art', wx: object.wx, wy: object.wy, object });
  }
  // árboles que taparían a alguien desde la cámara de reposo: fuera
  const U = B.units.map(u => project(u.hx, u.hy, 0, SCENE.rest)).filter(Boolean);
  B.props = B.props.filter(o => { if (o.kind !== 'T') return true; const p = project(o.wx, o.wy, 0, SCENE.rest); if (!p) return true; return !U.some(q => p[3] < q[3] && Math.abs(p[0] - q[0]) < 34 && p[1] > q[1] - 12 && p[1] < q[1] + 70); });
  const ec = homeC(B.enemies); B.puddle = { wx: ec[0], wy: ec[1], rx: n === 1 ? 26 : 46, ry: n === 1 ? 12 : 20, k: 0 };
  B.gen = foe.boss ? bossTransitionGen(foe) : transitionGen(foe);
  B.unitScale = .5; B.propScale = .5;
}
function startTransition(foe) { initBattle(foe); setState('transition'); }

// =====================================================================
// 3. Transición: detección, caída, salpicón, mancha que se traga el mapa (y lo inclina), drenaje al charco, entrada
// =====================================================================
// Mantén OK pulsado para verla al doble de velocidad; con enemigos ya conocidos (Game.met) la anticipación y el salto van más cortos.
function* transitionGen(foe) {
  const T = B.tr, sig = foe.enemies.join(','), short = Game.met.has(sig); Game.met.add(sig);
  T.foe = foe; OW.hideFoe = foe; // el mapa deja de dibujarlo: lo dibuja la transición (se agazapa y salta)
  // la música del mapa se hunde de tono en vez de cortarse; si el enemigo ya te vio en el mapa (¡) no se repite el aviso: gruñe y embiste
  Audio.bend(.5, short ? .4 : .7); Audio.sfx('hum_down', { vol: .5 }); Audio.sfx(foe.seen ? 'lunge' : 'detect');
  // 1) anticipación: el mapa se congela, el enemigo se agazapa y tiembla, el grupo se sobresalta, la sombra crece sobre ellos
  T.stage = 'detect'; OW.scare = { stage: 'detect', k: 0 }; const nd = short ? 8 : 18;
  for (let i = 0; i < nd; i++) { T.k = i / nd; OW.scare.k = T.k; yield; }
  // 2) el propio enemigo salta en arco hacia el grupo y se hincha al acercarse a la cámara; el grupo se encoge
  T.stage = 'fall'; OW.scare = { stage: 'fall', k: 0 }; Audio.sfx('fall'); const nf = short ? 16 : 22;
  for (let i = 0; i < nf; i++) { T.k = i / nf; OW.scare.k = T.k; yield; }
  // 3) salpicón: hit-stop, flash de tinta, sacudida vertical y golpe de zoom, gotas hacia la cámara, ondas
  T.stage = 'splash'; T.k = 0; T.punch = 1; OW.scare = { stage: 'splash', k: 0 }; OW.flash = { col: '#0b0912', a: .5 };
  Audio.stop(.05); Audio.sfx('splash'); Audio.sfx('encounter'); B.shake = 7; Audio.play(foe.boss ? 'boss' : 'battle');
  T.drops = []; for (let i = 0; i < 14; i++) T.drops.push({ a: R(0, 6.28), s: R(1.2, 3.2), r: R(3, 9), rot: R(-.05, .05) });
  for (let i = 0; i < 5; i++) yield; // hit-stop
  for (let i = 0; i < 16; i++) { T.k = i / 16; T.punch = 1 - T.k; yield; }
  T.punch = 0;
  // 4) la tinta abre una ventana en el mapa congelado: fuera sigue el mapa (desaturado por la onda); dentro, la escena inclinándose a la vista de batalla
  T.stage = 'blot'; T.overworld = false; T.k = 0;
  T.balls = []; for (let i = 0; i < 9; i++) T.balls.push({ a: i / 9 * 6.28 + R(-.3, .3), d: R(.3, 1), r: R(.5, 1), ph: R(0, 6.28) });
  T.tendrils = []; for (let i = 0; i < 7; i++) T.tendrils.push({ a: R(0, 6.28), len: R(1.2, 2.2), w: R(.12, .3), sp: R(.6, 1.4) });
  const top = { x: Math.round(OW.cam.x) + W / 2, y: Math.round(OW.cam.y) + H / 2, yaw: -Math.PI / 2, pitch: 1.5, h: 110, f: 110, hy: 90 };
  camSet(top);
  for (let i = 0; i < 40; i++) { T.k = i / 40; const k = clamp((i - 8) / 30, 0, 1), e = k * k * (3 - 2 * k); B.propScale = lerp(.5, 1, e); B.unitScale = lerp(.5, 1, e);
    const c = SCENE.cam, r = SCENE.rest; for (const key of ['x', 'y', 'pitch', 'h', 'f', 'hy']) c[key] = lerp(top[key], r[key], e); c.yaw = lerp(top.yaw, r.yaw, e); yield; }
  camSet(SCENE.rest); B.propScale = 1; B.unitScale = 1; OW.scare = null;
  // 5) la tinta se escurre hacia los enemigos y se vuelve su charco; los enemigos emergen, el grupo rebota a su formación
  T.stage = 'drain'; T.k = 0; Audio.sfx('slow_drip'); Audio.sfx('ink_jet', { when: .2 });
  const from = B.party.map(u => [u.wx, u.wy]);
  for (let i = 0; i < 34; i++) {
    const k = i / 34; T.k = k; B.puddle.k = clamp((i - 6) / 16, 0, 1);
    B.enemies.forEach((u, j) => { const kk = clamp((i - 8 - j * 4) / 18, 0, 1); u.wz = lerp(-u.def.h - 4, 0, kk * kk); if (kk > 0 && kk < 1 && i % 2 === 0) B.particles.push({ wx: u.wx + R(-u.def.w * .4, u.def.w * .4), wy: u.wy + R(-4, 4), wz: u.wz + u.def.h * R(.3, .9), vx: 0, vy: 0, vz: -R(.2, .6), g: -.08, col: C('negro'), t: 0, life: 18, size: 2 }); });
    B.party.forEach((u, j) => { if (!u.alive) { u.wx = u.hx; u.wy = u.hy; return; } const kk = clamp((i - 4 - j * 3) / 20, 0, 1); u.wx = lerp(from[j][0], u.hx, kk); u.wy = lerp(from[j][1], u.hy, kk); u.wz = Math.abs(Math.sin(kk * Math.PI * 2)) * (kk < .5 ? 28 : 8) * (kk < 1 ? 1 : 0); u.pose = kk < 1 ? 'hop' : 'idle'; if (kk === 1 && !u.landed) { u.landed = true; burst(u.wx, u.wy, 0, C(u.color), 6, 1.2, 14, .1); Audio.sfx('plop', { pan: .3 }); } });
    yield;
  }
  B.party.forEach(u => { u.wx = u.hx; u.wy = u.hy; u.wz = 0; }); B.enemies.forEach(u => { u.wz = 0; });
  B.tr = null; OW.hideFoe = null; OW.scare = null; B.phase = 'fight'; B.fightStart = B.t; say('¡Gotas Negras!', '#8c8ab0'); Audio.sfx('banner'); setState('battle');
}
// Copia del mapa congelado para la fase 'blot': se muestra fuera de la ventana de tinta, con el borde blando y desaturado
let MAPC = null, MAPG = null; // se crea al primer uso (W y H viven en game.js, que carga después)
function mapSnap() { if (!MAPC) { MAPC = document.createElement('canvas'); MAPC.width = W; MAPC.height = H; MAPG = MAPC.getContext('2d'); } return MAPG; }
function drawFastHint() { if (keys.ok && B.tr && !B.tr.boss) txt('»»', W - 22, H - 13, '#8c8ab0'); }
// Mancha de tinta: cuerpo irregular (radio por ángulo con armónicos), dedos que se alargan con temblor, brillo húmedo en el borde,
// salpicaduras satélite y goterones que cuelgan por abajo. k = crecimiento 0..1, t = tiempo para el temblor.
function inkSplat(x, y, R, k, t, seed = 1, drips = true) {
  const rnd = seeded(seed), H = []; for (let i = 0; i < 4; i++) H.push({ n: 2 + i * 2 + (rnd() * 2 | 0), a: (.35 - i * .07) * (.5 + rnd() * .5), ph: rnd() * 6.28 });
  const F = []; for (let i = 0; i < 8; i++) F.push({ a: rnd() * 6.28, len: 1.4 + rnd() * 1.4, w: .1 + rnd() * .16, sp: .6 + rnd() * .9, wob: rnd() * 6.28 });
  const S = []; for (let i = 0; i < 10; i++) S.push({ a: rnd() * 6.28, d: 1.3 + rnd() * .9, r: .05 + rnd() * .09, at: .3 + rnd() * .6 });
  const r = a => R * (1 + H.reduce((s, h) => s + h.a * Math.sin(h.n * a + h.ph + t * .01), 0));
  g.fillStyle = '#0b0912'; g.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.28, rr = r(a); if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); } g.closePath(); g.fill();
  for (const f of F) { const L = R * f.len * clamp(k * f.sp, 0, 1) * (1 + .06 * Math.sin(t * .2 + f.wob)), w = R * f.w; g.save(); g.translate(x, y); g.rotate(f.a); g.scale(1, .8); g.beginPath(); g.moveTo(0, -w * 2); g.quadraticCurveTo(L * .6, -w * .6, L, 0); g.quadraticCurveTo(L * .6, w * .6, 0, w * 2); g.closePath(); g.fill(); g.beginPath(); g.arc(L, 0, w * 1.3, 0, 6.29); g.fill(); g.restore(); }
  for (const sp of S) { if (k < sp.at) continue; const q = clamp((k - sp.at) / .2, 0, 1), d = R * sp.d * (0.6 + q * .4); g.beginPath(); g.ellipse(x + Math.cos(sp.a) * d, y + Math.sin(sp.a) * d * .8, R * sp.r * q, R * sp.r * q * .8, sp.a, 0, 6.29); g.fill(); }
  if (drips) { g.fillStyle = '#0b0912'; for (let i = 0; i < 4; i++) { const a = 1.2 + i * .45, rr = r(a), dx = x + Math.cos(a) * rr, dy = y + Math.sin(a) * rr * .8, L = clamp((k - .4) * 40, 0, 12 + i * 4) * (1 + .05 * Math.sin(t * .3 + i)); g.fillRect(dx - 1, dy - 2, 3, L + 2); g.beginPath(); g.arc(dx + .5, dy + L, 2, 0, 6.29); g.fill(); } }
  // brillo húmedo: un arco claro dentro del borde superior izquierdo y un reflejo
  g.strokeStyle = '#3a3652'; g.lineWidth = 2; g.globalAlpha = .9; g.beginPath(); for (let i = 22; i <= 40; i++) { const a = i / 64 * 6.28 + 3.14, rr = r(a) - 3; if (i === 22) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); } g.stroke(); g.globalAlpha = 1;
  g.fillStyle = '#4a4664'; g.fillRect(Math.round(x - R * .35), Math.round(y - R * .45), Math.max(2, R * .18 | 0), 2);
}
// Transición de la jefa: el Tiznal retumba, La Tinta emerge, diálogo, la tinta inunda desde los bordes y se retira como una marea
function* bossTransitionGen(foe) {
  const T = B.tr; T.boss = true; T.foe = foe; OW.hideFoe = foe; Audio.prepare('prelude'); Audio.prepare('boss'); Audio.stop(); Audio.sfx('hum_down', { vol: .7 });
  // retumba: la jefa pequeña del mapa se hunde en su charco (que crece) para emerger después a tamaño real, sin verse dos veces
  T.stage = 'rumble'; for (let i = 0; i < 50; i++) { T.k = i / 50; if (i % 10 === 0) { B.shake = 3; Audio.sfx('impact_sub', { vol: .35 }); } if (i === 30) Audio.sfx('slow_drip', { vol: .6 }); yield; }
  Audio.sfx('ink_jet'); Audio.sfx('splash', { when: .2 });
  T.stage = 'rise'; for (let i = 0; i < 40; i++) { T.k = i / 40; if (i === 30) B.shake = 5; yield; }
  // diálogo
  Audio.play('prelude', { fade: .8 });
  T.stage = 'dialogue'; T.dlg = { i: 0, ch: 0, t: 0 };
  const D = DATA.bossDialogue;
  while (T.dlg.i < D.length) { const line = D[T.dlg.i]; T.dlg.t++;
    // The pen writes at its own pace and breathes at punctuation; every third letter makes a scratch in the speaker's key.
    if (T.dlg.ch < line.text.length) { const wrote = T.dlg.wrote || 0; writerAdvance(T.dlg, line.text); if (Math.floor((T.dlg.wrote || 0) / 3) !== Math.floor(wrote / 3)) Audio.sfx('text', { vol: .65, semi: SEMI[line.who] ?? -12 }); }
    if (hit('ok')) { if (T.dlg.ch < line.text.length) T.dlg.ch = line.text.length; else { T.dlg.i++; T.dlg.ch = 0; T.dlg.t = 0; T.dlg.hold = 0; T.dlg.wrote = 0; Audio.sfx('page', { vol: .5 }); } }
    yield; }
  // inundación: la tinta sube por los bordes hasta cubrirlo todo
  T.stage = 'flood'; Audio.sfx('ink_jet'); Audio.sfx('hum_down', { vol: .6 }); Audio.play('boss');
  for (let i = 0; i < 46; i++) { T.k = i / 46; if (i === 40) B.shake = 6; yield; }
  T.overworld = false; T.stage = 'tide'; camSet(SCENE.rest); B.unitScale = 1; B.propScale = 1; B.puddle.k = 1;
  B.enemies.forEach(u => { u.wz = 0; }); B.party.forEach(u => { u.wx = u.hx; u.wy = u.hy; u.wz = 0; u.pose = 'idle'; });
  Audio.sfx('splash', { vol: .6 }); for (let i = 0; i < 50; i++) { T.k = i / 50; if (i === 10) Audio.sfx('slow_drip'); yield; }
  B.tr = null; OW.hideFoe = null; B.phase = 'fight'; B.fightStart = B.t; say(DATA.enemies[foe.enemies[0]].name.toUpperCase(), '#8c8ab0'); Audio.sfx('banner'); setState('battle');
}
// Dibujo de la transición sobre el mapa cenital (fases 1-3) y de la mancha/gotas sobre la escena (4-5)
function drawTransitionFx() {
  const T = B.tr; if (!T || !T.stage) return;
  const lead = B.party[0];
  if (T.boss) { // jefa
    const foe = T.foe, fx0 = foe.x - Math.round(OW.cam.x), fy0 = foe.y - Math.round(OW.cam.y);
    if (T.stage === 'rumble') { const k = T.k; g.fillStyle = 'rgba(11,9,18,' + (k * .45).toFixed(2) + ')'; g.fillRect(0, 0, W, H); for (let r = 0; r < 3; r++) { const q = ((k * 3 + r * .33) % 1); g.strokeStyle = 'rgba(74,70,100,' + (.6 * (1 - q)).toFixed(2) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(fx0, fy0, 6 + q * 90, 3 + q * 40, 0, 0, 6.29); g.stroke(); }
      // el charco crece y la jefa pequeña se hunde en él (recortada por la línea del suelo), temblando cada vez más
      g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(fx0, fy0 + 5, 14 + k * 16, 4 + k * 4, 0, 0, 6.29); g.fill();
      const e0 = DATA.enemies[foe.enemies[0]], spr = buildSprite(foe.enemies[0] + '_mini', C('negro'), e0.color === 'negro' ? null : C(e0.color), { eyes: k > .55 ? 'blink' : 'normal' }), sink = k * k * (spr.height + 10), tr = k > .4 ? (((Game.t >> 1) & 1) ? 1 : -1) : 0;
      g.save(); g.beginPath(); g.rect(0, 0, W, fy0 + 6); g.clip(); drawSprite(spr, fx0 + tr, fy0 + 2 + sink, 1 + k * .25, false, 1); g.restore(); }
    else if (T.stage === 'rise') { g.fillStyle = 'rgba(11,9,18,.45)'; g.fillRect(0, 0, W, H); const k = T.k, spr = buildSprite(foe.enemies[0], C('negro'), null, { eyes: k > .6 ? 'normal' : 'blink' }); g.save(); g.beginPath(); g.rect(0, 0, W, fy0 + 6); g.clip(); drawSprite(spr, fx0, fy0 + 6 + (1 - k) * 44, 1, false, 1 + (1 - k) * .3); g.restore(); g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(fx0, fy0 + 5, 30 + k * 10, 8 + k * 3, 0, 0, 6.29); g.fill(); if (k > .3) for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 2, d = 20 + Math.sin(k * 9 + i) * 6; g.fillRect(fx0 + Math.cos(a) * d - 1, fy0 + 4 + Math.sin(a) * d * .35 - (k * 10 * ((i * 7) % 3 + 1)) % 14, 2, 3); } }
    else if (T.stage === 'dialogue') { g.fillStyle = 'rgba(11,9,18,.45)'; g.fillRect(0, 0, W, H); const spr = buildSprite(foe.enemies[0], C('negro'), null, { eyes: 'normal' }); drawSprite(spr, fx0, fy0 + 6 + Math.sin(B.t * .06) * 1.5, 1, false, 1 + Math.sin(B.t * .06) * .02); g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(fx0, fy0 + 5, 40, 11, 0, 0, 6.29); g.fill(); drawDialogue(T.dlg); }
    else if (T.stage === 'flood') { const k = T.k, e = k * k; g.fillStyle = '#0b0912'; for (let x = 0; x <= W; x += 4) { const hb = e * (H * .62) + Math.sin(x * .05 + B.t * .15) * 6 + Math.sin(x * .13) * 3; g.fillRect(x, H - hb, 4, hb + 2); const ht = e * (H * .5) + Math.sin(x * .07 + B.t * .12) * 5; g.fillRect(x, 0, 4, ht); } for (let y = 0; y <= H; y += 4) { const wl = e * (W * .55) + Math.sin(y * .06 + B.t * .13) * 6; g.fillRect(0, y, wl, 4); g.fillRect(W - wl, y, wl, 4); } if (k > .5) { g.fillStyle = '#2a2438'; for (let i = 0; i < 12; i++) { const rnd = seeded(i * 9); g.fillRect(rnd() * W | 0, (H * .4 + rnd() * 20 - e * 40) | 0, 3, 1); } } }
    else if (T.stage === 'tide') { const k = T.k, e = 1 - Math.pow(1 - k, 2); g.fillStyle = '#0b0912'; for (let x = 0; x <= W; x += 4) { const top = e * (H + 30) + Math.sin(x * .05 + B.t * .2) * 8 + Math.sin(x * .17) * 4; g.fillRect(x, top - 4, 4, H); g.fillStyle = '#3a3652'; g.fillRect(x, top - 5, 4, 2); g.fillStyle = '#0b0912'; } }
    return;
  }
  if (T.overworld) {
    const sx = lead.wx - OW.cam.x, sy = lead.wy - OW.cam.y, foe = T.foe, fx0 = foe.x - OW.cam.x, fy0 = foe.y - OW.cam.y;
    const e0 = DATA.enemies[foe.enemies[0]], fspr = buildSprite(foe.enemies[0] + '_mini', C('negro'), e0.color === 'negro' ? null : C(e0.color), { eyes: 'happy' });
    if (T.stage === 'detect') { // el enemigo del mapa se agazapa (anticipación del salto) y tiembla; la sombra crece bajo el grupo
      const k = T.k, sq = 1 + k * .45, tr = k > .5 ? (((Game.t >> 1) & 1) ? 1 : -1) : 0;
      shadow(fx0, fy0, foe.boss ? 18 : 10); drawSprite(fspr, fx0 + tr, fy0, sq, foe.dirLeft, 1 / sq);
      g.fillStyle = 'rgba(11,9,18,' + (.15 + k * .35) + ')'; g.beginPath(); g.ellipse(sx, sy, 4 + k * 10, 2 + k * 4, 0, 0, 6.29); g.fill();
    } else if (T.stage === 'fall') { // el mismo enemigo salta en arco: se estira al despegar, se hincha hacia la cámara en el ápice y cae aplastándose sobre el grupo
      const k = T.k, arc = Math.sin(k * Math.PI), x = lerp(fx0, sx, k), yb = lerp(fy0, sy, k), sc = 1 + arc * 1.9, st = k < .3 ? [.8, 1.35] : k > .82 ? [1.3, .75] : [1, 1];
      g.fillStyle = 'rgba(11,9,18,' + (.5 + k * .3) + ')'; g.beginPath(); g.ellipse(sx, sy, 14 - k * 6, 6 - k * 3, 0, 0, 6.29); g.fill();
      drawSprite(fspr, x, yb - 2 - arc * 38, sc * st[0], foe.dirLeft, st[1]); // arco bajo: la altura la vende la escala (viene hacia la cámara), no que se salga por arriba
    } else if (T.stage === 'splash') { // impacto: mancha en el suelo, ondas, gotas grandes hacia la cámara
      const k = T.k; g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(sx, sy, 10 + k * 26, 5 + k * 12, 0, 0, 6.29); g.fill();
      for (let r = 0; r < 3; r++) { const kk = clamp(k * 1.4 - r * .25, 0, 1); if (kk <= 0) continue; g.strokeStyle = 'rgba(244,240,234,' + (.7 * (1 - kk)) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(sx, sy, 8 + kk * 60, 4 + kk * 26, 0, 0, 6.29); g.stroke(); }
      g.fillStyle = '#0b0912'; for (const d of T.drops) { const dist = k * k * 260 * d.s * .5 + k * 20, x = sx + Math.cos(d.a) * dist, y = sy + Math.sin(d.a) * dist * .8 - k * 10, r = d.r * (1 + k * d.s * 1.6); g.beginPath(); g.ellipse(x, y, r, r * .8, d.a, 0, 6.29); g.fill(); g.fillRect(x - r * .3 | 0, y - r * .5 | 0, 2, 1); }
    }
    return;
  }
  const p = project(lead.hx, lead.hy, 0) || [W / 2, H / 2, 1], q = project(B.puddle.wx, B.puddle.wy, 0) || [W / 2, H / 2, 1];
  if (T.stage === 'blot') { // ventana de tinta: fuera queda el mapa congelado (desaturado por la onda), dentro la escena inclinándose; en medio la mancha orgánica
    const k = T.k, grow = Math.sin(Math.min(1, k * 1.15) * Math.PI / 2), R0 = 22 + grow * 96;
    const [sx, sy] = [lerp(lead.wx - OW.cam.x, p[0], clamp((k - .2) / .75, 0, 1)), lerp(lead.wy - OW.cam.y, p[1], clamp((k - .2) / .75, 0, 1))];
    const rw = R0 * 2.1 + clamp((k - .65) / .35, 0, 1) * 110, inner = Math.max(0, rw - 28); // al final la ventana desborda la pantalla: no hay corte con el drenaje
    MAPG.save(); MAPG.translate(sx, sy); MAPG.scale(1, .72);
    MAPG.globalCompositeOperation = 'saturation'; MAPG.fillStyle = '#7a7a7a'; MAPG.beginPath(); MAPG.arc(0, 0, rw * 1.35, 0, 6.29); MAPG.fill();
    const gr = MAPG.createRadialGradient(0, 0, inner, 0, 0, rw); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    MAPG.globalCompositeOperation = 'destination-out'; MAPG.fillStyle = gr; MAPG.fillRect(-W * 3, -H * 4, W * 6, H * 8); MAPG.restore();
    g.drawImage(MAPC, 0, 0);
    inkSplat(sx, sy, R0 * .75, k, B.t, 7, true);
  } else if (T.stage === 'drain') { // la mancha se escurre hacia el charco de los enemigos y encoge
    const k = T.k, e = k * k, cx = lerp(p[0], q[0], e), cy = lerp(p[1], q[1], e), R0 = lerp(118, B.puddle.rx, e);
    g.save(); g.translate(cx, cy); g.scale(1, .75); inkSplat(0, 0, R0 * .75, 1 - e * .8, B.t, 7, false); g.restore();
  }
}

// =====================================================================
// 4. Efectos en coordenadas de mundo: partículas, marcas de pintura, fx, props
// =====================================================================
function burst(wx, wy, wz, col, n, spd = 1.6, life = 24, grav = .06) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), s = R(.3, 1) * spd; B.particles.push({ wx, wy, wz, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6, vz: R(.4, 1.6) * spd * .6, g: grav, col, t: 0, life: life + RI(-6, 6) }); } }
function stream(u, t, col, n, dur) { for (let i = 0; i < n; i++) B.particles.push({ wx: u.wx, wy: u.wy, wz: u.def.h * .5, tx: t.wx + R(-6, 6), ty: t.wy + R(-4, 4), tz: t.def.h * R(.3, .7), col, t: -RI(0, dur * .5), life: dur, dur, arc: R(14, 30), stream: true }); }
function flames(wx, wy, n, spread = 12) { for (let i = 0; i < n; i++) B.particles.push({ wx: wx + R(-spread, spread), wy: wy + R(-spread * .5, spread * .5), wz: R(0, 4), vx: R(-.3, .3), vy: 0, vz: R(1, 2.4), g: -.02, t: -RI(0, 16), life: RI(12, 24), pal: ['#fbe28a', C('amarillo'), C('naranja'), C('rojo'), '#5a2a2a'], size: 3 }); }
function fx(dur, draw, under = false) { const f = { t: 0, dur, draw, under }; B.fx.push(f); return f; }
function afterFx(frames, event) { const f = fx(frames, () => {}); f.tick = () => { if (f.t === frames) event(); }; return f; }
function mark(m) { B.marks.push(Object.assign({ t: 0, life: 48, grow: 5 }, m)); return B.marks[B.marks.length - 1]; }
function pstroke(x0, y0, x1, y1, w, col, prog = 1, jit = 0, taper = true) {
  const n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) | 0); g.fillStyle = col;
  for (let i = 0; i <= n * prog; i++) { const t = i / n, ww = Math.max(1, Math.round(taper ? w * (0.55 + 0.45 * Math.sin(Math.PI * t)) : w)); const j = jit ? Math.round(Math.sin(i * 12.9898) * jit) : 0; g.fillRect(Math.round(x0 + (x1 - x0) * t - ww / 2) + j, Math.round(y0 + (y1 - y0) * t - ww / 2), ww, ww); }
}
function pointAt(pts, k) { const tot = pts.length - 1, f = clamp(k * tot, 0, tot - 1e-6), i = Math.floor(f), t = f - i; return [lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t), lerp(pts[i][2] || 0, pts[i + 1][2] || 0, t)]; }
const PJ = (p) => { const r = project(p[0], p[1], p[2] || 0); return r || [-999, -999, 1]; }; // proyecta un punto de mundo [wx, wy, wz]
function drawWPath(P, w, col, k, jit = 0) { const S = P.map(PJ), tot = S.length - 1, n = Math.floor(tot * k); for (let i = 0; i < n; i++) pstroke(S[i][0], S[i][1], S[i + 1][0], S[i + 1][1], w * S[i][2], col, 1, jit, false); if (n < tot) { const f = tot * k - n; pstroke(S[n][0], S[n][1], lerp(S[n][0], S[n + 1][0], f), lerp(S[n][1], S[n + 1][1], f), w * S[n][2], col, 1, jit, false); } }
function drawMarks(under) {
  for (const m of B.marks) {
    if (!!m.under !== !!under) continue;
    const k = clamp(m.progress ?? m.t / m.grow, 0, 1); g.globalAlpha = m.t > m.life - 14 ? (m.life - m.t) / 14 : 1;
    if (m.kind === 'stroke') { const a = PJ(m.p0), b = PJ(m.p1); pstroke(a[0], a[1], b[0], b[1], m.w * a[2], m.col, k, m.jit || 0); }
    else if (m.kind === 'path') { if (m.material) drawToolMark(m, k); else drawWPath(m.pts, m.w || 1, m.col, k, m.jit || 0); }
    else if (m.kind === 'blob') { const c = PJ(m.p), rnd = seeded(m.seed || 5); g.fillStyle = m.col; const n = Math.round(8 * k); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * m.w * c[2], r = Math.max(1, Math.round(1 + rnd() * m.w * .4 * c[2])); g.fillRect(Math.round(c[0] + Math.cos(a) * d - r), Math.round(c[1] + Math.sin(a) * d * .6 - r), r * 2, r * 2); } }
    else if (m.kind === 'pool') { const c = PJ(m.p); g.fillStyle = m.col; g.beginPath(); g.ellipse(c[0], c[1], m.w * c[2] * k, m.w * c[2] * k * .42, 0, 0, 6.29); g.fill(); }
    g.globalAlpha = 1;
  }
}
function sparkle(wx, wy, wz, col = '#f4f0ea') { const s = fx(10, () => { const [x, y] = PJ([wx, wy, wz]), r = s.t < 5 ? s.t : 10 - s.t; g.fillStyle = col; g.fillRect(x - r, y, r * 2 + 1, 1); g.fillRect(x, y - r, 1, r * 2 + 1); if (r > 2) g.fillRect(x - 1, y - 1, 3, 3); }); }
function tintSprite(s, col, a) { const q = Math.round(a * 10) / 10; return cached(`${s.__key}|tint|${col}|${q}`, () => { const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d'); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = q; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; }); }
function goop(t, col, life = 84) { if (!t || !t.alive) return; t.goop = { col, t: 0, life, drips: [0, 1, 2, 3].map(() => ({ dx: R(-t.def.w * .36, t.def.w * .36), y0: R(.12, .45), len: 0, speed: R(.12, .3), max: R(8, t.def.h * .8) })) }; }
function drawGoop(u) {
  const G = u.goop, a = G.t > G.life - 20 ? (G.life - G.t) / 20 : 1, rp = ramp(G.col), s = u.sc * B.unitScale, top = u.y - u.def.h * s; g.globalAlpha = a;
  g.fillStyle = rp.base; g.beginPath(); g.ellipse(u.x, top + 3 * s, u.def.w * .42 * s, 3 * s, 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(Math.round(u.x - u.def.w * .3 * s), top + 1, 3, 1);
  for (const d of G.drips) { const x = Math.round(u.x + d.dx * s), y = Math.round(top + u.def.h * s * d.y0), L = Math.round(d.len * s); g.fillStyle = rp.base; g.fillRect(x, y, 2, L); g.fillStyle = rp.hi; g.fillRect(x, y, 1, Math.max(1, L - 3)); g.fillStyle = rp.sh; g.fillRect(x - 1, y + L - 1, 4, 3); g.fillStyle = rp.base; g.fillRect(x, y + L, 2, 1); }
  g.globalAlpha = 1;
}
// --- Corrutinas de movimiento en el mundo. yield = un frame.
function* wait(n) { for (let i = 0; i < n; i++) yield; }
function* wtween(u, x1, y1, n) { const x0 = u.wx, y0 = u.wy; for (let i = 1; i <= n; i++) { const t = i / n, e = t * (2 - t); u.wx = lerp(x0, x1, e); u.wy = lerp(y0, y1, e); yield; } }
function* whop(u, x1, y1, n, height) { const x0 = u.wx, y0 = u.wy; for (let i = 1; i <= n; i++) { const k = i / n; u.wx = lerp(x0, x1, k); u.wy = lerp(y0, y1, k); u.wz = Math.sin(Math.PI * k) * height; yield; } u.wz = 0; }
// punto a distancia d del objetivo t en la dirección de u (para plantarse delante)
function infront(u, t, d) { let dx = u.wx - t.wx, dy = u.wy - t.wy; const L = Math.hypot(dx, dy) || 1; return [t.wx + dx / L * d, t.wy + dy / L * d]; }
function hitBasic(u, t, opt = {}) {
  const dealt = damage(t, basicRaw(u, t), u.color, u.name, opt);
  if (u.kind === 'party' && u.data.weapon === 'brocha') {
    const other = nearestEnemy(t);
    if (other) { damage(other, basicRaw(u, other) * .3, u.color, u.name, {accent:'tap'}); mark({ kind: 'path', pts: [[t.wx, t.wy, 5], [other.wx, other.wy, 5]], col: C(u.color), w: 3, life: 26 }); }
  }
  return dealt;
}
// ---- Utilería: herramientas de dibujo como assets pixel art (horizontales, punta/trabajo a la derecha)
function propSprite(kind, color) {
  return cached(`prop|${kind}|${color || ''}`, () => {
    const c = document.createElement('canvas'); c.width = kind === 'brocha' ? 60 : 48; c.height = kind === 'brocha' ? 22 : 16; const x = c.getContext('2d');
    const rp = color ? ramp(color) : null, F = (col, a, b, cw = 1, ch = 1) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
    const O = '#2a1a10', WOOD = ['#d9a06a', '#b07a48', '#8a5a34', '#5c3a20'], MET = ['#f0eef6', '#c9c4d4', '#8c8ab0', '#4a4460'];
    switch (kind) {
      case 'brocha': { // brocha plana de pintor: mango de madera clara en forma de pala con agujero, virola ancha con remaches, cerdas largas con la punta cargada
        const PW = ['#f6ead0', '#e8d4a8', '#c9b080', '#9a8258'], OL = '#5a4630';
        // mango: estrecho al final, se ensancha hacia la virola (perfil de pala)
        for (let i = 0; i < 26; i++) { const hh = i < 8 ? 6 : Math.min(16, 6 + (i - 8) * 0.8 | 0); const y0 = 11 - (hh >> 1); x.fillStyle = OL; x.fillRect(i, y0 - 1, 1, hh + 2); x.fillStyle = PW[1]; x.fillRect(i, y0, 1, hh); x.fillStyle = PW[0]; x.fillRect(i, y0, 1, 1 + (hh > 8 ? 1 : 0)); x.fillStyle = PW[2]; x.fillRect(i, y0 + hh - 2, 1, 2); x.fillStyle = PW[3]; x.fillRect(i, y0 + hh - 1, 1, 1); }
        F(OL, 0, 8, 1, 6); F(PW[2], 6, 10, 10, 1); F(PW[2], 12, 8, 8, 1); F(OL, 3, 9, 3, 3); F(PW[3], 3, 9, 1, 1); F(PW[0], 5, 11, 1, 1);
        // virola ancha
        F(OL, 26, 1, 12, 20); F(MET[1], 27, 2, 10, 18); F(MET[0], 27, 2, 10, 1); F(MET[0], 27, 3, 2, 16); F(MET[2], 27, 18, 10, 2); F(MET[3], 36, 3, 1, 16); F(MET[3], 30, 2, 1, 18); F(MET[3], 34, 2, 1, 18); F(MET[0], 31, 2, 1, 18);
        F(MET[3], 32, 5, 1, 1); F(MET[3], 32, 10, 1, 1); F(MET[3], 32, 15, 1, 1); F(MET[0], 32, 4, 1, 1); F(MET[0], 32, 9, 1, 1); F(MET[0], 32, 14, 1, 1);
        // cerdas naturales (vetas horizontales) con la punta cargada de pintura
        F(OL, 38, 1, 22, 20); for (let r = 0; r < 18; r++) { x.fillStyle = r % 3 === 0 ? '#d8cbaa' : r % 3 === 1 ? '#b8a888' : '#8a7c60'; x.fillRect(39, 2 + r, 14, 1); }
        for (let r = 0; r < 18; r++) { const rag = (r * 7) % 3; x.fillStyle = r % 4 === 0 ? rp.hi : r % 4 === 2 ? rp.sh : rp.base; x.fillRect(53, 2 + r, 6 - rag, 1); x.fillStyle = rp.dk; x.fillRect(59 - rag, 2 + r, 1, 1); if (rag) { x.fillStyle = OL; x.fillRect(59 - rag + 1, 2 + r, rag, 1); } }
        F(rp.sh, 52, 2, 1, 18); F(rp.base, 55, 20, 2, 1); F(rp.sh, 55, 21, 2, 1); F(rp.out, 54, 20, 1, 1); F(rp.out, 57, 20, 1, 1);
        break; }
      case 'lapiz': { // goma rosa, virola, cuerpo hexagonal facetado, cono de madera, mina
        F(O, 0, 3, 7, 8); F('#e89aa8', 1, 4, 5, 6); F('#f4c0c8', 1, 4, 5, 1); F('#b86a7c', 1, 8, 5, 2); F(O, 6, 3, 5, 8); F(MET[1], 7, 4, 3, 6); F(MET[0], 7, 4, 3, 1); F(MET[2], 7, 8, 3, 2); F(MET[3], 8, 4, 1, 6);
        F(O, 10, 3, 30, 8); F('#f2c93a', 11, 4, 28, 6); F('#fbe28a', 11, 4, 28, 1); F('#fff3c0', 11, 5, 28, 1); F('#c9a02a', 11, 7, 28, 2); F('#8a6a12', 11, 9, 28, 1);
        F('#5c4a0a', 15, 6, 1, 1); F('#5c4a0a', 17, 6, 3, 1); F('#5c4a0a', 21, 6, 1, 1); F('#5c4a0a', 23, 6, 2, 1); F('#5c4a0a', 26, 6, 3, 1);
        F(O, 39, 4, 6, 6); F('#e8cf9a', 40, 5, 4, 4); F('#f6e6c0', 40, 5, 4, 1); F('#c9a878', 40, 8, 4, 1); F(O, 44, 5, 3, 4); F('#e8cf9a', 44, 6, 2, 2); F(O, 46, 6, 1, 2); F('#2a2438', 45, 6, 2, 2); F('#4a4460', 45, 6, 1, 1);
        break; }
      case 'pincel': { // mango lacado con reflejo y anilla de color, virola con dos pliegues, mechón afilado
        F(O, 0, 5, 30, 6); F('#1e1a2c', 1, 6, 28, 4); F('#4a4460', 2, 6, 27, 1); F('#6a6480', 3, 7, 10, 1); F('#0b0912', 1, 9, 28, 1); F(rp.base, 22, 6, 3, 4); F(rp.hi, 22, 6, 3, 1); F(rp.dk, 22, 9, 3, 1);
        F(O, 29, 4, 10, 8); F(MET[1], 30, 5, 8, 6); F(MET[0], 30, 5, 8, 1); F(MET[2], 30, 10, 8, 1); F(MET[3], 32, 5, 1, 6); F(MET[3], 35, 5, 1, 6); F(MET[0], 33, 6, 1, 1); F(MET[0], 36, 6, 1, 1);
        F(rp.out, 38, 5, 9, 6); F(rp.base, 39, 6, 6, 4); F(rp.hi, 39, 6, 5, 1); F(rp.sh, 39, 9, 6, 1); F(rp.out, 45, 6, 3, 4); F(rp.base, 45, 7, 2, 2); F(rp.dk, 47, 7, 1, 2); F(rp.sh, 44, 11, 2, 1); F(rp.base, 44, 12, 1, 1);
        break; }
      case 'goma': { // goma bicolor con funda de papel
        F('#2a2438', 1, 2, 30, 12); F('#f4f0ea', 2, 3, 16, 10); F('#ffffff', 2, 3, 16, 1); F('#c9c4d4', 2, 11, 16, 2); F('#e86a8a', 18, 3, 12, 10); F('#f4a0b8', 18, 3, 12, 1); F('#b84a6a', 18, 11, 12, 2);
        F('#3a6fe2', 12, 2, 7, 12); F('#8fb4f2', 13, 3, 5, 1); F('#f4f0ea', 13, 6, 5, 2); F('#1f3f8a', 13, 12, 5, 1); F('#0b0912', 1, 2, 1, 1); F('#0b0912', 30, 2, 1, 1); F('#0b0912', 1, 13, 1, 1); F('#0b0912', 30, 13, 1, 1);
        break; }
      case 'pluma': { // estilográfica: capuchón negro con clip dorado, cuerpo lacado, plumín dorado con la ranura y la punta cargada del color
        F(O, 0, 4, 22, 8); F('#1e1a2c', 1, 5, 20, 6); F('#4a4460', 2, 5, 18, 1); F('#0b0912', 1, 9, 20, 2); F('#f2c93a', 4, 3, 12, 2); F('#c9a02a', 4, 5, 12, 1); F('#fbe28a', 5, 3, 3, 1);
        F(O, 22, 4, 12, 8); F('#2a2438', 23, 5, 10, 6); F('#5a5670', 23, 5, 10, 1); F('#0b0912', 23, 9, 10, 2); F('#f2c93a', 32, 5, 2, 6);
        F(O, 34, 5, 12, 6); F('#f2c93a', 35, 6, 10, 4); F('#fbe28a', 35, 6, 10, 1); F('#c9a02a', 35, 9, 10, 1); F('#8a6a12', 39, 6, 1, 4); F(O, 44, 7, 3, 2); F(rp.base, 45, 7, 2, 2); F(rp.hi, 45, 7, 1, 1);
        break; }
      case 'tubo': { // tubo de pintura metálico: pliegue, etiqueta con muestra de color, tapón
        F(MET[3], 0, 3, 4, 10); F(MET[2], 1, 4, 2, 8); F(MET[0], 1, 5, 1, 1); F(MET[3], 3, 2, 26, 12); F(MET[1], 4, 3, 24, 10); F(MET[0], 4, 3, 24, 2); F(MET[0], 4, 5, 2, 6); F(MET[2], 4, 11, 24, 2);
        F('#f4f0ea', 11, 3, 10, 10); F(rp.base, 13, 5, 4, 5); F(rp.hi, 13, 5, 4, 1); F(rp.dk, 16, 5, 1, 5); F('#2a2438', 18, 5, 2, 1); F('#2a2438', 18, 7, 2, 1); F('#2a2438', 18, 9, 1, 1);
        F(MET[3], 29, 5, 4, 6); F(MET[2], 29, 6, 3, 4); F(rp.out, 33, 3, 9, 10); F(rp.base, 34, 4, 7, 8); F(rp.hi, 34, 4, 7, 1); F(rp.sh, 34, 10, 7, 2); F(rp.dk, 40, 5, 1, 7); F(rp.sh, 36, 6, 1, 4); F(rp.sh, 38, 6, 1, 4);
        break; }
    }
    return c;
  });
}
const PROP = { brocha: { tip: [58, 20], a: 1.05 }, lapiz: { tip: [47, 7], a: 0.95 }, pincel: { tip: [47, 12], a: 1.0 }, pluma: { tip: [46, 8], a: 0.9 }, goma: { tip: [16, 8], a: 0 }, tubo: { tip: [41, 8], a: Math.PI / 2 } };
const facing = u => u.kind === 'party' ? -1 : 1; // hacia dónde ataca (en pantalla: el grupo mira a la izquierda)
function drawProp(img, x, y, a, fac, px = 1, py = 5, scale = 1, alpha = 1) { g.save(); g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); g.scale(fac, 1); g.rotate(a); g.imageSmoothingEnabled = false; g.drawImage(img, -px * scale, -py * scale, img.width * scale, img.height * scale); g.restore(); }
// La herramienta protagonista: aparece con destello, recorre un camino de mundo con la punta dejando su trazo y se retira.
function* toolStroke(o) {
  const img = propSprite(o.kind, o.color), P = PROP[o.kind], sc = o.scale || 1, p0 = o.pts[0], fac = o.fac || 1;
  const st = {k:0,lift:0,lead:o.from ? 0 : 1};
  const f = fx(999, () => {
    let wp = pointAt(o.pts, st.k);
    if (st.lead < 1) wp = [lerp(o.from[0], p0[0], st.lead),lerp(o.from[1], p0[1], st.lead),lerp(o.from[2] || 0, p0[2] || 0, st.lead) + Math.sin(st.lead * Math.PI) * 12];
    const [x,y,s] = PJ(wp), next = PJ(pointAt(o.pts, Math.min(1, st.k + .04))), prev = PJ(pointAt(o.pts, Math.max(0, st.k - .04)));
    const tilt = Math.atan2(next[1] - prev[1], Math.abs(next[0] - prev[0]) + 1) * .22;
    const l = st.lift, pressure = Math.sin(st.k * Math.PI) * (o.kind === 'brocha' ? .12 : .045);
    drawProp(img, x - fac * l * 1.5, y - l * 2.5, P.a + (o.a || 0) + tilt - l * .05, fac, P.tip[0], P.tip[1], sc * s * (1 + pressure), l ? Math.max(0, 1 - l / 10) : o.from ? Math.min(1, st.lead * 3) : 1);
  });
  f.tool = o.kind; f.stroke = st;
  if (o.from) for (let i = 1; i <= 10; i++) { const k = i / 10; st.lead = k * k * (3 - 2 * k); yield; }
  const marks = [];
  if (o.under) marks.push(mark({kind:'path',pts:o.pts.map(p => [p[0] + 1,p[1] + 1,p[2] || 0]),w:o.w,col:o.under,life:o.life || 50,jit:o.jit,progress:0}));
  marks.push(mark({kind:'path',pts:o.pts,w:o.w,col:o.col,life:o.life || 50,jit:o.jit,material:o.kind,progress:0}));
  sparkle(p0[0], p0[1], (p0[2] || 0) + 4, ramp(o.col).hi);
  let touched = false;
  for (let i = 1; i <= o.frames; i++) {
    const k = i / o.frames; st.k = k * k * (3 - 2 * k); marks.forEach(m => m.progress = st.k);
    const wp = pointAt(o.pts, st.k); if (o.onTip) o.onTip(st.k, wp);
    if (!touched && o.contact && st.k >= (o.hitAt ?? .5)) { touched = true; o.contact(wp); }
    yield;
  }
  for (let i = 1; i <= (o.liftFrames ?? 8); i++) { st.lift = i * 8 / (o.liftFrames ?? 8); yield; }
  f.dur = 0;
}

// (Las acciones viven en attacks.js)

// =====================================================================
// 6. Menú de batalla, ATB, bucle de actualización, fin
// =====================================================================
function updateBattle() {
  B.t++;
  if (B.msgT > 0 && --B.msgT === 0) B.msg = null;
  if (B.flash) { B.flash.a -= .04; if (B.flash.a <= 0) B.flash = null; }
  camTick(); projectUnits();
  if (B.rainbow > 0) B.rainbow--;
  if (B.shake > 0 && B.t % 2 === 0) B.shake--;
  // partículas y números siguen incluso en hitstop (menos el mundo)
  for (const p of B.particles) {
    if (p.stream) { if (++p.t < 0) continue; const k = clamp(p.t / p.dur, 0, 1); p.wx = lerp(p.x0 ?? (p.x0 = p.wx), p.tx, k); p.wy = lerp(p.y0 ?? (p.y0 = p.wy), p.ty, k); p.wz = lerp(p.z0 ?? (p.z0 = p.wz), p.tz, k) + Math.sin(k * 3.14) * p.arc; if (p.t >= p.dur) p.dead = true; }
    else { if (p.t < 0) { p.t++; continue; } p.wx += p.vx; p.wy += p.vy; p.wz += p.vz; p.vz -= p.g; if (p.wz < 0) { p.wz = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } if (++p.t > p.life) p.dead = true; }
  }
  B.particles = B.particles.filter(p => !p.dead);
  for (const n of B.nums) { n.t++; if (n.t > 6) { n.offset += n.vy; n.vy += .1; if (n.vy > 0 && n.t < 24) n.vy = -0.3; } } B.nums = B.nums.filter(n => n.t < 56);
  for (const u of B.units) { if (B.hitstop <= 0 && u.poseT > 0 && --u.poseT === 0 && u.alive) u.pose = 'idle';
    if (u.dead) { const was = u.dead; u.dead += u.boss ? .02 : .03; const q = u.dead - 1;
      if (q < .5 && B.t % 2 === 0) B.particles.push({ wx: u.wx + R(-u.def.w * .4, u.def.w * .4), wy: u.wy + R(-4, 4), wz: R(2, u.def.h * (1 - q * 1.6)), vx: 0, vy: 0, vz: -R(.2, .8), g: .05, col: C('negro'), t: 0, life: 18, size: 2 }); // chorrea
      if (q > .2 && q < 1.2 && B.t % 3 === 0) B.particles.push({ wx: u.wx + R(-u.def.w * .5, u.def.w * .5), wy: u.wy + R(-6, 6), wz: R(0, 6), vx: R(-.2, .2), vy: 0, vz: R(.4, 1), g: -.02, col: '#4a4660', t: 0, life: 26, size: 2 }); // vahos
      if (u.def.core && was - 1 < 1.4 && q >= 1.4) { B.puddles.push({ wx: u.wx, wy: u.wy, col: u.def.core, w: u.data.w }); burst(u.wx, u.wy, 2, u.def.core, 14, 1.8, 30, .06); Audio.sfx('splash_clean', { vol: .6 }); Audio.sfx('pigment_return', { when: .08, vol: .8 }); }
      if (u.def.core && was - 1 < .5 && q >= .5) Audio.sfx('grow', { vol: .5, semi: 7 }); } if (u.goop) { const G = u.goop; G.t++; for (const d of G.drips) d.len = Math.min(d.max, d.len + d.speed); if (G.t > G.life || !u.alive) u.goop = null; } }
  if (B.hitstop > 0) { B.hitstop--; return; }
  if (B.slowmo > 0) { B.slowmo--; if (B.t & 1) return; } // cámara lenta: el mundo avanza a la mitad
  for (const u of B.units) { if (u.recoil && ++u.recoil.t > u.recoil.dur) u.recoil = null; }
  for (const f of B.fx) { f.t++; if (f.t <= f.dur && f.tick) f.tick(); } B.fx = B.fx.filter(f => f.t <= f.dur);
  for (const m of B.marks) m.t++; B.marks = B.marks.filter(m => m.t <= m.life);
  if (B.phase === 'trans') { // con OK pulsado la transición (no la de la jefa) corre al doble
    for (let n = (B.tr && !B.tr.boss && keys.ok) ? 2 : 1; n > 0 && B.gen && B.phase === 'trans'; n--) if (B.gen.next().done) B.gen = null;
    return; }
  if (B.phase === 'victory' || B.phase === 'defeat') { updateEnd(); return; }
  // una acción cada vez: la siguiente de la cola arranca cuando termina la anterior; el ATB espera
  if (!B.actions.length && B.actQueue.length) B.actions.push(B.actQueue.shift());
  if (B.actions.length) { B.actions = B.actions.filter(a => !a.next().done); B.busy = B.actions.length > 0 || B.actQueue.length > 0; }
  if (!alive(B.enemies).length || !alive(B.party).length) { if (!B.actions.length) { B.actQueue = []; checkEnd(); } return; }
  updateBattleClock();
  updateMenuCamera();
}
function projectUnits() { for (const u of B.units) { const p = project(u.wx, u.wy, u.wz); if (p) { u.x = p[0]; u.y = p[1]; u.sc = p[2]; u.z = p[3]; } else u.z = 0; } }
const updateTransition = () => updateBattle(), drawTransition = () => drawBattle();
function checkEnd() {
  B.menu = null; B.queue = []; B.reservation = null;
  if (!alive(B.enemies).length) { B.phase = 'victory'; B.t = 0; Audio.prepare('victory'); if (B.foe.boss) Audio.prepare('restored'); Audio.stop(.35); B.gen = victoryGen(); }
  else if (!alive(B.party).length) { B.phase = 'defeat'; B.t = 0; Audio.stop(); if (typeof MUSIC !== 'undefined' && MUSIC.gameover) Audio.play('gameover'); }
}
function updateEnd() {
  if (B.phase === 'victory') { if (B.gen && B.gen.next().done) B.gen = null; }
  else if (B.t > 80 && hit('ok')) { retryBattle(); }
}
// Victoria: celebración por turnos (cada gota salta con su nota), conteo del pigmento, y salida: el grupo reparte su color
// por el suelo mientras la cámara vuelve a cenital y ellos regresan a su sitio del mapa. Sin corte: el mapa ya está debajo.
function* victoryGen() {
  while (B.enemies.some(u => u.dead && u.dead < 2.4)) yield; // que el último enemigo termine de disolverse
  Audio.play('victory', { fade: .025 });
  const pc = partyC(); camFocus(pc[0], pc[1], { dist: 66, turn: .4, h: 36, pitch: .5, ease: .08 }); B.showResult = false;
  for (let i = 0; i < 64; i++) {
    B.party.forEach((u, j) => { if (!u.alive) return; const k = (i - j * 8) / 26; if (k >= 0 && k < 1) { u.pose = 'happy'; u.wz = Math.abs(Math.sin(k * Math.PI * 2)) * (k < .5 ? 18 : 9); if (i - j * 8 === 0) { Audio.sfx('tinkle', semiOf(u)); sparkle(u.wx, u.wy, u.def.h + 8, C(u.color)); burst(u.wx, u.wy, u.def.h * .5, C(u.color), 8, 1.2, 22, .02); } } else if (k >= 1) u.wz = 0; });
    if (i > 8) B.puddle.k = Math.max(0, B.puddle.k - .02); // el charco de tinta se seca
    yield;
  }
  const exp = B.enemies.reduce((s, u) => s + u.data.exp, 0); B.result = 0; B.showResult = true; Audio.sfx('tinkle');
  for (let i = 1; i <= 30; i++) { B.result = Math.round(exp * i / 30); if (i % 6 === 0) Audio.sfx('cursor', { semi: i }); yield; }
  Game.pigmento += exp; B.result = exp;
  while (!hit('ok')) yield;
  Audio.sfx('page'); B.showResult = false; B.exiting = true;
  // --- salida
  B.party.forEach(u => { if (!u.alive) { u.alive = true; u.hp = 1; } u.data.cur.hp = u.hp; u.data.cur.mp = u.mp; }); Game.defeated.add(B.foe.key);
  for (const e of B.enemies) if (e.def.core) OW.puddles.push({ x: e.hx, y: e.hy, col: e.def.core, w: e.data.w * .5 }); // el color robado se queda en el mapa
  const camX = clamp(Math.round(OW.x - W / 2), 0, MAP.w * TILE - W), camY = clamp(Math.round(OW.y - H / 2), 0, MAP.h * TILE - H);
  const top = { x: camX + W / 2, y: camY + H / 2, yaw: -Math.PI / 2, pitch: 1.5, h: 110, f: 110, hy: 90 }, from = Object.assign({}, SCENE.cam), start = B.party.map(u => [u.wx, u.wy]);
  const dest = B.party.map((u, i) => { const h = OW.hist[Math.min(OW.hist.length - 1, i * 12)]; return i === 0 ? [OW.x, OW.y] : (h ? [h[0], h[1]] : [OW.x - i * 12, OW.y]); });
  Audio.sfx('saturate', { vol: .5 });
  const rings = B.party.filter(u => u.alive).map((u, j) => ({ u, t: -j * 6 }));
  const rf = fx(999, () => { for (const r of rings) { if (r.t < 0) continue; const k = clamp(r.t / 44, 0, 1), c = project(r.u.wx, r.u.wy, 0); if (!c) continue; g.strokeStyle = C(r.u.color); g.lineWidth = 2; g.globalAlpha = (1 - k) * .9; g.beginPath(); g.ellipse(c[0], c[1], (4 + k * 90) * c[2], (2 + k * 40) * c[2], 0, 0, 6.29); g.stroke(); g.globalAlpha = (1 - k) * .25; g.fillStyle = C(r.u.color); g.fill(); g.globalAlpha = 1; } }, true);
  SCENE.goal = null;
  for (let i = 0; i < 56; i++) {
    const k = i / 56, e = k * k * (3 - 2 * k); rings.forEach(r => r.t++);
    if (i > 10) { const kk = clamp((i - 10) / 40, 0, 1), ee = kk * kk * (3 - 2 * kk); const c = SCENE.cam; for (const key of ['x', 'y', 'pitch', 'h', 'f', 'hy']) c[key] = lerp(from[key], top[key], ee); let d = top.yaw - from.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw = from.yaw + d * ee; B.propScale = lerp(1, .5, ee); B.unitScale = lerp(1, .5, ee); }
    B.party.forEach((u, j) => { const kk = clamp((i - 6 - j * 4) / 30, 0, 1); u.wx = lerp(start[j][0], dest[j][0], kk); u.wy = lerp(start[j][1], dest[j][1], kk); u.wz = kk > 0 && kk < 1 ? Math.abs(Math.sin(kk * Math.PI * 3)) * 10 : 0; u.pose = kk < 1 ? 'hop' : 'idle'; });
    B.puddle.k = Math.max(0, B.puddle.k - .04);
    yield;
  }
  rf.dur = 0;
  if (typeof chapterWon === 'function' && Game.page === 1) chapterWon(B.foe);
  else if (B.foe.boss) { Game.bossDown = true; Game.palette = 'vivo'; Audio.sfx('saturate'); Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); OW.msg = { lines: DATA.texts.ending, t: 0 }; }
  OW.cam.x = camX; OW.cam.y = camY; OW.vx = OW.vy = 0; OW.bob = 0; if (Party.some(q => q.cur.hp < effStats(q).hp * .6 || q.cur.mp < effStats(q).mp * .3)) OW.hint = 150; setState('overworld'); Audio.play(worldCue(), { resume: true });
}
function resetGame() {
  if (typeof CHAPTER !== 'undefined' && Game.page === 1) chapterInstall(0);
  if (typeof CHAPTER !== 'undefined') { CHAPTER.turn=null;CHAPTER.pages=[];CHAPTER.complete=false;CHAPTER.visited=new Set([0]); }
  Game.pigmento = 0; Game.palette = 'gris'; Game.inventory = { ...DATA.inventory }; Game.defeated = new Set(); Game.bossDown = false; Game.ended = false; Game.owned = {}; Game.puzzle = PUZ0();
  Game.studies = {}; Game.seenTechs = new Set();
  Party.forEach((p, i) => { p.weapon = DATA.party[i].weapon; p.acc = DATA.party[i].acc; const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; });
  Audio.positions = {};
  initOverworld(); setState('overworld'); Audio.play(worldCue());
}
// =====================================================================
// 7. Render: cielo, suelo Mode 7, capa de suelo (charcos, marcas), entidades por profundidad, partículas, GUI
// =====================================================================
function drawSprite(s, x, y, sc = 1, flip = false, sy = 1) { const w = s.width * sc, h = s.height * sc * sy; g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = false; g.drawImage(s, -Math.round(w / 2), -Math.round(h) + 1, Math.round(w), Math.round(h)); g.restore(); }
function unitSprite(u, frame) { return unitSpriteInfo(u, frame).spr; }
function drawUnit(u) {
  const s = u.sc * B.unitScale * (u.kind === 'enemy' ? (u.boss ? 1.35 : 1.6) : 1), frame = (B.t / 9 + u.idx * 2 | 0) % 4, ready = u.kind === 'party' && u.atb >= 100 && u.alive && !u.acting && B.phase === 'fight';
  if (u.dead) { // outro de muerte: derretirse (0-.5), el color sube (.5-1), cae y salpica (1-1.4), el charco de tinta se evapora (1.4-2)
    const q = u.dead - 1, gp = project(u.wx, u.wy, 0); if (!gp || q > 2) return; const sc = gp[2] * B.unitScale * (u.boss ? 1.35 : 1.6);
    const pw = u.def.w * .6 * sc; g.fillStyle = '#0b0912'; g.globalAlpha = q < 1.4 ? 1 : clamp((2 - q) / .6, 0, 1); g.beginPath(); g.ellipse(gp[0], gp[1] + 1, pw * (.6 + Math.min(q, .6)), pw * .38 * (.6 + Math.min(q, .6)), 0, 0, 6.29); g.fill(); g.fillStyle = '#2a2438'; g.fillRect(Math.round(gp[0] - pw * .3), gp[1] - 1, Math.max(2, pw * .25 | 0), 1); g.globalAlpha = 1;
    if (q < .5) { const k = q / .5, info = unitSpriteInfo(u, frame); drawSprite(info.spr, u.x, gp[1], sc * (1 + k * 1.1), false, Math.max(.06, 1 - k * 1.7)); }
    if (u.def.core && q >= .5 && q < 1.4) { const k = q < 1 ? (q - .5) / .5 : 1, fall = q >= 1 ? (q - 1) / .4 : 0, wz = q < 1 ? 34 * (1 - Math.pow(1 - k, 2)) : 34 * (1 - fall * fall), c = project(u.wx, u.wy, wz); if (c) { const r = (4 + Math.sin(B.t * .4) * .8) * c[2], rp = ramp(u.def.core); g.fillStyle = rp.hi; g.globalAlpha = .35; g.beginPath(); g.arc(c[0], c[1], r * 2.2, 0, 6.29); g.fill(); g.globalAlpha = 1; g.fillStyle = rp.out; g.beginPath(); g.arc(c[0], c[1], r + 1, 0, 6.29); g.fill(); g.fillStyle = rp.base; g.beginPath(); g.arc(c[0], c[1], r, 0, 6.29); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(c[0] - r * .4, c[1] - r * .5, 2, 1); if ((B.t >> 1) % 3 === 0) { g.fillStyle = rp.hi; g.fillRect(c[0] + R(-8, 8) | 0, c[1] + R(-8, 8) | 0, 1, 1); } } }
    return;
  }
  if (u.erasing && (B.t >> 1) & 1) g.globalAlpha = .35;
  const gp = project(u.wx, u.wy, 0); if (!u.dead && gp && u.wz > -u.def.h * .9) shadow(gp[0], gp[1], Math.max(3, Math.round(u.shadowW * gp[2] * B.unitScale * (1 - clamp(u.wz / 120, 0, .6)))));
  // aviso de que va a actuar (ATB ≥ 82, junto al sonido enemy_soon): un aro de tinta se cierra bajo él y el sprite late y destella
  const warn = u.kind === 'enemy' && u.warned && u.alive && !u.acting && B.phase === 'fight', wq = (B.t % 22) / 22;
  if (warn && gp) { const pa = g.globalAlpha, rw = u.def.w * .6 * s + 6, k = 1.7 - wq * .7; g.strokeStyle = '#0b0912'; g.lineWidth = 1.5; g.globalAlpha = .75 * (1 - wq); g.beginPath(); g.ellipse(gp[0], gp[1] + 1, rw * k, rw * .42 * k, 0, 0, 6.29); g.stroke(); g.globalAlpha = pa; }
  // emergiendo del charco: se recorta por debajo del suelo
  let clip = false; if (u.wz < 0 && gp) { g.save(); g.beginPath(); g.rect(0, 0, W, gp[1] + 1); g.clip(); clip = true; }
  const G = u.goop, ga = G ? (G.t > G.life - 20 ? (G.life - G.t) / 20 : 1) : 0;
  const info = unitSpriteInfo(u, frame); let spr = info.spr; if (u.kind === 'party') spr = desatSprite(spr, pigmentFade(u.mp, u.maxmp)); if (G) spr = tintSprite(spr, G.col, .55 * ga); if (u.sketch) spr = tintSprite(spr, '#8a86a0', .8);
  if (warn && Prefs.flash > 0 && wq < .18) spr = tintSprite(spr, '#f4f0ea', .4 * Prefs.flash); // destello al compás del aro
  const recoil = recoilPose(u); if (u.recoil && u.recoil.t < 3 && Prefs.flash) spr = tintSprite(spr, u.recoil.col, .45 * Prefs.flash);
  g.save(); g.translate(recoil.x, recoil.y);
  const flip = u.kind === 'party' ? (u.pose === 'attack' || u.pose === 'charge' ? false : false) : u.facingLeft;
  const sqz = (u.sqz ? 1 - u.sqz * .25 * (1 + Math.sin(B.t * .8) * .3) : 1) * (warn ? 1 + Math.sin(B.t * .55) * .045 : 1); drawSprite(spr, u.x, u.y - (ready ? Math.abs(Math.sin(B.t * .25)) * 2 | 0 : 0), s * info.sx * sqz * recoil.sx * (u.gesture?.sx ?? 1), flip, info.sy * (u.sqz ? 1.1 : 1) * recoil.sy * (u.gesture?.sy ?? 1));
  if (u.id === 'anil' && u.alive) drawSatellites(u.x, u.y, B.t + u.idx * 10, C(u.color), s);
  if (G) drawGoop(u);
  g.restore();
  if (clip) g.restore();
  g.globalAlpha = 1;

  if (u.status.tiznado && u.alive) { g.fillStyle = '#2a2438'; g.fillRect(u.x - 3, u.y - u.def.h * s - 6, 6, 2); }
  if (u.status.lento && u.alive) smallText('L' + u.status.lento, clamp(u.x + 6, 2, 306), clamp(u.y - u.def.h * s - 9, 44, 123), '#f3d2ee');
  if (u.status.contorno && u.alive) drawContorno(u);
  if (u.status.firmado && u.alive) { const c = project(u.wx, u.wy, 0); if (c) { g.fillStyle = C('rojo'); g.fillRect(u.x + 8, u.y - u.def.h * s - 4, 2, 5); g.fillRect(u.x + 6, u.y - u.def.h * s - 2, 2, 1); g.fillRect(u.x + 10, u.y - u.def.h * s - 6, 2, 1); } }
}
function drawGroundLayer() {
  // charco de tinta de los enemigos (aparece al drenar la mancha)
  const P = B.puddle; if (P && P.k > 0) { const c = project(P.wx, P.wy, 0); if (c) { g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(c[0], c[1], P.rx * c[2] * P.k, P.ry * c[2] * P.k * .55, 0, 0, 6.29); g.fill(); g.fillStyle = '#2a2438'; g.beginPath(); g.ellipse(c[0] - 4 * c[2], c[1] - 2 * c[2], P.rx * c[2] * P.k * .5, P.ry * c[2] * P.k * .2, 0, 0, 6.29); g.fill(); } }
  for (const p of B.puddles) { const c = project(p.wx, p.wy, 0); if (!c) continue; g.fillStyle = ramp(p.col).base; g.beginPath(); g.ellipse(c[0], c[1], p.w * .45 * c[2], 3 * c[2], 0, 0, 6.29); g.fill(); g.fillStyle = ramp(p.col).hi; g.fillRect(c[0] - 3, c[1] - 1, 3, 1); }
  drawMarks(true);
  for (const f of B.fx) if (f.under) f.draw();
}
function drawBattle() {
  const T = B.tr;
  if (T && T.overworld) { // fases 1-3 sobre el mapa: sacudida con más peso vertical (el impacto viene de arriba) y golpe de zoom sobre el grupo
    const sh = Math.round(B.shake * Prefs.shake), punch = (T.punch || 0) * Prefs.shake, lead = B.party[0], px = lead.wx - OW.cam.x, py = lead.wy - OW.cam.y;
    g.save(); if (sh) g.translate(RI(-sh, sh) / 2 | 0, RI(-sh, sh)); if (punch > 0) { const z = 1 + punch * .07; g.translate(px, py); g.scale(z, z); g.translate(-px, -py); }
    drawOverworld(); drawTransitionFx(); g.restore(); drawFastHint(); return;
  }
  if (T && T.stage === 'blot') { drawOverworld(); mapSnap().drawImage(buf, 0, 0); } // el mapa congelado se guarda: se verá fuera de la ventana de tinta
  const pal = Game.palette, gris = pal === 'gris';
  const shake = Math.round(B.shake * Prefs.shake);
  const sx = shake ? RI(-shake, shake) : 0, sy = shake ? RI(-shake, shake) / 2 | 0 : 0;
  g.save(); g.translate(sx, sy);
  drawSky(pal); drawFloor(pal, gris ? '#767c96' : '#9ed0f6', gris ? '#767c96' : '#9ed0f6');
  g.fillStyle = '#a29b88'; g.globalAlpha = .12; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  drawGroundLayer(); drawTacticalGround();
  // entidades por profundidad (lejos primero): unidades y props del mapa
  const ents = [];
  for (const u of B.units) { if (u.z && cameraShowsUnit(u)) ents.push({ z: u.z, d: () => drawUnit(u) }); }
  for (const o of B.props) { const p = project(o.wx, o.wy, 0); if (!p || p[1] < -60 || p[0] < -60 || p[0] > W + 60) continue;
    // si un árbol queda delante de alguien, se vuelve translúcido
    const s = p[2] * B.propScale, cover = (o.kind === 'T' || o.kind === 'art') && B.units.some(u => u.z && p[3] < u.z && Math.abs(p[0] - u.x) < (o.object ? o.object.size[0] / 2 : 17) * s + 14 && p[1] > u.y - 30 && p[1] < u.y + (o.object ? o.object.size[1] : 50) * s);
    ents.push({ z: p[3], d: () => { g.globalAlpha = cover ? .22 : .7; if (o.kind === 'art') { shadow(p[0], p[1], Math.round(o.object.size[0] * .7 * s)); drawSprite(worldSprite(o.object, pal), p[0], p[1] + 2, s); } else if (o.kind === 'T') { shadow(p[0], p[1], Math.round(22 * s)); drawSprite(bigTree(pal, o.vr), p[0], p[1] + 2, s); } else { shadow(p[0], p[1] + 1, Math.round(24 * s)); drawSprite(bigRock(pal, o.vr & 3), p[0], p[1] + 2, s); } g.globalAlpha = 1; } }); }
  ents.sort((a, b) => b.z - a.z).forEach(e => e.d());
  drawMarks(false); for (const f of B.fx) if (!f.under) f.draw();
  for (const p of B.particles) { if (p.t < 0) continue; const c = project(p.wx, p.wy, p.wz); if (!c) continue; g.fillStyle = p.pal ? p.pal[Math.min(p.pal.length - 1, Math.floor(p.t / p.life * p.pal.length))] : p.col; const s = Math.max(1, Math.round((p.stream ? 2 : (p.t > p.life * .7 ? 1 : (p.size || 2))) * c[2])); g.fillRect(Math.round(c[0]), Math.round(c[1]), s, s); }
  drawTacticalMarkers();
  g.restore();
  if (T) { drawTransitionFx(); drawFastHint(); }
  if (B.flash) { g.fillStyle = B.flash.col; g.globalAlpha = B.flash.a * Prefs.flash; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (B.rainbow > 0) { const cols = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta']; cols.forEach((c, i) => { g.fillStyle = C(c); g.globalAlpha = .5 * B.rainbow / 40 * Prefs.flash; const off = (40 - B.rainbow) * 12 + i * 10; g.fillRect(off - 200, 0, 8, H); g.fillRect(W - off + 200 - 8, 0, 8, H); }); g.globalAlpha = 1; }
  for (const n of B.nums) {
    const p = project(n.wx, n.wy, n.wz); if (!p) continue;
    const numeric = /^[+\-]?\d+$/.test(n.v), width = numeric ? rotuloWidth(n.v) : textWidth(n.v);
    const x = clamp(Math.round(p[0] + n.dx - width / 2), 3, W - width - 3), y = clamp(Math.round(p[1] + n.offset), 35, 121);
    if (numeric) {
      // A complementary hit lands at double size for a beat, then settles.
      const big = n.big && n.t < 7 && Prefs.shake;
      if (big) { g.save(); g.translate(x + width / 2, y + 5); g.scale(2, 2); bigText(n.v, -width / 2, -5, n.col, { outline: '#14121c' }); g.restore(); }
      else bigText(n.v, x, y, n.col, { outline: '#14121c' });
    }
    else { g.fillStyle='#292333'; g.fillRect(x-2,y-1,width+4,9); smallText(n.v,x,y,n.col); }
  }
  if (B.phase !== 'trans' && !B.exiting) drawBattleUI();
  if (B.phase === 'victory' && B.showResult) drawBattleResults();
  if (B.phase === 'defeat') drawDefeat();
}
