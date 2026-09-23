// Mobile shell: Pointer Events share the same commands as keyboard and gamepad.
'use strict';
const MOBILE = { enabled:false, portrait:false, initialized:false, forced:typeof location !== 'undefined' && /(?:^\?|&)touch=1(?:&|$)/.test(location.search), pointers:new Map(), repeats:{}, buttons:[] };
function useTouchLayout(width, height, coarse) { return coarse || (width <= 960 && height <= 540); }
// Portrait has its own layout (mobile.css), so nothing pauses for orientation any more; only a hidden page does.
function mobilePaused() { return false; }
function mobileViewport() {
  const enabled = MOBILE.forced || useTouchLayout(innerWidth, innerHeight, matchMedia('(any-pointer: coarse)').matches);
  const portrait = innerHeight > innerWidth;
  const changed = enabled !== MOBILE.enabled || portrait !== MOBILE.portrait;
  MOBILE.enabled = enabled; MOBILE.portrait = portrait;
  document.body.classList.toggle('touch-mode', enabled);
  document.body.classList.toggle('is-portrait', enabled && portrait);
  if (MOBILE.initialized) document.getElementById('c').setAttribute('aria-label', enabled ? 'Chromara. Usa la cruceta para mover, A para confirmar y B para volver.' : 'Chromara. Flechas para mover, Z confirmar, X volver, O opciones, signo de interrogación para ayuda.');
  if (changed && MOBILE.initialized) releaseInputs();
  if (!enabled) return { width:innerWidth, height:innerHeight - 20, fractional:false };
  const rect = document.getElementById('game-screen').getBoundingClientRect();
  return { width:Math.max(1, rect.width), height:Math.max(1, rect.height), fractional:true };
}
function touchDirections(x, y, width, height, diagonal) {
  const dx = (x - width / 2) / (width / 2), dy = (y - height / 2) / (height / 2);
  if (Math.hypot(dx, dy) < .23) return [];
  if (!diagonal) return Math.abs(dx) > Math.abs(dy) ? [dx < 0 ? 'left' : 'right'] : [dy < 0 ? 'up' : 'down'];
  const dirs = [];
  if (Math.abs(dx) > Math.abs(dy) * .5) dirs.push(dx < 0 ? 'left' : 'right');
  if (Math.abs(dy) > Math.abs(dx) * .5) dirs.push(dy < 0 ? 'up' : 'down');
  return dirs;
}
function syncTouchInputs() {
  const held = new Set([...MOBILE.pointers.values()].flatMap(p => p.actions));
  for (const k of new Set([...Object.keys(TOUCH_HELD), ...held])) {
    const next = held.has(k);
    if (next && !TOUCH_HELD[k]) { pressed[k] = true; MOBILE.repeats[k] = 0; }
    if (!next) delete MOBILE.repeats[k];
    TOUCH_HELD[k] = next; keys[k] = !!(next || KEY_HELD[k] || PAD_HELD[k]);
  }
  MOBILE.buttons.forEach(b => b.classList.toggle('is-held', !!TOUCH_HELD[b.dataset.touchAction || b.dataset.touchDirection]));
}
function releaseTouchControls() {
  MOBILE.pointers.clear(); MOBILE.repeats = {}; if (typeof document !== 'undefined' && document.getElementById) touchNub(document.getElementById('touch-pad'), null);
  MOBILE.buttons.forEach(b => b.classList.remove('is-held'));
}
function setTouchPointer(id, actions, pad = false) {
  MOBILE.pointers.set(id, { actions, pad }); syncTouchInputs();
}
function endTouchPointer(id) { MOBILE.pointers.delete(id); syncTouchInputs(); }
function pulseTouchAction(action) { if (mobilePaused()) return; Audio.init(); ANYKEY = true; pressed[action] = true; }
function touchEquipment() {
  if (Game.state !== 'overworld' || OW.act || OW.heal || OW.msg || Game.overlay) return;
  releaseInputs(); if (OW.ring) OW.ring = null;
  if (!OW.menu) openMenu(); else { OW.menu.closing = true; OW.menu.closeT = OW.menu.t; }
  Audio.init();
}
function updateTouchControls() {
  document.body.classList.toggle('ui-still', Prefs.shake === 0);
  if (!MOBILE.initialized || !MOBILE.enabled) return;
  const field = Game.state === 'overworld' && !OW.menu && !OW.ring && !OW.msg && !OW.act && !OW.heal && !Game.overlay;
  // Holding the pad walks continuously. In menus it repeats at a deliberate pace.
  if (!field) for (const k of ['up','down','left','right']) if (TOUCH_HELD[k]) {
    const t = MOBILE.repeats[k] = (MOBILE.repeats[k] || 0) + 1;
    if (t >= 24 && (t - 24) % 9 === 0) pressed[k] = true;
  }
  for (const b of MOBILE.buttons) {
    const action = b.dataset.touchAction;
    let available = Game.state !== 'pageTurn';
    if (action === 'ring' || action === 'journal' || b.dataset.touchMenu) available = Game.state === 'overworld' && !OW.msg && !OW.act && !OW.heal && !Game.overlay;
    if (action === 'ring' && OW.menu) available = false;
    if (action === 'swap') available = Game.state === 'battle' && canChangeBattlePainter();
    if (action === 'release') available = Game.state === 'battle' && !!B.reservation && !Game.overlay;
    if (action === 'help' || action === 'options') available = ['overworld','battle'].includes(Game.state) && !Game.overlay?.capture;
    if (action === 'help' && Game.overlay) available = false;
    if (b.disabled !== !available) b.disabled = !available;
  }
  const battleMenu=Game.state==='battle'&&!Game.overlay&&!B.currentAction?B.menu:null;
  const label = Game.state === 'pageTurn' ? 'Pasando hoja' : field && typeof chapterNear === 'function' && chapterNear() ? 'Pasar hoja' : Game.state === 'prologue' ? 'Saltar' : Game.state === 'title' || Game.state === 'cover' ? 'Comenzar' : Game.overlay ? 'Elegir' : battleMenu ? battleMenu.level==='target'?'Usar':'Elegir' : OW.msg && Game.state === 'overworld' ? 'Seguir' : field ? merchantNear() ? 'Comprar' : (worldNearby() || fieldNearby().length) ? 'Examinar' : 'Menú' : 'Confirmar';
  const span = document.querySelector('#touch-confirm span'), confirm = document.getElementById('touch-confirm');
  if (span.textContent !== label) { span.textContent = label; touchRelabel(confirm); }
  // A late cuando hay algo delante con lo que usarlo
  const ready = ['Examinar','Comprar','Pasar hoja','Seguir','Usar'].includes(label); if (confirm?.classList?.contains && confirm.classList.contains('is-ready') !== ready) confirm.classList.toggle('is-ready', ready);
  const backSpan = document.querySelector('#touch-back span'), backLabel = Game.overlay || (Game.state === 'overworld' && (OW.menu || OW.ring)) ? 'Cerrar' : battleMenu && battleMenu.level !== 'cmd' ? 'Atrás' : 'Volver';
  if (backSpan && backSpan.textContent !== backLabel) { backSpan.textContent = backLabel; touchRelabel(backSpan.parentNode); }
  const lead = Party[0] && C(Party[0].color); if (lead && MOBILE.lead !== lead) { MOBILE.lead = lead; document.body.style?.setProperty?.('--lead', lead); }
  touchShakeHaptics();
  const padLabel=document.getElementById('touch-caption'),padText=battleMenu?.level==='cmd'?'Elegir herramienta':battleMenu?.level==='target'?'Elegir objetivo':field?'o toca el mapa':'Toca o desliza';
  if(padLabel.textContent!==padText)padLabel.textContent=padText;
  const sound = document.getElementById('touch-sound');
  const soundText = Audio.muted ? 'Silencio' : 'Sonido', soundSpan = sound.querySelector?.('span') || sound;
  if (soundSpan.textContent !== soundText) { soundSpan.textContent = soundText; const icon = sound.querySelector?.('svg'); if (icon) icon.outerHTML = touchIcon(Audio.muted ? 'mute' : 'sound'); sound.setAttribute('aria-pressed', String(Audio.muted)); sound.setAttribute('aria-label', Audio.muted ? 'Activar sonido' : 'Silenciar sonido'); }
}
function touchRelabel(el) { if (!el?.classList?.add) return; el.classList.remove('is-relabel'); void el.offsetWidth; el.classList.add('is-relabel'); }
// La gota del centro de la cruceta sigue al dedo (hasta el borde del círculo) y vuelve con rebote al soltar
function touchNub(pad, e) {
  const nub = pad?.querySelector?.('.pad-nub'); if (!nub) return;
  if (!e) { nub.style.transform = ''; nub.classList.remove('is-dragged'); return; }
  const r = pad.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, d = Math.hypot(dx, dy), max = r.width * .27, k = d > max ? max / d : 1;
  nub.style.transform = `translate(${(dx * k).toFixed(1)}px,${(dy * k).toFixed(1)}px)`; nub.classList.add('is-dragged');
}
async function mobileFullscreen() {
  Audio.init(); releaseInputs();
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen();
      // Some mobile browsers support locking only after a fullscreen gesture.
      try { if (screen.orientation?.lock) await screen.orientation.lock('landscape'); } catch (_) {}
    }
  } catch (_) { /* Safari and embedded browsers can decline: landscape still works. */ }
  fit(); placeTitleButton();
}
function initMobileControls() {
  MOBILE.buttons = [...document.querySelectorAll('[data-touch-action], [data-touch-direction], [data-touch-menu]')];
  const pad = document.getElementById('touch-pad');
  document.querySelectorAll('[data-icon]').forEach(b => { if (b.insertAdjacentHTML) b.insertAdjacentHTML('afterbegin', touchIcon(b.dataset.icon)); });
  MOBILE.buttons.forEach(button => {
    const action = button.dataset.touchAction;
    button.addEventListener('pointerdown', e => { if (!button.disabled) { touchSplat(button, e); touchBuzz(action === 'ok' ? 12 : 7); touchKeepAwake(); } });
    if (action) button.addEventListener('pointerdown', e => {
      if (button.disabled || mobilePaused()) return;
      e.preventDefault(); Audio.init(); ANYKEY = true;
      button.setPointerCapture(e.pointerId); setTouchPointer(e.pointerId, [action]);
    });
    // Native keyboard/assistive activation has no preceding pointer event.
    button.addEventListener('click', e => {
      if (button.disabled || mobilePaused()) return;
      if (button.dataset.touchMenu) touchEquipment();
      else if (e.detail === 0) pulseTouchAction(action || button.dataset.touchDirection);
    });
  });
  pad.addEventListener('pointerdown', e => {
    if (mobilePaused()) return; e.preventDefault(); Audio.init(); ANYKEY = true;
    pad.setPointerCapture(e.pointerId); touchNub(pad, e); touchKeepAwake();
    const rect = pad.getBoundingClientRect(), dir = e.target.closest('[data-touch-direction]')?.dataset.touchDirection;
    setTouchPointer(e.pointerId, dir ? [dir] : touchDirections(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, false), true);
  });
  pad.addEventListener('pointermove', e => {
    if (!MOBILE.pointers.get(e.pointerId)?.pad) return;
    const rect = pad.getBoundingClientRect(), field = Game.state === 'overworld' && !OW.menu && !OW.ring && !OW.msg && !OW.act && !OW.heal && !Game.overlay;
    setTouchPointer(e.pointerId, touchDirections(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, field), true); touchNub(pad, e);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(event, e => { if (MOBILE.pointers.get(e.pointerId)?.pad) touchNub(pad, null); if (MOBILE.pointers.has(e.pointerId)) endTouchPointer(e.pointerId); });
  document.addEventListener('contextmenu', e => { if (MOBILE.enabled) e.preventDefault(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) touchKeepAwake(); });
  const fullscreen = document.getElementById('touch-fullscreen');
  fullscreen.hidden = typeof document.documentElement.requestFullscreen !== 'function';
  fullscreen.addEventListener('click', mobileFullscreen);
  document.getElementById('touch-sound').addEventListener('click', toggleSound);
  document.addEventListener('fullscreenchange', () => { releaseInputs(); fit(); placeTitleButton(); });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { fit(); placeTitleButton(); });
  addEventListener('orientationchange', releaseInputs);
  MOBILE.initialized = true; mobileViewport(); updateTouchControls();
}

// ---------------------------------------------------------------------------------------------------------------------
// Tocar el mapa para ir. La ruta se busca por una rejilla de 4 px (sin atravesar nada), se alisa en tramos rectos y se
// dibuja como un trazo de grafito punteado que el líder va borrando al andar. Donde tocas cae una gota; si tocaste algo
// con lo que se puede hablar (un cofre, un cartel, Sepia, un sitio), al llegar lo mira y lo usa.
// ---------------------------------------------------------------------------------------------------------------------
const TAP = { route:null, mark:null, held:null, movedAt:0 };
function tapFieldFree() { return Game.state === 'overworld' && !OW.menu && !OW.ring && !OW.msg && !OW.act && !OW.heal && !Game.overlay && !(OW.landT > 0); }
function tapPath(wx, wy) {
  const S = 4, nx = Math.floor(MAP.w * TILE / S), ny = Math.floor(MAP.h * TILE / S), ok = (a, b) => a >= 0 && b >= 0 && a < nx && b < ny && walkable(a * S, b * S);
  const near = (a, b, R) => { if (ok(a, b)) return [a, b]; let best = null, bd = 1e9; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d = dx * dx + dy * dy; if (d < bd && ok(a + dx, b + dy)) { bd = d; best = [a + dx, b + dy]; } } return best; };
  const tx0 = Math.round(wx / S), ty0 = Math.round(wy / S), goal = near(tx0, ty0, 7), start = near(Math.round(OW.x / S), Math.round(OW.y / S), 2);
  if (!goal || !start) return null;
  const idx = (a, b) => b * nx + a, prev = new Int32Array(nx * ny).fill(-1), g0 = idx(start[0], start[1]), gk = idx(goal[0], goal[1]), q = [g0]; prev[g0] = g0;
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let i = 0; i < q.length && prev[gk] < 0; i++) { const c = q[i], a = c % nx, b = (c / nx) | 0;
    for (const [dx, dy] of steps) { const A = a + dx, Bb = b + dy; if (!ok(A, Bb)) continue; if (dx && dy && (!ok(a + dx, b) || !ok(a, b + dy))) continue; const k = idx(A, Bb); if (prev[k] >= 0) continue; prev[k] = c; q.push(k); } }
  if (prev[gk] < 0) return null;
  const cells = []; for (let c = gk; c !== g0; c = prev[c]) cells.push([(c % nx) * S, ((c / nx) | 0) * S]); cells.reverse();
  // tramos rectos: salta puntos mientras la línea entre dos siga siendo pisable
  const clear = (p, r) => { const L = Math.hypot(r[0] - p[0], r[1] - p[1]); for (let s = 0; s <= L; s += 2) { const k = L ? s / L : 0; if (!walkable(p[0] + (r[0] - p[0]) * k, p[1] + (r[1] - p[1]) * k)) return false; } return true; };
  const pts = []; let from = [OW.x, OW.y];
  for (let i = 0; i < cells.length;) { let j = i; while (j + 1 < cells.length && clear(from, cells[j + 1])) j++; pts.push(cells[j]); from = cells[j]; i = j + 1; }
  return { pts, goal:[goal[0] * S, goal[1] * S], interact:goal[0] !== tx0 || goal[1] !== ty0 };
}
// x, y en píxeles de la página (0..320, 0..180)
function tapWalk(x, y, quiet = false) {
  if (!tapFieldFree()) return false;
  const wx = OW.cam.x + x, wy = OW.cam.y + y, r = tapPath(wx, wy);
  if (!r) { if (!quiet) { TAP.mark = { x:wx, y:wy, t:0, miss:true }; Audio.sfx('cursor', { vol:.3, semi:-7 }); touchBuzz(6); } return true; }
  TAP.route = { pts:r.pts, face:[wx, wy], interact:r.interact, stuck:0, last:[OW.x, OW.y] };
  if (!quiet || !TAP.mark || Math.hypot(TAP.mark.x - r.goal[0], TAP.mark.y - r.goal[1]) > 10) TAP.mark = { x:r.goal[0], y:r.goal[1], t:quiet ? 12 : 0, col:C(Party[0].color) };
  if (!quiet) { Audio.sfx('plop', { vol:.35, semi:12 }); touchBuzz(8); }
  return true;
}
function tapInteractable() { return (typeof chapterNear === 'function' && chapterNear()) || fieldNearby().length > 0 || merchantNear() || !!worldNearby(); }
// Dirección de marcha hacia el siguiente punto de la ruta; [0, 0] al llegar
function tapSteer() {
  const R0 = TAP.route; if (!R0) return [0, 0];
  if (!tapFieldFree()) { tapCancel(); return [0, 0]; }
  while (R0.pts.length && Math.hypot(R0.pts[0][0] - OW.x, R0.pts[0][1] - OW.y) < (R0.pts.length > 1 ? 3 : 1.5)) R0.pts.shift();
  const moved = Math.hypot(OW.x - R0.last[0], OW.y - R0.last[1]); R0.last = [OW.x, OW.y]; R0.stuck = moved < .15 ? R0.stuck + 1 : 0;
  if (!R0.pts.length || R0.stuck > 24) {
    const fx = R0.face[0] - OW.x, fy = R0.face[1] - OW.y;
    if (Math.hypot(fx, fy) > 2) OW.dir = Math.abs(fx) >= Math.abs(fy) ? (fx < 0 ? 'left' : 'right') : (fy < 0 ? 'up' : 'down');
    if (R0.interact && tapInteractable()) pressed.ok = true;
    TAP.route = null; if (TAP.mark) TAP.mark.done = TAP.mark.t; return [0, 0];
  }
  const [px, py] = R0.pts[0], dx = px - OW.x, dy = py - OW.y, d = Math.hypot(dx, dy), slow = R0.pts.length === 1 ? clamp(d / 6, .35, 1) : 1;
  return [dx / d * slow, dy / d * slow];
}
function tapCancel() { if (TAP.route) { TAP.route = null; if (TAP.mark) TAP.mark.done = TAP.mark.t; } }
// El trazo punteado y la gota del destino, en coordenadas de mundo
function drawTapMark(cx, cy) {
  if (TAP.route && !tapFieldFree()) tapCancel(); // un cartel, un combate o un menú cortan el paseo
  const M = TAP.mark; if (!M) return; M.t++;
  const sh = Prefs.shake, fade = M.done != null ? clamp(1 - (M.t - M.done) / 14, 0, 1) : M.miss ? clamp(1 - (M.t - 10) / 12, 0, 1) : 1;
  if (fade <= 0) { TAP.mark = null; return; }
  const X = Math.round(M.x - cx), Y = Math.round(M.y - cy);
  g.save(); g.globalAlpha = fade;
  if (M.miss) { // no se llega: un tachón de lápiz
    const j = sh && M.t < 8 ? ((M.t & 1) ? 1 : -1) : 0; g.fillStyle = '#4a4664';
    for (let i = -3; i <= 3; i++) { g.fillRect(X + i + j, Y + i, 2, 1); g.fillRect(X + i + j, Y - i, 2, 1); }
    g.restore(); return;
  }
  // trazo de grafito: puntos cada 5 px por la ruta que falta
  if (TAP.route) { g.fillStyle = 'rgba(58,54,82,.55)'; let [ax, ay] = [OW.x, OW.y], acc = 0;
    for (const [bx, by] of TAP.route.pts) { const L = Math.hypot(bx - ax, by - ay); for (let s = (5 - acc % 5) % 5 || 5; s < L; s += 5) { const k = s / L; g.fillRect(Math.round(ax + (bx - ax) * k - cx), Math.round(ay + (by - ay) * k - cy + 1), 1, 1); } acc += L; [ax, ay] = [bx, by]; } }
  const col = M.col || '#c79b45', rp = ramp(col), fall = M.t < 8 ? Math.round((8 - M.t) * (8 - M.t) * .5) : 0, q = M.t - 8;
  // la mancha en el papel: salpica un anillo al caer la chincheta y luego late despacio
  const pulse = sh && q > 0 ? Math.sin(M.t * .16) * .6 : 0, grow = q < 0 ? 0 : Math.min(1, q / 4);
  if (q >= 0 && q < 14) { g.strokeStyle = rp.hi; g.globalAlpha = fade * (1 - q / 14); g.lineWidth = 1; g.beginPath(); g.ellipse(X + .5, Y + .5, 5 + q * 1.1, 2.5 + q * .55, 0, 0, 6.29); g.stroke(); g.globalAlpha = fade;
    if (q < 7) { g.fillStyle = rp.base; for (let i = 0; i < 5; i++) { const a = i * 1.26 + .4; g.fillRect(Math.round(X + Math.cos(a) * (4 + q * 1.2)), Math.round(Y + Math.sin(a) * (2 + q * .6) - (7 - q) * .7), 1, 1); } } }
  if (grow) { g.fillStyle = rp.out; g.beginPath(); g.ellipse(X + .5, Y + 1, (5 + pulse) * grow, (2.4 + pulse * .4) * grow, 0, 0, 6.29); g.fill();
    g.fillStyle = rp.base; g.beginPath(); g.ellipse(X + .5, Y + .5, (4 + pulse) * grow, (1.8 + pulse * .4) * grow, 0, 0, 6.29); g.fill(); g.fillStyle = rp.hi; g.fillRect(X - 2, Y, 2, 1); }
  // la chincheta con banderín del color del líder, que cae y se clava con un pequeño rebote
  const bounce = q >= 0 && q < 8 && sh ? Math.round(Math.sin(q * .9) * (8 - q) * .25) : 0, py = Y - fall + bounce, wave = sh ? Math.round(Math.sin(M.t * .2)) : 0;
  g.fillStyle = '#3a3652'; g.fillRect(X, py - 10, 1, 10); g.fillStyle = '#6f6680'; g.fillRect(X, py - 10, 1, 3);
  g.fillStyle = rp.out; g.fillRect(X + 1, py - 11, 6 + wave, 6); g.fillStyle = rp.base; g.fillRect(X + 1, py - 10, 5 + wave, 4); g.fillStyle = rp.hi; g.fillRect(X + 1, py - 10, 2, 1);
  g.fillStyle = rp.out; g.fillRect(X - 1, py - 12, 3, 2); g.fillStyle = rp.hi; g.fillRect(X, py - 12, 1, 1);
  g.restore();
}

