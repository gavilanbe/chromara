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
  MOBILE.pointers.clear(); MOBILE.repeats = {};
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
  const label = Game.state === 'pageTurn' ? 'Pasando hoja' : field && typeof chapterNear === 'function' && chapterNear() ? 'Pasar hoja' : Game.state === 'title' || Game.state === 'cover' ? 'Comenzar' : Game.overlay ? 'Elegir' : battleMenu ? battleMenu.level==='target'?'Usar':'Elegir' : OW.msg && Game.state === 'overworld' ? 'Seguir' : field ? (worldNearby() || fieldNearby().length) ? 'Examinar' : 'Menú' : 'Confirmar';
  const span = document.querySelector('#touch-confirm span'); if (span.textContent !== label) span.textContent = label;
  const padLabel=document.getElementById('touch-caption'),padText=battleMenu?.level==='cmd'?'Elegir herramienta':battleMenu?.level==='target'?'Elegir objetivo':'Toca o desliza';
  if(padLabel.textContent!==padText)padLabel.textContent=padText;
  const sound = document.getElementById('touch-sound');
  if (sound.textContent !== (Audio.muted ? 'Silencio' : 'Sonido')) { sound.textContent = Audio.muted ? 'Silencio' : 'Sonido'; sound.setAttribute('aria-pressed', String(Audio.muted)); sound.setAttribute('aria-label', Audio.muted ? 'Activar sonido' : 'Silenciar sonido'); }
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
  MOBILE.buttons.forEach(button => {
    const action = button.dataset.touchAction;
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
    pad.setPointerCapture(e.pointerId);
    const rect = pad.getBoundingClientRect(), dir = e.target.closest('[data-touch-direction]')?.dataset.touchDirection;
    setTouchPointer(e.pointerId, dir ? [dir] : touchDirections(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, false), true);
  });
  pad.addEventListener('pointermove', e => {
    if (!MOBILE.pointers.get(e.pointerId)?.pad) return;
    const rect = pad.getBoundingClientRect(), field = Game.state === 'overworld' && !OW.menu && !OW.ring && !OW.msg && !OW.act && !OW.heal && !Game.overlay;
    setTouchPointer(e.pointerId, touchDirections(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, field), true);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(event, e => { if (MOBILE.pointers.has(e.pointerId)) endTouchPointer(e.pointerId); });
  const fullscreen = document.getElementById('touch-fullscreen');
  fullscreen.hidden = typeof document.documentElement.requestFullscreen !== 'function';
  fullscreen.addEventListener('click', mobileFullscreen);
  document.getElementById('touch-sound').addEventListener('click', toggleSound);
  document.addEventListener('fullscreenchange', () => { releaseInputs(); fit(); placeTitleButton(); });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { fit(); placeTitleButton(); });
  addEventListener('orientationchange', releaseInputs);
  MOBILE.initialized = true; mobileViewport(); updateTouchControls();
}
