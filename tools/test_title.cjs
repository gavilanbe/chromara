/* Real-canvas title regressions: redraws must not advance paint or play sounds;
   the cover, accessible start button and early keyboard/touch entry stay usable.
   Uses the optional Playwright development dependency, like test_world.cjs. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8765';
(async () => {
  // Keep pixel comparisons on one raster backend throughout repeated readbacks.
  const browser = await chromium.launch({ headless: true, args: ['--disable-accelerated-2d-canvas'],
    ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__chromara);
    await page.evaluate(() => {
      Game.paused = true; Game.state = 'cover'; COVER.t = 0; COVER.open = 0; COVER.started = false;
      window.titleSounds = []; Audio.sfx = (name, options) => titleSounds.push({ name, options });
      Audio.play = () => {}; Audio.prepare = () => {};
      // The closed notebook waits for the first gesture (it unlocks audio) and that gesture skips nothing.
      for (let i = 0; i < 30; i++) { updateCover(); drawCover(); }
      if (Game.state !== 'cover' || COVER.started) throw new Error('The cover opened without a gesture');
      ANYKEY = true;
      for (let i = 0; i < 180 && Game.state === 'cover'; i++) { updateCover(); drawCover(); }
    });
    assert.equal(await page.evaluate(() => Game.state), 'prologue');
    const prologue = await page.evaluate(() => {
      // The cinematic plays to the end on its own, renders deterministically and never touches gameplay RNG.
      const random = Math.random; Math.random = () => { throw new Error('Prologue rendering consumed gameplay RNG'); };
      try { for (let i = 0; i < 700 && Game.state === 'prologue'; i++) { drawPrologue(); updatePrologue(); } } finally { Math.random = random; }
      const played = Game.state;
      // Any key skips it once the first beat has been seen.
      startPrologue(); for (let i = 0; i < 20; i++) updatePrologue(); ANYKEY = true; updatePrologue();
      return { played, skipped: Game.state, t: TITLE.t };
    });
    assert.deepEqual(prologue, { played: 'title', skipped: 'title', t: 8 });
    console.log('PASS the cover opens into the prologue, which plays or skips into the painted title');

    const render = await page.evaluate(() => {
      titleSounds.length = 0;
      const random = Math.random, mismatches = [];
      Math.random = () => { throw new Error('Title rendering consumed gameplay RNG'); };
      try {
        // Read a separate software surface so repeated assertions do not switch
        // the live canvas from GPU to CPU rasterization halfway through a frame.
        const copy = document.createElement('canvas'); copy.width = W; copy.height = H;
        const readback = copy.getContext('2d', { willReadFrequently: true });
        const pixels = () => { readback.clearRect(0, 0, W, H); readback.drawImage(buf, 0, 0); return readback.getImageData(0, 0, W, H).data; };
        const same = (a, b) => a.every((v, i) => v === b[i]);
        for (let t = 0; t <= 420; t += 5) {
          TITLE.t = t; const before = JSON.stringify(TITLE);
          drawTitle(); const first = pixels();
          drawTitle();
          const second = pixels();
          if (!same(first, second) || before !== JSON.stringify(TITLE)) mismatches.push({ t, changes: first.reduce((n,v,i)=>n+(v!==second[i]),0), max: first.reduce((n,v,i)=>Math.max(n,Math.abs(v-second[i])),0) });
        }
        TITLE.t = 300; drawTitle(); const final = pixels();
        TITLE.t = 12; drawTitle(); TITLE.t = 300; drawTitle();
        return { mismatches, seekMatches: same(final, pixels()), sounds: titleSounds.length };
      } finally { Math.random = random; }
    });
    assert.deepEqual(render, { mismatches: [], seekMatches: true, sounds: 0 });
    console.log('PASS redraws, skipped frames and seeking preserve paint, audio and gameplay RNG');

    const timing = await page.evaluate(() => {
      TITLE.t = 0; TITLE.exit = 0; titleSounds.length = 0; titleStartButton.style.display = 'none';
      for (let i = 0; i < 175; i++) updateTitle();
      const hiddenDuringPainting = titleStartButton.style.display === 'none';
      for (let i = 0; i < 80; i++) { updateTitle(); drawTitle(); }
      const brushSounds = titleSounds.filter(s => s.name === 'brush_sweep').length;
      return { hiddenDuringPainting, visible: titleStartButton.style.display === 'block', brushSounds };
    });
    assert.deepEqual(timing, { hiddenDuringPainting: true, visible: true, brushSounds: 8 });
    await page.getByRole('button', { name: 'Comenzar aventura' }).focus();
    assert(await page.getByRole('button', { name: 'Comenzar aventura' }).evaluate(e => e === document.activeElement));
    await page.getByRole('button', { name: 'Comenzar aventura' }).click();
    const pointer = await page.evaluate(() => {
      const exit = TITLE.exit; beginTitleGame(); const stable = exit === TITLE.exit;
      for (let i = 0; i < 60; i++) { updateTitle(); render(); }
      return { stable, hidden: titleStartButton.style.display === 'none', state: Game.state, intro: OW.msg?.lines === DATA.texts.intro };
    });
    assert.deepEqual(pointer, { stable: true, hidden: true, state: 'overworld', intro: true });
    console.log('PASS accessible focus, click, double activation and page turn into the adventure');

    await page.evaluate(() => { Game.state = 'title'; TITLE.t = 12; TITLE.exit = 0; releaseInputs(); Game.paused = false; });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => TITLE.t >= TITLE_SETTLE && !TITLE.ff);
    const early = await page.evaluate(() => ({ state: Game.state, exit: TITLE.exit, button: titleStartButton.style.display }));
    assert.deepEqual(early, { state: 'title', exit: 0, button: 'block' }, 'an early press finishes the painting instead of entering');
    await page.waitForTimeout(400); await page.keyboard.press('Enter');
    await page.waitForFunction(() => TITLE.exit > 0);
    await page.waitForFunction(() => Game.state === 'overworld');
    await page.evaluate(() => { Game.paused = true; });
    const mashed = await page.evaluate(() => { Game.state = 'title'; TITLE.t = 12; TITLE.exit = 0; TITLE.ff = false; TITLE.ffDone = null; releaseInputs(); let frames = 0;
      while (TITLE.t < TITLE_SETTLE && frames < 60) { pressed.ok = true; updateTitle(); frames++; } for (let i = 0; i < 10; i++) { pressed.ok = true; updateTitle(); } return { frames, exit: TITLE.exit, state: Game.state }; });
    assert(mashed.frames < 40 && mashed.exit === 0 && mashed.state === 'title', 'mashing during the painting never enters: ' + JSON.stringify(mashed));
    console.log('PASS an early press completes the painting in a flash; entering takes a second press once it is settled');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__chromara);
    const reduced = await page.evaluate(() => {
      Game.paused = true; Game.state = 'title';
      for (let t = 0; t < 330; t += 3) { TITLE.t = t; render(); }
      return { shake: Prefs.shake, flash: Prefs.flash };
    });
    assert.deepEqual(reduced, { shake: 0, flash: 0 });
    console.log('PASS reduced-motion rendering disables recoil, spray and sheen');

    const mobile = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    mobile.on('pageerror', e => errors.push(e.message));
    await mobile.route('https://fonts.googleapis.com/**', route => route.abort());
    await mobile.goto(base, { waitUntil: 'domcontentloaded' }); await mobile.waitForFunction(() => window.__chromara);
    await mobile.evaluate(() => { Game.paused = true; Game.state = 'title'; TITLE.t = 179; TITLE.exit = 0; updateTitle(); render(); });
    const bounds = await mobile.getByRole('button', { name: 'Comenzar aventura' }).boundingBox();
    assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 844 && bounds.y + bounds.height <= 390);
    await mobile.getByRole('button', { name: 'Comenzar aventura' }).tap();
    assert(await mobile.evaluate(() => TITLE.exit > 0));
    await mobile.evaluate(() => { TITLE.exit = 0; TITLE.t = 1; TITLE.ff = false; TITLE.ffDone = null; releaseInputs(); Game.paused = false; });
    await mobile.locator('#touch-confirm').tap();
    await mobile.waitForFunction(() => TITLE.t >= TITLE_SETTLE && !TITLE.ff);
    assert.equal(await mobile.evaluate(() => TITLE.exit), 0, 'the first A-button tap only completes the painting');
    await mobile.waitForTimeout(400); await mobile.locator('#touch-confirm').tap();
    await mobile.waitForFunction(() => TITLE.exit > 0);
    console.log('PASS landscape mobile layout, start tap, and an early A-button tap that completes the painting first');
    assert.deepEqual(errors, []);
    console.log('7 title integration checks passed with no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
