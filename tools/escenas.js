// Development only: index.html?escena=<name>&t=<frames> sets up one interface,
// advances a fixed number of frames and freezes, so headless Chrome can capture
// it (tools/captura.sh). Nothing here loads without the query parameter.
'use strict';
const ESCENA = { frozen: false };
const realUpdate = update, realRender = render;
update = function () { if (ESCENA.frozen) return; realUpdate(); };
// Errors while drawing a scene are written into the document title, where a headless --dump-dom can read them.
render = function () { try { realRender(); } catch (err) { document.title = 'ERROR ' + (err.stack || err); throw err; } if (ESCENA.after) { ESCENA.after(); ctx.drawImage(buf, 0, 0, W * SCALE, H * SCALE); } if (ESCENA.overlay) ESCENA.overlay(); };
function escenaBattle(key = '5', cmd = true) {
  Game.intro = false; initOverworld(); OW.msg = null; setState('overworld');
  const foe = OW.foes.find(f => f.key === String(key)) || OW.foes[0];
  initBattle(foe); B.gen = null; B.tr = null; B.phase = 'fight'; B.fightStart = -100; setState('battle');
  B.units.forEach(u => { u.wx = u.hx; u.wy = u.hy; u.wz = 0; u.atb = 0; }); B.unitScale = 1; B.propScale = 1;
  camSet(SCENE.rest); projectUnits(); B.party.forEach(u => u.atb = 100); B.party[1].atb = 62; B.party[2].atb = 100;
  if (cmd) openCmd(B.party[0]);
}
const ESCENAS = {
  mapa() { Game.intro = false; initOverworld(); OW.msg = null; setState('overworld'); },
  mensaje() { ESCENAS.mapa(); OW.msg = { lines: DATA.texts.intro, t: 0 }; },
  cartel() { ESCENAS.mapa(); OW.msg = { lines: DATA.signs['4,17'], t: 0 }; },
  estuche() { ESCENAS.mapa(); Game.owned.pluma = true; openMenu(); },
  estuche2() { ESCENAS.mapa(); Game.owned.pluma = true; openMenu(); OW.menu.level = 'equip'; OW.menu.row = 1; },
  opciones() { ESCENAS.mapa(); openOverlay('settings'); },
  teclas() { ESCENAS.mapa(); openOverlay('bindings'); Game.overlay.idx = 2; },
  estudios() { ESCENAS.mapa(); Game.pigmento = 40; openOverlay('studies'); },
  guia() { ESCENAS.mapa(); openOverlay('guide'); },
  magias() { ESCENAS.mapa(); const t = fieldTargets()[0]; OW.x = t.x; OW.y = t.y + 16; OW.ring = { idx: 0, targetId: t.id, t: 0, legend: false }; },
  paleta() { escenaBattle('5'); },
  entrada() { escenaBattle('5'); B.fightStart = B.t; BUI.party = null; },
  paleta3() { escenaBattle('5'); B.menu.idx = 3; },
  tecnicas() { escenaBattle('5'); B.menu.level = 'tech'; B.menu.idx = 1; },
  objetos() { escenaBattle('5'); B.menu.level = 'item'; B.menu.idx = 0; },
  objetivo() { escenaBattle('5'); beginTarget(B.menu, { type: 'attack' }); },
  objetivo_tech() { escenaBattle('5'); beginTarget(B.menu, { type: 'tech', techId: 'brochazo' }); },
  cura() { escenaBattle('5'); B.party[2].hp = 30; beginTarget(B.menu, { type: 'item' }); B.menu.pending = { type: 'item', item: 'gota_agua' }; B.menu.targets = validTargets(B.menu.pending, B.menu.unit); B.menu.tidx = 2; },
  accion() { escenaBattle('5'); executeCommand(B.party[0], { type: 'tech', techId: 'brochazo' }, [B.enemies[0]]); },
  golpe() { escenaBattle('5'); executeCommand(B.party[0], { type: 'attack' }, [B.enemies[0]]); },
  // ?escena=tecnica&id=<techId>: la técnica arranca con todos listos; ?escena=enemigo&forma=<shape> lanza el ataque de un enemigo.
  tecnica() { escenaBattle('5', false); const id = new URLSearchParams(location.search).get('id') || 'brochazo', t = DATA.techs[id], u = B.party.find(p => p.id === (t.user || t.users[0])); if (t.weapon) u.data.weapon = t.weapon; B.party.forEach(p => { p.atb = 100; p.mp = 30; }); if (t.target === 'ally') B.party[0].hp = 40; executeCommand(u, { type: 'tech', techId: id }, validTargets({ type: 'tech', techId: id }, u)); },
  enemigo() { escenaBattle('5', false); const forma = new URLSearchParams(location.search).get('forma'); if (forma) B.enemies[0].data = { ...B.enemies[0].data, shape: forma }; B.enemies[0].intent = { kind: 'attack', name: 'Planchazo', target: B.party[0] }; B.actQueue.push(tracked(B.enemies[0], actEnemy(B.enemies[0]), [B.enemies[0]], { type: 'enemy' })); },
  corte() { escenaBattle('5', false); B.enemies[0].atb = 80; planEnemy(B.enemies[0]); B.party.forEach(p => p.atb = 100); executeCommand(B.party[1], { type: 'role' }, [B.enemies[0]]); },
  mezcla() { escenaBattle('5', false); putCoat(B.enemies[0], 'amarillo'); B.enemies[0].goop = null; B.party.forEach(p => p.atb = 100); executeCommand(B.party[0], { type: 'attack' }, [B.enemies[0]]); },
  robo() { escenaBattle('B', false); B.enemies[0].atb = 100; B.enemies[0].intent = { kind: 'steal', name: 'Robar pigmento', target: B.party[2] }; B.actQueue.push(tracked(B.enemies[0], actEnemy(B.enemies[0]), [B.enemies[0]], { type: 'enemy' })); },
  carga() { escenaBattle('5', false); B.party.forEach(p => p.atb = 50); B.enemies[0].atb = 80; planEnemy(B.enemies[0]); B.enemies[1].atb = 62; planEnemy(B.enemies[1]); B.party[0].guard = { target: B.party[2], charges: 1 }; B.enemies[2].coat = { col: 'azul', turns: 2, max: 2, birth: 0 }; B.enemies[1].status.lento = 3; B.enemies[0].status.firmado = 2; B.party[1].status.tiznado = 2; B.party[2].status.contorno = 3; },
  jefa() { escenaBattle('B'); B.enemies[0].atb = 80; planEnemy(B.enemies[0]); },
  estados() { escenaBattle('5'); B.party.forEach(u => { u.status = { lento: 3, tiznado: 2 }; }); B.party[1].hp = 20; B.party[2].mp = 0; B.party[2].hp = 0; B.party[2].alive = false; B.party[2].pose = 'ko'; },
  victoria() { escenaBattle('5', false); B.enemies.forEach(u => { u.alive = false; u.dead = 3; }); B.phase = 'victory'; B.showResult = true; B.result = 48; B.stats = { actions: 12, mixes: 3, interrupts: 1, damageTaken: 60 }; },
  derrota() { escenaBattle('5', false); B.party.forEach(u => { u.alive = false; u.hp = 0; u.pose = 'ko'; }); B.phase = 'defeat'; B.t = 90; },
  dialogo() {
    ESCENAS.mapa(); const foe = OW.foes.find(f => f.boss); OW.x = foe.x - 40; OW.y = foe.y + 20; OW.cam.x = clamp(OW.x - W / 2, 0, MAP.w * TILE - W); OW.cam.y = clamp(OW.y - H / 2, 0, MAP.h * TILE - H);
    initBattle(foe); B.gen = null; B.tr = { overworld: true, boss: true, foe, stage: 'dialogue', dlg: { i: 1, ch: 0, t: 0 } }; OW.hideFoe = foe; setState('transition');
    ESCENA.dialogue = true;
  },
  transicion() { ESCENAS.mapa(); const foe = OW.foes.find(f => f.key === '5'); OW.x = foe.x - 30; OW.y = foe.y + 10; startTransition(foe); },
  titulo() { setState('title'); TITLE.t = 260; },
  // App icon: paper card, rainbow brush stroke and the three drops. ?size=512 (&maskable=1 keeps the art inside the safe circle).
  icono() {
    const q = new URLSearchParams(location.search), size = parseInt(q.get('size') || '512', 10), maskable = q.get('maskable') === '1', s = size / 128;
    Game.paused = true; document.getElementById('game-shell').style.display = 'none'; document.body.style.background = '#0b0912';
    const icon = document.createElement('canvas'); icon.width = icon.height = size; icon.style.cssText = 'position:fixed;left:0;top:0;width:' + size + 'px;height:' + size + 'px;z-index:9'; document.body.appendChild(icon);
    ESCENA.overlay = () => {
      const x = icon.getContext('2d'); x.imageSmoothingEnabled = false; x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = maskable ? '#e9dfc4' : '#0b0912'; x.fillRect(0, 0, size, size);
      const inset = maskable ? 0 : 6 * s, rr = maskable ? 0 : 20 * s, sq = (px, py, w, h) => x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h));
      const card = (dx, dy, col) => { x.fillStyle = col; x.beginPath(); x.roundRect(inset + dx, inset + dy, size - inset * 2, size - inset * 2, rr); x.fill(); };
      if (!maskable) card(3 * s, 4 * s, 'rgba(0,0,0,.45)');
      card(0, 0, '#f1e9d6');
      const rnd = seeded(31); x.fillStyle = '#e3d8bd'; for (let i = 0; i < 260; i++) sq(inset + rnd() * (size - inset * 2), inset + rnd() * (size - inset * 2), s, s);
      // Ring holes on the spine, like the notebook cover.
      if (!maskable) for (let k = 0; k < 4; k++) { x.fillStyle = '#0b0912'; sq(inset + 6 * s, inset + 18 * s + k * 26 * s, 6 * s, 4 * s); x.fillStyle = '#8c8ab0'; sq(inset + 2 * s, inset + 16 * s + k * 26 * s, 12 * s, 3 * s); }
      // A rainbow brush stroke behind the drops.
      const cols = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'], y0 = size * .58, band = 9 * s, x0 = size * (maskable ? .22 : .17), x1 = size * (maskable ? .78 : .9);
      cols.forEach((c, i) => { x.fillStyle = ramp(C(c)).sh; sq(x0 + (x1 - x0) * i / 6, y0 + band + 2 * s, (x1 - x0) / 6 + s, band * .35); x.fillStyle = C(c); sq(x0 + (x1 - x0) * i / 6 - (i ? s : 0), y0 + (i % 2) * s, (x1 - x0) / 6 + s, band); x.fillStyle = ramp(C(c)).hi; sq(x0 + (x1 - x0) * i / 6 + 2 * s, y0 + (i % 2) * s, (x1 - x0) / 6 - 4 * s, s); });
      // The three drops.
      [['carmin', 'rojo', 0], ['ambar', 'amarillo', 1], ['anil', 'azul', 2]].forEach(([id, col, i]) => {
        const spr = buildSprite(id + '_title', C(col), null, { eyes: 'normal' }), k = (maskable ? .85 : 1.1) * s;
        const w = spr.width * k, h = spr.height * k, cx = size * (maskable ? .5 : .53) + (i - 1) * size * (maskable ? .2 : .26), by = y0 + band + 3 * s;
        x.fillStyle = 'rgba(20,15,28,.25)'; x.beginPath(); x.ellipse(cx, by + 2 * s, w * .45, 4 * s, 0, 0, 6.29); x.fill();
        x.drawImage(spr, Math.round(cx - w / 2), Math.round(by - h), Math.round(w), Math.round(h));
      });
    };
  },
  fuente() {
    ESCENAS.mapa(); Game.paused = true;
    ESCENA.after = () => {
      g.fillStyle = '#f4eddc'; g.fillRect(0, 0, W, H);
      const rows = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ ÁÉÍÓÚÜÑÇ', 'abcdefghijklmnopqrstuvwxyz áéíóúüñç', '0123456789 .,:;!¡?¿-+/%()<>=*^\'"·…_~&«»[]#', '↑↓←→ ♥★✓× °½  Añil y Ámbar mezclan rojo, amarillo y azul.', 'Carmín protege. ¿Quién pinta el jardín? ¡Llamarada! (x2) 31-37 daño'];
      rows.forEach((r, i) => smallText(r, 6, 6 + i * 11, i === 4 ? '#706452' : '#302a3b'));
      smallText('El escritor de tinta: la plumilla escribe y cada letra se seca después.', 6, 62, '#302a3b', { progress: 38.6, wet: '#3a6fe2', nib: true });
      bigText('ABCDEFGHIJKLM', 6, 78, '#e23c3c'); bigText('NOPQRSTUVWXYZ', 6, 92, '#f2c93a'); bigText('ÁÉÍÓÚÑ 0123456789', 6, 106, '#3a6fe2');
      bigText('+-!¡?.,:/%×·»() ', 6, 120, '#4fb84a'); bigText('¡COLOR RECUPERADO!', 6, 134, '#f4f0ea'); bigText('LLAMARADA', 150, 134, '#f07d2a', { progress: 40 });
      bigText('128', 6, 150, '#f4f0ea'); bigText('2050', 40, 150, '#f2c93a'); bigText('+48', 90, 150, '#4fb84a'); bigText('PROTEGE', 130, 150, '#e23c3c');
      smallText('Trazo doble · Punteado · Taquigrafía · Caligrafía · Manchurrón · Ráfaga', 6, 166, '#302a3b');
    };
  },
};
(function () {
  const q = new URLSearchParams(location.search), name = q.get('escena'), frames = Math.max(0, parseInt(q.get('t') || '0', 10));
  if (!name || !ESCENAS[name]) return;
  Audio.sfx = () => {}; Audio.play = () => {}; Audio.prepare = () => {}; Audio.stop = () => {}; Audio.bend = () => {};
  if (typeof SFX !== 'undefined') SFX.ambient = () => {};
  Math.random = seeded(7);
  document.getElementById('hint').style.display = 'none';
  // ?medir=1 writes the touch layout's measurements into the title for a headless --dump-dom.
  if (q.get('medir')) setTimeout(() => { const r = id => document.getElementById(id).getBoundingClientRect(), shell = document.getElementById('game-shell'); document.title = 'MEDIDAS ' + JSON.stringify({ inner: [innerWidth, innerHeight], shell: [r('game-shell').width, r('game-shell').height], cols: getComputedStyle(shell).gridTemplateColumns, rows: getComputedStyle(shell).gridTemplateRows, actions: [r('touch-actions').left, r('touch-actions').width], move: [r('touch-movement').left, r('touch-movement').width], screen: [r('game-screen').width, r('game-screen').height], toolbar: [r('touch-toolbar').width, r('touch-toolbar').height], body: getComputedStyle(document.body).display }); }, 300);
  const bootAt = () => {
    ESCENAS[name]();
    for (let i = 0; i < frames; i++) {
      if (ESCENA.dialogue) { const d = B.tr.dlg, line = DATA.bossDialogue[d.i]; d.t++; writerAdvance(d, line.text); tickArtUI(); realRender(); continue; }
      realUpdate(); realRender(); // draw every frame: entrances are observed at render time, as in play
    }
    ESCENA.frozen = true;
  };
  bootAt();
})();
