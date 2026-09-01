// CHROMARA — battle.js: transición (siete fases), batalla estilo Golden Sun sobre el mapa (ATB Active, techs, IA, efectos en coordenadas de mundo).
'use strict';
// =====================================================================
// 1. Estado, unidades, reglas de color y daño
// =====================================================================
const B = {};
const SEMI = { carmin: 0, ambar: 4, anil: 7 }; // cada gota tiene su nota: acorde mayor Re-Fa#-La
const semiOf = u => ({ semi: SEMI[u.id] ?? -5 });
let ATB_ACTIVE = true; const ATB_RATE = .11; // modo Active (Chrono Trigger): el tiempo no se para al elegir
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
function baseDmg(atk, def, power) { return Math.max(2, (atk * 2 - def * .7) * power); }
function tickStatus(u) { for (const k in u.status) if (--u.status[k] <= 0) delete u.status[k]; }
function say(s, col = '#f4f0ea') { B.msg = { s, col }; B.msgT = 70; }
function num(u, v, col, big) { B.nums.push({ x: u.x + R(-4, 4), y: u.y - u.def.h * u.sc - 6, v: String(v), col, t: 0, vy: -1.6, big }); }
function damage(target, raw, col, src) {
  if (!target.alive) return 0;
  const mult = colorMult(col, target.color), dmg = Math.max(1, Math.round(raw * mult * R(.92, 1.08)));
  target.hp = Math.max(0, target.hp - dmg); target.pose = 'hurt'; target.poseT = 14;
  num(target, dmg, mult >= 2 ? '#f2c93a' : mult < 1 ? '#8c8ab0' : '#f4f0ea', mult >= 2);
  burst(target.wx, target.wy, target.def.h * .5, C(col), mult >= 2 ? 14 : 7, mult >= 2 ? 2.2 : 1.4);
  Audio.sfx(mult >= 2 ? 'hitweak' : mult < 1 ? 'resist' : 'hit', { pan: target.kind === 'enemy' ? -.4 : .4 }); B.hitstop = mult >= 2 ? 6 : 3; B.shake = mult >= 2 ? 4 : 2;
  if (mult >= 2) say((src ? src + ': ' : '') + '¡Débil al ' + DATA.colors[col].name.toLowerCase() + '!', '#f2c93a');
  if (target.hp <= 0) kill(target);
  return dmg;
}
function heal(target, amount, isMp) {
  if (!target.alive) return;
  if (isMp) { target.mp = Math.min(target.maxmp, target.mp + amount); num(target, '+' + amount, '#3a6fe2'); }
  else { const a = Math.min(amount, target.maxhp - target.hp); target.hp += a; num(target, '+' + a, '#4fb84a'); }
  burst(target.wx, target.wy, target.def.h * .4, isMp ? C('azul') : C('verde'), 10, 1, 28, -.03); Audio.sfx('heal');
}
function kill(u) {
  u.alive = false; u.pose = 'ko'; u.atb = 0; Audio.sfx(u.kind === 'enemy' ? 'die' : 'ko');
  if (u.kind === 'enemy') { // se disuelve en tinta y deja un charquito del color que había robado
    burst(u.wx, u.wy, u.def.h * .4, C('negro'), 18, 2, 30, .12);
    if (u.def.core) { B.puddles.push({ wx: u.wx, wy: u.wy, col: u.def.core, w: u.data.w }); burst(u.wx, u.wy, u.def.h * .4, u.def.core, 10, 1.4, 34, .05); }
    u.dead = 1;
  }
  B.queue = B.queue.filter(q => q !== u); if (B.menu && B.menu.unit === u) B.menu = null;
}

// =====================================================================
// 2. Formación en el mundo, escena y arranque (la batalla ocurre donde te pillan)
// =====================================================================
function initBattle(foe) {
  Object.assign(B, { foe, party: [], enemies: [], queue: [], menu: null, actions: [], busy: false, particles: [], nums: [], puddles: [], fx: [], marks: [], shake: 0, hitstop: 0, flash: null, phase: 'trans', t: 0, msg: null, msgT: 0, result: null, rainbow: 0, tr: { overworld: true }, gen: null, paper: 0, dark: 0 });
  B.party = Party.map(unitFromParty);
  const n = foe.enemies.length; B.enemies = foe.enemies.map((id, i) => unitFromEnemy(id, i, n, foe.enemies));
  B.units = [...B.enemies, ...B.party];
  // eje del combate: del grupo al enemigo
  const E = [foe.x, foe.y]; let dx = E[0] - OW.x, dy = E[1] - OW.y; const L = Math.hypot(dx, dy); if (L < 1) { dx = 1; dy = 0; } else { dx /= L; dy /= L; }
  const rx = -dy, ry = dx, at = (a, r) => [E[0] + dx * a + rx * r, E[1] + dy * a + ry * r];
  B.axis = { dx, dy, rx, ry, E };
  const offE = n === 1 ? [[6, 0]] : n === 2 ? [[4, -18], [8, 18]] : [[-2, 0], [12, -30], [12, 30]];
  B.enemies.forEach((u, i) => { const [x, y] = at(offE[i][0] + (u.boss ? 16 : 0), offE[i][1]); u.hx = x; u.hy = y; u.wx = x; u.wy = y; u.wz = -u.def.h - 4; });
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
  const ec = homeC(B.enemies); B.puddle = { wx: ec[0], wy: ec[1], rx: n === 1 ? 26 : 46, ry: n === 1 ? 12 : 20, k: 0 };
  B.gen = transitionGen(foe);
  B.unitScale = .5;
}
function startTransition(foe) { initBattle(foe); setState('transition'); }

