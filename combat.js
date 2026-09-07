// Tactical rules and commands. All previews use the same rules as execution.
'use strict';
const PRIMARY = ['rojo', 'amarillo', 'azul'];
const STATUS_INFO = {
  lento: ['L', 'Lento: velocidad -40%'], tiznado: ['T', 'Tiznado: ataque -30%'],
  contorno: ['C', 'Contorno: daño recibido -40%'], firmado: ['F', 'Firmado: daño recibido +30%'],
  expuesto: ['E', 'Expuesto: coraza abierta'],
};
const ROLE_ACTIONS = {
  carmin: { name: 'Proteger', mp: 0, target: 'ally', desc: 'Cubre el próximo golpe. Recibe la mitad.' },
  ambar: { name: 'Interrumpir', mp: 2, target: 'enemy', desc: 'Golpe ligero. Corta una carga anunciada.' },
  anil: { name: 'Preparar', mp: 2, target: 'enemy', desc: 'Deja una capa azul para la siguiente mezcla.' },
};
const TECH_RULES = {
  brochazo: 'Golpe fuerte. Deja pintura roja.', tachon: 'Daño y Lento durante 3 acciones.',
  manchurron: 'Golpe fuerte y capa roja.', rafaga: 'Barre a todos. Deja una capa amarilla.',
  trazo: 'Dos golpes al mismo objetivo.', punteado: 'Cuatro golpes al mismo objetivo.',
  aguada: 'Moja a todos y aplica Lento: 3 acciones.', contorno: 'Grupo: daño recibido -40%, 3 acciones.',
  firma: 'Daño y Firmado: recibe +30%, 3 acciones.', taquigrafia: 'Tres golpes repartidos entre enemigos.',
  caligrafia: 'Cura 40% de vida y limpia los estados.', salpicon: 'Daño azul y pintura sobre todos.',
  llamarada: 'Daño naranja a todos los enemigos.', brote: 'Daño verde y cura 35% al grupo.',
  eclipse: 'Gran golpe violeta y Lento: 3 acciones.', arcoiris: 'Gran daño. Abre primero la coraza de La Tinta.',
};
function techCost(u, t) { return Math.max(1, t.mp - (DATA.accessories[u.acc]?.techDiscount || 0)); }
function isReserved(u) { return !!B.reservation && B.reservation.users.includes(u); }
function techsFor(u, ignoreReservation = false) {
  return Object.entries(DATA.techs).filter(([, t]) => t.weapon ? t.weapon === u.data.weapon && t.user === u.id : t.users.includes(u.id)).map(([id, t]) => {
    const users = t.weapon ? [u] : t.users.map(uid => B.party.find(p => p.id === uid));
    const living = users.every(p => p.alive), free = users.every(p => !p.acting && (ignoreReservation || !isReserved(p)));
    const ready = living && free && users.every(p => p.atb >= 100), mpOk = users.every(p => p.mp >= techCost(p, t));
    return { id, t, users, col: t.color || u.color, ready, mpOk, free, living, avail: ready && mpOk,
      reservable: users.length > 1 && living && free && mpOk && !B.reservation, cost: techCost(u, t), combo: users.length > 1 };
  });
}
function paintReaction(t, col) {
  if (!t.coat || !PRIMARY.includes(col) || t.coat.col === col) return null;
  return DATA.mix[[t.coat.col, col].sort().join('+')] || null;
}
function wouldExpose(t, col) { return t.boss && !t.status.expuesto && PRIMARY.includes(col) && (paintReaction(t, col) || colorMult(col, t.color) >= 2 || new Set([...t.shellHits, col]).size === 3); }
function attackMultiplier(t, col) {
  let mult = colorMult(col, t.color);
  // The prism is a finisher: a closed ink shell absorbs its white light.
  if (t.boss && !t.status.expuesto && t.bossPhase !== 2) mult *= col === 'blanco' ? .22 : .65;
  return mult;
}
function damageFactor(t, col) {
  return attackMultiplier(t, col) * (t.status.contorno ? .6 : 1) * (t.status.firmado && t.kind === 'enemy' ? 1.3 : 1);
}
function basicRaw(u, t) {
  return baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn * (u.kind === 'party' && u.data.weapon === 'lapiz' ? .65 : 1), 1);
}
function putCoat(t, col, turns = 2) {
  if (!t.alive || !PRIMARY.includes(col)) return;
  t.coat = { col, turns, max: turns, birth: B.t };
  goop(t, C(col), 48); burst(t.wx, t.wy, 1, C(col), 7, 1.1, 22, .08);
}
function interruptCharge(t, force = false) {
  if (!t.alive || t.kind !== 'enemy' || !t.intent || t.acting || t.atb < 55) return false;
  if (t.boss && !force && !t.status.expuesto) return false;
  t.atb = Math.min(t.atb, 38); t.intent = null; t.warned = false;
  num(t, 'CORTE', '#f2c93a'); say('¡Carga interrumpida!', C('amarillo'));
  B.stats.interrupts++; Audio.sfx('scratch_long', { vol: .7 }); Audio.sfx('glass', { when: .06, vol: .45 });
  burst(t.wx, t.wy, t.def.h * .5, '#f4f0ea', 12, 1.3, 22, .12);
  return true;
}
function exposeBoss(t) {
  if (!t.boss || t.status.expuesto) return;
  applyStatus(t, 'expuesto', 2); t.shellHits = [];
  B.party.filter(p => p.alive).forEach(p => heal(p, 2, true));
  say('¡Coraza abierta! Pigmento +2', C('amarillo')); Audio.sfx('glass');
  burst(t.wx, t.wy, t.def.h * .6, '#f4f0ea', 20, 2, 28, .1);
}
function bossPhaseCheck(t) {
  if (!t.boss || !t.alive) return;
  const next = t.hp <= Math.ceil(t.maxhp * .34) ? 3 : t.hp <= Math.ceil(t.maxhp * .67) ? 2 : 1;
  if (next === t.bossPhase) return;
  t.bossPhase = next; t.shellHits = []; t.coat = null; delete t.status.expuesto;
  t.intent = null; t.atb = 20; t.warned = false;
  t.color = next === 2 ? 'violeta' : 'negro'; t.def.core = next === 2 ? C(t.color) : null;
  say(t.name + (next === 2 ? ': núcleo expuesto' : ': borra el lienzo'), C('violeta'));
  B.phaseNotice = { name: t.data.phaseNames ? ['','I','II','III'][next]+' · '+t.data.phaseNames[next-1] : next === 2 ? 'II · NÚCLEO EXPUESTO' : 'III · EL ÚLTIMO BORRÓN', until: B.t + 150 };
  B.flash = { col: C('violeta'), a: .24 }; B.shake = 4; Audio.sfx('hum_down');
}
function paintOnHit(t, col, action) {
  if (!action || action.users[0].kind !== 'party' || t.kind !== 'enemy' || action.painted.has(t) || !PRIMARY.includes(col)) return null;
  action.painted.add(t);
  const reaction = paintReaction(t, col);
  if (t.boss) {
    if (!t.shellHits.includes(col)) t.shellHits.push(col);
    if (reaction || colorMult(col, t.color) >= 2 || t.shellHits.length === 3) exposeBoss(t);
  }
  if (reaction) {
    t.coat = null; B.stats.mixes++;
    num(t, DATA.colors[reaction].name.toUpperCase(), C(reaction));
    Audio.sfx('mix', { colours: [0, 4, 7].filter((_, i) => PRIMARY[i] === col || PRIMARY[i] === action.previousCoat), vol: .6 });
    burst(t.wx, t.wy, 4, C(reaction), 16, 1.6, 30, .06);
    B.paintEvents.push({ t, col: reaction, action });
    mark({ kind: 'pool', p: [t.wx, t.wy, 0], w: 16, col: C(reaction), life: 100, under: true });
  } else putCoat(t, col, action.users[0].data.weapon === 'pincel' ? 3 : 2);
  return reaction;
}
function flushPaintEvents() {
  const events = B.paintEvents.splice(0);
  for (const e of events) {
    if (e.col === 'verde') {
      if (e.t.alive) applyStatus(e.t, 'lento', 3);
      alive(B.party).forEach(p => heal(p, Math.round(p.maxhp * .08)));
      Audio.sfx('leaves', { vol: .7 });
    } else if (e.col === 'violeta') {
      if (e.t.alive) { applyStatus(e.t, 'firmado', 2); interruptCharge(e.t, true); }
    } else if (e.col === 'naranja') {
      const other = nearestEnemy(e.t);
      if (other) damage(other, 12, 'naranja', 'Reacción', { noPaint: true });
    }
  }
}
function nearestEnemy(t) { return alive(B.enemies).filter(x => x !== t).sort((a, b) => Math.hypot(a.wx - t.wx, a.wy - t.wy) - Math.hypot(b.wx - t.wx, b.wy - t.wy))[0]; }
function actionName(p, u) { return p.type === 'tech' ? DATA.techs[p.techId].name : p.type === 'item' ? DATA.items[p.item].name : p.type === 'role' ? ROLE_ACTIONS[u.id].name : p.type === 'reload' ? 'Recargar' : 'Atacar'; }
function actionTargetKind(p, u) {
  if (p.type === 'tech') return DATA.techs[p.techId].target;
  if (p.type === 'item') return DATA.items[p.item].target;
  if (p.type === 'role') return u.id === 'anil' && Game.studies.veladura ? 'enemies' : ROLE_ACTIONS[u.id].target;
  return p.type === 'reload' ? 'self' : 'enemy';
}
function validTargets(p, u) {
  const kind = actionTargetKind(p, u);
  return kind === 'fallen' ? B.party.filter(x => !x.alive) : kind === 'self' ? [u] : kind === 'ally' || kind === 'party' ? alive(B.party) : alive(B.enemies);
}
function targetGroup(p, u) { return ['enemies', 'party'].includes(actionTargetKind(p, u)); }
function selectedTargets(m) { const list = validTargets(m.pending, m.unit); return targetGroup(m.pending, m.unit) ? list : [list[Math.min(m.tidx || 0, list.length - 1)]].filter(Boolean); }
function previewAction(u, p, t) {
  const col = p.type === 'tech' ? DATA.techs[p.techId].color || u.color : u.color;
  if (!t) return { col, label: 'Sin objetivos', effect: '' };
  if (p.type === 'reload') return { col, label: '+6 MP', effect: 'Recupera pigmento. Consume tu turno.' };
  if (p.type === 'role' && u.id === 'carmin') return { col, label: 'Cubre 1 golpe', effect: 'Carmín lo recibe con un 50% menos de daño.' };
  if (p.type === 'role' && u.id === 'anil') return { col, label: 'Capa azul · 3 acciones', effect: 'Amarillo: raíces y cura. Rojo: ruptura.' };
  if (p.type === 'item') {
    const it = DATA.items[p.item];
    const amount = it.kind === 'revive' ? Math.round(t.maxhp * it.amount) : it.kind === 'heal' ? Math.min(it.amount, t.maxhp - t.hp) : it.kind === 'mp' ? Math.min(it.amount, t.maxmp - t.mp) : t.color === 'negro' ? it.amount : Math.round(it.amount / 3);
    return { col, label: it.kind === 'erase' ? Math.round(amount * damageFactor(t, 'negro') * .92) + '–' + Math.round(amount * damageFactor(t, 'negro') * 1.08) + ' daño' : '+' + amount + (it.kind === 'mp' ? ' MP' : ' HP'), effect: it.desc };
  }
  const tech = p.type === 'tech' && DATA.techs[p.techId];
  if (tech?.power === 0) return { col, label: tech.heal ? '+' + Math.min(Math.round(t.maxhp * tech.heal), t.maxhp - t.hp) + ' HP' : 'Daño recibido -40%', effect: TECH_RULES[p.techId] };
  const users = tech?.users ? tech.users.map(id => B.party.find(x => x.id === id)) : [u];
  const atk = users.reduce((sum, x) => sum + x.atk * statusMult(x, 'tiznado'), 0) / users.length;
  const raw = p.type === 'attack' ? basicRaw(u, t) : baseDmg(atk, t.dfn, tech ? tech.power : .65);
  const reaction = paintReaction(t, col);
  let hits = tech?.hits || 1;
  if (p.techId === 'taquigrafia') { const targets = alive(B.enemies), i = targets.indexOf(t); hits = Math.floor(3 / targets.length) + (i < 3 % targets.length ? 1 : 0); }
  // Multi-hit attacks only react on their first impact.
  let factor = damageFactor(t, col);
  if (wouldExpose(t, col)) factor = colorMult(col, t.color) * (t.status.contorno ? .6 : 1) * (t.status.firmado ? 1.3 : 1);
  const first = raw * factor * (reaction ? 1.25 : 1), rest = raw * factor * (reaction === 'violeta' && !t.status.firmado ? 1.3 : 1);
  const lo = Math.round(first * .92) + Math.round(rest * .92) * (hits - 1), hi = Math.round(first * 1.08) + Math.round(rest * 1.08) * (hits - 1);
  return { col, mult: wouldExpose(t, col) ? colorMult(col, t.color) : attackMultiplier(t, col), lo, hi, reaction, label: lo + '–' + hi + ' daño',
    effect: reaction ? 'Reacción ' + DATA.colors[reaction].name + ': ' + ({ naranja: 'salpica al vecino', verde: 'raíces + cura al grupo', violeta: 'interrumpe y debilita' }[reaction]) : p.type === 'role' ? ROLE_ACTIONS[u.id].desc : tech ? TECH_RULES[p.techId] : DATA.weapons[u.data.weapon].desc };
}
function openCmd(u) { B.menu = { unit: u, level: 'cmd', idx: u.lastCmd || 0, opened: B.t }; }
const PALETTE_TOOLS = [[25,17],[70,10],[96,40],[62,59],[23,51]];
function focusPaletteTool(m,idx) {
  if(B.menu!==m||m.level!=='cmd'||idx===m.idx)return false;
  m.idx=idx;m.unit.lastCmd=idx;Audio.sfx('cursor',semiOf(m.unit));return true;
}
function paletteNeighbor(idx,dx,dy) {
  const origin=PALETTE_TOOLS[idx];let best=idx,score=Infinity;
  PALETTE_TOOLS.forEach(([x,y],i)=>{
    const vx=x-origin[0],vy=y-origin[1],forward=vx*dx+vy*dy,cross=Math.abs(vx*dy-vy*dx);
    if(forward<=0||cross>forward*2)return;
    const distance=Math.hypot(vx,vy)+cross*1.5;
    if(distance<score){best=i;score=distance;}
  });return best;
}
function readyPainters() { return B.party.filter(u=>u.alive&&u.atb>=100&&!u.acting&&!isReserved(u)); }
function canChangeBattlePainter() { return B.phase==='fight'&&!Game.overlay&&!B.currentAction&&!B.actions.length&&!B.actQueue.length&&readyPainters().some(u=>u!==B.menu?.unit); }
function selectBattlePainter(u) {
  if(Game.overlay||B.phase!=='fight'||B.currentAction||B.actions.length||B.actQueue.length||!readyPainters().includes(u))return false;
  if(B.menu?.level==='cmd'&&B.menu.unit===u)return false;
  B.queue=[u,...B.queue.filter(q=>q!==u)];openCmd(u);Audio.sfx('page');return true;
}
function cycleBattlePainter() {
  if(!canChangeBattlePainter())return false;
  const ready=readyPainters();
  return selectBattlePainter(ready[(ready.indexOf(B.menu?.unit)+1)%ready.length]);
}
function beginTarget(m, p) {
  m.returnLevel=m.level;m.returnIdx=m.idx;
  m.pending = p; m.level = 'target'; m.tidx = 0; m.targets = validTargets(p, m.unit);
  if (!m.targets.length) { m.level = m.returnLevel; say('No hay un objetivo válido'); Audio.sfx('nope'); }
}
function commandRows(u) { return [['attack', 'Atacar', u.data.weapon], ['tech', 'Técnicas', 'tech'], ['item', 'Objetos', 'item'], ['role', ROLE_ACTIONS[u.id].name, 'pincel'], ['reload', 'Recargar', 'item']]; }
function updateBattleMenu() {
  const m = B.menu, u = m.unit;
  if (!u.alive || u.acting || isReserved(u)) { B.menu = null; return; }
  // Swapping is navigation, so it never commits or consumes the selected action.
  if(hit('swap')){cycleBattlePainter();return;}
  const down=hit('down'),up=hit('up'),step=down?1:up?-1:0;
  if (m.level === 'cmd') {
    const rows=commandRows(u),right=hit('right'),left=hit('left');
    if(hit('back'))return;
    if(step||left||right)focusPaletteTool(m,paletteNeighbor(m.idx,right?1:left?-1:0,step));
    if (!hit('ok')) return;
    const type = rows[m.idx][0];
    if (type === 'tech' || type === 'item') { m.level = type; m.idx = 0; }
    else if (type === 'role' && u.mp < ROLE_ACTIONS[u.id].mp) { say('Falta pigmento'); Audio.sfx('nope'); return; }
    else beginTarget(m, { type });
    Audio.sfx('confirm', semiOf(u)); return;
  }
  if (m.level === 'tech' || m.level === 'item') {
    m.list = m.level === 'tech' ? techsFor(u) : Object.entries(Game.inventory).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, it: DATA.items[id] }));
    if (hit('back')) { m.idx = m.level === 'tech' ? 1 : 2; m.level = 'cmd'; Audio.sfx('cancel'); return; }
    if (!m.list.length) return;
    if (step) { m.idx = (m.idx + step + m.list.length) % m.list.length; Audio.sfx('cursor', semiOf(u)); }
    m.idx = Math.min(m.idx, m.list.length - 1);
    if (!hit('ok')) return;
    const e = m.list[m.idx];
    if (m.level === 'tech' && !e.avail && !e.reservable) { say(!e.living ? 'Un compañero está caído' : !e.free ? 'Compañero reservado' : 'Falta pigmento'); Audio.sfx('nope'); return; }
    beginTarget(m, m.level === 'tech' ? { type: 'tech', techId: e.id } : { type: 'item', item: e.id }); Audio.sfx('confirm', semiOf(u)); return;
  }
  if (m.level === 'target') {
    m.targets = validTargets(m.pending, u);
    if (!m.targets.length) { m.level = 'cmd'; m.idx = 0; return; }
    if (!targetGroup(m.pending, u)) {
      const dir = step || (hit('right') ? 1 : hit('left') ? -1 : 0);
      m.tidx = (m.tidx + dir + m.targets.length) % m.targets.length;
      if (dir) Audio.sfx('cursor', semiOf(u));
    }
    if (hit('back')) { m.level = m.returnLevel||(['tech', 'item'].includes(m.pending.type)?m.pending.type:'cmd'); m.idx = m.returnIdx??0; Audio.sfx('cancel'); return; }
    if (hit('ok')) commit(selectedTargets(m));
  }
}
function cancelReservation(message = 'Mezcla liberada') {
  if (!B.reservation) return;
  B.reservation = null; say(message); Audio.sfx('cancel'); rebuildReadyQueue();
}
function rebuildReadyQueue() {
  B.queue = B.queue.filter(u => u.alive && u.atb >= 100 && !u.acting && !isReserved(u));
  for (const u of B.party) if (u.alive && u.atb >= 100 && !u.acting && !isReserved(u) && !B.queue.includes(u)) B.queue.push(u);
}
function commit(targets) {
  const m = B.menu; if (!m || !targets.length) return;
  const p = m.pending, u = m.unit;
  if (p.type === 'tech') {
    const e = techsFor(u).find(e => e.id === p.techId);
    if (!e?.avail) {
      if (!e?.reservable) { say('La técnica ya no está disponible'); Audio.sfx('nope'); return; }
      B.reservation = { p: { ...p }, leader: u, users: e.users, targets: targets.slice() }; B.menu = null; rebuildReadyQueue();
      say('Preparando ' + e.t.name + ' · ' + keyLabel('release') + ' libera'); Audio.sfx('charge', { vol: .4 }); return;
    }
  }
  executeCommand(u, p, targets);
}
function executeCommand(u, p, targets, reserved = false) {
  let users = [u], col = u.color, t;
  if (p.type === 'tech') {
    const e = techsFor(u, reserved).find(e => e.id === p.techId);
    if (!e?.avail) return false;
    users = e.users; col = e.col; t = e.t;
  }
  if (users.some(x => !x.alive || x.atb < 100 || x.acting || (!reserved && isReserved(x)))) return false;
  const pool = validTargets(p, u);
  targets = targetGroup(p, u) ? pool : [pool.includes(targets[0]) ? targets[0] : pool[0]].filter(Boolean);
  if (!targets.length) return false;
  if (p.type === 'item' && !(Game.inventory[p.item] > 0)) return false;
  if (p.type === 'role' && u.mp < ROLE_ACTIONS[u.id].mp) return false;
  if (t) users.forEach(x => x.mp -= techCost(x, t));
  if (p.type === 'role') u.mp -= ROLE_ACTIONS[u.id].mp;
  const gen = p.type === 'attack' ? actAttack(u, targets[0]) : p.type === 'tech' ? actTech(users, t, targets, col) : p.type === 'item' ? actItem(u, p.item, targets[0]) : actSupport(u, p.type, targets);
  if (reserved) B.reservation = null;
  users.forEach(x => { x.atb = 0; x.acting = true; });
  B.menu = null; rebuildReadyQueue();
  B.actQueue.push(tracked(u, gen, users, p, targets)); B.busy = true; Audio.sfx('confirm', semiOf(u)); return true;
}
function tickReservation() {
  const r = B.reservation; if (!r) return false;
  if (r.users.some(u => !u.alive || u.mp < techCost(u, DATA.techs[r.p.techId]))) { cancelReservation('Mezcla cancelada: falta una gota o MP'); return false; }
  if (!r.users.every(u => u.atb >= 100 && !u.acting)) return false;
  return executeCommand(r.leader, r.p, r.targets, true);
}
function planEnemy(u) {
  const targets = alive(B.party); if (!targets.length) return;
  let target = pick(targets);
  if (u.ai === 'hunter') target = targets.slice().sort((a, b) => (a.hp / a.maxhp - b.hp / b.maxhp))[0];
  let kind = u.ai === 'tiznar' && u.acts % 2 === 0 ? 'tiznar' : 'attack';
  if (u.boss) kind = u.bossPhase === 1 ? (u.acts % 2 === 0 ? 'steal' : 'attack') : u.bossPhase === 2 ? (u.acts % 2 === 0 ? 'tide' : 'attack') : (u.acts % 3 === 2 ? 'erase' : 'tide');
  const names = { attack: { round: 'Planchazo', splash: 'Saliva de tinta', tall: 'Embestida', blob: 'Ola de tinta' }[u.data.shape], tiznar: 'Tiznar', steal: 'Robar pigmento', tide: 'Marea negra', erase: 'Borrar el lienzo' };
  u.intent = { kind, name: u.data.intentNames?.[kind] || names[kind], target, all: kind === 'tide' || kind === 'erase' }; u.warned = true;
  Audio.sfx('enemy_soon', { vol: u.boss ? .7 : .4 });
}
function battleClockStopped() {
  // A full brush never holds up the other painters. Wait only pauses a detailed
  // choice; Active also runs while browsing techniques, items and targets.
  return !!Game.overlay || B.actions.length > 0 || B.actQueue.length > 0 || !!B.menu && !ATB_ACTIVE && B.menu.level !== 'cmd';
}
function menuCameraSubjects(m) {
  if(!m||Prefs.camera==='fija')return null;
  return m.level==='target'&&m.pending?validTargets(m.pending,m.unit):[m.unit];
}
// The palette stays close to its painter. Target selection frames the recipient
// team together, so moving the cursor never makes its neighbours disappear.
function menuCameraPose(m) {
  const r = SCENE.rest;
  const subjects=menuCameraSubjects(m);
  if(subjects){
    const targeting=m.level==='target',party=subjects[0]?.kind==='party';
    return fitCameraSubjects(subjects,{home:true,yaw:party?cameraPartyYaw():r.yaw,dist:78,
      zoom:subjects.length>1?1.35:1.8,headroom:6,box:targeting?[25,36,295,113]:[124,40,300,B.reservation?125:133]});
  }
  if(m?.level==='target'&&m.pending){
    const targets=validTargets(m.pending,m.unit),party=targets[0]?.kind==='party';
    return fitCameraSubjects(targets,{home:true,yaw:party&&Prefs.camera!=='fija'?cameraPartyYaw():r.yaw,dist:82,zoom:1.2,headroom:5,box:[17,34,303,114]});
  }
  const box = !m ? [12, 34, 308, B.reservation ? 125 : 145] : m.level === 'cmd' ? [124, 34, 310, B.reservation ? 125 : 143] : m.level === 'target' ? [12, 32, 308, 119] : [119, 41, 310, 140];
  const rects = B.units.filter(u => u.alive).map(u => {
    const p = project(u.hx, u.hy, 0, r), s = p[2] * (u.kind === 'enemy' ? u.boss ? 1.35 : 1.6 : 1);
    return [p[0] - u.def.w * s * .5 - 5, p[1] - u.def.h * s - 4, p[0] + u.def.w * s * .5 + 5, p[1] + 5];
  });
  const bounds = [Math.min(...rects.map(q => q[0])), Math.min(...rects.map(q => q[1])), Math.max(...rects.map(q => q[2])), Math.max(...rects.map(q => q[3]))];
  const scale = Math.min(1, (box[2] - box[0]) / (bounds[2] - bounds[0]), (box[3] - box[1]) / (bounds[3] - bounds[1]));
  return { ...r, f: r.f * scale, uiScale: scale, cx: (box[0] + box[2]) / 2 - ((bounds[0] + bounds[2]) / 2 - W / 2) * scale, hy: (box[1] + box[3]) / 2 - ((bounds[1] + bounds[3]) / 2 - r.hy) * scale };
}
function updateMenuCamera() {
  if (B.currentAction || B.actions.length || B.actQueue.length) { B.viewKey = null; return; }
  const m = B.menu, target=m?.level==='target', key = m ? [target?'target':Prefs.camera==='fija'?m.level:'choose',m.unit.id,target?validTargets(m.pending,m.unit).map(u=>u.kind+u.idx).join(','):'',Prefs.camera,!!B.reservation,alive(B.enemies).length,alive(B.party).length].join(':') : ['idle',Prefs.camera,!!B.reservation,alive(B.enemies).length].join(':');
  if (B.viewKey === key) return;
  B.viewKey = key;
  const pose = menuCameraPose(m);
  if (Prefs.camera === 'fija') camSet(pose); else camMenuTravel(pose,target?38:46);
}
function updateBattleClock() {
  if (hit('release')) cancelReservation();
  if (B.actions.length || B.actQueue.length) return;
  if (B.menu) updateBattleMenu();
  if (B.actions.length || B.actQueue.length || battleClockStopped() || B.t - B.fightStart < 40) return;
  for (const u of alive(B.units)) {
    if (u.acting) continue;
    const before = u.atb; u.atb = Math.min(100, u.atb + u.spd * statusMult(u, 'lento') * ATB_RATE);
    if (u.kind === 'party' && before < 100 && u.atb >= 100) { u.readyAt = B.t; Audio.sfx('ready', semiOf(u)); }
    if (u.kind === 'enemy' && u.atb >= 55 && !u.intent) planEnemy(u);
  }
  rebuildReadyQueue();
  if (tickReservation()) return;
  const e = alive(B.enemies).find(u => u.atb >= 100 && !u.acting);
  if (e) { if (!e.intent) planEnemy(e); e.atb = 0; e.acting = true; B.actQueue.push(tracked(e, actEnemy(e), [e], { type: 'enemy' })); B.busy = true; return; }
  if (!B.menu && B.queue.length) openCmd(B.queue[0]);
}
function* tracked(u, gen, users = [u], command = { type: 'attack' }, targets = []) {
  const snapshots = users.map(x => ({ ...x.status }));
  const revisions = users.map(x => ({ ...x.statusRevision }));
  const tier = command.type === 'tech' ? users.length : command.type === 'enemy' && u.intent?.all ? 2 : 0;
  if(!targets.length)targets=command.type==='enemy'?(u.intent?.all?alive(B.party):[u.intent?.target||alive(B.party)[0]].filter(Boolean)):validTargets(command,u).slice(0,1);
  B.currentAction = { users, targets:targets.slice(), command, tier, painted: new Set(), seen: Game.seenTechs.has(command.techId), title: command.type === 'enemy' ? u.intent?.name || 'Ataque' : actionName(command, u) };
  beginActionCamera(B.currentAction);
  users.forEach(x => { x.acting = true; x.warned = false; x.guard = null; });
  try { yield* wait(12); yield* gen; flushPaintEvents(); yield* wait(20); }
  finally {
    users.forEach((x, i) => {
      x.acting = false; x.gesture = null;
      for (const key in snapshots[i]) if (x.status[key] === snapshots[i][key] && x.statusRevision?.[key] === revisions[i][key] && --x.status[key] <= 0) delete x.status[key];
      if (x.kind === 'enemy') { if (x.coat && --x.coat.turns <= 0) x.coat = null; x.intent = null; }
    });
    if (command.techId) Game.seenTechs.add(command.techId);
    B.stats.actions++; B.currentAction = null; rebuildReadyQueue(); camReset();
  }
}
function* actSupport(u, type, targets) {
  say(u.name + ': ' + (type === 'reload' ? 'Recargar' : ROLE_ACTIONS[u.id].name), C(u.color));
  yield* anticipate(u, 8);
  if (type === 'reload') { heal(u, 6, true); sparkle(u.wx, u.wy, u.def.h); }
  else if (u.id === 'carmin') {
    u.guard = { target: targets[0], charges: 1 };
    if (Game.studies.relevo) heal(targets[0], 3, true);
    Audio.sfx('scratch'); mark({ kind: 'path', pts: [[u.wx, u.wy, 2], [targets[0].wx, targets[0].wy, 2]], col: C('rojo'), w: 2, life: 35, under: true });
    num(targets[0], 'CUBIERTO', C('rojo'));
  } else if (u.id === 'ambar') {
    const t = targets[0]; const cut = interruptCharge(t, true);
    damage(t, baseDmg(u.atk * statusMult(u, 'tiznado'), t.dfn, .65), u.color, u.name);
    if (cut && Game.studies.pulso) u.atb = 35;
    Audio.sfx('scratch_long');
  } else {
    targets.forEach(t => putCoat(t, 'azul', 3)); Audio.sfx('splash_clean');
  }
  flushPaintEvents(); yield* wait(18); u.pose = 'idle';
}
function* bossSpecial(u, intent) {
  say(u.name + ': ' + intent.name, C('violeta')); u.pose = 'charge';
  const pc=partyC();setActionShot('source',[u],{dist:92,turn:-.12});
  for (let i = 0; i < 20; i++) { if (i % 3 === 0) burst(u.wx, u.wy, 2, C('negro'), 4, 1, 22, -.03); yield; }
  setActionShot('target',intent.all?alive(B.party):[intent.target?.alive?intent.target:alive(B.party)[0]],{dist:84,turn:.16,headroom:18});
  if (intent.kind === 'steal') {
    const t = intent.target.alive ? intent.target : alive(B.party)[0];
    if (t) {
      stream(t, u, C(t.color), 14, 20); Audio.sfx('squeeze'); yield* wait(20);
      const stolen = Math.min(3, t.mp); t.mp -= stolen; num(t, '-' + stolen + ' MP', C(t.color));
      u.color = DATA.complement[t.color]; u.def.core = C(u.color); damage(t, 12, 'negro');
      say('Núcleo ' + DATA.colors[u.color].name + ' · débil a ' + DATA.colors[t.color].name);
    }
  } else {
    const wave = { k: 0 }, f = fx(999, () => { const c = PJ([lerp(u.wx, pc[0], wave.k), lerp(u.wy, pc[1], wave.k), 0]); g.fillStyle = '#292339'; g.beginPath(); g.ellipse(c[0], c[1], (20 + wave.k * 60) * c[2], (5 + wave.k * 18) * c[2], 0, 0, 6.29); g.fill(); g.strokeStyle = '#aaa0bd'; g.lineWidth = 1; g.stroke(); }, true);
    Audio.sfx('ink_jet'); for (let i = 1; i <= 24; i++) { wave.k = i / 24; yield; } f.dur = 0;
    if (intent.kind === 'erase') { B.enemies.forEach(t => t.coat = null); B.marks = []; Audio.sfx('rub'); }
    B.shake = 5; B.flash = { col: '#292339', a: .3 }; Audio.sfx('ink_tide');
    alive(B.party).forEach(t => damage(t, baseDmg(u.atk, t.dfn, intent.kind === 'erase' ? .6 : .85), 'negro'));
  }
  yield* wait(18); u.pose = 'idle';
}

function retryBattle() {
  const r = B.retry; if (!r) { resetGame(); return; }
  Game.inventory = { ...r.inventory }; Party.forEach((p, i) => p.cur = { ...r.party[i] });
  initBattle(r.foe); B.gen = null; B.tr = null; B.phase = 'fight'; B.fightStart = 0;
  B.unitScale = B.propScale = 1; B.puddle.k = 1;
  B.units.forEach(u => { u.wx = u.hx; u.wy = u.hy; u.wz = 0; u.pose = u.alive ? 'idle' : 'ko'; });
  OW.hideFoe = null; OW.scare = null; camSet(SCENE.rest); setState('battle');
  Audio.play(r.foe.boss ? 'boss' : 'battle'); say('Un nuevo trazo.');
}
