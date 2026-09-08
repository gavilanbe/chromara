// CHROMARA — attacks.js: coreografías de todos los ataques. Cada acción se ve como lo que es: la herramienta es un prop
// que entra en escena y actúa sobre el objetivo; la cámara Golden Sun se gira hacia la acción y vuelve.
'use strict';
const GRAPHITE = '#4a4460', GRAPHITE2 = '#2a2438';
// --- utilidades de coreografía
function above(u, k = .5, dx = 0, dy = 0) { return [u.wx + dx, u.wy + dy, u.def.h * k]; } // punto de mundo sobre una unidad
function towards(a, b, k) { return [lerp(a.wx, b.wx, k), lerp(a.wy, b.wy, k)]; }
function side(u, d) { const { rx, ry } = B.axis; return [u.wx + rx * d, u.wy + ry * d]; } // desplazamiento lateral al eje del combate
function fwdOf(u, d) { const { dx, dy } = B.axis; return [u.wx + dx * d, u.wy + dy * d]; } // hacia los enemigos (d>0) o hacia el grupo (d<0)
function overlay(dur, col, aIn = .6, fadeIn = 8, fadeOut = 10) { const f = fx(dur, () => { const k = f.t < fadeIn ? f.t / fadeIn : f.t > dur - fadeOut ? (dur - f.t) / fadeOut : 1; g.fillStyle = col; g.globalAlpha = aIn * clamp(k, 0, 1) * Prefs.flash; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }); return f; }
function ghostsOf(u) {
  const gh = [], f = fx(999, () => {
    g.save();
    for (const q of gh) { const c = project(q.wx, q.wy, q.wz); if (!c) continue;
      g.globalAlpha = .28 * Math.max(0, 1 - (f.t - q.at) / 10);
      drawSprite(q.spr, c[0], c[1], c[2] * q.scale * q.sx, q.flip, q.sy);
    }
    g.restore();
  });
  f.tick = () => { while (gh.length && f.t - gh[0].at >= 10) gh.shift(); };
  let ended = false;
  return { add: () => {
    if (ended || !Prefs.shake) return;
    const info = unitSpriteInfo(u, (B.t / 9 | 0) % 4);
    gh.push({wx:u.wx,wy:u.wy,wz:u.wz,at:f.t,...info,flip:u.kind === 'enemy' && u.facingLeft,scale:B.unitScale * (u.kind === 'enemy' ? u.boss ? 1.35 : 1.6 : 1)});
    if (gh.length > 6) gh.shift();
  }, end: () => { ended = true; f.dur = f.t + 10; }, fx:f, samples:gh };
}
function shadowFx(wx, wy, r, dur) { const f = fx(dur, () => { const c = project(wx, wy, 0); if (c) shadow(c[0], c[1], Math.round(r * c[2])); }, true); return f; }
function flakes(t, col, n = 8) { for (let i = 0; i < n; i++) B.particles.push({ wx: t.wx + R(-t.def.w * .4, t.def.w * .4), wy: t.wy + R(-3, 3), wz: R(2, t.def.h), vx: R(-.2, .2), vy: 0, vz: 0, g: .05, col, t: 0, life: 26, size: 2 }); }
function drips(wx, wy, wz, col, n = 6) { for (let i = 0; i < n; i++) B.particles.push({ wx: wx + R(-6, 6), wy: wy + R(-3, 3), wz, vx: 0, vy: 0, vz: -R(.2, .6), g: .06, col, t: RI(-8, 0), life: 22, size: 2 }); }
function* returnHome(u, n = 12) {
  u.pose = 'hop'; yield* whop(u, u.hx, u.hy, n, 10); u.wz = 0; u.pose = 'idle';
  for (let i = 0; i < 6; i++) { const k = Math.sin((i + 1) / 6 * Math.PI) * (Prefs.shake ? .1 : 0); u.gesture = {sx:1 + k,sy:1 - k}; yield; }
  u.gesture = null;
}
// Compresión, una pausa en la carga y despegue: se lee el gesto antes del golpe.
function* anticipate(u, n = 12) {
  u.pose = 'charge'; Audio.sfx(u.kind === 'enemy' ? 'enemy_soon' : 'charge', {semi:SEMI[u.id] ?? -5,vol:.5});
  for (let i = 0; i < n; i++) {
    const k = (i + 1) / n, squeeze = Math.sin(Math.min(1, k / .8) * Math.PI * .5) * (Prefs.shake ? .12 : 0);
    u.gesture = {sx:1 + squeeze,sy:1 - squeeze}; u.wz = k > .8 ? (k - .8) * 15 : 0;
    if (i % 3 === 0) { const a = i * 2.4; B.particles.push({wx:u.wx + Math.cos(a) * 14,wy:u.wy + Math.sin(a) * 7,wz:u.def.h * .65,tx:u.wx,ty:u.wy,tz:u.def.h * .5,col:C(u.color),t:0,life:8,dur:8,arc:0,stream:true}); }
    yield;
  }
  u.wz = 0; u.gesture = null;
}

// El pigmento tiene masa, el grafito aristas y la plumilla un corte limpio.
function attackMaterial(opt = {}) {
  if (opt.material) return opt.material;
  const a = B.currentAction, id = a?.command?.techId;
  const mix = { llamarada:'fire', brote:'leaf', eclipse:'eclipse', arcoiris:'prism' };
  if (mix[id]) return mix[id];
  if (a?.command?.type === 'item') return 'lapiz';
  return a?.users[0]?.kind === 'enemy' ? 'ink' : a?.users[0]?.data.weapon || 'pincel';
}
function materialImpact(t, col, weight = 1, opt = {}) {
  const material = attackMaterial(opt), accent = opt.accent || 'hit';
  const power = clamp(weight * (accent === 'tap' ? .65 : accent === 'finish' ? 1.35 : 1), .35, 1.8);
  const source = B.currentAction?.users[0], dx = t.wx - (source?.hx ?? t.wx - 1), dy = t.wy - (source?.hy ?? t.wy), len = Math.hypot(dx, dy) || 1;
  const point = opt.point ? [...opt.point] : above(t, .52), rp = ramp(col);
  t.recoil = { t:0, dur:18, dx:dx / len, dy:dy / len, power, col:rp.hi, material };
  // Un puñado de fragmentos deterministas: dibujar nunca consume el azar del combate.
  const rnd = seeded(91 + t.idx * 37 + (B.stats.actions || 0) * 13);
  const bits = Array.from({length:accent === 'tap' ? 5 : 9}, (_, i) => ({a:rnd() * 6.28, v:8 + rnd() * 16, size:1 + rnd() * 2, i}));
  const f = fx(26, () => {
    const c = PJ(point), q = f.t / f.dur, e = 1 - (1 - q) ** 3, s = Math.min(1.9, c[2]) * (.7 + power * .35), r = (4 + 14 * e) * s;
    g.save(); g.translate(Math.round(c[0]), Math.round(c[1]));
    g.globalAlpha = (1 - q) ** 1.4; g.lineWidth = 1;
    if (material === 'brocha') {
      for (let i = 0; i < 4; i++) {
        const d = (i - 1.5) * 3 * s;
        pstroke(-r * .6 + d, -r * .7, r * .7 + d, r * .55, Math.max(1, (3 - q * 2) * s), i & 1 ? rp.hi : col);
      }
    } else if (material === 'lapiz' || material === 'pluma') {
      const a = material === 'lapiz' ? -.65 : -.3;
      g.rotate(a); pstroke(-r, 0, r, 0, (material === 'pluma' ? 2 : 1) * s, col);
      pstroke(-r * .4, -r * .7, r * .4, r * .7, s, material === 'lapiz' ? '#e8cf9a' : rp.hi);
      if (material === 'pluma') { g.strokeStyle = rp.hi; g.beginPath(); g.moveTo(0, -r * .35); g.lineTo(r * .25, 0); g.lineTo(0, r * .35); g.lineTo(-r * .25, 0); g.closePath(); g.stroke(); }
    } else if (material === 'pincel' || material === 'ink') {
      g.strokeStyle = material === 'ink' ? '#8c8ab0' : rp.hi;
      for (let i = 0; i < 2; i++) { const rr = r * (1 - i * .28); g.beginPath(); g.ellipse(0, i * 3, rr, rr * .5, -.35, .25 + i * 2, 2.9 + i * 2); g.stroke(); }
    } else if (material === 'eclipse') {
      g.strokeStyle = rp.hi; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, r * .8, r, -.25, -.8, 3.7); g.stroke();
    } else if (material === 'prism') {
      const cols = ['rojo','amarillo','azul'];
      for (let i = 0; i < 3; i++) { g.strokeStyle = C(cols[i]); g.beginPath(); g.moveTo(-r + i * 3, r * .5); g.lineTo(i * 3, -r); g.lineTo(r + i * 3, r * .5); g.stroke(); }
    }
    for (const b of bits) {
      const travel = b.v * e * s, x = Math.cos(b.a) * travel, y = Math.sin(b.a) * travel * .65 + q * q * 10;
      g.fillStyle = material === 'lapiz' ? (b.i & 1 ? '#e8cf9a' : GRAPHITE) : b.i % 3 ? col : rp.hi;
      const sz = Math.max(1, Math.round(b.size * s * (1 - q * .7)));
      if (material === 'leaf' || material === 'fire') {
        g.beginPath(); g.moveTo(x, y - sz * 3); g.lineTo(x + sz, y); g.lineTo(x, y + sz); g.lineTo(x - sz, y); g.fill();
      } else if (material === 'lapiz' || material === 'pluma' || material === 'prism') {
        pstroke(x, y, x + Math.cos(b.a) * sz * 3, y + Math.sin(b.a) * sz * 3, 1, g.fillStyle);
      } else { g.fillRect(Math.round(x), Math.round(y), sz, sz + (material === 'pincel' ? 1 : 0)); }
    }
    g.restore();
  });
  Object.assign(f, {material, accent, target:t, power});
  if (['brocha','pincel','ink','fire','eclipse'].includes(material)) {
    const ground = fx(22, () => { const c = PJ([point[0], point[1], 0]), q = ground.t / 22, r = (4 + (1 - (1 - q) ** 2) * 22 * power) * c[2];
      g.save(); g.globalAlpha = (1 - q) * .5; g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.ellipse(c[0], c[1], r, r * .32, 0, .2, 5.6); g.stroke(); g.restore();
    }, true);
  }
  return f;
}
function recoilPose(u) {
  const r = u.recoil, still = {x:0,y:0,sx:1,sy:1}; if (!r || !Prefs.shake) return still;
  const q = clamp(r.t / r.dur, 0, 1), spring = Math.cos(q * Math.PI * 2.5) * (1 - q) ** 2;
  const k = spring * r.power * Math.min(1, Prefs.shake * 1.5), a = PJ([u.wx, u.wy, 0]), b = PJ([u.wx + r.dx * 5, u.wy + r.dy * 5, 0]);
  return {x:clamp((b[0] - a[0]) * k, -6, 6), y:clamp((b[1] - a[1]) * k, -3, 3), sx:1 + k * .12, sy:1 - k * .2};
}
function drawToolMark(m, k) {
  const pts = m.pts.map(PJ), total = pts.length - 1, end = Math.min(total, Math.ceil(k * total)), rp = ramp(m.col), alpha = g.globalAlpha;
  for (let i = 0; i < end; i++) {
    const a = pts[i], z = pts[i + 1], part = clamp(k * total - i, 0, 1), b = [lerp(a[0], z[0], part), lerp(a[1], z[1], part)];
    const dx = z[0] - a[0], dy = z[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const pressure = m.material === 'pluma' ? .4 + .75 * Math.abs(dy) / len : m.material === 'pincel' ? .5 + .5 * Math.sin((i + .5) / total * Math.PI) : 1;
    const w = Math.max(1, m.w * a[2] * pressure);
    pstroke(a[0], a[1], b[0], b[1], w, m.col, 1, m.jit || 0, false);
    if (m.material === 'brocha' || m.material === 'pincel') {
      g.globalAlpha = alpha * .65;
      for (let j = -1; j <= 1; j += 2) { const off = w * .25 * j;
        pstroke(a[0] - dy / len * off, a[1] + dx / len * off, b[0] - dy / len * off, b[1] + dx / len * off, 1, j < 0 ? rp.hi : rp.sh, 1, 0, false);
      }
      g.globalAlpha = alpha;
    }
  }
}

// =====================================================================
// Ataques básicos: cada herramienta hace lo suyo
// =====================================================================
function* atkBrocha(u, t) {
  const col = C(u.color); camFocus(u.wx, u.wy, {dist:70,turn:.3,h:40,ease:.1});
  yield* anticipate(u, 14); camFocus(t.wx, t.wy, {dist:78,turn:-.3,h:44}); u.pose = 'attack';
  yield* whop(u, ...infront(u, t, t.def.w * .7 + 18), 10, 12); yield* wait(4);
  const pts = [[t.wx - 12,t.wy - 5,t.def.h + 3],[t.wx,t.wy,t.def.h * .5],[t.wx + 14,t.wy + 6,2]];
  Audio.sfx('brush_sweep', {pan:.3});
  yield* toolStroke({kind:'brocha',color:col,col,pts,w:7,frames:14,fac:-1,life:62,scale:1.05,from:above(u,.8),hitAt:.5,
    contact:wp => { hitBasic(u,t,{point:wp}); goop(t,col,90); drips(t.wx,t.wy,t.def.h * .6,col,4); Audio.sfx('brush_big',{vol:.5}); }
  });
  afterFx(20, () => {flakes(t,col,7);Audio.sfx('crumbs',{vol:.35});});
  yield* wait(16); yield* returnHome(u); yield* wait(8); camReset();
}
function* atkLapiz(u, t) { // el lápiz garabatea alrededor del enemigo a toda velocidad y lo tacha con dos rayas; saltan virutas
  const col = C(u.color); camFocus(u.wx, u.wy, { dist: 70, turn: .3, h: 40, ease: .1 }); yield* anticipate(u, 10); camFocus(t.wx, t.wy, { dist: 74, turn: -.2, h: 40 }); u.pose = 'attack'; const gh = ghostsOf(u); Audio.sfx('dash');
  const [ax, ay] = infront(u, t, t.def.w * .7 + 16); for (let i = 1; i <= 8; i++) { const k = i / 8; u.wx = lerp(u.hx, ax, k * (2 - k)); u.wy = lerp(u.hy, ay, k * (2 - k)); if (i % 2) gh.add(); yield; }
  // garabato: espiral alrededor del cuerpo
  const pts = []; for (let i = 0; i < 12; i++) { const a = i * 1.9, r = t.def.w * (.5 + (i % 3) * .12); pts.push([t.wx + Math.cos(a) * r, t.wy + Math.sin(a) * r * .5, t.def.h * (.15 + (i / 12) * .8)]); }
  Audio.sfx('scratch'); Audio.sfx('scratch', { when: .12 });
  yield* wait(4); yield* toolStroke({ kind: 'lapiz', color: col, pts, w: 2, col: GRAPHITE, under: GRAPHITE2, frames: 14, fac: -1, life: 65, jit: 1, scale: 1.1, liftFrames:4, onTip: (k, wp) => { if (Math.random() < .5) B.particles.push({ wx: wp[0], wy: wp[1], wz: wp[2], vx: R(-.4, .4), vy: 0, vz: R(.2, .8), g: .08, col: '#e8cf9a', t: 0, life: 14 }); } });
  // tachón: dos rayas amarillas
  const X1 = [[t.wx - 12, t.wy - 4, t.def.h + 4], [t.wx + 12, t.wy + 4, 0]], X2 = [[t.wx + 12, t.wy - 4, t.def.h + 4], [t.wx - 12, t.wy + 4, 0]];
  yield* wait(5); Audio.sfx('scratch_long'); yield* toolStroke({ kind: 'lapiz', color: col, pts: X1, w: 3, col, frames: 8, fac: -1, life: 65, scale: 1.1, liftFrames:3, contact:wp => { hitBasic(u,t,{point:wp}); goop(t,col,60); burst(t.wx,t.wy,t.def.h * .5,'#e8cf9a',6,1.4,18,.1); } });
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
  const pts = []; for (let i = 0; i <= 14; i++) { const k = i / 14, [x, y] = towards(u, t, k * k), a = k * 9; pts.push([x + B.axis.rx * Math.sin(a) * 10 * (1 - k), y + B.axis.ry * Math.sin(a) * 10 * (1 - k), lerp(u.def.h * .8, t.def.h * .52, k) + Math.sin(k * Math.PI) * 12 + Math.sin(a) * 5 * (1 - k)]); }
  Audio.sfx('fwip'); const wp = pts[0]; sparkle(wp[0], wp[1], wp[2]);
  u.pose = 'attack';
  yield* toolStroke({kind:'pincel',color:col,pts,w:4,col,frames:18,fac:-1,life:52,scale:1,hitAt:1,
    contact:p => {hitBasic(u,t,{point:p});goop(t,col,80);Audio.sfx('splash_clean');burst(p[0],p[1],p[2],col,8,1.6,24,.1);}
  });
  yield* wait(22); u.pose = 'idle'; yield* wait(6); camReset();
}
// =====================================================================
// Techs simples
// =====================================================================
function* techBrochazo(u, t, tech, col) { // la brocha cae desde arriba como un mazo y estampa una Z roja en tres golpes; el suelo bajo el enemigo queda pintado
  camFocus(u.wx, u.wy, { dist: 70, turn: .3, h: 40, ease: .1 }); yield* anticipate(u, 14); camFocus(t.wx, t.wy, { dist: 84, turn: -.3, h: 56, pitch: .7 }); u.pose = 'attack'; yield* whop(u, ...infront(u, t, t.def.w * .8 + 24), 10, 14); yield* wait(6);
  const img = propSprite('brocha', C(col)), P = PROP.brocha, st = { wz: 110, a: 0 }, anchor = [t.wx, t.wy], gh = propGhosts(4);
  const pf = fx(999, () => { const c = PJ([anchor[0], anchor[1], st.wz]); gh.push(img, c[0] + 22 * c[2], c[1], -1.2 + st.a, -1, P.tip[0], P.tip[1], 1.7 * c[2]); gh.draw(); drawProp(img, c[0] + 22 * c[2], c[1], -1.2 + st.a, -1, P.tip[0], P.tip[1], 1.7 * c[2]); });
  const strokes = [[[t.wx - 16, t.wy - 12], [t.wx + 16, t.wy - 12]], [[t.wx + 16, t.wy - 12], [t.wx - 16, t.wy + 12]], [[t.wx - 16, t.wy + 12], [t.wx + 16, t.wy + 12]]];
  const sh = shadowFx(t.wx, t.wy, 4, 999);
  for (let s = 0; s < 3; s++) {
    Audio.sfx('brush_big'); for (let i = 1; i <= 9; i++) { st.wz = lerp(110, 4, (i / 9) ** 2.2); sh.draw = () => { const c = project(t.wx, t.wy, 0); if (c) shadow(c[0], c[1], Math.round((8 + i * 4) * c[2])); }; yield; }
    B.shake = 5; B.hitstop = 3; mark({ kind: 'path', pts: strokes[s].map(p => [p[0], p[1], 0]), w: 7, col: C(col), grow: 4, life: 140, jit: 1, material:'brocha' }); burst(t.wx, t.wy, 4, C(col), 10, 2, 20, .12);
    if (s === 2) { B.slowmo = 14; damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name, {accent:'finish'}); goop(t, C(col), 90); lensSplatter(C(col), 6, 2); mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * .8, col: ramp(C(col)).sh, grow: 10, life: 160, under: true }); }
    else { materialImpact(t,C(col),.6,{accent:'tap'}); t.pose='hurt';t.poseT=8; }
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
    for (let i = 1; i <= 7; i++) { const k = i / 7; u.wx = lerp(A[0], Z[0], k); u.wy = lerp(A[1], Z[1], k); u.wz = t.def.h * .3; gh.add(); if (i === 4) { damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name, {accent:pass ? 'finish' : 'tap'}); goop(t, C(col), 50); burst(t.wx, t.wy, t.def.h * .5, '#e8cf9a', 6, 1.2, 16, .1); } yield; }
    yield* wait(pass ? 12 : 7);
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
  const landed = new Set(), drops = []; for (const tt of targets) for (let k = 0; k < 3; k++) drops.push({ t: tt, ox: R(-tt.def.w * .4, tt.def.w * .4), oy: R(-6, 6), delay: k * 7 + RI(0, 4), h: 100, hit: false });
  const def = { color: C(col), shape: 'tall', w: 8, h: 12 }, df = fx(999, () => { for (const d of drops) { if (d.k === undefined || d.k >= 1) continue; const c = project(d.t.wx + d.ox, d.t.wy + d.oy, 0); if (c) { g.globalAlpha = .35 * d.k; shadow(c[0], c[1], Math.round(10 * d.k * c[2])); g.globalAlpha = 1; } const p = project(d.t.wx + d.ox, d.t.wy + d.oy, lerp(d.h, 0, d.k * d.k)); if (p) drawSprite(dropSprite(def, 'hop', 0), p[0], p[1], p[2]); } });
  for (let i = 0; i < 44; i++) { for (const d of drops) { if (i < d.delay) continue; d.k = clamp((i - d.delay) / 16, 0, 1); if (d.k >= 1 && !d.hit) { d.hit = true; Audio.sfx('splash_clean', { pan: -.2 }); burst(d.t.wx + d.ox, d.t.wy + d.oy, 2, C(col), 8, 1.6, 20, .1); mark({ kind: 'pool', p: [d.t.wx + d.ox, d.t.wy + d.oy + 2, 0], w: 8, col: ramp(C(col)).sh, grow: 4, life: 90, under: true }); if (!landed.has(d.t)) { landed.add(d.t); damage(d.t, baseDmg(u.atk * statusMult(u, 'tiznado'), d.t.dfn, tech.power), col, u.name); goop(d.t, C(col), 80); } } } yield; }
  df.dur = 0; yield* wait(26); u.pose = 'idle'; yield* wait(6); camReset();
}

