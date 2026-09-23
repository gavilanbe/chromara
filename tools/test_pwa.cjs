/* The installable app: the stamped version is current, the manifest and its images are complete, and in a real browser
   the game installs, plays offline (music included), and takes new versions only when nothing is lost: at once at the
   cover, but never in the middle of a game, where a note waits until the player is back at the title.
     NODE_PATH=… CHROME_BIN=… node tools/test_pwa.cjs                                                                  */
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), {execFileSync} = require('child_process');
const assert = require('node:assert/strict'), {chromium} = require('playwright');
const root = path.join(__dirname, '..');
let checks = 0; const pass = name => { checks++; console.log('PASS ' + name); };
const png = f => { const b = fs.readFileSync(path.join(root, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

execFileSync(process.execPath, [path.join(__dirname, 'build_pwa.cjs'), '--check'], {stdio: 'inherit'});
pass('sw.js and index.html carry the current content version');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const k of ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color']) assert(manifest[k], 'manifest.' + k);
for (const i of [...manifest.icons, ...manifest.screenshots]) assert.equal(png(i.src).join('x'), i.sizes, i.src);
assert(manifest.icons.some(i => i.purpose === 'maskable') && manifest.icons.some(i => i.purpose === 'any' && i.sizes === '512x512'));
assert(manifest.screenshots.some(s => s.form_factor === 'wide') && manifest.screenshots.some(s => s.form_factor === 'narrow'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), splashes = [...html.matchAll(/device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\) and \(orientation: (\w+)\)" href="([^"]+)"/g)];
assert(splashes.length >= 20, 'iOS launch screens');
for (const [, w, h, r, o, f] of splashes) { const [pw, ph] = png(f), [cw, ch] = o === 'portrait' ? [w, h] : [h, w]; assert.deepEqual([pw, ph], [cw * r, ch * r], f); }
pass('manifest, icons, screenshots and ' + splashes.length + ' iOS launch screens match their declared sizes');

// A copy of the site under /chromara/, as on GitHub Pages, that the test can publish new versions to.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chromara-pwa-')), site = path.join(tmp, 'chromara');
const {SHELL, MUSIC} = require('./build_pwa.cjs');
for (const f of [...SHELL, 'sw.js', 'music_cues.js', ...MUSIC.map(u => u.split('?')[0]), 'tools/build_pwa.cjs']) { fs.mkdirSync(path.dirname(path.join(site, f)), {recursive: true}); fs.copyFileSync(path.join(root, f), path.join(site, f)); }
const publish = () => { fs.appendFileSync(path.join(site, 'data.js'), '\n// publicado ' + Date.now() + '\n'); execFileSync(process.execPath, [path.join(site, 'tools/build_pwa.cjs'), '--root', site]); return fs.readFileSync(path.join(site, 'sw.js'), 'utf8').match(/const VERSION = '(\w+)'/)[1]; };
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json', '.ogg': 'audio/ogg'};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (!p.startsWith('/chromara/')) { res.writeHead(404); return res.end(); }
  p = path.join(tmp, p.endsWith('/') ? p + 'index.html' : p);
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, {'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'max-age=600'}); res.end(data); });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/chromara/`, browser = await chromium.launch({executablePath: process.env.CHROME_BIN});
  const context = await browser.newContext({viewport: {width: 844, height: 390}, hasTouch: true, isMobile: true});
  await context.addInitScript(() => { try { localStorage.setItem('chromara.pwa.dev', '1'); } catch (_) {} }); // local hosts skip the worker otherwise
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  const version = () => page.evaluate(() => window.CHROMARA_VERSION);
  try {
    const v1 = fs.readFileSync(path.join(site, 'sw.js'), 'utf8').match(/const VERSION = '(\w+)'/)[1];
    await page.goto(url); await page.waitForFunction(() => navigator.serviceWorker.controller, null, {timeout: 20000});
    assert.equal(await version(), v1);
    await page.evaluate(() => pwaCacheMusic()); // normally a few seconds after the first visit
    const musicCount = () => page.evaluate(() => caches.open('chromara-musica').then(c => c.keys()).then(k => k.length));
    for (let i = 0; i < 120 && await musicCount() < MUSIC.length; i++) await page.waitForTimeout(250);
    assert.equal(await musicCount(), MUSIC.length, 'music was not stored for offline play');
    pass('first visit installs the shell and, in the background, all ' + MUSIC.length + ' music cues');

    await context.setOffline(true); await page.reload(); await page.waitForFunction(() => window.__chromara, null, {timeout: 20000});
    assert.equal(await version(), v1);
    assert.equal(await page.evaluate(n => Promise.all(n.map(u => fetch(u).then(r => r.ok && r.arrayBuffer()).then(b => b && b.byteLength > 1000))).then(a => a.every(Boolean)), MUSIC), true);
    assert.equal(await page.evaluate(() => fetch('otra-cosa.js').then(() => 'ok', () => 'fails')), 'fails');
    await context.setOffline(false);
    pass('without connection the game boots and every music cue plays from the device');

    // A new version while at the cover: it goes in at once, the page turns and the game reloads on it.
    const v2 = publish(); assert.notEqual(v2, v1);
    const turned = page.waitForEvent('load', {timeout: 20000});
    await page.evaluate(() => { Game.state = 'cover'; PWA.reg.update(); }); await turned;
    await page.waitForFunction(() => window.__chromara); assert.equal(await version(), v2);
    pass('at the cover a new version installs itself and reloads straight away');

    // In the middle of a game: nothing reloads, a note offers it, and it goes in once the player is back at the title.
    await page.evaluate(() => { Game.intro = false; resetGame(); OW.msg = null; }); // a game in progress
    const v3 = publish(); await page.evaluate(() => PWA.reg.update());
    await page.waitForSelector('#pwa-note.is-shown[data-type=update]', {timeout: 20000});
    await page.waitForTimeout(2500); assert.equal(await version(), v2, 'reloaded during a game');
    assert.equal(await page.evaluate(() => Game.state), 'overworld');
    const back = page.waitForEvent('load', {timeout: 20000}); await page.evaluate(() => { TITLE.exit = 0; setState('title'); }); await back;
    await page.waitForFunction(() => window.__chromara); assert.equal(await version(), v3);
    pass('during a game the update waits behind a note and goes in back at the title');

    const caches = await page.evaluate(async () => { const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).length; return out; });
    assert.deepEqual(Object.keys(caches).sort(), ['chromara-' + v3, 'chromara-musica'].sort());
    assert.equal(caches['chromara-musica'], MUSIC.length, 'music was dropped by the update');
    pass('old versions are deleted; the music survives updates without downloading again');
    assert.deepEqual(errors, []);
    console.log(checks + ' PWA checks passed.');
  } finally { await browser.close(); server.close(); fs.rmSync(tmp, {recursive: true, force: true}); }
})().catch(e => { console.error(e); process.exit(1); });
