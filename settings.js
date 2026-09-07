// Player preferences, remappable controls, gamepad and the pigment study book.
'use strict';
const DEFAULT_BINDINGS = { ok: 'z', back: 'x', swap: 'Tab', release: 'v', options: 'o', journal: 'j', help: '?', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', ring: 'c' };
const PREF_DEFAULTS = { mode: 'active', speed: 1, short: true, camera: 'suave', shake: .5, flash: .4, bindings: { ...DEFAULT_BINDINGS } };
const Prefs = (() => {
  let p = {}; try { p = JSON.parse(localStorage.getItem('chromara.preferences.v1') || '{}') || {}; } catch (_) {}
  const out = { ...PREF_DEFAULTS, bindings: { ...DEFAULT_BINDINGS } };
  if (['active', 'wait'].includes(p.mode)) out.mode = p.mode;
  if ([1, 1.5, 2].includes(p.speed)) out.speed = p.speed;
  if (typeof p.short === 'boolean') out.short = p.short;
  if (['suave', 'cinema', 'fija'].includes(p.camera)) out.camera = p.camera;
  for (const k of ['shake', 'flash']) if ((k === 'flash' ? [0, .4, 1] : [0, .5, 1]).includes(p[k])) out[k] = p[k];
  if (p.bindings && typeof p.bindings === 'object') {
    const entries = Object.entries(DEFAULT_BINDINGS).map(([k, d]) => [k, typeof p.bindings[k] === 'string' && p.bindings[k].length <= 16 ? p.bindings[k] : d]);
    if (new Set(entries.map(([, v]) => v)).size === entries.length) out.bindings = Object.fromEntries(entries);
  }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches && !Object.keys(p).length) { out.shake = 0; out.flash = 0; out.camera = 'fija'; }
  return out;
})();
ATB_ACTIVE = Prefs.mode === 'active';
function savePreferences() { ATB_ACTIVE = Prefs.mode === 'active'; try { localStorage.setItem('chromara.preferences.v1', JSON.stringify(Prefs)); } catch (_) {} }
function toggleSound() { Audio.init(); Audio.muted = !Audio.muted; if (Audio.master) Audio.master.gain.setTargetAtTime(Audio.muted ? 0 : .55, Audio.ctx.currentTime, .025); }
function keyLabel(action) { if (typeof MOBILE !== 'undefined' && MOBILE.enabled && ['ok','back','swap','release'].includes(action)) return {ok:'A',back:'B',swap:'Y',release:'X'}[action]; const k = Prefs.bindings[action] || action; return ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ' ': 'Espacio', Escape: 'Esc', Backspace:'Borrar', PageUp:'RePág', PageDown:'AvPág', Insert:'Ins', Delete:'Supr' })[k] || (k.length === 1 ? k.toUpperCase() : k.length > 6 ? k.slice(0, 5) + '.' : k); }
function actionForKey(key) {
  if (key === 'F1') return 'debug';
  const normal = key.length === 1 ? key.toLowerCase() : key;
  const entry = Object.entries(Prefs.bindings).find(([, value]) => value === normal);
  if (entry) return entry[0];
  // Extra aliases only remain while that action retains its default binding.
  const alias = { Enter: 'ok', ' ': 'ok', Escape: 'back', w: 'up', s: 'down', a: 'left', d: 'right' }[normal];
  return alias && Prefs.bindings[alias] === DEFAULT_BINDINGS[alias] ? alias : null;
}
const KEY_HELD = {}, PAD_HELD = {}, TOUCH_HELD = {};
function keyboardAction(k, down) { KEY_HELD[k] = down; if (down && !keys[k]) pressed[k] = true; keys[k] = !!(KEY_HELD[k] || PAD_HELD[k] || TOUCH_HELD[k]); }
function releaseInputs() { for (const obj of [keys, pressed, KEY_HELD, PAD_HELD, TOUCH_HELD]) for (const k in obj) obj[k] = false; if (typeof releaseTouchControls === 'function') releaseTouchControls(); }
function pollGamepad() {
  const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  const p = Array.from(pads).find(Boolean), held = {};
  if (p) {
    const b = i => !!p.buttons[i]?.pressed;
    Object.assign(held, { ok: b(0), back: b(1), release: b(2), help: b(3), ring: b(4), swap: b(5), journal: b(8), options: b(9), up: b(12) || p.axes[1] < -.5, down: b(13) || p.axes[1] > .5, left: b(14) || p.axes[0] < -.5, right: b(15) || p.axes[0] > .5 });
  }
  for (const k of new Set([...Object.keys(held), ...Object.keys(PAD_HELD)])) {
    if (held[k] && !PAD_HELD[k]) { pressed[k] = true; ANYKEY = true; Audio.init(); }
    PAD_HELD[k] = !!held[k]; keys[k] = !!(PAD_HELD[k] || KEY_HELD[k] || TOUCH_HELD[k]);
  }
}
function openOverlay(type) { const snap = document.createElement('canvas'); snap.width = W; snap.height = H; snap.getContext('2d').drawImage(buf, 0, 0); Game.overlay = { type, idx: 0, page: 0, capture: null, message: '', snap, openedAt: ARTUI.t, hl: null }; ARTUI.tracks.delete('overlay'); ARTUI.tracks.delete('overlay-note'); ARTUI.tracks.delete('guide-page'); ARTUI.motes.length=0; releaseInputs(); Audio.sfx('book_open'); }
function closeOverlay() { Game.overlay = null; ARTUI.motes.length=0; releaseInputs(); Audio.sfx('book_close'); }
const OPTIONS = [
  { key: 'mode', label: 'Tiempo', values: ['active', 'wait'], labels: ['Activo', 'Pausa al elegir'], desc: 'Activo: carga al elegir. Pausa: sólo en submenús.' },
  { key: 'speed', label: 'Velocidad', values: [1, 1.5, 2], labels: ['1x', '1.5x', '2x'], desc: 'Acelera el combate completo, incluidas las barras.' },
  { key: 'short', label: 'Técnicas vistas', values: [true, false], labels: ['Abreviadas', 'Completas'], desc: 'La primera ejecución conserva toda su coreografía.' },
  { key: 'camera', label: 'Cámara', values: ['suave', 'cinema', 'fija'], labels: ['Suave', 'Cinemática', 'Fija'], desc: 'Suave: planos cercanos. Cinemática: giros más amplios.' },
  { key: 'shake', label: 'Sacudidas', values: [0, .5, 1], labels: ['Sin sacudidas', 'Suaves', 'Completas'], desc: 'Ajusta golpes de cámara y gestos de la interfaz.' },
  { key: 'flash', label: 'Destellos', values: [0, .4, 1], labels: ['Sin destellos', 'Suaves', 'Completos'], desc: 'También reduce las capas de luz de las técnicas.' },
];
function changeOption(index, dir) {
  const o = OPTIONS[index]; if (!o) return;
  Prefs[o.key] = o.values[(o.values.indexOf(Prefs[o.key]) + dir + o.values.length) % o.values.length]; savePreferences(); Audio.sfx('cursor');
  if(o.key==='camera'&&Game.state==='battle'){
    B.viewKey=null;
    if(B.currentAction){
      if(Prefs.camera==='fija'){SCENE.shot=null;camSet(menuCameraPose(null));}
      else beginActionCamera(B.currentAction);
    }else camReset();
  }
}
function buyStudy(id) {
  const o = Game.overlay, d = DATA.studies[id];
  if (Game.studies[id]) { o.message = 'Ya está aprendido.'; return false; }
  if (Game.pigmento < d.cost) { o.message = 'Necesitas ' + (d.cost - Game.pigmento) + ' pigmentos más.'; Audio.sfx('nope'); return false; }
  Game.pigmento -= d.cost; Game.studies[id] = true; o.message = '¡' + d.name + ' aprendido!'; o.stampAt=ARTUI.t; artBurst(285,61+o.idx*27,'#438967'); Audio.sfx('discovery'); return true;
}
function updateOverlay() {
  const o = Game.overlay; if (!o) return;
  if (o.capture) { if (hit('back') || hit('options')) { o.capture = null; o.message = ''; } return; }
  if (hit('back') || hit('options')) { if (o.type === 'bindings') { o.type = 'settings'; o.idx = 6; } else closeOverlay(); return; }
  const n = o.type === 'settings' ? OPTIONS.length + 1 : o.type === 'bindings' ? Object.keys(DEFAULT_BINDINGS).length + 1 : o.type === 'studies' ? Object.keys(DATA.studies).length : 3;
  const step = hit('down') ? 1 : hit('up') ? -1 : 0;
  if (step) { o.idx = (o.idx + step + n) % n; o.message = ''; Audio.sfx('cursor'); }
  const dir = hit('right') ? 1 : hit('left') ? -1 : 0, ok = hit('ok');
  if (o.type === 'settings') {
    if (o.idx === OPTIONS.length && ok) { o.type = 'bindings'; o.idx = 0; }
    else if (dir || ok) changeOption(o.idx, dir || 1);
  } else if (o.type === 'bindings' && ok) {
    const actions = Object.keys(DEFAULT_BINDINGS);
    if (o.idx === actions.length) { Prefs.bindings = { ...DEFAULT_BINDINGS }; savePreferences(); o.message = 'Controles restaurados.'; }
    else { o.capture = actions[o.idx]; o.message = typeof MOBILE !== 'undefined' && MOBILE.enabled ? 'Teclado físico: pulsa una tecla. B cancela.' : 'Pulsa una tecla · Esc cancela'; }
  } else if (o.type === 'studies' && ok) buyStudy(Object.keys(DATA.studies)[o.idx]);
  else if (o.type === 'guide' && (dir || ok)) o.idx = (o.idx + (dir || 1) + n) % n;
}
function captureBinding(e) {
  const o = Game.overlay; if (!o?.capture) return false;
  e.preventDefault(); if (e.repeat) return true;
  if (e.key === 'Escape') { o.capture = null; o.message = ''; return true; }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) return true;
  if (key.length > 16 || ['m', 'F1', 'Escape', 'Enter', ' '].includes(key) || Object.entries(Prefs.bindings).some(([a, k]) => a !== o.capture && k === key)) { o.message = 'Esa tecla está ocupada. Prueba otra.'; return true; }
  Prefs.bindings[o.capture] = key; o.capture = null; o.message = 'Tecla guardada.'; savePreferences(); releaseInputs(); return true;
}
function initPlayerControls() {
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Chromara. Flechas para mover, Z confirmar, X volver, O opciones, signo de interrogación para ayuda.');
  cv.addEventListener('pointerdown', e => {
    Audio.init(); const box = cv.getBoundingClientRect(), x = (e.clientX - box.left) * W / box.width, y = (e.clientY - box.top) * H / box.height;
    const area = UI_HITS.slice().reverse().find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    if (area) { e.preventDefault(); if(Game.state==='battle'&&!Game.overlay)battlePointerFeedback(x,y);else artBurst(x,y);area.run(); }
  });
  cv.addEventListener('pointermove', e => {
    if(e.pointerType==='touch')return;
    const box=cv.getBoundingClientRect(),x=(e.clientX-box.left)*W/box.width,y=(e.clientY-box.top)*H/box.height;
    const area=UI_HITS.slice().reverse().find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);
    cv.style.cursor=area?'pointer':'default'; if(area?.hover)area.hover();
  });
  cv.addEventListener('pointerleave',()=>cv.style.cursor='default');
  cv.addEventListener('wheel',e=>{
    if(Game.state!=='battle'||Game.overlay||B.currentAction||!['cmd','tech','item'].includes(B.menu?.level)||!e.deltaY)return;
    const rows=B.menu.level==='cmd'?commandRows(B.menu.unit):battleListRows(B.menu);if(!rows.length)return;e.preventDefault();
    const now=performance.now();if(now-(B.menu.wheelAt??-100)<100)return;B.menu.wheelAt=now;
    const idx=(B.menu.idx+(e.deltaY>0?1:-1)+rows.length)%rows.length;
    if(B.menu.level==='cmd')focusPaletteTool(B.menu,idx);else{B.menu.idx=idx;Audio.sfx('cursor',{vol:.35});}
  },{passive:false});
  addEventListener('blur', releaseInputs);
}
function battleUpdateRate() {
  const a = B.currentAction;
  const animation = a?.command?.type === 'tech' && a.seen && Prefs.short ? 1.6 : 1;
  return Prefs.speed * animation;
}
function contextualHint() {
  if (Game.state === 'pageTurn') return 'Las gotas atraviesan el papel · Pasando página';
  if (Game.state === 'overworld' && !OW.msg && !OW.menu && typeof chapterNear === 'function' && chapterNear()) return keyLabel('ok') + ' pasar página · El equipo conserva su progreso';
  if (Game.overlay) return '↑↓ elegir · ←→ cambiar · ' + keyLabel('ok') + ' confirmar · ' + keyLabel('back') + ' cerrar';
  if(Game.state==='battle'&&B.menu?.level==='cmd')return [keyLabel('up')+keyLabel('down')+keyLabel('left')+keyLabel('right')+' herramienta','Rueda cambiar',keyLabel('ok')+' elegir',keyLabel('swap')+' otra gota',keyLabel('options')+' opciones'].join(' · ');
  if (Game.state === 'battle') return keyLabel('ok') + ' confirmar · ' + keyLabel('back') + ' volver · ' + keyLabel('swap') + ' cambiar gota · ' + keyLabel('release') + ' liberar mezcla · ' + keyLabel('options') + ' opciones · ' + keyLabel('help') + ' guía';
  if (Game.state === 'overworld' && OW.ring) return '↑↓ pigmento · ←→ objetivo · ' + keyLabel('ok') + ' aplicar · ' + keyLabel('back') + ' cerrar';
  const confirm = Game.state === 'overworld' && !OW.menu && !OW.msg && (worldNearby() || fieldNearby().length) ? ' examinar · ' : ' menú · ';
  return 'Flechas/WASD mover · ' + keyLabel('ok') + confirm + keyLabel('ring') + ' magias de campo · ' + keyLabel('journal') + ' estudios · ' + keyLabel('options') + ' opciones · M sonido';
}