// =====================================================================
// 3. Transición: detección, caída, salpicón, mancha que se traga el mapa (y lo inclina), drenaje al charco, entrada
// =====================================================================
function* transitionGen(foe) {
  const T = B.tr; Audio.stop(); Audio.sfx('detect'); Audio.sfx('hum_down', { vol: .5 });
  // 1) anticipación: el mapa se congela, el enemigo late, la sombra de la gota crece sobre el grupo
  T.stage = 'detect'; T.foe = foe; for (let i = 0; i < 18; i++) { T.k = i / 18; yield; }
  // 2) caída
  T.stage = 'fall'; Audio.sfx('fall'); for (let i = 0; i < 22; i++) { T.k = i / 22; yield; }
  // 3) salpicón: hit-stop, sacudida, gotas hacia la cámara, ondas
  T.stage = 'splash'; T.k = 0; Audio.sfx('splash'); Audio.sfx('encounter'); B.shake = 6; Audio.play(foe.boss ? 'boss' : 'battle');
  T.drops = []; for (let i = 0; i < 14; i++) T.drops.push({ a: R(0, 6.28), s: R(1.2, 3.2), r: R(3, 9), rot: R(-.05, .05) });
  for (let i = 0; i < 5; i++) yield; // hit-stop
  for (let i = 0; i < 16; i++) { T.k = i / 16; yield; }
  // 4) mancha orgánica que crece mientras el mapa se inclina a la vista de batalla (se lleva el color por delante)
  T.stage = 'blot'; T.overworld = false; T.k = 0;
  T.balls = []; for (let i = 0; i < 9; i++) T.balls.push({ a: i / 9 * 6.28 + R(-.3, .3), d: R(.3, 1), r: R(.5, 1), ph: R(0, 6.28) });
  T.tendrils = []; for (let i = 0; i < 7; i++) T.tendrils.push({ a: R(0, 6.28), len: R(1.2, 2.2), w: R(.12, .3), sp: R(.6, 1.4) });
  const top = { x: OW.cam.x + W / 2, y: OW.cam.y + H / 2, yaw: -Math.PI / 2, pitch: 1.5, h: 150, f: 150, hy: 90 };
  camSet(top);
  for (let i = 0; i < 40; i++) { T.k = i / 40; const k = clamp((i - 8) / 30, 0, 1), e = k * k * (3 - 2 * k); B.unitScale = lerp(.5, 1, e);
    const c = SCENE.cam, r = SCENE.rest; for (const key of ['x', 'y', 'pitch', 'h', 'f', 'hy']) c[key] = lerp(top[key], r[key], e); c.yaw = lerp(top.yaw, r.yaw, e); yield; }
  camSet(SCENE.rest); B.unitScale = 1;
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
  B.tr = null; B.phase = 'fight'; say('¡Gotas Negras!', '#8c8ab0'); Audio.sfx('banner'); setState('battle');
}
// Dibujo de la transición sobre el mapa cenital (fases 1-3) y de la mancha/gotas sobre la escena (4-5)
function drawTransitionFx() {
  const T = B.tr; if (!T || !T.stage) return;
  const lead = B.party[0];
  if (T.overworld) {
    const sx = lead.wx - OW.cam.x, sy = lead.wy - OW.cam.y, foe = T.foe, fx0 = foe.x - OW.cam.x, fy0 = foe.y - OW.cam.y;
    if (T.stage === 'detect') { // el enemigo late; sombra circular creciente sobre el grupo
      const pulse = 1 + Math.sin(T.k * 18) * .12; g.fillStyle = 'rgba(11,9,18,.35)'; g.beginPath(); g.ellipse(fx0, fy0 - 6, 9 * pulse, 9 * pulse, 0, 0, 6.29); g.fill();
      g.fillStyle = 'rgba(11,9,18,' + (.15 + T.k * .35) + ')'; g.beginPath(); g.ellipse(sx, sy, 4 + T.k * 10, 2 + T.k * 4, 0, 0, 6.29); g.fill();
      if ((Game.t >> 2) & 1) { g.fillStyle = '#f4f0ea'; g.fillRect(fx0 - 1, fy0 - 26, 2, 6); g.fillRect(fx0 - 1, fy0 - 18, 2, 2); }
    } else if (T.stage === 'fall') { // la gota cae con aceleración; la sombra se cierra bajo el grupo
      const k = T.k, y = lerp(-30, sy - 4, k * k); g.fillStyle = 'rgba(11,9,18,' + (.5 + k * .3) + ')'; g.beginPath(); g.ellipse(sx, sy, 14 - k * 6, 6 - k * 3, 0, 0, 6.29); g.fill();
      drawDrop({ color: C('negro'), shape: 'tall', w: 16, h: 24 }, sx, y, 'hop', 0, { dark: true });
    } else if (T.stage === 'splash') { // impacto: mancha en el suelo, ondas, gotas grandes hacia la cámara
      const k = T.k; g.fillStyle = '#0b0912'; g.beginPath(); g.ellipse(sx, sy, 10 + k * 26, 5 + k * 12, 0, 0, 6.29); g.fill();
      for (let r = 0; r < 3; r++) { const kk = clamp(k * 1.4 - r * .25, 0, 1); if (kk <= 0) continue; g.strokeStyle = 'rgba(244,240,234,' + (.7 * (1 - kk)) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(sx, sy, 8 + kk * 60, 4 + kk * 26, 0, 0, 6.29); g.stroke(); }
      g.fillStyle = '#0b0912'; for (const d of T.drops) { const dist = k * k * 260 * d.s * .5 + k * 20, x = sx + Math.cos(d.a) * dist, y = sy + Math.sin(d.a) * dist * .8 - k * 10, r = d.r * (1 + k * d.s * 1.6); g.beginPath(); g.ellipse(x, y, r, r * .8, d.a, 0, 6.29); g.fill(); g.fillRect(x - r * .3 | 0, y - r * .5 | 0, 2, 1); }
    }
    return;
  }
  const p = project(lead.hx, lead.hy, 0) || [W / 2, H / 2, 1], q = project(B.puddle.wx, B.puddle.wy, 0) || [W / 2, H / 2, 1];
  if (T.stage === 'blot') { // mancha orgánica: metabolas + tentáculos, delante va la onda que desatura
    const k = T.k, grow = Math.sin(Math.min(1, k * 1.15) * Math.PI / 2), R0 = 22 + grow * 96;
    const [sx, sy] = [lerp(lead.wx - OW.cam.x, p[0], clamp((k - .2) / .75, 0, 1)), lerp(lead.wy - OW.cam.y, p[1], clamp((k - .2) / .75, 0, 1))];
    g.globalCompositeOperation = 'saturation'; g.fillStyle = '#7a7a7a'; g.beginPath(); g.ellipse(sx, sy, R0 * 1.9, R0 * 1.3, 0, 0, 6.29); g.fill(); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#0b0912';
    for (const b of T.balls) { const r = R0 * b.r * (0.8 + .2 * Math.sin(B.t * .3 + b.ph)), d = R0 * b.d * .8; g.beginPath(); g.ellipse(sx + Math.cos(b.a) * d, sy + Math.sin(b.a) * d * .75, r, r * .8, 0, 0, 6.29); g.fill(); }
    for (const t of T.tendrils) { const L = R0 * t.len * Math.min(1, k * t.sp + .2); g.save(); g.translate(sx, sy); g.rotate(t.a); g.beginPath(); g.ellipse(L * .5, 0, L * .5, R0 * t.w, 0, 0, 6.29); g.fill(); g.beginPath(); g.arc(L, 0, R0 * t.w * 1.6, 0, 6.29); g.fill(); g.restore(); }
    g.fillStyle = '#2a2438'; g.fillRect(sx - R0 * .3 | 0, sy - R0 * .5 | 0, R0 * .12 | 0, 2);
  } else if (T.stage === 'drain') { // la mancha se escurre hacia el charco de los enemigos y encoge
    const k = T.k, e = k * k, cx = lerp(p[0], q[0], e), cy = lerp(p[1], q[1], e), R0 = lerp(118, B.puddle.rx, e);
    g.fillStyle = '#0b0912';
    for (const b of T.balls) { const r = R0 * b.r * (1 - e * .6), d = R0 * b.d * (1 - e); g.beginPath(); g.ellipse(cx + Math.cos(b.a) * d, cy + Math.sin(b.a) * d * .6, r, r * .5, 0, 0, 6.29); g.fill(); }
    for (const t of T.tendrils) { const L = R0 * t.len * (1 - e); g.save(); g.translate(cx, cy); g.rotate(t.a); g.beginPath(); g.ellipse(L * .5, 0, L * .5, R0 * t.w * .6, 0, 0, 6.29); g.fill(); g.restore(); }
  }
}

