/* Real canvas + navigation regressions. Run a local server, then:
   CHROME_BIN=/path/to/chrome node tools/test_world.cjs [http://127.0.0.1:8765]
   Uses the same optional Playwright development dependency as test_audio.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8765';
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base); await page.waitForFunction(() => window.__chromara);
    await page.evaluate(() => { __chromara.start(); Game.paused = true; Game.intro = false; OW.msg = null; });

    const routes = await page.evaluate(() => {
      // Four-pixel flood fill uses the actual feet collision, including props.
      function flood() {
        const nx = MAP.w * 4, ny = MAP.h * 4;
        const queue = [[Math.round(OW.x / 4), Math.round(OW.y / 4)]];
        const seen = new Set([queue[0][1] * nx + queue[0][0]]);
        for (let i = 0; i < queue.length; i++) {
          const [x, y] = queue[i];
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const a = x + dx, b = y + dy, k = b * nx + a;
            if (a < 0 || b < 0 || a >= nx || b >= ny || seen.has(k) || !walkable(a * 4, b * 4)) continue;
            seen.add(k); queue.push([a, b]);
          }
        }
        return (x, y, radius = 20) => queue.some(([a,b]) => Math.hypot(a * 4 - x, b * 4 - y) < radius);
      }
      let reachable = flood();
      const targets = MAP.spots.map(s => [s.key, s.x * 16 + 8, s.y * 16 + 12]);
      targets.push(['rinse glass', MAP.jar.x * 16 + 16, MAP.jar.y * 16 + 34]);
      targets.push(['puzzle entrance', 25 * 16 + 12, 21 * 16 + 8]);
      for (const o of worldObjects().filter(o => o.title)) targets.push([o.title, o.wx, o.wy + 8]);
      const unreachable = targets.filter(([,x,y]) => !reachable(x,y)).map(t => t[0]);
      const before = reachable(MAP.pz.seed[0] * 16 + 8, MAP.pz.seed[1] * 16 + 8, 12);
      Game.puzzle.painted = 1; reachable = flood();
      const seed = reachable(MAP.pz.seed[0] * 16 + 8, MAP.pz.seed[1] * 16 + 8, 12);
      Game.puzzle.sunBend = 1; reachable = flood();
      const circuit = DATA.puzzle.targets.filter(t => ['node','lens','press'].includes(t.kind)).every(t => reachable(t.x, t.y, 22));
      const chest = reachable(MAP.pz.estuche[0] * 16 + 8, MAP.pz.estuche[1] * 16 + 8, 25);
      Game.puzzle = PUZ0();
      return { unreachable, before, seed, circuit, chest,
        invalid: worldObjects().filter(o => o.size[2] && solid(tileAt(o.wx / 16 | 0, o.wy / 16 | 0))).map(o => o.kind),
        spawn: walkable(OW.x, OW.y) };
    });
    assert.deepEqual(routes.unreachable, []); assert.deepEqual(routes.invalid, []); assert(routes.spawn);
    assert.equal(routes.before, false); assert(routes.seed && routes.circuit && routes.chest, JSON.stringify(routes));
    console.log('PASS all encounters, landmarks, healing and puzzle stages remain reachable');

    const inspections = await page.evaluate(() => {
      const result = [];
      for (const o of worldObjects().filter(o => o.title)) {
        OW.x = o.wx; OW.y = o.wy + 14; OW.msg = null; OW.menu = null; OW.vx = OW.vy = 0;
        pressed.ok = true; updateOverworld();
        result.push([o.title, OW.msg?.lines[0], OW.menu === null]);
        OW.cam.x = clamp(OW.x - W / 2, 0, MAP.w * TILE - W); OW.cam.y = clamp(OW.y - H / 2, 0, MAP.h * TILE - H);
        render();
        if (OW.msg) for (const line of OW.msg.lines) { g.font = FONT; if (g.measureText(line).width > W - 32) throw new Error('Text overflow: ' + line); }
        if (OW.msg) { OW.msg.t = 21; pressed.back = true; updateOverworld(); if (OW.msg) throw new Error('Cannot close inspection'); }
      }
      OW.x = 11 * TILE + 8; OW.y = 12 * TILE + 8; OW.msg = null; pressed.ok = true; updateOverworld();
      const menu = !!OW.menu; OW.menu = null;
      return { result, menu };
    });
    for (const [expected, actual, closed] of inspections.result) { assert.equal(actual, expected); assert(closed); }
    assert(inspections.menu); console.log('PASS inspect/close every landmark, legible dialogue, ordinary menu preserved');

    const palettes = await page.evaluate(() => {
      const objects = worldObjects(), errors = [];
      for (const o of objects) {
        const first = worldSprite(o, 'gris'), second = worldSprite(o, 'vivo');
        if (first.toDataURL() === second.toDataURL()) errors.push(o.kind + ' did not restore colour');
        for (const pal of ['gris', 'vivo']) for (let frame = 0; frame < (o.kind === 'mill' ? 8 : o.kind === 'flower' ? 4 : o.kind === 'lotus' ? 2 : 1); frame++) {
          const s = worldSprite(o, pal, frame), alpha = s.getContext('2d').getImageData(0,0,s.width,s.height).data;
          if (!alpha.some((v,i) => i % 4 === 3 && v > 0)) errors.push(o.kind + ' empty sprite');
        }
      }
      for (const pal of ['gris','vivo']) {
        Game.palette = pal;
        for (const r of WORLD_REGIONS) {
          OW.x = r.x * TILE; OW.y = r.y * TILE; OW.cam.x = clamp(OW.x - W/2,0,MAP.w*TILE-W); OW.cam.y = clamp(OW.y-H/2,0,MAP.h*TILE-H);
          for (let i = 0; i < 8; i++) { OW.t = i * 22; render(); }
        }
        const tex = sceneTexture(pal); if (tex.data.length !== 640 * 480 * 4) errors.push('Invalid battle texture');
      }
      return { errors, count: objects.length, kinds: new Set(objects.map(o => o.kind)).size };
    });
    assert.deepEqual(palettes.errors, []); assert.equal(palettes.kinds, 13);
    console.log(`PASS ${palettes.count} props, 13 sprite types, animations and both palettes across seven regions`);

    const battle = await page.evaluate(() => {
      Game.palette = 'gris'; OW.x = MAP.spawn[0] * TILE + 8; OW.y = MAP.spawn[1] * TILE + 12;
      const keys = Object.keys(DATA.encounters), counts = [];
      for (const key of keys) {
        const foe = OW.foes.find(f => f.key === key) || { key, x: 200, y: 200, enemies: DATA.encounters[key] };
        initBattle(foe); B.gen = null; B.tr = null; B.phase = 'fight'; Game.state = 'battle';
        B.units.forEach(u => { u.wx=u.hx;u.wy=u.hy;u.wz=0; });B.unitScale=1;B.propScale=1;
        camSet(SCENE.rest); projectUnits(); render(); counts.push(B.props.filter(o => o.kind === 'art').length);
      }
      Game.state = 'overworld'; initOverworld(); Game.intro=false; OW.msg=null; Game.paused=true; render();
      return counts;
    });
    assert(battle.every(n => n > 0)); console.log('PASS new scenery in every battle composition');

    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'artifacts/world-garden.png') });
    await page.evaluate(() => { Game.palette='vivo';render(); });
    await page.screenshot({ path: path.join(root, 'artifacts/world-restored.png') });
    await page.evaluate(() => { Game.palette='gris';OW.x=31*16;OW.y=11*16;OW.cam.x=clamp(OW.x-W/2,0,MAP.w*TILE-W);OW.cam.y=OW.y-H/2;OW.hist=[];render(); });
    await page.screenshot({ path: path.join(root, 'artifacts/world-lagoon.png') });
    await page.setViewportSize({width:640,height:380});await page.evaluate(()=>render());
    await page.screenshot({path:path.join(root,'artifacts/world-small.png')});

    // Load through file:// too: the game's offline distribution uses the same art.
    await page.goto('file://' + path.join(root, 'index.html')); await page.waitForFunction(() => window.__chromara);
    await page.evaluate(() => { __chromara.start();Game.paused=true;OW.msg=null;render(); });
    assert.deepEqual(errors, []); console.log('PASS browser rendering at two sizes and offline startup with no JS errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