// Vibración corta al tocar y con los golpes fuertes del juego (se apaga con «temblor» en opciones)
function touchBuzz(ms) { try { if (MOBILE.enabled && Prefs.shake && navigator.vibrate) navigator.vibrate(ms); } catch (_) {} }
let touchShakeWas = 0;
function touchShakeHaptics() {
  const s = Math.max(Game.state === 'battle' || Game.state === 'transition' ? (B.shake || 0) : 0, Game.state === 'overworld' ? (OW.shake || 0) : 0);
  if (s > touchShakeWas + 1) touchBuzz(Math.min(45, 8 + s * 5)); touchShakeWas = s;
}
// Salpicadura de pintura donde el dedo toca un botón
function touchSplat(button, e) {
  if (!Prefs.shake || !button.appendChild || !document.createElement) return;
  const r = button.getBoundingClientRect(), s = document.createElement('span'); s.className = 'touch-splat'; s.setAttribute('aria-hidden', 'true');
  s.style.left = (e.clientX != null ? e.clientX - r.left : r.width / 2) + 'px'; s.style.top = (e.clientY != null ? e.clientY - r.top : r.height / 2) + 'px';
  button.appendChild(s); s.addEventListener('animationend', () => s.remove()); setTimeout(() => s.remove(), 600);
}
// Iconos de píxel (9×9) para las pestañas del cuaderno
const TOUCH_ICONS = {
  equipment:['.......##','......###','.....###.','....###..','...###...','..##.....','.###.....','###......','##.......'],
  ring:['....#....','....#....','..#.#.#..','...###...','####.####','...###...','..#.#.#..','....#....','....#....'],
  journal:['.........','###...###','#..#.#..#','#..#.#..#','#..#.#..#','#..#.#..#','###.#.###','...###...','.........'],
  help:['..####...','.##..##..','.....##..','....##...','...##....','...##....','.........','...##....','...##....'],
  options:['...#.#...','.#.###.#.','..#####..','.###.###.','.##...##.','.###.###.','..#####..','.#.###.#.','...#.#...'],
  sound:['.........','...#..#..','..##...#.','####.#.#.','####.#.#.','####.#.#.','..##...#.','...#..#..','.........'],
  mute:['.........','...#.....','..##.....','####.#.#.','####..#..','####.#.#.','..##.....','...#.....','.........'],
  fullscreen:['###...###','#.......#','#.......#','.........','.........','.........','#.......#','#.......#','###...###'],
};
function touchIcon(name) { const rows = TOUCH_ICONS[name]; let d = ''; rows.forEach((r, y) => { for (let x = 0; x < 9; x++) if (r[x] === '#') d += `M${x} ${y}h1v1h-1z`; }); return `<svg class="touch-icon" viewBox="0 0 9 9" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="${d}"/></svg>`; }
// Pantalla encendida mientras se juega
let touchWake = null;
async function touchKeepAwake() { try { if (!MOBILE.enabled || touchWake || document.hidden || !navigator.wakeLock) return; touchWake = await navigator.wakeLock.request('screen'); touchWake.addEventListener('release', () => { touchWake = null; }); } catch (_) { touchWake = null; } }
