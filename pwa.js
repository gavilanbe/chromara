// Chromara como app: instalación, juego sin conexión y actualizaciones que nunca interrumpen una partida.
// Una versión nueva se descarga sola y espera. Se pone en cuanto el juego está en la tapa, la cinemática o el título
// (ahí no se pierde nada); durante una partida, una nota de papel avisa y deja elegir. Los avisos son notas pegadas
// con cinta sobre la mesa, fuera del lienzo.
'use strict';
const PWA = {
  version: typeof CHROMARA_VERSION !== 'undefined' ? CHROMARA_VERSION : 'dev', reg: null, waiting: null, applying: false,
  prompt: null, note: null, noteType: null, confirmT: 0, lastCheck: 0, snoozed: false,
  standalone: typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches) || navigator.standalone === true,
};
const PWA_KEY = 'chromara.pwa.v1';
function pwaStore(patch) { let s = {}; try { s = JSON.parse(localStorage.getItem(PWA_KEY) || '{}') || {}; } catch (_) {} if (patch) { Object.assign(s, patch); try { localStorage.setItem(PWA_KEY, JSON.stringify(s)); } catch (_) {} } return s; }
// Momentos en los que cambiar de versión no cuesta nada: todavía no ha empezado ninguna partida
function pwaSafeMoment() { return typeof Game === 'undefined' || ['cover', 'prologue', 'title'].includes(Game.state) && !(typeof TITLE !== 'undefined' && TITLE.exit); }

// ---- la nota de papel ----
function pwaNote(type, title, body, buttons = [], opts = {}) {
  let n = PWA.note;
  if (!n) {
    n = PWA.note = document.createElement('aside'); n.id = 'pwa-note'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite');
    n.innerHTML = '<span class="pwa-drop" aria-hidden="true"></span><strong></strong><p></p><div class="pwa-buttons"></div>';
    document.body.appendChild(n);
  }
  PWA.noteType = type; n.dataset.type = type;
  n.querySelector('strong').textContent = title; n.querySelector('p').innerHTML = body;
  const row = n.querySelector('.pwa-buttons'); row.textContent = '';
  for (const [label, run, main] of buttons) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (main) b.className = 'is-main'; b.addEventListener('click', e => { e.stopPropagation(); run(b); }); row.appendChild(b); }
  n.classList.remove('is-gone'); void n.offsetWidth; n.classList.add('is-shown');
  clearTimeout(PWA.noteTimer); if (opts.autoHide) PWA.noteTimer = setTimeout(pwaHideNote, opts.autoHide);
}
function pwaHideNote() { const n = PWA.note; if (!n) return; n.classList.remove('is-shown'); n.classList.add('is-gone'); PWA.noteType = null; }

// ---- actualizaciones ----
function pwaApply() {
  const w = PWA.waiting || PWA.reg?.waiting; if (!w || PWA.applying) return;
  PWA.applying = true; try { if (typeof Audio !== 'undefined' && Audio.ctx) Audio.ctx.suspend().catch(() => {}); } catch (_) {}
  document.body.classList.add('pwa-turning'); // la hoja se pasa mientras llega la versión nueva
  w.postMessage({ type: 'skip-waiting' });
  setTimeout(() => { if (PWA.applying) location.reload(); }, 4000); // por si el navegador no avisa del cambio
}
function pwaOnWaiting(w) {
  PWA.waiting = w;
  if (pwaSafeMoment()) { pwaApply(); return; }
  if (!PWA.snoozed) pwaUpdateNote();
}
function pwaUpdateNote() {
  pwaNote('update', 'Página nueva del cuaderno', 'Hay una versión nueva de Chromara. Se pondrá sola al volver a la portada o la próxima vez que abras el juego.', [
    ['Ponerla ahora', b => { if (PWA.confirmT && performance.now() - PWA.confirmT < 4000) { pwaApply(); return; } PWA.confirmT = performance.now(); b.textContent = 'Toca otra vez: vuelve a la portada'; b.classList.add('is-warning'); }, true],
    ['Luego', () => { PWA.snoozed = true; pwaHideNote(); }],
  ]);
}
function pwaCheck(force) {
  const now = Date.now(); if (!PWA.reg || !navigator.onLine || (!force && now - PWA.lastCheck < 60000)) return;
  PWA.lastCheck = now; PWA.reg.update().catch(() => {});
}
function pwaWatch(reg) {
  PWA.reg = reg;
  if (reg.waiting && navigator.serviceWorker.controller) pwaOnWaiting(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing; if (!w) return;
    w.addEventListener('statechange', () => {
      if (w.state !== 'installed') return;
      if (navigator.serviceWorker.controller) pwaOnWaiting(w); // hay una versión nueva esperando
      else pwaFirstInstall(); // primera instalación: ya se puede jugar sin conexión
    });
  });
}
function pwaFirstInstall() {
  if (pwaStore().offlineTold) return; pwaStore({ offlineTold: true });
  pwaNote('offline', 'Listo para jugar sin conexión', 'El cuaderno ya está guardado en este dispositivo.', [], { autoHide: 4200 });
}
// La música (unos 11 MB) se guarda aparte y en segundo plano; con «ahorro de datos» se espera a que la pida el juego
function pwaCacheMusic() {
  const c = navigator.serviceWorker?.controller; if (!c || navigator.connection?.saveData) return;
  if (pwaStore().music === PWA.version) return;
  const onMsg = e => { if (e.data?.type === 'music' && e.data.done === e.data.total) { pwaStore({ music: PWA.version }); navigator.serviceWorker.removeEventListener('message', onMsg); } };
  navigator.serviceWorker.addEventListener('message', onMsg); c.postMessage({ type: 'cache-music' });
}

