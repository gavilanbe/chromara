// Mobile shell: Pointer Events share the same commands as keyboard and gamepad.
'use strict';
const MOBILE = { enabled:false, portrait:false, initialized:false, origins:new Map(), coach:null, forced:typeof location !== 'undefined' && /(?:^\?|&)touch=1(?:&|$)/.test(location.search), pointers:new Map(), repeats:{}, buttons:[] };
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
  MOBILE.pointers.clear(); MOBILE.repeats = {}; MOBILE.origins?.clear?.(); touchFloat(null); if (typeof document !== 'undefined' && document.getElementById) touchNub(document.getElementById('touch-pad'), null);
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

// ---- Los útiles pintados. Cada control es un sprite hecho con la paleta del juego y a su tamaño de píxel: A es un godet
// con la pintura del líder, B la goma de las magias, Y y X dos pastillas de acuarela, la cruceta la paleta de madera con
// cuatro pegotes de pintura y, en el centro, la gota del líder. Se repintan cuando cambia quién va delante.
const TOUCH_ART = { key:'' };
function touchSprite(w, h, draw) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext?.('2d'); if (!x || !x.fillRect) return null;
  const P = (col, a, b, ww = 1, hh = 1) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  try { draw(x, P); const url = c.toDataURL?.(); return typeof url === 'string' && url.startsWith('data:') ? url : null; } catch { return null; }
}
function touchDisc(P, cx, cy, r, fn) { for (let y = Math.floor(cy - r - 1); y <= cy + r; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r; x++) { const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy); if (d <= r) { const col = fn(d, dx, dy); if (col) P(col, x, y); } } }
function touchPan(col, held) { // A: un godet de cerámica lleno de pintura, con brillo húmedo; pulsado, la pintura se hunde y hace onda
  const r = ramp(col);
  return touchSprite(28, 28, (x, P) => {
    touchDisc(P, 14, 14, 13.6, (d, dx, dy) => d > 12.6 ? '#241e32' : d > 10 ? (dx + dy < -5 ? '#fffaf0' : dx + dy > 6 ? '#c9bca2' : '#efe6d2') : d > 9.2 ? '#8f8272' : null);
    touchDisc(P, 14, 14, 9.2, (d, dx, dy) => { const s = dx + dy; if (held) return d > 5.2 && d < 6.6 ? r.hi : d < 3 ? r.sh : s > 4 ? r.sh : r.base;
      return d > 8.2 && dy > 1 ? r.sh : s < -7 ? r.hi : s > 6 ? r.sh : r.base; });
    if (!held) { P('#ffffff', 9, 8, 3, 2); P('#ffffff', 13, 7); P(r.hi, 8, 10, 2, 1); } else { P('#ffffff', 12, 11, 2, 1); }
    P('#fffaf0', 6, 5, 3, 1); P('#fffaf0', 5, 6, 1, 2); // brillo del borde de cerámica
  });
}
function touchCake(col) { // Y, X: una pastilla de acuarela en su bandeja de latón
  const r = ramp(col);
  return touchSprite(26, 18, (x, P) => {
    P('#241e32', 1, 0, 24, 18); P('#241e32', 0, 1, 26, 16);
    P('#c9c4d4', 1, 1, 24, 16); P('#f4f0ea', 2, 1, 22, 1); P('#8c8ab0', 2, 16, 22, 1); P('#8c8ab0', 24, 2, 1, 14);
    P(r.sh, 3, 3, 20, 12); P(r.base, 3, 3, 19, 11); P(r.hi, 4, 3, 17, 2); P(r.hi, 3, 4, 1, 7);
    P(r.sh, 9, 7, 8, 4); P(r.base, 10, 7, 6, 3); P(r.hi, 10, 7, 4, 1); // la huella del pincel
    P(r.sh, 5, 12, 3, 1); P(r.sh, 17, 5, 1, 3); P(r.sh, 18, 8, 2, 1); // grietas de la pastilla seca
    P('#ffffff', 5, 4, 3, 1);
  });
}
function touchPalette() { // la cruceta: paleta de madera redonda, agujero para el pulgar y restos de los tres primarios
  return touchSprite(48, 48, (x, P) => {
    touchDisc(P, 24, 24, 23.6, (d, dx, dy) => { if (Math.hypot(dx - 12, dy - 12) < 3.4) return null; if (d > 22.6) return '#201926'; if (d > 21.4) return dx + dy < 0 ? '#e6be83' : '#5a3a26';
      const ring = Math.hypot(dx - 12, (dy - 12) * 1.3); return (ring | 0) % 5 === 0 ? '#b3834f' : (ring | 0) % 5 === 2 ? '#cda266' : '#c39660'; });
    touchDisc(P, 36.5, 36.5, 4.4, (d) => d > 3.4 ? '#4a2e20' : null);
    [[C('rojo'), 10, 12], [C('azul'), 37, 11], [C('amarillo'), 11, 37]].forEach(([c, cx, cy]) => { const r = ramp(c); touchDisc(P, cx, cy, 3.2, (d, dx, dy) => d > 2.4 ? r.sh : dx + dy < -1.5 ? r.hi : r.base); });
  });
}
function touchDab(col) { // un pegote de pintura espesa sobre la paleta (cada flecha de la cruceta)
  const r = ramp(col);
  return touchSprite(18, 18, (x, P) => {
    touchDisc(P, 9, 9.5, 8.6, (d, dx, dy) => { const a = Math.atan2(dy, dx), R = 7.8 + Math.sin(a * 3 + 1) * .7; if (d > R + .8) return null; if (d > R - .2) return '#241e32'; const s = dx + dy; return d > R - 1.4 && dy > 0 ? r.sh : s < -5 ? r.hi : s > 5 ? r.sh : r.base; });
    P('#ffffff', 5, 5, 2, 1); P('#ffffff', 4, 6);
  });
}
function touchDrop(col) { // la gota del líder en el centro de la cruceta
  const r = ramp(col);
  return touchSprite(14, 17, (x, P) => {
    for (let y = 0; y < 17; y++) for (let xx = 0; xx < 14; xx++) { const dx = xx + .5 - 7, dy = y + .5 - 10.5, inBody = Math.hypot(dx, dy) < 6.2 || (dy < 0 && Math.abs(dx) < (dy + 10.5) * .62); if (!inBody) continue;
      const edge = !(Math.hypot(dx, dy) < 5.2 || (dy < -1 && Math.abs(dx) < (dy + 10.5) * .62 - 1.1)) || y === 0; P(edge ? '#241e32' : dx + dy < -3 ? r.hi : dx + dy > 3 ? r.sh : r.base, xx, y); }
    P('#ffffff', 4, 8, 2, 1); P('#ffffff', 4, 9);
  });
}
function touchArtRefresh() {
  if (typeof Party === 'undefined' || !Party[0] || typeof ramp !== 'function') return;
  const lead = C(Party[0].color), key = lead + '|' + (Party.map(p => p.color).join()); if (key === TOUCH_ART.key) return; TOUCH_ART.key = key;
  const st = document.body?.style; if (!st || typeof st.setProperty !== 'function') return;
  const blue = C('azul'), red = C('rojo'), set = (name, url) => { if (url) st.setProperty('--art-' + name, 'url(' + url + ')'); };
  set('a', touchPan(lead, false)); set('a-held', touchPan(lead, true)); set('y', touchCake(blue)); set('x', touchCake(red));
  set('pad', touchPalette()); set('dab', touchDab('#f1e6cc')); set('dab-held', touchDab(lead)); set('nub', touchDrop(lead));
  if (typeof spiritSprite === 'function') { try { const b = spiritSprite('goma', null).toDataURL?.(); if (typeof b === 'string' && b.startsWith('data:')) set('b', b); } catch {} }
  st.setProperty('--lead', lead);
}
function updateTouchControls() {
  document.body.classList.toggle('ui-still', Prefs.shake === 0);
  const inBattle = Game.state === 'battle' || Game.state === 'transition'; if (document.body.classList.contains?.('in-battle') !== inBattle) document.body.classList.toggle('in-battle', inBattle); // en combate los controles suben por encima de las fichas
  if (!MOBILE.initialized || !MOBILE.enabled) return;
  touchArtRefresh();
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
  const label = Game.state === 'pageTurn' ? 'Pasando hoja' : field && typeof chapterNear === 'function' && chapterNear() ? 'Pasar hoja' : Game.state === 'prologue' ? 'Saltar' : Game.state === 'title' && TITLE.select ? 'Entrar' : Game.state === 'title' || Game.state === 'cover' ? 'Comenzar' : Game.overlay ? 'Elegir' : Game.state === 'overworld' && OW.heal ? (OW.jar?.phase === 'mix' ? 'Remover' : 'Confirmar') : Game.state === 'overworld' && OW.ring ? (OW.ring.mode === 'aim' ? 'Lanzar' : 'Apuntar') : battleMenu ? battleMenu.level==='target'?'Usar':'Elegir' : OW.msg && Game.state === 'overworld' ? 'Seguir' : field ? OW.jar?.near ? 'Zambullirse' : merchantNear() ? 'Comprar' : (worldNearby() || fieldNearby().length) ? 'Examinar' : 'Menú' : 'Confirmar';
  const span = document.querySelector('#touch-confirm span'), confirm = document.getElementById('touch-confirm');
  if (span.textContent !== label) { span.textContent = label; touchRelabel(confirm); }
  // A late cuando hay algo delante con lo que usarlo
  const ready = ['Examinar','Comprar','Pasar hoja','Seguir','Usar','Lanzar','Zambullirse','Remover'].includes(label); if (confirm?.classList?.contains && confirm.classList.contains('is-ready') !== ready) confirm.classList.toggle('is-ready', ready);
  const backSpan = document.querySelector('#touch-back span'), backLabel = Game.state === 'overworld' && OW.ring?.mode === 'aim' ? 'Volver' : Game.overlay || (Game.state === 'overworld' && (OW.menu || OW.ring)) ? 'Cerrar' : battleMenu && battleMenu.level !== 'cmd' ? 'Atrás' : 'Volver';
  if (backSpan && backSpan.textContent !== backLabel) { backSpan.textContent = backLabel; touchRelabel(backSpan.parentNode); }
  const lead = Party[0] && C(Party[0].color); if (lead && MOBILE.lead !== lead) { MOBILE.lead = lead; document.body.style?.setProperty?.('--lead', lead); }
  touchShakeHaptics(); touchCoachUpdate();
  if (!field && Game.state !== 'battle' && document.body.classList?.contains?.('drawer-open') && Game.state !== 'overworld') touchDrawer(false);
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
// Palanca flotante: donde cae el pulgar dentro de su zona aparece la paleta (y ahí está su centro); al soltar vuelve a
// su sitio. Con zona muerta; en el mapa da ocho direcciones y en los menús encaja en cuatro.
function touchFieldMove() { return typeof Game !== 'undefined' && Game.state === 'overworld' && !OW.menu && !OW.ring && !OW.msg && !OW.act && !OW.heal && !Game.overlay; }
function touchStickDirections(pad, id, e) {
  const o = MOBILE.origins.get(id), r = pad.getBoundingClientRect(), R = r.width / 2;
  const ox = o ? o[0] : r.left + R, oy = o ? o[1] : r.top + R;
  return touchDirections(e.clientX - ox + R, e.clientY - oy + R, 2 * R, 2 * R, touchFieldMove());
}
function touchFloat(e, pad = typeof document !== 'undefined' && document.getElementById ? document.getElementById('touch-pad') : null) {
  if (!pad?.style) return;
  if (!e) { pad.style.transform = ''; pad.classList?.remove?.('is-floating'); return; }
  const home = pad.dataset?.home ? JSON.parse(pad.dataset.home) : null; if (!home) return;
  pad.style.transform = `translate(${Math.round(e.clientX - home[0])}px,${Math.round(e.clientY - home[1])}px)`; pad.classList?.add?.('is-floating');
}
function touchPadDown(pad, e, floating) {
  if (mobilePaused()) return; e.preventDefault?.(); Audio.init(); ANYKEY = true; touchKeepAwake(); if (touchFieldMove()) touchCoachDone();
  try { (floating ? e.currentTarget || pad : pad).setPointerCapture?.(e.pointerId); } catch (_) {}
  const dir = !floating && e.target?.closest?.('[data-touch-direction]')?.dataset.touchDirection, r = pad.getBoundingClientRect();
  if (floating) { // el centro de la palanca es donde ha caído el dedo
    if (!pad.classList?.contains?.('is-floating')) pad.dataset.home = JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);
    MOBILE.origins.set(e.pointerId, [e.clientX, e.clientY]); touchFloat(e, pad); touchBuzz(6); setTouchPointer(e.pointerId, [], true); return; }
  MOBILE.origins.set(e.pointerId, [r.left + r.width / 2, r.top + r.height / 2]); touchNub(pad, e);
  setTouchPointer(e.pointerId, dir ? [dir] : touchStickDirections(pad, e.pointerId, e), true);
}
function touchPadMove(pad, e) {
  const held = MOBILE.pointers.get(e.pointerId); if (!held?.pad) return;
  const dirs = touchStickDirections(pad, e.pointerId, e); if (dirs.join() !== held.actions.join()) touchBuzz(4);
  setTouchPointer(e.pointerId, dirs, true);
  const o = MOBILE.origins.get(e.pointerId), r = pad.getBoundingClientRect();
  if (o) touchNub(pad, { clientX: r.left + r.width / 2 + (e.clientX - o[0]), clientY: r.top + r.height / 2 + (e.clientY - o[1]) }); else touchNub(pad, e);
}
// Pestaña «cuaderno»: en horizontal las pestañas de menú se pliegan en una sola y se despliegan al tocarla
function touchDrawer(open) {
  const body = document.body; if (!body?.classList?.toggle) return;
  const next = open ?? !body.classList.contains('drawer-open'); body.classList.toggle('drawer-open', next);
  document.getElementById('touch-menu-toggle')?.setAttribute?.('aria-expanded', String(next)); if (next) touchBuzz(6);
}
// Primera vez en el mapa: dos marcas que se mueven solas (un pulgar sobre la palanca y un toque en la hoja), sin texto
function touchCoachUpdate() {
  let seen = MOBILE.coachSeen; if (seen == null) { try { seen = MOBILE.coachSeen = localStorage.getItem('chromara.coach.v1') === '1'; } catch (_) { seen = MOBILE.coachSeen = false; } }
  const show = !seen && touchFieldMove() && !(OW.landT > 0);
  if (show && MOBILE.coach == null) MOBILE.coach = 0; if (show) MOBILE.coach++;
  if (MOBILE.coach > 60 * 9) touchCoachDone();
  document.body.classList?.toggle?.('touch-coach', !!show && !MOBILE.coachSeen);
}
function touchCoachDone() { if (MOBILE.coachSeen) return; MOBILE.coachSeen = true; try { localStorage.setItem('chromara.coach.v1', '1'); } catch (_) {} document.body.classList?.remove?.('touch-coach'); }
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
  pad.addEventListener('pointerdown', e => touchPadDown(pad, e, false));
  pad.addEventListener('pointermove', e => touchPadMove(pad, e));
  // la zona del pulgar: tocar fuera de la paleta la trae bajo el dedo
  const zone = document.getElementById('touch-movement');
  if (zone && zone !== pad) { zone.addEventListener('pointerdown', e => { if (pad.contains?.(e.target)) return; touchPadDown(pad, e, true); }); zone.addEventListener('pointermove', e => { if (!pad.contains?.(e.target)) touchPadMove(pad, e); }); }
  const toggle = document.getElementById('touch-menu-toggle');
  if (toggle?.addEventListener) { toggle.insertAdjacentHTML?.('afterbegin', touchIcon('menu')); toggle.addEventListener('click', () => touchDrawer()); }
  document.getElementById('touch-toolbar')?.addEventListener?.('click', e => { if (e.target?.closest?.('button') && !document.body.classList?.contains?.('is-portrait')) setTimeout(() => touchDrawer(false), 0); });
  document.addEventListener('pointerdown', e => { if (document.body.classList?.contains?.('drawer-open') && !e.target?.closest?.('#touch-toolbar,#touch-menu-toggle')) touchDrawer(false); }, true);
  for (const event of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(event, e => { if (MOBILE.pointers.get(e.pointerId)?.pad) { touchNub(pad, null); touchFloat(null, pad); MOBILE.origins.delete(e.pointerId); } if (MOBILE.pointers.has(e.pointerId)) endTouchPointer(e.pointerId); });
  document.addEventListener('contextmenu', e => { if (MOBILE.enabled) e.preventDefault(); });
  // al volver a la app (PWA en segundo plano, llamada, cambio de app): nada queda pulsado y la hoja se reencaja
  document.addEventListener('visibilitychange', () => { releaseInputs(); touchDrawer(false); if (!document.hidden) { touchKeepAwake(); fit(); if (typeof placeTitleButton === 'function') placeTitleButton(); } });
  // Nada de zoom: ni pellizco, ni doble toque, ni toques repetidos (iOS ignora a veces el viewport y el touch-action).
  for (const ev of ['gesturestart','gesturechange','gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive:false });
  document.addEventListener('dblclick', e => e.preventDefault(), { passive:false });
  let lastTouchEnd = 0; document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTouchEnd < 350 && e.cancelable && !e.target?.closest?.('input,textarea,select')) e.preventDefault(); lastTouchEnd = now; }, { passive:false });
  document.addEventListener('touchmove', e => { if (e.touches?.length > 1 || (typeof e.scale === 'number' && e.scale !== 1)) e.preventDefault(); }, { passive:false });
  const fullscreen = document.getElementById('touch-fullscreen');
  fullscreen.hidden = typeof document.documentElement.requestFullscreen !== 'function';
  fullscreen.addEventListener('click', mobileFullscreen);
  document.getElementById('touch-sound').addEventListener('click', toggleSound);
  document.addEventListener('fullscreenchange', () => { releaseInputs(); fit(); placeTitleButton(); });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { fit(); placeTitleButton(); });
  addEventListener('orientationchange', () => { releaseInputs(); touchDrawer(false); setTimeout(() => { fit(); if (typeof placeTitleButton === 'function') placeTitleButton(); }, 250); });
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
  if (!quiet) touchCoachDone(); // ya sabe que la hoja se toca
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
  menu:['.#######.','.#.....#.','.#.###.#.','.#.....#.','.#.###.#.','.#.....#.','.#.##..#.','.#.....#.','.#######.'],
  fullscreen:['###...###','#.......#','#.......#','.........','.........','.........','#.......#','#.......#','###...###'],
};
function touchIcon(name) { const rows = TOUCH_ICONS[name]; let d = ''; rows.forEach((r, y) => { for (let x = 0; x < 9; x++) if (r[x] === '#') d += `M${x} ${y}h1v1h-1z`; }); return `<svg class="touch-icon" viewBox="0 0 9 9" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="${d}"/></svg>`; }
// Pantalla encendida mientras se juega
let touchWake = null;
async function touchKeepAwake() { try { if (!MOBILE.enabled || touchWake || document.hidden || !navigator.wakeLock) return; touchWake = await navigator.wakeLock.request('screen'); touchWake.addEventListener('release', () => { touchWake = null; }); } catch (_) { touchWake = null; } }