// ---- Techs de herramienta cruzadas: cada personaje hace algo distinto con cada arma
function* techTachon(u, t, tech, col) { // Carmín clava el lápiz delante del enemigo y lo tacha con un trazo pesado que lo deja lento
  camFocus(u.wx, u.wy, { dist: 70, turn: .3, h: 40, ease: .1 }); yield* anticipate(u, 14); camFocus(t.wx, t.wy, { dist: 80, turn: -.3, h: 52, pitch: .68 }); u.pose = 'attack'; yield* whop(u, ...infront(u, t, t.def.w * .8 + 22), 10, 14); yield* wait(6);
  const img = propSprite('lapiz', C(col)), P = PROP.lapiz, st = { wz: 90, x: t.wx - 18, y: t.wy + 6, a: 0 }, sh = shadowFx(st.x, st.y, 3, 999), gh = propGhosts(4);
  const pf = fx(999, () => { const c = PJ([st.x, st.y, st.wz]); gh.push(img, c[0], c[1], -1.35 + st.a, 1, P.tip[0], P.tip[1], 1.5 * c[2]); gh.draw(); drawProp(img, c[0], c[1], -1.35 + st.a, 1, P.tip[0], P.tip[1], 1.5 * c[2]); });
  Audio.sfx('charge', { semi: 0 }); for (let i = 1; i <= 10; i++) { st.wz = lerp(90, 2, (i / 10) ** 2.4); sh.draw = () => { const c = project(st.x, st.y, 0); if (c) shadow(c[0], c[1], Math.round((3 + i) * c[2])); }; yield; }
  sh.dur = 0; B.shake = 6; B.hitstop = 5; Audio.sfx('impact_sub', { vol: .7 }); burst(st.x, st.y, 2, GRAPHITE, 10, 1.6, 20, .1); mark({ kind: 'blob', p: [st.x, st.y, 0], w: 6, col: GRAPHITE2, seed: 4, life: 140, under: true }); yield* wait(8);
  // arrastre pesado a través del enemigo
  Audio.sfx('scratch_long'); const pts = [[st.x, st.y, 2], [t.wx, t.wy, t.def.h * .35], [t.wx + 22, t.wy - 6, 2]]; mark({ kind: 'path', pts, w: 7, col: GRAPHITE, grow: 14, life: 160, jit: 1 }); mark({ kind: 'path', pts: pts.map(q => [q[0] + 1, q[1] + 1, q[2]]), w: 3, col: GRAPHITE2, grow: 14, life: 160 });
  for (let i = 1; i <= 14; i++) { const q = pointAt(pts, i / 14); st.x = q[0]; st.y = q[1]; st.wz = q[2]; st.a = -.3 * Math.sin(i / 14 * Math.PI); if (i % 3 === 0) { B.shake = 3; burst(q[0], q[1], q[2], GRAPHITE, 4, 1, 14, .1); } if (i === 7) { B.slowmo = 10; damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name); applyStatus(t, 'lento', 3); goop(t, GRAPHITE, 60); } yield; }
  for (let i = 1; i <= 8; i++) { st.wz += 6; pf.draw = () => { const c = PJ([st.x, st.y, st.wz]); drawProp(img, c[0], c[1], -1.35 + i * .1, 1, P.tip[0], P.tip[1], 1.5 * c[2], 1 - i / 9); }; yield; }
  pf.dur = 0; yield* wait(20); yield* returnHome(u); yield* wait(8); camReset();
}
function* techManchurron(u, t, tech, col) { // el pincel se carga de Carmín hasta hincharse y planta un pegote enorme que chorrea
  camFocus(u.wx, u.wy, { dist: 66, turn: .35, h: 38, ease: .1 }); u.pose = 'charge';
  const img = propSprite('pincel', C(col)), P = PROP.pincel, st = { load: 0, x: u.wx, y: u.wy, wz: u.def.h + 14, a: -1.4 };
  const pf = fx(999, () => { const c = PJ([st.x, st.y, st.wz]); drawProp(img, c[0], c[1], st.a, 1, P.tip[0], P.tip[1], 1.2 * c[2]); if (st.load > 0) { g.fillStyle = ramp(C(col)).base; g.beginPath(); g.arc(c[0], c[1], (2 + st.load * 9) * c[2], 0, 6.29); g.fill(); g.fillStyle = ramp(C(col)).hi; g.fillRect(c[0] - 3 * c[2], c[1] - (2 + st.load * 9) * c[2] * .6, 3, 2); } });
  sparkle(u.wx, u.wy, u.def.h + 20); Audio.sfx('squeeze'); for (let i = 0; i < 30; i++) { st.load = i / 30; u.wz = Math.sin(i * .9) * 1.5; const sq = 1 - st.load * .25; u.sqz = sq; if (i % 2 === 0) B.particles.push({ wx: u.wx + R(-8, 8), wy: u.wy + R(-4, 4), wz: R(2, u.def.h * .6), tx: st.x, ty: st.y, tz: st.wz, col: C(col), t: 0, life: 10, dur: 10, arc: 6, stream: true }); if (i === 20) Audio.sfx('plop', { semi: 2 }); yield; }
  u.sqz = 0; u.wz = 0; u.pose = 'attack'; camFocus(t.wx, t.wy, { dist: 78, turn: -.3, h: 44 }); Audio.sfx('whip');
  for (let i = 1; i <= 12; i++) { const k = i / 12, e = k * k; st.x = lerp(u.wx, t.wx, e); st.y = lerp(u.wy, t.wy, e); st.wz = lerp(u.def.h + 14, t.def.h * .5, e) + Math.sin(k * Math.PI) * 30; st.a = -1.4 + k * 2.6; yield; }
  pf.dur = 0; Audio.sfx('splash'); B.shake = 7; B.hitstop = 8; B.slowmo = 12;
  damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name); goop(t, C(col), 160); drips(t.wx, t.wy, t.def.h * .8, C(col), 12); lensSplatter(C(col), 8, 5);
  mark({ kind: 'blob', p: [t.wx, t.wy, t.def.h * .5], w: t.def.w * .6, col: C(col), seed: 9, life: 150, grow: 3 }); mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * .9, col: ramp(C(col)).sh, grow: 16, life: 180, under: true });
  yield* wait(30); u.pose = 'idle'; yield* wait(8); camReset();
}
function* techRafaga(u, targets, tech, col) { // Ámbar cruza la fila de enemigos a brochazos cortos, con estelas
  const ec = enemyC(); camFocus(ec[0], ec[1], { dist: 110, turn: -.1, h: 62, pitch: .66 }); yield* anticipate(u, 12); u.pose = 'attack';
  const T = [...targets].sort((a, b) => a.wy - b.wy), first = T[0], last = T[T.length - 1]; const from = side(first, 34), to = side(last, -34); const gh = ghostsOf(u); Audio.sfx('dash');
  const img = propSprite('brocha', C(col)), P = PROP.brocha, st = { k: 0 };
  const pf = fx(999, () => { const c = PJ([u.wx, u.wy, u.def.h * .6]); drawProp(img, c[0] + 10 * c[2], c[1] - 6 * c[2], -.6 + Math.sin(st.k * 40) * .5, -1, P.tip[0], P.tip[1], .95 * c[2]); });
  u.wx = from[0]; u.wy = from[1]; const hit = new Set(), route = [from, ...T.map(t => [t.wx, t.wy]), to];
  for (let i = 1; i <= 22; i++) { const k = i / 22; st.k = k; const q = pointAt(route, k); u.wx = q[0]; u.wy = q[1]; u.wz = Math.abs(Math.sin(k * Math.PI * 4)) * 4; gh.add();
    for (const t of T) if (!hit.has(t) && k >= (T.indexOf(t) + 1) / (T.length + 1)) { hit.add(t); Audio.sfx('brush_sweep', { pan: -.2, vol: .7 }); mark({ kind: 'path', pts: [[t.wx - 8, t.wy - 3, t.def.h * .7], [t.wx + 8, t.wy + 3, t.def.h * .2]], w: 5, col: C(col), grow: 3, life: 70, jit: 1 }); damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name); goop(t, C(col), 60); B.hitstop = 3; }
    yield; }
  pf.dur = 0; gh.end(); u.wz = 0; yield* wait(16); yield* returnHome(u, 12); yield* wait(6); camReset();
}
function* techPunteado(u, t, tech, col) { // cuatro toques de pincel a toda velocidad, cada uno deja un punto
  camFocus(t.wx, t.wy, { dist: 74, turn: -.2, h: 40 }); yield* anticipate(u, 10); u.pose = 'attack'; const gh = ghostsOf(u); Audio.sfx('dash');
  const [ax, ay] = infront(u, t, t.def.w * .7 + 14); for (let i = 1; i <= 7; i++) { const k = i / 7; u.wx = lerp(u.hx, ax, k * (2 - k)); u.wy = lerp(u.hy, ay, k * (2 - k)); if (i % 2) gh.add(); yield; } gh.end();
  const img = propSprite('pincel', C(col)), P = PROP.pincel, st = { k: 0, tip: above(t, .5) };
  const pf = fx(999, () => { const c = PJ(st.tip); drawProp(img, c[0] + (1 - st.k) * 18 * c[2], c[1] - (1 - st.k) * 8 * c[2], -.2, -1, P.tip[0], P.tip[1], 1 * c[2]); });
  const spots = [[-5, -3, .7], [5, 2, .45], [-2, 4, .3], [4, -4, .6]];
  for (let h = 0; h < 4; h++) { const sp = spots[h]; st.tip = [t.wx + sp[0], t.wy + sp[1], t.def.h * sp[2]]; const beats=h === 3 ? 9 : 4; if(h===3)yield* wait(4); for(let i=1;i<=beats;i++){st.k=(i/beats)**2;yield;}
    Audio.sfx('fwip', { pan: -.2 }); mark({ kind: 'blob', p: st.tip, w: h===3 ? 6 : 3, col: C(col), seed: h, grow: 2, life: 90 }); damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name, {accent:h===3 ? 'finish' : 'tap',point:st.tip}); if (h === 3) goop(t, C(col), 70); yield; for (let i = 1; i <= 3; i++) { st.k = 1 - i / 3; yield; } }
  pf.dur = 0; yield* wait(18); yield* returnHome(u, 8); yield* wait(6); camReset();
}
function* techAguada(u, targets, tech, col) { // Añil moja la brocha en sí misma y barre el campo con una banda de color diluido que empapa a todos
  const ec = enemyC(); camFocus(lerp(u.wx, ec[0], .4), lerp(u.wy, ec[1], .4), { dist: 120, turn: .1, h: 70, pitch: .68 }); u.pose = 'charge';
  const img = propSprite('brocha', C(col)), P = PROP.brocha, st = { dip: 0 }; sparkle(u.wx, u.wy, u.def.h + 22); Audio.sfx('brush_hiss');
  const pf = fx(999, () => { const c = PJ(above(u, 1)); drawProp(img, c[0] + 8, c[1] - 30 * c[2] + st.dip, -1.3, 1, P.tip[0], P.tip[1], 1.1 * c[2]); });
  for (let i = 0; i < 22; i++) { st.dip = i < 11 ? i * 2.4 : (22 - i) * 2.4; u.wz = i > 6 && i < 16 ? R(-1, 1) : 0; if (i > 7 && i % 2) drips(u.wx, u.wy, u.def.h * .6, C(col), 2); yield; }
  pf.dur = 0; u.wz = 0; u.pose = 'attack'; camFocus(ec[0], ec[1], { dist: 104, turn: -.2, h: 60 }); Audio.sfx('brush_big'); Audio.sfx('splash_clean', { when: .3 });
  const T = [...targets].sort((a, b) => a.wx - b.wx), L = side(ec.length ? { wx: ec[0], wy: ec[1] } : T[0], 70), Rr = side({ wx: ec[0], wy: ec[1] }, -70);
  const band = fx(999, () => { const k = clamp(band.t / 24, 0, 1), a = PJ([lerp(L[0], Rr[0], Math.max(0, k - .35)), lerp(L[1], Rr[1], Math.max(0, k - .35)), 0]), b = PJ([lerp(L[0], Rr[0], k), lerp(L[1], Rr[1], k), 0]); g.globalAlpha = .45; g.fillStyle = C(col); g.beginPath(); g.moveTo(a[0], a[1] - 44 * a[2]); g.lineTo(b[0], b[1] - 44 * b[2]); g.lineTo(b[0], b[1] + 4); g.lineTo(a[0], a[1] + 4); g.closePath(); g.fill(); g.globalAlpha = 1; });
  band.tick = () => { if (band.t % 2 === 0) { const k=clamp(band.t/24,0,1); drips(lerp(L[0],Rr[0],k),lerp(L[1],Rr[1],k),40,C(col),2); } };
  const hit = new Set();
  for (let i = 1; i <= 28; i++) { const k = i / 28, x = lerp(L[0], Rr[0], k), y = lerp(L[1], Rr[1], k); for (const t of T) if (!hit.has(t) && ((Rr[0] - L[0]) * (t.wx - x) + (Rr[1] - L[1]) * (t.wy - y)) <= 0) { hit.add(t); damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, tech.power), col, u.name); applyStatus(t, 'lento', 3); goop(t, C(col), 110); mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * .8, col: ramp(C(col)).sh, grow: 10, life: 160, under: true }); } yield; }
  band.dur = 0; yield* wait(24); u.pose = 'idle'; yield* wait(6); camReset();
}
function* techContorno(u, allies, tech, col) { // Añil perfila a lápiz a cada aliado: una línea de grafito que los protege
  const pc = partyC(); camFocus(pc[0], pc[1], { dist: 80, turn: .4, h: 46 }); yield* anticipate(u, 10); u.pose = 'attack'; Audio.sfx('scratch');
  for (const a of allies) {
    const pts = []; for (let i = 0; i <= 12; i++) { const ang = i / 12 * 6.28 - 1.57; pts.push([a.wx + Math.cos(ang) * a.def.w * .6, a.wy + Math.sin(ang) * 4, a.def.h * .55 + Math.sin(ang) * a.def.h * .6]); }
    yield* toolStroke({ kind: 'lapiz', color: C(col), pts, w: 2, col: GRAPHITE, under: GRAPHITE2, frames: 12, fac: 1, life: 40, jit: 1, scale: 1 });
    applyStatus(a, 'contorno', 3); sparkle(a.wx, a.wy, a.def.h + 6, '#f4f0ea'); Audio.sfx('tinkle', { semi: SEMI[a.id] || 0, vol: .5 }); yield* wait(4);
  }
  yield* wait(16); u.pose = 'idle'; yield* wait(6); camReset();
}