// ---- instalar ----
const PWA_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
function pwaInstallNote() {
  if (PWA.standalone || PWA.noteType || !pwaSafeMoment() || typeof Game === 'undefined' || Game.state !== 'title') return;
  const s = pwaStore(); if (s.installLater && Date.now() - s.installLater < 14 * 864e5) return;
  const later = () => { pwaStore({ installLater: Date.now() }); pwaHideNote(); };
  if (PWA.prompt) pwaNote('install', 'Instala Chromara', 'Con su icono, a pantalla completa y sin conexión.', [
    ['Instalar', async () => { const p = PWA.prompt; PWA.prompt = null; pwaHideNote(); try { await p.prompt(); const r = await p.userChoice; if (r.outcome !== 'accepted') pwaStore({ installLater: Date.now() }); } catch (_) {} }, true],
    ['Ahora no', later],
  ]);
  else if (PWA_IOS && typeof MOBILE !== 'undefined' && MOBILE.enabled) pwaNote('install', 'Llévatelo a la pantalla de inicio', 'Toca <b class="pwa-share" aria-label="Compartir"></b> Compartir y luego «Añadir a pantalla de inicio». Se abrirá a pantalla completa y sin conexión.', [
    ['Entendido', later, true],
  ]);
}

function initPWA() {
  document.body.classList.toggle('is-standalone', !!PWA.standalone);
  if (PWA.standalone) { try { navigator.storage?.persist?.(); } catch (_) {} }
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); PWA.prompt = e; });
  addEventListener('appinstalled', () => { PWA.prompt = null; if (PWA.noteType === 'install') pwaHideNote(); pwaStore({ installed: true }); });
  // Hosted copies register the worker; file://, captures and local development do not (unless asked to, for tests)
  const q = location.search, local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname), dev = (() => { try { return localStorage.getItem('chromara.pwa.dev') === '1'; } catch (_) { return false; } })();
  const want = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/escena|spriteLab/.test(q) && (!local || dev);
  if (!want) { if ('serviceWorker' in navigator && local && !dev) navigator.serviceWorker.getRegistrations?.().then(rs => rs.forEach(r => r.unregister())).catch(() => {}); return; }
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (PWA.applying) location.reload(); });
  navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'activated' && !PWA.applying) setTimeout(pwaCacheMusic, 3000); });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => { pwaWatch(reg); setTimeout(pwaCacheMusic, 8000); }).catch(() => {});
  // Una app abierta días enteros también se entera: al volver a ella, al recuperar la red y cada media hora
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pwaCheck(); });
  addEventListener('online', () => pwaCheck(true));
  setInterval(() => pwaCheck(true), 30 * 60000);
  // Si la partida vuelve a la portada o al título con una versión esperando, se pone ahí; y el título ofrece instalar
  setInterval(() => {
    if (PWA.waiting && !PWA.applying && pwaSafeMoment()) pwaApply();
    if (PWA.noteType === 'install' && !pwaSafeMoment()) pwaHideNote();
    else if (!PWA.noteType && !PWA.waiting) pwaInstallNote();
  }, 1000);
}
initPWA();
