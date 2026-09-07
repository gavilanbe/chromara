/* Real-canvas puzzle regression: traverse actual collisions and cast through
   the shipped palette. Uses Playwright from the same setup as test_world.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const base = process.argv.find(a => a.startsWith('http')) || 'http://127.0.0.1:8765';
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 760 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.waitForFunction(() => window.__chromara);
    await page.evaluate(() => {
      window.fieldTest = {
        setup() {
          resetGame(); Game.state = 'overworld'; Game.paused = true; Game.intro = false; OW.msg = OW.menu = Game.overlay = null;
          Game.defeated = new Set(MAP.spots.map(s => s.key)); releaseInputs();
          Party.forEach(p => { p.cur.hp = effStats(p).hp; p.cur.mp = 0; });
        },
        // A 4px flood is stricter than tile routing: all four foot corners and
        // every decorative base must fit. No puzzle flags are changed here.
        route(id, move = false) {
          const target = fieldTargets().find(t => t.id === id), nx = MAP.w * 4, ny = MAP.h * 4;
          const queue = [[Math.round(OW.x / 4), Math.round(OW.y / 4), -1]], seen = new Set([queue[0][1] * nx + queue[0][0]]);
          const original = [OW.x, OW.y]; let end = -1;
          for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i];
            if (Math.hypot(x * 4 - target.x, y * 4 - target.y) < 22) {
              OW.x = x * 4; OW.y = y * 4;
              if (fieldReachable(target) && fieldNearby()[0]?.id === id) { end = i; break; }
            }
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
              const a = x + dx, b = y + dy, key = b * nx + a;
              if (a < 0 || b < 0 || a >= nx || b >= ny || seen.has(key) || !walkable(a * 4, b * 4)) continue;
              seen.add(key); queue.push([a, b, i]);
            }
          }
          [OW.x, OW.y] = original;
          if (end < 0) return false;
          if (move) {
            const route = []; for (let i = end; i >= 0; i = queue[i][2]) route.unshift(queue[i]);
            OW.hist = [];
            for (const [x, y] of route) { if (!walkable(x * 4, y * 4)) throw new Error('Route crosses solid ground'); OW.x = x * 4; OW.y = y * 4; OW.hist.unshift([OW.x, OW.y]); }
            OW.hist.length = Math.min(40, OW.hist.length); OW.msg = OW.menu = OW.ring = null;
            for (const sg of MAP.signs) sg.read = true;
          }
          return true;
        },
        begin(id, color) {
          if (!this.route(id, true)) throw new Error('No path to ' + id);
          openRing(id); OW.ring.idx = FIELD.findIndex(f => f.id === color); render();
          const before = JSON.stringify(Game.puzzle), mp = Party.map(p => p.cur.mp);
          const owner = fieldOwner(FIELD[OW.ring.idx]), pos = fieldCasterPosition(owner);
          pressed.ok = true; updateOverworld();
          if (!OW.act) throw new Error('Palette refused ' + id + '/' + color + ': ' + OW.ring?.notice);
          updateOverworld();
          if (OW.cast.x !== pos[0] || OW.cast.y !== pos[1]) throw new Error('Caster teleported');
          return { before, mp };
        },
        finish() {
          let n = 0; const phases = new Set();
          while (OW.act) { if (++n > 200) throw new Error('Action never ends'); if (OW.fieldCast) phases.add(OW.fieldCast.t < 16 ? 'charge' : OW.fieldCast.t < 42 ? 'flight' : 'arrival'); updateOverworld(); render(); }
          if (OW.cast || OW.fieldCast) throw new Error('Temporary caster was not cleaned up');
          return { n, phases: [...phases] };
        },
        cast(id, color) {
          const start = this.begin(id, color);
          for (let i = 0; i < 38; i++) updateOverworld();
          if (JSON.stringify(Game.puzzle) !== start.before) throw new Error('Pigment applied before arrival');
          const result = this.finish();
          if (Party.some((p, i) => p.cur.mp !== start.mp[i])) throw new Error('Exploration consumed MP');
          return result;
        },
        bounds() { return UI_TEXT.filter(t => t.x < 0 || t.y < 0 || t.x + t.w > W || t.y + t.h > H); }
      };
      fieldTest.setup();
    });

    const gates = await page.evaluate(() => {
      const initial = { wax: fieldTest.route('wax'), seed: fieldTest.route('seed'), lens: fieldTest.route('lens'), press: fieldTest.route('press') };
      const before = JSON.stringify(Game.puzzle), mp = Party.map(p => p.cur.mp);
      for (const f of FIELD) { const gen = fieldGen(f, 'lens'); if (!gen.next().done) throw new Error('Remote spell accepted'); }
      const early = openEstucheGen(); if (!early.next().done) throw new Error('Remote chest accepted');
      const origin = [OW.x, OW.y]; OW.x = 424; OW.y = 364;
      const wall = Math.hypot(OW.x - 456, OW.y - 364) < 48 && !fieldReachable(fieldTargets().find(t => t.id === 'seed'));
      [OW.x, OW.y] = origin;
      return { initial, wall, unchanged: before === JSON.stringify(Game.puzzle), mp: mp.every((v, i) => Party[i].cur.mp === v), reward: !!Game.owned.pluma };
    });
    assert.deepEqual(gates.initial, { wax: true, seed: false, lens: false, press: false }); assert(gates.wall && gates.unchanged && gates.mp && !gates.reward);
    console.log('PASS initial gating, no casting through walls or remotely opening the reward');

    const errorsAndRecovery = await page.evaluate(() => {
      fieldTest.cast('wax', 'azul'); fieldTest.cast('wax', 'amarillo');
      const wrong = Game.puzzle.painted === 0 && fieldMix(Game.puzzle.bowls.wax) === 'verde';
      fieldTest.cast('wax', 'rojo'); const mud = fieldMix(Game.puzzle.bowls.wax) === 'barro';
      fieldTest.cast('wax', 'agua'); const clean = !Game.puzzle.bowls.wax.length;
      fieldTest.route('wax', true); openRing('wax'); OW.ring.idx = 0; Party.find(p => p.id === 'carmin').cur.hp = 0;
      const before = JSON.stringify(Game.puzzle); fieldApply(); const blocked = !OW.act && !!OW.ring.notice && before === JSON.stringify(Game.puzzle);
      Party.find(p => p.id === 'carmin').cur.hp = 1;
      // Swapping the three actual weapons must not alter primary identity.
      Party.forEach((p, i) => { p.weapon = ['pincel','brocha','lapiz'][i]; });
      const owners = FIELD.map(f => [f.id, fieldOwner(f).id, fieldOk(f)]);
      fieldTest.cast('wax', 'rojo');
      const repeated = JSON.stringify(Game.puzzle); openRing('wax'); OW.ring.idx = 0; fieldApply();
      const duplicate = !OW.act && repeated === JSON.stringify(Game.puzzle);
      fieldTest.cast('wax', 'amarillo');
      const opened = Game.puzzle.painted === 1 && fieldTest.route('seed') && !fieldTest.route('lens');
      openRing('wax'); OW.ring.idx = 3; fieldApply(); const permanent = !OW.act && Game.puzzle.painted === 1;
      return { wrong, mud, clean, blocked, owners, duplicate, opened, permanent };
    });
    assert(errorsAndRecovery.wrong && errorsAndRecovery.mud && errorsAndRecovery.clean && errorsAndRecovery.blocked && errorsAndRecovery.duplicate && errorsAndRecovery.opened && errorsAndRecovery.permanent);
    assert.deepEqual(errorsAndRecovery.owners, [['rojo','carmin',true],['amarillo','ambar',true],['azul','anil',true],['agua','anil',true]]);
    console.log('PASS wrong mixtures, mud, washing, KO, weapon independence, free retries and permanent passage');

    const bridgeAndLens = await page.evaluate(() => {
      fieldTest.cast('seed', 'amarillo'); fieldTest.cast('seed', 'azul');
      const bridge = Game.puzzle.sunBend === 1 && ['a','b','c','lens','press','wax'].every(id => fieldTest.route(id));
      fieldTest.route('press', true); const before = JSON.stringify(Game.puzzle); const locked = openEstucheGen().next().done;
      fieldTest.cast('lens', 'rojo'); fieldTest.cast('lens', 'azul');
      return { bridge, locked, unclaimed: !Game.owned.pluma, revealed: Game.puzzle.revealed, edges: fieldEdges().map(e => e.actual), noLoop: Game.puzzle.opened === false };
    });
    assert(bridgeAndLens.bridge && bridgeAndLens.locked && bridgeAndLens.unclaimed && bridgeAndLens.revealed && bridgeAndLens.noLoop);
    assert.deepEqual(bridgeAndLens.edges, [null,null,null]);
    console.log('PASS living bridge, all stations reachable, local lens reveal and sealed reward');

    const circuit = await page.evaluate(() => {
      const solutions = [], colors = ['rojo','amarillo','azul'];
      for (const a of colors) for (const b of colors) for (const c of colors) if (fieldEdges({a,b,c}).every(e => e.actual === e.color)) solutions.push({a,b,c});
      fieldTest.cast('a', 'amarillo'); fieldTest.cast('b', 'rojo'); fieldTest.cast('c', 'azul');
      const wrong = !fieldCircuitReady();
      const before = fieldEdges().map(e => e.actual); fieldTest.cast('a', 'rojo');
      const after = fieldEdges().map(e => e.actual), connected = before[2] === after[2] && before[0] !== after[0] && before[1] !== after[1];
      fieldTest.cast('b', 'azul'); fieldTest.cast('c', 'amarillo'); const ready = fieldCircuitReady();
      fieldTest.cast('a', 'agua'); const closedAgain = !fieldCircuitReady() && fieldEdges().filter(e => !e.actual).length === 2;
      fieldTest.cast('a', 'rojo'); const stable = fieldCircuitReady();
      const revealed = Game.puzzle.revealed; Game.puzzle.revealed = false; const needsPlan = !fieldCircuitReady(); Game.puzzle.revealed = revealed;
      return { solutions, wrong, connected, ready, closedAgain, stable, needsPlan, mp: Party.every(p => p.cur.mp === 0) };
    });
    assert.deepEqual(circuit.solutions, [{ a:'rojo', b:'azul', c:'amarillo' }]); assert(circuit.wrong && circuit.connected && circuit.ready && circuit.closedAgain && circuit.stable && circuit.needsPlan && circuit.mp);
    console.log('PASS unique solution, two channels per node, reversible inputs, all three constraints required');

    await page.evaluate(() => { fieldTest.route('b', true); openRing('b'); OW.ring.idx = 2; render(); });
    await page.locator('canvas').first().screenshot({ path: path.join(root, 'artifacts/field-palette-circuit.png') });
    const overflow = await page.evaluate(() => {
      const issues = [];
      for (const target of fieldTargets()) {
        fieldTest.route(target.id, true); openRing(target.id);
        for (let i = 0; i < FIELD.length; i++) { OW.ring.idx = i; render(); issues.push(...fieldTest.bounds()); }
      }
      for (const [x, y] of [[20,20],[620,460],[20,460],[620,20]]) { OW.x = x; OW.y = y; openRing(); render(); issues.push(...fieldTest.bounds()); }
      return issues;
    });
    assert.deepEqual(overflow, []); console.log('PASS all four spells, all targets and map-edge menus fit the native canvas');

    // A real mouse/touch pointer selects first and only casts on Apply.
    await page.evaluate(() => { fieldTest.route('b', true); openRing('b'); render(); });
    const canvas = page.locator('canvas').first(); let box = await canvas.boundingBox();
    await page.mouse.click(box.x + 50 / 320 * box.width, box.y + 58 / 180 * box.height);
    assert.equal(await page.evaluate(() => OW.ring.idx === 0 && !OW.act), true);
    await page.mouse.click(box.x + 280 / 320 * box.width, box.y + 160 / 180 * box.height);
    assert.equal(await page.evaluate(() => !!OW.act && !OW.ring), true);
    await page.evaluate(() => { fieldTest.finish(); fieldTest.cast('b','azul'); OW.ring = null; Game.paused = false; });
    await page.keyboard.press('c'); await page.waitForFunction(() => OW.ring);
    const index = await page.evaluate(() => OW.ring.idx);
    await page.keyboard.press('ArrowUp'); await page.waitForFunction(i => OW.ring.idx !== i, index);
    assert.equal(await page.evaluate(() => !!OW.ring && !OW.act), true);
    await page.keyboard.press('x'); await page.waitForFunction(() => !OW.ring);
    await page.evaluate(() => { Game.paused = true; });
    console.log('PASS real pointer select/apply and keyboard C, up and X without accidental casts');

    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => { fieldTest.route('c', true); openRing('c'); render(); });
    assert.deepEqual(await page.evaluate(() => fieldTest.bounds()), []);
    box = await canvas.boundingBox();
    await page.mouse.click(box.x + 50 / 320 * box.width, box.y + 106 / 180 * box.height);
    assert.equal(await page.evaluate(() => OW.ring.idx), 2);
    await page.screenshot({ path: path.join(root, 'artifacts/field-mobile.png') });
    await page.setViewportSize({ width: 1280, height: 760 });
    console.log('PASS palette and touch hit areas in mobile landscape');

    const reward = await page.evaluate(() => {
      fieldTest.route('press', true); OW.ring = null; pressed.ok = true; updateOverworld();
      const began = !!OW.act; fieldTest.finish();
      const owned = Game.owned.pluma && Game.puzzle.opened, before = JSON.stringify(Game.puzzle);
      const repeated = openEstucheGen().next().done && before === JSON.stringify(Game.puzzle);
      return { began, owned, repeated, mp: Party.every(p => p.cur.mp === 0), escaped: fieldTest.route('wax') };
    });
    assert(reward.began && reward.owned && reward.repeated && reward.mp && reward.escaped, JSON.stringify(reward));
    console.log('PASS reward from actual interaction, once only, no MP cost and return path');

    const cleanup = await page.evaluate(() => {
      fieldTest.setup(); fieldTest.begin('wax','rojo'); for (let i=0;i<20;i++) updateOverworld(); OW.act.return(); OW.act = null;
      const beforeArrival = !Game.puzzle.bowls.wax.length && !OW.cast && !OW.fieldCast;
      fieldTest.cast('wax','rojo'); fieldTest.begin('wax','amarillo'); for (let i=0;i<60;i++) updateOverworld(); OW.act.return(); OW.act = null;
      const afterArrival = Game.puzzle.painted === 1 && !OW.cast && !OW.fieldCast;
      fieldTest.setup(); return { beforeArrival, afterArrival, reset: !Game.puzzle.painted && !Game.puzzle.revealed && !Game.puzzle.opened && !Game.owned.pluma && !OW.ring && !OW.cast && Object.values(Game.puzzle.nodes).every(v => v === null) };
    });
    assert(cleanup.beforeArrival && cleanup.afterArrival && cleanup.reset);
    const accessibility = await page.evaluate(() => {
      fieldTest.begin('wax','rojo'); Prefs.camera = 'fija'; Prefs.flash = 0;
      const cam = JSON.stringify(OW.cam); let cameraMoved = false;
      for (let i = 0; i < 20; i++) { updateOverworld(); cameraMoved ||= JSON.stringify(OW.cam) !== cam; }
      Game.paused = false; openOverlay('settings'); const t = OW.fieldCast.t;
      for (let i = 0; i < 50; i++) update();
      const paused = t === OW.fieldCast.t; closeOverlay(); Game.paused = true;
      while (OW.act) { updateOverworld(); render(); cameraMoved ||= JSON.stringify(OW.cam) !== cam; }
      const complete = Game.puzzle.bowls.wax[0] === 'rojo' && !OW.fieldCast && !OW.cast;
      Prefs.camera = 'suave'; Prefs.flash = .4;
      return { paused, cameraMoved, complete };
    });
    assert(accessibility.paused && accessibility.complete && !accessibility.cameraMoved);
    assert.deepEqual(errors, []);
    console.log('PASS interruption cleanup, stable transformations, reset, paused options, fixed camera and no browser errors');
    fs.mkdirSync(path.join(root,'artifacts'), { recursive:true });
    fs.writeFileSync(path.join(root,'artifacts/field-test-results.json'), JSON.stringify({ gates, errorsAndRecovery, bridgeAndLens, circuit, reward, cleanup, errors }, null, 2));
    if (process.argv.includes('--capture')) {
      const capture = await page.evaluate(() => {
        fieldTest.setup(); Party.forEach(p => { p.cur.mp = effStats(p).mp; });
        const frames = [], events = [], shots = {}, original = Audio.sfx; let clock = 0;
        Audio.sfx = (name, options = {}) => events.push({ name, options: { ...options, when: clock / 60 + (options.when || 0) } });
        const frame = () => { updateOverworld(); render(); if (clock % 2 === 0) frames.push(buf.toDataURL()); clock++; };
        const hold = n => { for (let i = 0; i < n; i++) frame(); };
        const cast = (id, color) => {
          fieldTest.route(id, true); openRing(id); OW.ring.idx = FIELD.findIndex(f => f.id === color); render();
          if (id === 'wax' && color === 'rojo') shots.palette = cv.toDataURL();
          hold(35); fieldApply();
          while (OW.act) {
            frame(); const s = OW.fieldCast;
            if (s?.t === 30 && !shots[color]) shots[color] = cv.toDataURL();
            if (s?.t === 86 && s.transform) shots[id] = cv.toDataURL();
          }
          hold(24);
        };
        try {
          cast('wax','azul'); cast('wax','agua'); cast('wax','rojo'); cast('wax','amarillo');
          cast('seed','amarillo'); cast('seed','azul'); cast('lens','rojo'); cast('lens','azul');
          cast('a','rojo'); cast('b','azul'); cast('c','amarillo');
          fieldTest.route('press', true); OW.ring = null; OW.fieldToast = null; OW.cam.x = 320; OW.cam.y = 216; render(); shots.circuit = cv.toDataURL();
          hold(35); OW.act = openEstucheGen(); while (OW.act) frame(); hold(65);
          return { frames, events, shots, duration: frames.length / 30 };
        } finally { Audio.sfx = original; }
      });
      const output = path.join(root,'artifacts'), temp = fs.mkdtempSync(path.join(os.tmpdir(),'chromara-field-'));
      try {
        for (const [name, data] of Object.entries(capture.shots)) fs.writeFileSync(path.join(output,'field-'+name+'.png'), Buffer.from(data.split(',')[1],'base64'));
        capture.frames.forEach((data,i) => fs.writeFileSync(path.join(temp,String(i).padStart(4,'0')+'.png'), Buffer.from(data.split(',')[1],'base64')));
        const pcm = await page.evaluate(async ({ events, duration, source }) => {
          const rate = 32000, context = new OfflineAudioContext(2, Math.ceil(duration * rate), rate), master = context.createGain(); master.gain.value = .5; master.connect(context.destination);
          const kit = new Function(source + ';return SFX;')(); kit.init(context, master); kit.duck = () => {};
          for (const event of events) kit.play(event.name, event.options);
          const buffer = await context.startRendering(), channels = [buffer.getChannelData(0), buffer.getChannelData(1)], bytes = new Uint8Array(buffer.length * 4), view = new DataView(bytes.buffer); let peak = 0;
          for (let i = 0; i < buffer.length; i++) for (let j = 0; j < 2; j++) { const v = channels[j][i]; if (!Number.isFinite(v) || Math.abs(v) >= 1) throw new Error('Invalid audio'); peak = Math.max(peak, Math.abs(v)); view.setInt16((i * 2 + j) * 2, Math.round(v * 32767), true); }
          let text = ''; for (let i=0;i<bytes.length;i+=8192) text += String.fromCharCode(...bytes.subarray(i,i+8192));
          return { data:btoa(text), peak };
        }, { events: capture.events, duration: capture.duration, source:fs.readFileSync(path.join(root,'sfx.js'),'utf8') });
        assert(pcm.peak > .01); fs.writeFileSync(path.join(temp,'audio.pcm'), Buffer.from(pcm.data,'base64'));
        execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-framerate','30','-i',path.join(temp,'%04d.png'),'-f','s16le','-ar','32000','-ac','2','-i',path.join(temp,'audio.pcm'),'-vf','scale=960:540:flags=neighbor','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',path.join(output,'field-magic.mp4')]);
        console.log('PASS captured ' + capture.duration.toFixed(1) + 's of actual magic with synchronized sound');
      } finally { fs.rmSync(temp,{recursive:true,force:true}); }
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