// =====================================================================
// 4. Efectos en coordenadas de mundo: partículas, marcas de pintura, fx, props
// =====================================================================
function burst(wx, wy, wz, col, n, spd = 1.6, life = 24, grav = .06) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), s = R(.3, 1) * spd; B.particles.push({ wx, wy, wz, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6, vz: R(.4, 1.6) * spd * .6, g: grav, col, t: 0, life: life + RI(-6, 6) }); } }
function stream(u, t, col, n, dur) { for (let i = 0; i < n; i++) B.particles.push({ wx: u.wx, wy: u.wy, wz: u.def.h * .5, tx: t.wx + R(-6, 6), ty: t.wy + R(-4, 4), tz: t.def.h * R(.3, .7), col, t: -RI(0, dur * .5), life: dur, dur, arc: R(14, 30), stream: true }); }
function flames(wx, wy, n, spread = 12) { for (let i = 0; i < n; i++) B.particles.push({ wx: wx + R(-spread, spread), wy: wy + R(-spread * .5, spread * .5), wz: R(0, 4), vx: R(-.3, .3), vy: 0, vz: R(1, 2.4), g: -.02, t: -RI(0, 16), life: RI(12, 24), pal: ['#fbe28a', C('amarillo'), C('naranja'), C('rojo'), '#5a2a2a'], size: 3 }); }
function fx(dur, draw, under = false) { const f = { t: 0, dur, draw, under }; B.fx.push(f); return f; }
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
    const k = clamp(m.t / m.grow, 0, 1); g.globalAlpha = m.t > m.life - 14 ? (m.life - m.t) / 14 : 1;
    if (m.kind === 'stroke') { const a = PJ(m.p0), b = PJ(m.p1); pstroke(a[0], a[1], b[0], b[1], m.w * a[2], m.col, k, m.jit || 0); }
    else if (m.kind === 'path') drawWPath(m.pts, m.w || 1, m.col, k, m.jit || 0);
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
function hitBasic(u, t) { return damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, 1), u.color, u.name); }
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
      case 'tubo': { // tubo de pintura metálico: pliegue, etiqueta con muestra de color, tapón
        F(MET[3], 0, 3, 4, 10); F(MET[2], 1, 4, 2, 8); F(MET[0], 1, 5, 1, 1); F(MET[3], 3, 2, 26, 12); F(MET[1], 4, 3, 24, 10); F(MET[0], 4, 3, 24, 2); F(MET[0], 4, 5, 2, 6); F(MET[2], 4, 11, 24, 2);
        F('#f4f0ea', 11, 3, 10, 10); F(rp.base, 13, 5, 4, 5); F(rp.hi, 13, 5, 4, 1); F(rp.dk, 16, 5, 1, 5); F('#2a2438', 18, 5, 2, 1); F('#2a2438', 18, 7, 2, 1); F('#2a2438', 18, 9, 1, 1);
        F(MET[3], 29, 5, 4, 6); F(MET[2], 29, 6, 3, 4); F(rp.out, 33, 3, 9, 10); F(rp.base, 34, 4, 7, 8); F(rp.hi, 34, 4, 7, 1); F(rp.sh, 34, 10, 7, 2); F(rp.dk, 40, 5, 1, 7); F(rp.sh, 36, 6, 1, 4); F(rp.sh, 38, 6, 1, 4);
        break; }
    }
    return c;
  });
}
const PROP = { brocha: { tip: [58, 20], a: 1.05 }, lapiz: { tip: [47, 7], a: 0.95 }, pincel: { tip: [47, 12], a: 1.0 }, goma: { tip: [16, 8], a: 0 }, tubo: { tip: [41, 8], a: Math.PI / 2 } };
const facing = u => u.kind === 'party' ? -1 : 1; // hacia dónde ataca (en pantalla: el grupo mira a la izquierda)
function drawProp(img, x, y, a, fac, px = 1, py = 5, scale = 1, alpha = 1) { g.save(); g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); g.scale(fac, 1); g.rotate(a); g.imageSmoothingEnabled = false; g.drawImage(img, -px * scale, -py * scale, img.width * scale, img.height * scale); g.restore(); }
// La herramienta protagonista: aparece con destello, recorre un camino de mundo con la punta dejando su trazo y se retira.
function* toolStroke(o) {
  const img = propSprite(o.kind, o.color), P = PROP[o.kind], sc = o.scale || 1, p0 = o.pts[0];
  if (o.under) mark({ kind: 'path', pts: o.pts.map(p => [p[0] + 1, p[1] + 1, p[2] || 0]), w: o.w, col: o.under, grow: o.frames, life: o.life || 50, jit: o.jit });
  mark({ kind: 'path', pts: o.pts, w: o.w, col: o.col, grow: o.frames, life: o.life || 50, jit: o.jit });
  sparkle(p0[0], p0[1], (p0[2] || 0) + 4); const st = { k: 0, lift: 0 };
  const f = fx(999, () => { const wp = pointAt(o.pts, st.k), [x, y, s] = PJ(wp), l = st.lift; drawProp(img, x - (o.fac || 1) * l * 1.5, y - l * 2.5, P.a + (o.a || 0) - l * .05, o.fac || 1, P.tip[0], P.tip[1], sc * s, l ? Math.max(0, 1 - l / 10) : 1); });
  for (let i = 1; i <= o.frames; i++) { st.k = i / o.frames; const wp = pointAt(o.pts, st.k); if (o.onTip) o.onTip(st.k, wp); yield; }
  for (let i = 1; i <= 8; i++) { st.lift = i; yield; }
  f.dur = 0;
}