// ---- La Pluma: cada gota escribe distinto
function* techFirma(u, t, tech, col) { // la pluma firma con floritura sobre el enemigo y remata con el punto final: queda firmado (recibe más daño)
  camFocus(u.wx, u.wy, { dist: 70, turn: .3, h: 40, ease: .1 }); yield* anticipate(u, 12); camFocus(t.wx, t.wy, { dist: 78, turn: -.3, h: 46 }); u.pose = 'attack'; yield* whop(u, ...infront(u, t, t.def.w * .7 + 18), 10, 12); yield* wait(4);
  const img = propSprite('pluma', C(col)), P = PROP.pluma, c0 = t.wx, c1 = t.wy, h = t.def.h; // floritura: dos bucles y un rasgo largo
  const pts = []; for (let i = 0; i <= 22; i++) { const k = i / 22, a = k * 12.5; pts.push([c0 - 14 + k * 30 + Math.cos(a) * 6 * (1 - k * .5), c1 + Math.sin(a) * 3, h * .25 + Math.sin(a) * h * .3 + k * h * .35]); }
  pts.push([c0 + 20, c1 - 4, h * .9], [c0 + 26, c1 - 6, h * 1.05]);
  Audio.sfx('scratch_long'); Audio.sfx('scratch', { when: .25 });
  yield* toolStroke({ kind: 'pluma', color: C(col), pts, w: 3, col: C(col), frames: 22, fac: -1, life: 140, jit: 0, scale: 1.1, onTip: (k, wp) => { if (Math.random() < .35) B.particles.push({ wx: wp[0], wy: wp[1], wz: wp[2], vx: R(-.3, .3), vy: 0, vz: R(.2, .8), g: .06, col: C(col), t: 0, life: 12, size: 1 }); } });
  // La plumilla recoge el último rasgo, apunta y estampa el punto final.
  const dot=[c0+2,c1,h*.55]; yield* wait(5);
  yield* toolStroke({kind:'pluma',color:C(col),col:C(col),pts:[[dot[0],dot[1],dot[2]+14],dot],w:1,frames:8,fac:-1,scale:1.1,life:28,hitAt:1,
    contact:()=>{Audio.sfx('impact_sub',{vol:.6});B.slowmo=10;mark({kind:'blob',p:dot,w:6,col:C(col),grow:2,life:140,seed:2});
      damage(t,baseDmg(u.atk*statusMult(u,'tiznado'),t.dfn,tech.power),col,u.name,{accent:'finish',point:dot});applyStatus(t,'firmado',3);goop(t,C(col),90);}});
  yield* wait(22); yield* returnHome(u); yield* wait(6); camReset();
}
function* techTaquigrafia(u, targets, tech, col) { // Ámbar cruza el campo escribiendo símbolos a toda velocidad: tres golpes repartidos, cada uno deja un glifo
  const ec = enemyC(); camFocus(ec[0], ec[1], { dist: 104, turn: -.1, h: 60, pitch: .64 }); yield* anticipate(u, 10); u.pose = 'attack'; const gh = ghostsOf(u); const img = propSprite('pluma', C(col)), P = PROP.pluma;
  for (let h = 0; h < 3; h++) { const T = alive(targets); if (!T.length) break; const t = T[h % T.length]; Audio.sfx('dash', { vol: .7 });
    const [ax, ay] = infront(u, t, t.def.w * .6 + 12); for (let i = 1; i <= 5; i++) { const k = i / 5; u.wx = lerp(u.wx, ax, k); u.wy = lerp(u.wy, ay, k); gh.add(); yield; }
    const gl = []; for (let i = 0; i < 4; i++) gl.push([t.wx + R(-8, 8), t.wy + R(-3, 3), t.def.h * R(.2, .9)]); Audio.sfx('scratch', { vol: .6 });
    yield* toolStroke({kind:'pluma',color:C(col),pts:gl,w:2,col:C(col),frames:h===2 ? 7 : 5,fac:-1,life:70,jit:1,scale:1,liftFrames:3,hitAt:.65,
      contact:p=>{damage(t,baseDmg(u.atk*statusMult(u,'tiznado'),t.dfn,tech.power),col,u.name,{accent:h===2 ? 'finish' : 'tap',point:p});if(h===2)goop(t,C(col),60);}});
    yield* wait(h===1 ? 7 : 3); }
  gh.end(); yield* wait(16); yield* returnHome(u, 8); yield* wait(6); camReset();
}
function* techCaligrafia(u, a, tech, col) { // Añil escribe el nombre del aliado en el aire, letra a letra; al acabar, el aliado se cura y se limpia
  camFocus(a.wx, a.wy, { dist: 84, turn: .35, h: 50, pitch: .55, hy: 92, ease: .1 }); yield* anticipate(u, 10); u.pose = 'attack';
  const name = a.name.toLowerCase(), img = propSprite('pluma', C(col)), P = PROP.pluma, st = { d: 0, HS: null };
  const wf = fx(999, () => { const c = PJ([a.wx, a.wy, a.def.h + 2]); const S = 1.3 * c[2], cw = 11 * c[2]; if (!st.HS || st.cx !== (c[0] | 0) || st.cy !== (c[1] | 0)) { st.HS = handStrokes(name, c[0] - name.length * cw / 2, c[1] - 12 * S, S, cw); st.cx = c[0] | 0; st.cy = c[1] | 0; } drawHand(st.HS, st.d * st.HS.total, C(col), 2);
    if (st.d < 1) { const cur = st.HS.list.find(x => st.d * st.HS.total < x.start + x.len) || st.HS.list[st.HS.list.length - 1]; const k = clamp((st.d * st.HS.total - cur.start) / cur.len, 0, 1), q = pointAt(cur.pts, k); drawProp(img, q[0], q[1], -.9, 1, P.tip[0], P.tip[1], 1 * c[2]); } });
  for (let i = 1; i <= 40; i++) { st.d = i / 40; if (i % 5 === 0) Audio.sfx('scratch', { vol: .3, semi: 4 + (i / 5) % 4 }); yield; }
  Audio.sfx('tinkle', { semi: 7 }); Audio.sfx('heal_bells', { when: .1 }); B.flash = { col: C(col), a: .25 };
  heal(a, Math.round(a.maxhp * tech.heal)); if (tech.cure) { delete a.status.tiznado; delete a.status.lento; cleanWipeFx(a); } sparkle(a.wx, a.wy, a.def.h + 6, '#ffffff'); burst(a.wx, a.wy, a.def.h * .5, C(col), 12, 1.4, 26, .02);
  for (let i = 0; i < 24; i++) { st.d = 1; yield; } wf.dur = 0; u.pose = 'idle'; yield* wait(8); camReset();
}
// =====================================================================
// Combos: carga y fusión común, liberación propia de cada mezcla
// =====================================================================
function* chargeAndFuse(users, wx, wy, wz, col, frames = 26) { // anillos bajo los usuarios, partículas que suben, chorros que convergen en un orbe que se funde en el color mezclado
  const cols = users.map(u => C(u.color)); users.forEach((u, k) => { u.pose = 'charge'; Audio.sfx('charge', { semi: SEMI[u.id] || 0, when: k * .05 }); });
  const rings = fx(999, () => { for (const u of users) { const [x, y, s] = PJ([u.wx, u.wy, 0]); g.strokeStyle = C(u.color); g.globalAlpha = .6; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, (10 + Math.sin(rings.t * .3) * 3) * s, 4 * s, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; } }, true);
  for (let i = 0; i < frames; i++) { users.forEach((u, k) => { u.wz = Math.abs(Math.sin((i + k * 4) * .35)) * 5; if (i % 3 === k % 3) B.particles.push({ wx: u.wx + R(-8, 8), wy: u.wy + R(-4, 4), wz: R(0, u.def.h), vx: 0, vy: 0, vz: R(.6, 1.4), g: -.02, col: cols[k], t: 0, life: 20 }); }); yield; }
  users.forEach(u => stream(u, { wx, wy, def: { h: wz * 2 } }, C(u.color), 12, 16));
  // El orbe es una gota de pintura de verdad: borde de tinta, los pigmentos giran dentro hasta fundirse en el color nuevo, brillo húmedo y un goterón.
  const orb = { wx, wy, wz, r: 4, t: 0 }, of = fx(999, () => {
    const [x, y, s] = PJ([orb.wx, orb.wy, orb.wz]), r = Math.max(1, orb.r * s), mixk = clamp((orb.t - 8) / 12, 0, 1), wob = 1 + (orb.t > 16 ? Math.sin(orb.t * 1.3) * .08 : 0);
    g.fillStyle = '#241e32'; g.beginPath(); g.ellipse(x, y + 1, r + 1, (r + 1) * .9 * wob, 0, 0, 6.29); g.fill();
    g.save(); g.beginPath(); g.ellipse(x, y, r, r * .9 * wob, 0, 0, 6.29); g.clip();
    g.fillStyle = ramp(col).sh; g.fillRect(x - r, y - r, r * 2, r * 2);
    cols.forEach((c, i) => { const a = orb.t * .22 + i * 6.28 / cols.length, d = r * .42 * (1 - mixk); g.fillStyle = c; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, r * .78, r * .66, a, 0, 6.29); g.fill(); });
    g.globalAlpha = mixk; g.fillStyle = ramp(col).base; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
    g.restore();
    g.fillStyle = mixk > .5 ? ramp(col).hi : '#fff8e6'; g.fillRect(Math.round(x - r * .5), Math.round(y - r * .55), Math.max(2, Math.round(r * .5)), Math.max(1, Math.round(r * .18)));
    if (mixk > .6) { g.fillStyle = ramp(col).base; g.fillRect(Math.round(x + r * .2), Math.round(y + r * .8), 2, Math.round((mixk - .6) * 12 * s)); }
    orb.t++;
  });
  for (let i = 0; i < 24; i++) { orb.r = 4 + i * .45; if (i > 16) orb.r += Math.sin(i * 2) * 1.5; yield; } Audio.sfx('mix', { colours: users.map(u => SEMI[u.id] ?? 0) }); B.flash = { col: col, a: .4 }; burst(wx, wy, wz, col, 18, 1.8, 24, 0); B.slowmo = 14; B.hitstop = 6; B.shake = 3;
  users.forEach(u => { u.wz = 0; }); rings.dur = 0;
  return { of, orb };
}
function* fuseAt(users, wx, wy, wz, col) { const r = yield* chargeAndFuse(users, wx, wy, wz, col, 34); return r; }
// Fuego de píxel: tres lenguas que suben por filas con borde rojo, cuerpo naranja, corazón amarillo y núcleo claro.
// El temblor sale de (t, seed): dibujar dos veces el mismo frame da el mismo fuego. (x,y) = base; w/h = tamaño en pantalla.
function drawFire(x, y, w, h, t, seed = 0, alpha = 1) {
  if (w < 1 || h < 2) return;
  const cols = ['#7a2a1a', C('rojo'), C('naranja'), C('amarillo'), '#fff3c0'], tongues = [[0, 1, seed * 1.7], [-.34, .58, seed * 1.7 + 2.1], [.32, .64, seed * 1.7 + 4.2]];
  const prev = g.globalAlpha; g.globalAlpha = prev * alpha;
  for (const [off, size, ph] of tongues) {
    const th = h * size * (1 + .14 * Math.sin(t * .37 + ph)), tw = w * (.4 + .6 * size), cx = x + off * w;
    for (let r = 0; r < th; r++) {
      const k = r / th, sway = Math.sin(t * .45 + k * 7 + ph) * tw * .28 * k, wk = tw * (1 - k) * (.72 + .28 * Math.sin(k * 9 + t * .5 + ph)), px = cx + sway, py = Math.round(y - r);
      const band = (ww, c) => { if (ww < .5) return; g.fillStyle = c; g.fillRect(Math.round(px - ww), py, Math.max(1, Math.round(ww * 2)), 1); };
      band(wk, k > .88 ? cols[0] : cols[1]); band(wk * .7, cols[2]); if (k < .78) band(wk * .42, cols[3]); if (k < .45) band(wk * .18, cols[4]);
    }
  }
  g.globalAlpha = prev;
}
// Estallido: anillos dentados que se abren; el núcleo claro se apaga el primero y deja el fuego rojo.
function drawBlast(x, y, r, q, t) {
  if (r < 1) return; const n = 20, jag = a => 1 + .12 * Math.sin(a * 5 + t * .7) + .08 * Math.sin(a * 9 - t * .5);
  const ring = (rr, col) => { if (rr < 1) return; g.fillStyle = col; g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * 6.28, d = rr * jag(a), px = x + Math.cos(a) * d, py = y - rr * .2 + Math.sin(a) * d * .8; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.fill(); };
  ring(r, '#7a2a1a'); ring(r * .9, C('rojo')); ring(r * .72, C('naranja')); ring(r * .5 * (1 - q * .5), C('amarillo')); if (q < .6) ring(r * .3 * (1 - q / .6), '#fff3c0');
}
// Humo: bocanadas que suben, se abren y se apagan del gris al negro.
function smokeColumn(wx, wy, wz, n = 10, dur = 60, spread = 8, seed = 2) {
  const rnd = seeded(seed * 5 + (B.stats.actions | 0)), puffs = Array.from({ length: n }, (_, i) => ({ dx: (rnd() - .5) * spread, dy: (rnd() - .5) * spread * .5, at: i * (dur / n) * .5, r: 3 + rnd() * 4, drift: (rnd() - .5) * .4, rise: .5 + rnd() * .5, ph: rnd() * 6 }));
  const f = fx(dur + 36, () => { for (const p of puffs) { const age = f.t - p.at; if (age < 0 || age > 36) continue; const q = age / 36, c = PJ([wx + p.dx + Math.sin(age * .2 + p.ph) * 2, wy + p.dy, wz + age * p.rise]), r = Math.max(1, (p.r + q * 7) * c[2]); g.globalAlpha = (1 - q) * .75; g.fillStyle = q < .4 ? '#4a4460' : '#2a2438'; g.beginPath(); g.ellipse(c[0] + p.drift * age, c[1], r, r * .8, 0, 0, 6.29); g.fill(); g.fillStyle = '#6a6480'; g.fillRect(Math.round(c[0] + p.drift * age - r * .4), Math.round(c[1] - r * .5), 2, 1); } g.globalAlpha = 1; });
  return f;
}
// Ascuas hacia la cámara: chispas en pantalla que salen del impacto y caen apagándose.
function emberStorm(sx, sy, n = 26, seed = 4) {
  if (!Prefs.shake) return;
  const rnd = seeded(seed * 13 + (B.stats.actions | 0)), embers = Array.from({ length: n }, () => ({ a: rnd() * 6.28, v: 2 + rnd() * 5, g: .06 + rnd() * .08, s: rnd() < .3 ? 2 : 1, life: 16 + rnd() * 16, c: rnd() }));
  const f = fx(34, () => { for (const e of embers) { if (f.t > e.life) continue; const q = f.t / e.life, x = sx + Math.cos(e.a) * e.v * f.t, y = sy + Math.sin(e.a) * e.v * f.t * .7 + e.g * f.t * f.t; g.globalAlpha = 1 - q * q; g.fillStyle = q < .3 ? '#fff3c0' : q < .6 ? C('amarillo') : e.c < .5 ? C('naranja') : C('rojo'); g.fillRect(Math.round(x), Math.round(y), e.s, e.s); } g.globalAlpha = 1; });
}
// Llamarada, la cerilla: rojo y amarillo se funden en naranja; Ámbar se planta junto a Carmín y raspa el lápiz por las cerdas
// cargadas de rojo hasta que prende; Carmín batea la bola con la brocha; el estallido abre una onda por el suelo que va
// encendiendo a cada enemigo por orden, envuelto en fuego por delante y por detrás, con humo, ascuas y el suelo chamuscado.
function* techLlamarada(users, targets, tech, col) {
  const red = users.find(u => u.id === 'carmin') || users[0], yel = users.find(u => u.id === 'ambar') || users[1] || users[0], mid = centroid(users), ec = enemyC();
  const OR = C('naranja'), YE = C('amarillo'), RE = C('rojo'), dmg = t => damage(t, baseDmg(users.reduce((s, u) => s + u.atk * statusMult(u, 'tiznado'), 0) / users.length, t.dfn, tech.power), col, 'Llamarada');
  // 1) fusión de pigmentos
  camFocus(mid[0], mid[1], { dist: 96, turn: .35, h: 52, pitch: .55, hy: 84, ease: .1 }); users.forEach(u => u.pose = 'charge');
  const { of } = yield* fuseAt(users, mid[0], mid[1], 22, OR); yield* wait(4); of.dur = 0;
  // 2) la cerilla: la brocha de Carmín, tumbada y cargada de rojo; Ámbar salta a su lado con el lápiz
  const bro = propSprite('brocha', RE), lap = propSprite('lapiz', YE), st = { k: 0, fire: 0, hold: 1, scrape: 0, swing: 0, lift: 0 };
  camFocus(red.wx, red.wy, { dist: 72, turn: .3, h: 40, ease: .1, subjects: users, headroom: 22 });
  const [sx, sy] = side(red, -20); yield* whop(yel, sx, sy, 8, 12); yel.pose = 'attack';
  // La brocha se apoya en Carmín (mango a su izquierda, cerdas hacia los enemigos); todo lo demás se mide desde su pivote.
  const K = .8, brushAt = () => { const c = PJ(above(red, .55)), s = c[2]; return { x: c[0] - 20 * s, y: c[1] + 2 * s - st.lift * s, s, a: -.18 - st.swing }; };
  const local = (b, lx, ly) => [b.x + (lx * Math.cos(b.a) - ly * Math.sin(b.a)) * K * b.s, b.y + (lx * Math.sin(b.a) + ly * Math.cos(b.a)) * K * b.s];
  const tipAt = () => { const b = brushAt(), [x, y] = local(b, 57, 9); return [x, y, b.s]; };
  const gh = propGhosts(5), sparks = [], srnd = seeded(31);
  const pf = fx(999, () => {
    if (!st.hold) return; const b = brushAt();
    if (st.swing) gh.push(bro, b.x, b.y, b.a, 1, 1, 11, K * b.s); gh.draw();
    drawProp(bro, b.x, b.y, b.a, 1, 1, 11, K * b.s);
    if (st.scrape) { const [px, py] = local(b, 37 + st.k * 22, -7 + st.k * 5); drawProp(lap, px, py, 1.05, 1, PROP.lapiz.tip[0], PROP.lapiz.tip[1], .95 * b.s); }
    for (const sp of sparks) { if (sp.t < 0 || sp.t > sp.life) continue; const q = sp.t / sp.life; g.fillStyle = q < .4 ? '#fff3c0' : YE; g.fillRect(Math.round(sp.x + sp.vx * sp.t), Math.round(sp.y + sp.vy * sp.t + .12 * sp.t * sp.t), 1, 1); }
    if (st.fire > 0) { const [tx, ty, s] = tipAt(); g.globalAlpha = .28 * st.fire * Math.max(.5, Prefs.flash); g.fillStyle = OR; g.beginPath(); g.arc(tx, ty, (8 + st.fire * 16) * s, 0, 6.29); g.fill(); g.globalAlpha = 1; drawFire(tx, ty + 5 * s, (3 + st.fire * 7) * s, (8 + st.fire * 30) * s, pf.t, 1); }
  });
  pf.tick = () => { for (const sp of sparks) sp.t++; while (sparks.length && sparks[0].t > sparks[0].life) sparks.shift(); };
  const spark = n => { if (!Prefs.shake) return; const b = brushAt(), [px, py] = local(b, 37 + st.k * 22, -7 + st.k * 5); for (let j = 0; j < n; j++) sparks.push({ x: px, y: py, vx: (srnd() - .5) * 3, vy: -1 - srnd() * 2.2, t: 0, life: 8 + srnd() * 8 }); };
  const sparkAt = [red.wx, red.wy, red.def.h * 1.1];
  for (let r = 0; r < 3; r++) {
    Audio.sfx('scratch_long', { vol: .8 }); st.scrape = 1;
    for (let i = 1; i <= 8; i++) { st.k = i / 8; yel.wz = Math.sin(i * .8) * 2; if (Prefs.shake) B.shake = i > 5 ? 1 : 0; spark(2 + r); yield; }
    if (r < 2) { for (let i = 1; i <= 4; i++) { st.k = 1 - i / 4; yield; } yel.wz = 0; }
  }
  st.scrape = 0; yel.wz = 0;
  // 3) prende: destello en la punta y la llama crece con las cerdas
  Audio.sfx('fwoom'); Audio.sfx('crackle', { when: .1 }); B.flash = { col: '#fff3c0', a: .35 }; B.slowmo = 8; B.hitstop = 2;
  { const [tx, ty] = tipAt(); emberStorm(tx, ty, 14, 9); }
  for (let i = 1; i <= 18; i++) { st.fire = i / 18; users.forEach(u => u.wz = Math.sin(i * .5) * 2); if (i % 3 === 0) spark(1); yield; }
  users.forEach(u => { u.wz = 0; u.pose = 'attack'; });
  // 4) el bateo: Carmín echa la brocha atrás y la lanza hacia delante; la bola sale disparada
  yield* whop(yel, ...side(red, -30), 6, 6); yel.pose = 'idle';
  Audio.sfx('charge', { semi: 0, vol: .5 }); for (let i = 1; i <= 7; i++) { st.swing = -.55 * i / 7; st.lift = 4 * i / 7; red.gesture = Prefs.shake ? { sx: 1 + .1 * i / 7, sy: 1 - .1 * i / 7 } : null; yield; }
  Audio.sfx('whip'); Audio.sfx('drop_fall', { when: .1 });
  for (let i = 1; i <= 5; i++) { st.swing = -.55 + 2.2 * (i / 5) ** 1.6; st.lift = 4 - 6 * i / 5; red.gesture = Prefs.shake ? { sx: 1.12 - .12 * i / 5, sy: .88 + .12 * i / 5 } : null; if (i === 3) { st.fire = 0; red.wz = 6; } yield; }
  red.gesture = null; red.wz = 0; B.hitstop = 2;
  // La cámara abre para que quepan la bola en su ápice y la fila de enemigos que la espera.
  camFocus(ec[0], ec[1], { dist: 112, turn: -.2, h: 58, pitch: .58, ease: .07, subjects: targets, points: [[lerp(red.wx, ec[0], .5), lerp(red.wy, ec[1], .5), 62, 18]] });
  const ball = { wx: red.wx, wy: red.wy, wz: red.def.h + 8, trail: [] }, sh = shadowFx(ball.wx, ball.wy, 4, 999);
  const bf = fx(999, () => {
    // cola de cometa: las posiciones anteriores arden cada vez más pequeñas; delante, la bola con halo
    ball.trail.forEach((p, i) => { const c = PJ(p), k = (i + 1) / (ball.trail.length + 1); drawFire(c[0], c[1] + 6 * c[2], 7 * k * c[2], 18 * k * c[2], bf.t + i, 3 + i, .35 + .5 * k); });
    const c = PJ([ball.wx, ball.wy, ball.wz]); g.globalAlpha = .3 * Math.max(.5, Prefs.flash); g.fillStyle = OR; g.beginPath(); g.arc(c[0], c[1], 20 * c[2], 0, 6.29); g.fill(); g.globalAlpha = 1;
    drawFire(c[0], c[1] + 8 * c[2], 10 * c[2], 30 * c[2], bf.t, 2); g.fillStyle = '#fff3c0'; g.beginPath(); g.arc(c[0], c[1] - 2 * c[2], Math.max(1, 5 * c[2]), 0, 6.29); g.fill();
  });
  for (let i = 1; i <= 22; i++) { const k = i / 22; if (i <= 8) { st.swing = lerp(1.65, 0, i / 8); st.lift = lerp(-2, 0, i / 8); } else st.hold = 0; if (i % 2) ball.trail.unshift([ball.wx, ball.wy, ball.wz]); if (ball.trail.length > 7) ball.trail.pop(); ball.wx = lerp(red.wx, ec[0], k); ball.wy = lerp(red.wy, ec[1], k); ball.wz = red.def.h + 8 + Math.sin(k * Math.PI) * 52 - k * 20;
    sh.draw = () => { const c = project(ball.wx, ball.wy, 0); if (c) shadow(c[0], c[1], Math.round((6 + (1 - Math.sin(k * Math.PI)) * 14) * c[2])); };
    for (let j = 0; j < 2; j++) B.particles.push({ wx: ball.wx + R(-4, 4), wy: ball.wy + R(-2, 2), wz: ball.wz + R(-4, 4), vx: R(-.4, .4), vy: 0, vz: R(-.4, .8), g: -.01, col: j ? OR : YE, t: 0, life: 16, size: 2 }); yield; }
  bf.dur = 0; sh.dur = 0; pf.dur = 0; st.hold = 0;
  // 5) impacto: fotograma de todos, estallido dentado, onda de fuego por el suelo y ascuas hasta la cámara
  Audio.sfx('fwoom'); Audio.sfx('impact_sub', { vol: .9 }); Audio.sfx('crackle', { when: .2 }); B.flash = { col: '#fff3c0', a: .7 }; B.shake = 9; B.hitstop = 8; B.slowmo = 14;
  impactFrame(targets, OR, 1.4); { const c = PJ([ec[0], ec[1], 8]); emberStorm(c[0], c[1], 30, 4); }
  burst(ec[0], ec[1], 6, YE, 24, 3, 30, .1); burst(ec[0], ec[1], 6, OR, 24, 2.2, 36, .06);
  const blast = fx(22, () => { const c = PJ([ec[0], ec[1], 6]), q = blast.t / 22, e = 1 - (1 - q) ** 3; g.globalAlpha = q > .45 ? (1 - q) / .55 : 1; drawBlast(c[0], c[1], (6 + e * 46) * c[2], q, blast.t); g.globalAlpha = 1; });
  const ring = fx(34, () => { const c = PJ([ec[0], ec[1], 0]), q = ring.t / 34; g.globalAlpha = 1 - q; g.strokeStyle = C('rojo'); g.lineWidth = 5 * (1 - q * .5); g.beginPath(); g.ellipse(c[0], c[1], (8 + q * 140) * c[2], (3 + q * 54) * c[2], 0, 0, 6.29); g.stroke(); g.strokeStyle = OR; g.lineWidth = 3; g.beginPath(); g.ellipse(c[0], c[1], (6 + q * 128) * c[2], (2 + q * 49) * c[2], 0, 0, 6.29); g.stroke(); g.strokeStyle = YE; g.lineWidth = 1; g.beginPath(); g.ellipse(c[0], c[1], (4 + q * 116) * c[2], (2 + q * 44) * c[2], 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; }, true);
  const heat = overlay(80, OR, .12, 6, 34); smokeColumn(ec[0], ec[1], 10, 14, 70, 26, 1);
  mark({ kind: 'pool', p: [ec[0], ec[1] + 2, 0], w: 30, col: '#3a2a22', grow: 8, life: 280, under: true });
  // 6) la onda enciende a cada enemigo por orden de distancia: fuego detrás (ancho) y delante (fino), humo y chamuscado
  const order = [...targets].sort((a, b) => Math.hypot(a.wx - ec[0], a.wy - ec[1]) - Math.hypot(b.wx - ec[0], b.wy - ec[1]));
  const pillars = order.map((t, j) => ({ t, seed: j * 3 + 1, k: 0, at: 4 + j * 5, lit: false }));
  const fireOf = (p, front) => { const c = PJ([p.t.wx, p.t.wy, 0]), s = c[2] * (p.t.boss ? 1.35 : 1.6), w = p.t.def.w * (front ? .38 : .7) * s * p.k, h = p.t.def.h * (front ? 1.2 : 2.3) * s * p.k; drawFire(c[0] + (front ? 2 : 0), c[1] + (front ? 3 : 1), w, h, pilB.t + p.seed * 5, p.seed + (front ? 20 : 0), front ? .8 : 1); };
  const pilB = fx(999, () => { for (const p of pillars) if (p.k > 0) fireOf(p, false); }, true), pilF = fx(999, () => { for (const p of pillars) if (p.k > 0) fireOf(p, true); });
  for (let i = 0; i < 50; i++) {
    for (const p of pillars) {
      p.k = clamp((i - p.at) / 8, 0, 1) * (i > 36 ? (50 - i) / 14 : 1);
      if (!p.lit && i >= p.at) { p.lit = true; p.t.pose = 'hurt'; p.t.poseT = 14; Audio.sfx('fwoom', { vol: .55, pan: -.2 }); burst(p.t.wx, p.t.wy, p.t.def.h * .5, YE, 10, 1.8, 20, .08); smokeColumn(p.t.wx, p.t.wy, p.t.def.h, 6, 40, p.t.def.w * .6, p.seed + 3); mark({ kind: 'blob', p: [p.t.wx, p.t.wy, 0], w: p.t.def.w * .5, col: '#1e1a2c', grow: 6, life: 260, seed: 5 + p.seed, under: true }); mark({ kind: 'pool', p: [p.t.wx, p.t.wy + 2, 0], w: p.t.def.w * .9, col: '#3a2a22', grow: 8, life: 260, under: true }); }
      if (p.lit && i === p.at + 4) { dmg(p.t); goop(p.t, OR, 90); }
      if (p.lit && p.k > .3 && i % 2 === 0) flames(p.t.wx, p.t.wy, 1, p.t.def.w * .35);
    }
    if (i % 5 === 0) mark({ kind: 'pool', p: [ec[0] + R(-50, 50), ec[1] + R(-20, 20), 0], w: R(4, 9), col: i % 10 ? '#5a2a2a' : OR, grow: 4, life: 200, under: true });
    yield;
  }
  pilB.dur = 0; pilF.dur = 0;
  // 7) rescoldos: ascuas que flotan y los dos vuelven a su sitio
  for (let i = 0; i < 16; i++) { B.particles.push({ wx: ec[0] + R(-60, 60), wy: ec[1] + R(-24, 24), wz: R(0, 10), vx: R(-.2, .2), vy: 0, vz: R(.3, .8), g: -.01, col: i & 1 ? OR : YE, t: 0, life: 40, size: 1 }); yield; }
  yield* whop(yel, yel.hx, yel.hy, 10, 8); yield* wait(6); users.forEach(u => { u.pose = 'idle'; u.wx = u.hx; u.wy = u.hy; }); camReset();
}
// ---- Brote: verde de píxel. Todo lo que sigue se dibuja fila a fila con fillRect/pstroke, sin curvas lisas, y es determinista:
// dibujar dos veces el mismo frame da la misma planta, y dibujar nunca consume el azar del combate.
// Paleta de la planta a partir del verde del juego: contorno de tinta, sombra hacia el azul, brillo hacia el amarillo y brote tierno.
function leafPalette() { const rp = ramp(C('verde')); return { out: rp.out, dk: rp.dk, sh: rp.sh, base: rp.base, hi: rp.hi, bud: '#b8e68a' }; }
// Disco de píxel: filas rellenas, contorno opcional y un brillo arriba a la izquierda (el sol y el corazón de las flores).
function pixDisc(x, y, r, col, out, hi) {
  if (!(r > 0)) return;
  const rows = (rr, c) => { g.fillStyle = c; const R2 = Math.ceil(rr); for (let dy = -R2; dy <= R2; dy++) { if (dy * dy > rr * rr) continue; const w = Math.sqrt(rr * rr - dy * dy); g.fillRect(Math.round(x - w), Math.round(y + dy), Math.max(1, Math.round(w * 2)), 1); } };
  if (out) rows(r + 1, out); rows(r, col);
  if (hi && r >= 3) { g.fillStyle = hi; g.fillRect(Math.round(x - r * .5), Math.round(y - r * .6), Math.max(1, Math.round(r * .45)), 1); g.fillRect(Math.round(x - r * .65), Math.round(y - r * .4), 1, Math.max(1, Math.round(r * .3))); }
}
// Anillo de píxel: puntos sueltos sobre una elipse (ondas en el agua).
function pixRing(x, y, rx, ry, col) { if (!(rx >= 1)) return; g.fillStyle = col; const n = Math.max(8, Math.round(rx * 2)); for (let i = 0; i < n; i++) { const a = i / n * 6.28; g.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1); } }
// Hoja de píxel: a lo largo del eje (ángulo a, largo L) se apilan filas perpendiculares que se ensanchan y afinan; contorno de tinta,
// cara clara a un lado y nervio. curl dobla la punta hacia un lado.
function pixLeaf(x, y, a, L, wid, cols, curl = 0) {
  if (!(L >= 1)) return; const ca = Math.cos(a), sa = Math.sin(a), n = Math.max(2, Math.round(L)), W2 = Math.max(1, wid);
  const at = i => { const k = i / n, b = curl * k * k * 5; return [x + ca * i - sa * b, y + sa * i + ca * b]; }, half = i => Math.pow(Math.sin(Math.min(1, i / n) * Math.PI), .75) * W2;
  const row = (i, h, c, from = -1, to = 1) => { const [px, py] = at(i); pstroke(px - sa * h * from, py + ca * h * from, px - sa * h * to, py + ca * h * to, 1, c, 1, 0, false); };
  for (let i = 0; i <= n; i++) row(i, half(i) + 1, cols.out);
  for (let i = 1; i < n; i++) row(i, half(i), cols.base);
  for (let i = 1; i < n; i++) if (half(i) > 1.4) row(i, half(i), cols.hi, -.9, -.3);
  g.fillStyle = cols.sh; for (let i = 2; i < n - 1; i++) { const [px, py] = at(i); g.fillRect(Math.round(px), Math.round(py), 1, 1); }
}
// Flor de píxel: seis pétalos alternos amarillo y azul (los pigmentos que la hicieron nacer) que se abren como hojas alrededor de un
// corazón naranja; k es cuánto se ha abierto.
function pixFlower(x, y, k, s, t, seed = 0) {
  if (!(k > 0)) return; const r = (2 + 7 * k) * s, YR = ramp(C('amarillo')), BR = ramp(C('azul')), OR = ramp(C('naranja'));
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + seed * .5 + Math.sin(t * .05 + i) * .06 * k, rp = i % 2 ? BR : YR; pixLeaf(x + Math.cos(a) * 1.5 * s, y + Math.sin(a) * 1.2 * s, a, r, Math.max(1, r * .38), { out: rp.out, base: rp.base, hi: rp.hi, sh: rp.sh }); }
  pixDisc(x, y, Math.max(1, r * .38), OR.base, OR.out, '#fff3c0'); if (r > 5) { g.fillStyle = OR.sh; g.fillRect(Math.round(x + 1), Math.round(y + 1), 1, 1); }
}
// Haz de luz tramado (damero de 2 px) del sol a la semilla; el damero corre hacia abajo con t.
function drawSunbeam(sx, sy, tx, ty, w0, w1, t, alpha) {
  const len = Math.hypot(tx - sx, ty - sy), steps = Math.max(1, Math.round(len / 2)), prev = g.globalAlpha; g.globalAlpha = prev * alpha; g.fillStyle = '#fbe28a';
  for (let i = 0; i <= steps; i++) { const k = i / steps, cx = sx + (tx - sx) * k, cy = sy + (ty - sy) * k, w = lerp(w0, w1, k); for (let x = -w; x <= w; x += 2) if (((Math.round(x / 2) + i + (t >> 2)) & 1) === 0) g.fillRect(Math.round(cx + x), Math.round(cy), 2, 2); }
  g.globalAlpha = prev;
}
// Zarcillo de píxel: el camino de mundo se dibuja hasta k con contorno, cuerpo y brillo; en los nudos que ya ha pasado brota una hojita.
function drawVine(pts, k, w, cols, seed = 0, alpha = 1) {
  const S = pts.map(PJ), tot = S.length - 1, n = tot * clamp(k, 0, 1), full = Math.floor(n), frac = n - full, prev = g.globalAlpha; g.globalAlpha = prev * alpha;
  const seg = (i, m, ww, c, oy = 0) => { const a = S[i], b = S[i + 1]; pstroke(a[0], a[1] + oy, lerp(a[0], b[0], m), lerp(a[1], b[1], m) + oy, Math.max(1, ww * a[2]), c, 1, 0, false); };
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i <= full && i < tot; i++) { const m = i < full ? 1 : frac; if (m <= 0) continue; if (pass === 0) seg(i, m, w + 2, cols.out); else if (pass === 1) seg(i, m, w, cols.base); else seg(i, m, w * .4, cols.hi, -1); }
  const rnd = seeded(seed * 7 + 3);
  for (let i = 1; i < tot; i++) { const a = rnd() * 6.28, L = 3 + rnd() * 3, side = rnd() < .5 ? -1 : 1; if (i % 2 || i > full) continue; const grow = clamp((n - i) / 1.5, 0, 1), p = S[i]; if (grow > 0) pixLeaf(p[0], p[1], a, L * p[2] * grow, 1.6 * p[2] * grow, cols, side * .3); }
  g.globalAlpha = prev;
}
// Brote, la semilla: amarillo y azul se funden en verde y la gota sale volando y se hunde en el claro delante de los enemigos.
// Añil la riega sacudiendo el pincel cargado de azul; Ámbar alza el lápiz y de su punta sube un sol de pintura cuyo haz cae sobre la
// semilla. La semilla se raja, el tallo trepa píxel a píxel y despliega las hojas; los zarcillos reptan por el suelo hasta cada enemigo,
// lo enroscan y lo estrujan; la flor se abre con pétalos de los dos pigmentos y su polen vuela al grupo, que se cura bajo florecillas.
function* techBrote(users, targets, tech, col) {
  const yel = users.find(u => u.id === 'ambar') || users[0], blu = users.find(u => u.id === 'anil') || users[1] || users[0], mid = centroid(users), ec = enemyC(), pc = partyC();
  const GR = C('verde'), YE = C('amarillo'), BL = C('azul'), LP = leafPalette(), YR = ramp(YE), BR = ramp(BL);
  const dmg = t => damage(t, baseDmg(users.reduce((s, u) => s + u.atk * statusMult(u, 'tiznado'), 0) / users.length, t.dfn, tech.power), col, 'Brote');
  // 1) fusión de pigmentos: la gota verde nace entre los dos y sale en arco hacia el claro
  camFocus(mid[0], mid[1], { dist: 96, turn: .35, h: 52, pitch: .55, hy: 84, ease: .1 }); users.forEach(u => u.pose = 'charge');
  const { of, orb } = yield* fuseAt(users, mid[0], mid[1], 22, GR); yield* wait(4);
  const sp = [lerp(ec[0], pc[0], .5), lerp(ec[1], pc[1], .5)], spU = { wx: sp[0], wy: sp[1] };
  camFocus(sp[0], sp[1], { dist: 92, turn: -.15, h: 48, pitch: .54, ease: .08, subjects: users, headroom: 26, points: [[sp[0], sp[1], 0, 14]] });
  Audio.sfx('fwip'); const sh = shadowFx(sp[0], sp[1], 4, 999), r0 = orb.r;
  for (let i = 1; i <= 18; i++) { const k = i / 18; orb.wx = lerp(mid[0], sp[0], k); orb.wy = lerp(mid[1], sp[1], k); orb.wz = 22 + Math.sin(k * Math.PI) * 40 - k * 22; orb.r = lerp(r0, 4, k); sh.draw = () => { const c = project(orb.wx, orb.wy, 0); if (c) shadow(c[0], c[1], Math.round((4 + k * 6) * c[2])); }; yield; }
  of.dur = 0; sh.dur = 0;
  // 2) la semilla se hunde en la tierra: polvo, un hoyo oscuro y la gota queda medio enterrada
  Audio.sfx('plop', { semi: -3 }); B.shake = 2; burst(sp[0], sp[1], 2, '#8a6a4a', 10, 1.4, 18, .1);
  mark({ kind: 'pool', p: [sp[0], sp[1] + 1, 0], w: 9, col: '#5a4630', grow: 6, life: 420, under: true });
  const plant = { seed: 1, crack: 0, h: 0, leaves: 0, bud: 0, bloom: 0, glow: 0, lean: 0 }, sun = { k: 0, x: W * .5, y: 28, beam: 0 }, vst = { alpha: 1 };
  const sf = fx(999, () => {
    if (sun.k <= 0) return; const r = 3 + 7 * sun.k;
    if (sun.beam > 0) { const c = PJ([sp[0], sp[1], 0]); drawSunbeam(sun.x, sun.y + r, c[0], c[1], r * 1.6, 6 * c[2] + 2, sf.t, .16 * sun.beam * Math.max(.4, Prefs.flash)); }
    g.globalAlpha = .18 * sun.k * Math.max(.4, Prefs.flash); pixDisc(sun.x, sun.y, r * 2.2, '#fbe28a'); g.globalAlpha = 1;
    for (let i = 0; i < 8; i++) { const a = i * .785 + Math.sin(sf.t * .03) * .1, L = r + 3 + (2 + 2 * Math.sin(sf.t * .25 + i * 1.3)) * sun.k; pstroke(sun.x + Math.cos(a) * (r + 2), sun.y + Math.sin(a) * (r + 2), sun.x + Math.cos(a) * L, sun.y + Math.sin(a) * L, 1, i % 2 ? YE : '#fbe28a', 1, 0, false); }
    pixDisc(sun.x, sun.y, r, YE, YR.out, '#fff3c0');
  });
  // El tallo se mece desde la base; cada punto del tallo se mide por su fracción k, así las hojas y el capullo lo siguen.
  const stalkPt = (b, k, H, s) => [b[0] + (Math.sin(pl.t * .06 + k * 2.4) * 2.5 + plant.lean) * s * k * k, b[1] - H * k];
  const pl = fx(999, () => {
    const b = PJ([sp[0], sp[1], 0]), s = b[2];
    if (plant.seed > 0) { const r = Math.max(1.5, 3 * s * plant.seed); pixDisc(b[0], b[1] - r * .6, r, '#a06a3a', '#3a2414', '#e0b078'); if (plant.crack > 0) { g.fillStyle = '#3a2414'; g.fillRect(Math.round(b[0]), Math.round(b[1] - r * 1.6), 1, Math.max(1, Math.round(r * 2 * plant.crack))); } if (plant.glow > 0) { g.globalAlpha = plant.glow; g.fillStyle = '#fff3c0'; g.fillRect(Math.round(b[0] - 1), Math.round(b[1] - r * 1.4), 2, 1); g.globalAlpha = 1; } }
    if (plant.h <= 0) return; const H = plant.h * 52 * s, rows = Math.max(1, Math.round(H));
    for (let pass = 0; pass < 2; pass++) for (let r = 0; r <= rows; r++) { const k = r / rows, [px, py] = stalkPt(b, k, H, s), w = Math.max(1, 3.4 * s * (1 - k * .5)); if (pass === 0) { g.fillStyle = LP.out; g.fillRect(Math.round(px - w / 2) - 1, Math.round(py), Math.round(w) + 2, 1); } else { g.fillStyle = LP.base; g.fillRect(Math.round(px - w / 2), Math.round(py), Math.max(1, Math.round(w)), 1); if (w >= 2.5) { g.fillStyle = LP.hi; g.fillRect(Math.round(px - w / 2), Math.round(py), 1, 1); } } }
    // hojas alternas: cada una se despliega desde el tallo y sube al abrirse; las bajas son las mayores
    for (let i = 0; i < 5; i++) { const k = .22 + i * .16, lk = clamp((plant.leaves - i * .16) / .32, 0, 1); if (lk <= 0 || k > plant.h + .02) continue; const [lx, ly] = stalkPt(b, k, H, s), dir = i % 2 ? 1 : -1, L = (13 - i * 1.4) * s * lk, ang = dir > 0 ? -.55 + (1 - lk) * .9 : Math.PI + .55 - (1 - lk) * .9; pixLeaf(lx + dir * 1.5 * s, ly - 1, ang + Math.sin(pl.t * .07 + i) * .05, L, Math.max(1, L * .34), LP, dir * .35); }
    const [tx, ty] = stalkPt(b, 1, H, s);
    if (plant.bud > 0 && plant.bloom <= 0) { const r = Math.max(1, 3 * s * plant.bud); pixDisc(tx, ty - r, r, LP.bud, LP.out, '#e8f6c8'); g.fillStyle = LP.base; g.fillRect(Math.round(tx - 1), Math.round(ty - r * 2.2), 2, 1); }
    if (plant.bloom > 0) pixFlower(tx, ty - 3 * s, plant.bloom, s * 1.1, pl.t, 0);
  });
  // 3) los dos saltan a flanquear la semilla: Añil la riega sacudiendo el pincel; Ámbar prepara el lápiz
  const [bx, by] = fwdOf({ wx: side(spU, 22)[0], wy: side(spU, 22)[1] }, -10), [ax, ay] = fwdOf({ wx: side(spU, -22)[0], wy: side(spU, -22)[1] }, -10);
  { const b0 = [blu.wx, blu.wy], a0 = [yel.wx, yel.wy]; users.forEach(u => u.pose = 'hop'); Audio.sfx('fwip', { semi: 7 });
    for (let i = 1; i <= 12; i++) { const k = i / 12, z = Math.sin(k * Math.PI) * 14; blu.wx = lerp(b0[0], bx, k); blu.wy = lerp(b0[1], by, k); yel.wx = lerp(a0[0], ax, k); yel.wy = lerp(a0[1], ay, k); blu.wz = yel.wz = z; yield; }
    users.forEach(u => { u.wz = 0; u.pose = 'attack'; }); }
  const pin = propSprite('pincel', BL), lap = propSprite('lapiz', YE), st = { brush: 0, shake: 0, pencil: 0, lift: 0 }, PA = -1.2, PS = .7;
  const tipW = () => [lerp(blu.wx, sp[0], .6), lerp(blu.wy, sp[1], .6), blu.def.h * .7];
  const pf = fx(999, () => {
    // el pincel cuelga del mango, sobre Añil, con las cerdas justo encima de la semilla; el lápiz apunta al cielo sobre Ámbar
    if (st.brush > 0) { const p = PJ(above(blu, 1.2)), q = PJ(tipW()), dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1; drawProp(pin, p[0], p[1], Math.atan2(dy, dx) + st.shake, 1, 4, 8, len / 43, st.brush); }
    if (st.pencil > 0) { const p = PJ(above(yel, .95)), s = p[2]; drawProp(lap, p[0] + 4 * s, p[1] - st.lift * s, PA + Math.sin(pf.t * .08) * .04, 1, 3, 7, PS * s, st.pencil); }
  });
  const ripple = seed => { const f = fx(14, () => { const c = PJ([sp[0], sp[1], 0]), q = f.t / 14; g.globalAlpha = 1 - q; pixRing(c[0], c[1], (3 + q * 12) * c[2], (1.2 + q * 4.5) * c[2], q < .5 ? BR.hi : BL); pixRing(c[0], c[1], (1 + q * 8) * c[2], (.5 + q * 3) * c[2], BL); g.globalAlpha = 1; }, true); return f; };
  st.brush = 1; st.pencil = 1; Audio.sfx('splash_clean', { vol: .7 });
  for (let r = 0; r < 3; r++) {
    Audio.sfx('drop_fall', { when: .05, vol: .7 });
    for (let i = 1; i <= 7; i++) { st.shake = Math.sin(i / 7 * Math.PI * 2) * .35; blu.wz = i < 4 ? i : 7 - i; blu.gesture = Prefs.shake ? { sx: 1 + .06 * Math.sin(i), sy: 1 - .06 * Math.sin(i) } : null;
      if (i <= 4) { const tw = tipW(); for (let j = 0; j < 2; j++) B.particles.push({ wx: tw[0] + R(-2, 2), wy: tw[1] + R(-1, 1), wz: tw[2], tx: sp[0] + R(-5, 5), ty: sp[1] + R(-3, 3), tz: 0, col: j ? BL : BR.hi, t: 0, life: 9, dur: 9, arc: 4, stream: true, size: 2 }); }
      yield; }
    Audio.sfx('bubbles', { vol: .35 }); ripple(r); plant.seed = 1 + (r + 1) * .07;
    mark({ kind: 'pool', p: [sp[0] + R(-3, 3), sp[1] + 1 + R(-2, 2), 0], w: 8 + r * 3, col: BR.sh, grow: 6, life: 320, under: true });
  }
  blu.gesture = null; blu.wz = 0; st.shake = 0;
  // 4) Ámbar alza el lápiz: de la punta sube una chispa que se hincha en un sol de pintura, y su haz cae sobre la semilla
  Audio.sfx('charge', { semi: 4, vol: .6 }); Audio.sfx('shimmer', { when: .2 });
  { const p = PJ(above(yel, .95)), s = p[2], tipx = p[0] + 4 * s + Math.cos(PA) * 44 * PS * s, tipy = p[1] + Math.sin(PA) * 44 * PS * s, c = PJ([sp[0], sp[1], 0]), gx = clamp(c[0], 50, W - 50), gy = 28;
    sparkle(...above(yel, 1.9), '#fff3c0');
    for (let i = 1; i <= 14; i++) { const k = i / 14, e = 1 - (1 - k) ** 2; sun.k = k; sun.x = lerp(tipx, gx, e); sun.y = lerp(tipy, gy, e); st.lift = 4 * k; st.brush = 1 - k; yel.wz = k * 3; if (i % 2) B.particles.push({ wx: yel.wx + R(-4, 4), wy: yel.wy + R(-2, 2), wz: yel.def.h + R(4, 14), vx: 0, vy: 0, vz: R(.4, .9), g: -.01, col: i % 4 ? YE : '#fff3c0', t: 0, life: 18, size: 1 }); yield; } }
  Audio.sfx('saturate', { vol: .5 }); for (let i = 1; i <= 8; i++) { sun.beam = i / 8; plant.glow = i / 8; yield; }
  for (let i = 1; i <= 6; i++) { st.pencil = 1 - i / 6; st.lift = 4 - 8 * i / 6; yel.wz = 0; yield; } users.forEach(u => u.pose = 'idle');
  // 5) la semilla se raja y el tallo trepa píxel a píxel; las hojas se despliegan por turnos y el capullo asoma
  Audio.sfx('crumbs', { vol: .8 }); for (let i = 1; i <= 6; i++) { plant.crack = i / 6; B.shake = i > 3 ? 1 : 0; yield; }
  Audio.sfx('grow'); Audio.sfx('leaves', { when: .15, vol: .5 }); B.shake = 3; B.hitstop = 2; burst(sp[0], sp[1], 3, '#8a5a34', 6, 1.2, 16, .12); burst(sp[0], sp[1], 3, LP.bud, 8, 1.6, 20, .05);
  camFocus(sp[0], sp[1], { dist: 70, turn: -.28, h: 36, pitch: .5, f: 215, zoom: 1.32, ease: .1, subjects: users, headroom: 4, points: [[sp[0], sp[1], 30, 4]] });
  for (let i = 1; i <= 26; i++) { const k = i / 26; plant.h = 1 - (1 - k) ** 3; plant.seed = Math.max(0, 1.2 - k * 3); plant.glow = Math.max(0, 1 - k * 2); if (i > 6) plant.leaves = (i - 6) / 20; if (i > 18) plant.bud = (i - 18) / 8; plant.lean = Math.sin(k * Math.PI) * 3;
    if (i % 5 === 0) Audio.sfx('leaves', { vol: .45 }); if (i % 2 === 0) B.particles.push({ wx: sp[0] + R(-5, 5), wy: sp[1] + R(-2, 2), wz: plant.h * 48 + R(-4, 4), vx: R(-.3, .3), vy: 0, vz: R(.3, .7), g: -.01, col: i % 3 ? LP.bud : LP.hi, t: 0, life: 22, size: 1 }); yield; }
  plant.lean = 0; plant.bud = 1;
  // 6) zarcillos: reptan por el suelo desde la base hasta cada enemigo por orden de distancia, lo trepan en espiral y lo estrujan
  camFocus(ec[0], ec[1], { dist: 112, turn: -.2, h: 58, pitch: .56, ease: .08, subjects: targets, points: [[sp[0], sp[1], 54, 10]] });
  const order = [...targets].sort((a, b) => Math.hypot(a.wx - sp[0], a.wy - sp[1]) - Math.hypot(b.wx - sp[0], b.wy - sp[1]));
  const vines = order.map((t, j) => { const es = t.boss ? 1.35 : 1.6, ground = [], climb = [], n = 7, [fx0, fy0] = fwdOf(t, -t.def.w * .5);
    for (let i = 0; i <= n; i++) { const k = i / n, bow = Math.sin(k * Math.PI); ground.push([lerp(sp[0], fx0, k) + Math.sin(k * 8 + j) * 4 * bow, lerp(sp[1], fy0, k) + Math.cos(k * 6 + j) * 3 * bow, 0]); }
    climb.push(ground[n]); for (let i = 0; i <= 9; i++) { const a = i * 1.05 + j, k = i / 9; climb.push([t.wx + Math.cos(a) * t.def.w * .42 * es, t.wy + Math.sin(a) * 5, k * t.def.h * .85 * es]); }
    return { t, j, ground, climb, gk: 0, ck: 0, at: 2 + j * 5, flower: 0 }; });
  const vg = fx(999, () => { for (const v of vines) if (v.gk > 0) drawVine(v.ground, v.gk, 2.6, LP, v.j + 1, vst.alpha); }, true);
  const vc = fx(999, () => { for (const v of vines) { if (v.ck > 0) drawVine(v.climb, v.ck, 2.4, LP, v.j + 9, vst.alpha); if (v.flower > 0) { const c = PJ([v.t.wx, v.t.wy, v.t.def.h * (v.t.boss ? 1.35 : 1.6) * .9 + 4]); pixFlower(c[0], c[1], v.flower, c[2] * 1.1, vc.t + v.j * 5, v.j + 1); } } });
  const groundF = 14, climbF = 12;
  for (let i = 0; ; i++) { let busy = false;
    for (const v of vines) { const a = i - v.at; if (a < 0) { busy = true; continue; } if (a === 0) Audio.sfx('leaves', { vol: .6, pan: -.2 }); v.gk = clamp(a / groundF, 0, 1); v.ck = clamp((a - groundF) / climbF, 0, 1); if (v.ck < 1) busy = true; if (a === groundF) { v.t.pose = 'hurt'; v.t.poseT = 8; }
      if (i % 3 === 0 && v.gk > 0 && v.gk < 1) { const p = pointAt(v.ground, v.gk); B.particles.push({ wx: p[0], wy: p[1], wz: 1, vx: R(-.2, .2), vy: 0, vz: R(.3, .6), g: .02, col: '#8a6a4a', t: 0, life: 12, size: 1 }); } }
    yield; if (!busy) break; }
  yield* wait(4); Audio.sfx('squeeze'); Audio.sfx('rub', { when: .08 }); B.shake = 5; B.hitstop = 6; B.slowmo = 8; impactFrame(targets, GR, 1.1);
  for (const t of targets) { t.pose = 'hurt'; t.poseT = 22; t.sqz = 1; dmg(t); goop(t, GR, 100); burst(t.wx, t.wy, t.def.h * .8, LP.hi, 8, 1.5, 22, .06); for (let j = 0; j < 5; j++) B.particles.push({ wx: t.wx + R(-8, 8), wy: t.wy + R(-4, 4), wz: t.def.h * R(.5, 1.3), vx: R(-.4, .4), vy: 0, vz: R(-.2, .3), g: .03, t: 0, life: 30, pal: [LP.bud, LP.base, LP.sh], size: 2 }); }
  for (let i = 0; i < 12; i++) { targets.forEach(t => t.sqz = 1 - i / 12 * .4); yield; } targets.forEach(t => t.sqz = 0);
  // 7) floración: el capullo se abre en una flor de dos pigmentos y cada zarcillo florece sobre su presa; caen pétalos
  Audio.sfx('heal_bells'); Audio.sfx('leaves', { vol: .4 });
  for (let i = 1; i <= 24; i++) { plant.bloom = clamp(i / 14, 0, 1); vines.forEach(v => v.flower = clamp((i - 4 - v.j * 3) / 12, 0, 1));
    if (i > 8 && i % 3 === 0) { for (const t of targets) B.particles.push({ wx: t.wx + R(-8, 8), wy: t.wy + R(-4, 4), wz: t.def.h * 1.6 + 4, vx: R(-.3, .3), vy: R(-.2, .2), vz: -R(.1, .3), g: .01, col: i % 2 ? YE : BL, t: 0, life: 40, size: 2 }); B.particles.push({ wx: sp[0] + R(-6, 6), wy: sp[1] + R(-3, 3), wz: 54, vx: R(-.4, .4), vy: 0, vz: -R(.1, .3), g: .012, col: i % 2 ? BL : YE, t: 0, life: 44, size: 2 }); }
    yield; }
  // 8) polen: motas doradas y verdes vuelan de la flor a cada gota del grupo; al llegar, cura y una florecilla se abre sobre su cabeza
  camFocus(pc[0], pc[1], { dist: 100, turn: .25, h: 54, pitch: .56, ease: .08, subjects: alive(B.party), headroom: 34, points: [[sp[0], sp[1], 56, 10]] });
  Audio.sfx('tinkle', { semi: 4 });
  for (const p of alive(B.party)) for (let j = 0; j < 16; j++) B.particles.push({ wx: sp[0] + R(-6, 6), wy: sp[1] + R(-3, 3), wz: 52 + R(0, 8), tx: p.wx + R(-4, 4), ty: p.wy + R(-2, 2), tz: p.def.h * .6, col: j % 3 ? '#fbe28a' : LP.bud, t: -RI(0, 14), life: 30, dur: 30, arc: 24, stream: true, size: 2 });
  const crowns = alive(B.party).map((p, j) => ({ p, k: 0, j })), cf = fx(999, () => { for (const c of crowns) { if (c.k <= 0) continue; const q = PJ(above(c.p, 1.25)); pixFlower(q[0], q[1] - 4 * c.k * q[2], c.k, q[2] * .9, cf.t + c.j * 4, c.j + 3); } });
  yield* wait(30);
  for (const p of alive(B.party)) { heal(p, Math.round(p.maxhp * tech.heal)); p.uiHeal = 20; sparkle(p.wx, p.wy, p.def.h + 8, '#fbe28a'); }
  for (let i = 1; i <= 26; i++) { crowns.forEach(c => c.k = i <= 10 ? i / 10 : i > 18 ? Math.max(0, (26 - i) / 8) : 1); if (i % 3 === 0) for (const c of crowns) B.particles.push({ wx: c.p.wx + R(-5, 5), wy: c.p.wy + R(-2, 2), wz: c.p.def.h * 1.3, vx: R(-.2, .2), vy: 0, vz: -R(.1, .25), g: .012, col: i % 2 ? YE : BL, t: 0, life: 30, size: 2 }); yield; }
  cf.dur = 0;
  // 9) el sol se apaga, el tallo vuelve a la tierra y quedan el charco verde y unas hojas caídas; los dos vuelven a su sitio
  plant.bud = 0;
  for (let i = 1; i <= 14; i++) { const k = i / 14; sun.beam = 1 - k; sun.k = 1 - k; plant.bloom = 1 - k; plant.h = 1 - k * k; plant.leaves = 1 - k; vst.alpha = 1 - k; if (i % 3 === 0) B.particles.push({ wx: sp[0] + R(-8, 8), wy: sp[1] + R(-3, 3), wz: plant.h * 40 + 6, vx: R(-.3, .3), vy: 0, vz: -R(.2, .4), g: .012, col: i % 2 ? YE : LP.hi, t: 0, life: 30, size: 2 }); yield; }
  sf.dur = 0; pl.dur = 0; pf.dur = 0; vg.dur = 0; vc.dur = 0;
  mark({ kind: 'pool', p: [sp[0], sp[1] + 2, 0], w: 16, col: LP.sh, grow: 6, life: 260, under: true });
  for (let i = 0; i < 4; i++) mark({ kind: 'blob', p: [sp[0] + R(-14, 14), sp[1] + R(-6, 6), 0], w: 5, col: i % 2 ? LP.base : LP.hi, grow: 4, life: 240, seed: 11 + i, under: true });
  users.forEach(u => u.pose = 'hop'); for (let i = 1; i <= 12; i++) { const k = i / 12, z = Math.sin(k * Math.PI) * 12; blu.wx = lerp(bx, blu.hx, k); blu.wy = lerp(by, blu.hy, k); yel.wx = lerp(ax, yel.hx, k); yel.wy = lerp(ay, yel.hy, k); blu.wz = yel.wz = z; yield; }
  users.forEach(u => { u.wz = 0; u.pose = 'idle'; u.wx = u.hx; u.wy = u.hy; }); yield* wait(6); camReset();
}
const i2 = (a, b) => Math.random() < .5 ? a : b;
function* techEclipse(users, t, tech, col) { // Carmín levanta un sol rojo y Añil una luna azul; la luna cruza el cielo, tapa al sol, la sombra barre el campo y en la totalidad el disco violeta cae como un tampón
  const VI = C('violeta'), red = users.find(u => u.id === 'carmin') || users[0], blue = users.find(u => u.id === 'anil') || users[1] || users[0];
  camFocus(t.wx, t.wy, { dist: 100, turn: -.25, h: 62, pitch: .58, f: 160 }); users.forEach(u => u.pose = 'charge');
  const dark = overlay(999, '#0b0912', .72, 40, 14), stars = fx(999, () => { const k = clamp(stars.t / 40, 0, 1), rnd = seeded(77); g.fillStyle = '#f4f0ea'; for (let i = 0; i < 26; i++) { const sx = rnd() * W, sy = rnd() * 60, tw = (Math.sin(stars.t * .2 + i) + 1) * .5; if (rnd() < k) { g.globalAlpha = k * (.4 + tw * .6); g.fillRect(sx | 0, sy | 0, 1, 1); } } g.globalAlpha = 1; });
  // discos en pantalla: nacen sobre la cabeza de cada uno y suben al cielo
  const sun = { x: 0, y: 0, r: 4 }, moon = { x: 0, y: 0, r: 4 }, st = { tot: 0, corona: 0 };
  const rs = PJ(above(red, 1)), bs = PJ(above(blue, 1)); sun.x = rs[0]; sun.y = rs[1] - 6; moon.x = bs[0]; moon.y = bs[1] - 6;
  const SUNX = W * .38, MOONX = W * .68, SKYY = 34;
  const discs = fx(999, () => {
    // sol: disco rojo con rayos
    const rp = ramp(C('rojo')), bp = ramp(C('azul'));
    for (let i = 0; i < 12; i++) { const a = i * .52 + discs.t * .03, L = sun.r * (1.5 + .25 * Math.sin(discs.t * .3 + i)); g.strokeStyle = rp.hi; g.globalAlpha = .5; g.lineWidth = 1; g.beginPath(); g.moveTo(sun.x + Math.cos(a) * sun.r, sun.y + Math.sin(a) * sun.r); g.lineTo(sun.x + Math.cos(a) * L, sun.y + Math.sin(a) * L); g.stroke(); } g.globalAlpha = 1;
    g.fillStyle = rp.out; g.beginPath(); g.arc(sun.x, sun.y, sun.r + 1, 0, 6.29); g.fill(); g.fillStyle = rp.base; g.beginPath(); g.arc(sun.x, sun.y, sun.r, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.beginPath(); g.arc(sun.x - sun.r * .3, sun.y - sun.r * .3, sun.r * .45, 0, 6.29); g.fill();
    // corona violeta en la totalidad
    if (st.corona > 0) { for (let i = 0; i < 16; i++) { const a = i * .39 + discs.t * .05, L = sun.r * (1.6 + st.corona * 1.2 + .3 * Math.sin(discs.t * .4 + i * 2)); g.strokeStyle = i % 2 ? VI : '#f4f0ea'; g.globalAlpha = st.corona * .8; g.lineWidth = 2; g.beginPath(); g.moveTo(sun.x + Math.cos(a) * (sun.r + 1), sun.y + Math.sin(a) * (sun.r + 1)); g.lineTo(sun.x + Math.cos(a) * L, sun.y + Math.sin(a) * L); g.stroke(); } g.globalAlpha = 1; }
    // luna: disco azul con cráteres; donde se solapa con el sol, violeta
    g.fillStyle = bp.out; g.beginPath(); g.arc(moon.x, moon.y, moon.r + 1, 0, 6.29); g.fill(); g.fillStyle = bp.base; g.beginPath(); g.arc(moon.x, moon.y, moon.r, 0, 6.29); g.fill(); g.fillStyle = bp.sh; g.beginPath(); g.arc(moon.x + moon.r * .3, moon.y + moon.r * .2, moon.r * .25, 0, 6.29); g.fill(); g.beginPath(); g.arc(moon.x - moon.r * .2, moon.y - moon.r * .4, moon.r * .18, 0, 6.29); g.fill(); g.fillStyle = bp.hi; g.beginPath(); g.arc(moon.x - moon.r * .35, moon.y - moon.r * .3, moon.r * .3, 0, 6.29); g.fill();
    const d = Math.hypot(sun.x - moon.x, sun.y - moon.y); if (d < sun.r + moon.r) { g.save(); g.beginPath(); g.arc(sun.x, sun.y, sun.r, 0, 6.29); g.clip(); g.fillStyle = VI; g.beginPath(); g.arc(moon.x, moon.y, moon.r, 0, 6.29); g.fill(); g.fillStyle = ramp(VI).hi; g.globalAlpha = .6; g.beginPath(); g.arc(moon.x - moon.r * .3, moon.y - moon.r * .3, moon.r * .3, 0, 6.29); g.fill(); g.globalAlpha = 1; g.restore(); }
  });
  Audio.sfx('charge', { semi: 0 }); Audio.sfx('charge', { semi: 7, when: .1 });
  for (let i = 1; i <= 30; i++) { const k = i / 30, e = k * k * (3 - 2 * k); sun.x = lerp(rs[0], SUNX, e); sun.y = lerp(rs[1] - 6, SKYY, e); sun.r = 4 + e * 12; moon.x = lerp(bs[0], MOONX, e); moon.y = lerp(bs[1] - 6, SKYY, e); moon.r = 4 + e * 12; users.forEach(u => u.wz = Math.sin(i * .5) * 2);
    if (i % 3 === 0) { B.particles.push({ wx: red.wx + R(-6, 6), wy: red.wy, wz: red.def.h, vx: 0, vy: 0, vz: R(1, 2), g: -.02, col: C('rojo'), t: 0, life: 16 }); B.particles.push({ wx: blue.wx + R(-6, 6), wy: blue.wy, wz: blue.def.h, vx: 0, vy: 0, vz: R(1, 2), g: -.02, col: C('azul'), t: 0, life: 16 }); } yield; }
  users.forEach(u => u.wz = 0); yield* wait(8);
  // la luna cruza y tapa al sol; la sombra del eclipse barre el suelo hacia el objetivo
  Audio.sfx('hum_down'); const pc = partyC(), shade = fx(999, () => { const k = clamp(shade.t / 40, 0, 1), c = PJ([lerp(pc[0], t.wx, k), lerp(pc[1], t.wy, k), 0]); g.fillStyle = 'rgba(11,9,18,.55)'; g.beginPath(); g.ellipse(c[0], c[1], 70 * c[2], 26 * c[2], 0, 0, 6.29); g.fill(); }, true);
  for (let i = 1; i <= 40; i++) { const k = i / 40, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; moon.x = lerp(MOONX, SUNX, e); st.tot = clamp((k - .75) / .25, 0, 1); if (i === 34) { Audio.sfx('glass'); B.hitstop = 6; } yield; }
  shade.dur = 0; st.corona = 1; Audio.sfx('mix', { colours: users.map(u => SEMI[u.id] ?? 0) }); B.flash = { col: VI, a: .5 }; B.slowmo = 14; B.shake = 3;
  for (let i = 0; i < 18; i++) { st.corona = 1 + Math.sin(i * .5) * .3; yield; }
  // totalidad: el disco cae sobre el objetivo como un tampón
  const drop = { k: 0 }, sh = shadowFx(t.wx, t.wy, 6, 999), goal = PJ(above(t, .5));
  const fall = fx(999, () => { const k = drop.k, x = lerp(SUNX, goal[0], k), y = lerp(SKYY, goal[1], k * k), r = lerp(16, 24, k); for (let j = 1; j <= 4; j++) { g.globalAlpha = .18 * (5 - j) / 4; g.fillStyle = VI; g.beginPath(); g.arc(lerp(SUNX, goal[0], Math.max(0, k - j * .06)), lerp(SKYY, goal[1], Math.pow(Math.max(0, k - j * .06), 2)), r, 0, 6.29); g.fill(); } g.globalAlpha = 1; g.fillStyle = ramp(VI).out; g.beginPath(); g.arc(x, y, r + 1, 0, 6.29); g.fill(); g.fillStyle = VI; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill(); g.fillStyle = ramp(VI).hi; g.beginPath(); g.arc(x - r * .3, y - r * .3, r * .3, 0, 6.29); g.fill(); });
  discs.dur = 0; Audio.sfx('drop_fall'); for (let i = 1; i <= 12; i++) { drop.k = i / 12; sh.draw = () => { const c = project(t.wx, t.wy, 0); if (c) shadow(c[0], c[1], Math.round((6 + drop.k * 30) * c[2])); }; yield; }
  fall.dur = 0; sh.dur = 0; Audio.sfx('impact_sub'); Audio.sfx('glass', { when: .1 }); B.hitstop = 12; B.shake = 9; B.slowmo = 16; B.flash = { col: '#f4f0ea', a: .6 };
  damage(t, baseDmg(users.reduce((s, u) => s + u.atk * statusMult(u, 'tiznado'), 0) / users.length, t.dfn, tech.power), col, 'Eclipse'); if (tech.status) applyStatus(t, tech.status, 3); goop(t, VI, 120); lensSplatter(VI, 7, 11);
  const ring = fx(24, () => { const c = project(t.wx, t.wy, 0); if (!c) return; const q = ring.t / 24; g.strokeStyle = VI; g.lineWidth = 3; g.globalAlpha = 1 - q; g.beginPath(); g.ellipse(c[0], c[1], (8 + q * 90) * c[2], (3 + q * 34) * c[2], 0, 0, 6.29); g.stroke(); g.strokeStyle = '#f4f0ea'; g.lineWidth = 1; g.beginPath(); g.ellipse(c[0], c[1], (4 + q * 70) * c[2], (2 + q * 26) * c[2], 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; }, true);
  mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: t.def.w * 1.1, col: ramp(VI).dk, grow: 3, life: 220, under: true }); mark({ kind: 'blob', p: [t.wx, t.wy, 0], w: t.def.w * .6, col: VI, grow: 3, life: 220, seed: 3, under: true });
  burst(t.wx, t.wy, 6, VI, 24, 2.6, 30, .1); burst(t.wx, t.wy, t.def.h, '#f4f0ea', 8, 1.5, 20, .05); drips(t.wx, t.wy, t.def.h * .9, VI, 10);
  yield* wait(30);
  // el cielo vuelve: el sol y la luna se deshacen en partículas que regresan a cada uno
  dark.dur = Math.min(dark.dur, dark.t + 16); stars.dur = Math.min(stars.dur, stars.t + 12);
  for (let i = 0; i < 14; i++) { B.particles.push({ wx: red.wx + R(-10, 10), wy: red.wy, wz: red.def.h + 30 - i * 2, vx: 0, vy: 0, vz: -R(.6, 1.4), g: .02, col: C('rojo'), t: 0, life: 18 }); B.particles.push({ wx: blue.wx + R(-10, 10), wy: blue.wy, wz: blue.def.h + 30 - i * 2, vx: 0, vy: 0, vz: -R(.6, 1.4), g: .02, col: C('azul'), t: 0, life: 18 }); yield; }
  users.forEach(u => u.pose = 'idle'); yield* wait(10); camReset();
}
function* techArcoiris(users, targets, tech, col) { // los tres suben en triángulo y vierten su color en un orbe blanco; nace un prisma que recibe la luz y la abre en seis haces hasta cada enemigo; un arco cruza el cielo y llueve color
  const ec = enemyC(), pc = partyC(), mid = [(ec[0] + pc[0]) / 2, (ec[1] + pc[1]) / 2]; camFocus(mid[0], mid[1], { dist: 120, turn: 0, h: 60, pitch: .42, f: 170, hy:104,subjects:users,points:[[mid[0],mid[1],72,25]] }); // cámara baja mirando al cielo: la órbita y el prisma quedan en plano
  const RB = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'].map(C);
  users.forEach(u => u.pose = 'charge'); Audio.sfx('charge', { semi: 0 }); Audio.sfx('charge', { semi: 4, when: .1 }); Audio.sfx('charge', { semi: 7, when: .2 });
  const home = users.map(u => [u.wx, u.wy]), orb = { wz: 72, r: 0, white: 0 };
  const orbFx = fx(999, () => { if (orb.r <= 0) return; const c = PJ([mid[0], mid[1], orb.wz]), r = orb.r * c[2]; g.fillStyle = orb.white > 0 ? `rgba(244,240,234,${orb.white})` : 'rgba(244,240,234,.5)'; g.beginPath(); g.arc(c[0], c[1], r, 0, 6.29); g.fill(); users.forEach((u, j) => { g.globalAlpha = .7 * (1 - orb.white); g.fillStyle = C(u.color); g.beginPath(); g.arc(c[0] + Math.cos(orbFx.t * .2 + j * 2.09) * r * .4, c[1] + Math.sin(orbFx.t * .2 + j * 2.09) * r * .4, r * .45, 0, 6.29); g.fill(); }); g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(c[0], c[1], r + 1, 0, 6.29); g.stroke(); });
  // 1) suben en triángulo girando cada vez más rápido y vierten su color
  for (let i = 0; i < 56; i++) { const k = i / 56; users.forEach((u, j) => { const a = k * k * 18 + j * 2.09, r = lerp(34, 16, k); u.wx = lerp(home[j][0], mid[0] + Math.cos(a) * r, Math.min(1, k * 3)); u.wy = lerp(home[j][1], mid[1] + Math.sin(a) * r * .6, Math.min(1, k * 3)); u.wz = 18 + k * 48 + Math.sin(a) * 4; if (i > 14 && i % 2 === 0) B.particles.push({ wx: u.wx, wy: u.wy, wz: u.wz + u.def.h * .5, tx: mid[0], ty: mid[1], tz: orb.wz, col: C(u.color), t: 0, life: 12, dur: 12, arc: 0, stream: true }); }); if (i > 14) orb.r = Math.min(14, orb.r + .5); yield; }
  Audio.sfx('mix', { colours: users.map(u => SEMI[u.id] ?? 0) }); B.slowmo = 10; for (let i = 1; i <= 10; i++) { orb.white = i / 10; orb.r = 14 + i; yield; }
  camFocus(ec[0], ec[1], { dist: 130, turn: -.15, h: 64, pitch: .5, hy:96,f:165,subjects:targets,points:[[mid[0],mid[1],72,25]] }); // giro suave hacia los enemigos con el prisma aún alto en plano
  // 2) papel: la pantalla se vuelve hoja en blanco y el orbe cristaliza en un prisma
  const paper = overlay(999, '#f1e9d6', .82, 12, 18); B.flash = { col: '#ffffff', a: .9 }; Audio.sfx('glass'); Audio.sfx('rainbow');
  orbFx.dur = 0; const pr = { spin: 0, k: 0, beams: 0 }, prismP = () => PJ([mid[0], mid[1], orb.wz]);
  const prism = fx(999, () => { const c = prismP(), s = c[2] * 18, a = pr.spin, pts = [[0, -1.1], [1, .7], [-1, .7]].map(([x, y]) => [c[0] + (x * Math.cos(a) - y * Math.sin(a)) * s, c[1] + (x * Math.sin(a) + y * Math.cos(a)) * s * .9]);
    // luz blanca que entra desde arriba
    if (pr.k > 0) { g.globalAlpha = .55 * pr.k; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(c[0] - 3, -2); g.lineTo(c[0] + 3, -2); g.lineTo(c[0] + 1, c[1] - s); g.lineTo(c[0] - 1, c[1] - s); g.closePath(); g.fill(); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(244,240,234,.85)'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.closePath(); g.fill(); g.strokeStyle = '#2a2438'; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[0][0] + 2, pts[0][1] + 4); g.lineTo(pts[2][0] + 5, pts[2][1] - 3); g.stroke();
    // seis haces abriéndose hasta cada enemigo
    if (pr.beams > 0) for (const t of targets) { const e = PJ([t.wx, t.wy, 0]), w = t.def.w * .6 * e[2]; for (let j = 0; j < 6; j++) { const q = clamp(pr.beams - j * .06, 0, 1); if (q <= 0) continue; const x0 = c[0] + (j - 2.5) * 2, y0 = c[1] + 4, x1 = lerp(x0, e[0] + (j - 2.5) * (w / 3), q), y1 = lerp(y0, e[1] - 2, q); g.globalAlpha = .55 + .2 * Math.sin(prism.t * .4 + j); g.fillStyle = RB[j]; g.beginPath(); g.moveTo(x0 - 1, y0); g.lineTo(x0 + 1, y0); g.lineTo(x1 + w / 6 * .8, y1); g.lineTo(x1 - w / 6 * .8, y1); g.closePath(); g.fill(); } g.globalAlpha = 1; }
  });
  for (let i = 1; i <= 16; i++) { pr.spin += .35; pr.k = i / 16; yield; }
  for (let i = 1; i <= 24; i++) { pr.spin += .12; pr.beams = i / 20; if (i % 4 === 0) Audio.sfx('cursor', { semi: [0, 2, 4, 5, 7, 9][(i / 4 - 1) % 6], vol: .5 }); yield; }
  // 3) los enemigos se pintan de arriba abajo con todos los colores y estallan
  B.slowmo = 12; for (let i = 0; i < 30; i++) { for (const t of targets) { t.goop = null; goop(t, RB[i % 6], 30); if (i === 12) { B.shake = 6; damage(t, baseDmg(users.reduce((s, u) => s + u.atk * statusMult(u, 'tiznado'), 0) / users.length, t.dfn, tech.power), col, 'Arcoíris'); } if (i % 3 === 0) burst(t.wx, t.wy, t.def.h * .6, RB[i % 6], 6, 1.6, 22, .05); } pr.spin += .2; yield; }
  // 4) el arco cruza el cielo y llueve color; charcos de seis colores
  prism.dur = 0; paper.dur = Math.min(paper.dur, paper.t + 30); B.rainbow = 40; Audio.sfx('rainbow'); Audio.sfx('heal_bells', { when: .4 }); camFocus(mid[0], mid[1], { dist:110,turn:.2,h:64,pitch:.5,hy:100,f:175,subjects:targets }); // el arco ocupa el cielo sin empequeñecer ambos bandos
  const arc = fx(90, () => { const k = clamp(arc.t / 30, 0, 1), fade = arc.t > 70 ? (90 - arc.t) / 20 : 1; g.globalAlpha = fade * .9; RB.forEach((cc, j) => { g.strokeStyle = cc; g.lineWidth = 4; g.beginPath(); g.ellipse(W / 2, 128, 150 - j * 4, 104 - j * 4, 0, Math.PI, Math.PI + Math.PI * k); g.stroke(); }); const rnd = seeded(arc.t >> 2); g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = Math.PI + rnd() * Math.PI * k, r = 150 - rnd() * 24; const x = W / 2 + Math.cos(a) * r, y = 128 + Math.sin(a) * r * .69; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } g.globalAlpha = 1; });
  for (let i = 0; i < 40; i++) { for (let j = 0; j < 3; j++) B.particles.push({ wx: ec[0] + R(-70, 70), wy: ec[1] + R(-30, 30), wz: 80 + R(0, 20), vx: 0, vy: 0, vz: -R(1.5, 2.5), g: .05, col: RB[RI(0, 5)], t: 0, life: 40, size: 2 }); if (i % 5 === 0) mark({ kind: 'pool', p: [ec[0] + R(-60, 60), ec[1] + R(-24, 24), 0], w: R(6, 12), col: RB[i / 5 % 6 | 0], grow: 8, life: 200, under: true }); yield; }
  users.forEach((u, j) => { u.pose = 'happy'; }); for (let i = 1; i <= 14; i++) { users.forEach((u, j) => { const k = i / 14; u.wx = lerp(u.wx, u.hx, .2); u.wy = lerp(u.wy, u.hy, .2); u.wz = Math.max(0, (1 - k) * 30 * (1 - k)); }); yield; }
  users.forEach(u => { u.wx = u.hx; u.wy = u.hy; u.wz = 0; }); yield* wait(20); users.forEach(u => u.pose = 'idle'); camReset();
}
// =====================================================================
// Despacho de acciones
// =====================================================================
function* actAttack(u, target) {
  const t = target;
  if (u.kind === 'party') { if (u.data.weapon === 'brocha') yield* atkBrocha(u, t); else if (u.data.weapon === 'lapiz') yield* atkLapiz(u, t); else if (u.data.weapon === 'pluma') yield* atkPluma(u, t); else yield* atkPincel(u, t); return; }
  yield* enemyAttack(u, t);
}
function* actTech(users, tech, targets, col) {
  const id = Object.keys(DATA.techs).find(k => DATA.techs[k] === tech);
  if (id === 'brochazo') yield* techBrochazo(users[0], targets[0], tech, col);
  else if (id === 'tachon') yield* techTachon(users[0], targets[0], tech, col);
  else if (id === 'manchurron') yield* techManchurron(users[0], targets[0], tech, col);
  else if (id === 'rafaga') yield* techRafaga(users[0], targets, tech, col);
  else if (id === 'trazo') yield* techTrazo(users[0], targets[0], tech, col);
  else if (id === 'punteado') yield* techPunteado(users[0], targets[0], tech, col);
  else if (id === 'aguada') yield* techAguada(users[0], targets, tech, col);
  else if (id === 'contorno') yield* techContorno(users[0], targets, tech, col);
  else if (id === 'salpicon') yield* techSalpicon(users[0], targets, tech, col);
  else if (id === 'firma') yield* techFirma(users[0], targets[0], tech, col);
  else if (id === 'taquigrafia') yield* techTaquigrafia(users[0], targets, tech, col);
  else if (id === 'caligrafia') yield* techCaligrafia(users[0], targets[0], tech, col);
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
  const it = DATA.items[itemId]; Game.inventory[itemId]--;
  camFocus(target.wx, target.wy, { dist: 80, turn: target.kind === 'party' ? .4 : -.2, h: 46 }); yield* anticipate(u, 10); u.pose = 'attack'; yield* wait(6);
  if (it.kind === 'revive') {
    target.alive = true; target.hp = Math.max(1, Math.round(target.maxhp * it.amount)); target.atb = 25; target.status = {}; target.pose = 'happy';
    Audio.sfx('heal_bells'); burst(target.wx, target.wy, 3, C(target.color), 20, 1.6, 30, .05); num(target, '+' + target.hp, C('verde')); yield* wait(24);
  } else if (it.kind === 'heal') { // una nube dibujada a lápiz llueve sobre el aliado
    const cl = fx(999, () => { const c=PJ([target.wx,target.wy,0]);c[1]-=(target.def.h+34)*c[2]; const s = c[2]; g.strokeStyle = GRAPHITE; g.lineWidth = 1; g.beginPath(); [[-12, 4, 7], [-4, -2, 9], [6, 0, 8], [12, 6, 6]].forEach(([dx, dy, r]) => { g.moveTo(c[0] + (dx + r) * s, c[1] + dy * s); g.arc(c[0] + dx * s, c[1] + dy * s, r * s, 0, 6.29); }); g.stroke(); g.fillStyle = '#e9e1cc'; g.globalAlpha = .6; [[-12, 4, 6], [-4, -2, 8], [6, 0, 7], [12, 6, 5]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(c[0] + dx * s, c[1] + dy * s, r * s, 0, 6.29); g.fill(); }); g.globalAlpha = 1; });
    sparkle(target.wx, target.wy, target.def.h + 34); Audio.sfx('drop_fall');
    yield* wait(8); for (let i = 0; i < 34; i++) { if (i % 2 === 0) B.particles.push({ wx: target.wx + R(-12, 12), wy: target.wy + R(-4, 4), wz: target.def.h + 30, vx: 0, vy: 0, vz: -R(1, 2), g: .1, col: C('azul'), t: 0, life: 20, size: 2 }); if (i === 18) { Audio.sfx('splash_clean'); heal(target, it.amount); goop(target, C('azul'), 40); } yield; }
    cl.dur = 0;
  } else if (it.kind === 'mp') { // el tubo se coloca encima, apunta abajo y se exprime como un bote de salsa
    const img = propSprite('tubo', C(target.color)), P = PROP.tubo; sparkle(target.wx, target.wy, target.def.h + 30);
    const tb = fx(999, () => { const sq = tb.t > 8 ? Math.sin(tb.t * .8) * .12 : 0, c=PJ([target.wx,target.wy,0]);c[1]-=(target.def.h+18-Math.min(8,tb.t)*1.5)*c[2];drawProp(img,c[0],c[1],P.a+sq,1,P.tip[0],P.tip[1],.85*c[2]); });
    Audio.sfx('squeeze'); yield* wait(8); Audio.sfx('plop', { when: .1 }); for (let i = 0; i < 16; i++) { B.particles.push({ wx: target.wx + R(-2, 2), wy: target.wy, wz: target.def.h + 12, vx: R(-.4, .4), vy: 0, vz: -R(.4, 1.4), g: .1, col: C(target.color), t: 0, life: 18, size: 3 }); yield; }
    tb.dur = 0; heal(target, it.amount, true); goop(target, C(target.color), 50);
  } else { // la goma: el enemigo se vuelve un dibujo a lápiz y se borra en virutas
    const img = propSprite('goma'), P = PROP.goma, rub = { x: 0 }, gm = fx(999, () => { const c = PJ([target.wx, target.wy, target.def.h * .55]); drawProp(img, c[0] + rub.x, c[1], 0.25, 1, P.tip[0], P.tip[1], 1.2 * c[2]); });
    sparkle(target.wx, target.wy, target.def.h + 6); target.goop = null; target.sketch = 1;
    for (let i = 0; i < 26; i++) { rub.x = Math.sin(i * .75) * 10; if (i > 8) target.erasing = true; if (i % 2 === 0) B.particles.push({ wx: target.wx + R(-6, 6), wy: target.wy, wz: target.def.h * .3, vx: R(-.6, .6), vy: 0, vz: R(0, 1.2), g: .12, col: i % 4 ? '#e86a8a' : '#f4f0ea', t: 0, life: 22 }); if (i % 6 === 0) Audio.sfx('rub'); if (i % 8 === 4) Audio.sfx('crumbs'); yield; }
    gm.dur = 0; target.erasing = false; target.sketch = 0;
    const d = target.color === 'negro' ? it.amount : Math.round(it.amount / 3); damage(target, d, 'negro', u.name, { noPaint: true });
  }
  yield* wait(12); u.pose = 'idle'; yield* wait(8); camReset();
}
// =====================================================================
// Enemigos: cada forma ataca como lo que es
// =====================================================================
function* enemyAttack(u, t) {
  const shape = u.data.shape, quick = !u.boss;
  setActionShot('source',[u],{dist:83,turn:-.18,headroom:14});
  if (shape === 'round') { // salta alto y se estampa contra el objetivo (planchazo)
    yield* anticipate(u, quick ? 12 : 14); setActionShot('target',[t],{dist:84,turn:.2,headroom:26}); u.pose = 'attack'; const sh = shadowFx(t.wx, t.wy, 4, 999), flight = quick ? 16 : 20;
    for (let i = 1; i <= flight; i++) { const k = i / flight; u.wx = lerp(u.hx, t.wx, k); u.wy = lerp(u.hy, t.wy - 2, k); u.wz = Math.sin(k * Math.PI) * 60; sh.draw = () => { const c = project(t.wx, t.wy, 0); if (c) shadow(c[0], c[1], Math.round((4 + k * 16) * c[2])); }; yield; }
    sh.dur = 0; u.wz = 0; B.shake = quick ? 3 : 6; Audio.sfx('ink_tide', { vol: .7 }); hitBasic(u, t); goop(t, C('negro'), 60); mark({ kind: 'blob', p: [t.wx, t.wy, 0], w: 12, col: C('negro'), seed: 7, life: 90, under: true });
    yield* wait(quick ? 6 : 16); yield* whop(u, u.hx, u.hy, quick ? 10 : 12, 22);
  } else if (shape === 'splash') { // escupe tres pegotes en arco
    yield* anticipate(u, 10); setActionShot('target',[t],{dist:80,turn:-.12,headroom:24}); u.pose = 'attack'; for (let k = 0; k < 3; k++) { Audio.sfx('ink_jet', { pan: -.3 }); const p = { wx: u.wx, wy: u.wy, wz: u.def.h * .5, tx: t.wx + R(-4, 4), ty: t.wy + R(-3, 3), tz: t.def.h * .5, col: C('negro'), t: 0, life: 12, dur: 12, arc: 26, stream: true, size: 3 }; B.particles.push(p); u.wz = 4; yield* wait(5); u.wz = 0; yield* wait(9); burst(t.wx, t.wy, t.def.h * .5, C('negro'), 5, 1.2, 14, .1); if (k === 2) { hitBasic(u, t); goop(t, C('negro'), 60); lensSplatter('#1e1a2c', 5, 7); } else { t.pose = 'hurt'; t.poseT = 6; } }
    yield* wait(quick ? 4 : 8);
  } else if (shape === 'tall') { // embiste atravesando al objetivo y deja un tachón en el suelo
    yield* anticipate(u, 12); setActionShot('target',[t],{dist:78,turn:.24,headroom:10}); u.pose = 'attack'; Audio.sfx('dash'); const gh = ghostsOf(u); const to = fwdOf(t, -22);
    mark({ kind: 'path', pts: [[u.wx, u.wy, 0], [t.wx - 6, t.wy + 4, 0], [t.wx + 6, t.wy - 4, 0], [to[0], to[1], 0]], w: 4, col: C('negro'), grow: 8, life: 100, jit: 2, under: true });
    for (let i = 1; i <= 11; i++) { const k = i / 11; u.wx = lerp(u.hx, to[0], k); u.wy = lerp(u.hy, to[1], k); gh.add(); if (i === 6) { hitBasic(u, t); goop(t, C('negro'), 60); } yield; }
    gh.end(); yield* wait(quick ? 6 : 14); yield* whop(u, u.hx, u.hy, quick ? 10 : 12, 12);
  } else { // charco: se aplasta y manda una ola de tinta por el suelo
    yield* anticipate(u, 12); setActionShot('target',[t],{dist:82,turn:.18,headroom:12}); u.pose = 'hurt'; u.poseT = 24; Audio.sfx('ink_jet'); const wv = fx(999, () => { const k = clamp(wv.t / 22, 0, 1), c = PJ([lerp(u.wx, t.wx, k), lerp(u.wy, t.wy, k), 0]); g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(c[0], c[1], (14 + k * 8) * c[2], 6 * c[2], 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4460'; g.fillRect(Math.round(c[0] - 8 * c[2]), Math.round(c[1] - 8 * c[2]), Math.round(16 * c[2]), 2); }, true);
    for (let i = 0; i < 22; i++) { B.particles.push({ wx: lerp(u.wx, t.wx, i / 22), wy: lerp(u.wy, t.wy, i / 22), wz: 2, vx: 0, vy: 0, vz: R(.5, 1.5), g: .08, col: C('negro'), t: 0, life: 16 }); yield; }
    wv.dur = 0; hitBasic(u, t); goop(t, C('negro'), 70); mark({ kind: 'pool', p: [t.wx, t.wy + 2, 0], w: 14, col: '#1e1a2c', grow: 4, life: 100, under: true }); yield* wait(quick ? 6 : 12);
  }
  u.pose = 'idle'; u.wz = 0; yield* wait(quick ? 6 : 14); camReset();
}
function* actEnemy(u) {
  u.acts++;
  const targets = alive(B.party); if (!targets.length) return;
  const intent = u.intent || { kind: 'attack', target: targets[0] };
  const target = intent.target?.alive ? intent.target : targets[0];
  if(B.currentAction)B.currentAction.targets=intent.all?targets:[target];
  if (u.boss && intent.kind !== 'attack') { yield* bossSpecial(u, intent); return; }
  if (intent.kind === 'tiznar') {
    u.pose = 'attack'; Audio.sfx('ink_jet'); camFocus(target.wx, target.wy, { dist: 84, turn: .3, h: 46 }); stream(u, target, C('negro'), 14, 20); yield* wait(22);
    if (DATA.accessories[target.acc] && DATA.accessories[target.acc].immune === 'tiznado') { Audio.sfx('rub'); Audio.sfx('crumbs', { when: .2 }); const img = propSprite('goma'), gm = fx(14, () => { const c = PJ([target.wx, target.wy, target.def.h * .6]); drawProp(img, c[0] + Math.sin(gm.t) * 6, c[1], .25, 1, PROP.goma.tip[0], PROP.goma.tip[1], 1.1 * c[2]); }); burst(target.wx, target.wy, target.def.h * .5, '#e86a8a', 10, 1.2, 20, .1); yield* wait(14); }
    else { applyStatus(target, 'tiznado', 3); mark({ kind: 'blob', p: [target.wx, target.wy, target.def.h * .4], w: 10, col: C('negro'), seed: target.idx, life: 70 }); burst(target.wx, target.wy, target.def.h * .5, C('negro'), 12, 1.5); goop(target, C('negro'), 60); }
    u.pose = 'idle'; yield* wait(10); camReset(); return;
  }
  if (u.id === 'devoralineas' && typeof devoralineasStrike === 'function') yield* devoralineasStrike(u,target);
  else yield* actAttack(u, target);
}

// A basic fountain-pen strike writes a short flourish, distinct from a brush.
function* atkPluma(u, t) {
  camFocus(u.wx,u.wy,{dist:74,turn:.15}); yield* anticipate(u,12);
  camFocus(t.wx,t.wy,{dist:76,turn:-.2}); u.pose='attack'; Audio.sfx('scratch');
  const h=t.def.h, pts=[[t.wx-12,t.wy,h*.25],[t.wx-4,t.wy-4,h*.85],[t.wx+10,t.wy,h*.5],[t.wx,t.wy+3,h*.25],[t.wx+15,t.wy,h*.6]];
  yield* toolStroke({kind:'pluma',color:C(u.color),col:C(u.color),pts,w:2.5,frames:20,scale:.9,from:above(u,.8),hitAt:.65,
    contact:p=>{hitBasic(u,t,{point:p});sparkle(p[0],p[1],p[2],C(u.color));Audio.sfx('fwip',{vol:.35});}});
  yield* wait(18);u.pose='idle';camReset();
}
