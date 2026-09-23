/* Images the installed app needs besides the game: the maskable 192 px icon, iOS launch screens (Safari shows them
   while the game loads) and the screenshots that the Android install dialog shows. Needs the local server:
     python3 -m http.server 8765 &   NODE_PATH=… CHROME_BIN=… node tools/build_pwa_assets.cjs
   Then run node tools/build_pwa.cjs so the new files get a new version.                                             */
const {chromium} = require('playwright'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), base = process.argv[2] || 'http://127.0.0.1:8765/';
// iPhone and iPad screens: CSS size and pixel ratio. Each gets a portrait and a landscape launch image.
const DEVICES = [[440, 956, 3], [430, 932, 3], [402, 874, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 2], [375, 667, 2],
  [744, 1133, 2], [768, 1024, 2], [820, 1180, 2], [834, 1194, 2], [1024, 1366, 2]];
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME_BIN});
  const page = async (w, h, dpr = 1, touch = false) => (await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch, serviceWorkers: 'block'})).newPage();
  // maskable 192
  { const p = await page(192, 192); await p.goto(base + 'index.html?escena=icono&size=192&maskable=1'); await p.waitForTimeout(500); await p.screenshot({path: path.join(root, 'icons/icon-maskable-192.png'), clip: {x: 0, y: 0, width: 192, height: 192}}); await p.context().close(); }
  // launch screens (flat colour keeps each PNG small): the icon on the desk, with the name in the notebook's lettering
  const icon = fs.readFileSync(path.join(root, 'icons/icon-512.png')).toString('base64'), font = fs.readFileSync(path.join(root, 'chromara-rotulo.ttf')).toString('base64');
  const splash = `<!doctype html><style>@font-face{font-family:R;src:url(data:font/ttf;base64,${font})}html,body{margin:0;height:100%}body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vmin;
    background:#0b0912}
    img{width:34vmin;height:34vmin;image-rendering:pixelated;filter:drop-shadow(0 1.4vmin 0 #07060c)}b{font:400 32px/1 R;letter-spacing:2px;color:#e8d8b0;transform:scale(var(--k));text-shadow:0 2px 0 #07060c}</style>
    <img src="data:image/png;base64,${icon}"><b>CHROMARA</b><script>document.querySelector('b').style.setProperty('--k',Math.max(1,Math.round(Math.min(innerWidth,innerHeight)/260)))</script>`;
  fs.mkdirSync(path.join(root, 'icons/splash'), {recursive: true});
  const links = [];
  for (const [w, h, dpr] of DEVICES) for (const [ow, oh, o] of [[w, h, 'portrait'], [h, w, 'landscape']]) {
    const name = `icons/splash/splash-${ow * dpr}x${oh * dpr}.png`, p = await page(ow, oh, dpr);
    await p.setContent(splash); await p.waitForTimeout(150); await p.screenshot({path: path.join(root, name)}); await p.context().close();
    links.push(`<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${o})" href="${name}">`);
  }
  // install screenshots: the phone held both ways, on the map and in a battle
  fs.mkdirSync(path.join(root, 'icons/screenshots'), {recursive: true});
  for (const [w, h, tag] of [[360, 640, 'narrow'], [640, 360, 'wide']]) for (const e of ['mapa', 'paleta']) {
    const p = await page(w, h, 2, true); await p.goto(base + `index.html?escena=${e}&touch=1`); await p.waitForTimeout(700);
    await p.evaluate(() => { for (const f of ['updateTouchControls']) if (typeof window[f] === 'function') window[f](); });
    await p.screenshot({path: path.join(root, `icons/screenshots/${tag}-${e}.png`)}); await p.context().close();
  }
  // the launch-screen links go between markers in index.html
  const file = path.join(root, 'index.html'), html = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, html.replace(/<!-- splash -->[\s\S]*?<!-- \/splash -->/, '<!-- splash -->\n' + links.join('\n') + '\n<!-- /splash -->'));
  console.log(`maskable icon, ${links.length} launch screens and 4 screenshots written`);
  await browser.close();
})();