// =====================================================================
// 5. Acciones (versión de andamio: se sustituyen por las coreografías definitivas)
// =====================================================================
function* actAttack(u, target) {
  tickStatus(u); const t = target; say(u.name + ' ataca');
  const mid = [(u.wx + t.wx) / 2, (u.wy + t.wy) / 2]; camFocus(mid[0], mid[1], { dist: 90, turn: u.kind === 'party' ? -.25 : .25 });
  u.pose = 'attack'; const [ax, ay] = infront(u, t, t.def.w * .6 + 14); yield* whop(u, ax, ay, 10, 10);
  if (u.kind === 'party') {
    const kind = u.data.weapon, pts = [[t.wx - 12, t.wy - 4, t.def.h + 8], [t.wx + 10, t.wy + 4, 2]]; let done = false; Audio.sfx('brush_sweep', { pan: -.3 });
    yield* toolStroke({ kind, color: C(u.color), pts, w: kind === 'brocha' ? 8 : 3, col: C(u.color), frames: 8, fac: -1, onTip: (k, wp) => { if (k > .55 && !done) { done = true; burst(wp[0], wp[1], wp[2], C(u.color), 8, 2, 16, .12); hitBasic(u, t); goop(t, C(u.color)); } } });
  } else { yield* whop(u, t.wx + B.axis.dx * -8, t.wy + B.axis.dy * -8, 8, 16); hitBasic(u, t); goop(t, C('negro'), 60); yield* wait(10); }
  u.pose = 'idle'; yield* whop(u, u.hx, u.hy, 10, 8); camReset();
}
function* chargeAndFuse(users, wx, wy, wz, col, frames = 26) {
  const cols = users.map(u => C(u.color)); Audio.sfx('charge', { semi: 0 }); users.forEach((u, k) => { u.pose = 'attack'; Audio.sfx('charge', { semi: SEMI[u.id] || 0, when: k * .05 }); });
  const rings = fx(999, () => { for (const u of users) { const [x, y, s] = PJ([u.wx, u.wy, 0]); g.strokeStyle = C(u.color); g.globalAlpha = .6; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, (10 + Math.sin(rings.t * .3) * 3) * s, 4 * s, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; } }, true);
  for (let i = 0; i < frames; i++) { users.forEach((u, k) => { u.wz = Math.abs(Math.sin((i + k * 4) * .35)) * 5; if (i % 3 === k % 3) B.particles.push({ wx: u.wx + R(-8, 8), wy: u.wy + R(-4, 4), wz: R(0, u.def.h), vx: 0, vy: 0, vz: R(.6, 1.4), g: -.02, col: cols[k], t: 0, life: 20 }); }); yield; }
  users.forEach(u => stream(u, { wx, wy, def: { h: wz * 2 } }, C(u.color), 12, 16));
  const orb = { wx, wy, wz, r: 4, t: 0 }, of = fx(999, () => { const [x, y, s] = PJ([orb.wx, orb.wy, orb.wz]); const c = orb.t < 12 ? cols[(orb.t >> 1) % cols.length] : col; g.fillStyle = ramp(c).base; g.beginPath(); g.arc(x, y, orb.r * s, 0, 6.29); g.fill(); g.fillStyle = ramp(c).hi; g.fillRect(x - 2, y - orb.r * s * .6, 2, 2); orb.t++; });
  for (let i = 0; i < 16; i++) { orb.r = 4 + i * .6; yield; } Audio.sfx('mix'); B.flash = { col: col, a: .35 }; burst(wx, wy, wz, col, 14, 1.6, 20, 0);
  users.forEach(u => { u.wz = 0; u.pose = 'idle'; }); rings.dur = 0;
  return { of, orb };
}
function* actTech(users, tech, targets, col) {
  users.forEach(tickStatus); const names = users.map(u => u.name).join('+'); say(names + ': ' + tech.name, C(col));
  const ec = enemyC(); camFocus(ec[0], ec[1], { dist: 110, turn: -.2, h: 60 });
  if (users.length === 1) { const u = users[0]; u.pose = 'attack'; yield* whop(u, u.wx - B.axis.dx * -14, u.wy - B.axis.dy * -14, 8, 12); }
  else { const { of } = yield* chargeAndFuse(users, ec[0], ec[1], 40, C(col)); yield* wait(6); of.dur = 0; }
  if (tech.color === 'naranja') { for (let i = 0; i < 18; i++) { flames(ec[0], ec[1], 3, 30); yield; } }
  for (const t of targets) { for (let h = 0; h < (tech.hits || 1); h++) { damage(t, baseDmg(users.reduce((s, u) => s + u.atk, 0) / users.length * statusMult(users[0], 'tiznado'), t.dfn, tech.power), col, names); goop(t, C(col), 70); if (tech.status) t.status[tech.status] = 3; } }
  if (tech.heal) for (const p of alive(B.party)) heal(p, Math.round(p.maxhp * tech.heal));
  if (col === 'blanco') { B.rainbow = 40; B.flash = { col: '#f4f0ea', a: .8 }; Audio.sfx('rainbow'); }
  yield* wait(14); users.forEach(u => { u.pose = 'idle'; }); for (const u of users) yield* whop(u, u.hx, u.hy, 8, 6); camReset();
}
function* actItem(u, itemId, target) {
  tickStatus(u); const it = DATA.items[itemId]; Game.inventory[itemId]--; say(u.name + ' usa ' + it.name);
  camFocus(target.wx, target.wy, { dist: 80, turn: target.kind === 'party' ? .4 : -.2 }); u.pose = 'attack'; yield* wait(6);
  if (it.kind === 'heal') { const def = { color: C('azul'), shape: 'tall', w: 10, h: 14 }; const d = fx(999, () => { const k = clamp(d.t / 14, 0, 1), [x, y, s] = PJ([target.wx, target.wy, lerp(80, target.def.h * .5, k * k)]); drawSprite(dropSprite(def, 'hop', 0), x, y, s); });
    Audio.sfx('drop_fall'); yield* wait(14); d.dur = 0; Audio.sfx('splash_clean'); burst(target.wx, target.wy, target.def.h * .5, C('azul'), 12, 1.8, 20, .15); heal(target, it.amount); }
  else if (it.kind === 'mp') { const img = propSprite('tubo', C(target.color)), P = PROP.tubo; sparkle(target.wx, target.wy, target.def.h + 30);
    const tb = fx(999, () => { const sq = tb.t > 8 ? Math.sin(tb.t * .8) * .12 : 0, [x, y, s] = PJ([target.wx, target.wy, target.def.h + 30 - Math.min(8, tb.t) * 2]); drawProp(img, x, y, P.a + sq, 1, P.tip[0], P.tip[1], 1.2 * s); });
    Audio.sfx('squeeze'); yield* wait(8); Audio.sfx('plop', { when: .1 }); for (let i = 0; i < 16; i++) { B.particles.push({ wx: target.wx + R(-2, 2), wy: target.wy, wz: target.def.h + 12, vx: R(-.4, .4), vy: 0, vz: -R(.4, 1.4), g: -.1, col: C(target.color), t: 0, life: 18, size: 3 }); yield; }
    tb.dur = 0; heal(target, it.amount, true); goop(target, C(target.color), 50); }
  else { const img = propSprite('goma'), P = PROP.goma, rub = { x: 0 }, gm = fx(999, () => { const [x, y, s] = PJ([target.wx, target.wy, target.def.h * .55]); drawProp(img, x + rub.x, y, 0.25, 1, P.tip[0], P.tip[1], 1.2 * s); });
    sparkle(target.wx, target.wy, target.def.h + 6); target.erasing = true;
    for (let i = 0; i < 26; i++) { rub.x = Math.sin(i * .75) * 10; if (i % 2 === 0) B.particles.push({ wx: target.wx + R(-6, 6), wy: target.wy, wz: target.def.h * .3, vx: R(-.6, .6), vy: 0, vz: R(0, 1.2), g: -.12, col: i % 4 ? '#e86a8a' : '#f4f0ea', t: 0, life: 22 }); if (i % 6 === 0) Audio.sfx('rub'); if (i % 8 === 4) Audio.sfx('crumbs'); yield; }
    gm.dur = 0; target.erasing = false;
    const d = target.color === 'negro' ? it.amount : Math.round(it.amount / 3); target.hp = Math.max(0, target.hp - d); target.pose = 'hurt'; target.poseT = 14; num(target, d, '#f4f0ea'); Audio.sfx('hit'); B.hitstop = 3; if (target.hp <= 0) kill(target); }
  u.pose = 'idle'; yield* wait(12); camReset();
}
function* actEnemy(u) {
  tickStatus(u); u.acts++;
  const targets = alive(B.party); if (!targets.length) return;
  let target = pick(targets);
  if (u.ai === 'hunter' || u.ai === 'boss') { const weak = targets.filter(t => colorMult(u.color, t.color) >= 2); if (weak.length && Math.random() < .7) target = pick(weak); }
  if (u.ai === 'tiznar' && Math.random() < .35) {
    say(u.name + ': Tiznar', C('violeta')); u.pose = 'attack'; Audio.sfx('ink_jet'); stream(u, target, C('negro'), 14, 20); yield* wait(22);
    if (DATA.accessories[target.acc] && DATA.accessories[target.acc].immune === 'tiznado') { num(target, 'GOMA!', '#f4f0ea'); say(target.name + ' lo borra con la Goma', '#f4f0ea'); Audio.sfx('rub'); Audio.sfx('crumbs', { when: .2 }); burst(target.wx, target.wy, target.def.h * .5, '#e86a8a', 10, 1.2, 20, .1); yield* wait(14); }
    else { target.status.tiznado = 3; num(target, 'TIZNADO', C('violeta')); mark({ kind: 'blob', p: [target.wx, target.wy, target.def.h * .4], w: 10, col: C('negro'), seed: target.idx, life: 70 }); burst(target.wx, target.wy, target.def.h * .5, C('negro'), 12, 1.5); }
    u.pose = 'idle'; yield* wait(16); return;
  }
  if (u.ai === 'boss' && u.acts % 3 === 0) { // marea negra: una ola de tinta cruza el suelo hacia el grupo
    say('La Tinta: Marea negra', '#8c8ab0'); u.pose = 'hurt'; u.poseT = 24; Audio.sfx('ink_jet'); Audio.sfx('hum_down', { vol: .6 }); yield* wait(8);
    const pc = partyC(), wv = fx(999, () => { const k = clamp(wv.t / 20, 0, 1), [x, y, s] = PJ([lerp(u.wx, pc[0], k), lerp(u.wy, pc[1], k), 0]); g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(x, y, (22 + k * 10) * s, 26 * s, 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4460'; g.fillRect(Math.round(x) - 14 * s, y - (30 + k * 6) * s, 28 * s, 2); }, true);
    for (let i = 0; i < 20; i++) { B.particles.push({ wx: u.wx + R(-20, 20), wy: u.wy + R(-10, 10), wz: R(0, 30), vx: B.axis.dx * -R(2, 4), vy: B.axis.dy * -R(2, 4), vz: R(.5, 1.5), g: .08, col: C('negro'), t: 0, life: 40 }); yield; }
    wv.dur = 0; B.flash = { col: '#0b0912', a: .5 }; B.shake = 5;
    for (const t of alive(B.party)) { damage(t, baseDmg(u.atk, t.dfn, .8), 'negro'); mark({ kind: 'blob', p: [t.wx, t.wy, t.def.h * .4], w: 10, col: C('negro'), seed: t.idx }); goop(t, C('negro'), 70); }
    u.pose = 'idle'; yield* wait(24); return;
  }
  yield* actAttack(u, target);
}

// =====================================================================
// 6. Menú de batalla, ATB, bucle de actualización, fin
// =====================================================================
function techsFor(u) {
  return Object.entries(DATA.techs).filter(([, t]) => t.users.includes(u.id)).map(([id, t]) => {
    const users = t.users.map(uid => B.party.find(p => p.id === uid));
    const cost = uid => Math.max(1, t.mp - (DATA.accessories[B.party.find(p => p.id === uid).acc].techDiscount || 0));
    const ready = users.every(p => p.alive && (p === u || (p.atb >= 100 && !p.acting))), mpOk = users.every(p => p.mp >= cost(p.id));
    return { id, t, users, ready, mpOk, avail: ready && mpOk, cost: cost(u.id), combo: users.length > 1 };
  });
}
function openCmd(u) { B.menu = { unit: u, level: 'cmd', idx: 0 }; }
function updateBattleMenu() {
  const m = B.menu, u = m.unit;
  if (m.level === 'cmd') {
    if (hit('down')) { m.idx = (m.idx + 1) % 3; Audio.sfx('cursor', semiOf(u)); } if (hit('up')) { m.idx = (m.idx + 2) % 3; Audio.sfx('cursor', semiOf(u)); }
    if (hit('back') || hit('swap')) { if (B.queue.length > 1) { B.queue.push(B.queue.shift()); B.menu = null; Audio.sfx('page'); } return; }
    if (hit('ok')) {
      Audio.sfx('confirm', semiOf(u));
      if (m.idx === 0) { m.level = 'target'; m.pending = { type: 'attack' }; m.targets = alive(B.enemies); m.tidx = 0; }
      else if (m.idx === 1) { m.level = 'tech'; m.list = techsFor(u); m.tidx = 0; m.idx = 0; }
      else { m.level = 'item'; m.list = Object.entries(Game.inventory).filter(([, n]) => n > 0).map(([k, n]) => ({ id: k, n, it: DATA.items[k] })); m.idx = 0; }
    }
    return;
  }
  if (m.level === 'tech' || m.level === 'item') {
    const L = m.list; if (!L.length) { if (hit('back') || hit('ok')) { m.level = 'cmd'; m.idx = m.level === 'tech' ? 1 : 2; Audio.sfx('back'); } return; }
    if (hit('down')) { m.idx = (m.idx + 1) % L.length; Audio.sfx('cursor', semiOf(u)); } if (hit('up')) { m.idx = (m.idx + L.length - 1) % L.length; Audio.sfx('cursor', semiOf(u)); }
    if (hit('back')) { const was = m.level; m.level = 'cmd'; m.idx = was === 'tech' ? 1 : 2; Audio.sfx('cancel'); return; }
    if (hit('ok')) {
      const e = L[m.idx];
      if (m.level === 'tech') {
        if (!e.avail) { Audio.sfx('nope'); say(!e.ready ? 'El compañero aún no está listo' : 'Falta pigmento (MP)', '#8c8ab0'); return; }
        Audio.sfx('confirm', semiOf(u)); m.pending = { type: 'tech', tech: e };
        if (e.t.target === 'enemy') { m.level = 'target'; m.targets = alive(B.enemies); m.tidx = 0; }
        else commit(alive(B.enemies));
      } else {
        Audio.sfx('confirm', semiOf(u)); m.pending = { type: 'item', item: e.id }; m.level = 'target'; m.targets = e.it.target === 'enemy' ? alive(B.enemies) : B.party.filter(p => p.alive); m.tidx = 0;
      }
    }
    return;
  }
  if (m.level === 'target') {
    const T = m.targets;
    if (hit('down') || hit('right')) { m.tidx = (m.tidx + 1) % T.length; Audio.sfx('cursor', semiOf(u)); } if (hit('up') || hit('left')) { m.tidx = (m.tidx + T.length - 1) % T.length; Audio.sfx('cursor', semiOf(u)); }
    if (hit('back')) { m.level = m.pending.type === 'attack' ? 'cmd' : m.pending.type; if (m.level === 'cmd') m.idx = 0; else m.idx = m.list.findIndex(e => e.id === (m.pending.tech ? m.pending.tech.id : m.pending.item)); Audio.sfx('cancel'); return; }
    if (hit('ok')) { Audio.sfx('confirm', semiOf(u)); commit([T[m.tidx]]); }
  }
}
function commit(targets) {
  const m = B.menu, u = m.unit, p = m.pending; let gen, users = [u];
  if (p.type === 'attack') gen = actAttack(u, targets[0]);
  else if (p.type === 'tech') { users = p.tech.users; users.forEach(x => { x.mp -= Math.max(1, p.tech.t.mp - (DATA.accessories[x.acc].techDiscount || 0)); }); gen = actTech(users, p.tech.t, targets, p.tech.t.color); }
  else gen = actItem(u, p.item, targets[0]);
  users.forEach(x => { x.atb = 0; B.queue = B.queue.filter(q => q !== x); });
  B.menu = null; B.actions.push(tracked(u, gen)); B.busy = true;
}
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
  for (const n of B.nums) { n.t++; n.y += n.vy; n.vy += .12; if (n.vy > 0 && n.t < 20) n.vy = -0.4; } B.nums = B.nums.filter(n => n.t < 44);
  for (const u of B.units) { if (u.poseT > 0 && --u.poseT === 0 && u.alive) u.pose = 'idle'; if (u.dead) u.dead += .04; if (u.goop) { const G = u.goop; G.t++; for (const d of G.drips) d.len = Math.min(d.max, d.len + d.speed); if (G.t > G.life || !u.alive) u.goop = null; } }
  if (B.hitstop > 0) { B.hitstop--; return; }
  for (const f of B.fx) f.t++; B.fx = B.fx.filter(f => f.t <= f.dur);
  for (const m of B.marks) m.t++; B.marks = B.marks.filter(m => m.t <= m.life);
  if (B.phase === 'trans') { if (B.gen && B.gen.next().done) B.gen = null; return; }
  if (B.phase === 'victory' || B.phase === 'defeat') { updateEnd(); return; }
  // acciones concurrentes: todas avanzan un frame
  if (B.actions.length) { B.actions = B.actions.filter(a => !a.next().done); B.busy = B.actions.length > 0; }
  if (!alive(B.enemies).length || !alive(B.party).length) { if (!B.actions.length) checkEnd(); return; }
  if (B.menu) updateBattleMenu();
  if (B.menu && !ATB_ACTIVE) return; // modo Wait: el ATB se detiene con el menú abierto
  // tick ATB (modo Active: sigue corriendo mientras eliges)
  for (const u of alive(B.units)) { if (u.acting) continue; u.atb = Math.min(100, u.atb + u.spd * statusMult(u, 'lento') * ATB_RATE); if (u.atb >= 100 && u.kind === 'party' && !B.queue.includes(u)) { const other = B.party.some(p => p !== u && p.alive && p.atb >= 100 && !p.acting); B.queue.push(u); Audio.sfx(other ? 'combo_ready' : 'ready', semiOf(u)); }
    if (u.kind === 'enemy' && u.atb >= 82 && !u.warned) { u.warned = true; Audio.sfx('enemy_soon'); } }
  const e = alive(B.enemies).find(u => u.atb >= 100 && !u.acting);
  if (e && B.actions.length < 3) { e.atb = 0; B.actions.push(tracked(e, actEnemy(e))); B.busy = true; }
  if (B.queue.length && !B.menu) openCmd(B.queue[0]);
}
// marca la unidad como "actuando" mientras dura su corrutina (no acumula ATB ni se le encola otra acción)
function* tracked(u, gen) { u.acting = true; u.warned = false; try { yield* gen; } finally { u.acting = false; } }
function projectUnits() { for (const u of B.units) { const p = project(u.wx, u.wy, u.wz); if (p) { u.x = p[0]; u.y = p[1]; u.sc = p[2]; u.z = p[3]; } } }
const updateTransition = () => updateBattle(), drawTransition = () => drawBattle();
function checkEnd() {
  B.menu = null; B.queue = [];
  if (!alive(B.enemies).length) { B.phase = 'victory'; B.t = 0; Audio.stop(); if (typeof MUSIC !== 'undefined' && MUSIC.victory) Audio.play('victory'); else Audio.sfx('victory'); B.party.forEach(u => { if (u.alive) u.pose = 'happy'; }); }
  else if (!alive(B.party).length) { B.phase = 'defeat'; B.t = 0; Audio.stop(); if (typeof MUSIC !== 'undefined' && MUSIC.gameover) Audio.play('gameover'); }
}
function updateEnd() {
  if (B.phase === 'victory') {
    if (B.t === 60) { const exp = B.enemies.reduce((s, u) => s + u.data.exp, 0); Game.pigmento += exp; B.result = exp; Audio.sfx('tinkle'); }
    if (B.t > 70 && hit('ok')) {
      B.party.forEach(u => { u.data.cur.hp = u.hp; u.data.cur.mp = u.mp; }); Game.defeated.add(B.foe.key);
      if (B.foe.boss) { Game.bossDown = true; Game.palette = 'vivo'; Audio.sfx('saturate'); Party.forEach(p => { const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; }); OW.msg = { lines: DATA.texts.ending, t: 0 }; }
      setState('overworld'); Audio.play('map');
    }
  } else if (B.t > 80 && hit('ok')) { resetGame(); }
}
function resetGame() {
  Game.pigmento = 0; Game.palette = 'gris'; Game.inventory = { ...DATA.inventory }; Game.defeated = new Set(); Game.bossDown = false; Game.ended = false;
  Party.forEach((p, i) => { p.acc = DATA.party[i].acc; const s = effStats(p); p.cur.hp = s.hp; p.cur.mp = s.mp; });
  initOverworld(); setState('overworld'); Audio.play('map');
}
// =====================================================================
// 7. Render: cielo, suelo Mode 7, capa de suelo (charcos, marcas), entidades por profundidad, partículas, GUI
// =====================================================================
function drawSprite(s, x, y, sc = 1, flip = false) { const w = s.width * sc, h = s.height * sc; g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = false; g.drawImage(s, -Math.round(w / 2), -Math.round(h) + 1, Math.round(w), Math.round(h)); g.restore(); }
function unitSprite(u, frame) { return dropSprite(u.def, u.pose, frame, { dark: u.kind === 'enemy' && !u.def.core }); }
function drawUnit(u) {
  const s = u.sc * B.unitScale, frame = (B.t / 9 + u.idx * 2 | 0) % 4, ready = u.kind === 'party' && u.atb >= 100 && u.alive && !u.acting && B.phase === 'fight';
  if (u.dead && u.dead > 1.6) return;
  if (u.dead) g.globalAlpha = clamp(1.6 - u.dead, 0, 1);
  if (u.erasing && (B.t >> 1) & 1) g.globalAlpha = .35;
  const gp = project(u.wx, u.wy, 0); if (!u.dead && gp && u.wz > -u.def.h * .9) shadow(gp[0], gp[1], Math.max(3, Math.round(u.shadowW * gp[2] * B.unitScale * (1 - clamp(u.wz / 120, 0, .6)))));
  // emergiendo del charco: se recorta por debajo del suelo
  let clip = false; if (u.wz < 0 && gp) { g.save(); g.beginPath(); g.rect(0, 0, W, gp[1] + 1); g.clip(); clip = true; }
  const G = u.goop, ga = G ? (G.t > G.life - 20 ? (G.life - G.t) / 20 : 1) : 0;
  let spr = unitSprite(u, frame); if (G) spr = tintSprite(spr, G.col, .55 * ga);
  drawSprite(spr, u.x, u.y - (ready ? Math.abs(Math.sin(B.t * .25)) * 2 | 0 : 0), s, u.kind === 'party');
  if (G) drawGoop(u);
  if (clip) g.restore();
  g.globalAlpha = 1;
  if (u.kind === 'enemy' && u.alive && u.boss) bar(u.x - 20, u.y + 4, 40, 4, u.hp / u.maxhp, '#8b48c8');
  if (u.status.tiznado && u.alive) { g.fillStyle = '#2a2438'; g.fillRect(u.x - 3, u.y - u.def.h * s - 6, 6, 2); }
  if (u.status.lento && u.alive) txt('z', u.x + 6, u.y - u.def.h * s - 10, C('violeta'), null);
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
  if (T && T.overworld) { drawOverworld(); drawTransitionFx(); return; }
  const pal = Game.palette, gris = pal === 'gris';
  const sx = B.shake ? RI(-B.shake, B.shake) : 0, sy = B.shake ? RI(-B.shake, B.shake) / 2 | 0 : 0;
  g.save(); g.translate(sx, sy);
  drawSky(pal); drawFloor(pal, gris ? '#767c96' : '#9ed0f6', gris ? '#767c96' : '#9ed0f6');
  drawGroundLayer();
  // entidades por profundidad (lejos primero): unidades y props del mapa
  const ents = [];
  for (const u of B.units) { if (u.z) ents.push({ z: u.z, d: () => drawUnit(u) }); }
  for (const o of B.props) { const p = project(o.wx, o.wy, 0); if (!p || p[1] < -60 || p[0] < -60 || p[0] > W + 60) continue; ents.push({ z: p[3], d: () => { const s = p[2] * B.unitScale; if (o.kind === 'T') { shadow(p[0], p[1], Math.round(22 * s)); drawSprite(bigTree(pal, o.vr), p[0], p[1] + 2, s); } else { shadow(p[0], p[1] + 1, Math.round(24 * s)); drawSprite(bigRock(pal, o.vr & 3), p[0], p[1] + 2, s); } } }); }
  ents.sort((a, b) => b.z - a.z).forEach(e => e.d());
  drawMarks(false); for (const f of B.fx) if (!f.under) f.draw();
  for (const p of B.particles) { if (p.t < 0) continue; const c = project(p.wx, p.wy, p.wz); if (!c) continue; g.fillStyle = p.pal ? p.pal[Math.min(p.pal.length - 1, Math.floor(p.t / p.life * p.pal.length))] : p.col; const s = Math.max(1, Math.round((p.stream ? 2 : (p.t > p.life * .7 ? 1 : (p.size || 2))) * c[2])); g.fillRect(Math.round(c[0]), Math.round(c[1]), s, s); }
  // cursor de objetivo
  if (B.menu && B.menu.level === 'target') {
    const TT = B.menu.targets, ucol = C(B.menu.unit.color); TT.forEach((t, i) => { if (i !== B.menu.tidx) return; const bob = Math.abs(Math.sin(B.t * .2)) * 3 | 0; g.drawImage(iconSprite('drop', ucol), Math.round(t.x - 6), Math.round(t.y - t.def.h * t.sc - 16 - bob));
      const label = t.name + (t.kind === 'enemy' ? '  ' + t.hp + '/' + t.maxhp : '  HP ' + t.hp); g.font = FONT; const w = g.measureText(label).width + 20, x0 = clamp(t.x - w / 2, 2, W - w - 2); win(x0, 4, w, 14); swatch(x0 + 4, 7, t.color === 'negro' ? '#2a2438' : C(t.color)); ui(label, x0 + 14, 7, TXT); });
  }
  g.restore();
  if (T) drawTransitionFx();
  if (B.flash) { g.fillStyle = B.flash.col; g.globalAlpha = B.flash.a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  if (B.rainbow > 0) { const cols = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta']; cols.forEach((c, i) => { g.fillStyle = C(c); g.globalAlpha = .5 * B.rainbow / 40; const off = (40 - B.rainbow) * 12 + i * 10; g.fillRect(off - 200, 0, 8, H); g.fillRect(W - off + 200 - 8, 0, 8, H); }); g.globalAlpha = 1; }
  for (const n of B.nums) { g.font = FONT; if (n.big) { txt(n.v, Math.round(n.x) + 1, Math.round(n.y) + 1, n.col, null); } txt(n.v, Math.round(n.x), Math.round(n.y), n.col); }
  if (B.msg && !(B.menu && B.menu.level === 'target') && B.phase === 'fight') banner(B.msg.s, B.msg.col === '#f4f0ea' ? INK : B.msg.col);
  if (B.phase !== 'trans') drawBattleUI();
  if (B.phase === 'victory' && B.t > 60) { win(80, 56, 160, 46); banner('¡VICTORIA!', C('amarillo'), 58); g.font = FONT; const rs = 'Pigmento +' + B.result; ui(rs, W / 2 - g.measureText(rs).width / 2 | 0, 80, TXT); if ((B.t / 20 | 0) % 2) ui('▼', W / 2 - 4, 90, TXT2); }
  if (B.phase === 'defeat') { g.fillStyle = 'rgba(11,9,18,' + clamp(B.t / 60, 0, .8) + ')'; g.fillRect(0, 0, W, H); if (B.t > 40) DATA.texts.gameover.forEach((l, i) => txtC(l, W / 2, 70 + i * 12, i === 0 ? '#8c8ab0' : '#f4f0ea')); }
}
// ---- GUI temática: cuaderno de pintor (papel, tinta, paleta, herramientas)
const INK = '#2a2438', TXT = '#f4f0ea', TXT2 = '#b9b4d2', TXT3 = '#7d7899', GOLD = '#f2c93a';
function ui(s, x, y, col = TXT) { txt(s, x, y, col, '#0b0912'); }
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
// brocha en miniatura que se carga de pintura = barra ATB
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
// letrero superior como pincelada del color de la acción
function banner(s, col, y = 4) {
  g.font = FONT; const w = g.measureText(s).width + 20, x0 = (W - w) / 2 | 0; pstroke(x0, y + 6, x0 + w, y + 6, 13, ramp(col).sh, 1, 0, true); pstroke(x0 + 3, y + 5, x0 + w - 3, y + 5, 11, col, 1, 0, true);
  const light = rgbHsl(...hexRgb(col))[2] > .6; txt(s, x0 + 10, y + 2, light ? INK : '#f4f0ea', light ? null : '#14121c');
}
function drawBattleUI() {
  const y0 = 128, m = B.menu, act = m ? m.unit : null, tint = act ? C(act.color) : null;
  win(102, y0, W - 102, H - y0); win(0, y0, 100, H - y0, { tint });
  // ---- estado del grupo (CT): brocha que se carga = tiempo · nombre en su color · HP · MP
  B.party.forEach((u, i) => {
    const y = y0 + 6 + i * 15, active = act === u, col = C(u.color);
    if (active) { hilite(108, y + 5, 314, 12, col, .3); }
    atbBrush(108, y + 1, u.alive ? u.atb / 100 : 0, col, B.t);
    ui(u.name, 132, y - 1, !u.alive ? TXT3 : active ? TXT : col);
    ui('HP', 190, y - 1, TXT2); ui(String(u.hp).padStart(3), 208, y - 1, u.hp <= 0 ? TXT3 : u.hp < u.maxhp * .25 ? C('rojo') : TXT); paintBar(190, y + 8, 42, 4, u.hp / u.maxhp, col);
    ui('MP', 242, y - 1, TXT2); ui(String(u.mp).padStart(2), 260, y - 1, TXT); paintBar(242, y + 8, 42, 4, u.mp / u.maxmp, desat(col, .4, .1));
    if (u.status.tiznado) smudgeIcon(292, y + 1); if (u.status.lento) ui('z', 302, y - 1, C('violeta'));
  });
  if (!m) { ui('...', 8, y0 + 6, TXT3); return; }
  const u = m.unit, ucol = C(u.color), listing = m.level === 'tech' || m.level === 'item' || (m.level === 'target' && m.pending.type !== 'attack');
  // ---- ventana de comandos (siempre visible; el comando en curso queda marcado)
  const cmdSel = m.level === 'cmd' ? m.idx : (m.level === 'target' && m.pending.type === 'attack') ? 0 : (m.level === 'tech' || m.pending && m.pending.type === 'tech') ? 1 : 2;
  [[u.data.weapon, 'Atacar'], ['tech', 'Tech'], ['item', 'Objeto']].forEach(([ic, label], i) => {
    const y = y0 + 6 + i * 15, sel = cmdSel === i;
    if (sel) { hilite(6, y + 5, 96, 12, ucol, listing ? .18 : .3); if (!listing) dropCursor(2, y + 1, ucol); }
    g.drawImage(iconSprite(ic, ucol), 14, y - 1); ui(label, 30, y + 1, sel ? TXT : TXT2);
  });
  if (!listing) return;
  // ---- lista de techs / objetos: ventana que se abre sobre el campo, a la izquierda (CT)
  const isTech = m.level === 'tech' || (m.pending && m.pending.type === 'tech'), L = m.list;
  const sel = m.level === 'target' ? L.findIndex(e => e.id === (m.pending.tech ? m.pending.tech.id : m.pending.item)) : m.idx;
  const rows = Math.max(1, Math.min(4, L.length)), top = clamp(sel - 3, 0, Math.max(0, L.length - 4));
  const ww = 156, wh = rows * 12 + 10, wy = y0 - wh - 2;
  win(0, wy, ww, wh, { tint });
  if (!L.length) ui('Nada', 14, wy + 5, TXT3);
  L.slice(top, top + 4).forEach((e, k) => {
    const i = top + k, y = wy + 5 + k * 12;
    if (i === sel) { hilite(6, y + 3, ww - 6, 11, ucol, .3); dropCursor(2, y - 1, ucol); }
    if (isTech) {
      swatch(12, y, C(e.t.color), !e.avail); ui(e.t.name, 23, y, e.avail ? TXT : TXT3);
      e.users.filter(x => x !== u).forEach((x, q) => { g.globalAlpha = e.avail ? 1 : .4; g.drawImage(iconSprite('drop', C(x.color)), 118 + q * 9, y - 3); g.globalAlpha = 1; });
      const cs = String(e.cost); ui(cs, ww - 8 - cs.length * 8, y, e.avail ? TXT2 : TXT3);
    } else {
      g.drawImage(iconSprite('item', e.it.kind === 'mp' ? C('azul') : e.it.kind === 'heal' ? C('verde') : '#e86a8a'), 12, y - 2); ui(e.it.short || e.it.name, 28, y, TXT);
      const ns = 'x' + e.n; ui(ns, ww - 8 - ns.length * 8, y, TXT2);
    }
  });
  if (L.length > 4) { ui(top > 0 ? '▲' : ' ', ww - 14, wy + 1, TXT2); ui(top + 4 < L.length ? '▼' : ' ', ww - 14, wy + wh - 9, TXT2); }
  // ---- arriba: la ecuación de color de la tech (Rojo + Amarillo = Naranja) y su descripción
  if (isTech && L[sel]) {
    const e = L[sel]; win(0, 4, W, 24);
    let x = 8; e.users.forEach((us, j) => { swatch(x, 8, C(us.color)); x += 8; if (j < e.users.length - 1) { ui('+', x, 8, TXT2); x += 9; } });
    if (e.combo) { ui('=', x + 1, 8, TXT2); x += 10; swatch(x, 8, C(e.t.color)); x += 10; }
    ui(e.t.name + ' · ' + e.cost + ' MP', x + 2, 8, e.avail ? ramp(C(e.t.color)).hi : TXT3);
    if (e.combo) ui('con ' + e.users.filter(q => q !== u).map(q => q.name).join(' y '), W - 8 - (4 + e.users.filter(q => q !== u).map(q => q.name).join(' y ').length) * 8, 8, e.avail ? TXT2 : TXT3);
    ui(e.t.desc.slice(0, 38), 8, 18, e.avail ? TXT : TXT3);
    if (!e.avail) ui(!e.ready ? '(compañero no listo)' : '(sin MP)', W - 8 - (e.ready ? 8 : 20) * 8, 18, C('rojo'));
  }
  if (!isTech && L[sel]) { win(0, 4, W, 14); ui(L[sel].it.desc, 8, 7, TXT); }
}
function hilite(x0, y, x1, w, col, a = .3) { // banda de pincelada translúcida (pstroke acumula alpha al solapar cuadrados)
  g.globalAlpha = a; g.fillStyle = col; const len = x1 - x0;
  for (let i = 0; i <= len; i++) { const t = i / len, ww = Math.max(1, Math.round(w * (0.55 + 0.45 * Math.sin(Math.PI * t)))); g.fillRect(x0 + i, Math.round(y - ww / 2), 1, ww); }
  g.globalAlpha = 1;
}
function smudgeIcon(x, y) { g.fillStyle = '#0b0912'; g.fillRect(x, y, 6, 3); g.fillRect(x + 1, y - 1, 4, 1); g.fillRect(x + 1, y + 3, 3, 1); g.fillStyle = '#7d7899'; g.fillRect(x + 1, y, 1, 1); }

