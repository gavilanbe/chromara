// CHROMARA — sprites.js: personajes dibujados a mano en píxeles (matrices de caracteres) con rampa por color.
// Leyenda común: . transparente · O contorno · D oscuro · S sombra · B base · H luz · W brillo · K pupila · w blanco de ojo
// Extras por sprite: letras minúsculas/otras en `pal` (colores fijos).
'use strict';
const SPRITES = {
  // ---- Carmín: gota gorda y baja con boina de pintor y ceño decidido
  carmin_back: { pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '.............dd.............',
    '..........dbbccbbd..........',
    '........dbbcccccbbbd........',
    '.......dbccccccbbbbbd.......',
    '......dbbbbbbbbbbbbbbd......',
    '.......ddddddddddddd........',
    '.......OOHHHHBBBBBOO........',
    '......OHHHHBBBBBBBBSO.......',
    '.....OHHHBBBBBBBBBBSSO......',
    '....OHHBBBBBBBBBBBBSSSO.....',
    '....OHBBBBBBBBBBBBBSSSO.....',
    '...OHBBBBBBBBBBBBBBSSSDO....',
    '...OBBBBBBBBBBBBBBBSSSDO....',
    '...OBBBBBBBBBBBBBBSSSDDO....',
    '...OSBBBBBBBBBBBBBSSSDDO....',
    '...OSBBBBBBBBBBBBSSSDDDO....',
    '....OSBBBBBBBBBBSSSDDDO.....',
    '....OSSBBBBBBBBSSSDDDDO.....',
    '.....ODSSSSSSSSSDDDDDO......',
    '......OODDDDDDDDDDDOO.......',
    '........OOOOOOOOOOO.........',
  ], eyes: [[5, 11]], eyeKind: 'side' },
  carmin_side: { pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '........dddd................',
    '.....ddbbccccbd.............',
    '...dbbccccccccbbd...........',
    '..dbbbbbbbbbbbbbbbd.........',
    '..ddddddddddddddddd.........',
    '....OOHHHBBBBBBBOO..........',
    '...OHHHBBBBBBBBBBSO.........',
    '..OHHBBBBBBBBBBBBSSO........',
    '..OHBBBBBBBBBBBBBSSSO.......',
    '.OHBBBBBBBBBBBBBBSSSDO......',
    '.OBBBBBBBBBBBBBBBBSSDO......',
    '.OBBBBBBBBBBBBBBBSSSDO......',
    '.OBBBBBBBBBBBBBBBSSSDO......',
    '.OSBBBBBBBBBBBBBSSSDDO......',
    '..OSBBBBBBBBBBBBSSSDDO......',
    '..OSSBBBBBBBBBBSSSDDO.......',
    '...ODSSSSSSSSSSDDDDO........',
    '....OODDDDDDDDDDDOO.........',
    '......OOOOOOOOOOO...........',
  ], eyes: [[4, 9], [10, 9]], eyeKind: 'front', brow: 'angry' },
  carmin_front: { pal: { b: '#3a2440', c: '#5a3a62', d: '#241428' }, rows: [
    '..........dddd..............',
    '.......ddbbccccbbdd.........',
    '.....dbbccccccccccbbd.......',
    '....dbbbbbbbbbbbbbbbbd......',
    '....dddddddddddddddddd......',
    '.......OOHHHBBBBBOO.........',
    '......OHHHBBBBBBBBSO........',
    '.....OHHBBBBBBBBBBBSO.......',
    '....OHHBBBBBBBBBBBBSSO......',
    '....OHBBBBBBBBBBBBBSSO......',
    '...OHBBBBBBBBBBBBBBSSDO.....',
    '...OBBBBBBBBBBBBBBBSSDO.....',
    '...OBBBBBBBBBBBBBBBSSDO.....',
    '...OSBBBBBBBBBBBBBSSDDO.....',
    '...OSBBBBBBBBBBBBSSSDDO.....',
    '....OSBBBBBBBBBBSSSDDO......',
    '....OSSBBBBBBBBSSSDDDO......',
    '.....ODSSSSSSSSSDDDDO.......',
    '......OODDDDDDDDDOO.........',
    '........OOOOOOOOO...........',
  ], eyes: [[8, 10], [15, 10]], eyeKind: 'front', brow: 'angry' },
  // ---- Ámbar: gota afilada como punta de lápiz recién sacada, con la mina oscura arriba
  ambar_back: { pal: { m: '#2a2438', n: '#5a4a3a', o: '#e8cf9a' }, rows: [
    '..........m.........',
    '..........mm........',
    '.........mmo........',
    '.........moo........',
    '........Oooo........',
    '........OHHOO.......',
    '.......OHHHBBO......',
    '.......OHHBBBBO.....',
    '......OHHBBBBBSO....',
    '......OHBBBBBBSO....',
    '.....OHBBBBBBBSSO...',
    '.....OHBBBBBBBSSO...',
    '.....OBBBBBBBBSSDO..',
    '....OBBBBBBBBBSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OSBBBBBBBSSDDO..',
    '....OSBBBBBBSSSDDO..',
    '.....OSBBBBBSSDDO...',
    '.....OSSBBBSSSDDO...',
    '......ODSSSSSDDO....',
    '.......OODDDDOO.....',
    '.........OOOO.......',
  ], eyes: [[6, 12]], eyeKind: 'side' },
  ambar_side: { pal: { m: '#2a2438', n: '#5a4a3a', o: '#e8cf9a' }, rows: [
    '.......m............',
    '......mm............',
    '......mo............',
    '.....moo............',
    '.....Oooo...........',
    '.....OHHOO..........',
    '....OHHHBBO.........',
    '....OHHBBBBO........',
    '...OHHBBBBBSO.......',
    '...OHBBBBBBBSO......',
    '..OHBBBBBBBBSSO.....',
    '..OHBBBBBBBBSSO.....',
    '..OBBBBBBBBBSSDO....',
    '..OBBBBBBBBBSSDO....',
    '..OBBBBBBBBSSSDO....',
    '..OBBBBBBBBSSSDO....',
    '..OSBBBBBBBSSDDO....',
    '..OSBBBBBBSSSDDO....',
    '...OSBBBBBSSDDO.....',
    '...OSSBBBSSSDDO.....',
    '....ODSSSSSDDO......',
    '.....OODDDDOO.......',
    '.......OOOO.........',
  ], eyes: [[4, 12], [9, 12]], eyeKind: 'front', brow: 'sharp' },
  ambar_front: { pal: { m: '#2a2438', n: '#5a4a3a', o: '#e8cf9a' }, rows: [
    '.........m..........',
    '.........mm.........',
    '........moo.........',
    '........Oooo........',
    '........OHHOO.......',
    '.......OHHHBBO......',
    '.......OHHBBBBO.....',
    '......OHHBBBBBSO....',
    '......OHBBBBBBSO....',
    '.....OHBBBBBBBSSO...',
    '.....OHBBBBBBBSSO...',
    '.....OBBBBBBBBSSDO..',
    '....OBBBBBBBBBSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OBBBBBBBBSSSDO..',
    '....OSBBBBBBBSSDDO..',
    '....OSBBBBBBSSSDDO..',
    '.....OSBBBBBSSDDO...',
    '.....OSSBBBSSSDDO...',
    '......ODSSSSSDDO....',
    '.......OODDDDOO.....',
    '.........OOOO.......',
  ], eyes: [[7, 12], [12, 12]], eyeKind: 'front', brow: 'sharp' },
  // ---- Añil: salpicadura ancha y baja con cresta ondulada (sus gotitas satélite se dibujan aparte)
  anil_back: { pal: {}, rows: [
    '.......OO.........OO............',
    '......OHHO...OO..OHHO...........',
    '.....OHHHBO.OHHOOHBBBO..........',
    '....OHHHBBBOHHBBBBBBSSO.........',
    '...OHHHBBBBBBBBBBBBBSSSO........',
    '..OHHBBBBBBBBBBBBBBBBSSSO.......',
    '.OHHBBBBBBBBBBBBBBBBBSSSSO......',
    'OHBBBBBBBBBBBBBBBBBBBBSSSDO.....',
    'OBBBBBBBBBBBBBBBBBBBBBSSSDDO....',
    'OBBBBBBBBBBBBBBBBBBBBSSSSDDO....',
    'OSBBBBBBBBBBBBBBBBBBSSSSDDDO....',
    '.OSSBBBBBBBBBBBBBBBSSSSDDDO.....',
    '..OSSSBBBBBBBBBBBSSSSSDDDO......',
    '...OODSSSSSSSSSSSSSDDDDOO.......',
    '.....OOODDDDDDDDDDDOOO..........',
    '........OOOOOOOOOOO.............',
  ], eyes: [[5, 8]], eyeKind: 'side' },
  anil_side: { pal: {}, rows: [
    '.....OO..........OO.............',
    '....OHHO..OO....OHHO............',
    '...OHHBBOOHHO..OHBBO............',
    '..OHHBBBBHHBBOOBBBBSO...........',
    '.OHHBBBBBBBBBBBBBBBSSO..........',
    'OHHBBBBBBBBBBBBBBBBBSSO.........',
    'OHBBBBBBBBBBBBBBBBBBSSSO........',
    'OBBBBBBBBBBBBBBBBBBBBSSDO.......',
    'OBBBBBBBBBBBBBBBBBBBBSSDDO......',
    'OSBBBBBBBBBBBBBBBBBBSSSDDO......',
    '.OSSBBBBBBBBBBBBBBBSSSDDDO......',
    '..OSSSBBBBBBBBBBBBSSSSDDO.......',
    '...OODSSSSSSSSSSSSSDDDDO........',
    '.....OOODDDDDDDDDDDOOO..........',
    '........OOOOOOOOOO..............',
  ], eyes: [[4, 7], [10, 7]], eyeKind: 'front', brow: 'calm' },
  anil_front: { pal: {}, rows: [
    '.......OO.........OO............',
    '......OHHO...OO..OHHO...........',
    '.....OHHHBO.OHHOOHBBBO..........',
    '....OHHHBBBOHHBBBBBBSSO.........',
    '...OHHHBBBBBBBBBBBBBSSSO........',
    '..OHHBBBBBBBBBBBBBBBBSSSO.......',
    '.OHHBBBBBBBBBBBBBBBBBSSSSO......',
    'OHBBBBBBBBBBBBBBBBBBBBSSSDO.....',
    'OBBBBBBBBBBBBBBBBBBBBBSSSDDO....',
    'OBBBBBBBBBBBBBBBBBBBBSSSSDDO....',
    'OSBBBBBBBBBBBBBBBBBBSSSSDDDO....',
    '.OSSBBBBBBBBBBBBBBBSSSSDDDO.....',
    '..OSSSBBBBBBBBBBBSSSSSDDDO......',
    '...OODSSSSSSSSSSSSSDDDDOO.......',
    '.....OOODDDDDDDDDDDOOO..........',
    '........OOOOOOOOOOO.............',
  ], eyes: [[8, 8], [16, 8]], eyeKind: 'front', brow: 'calm' },
  // ---- Gotas Negras (frente tres cuartos, miran al grupo). 'c' = núcleo (color robado), 'C' su brillo
  gota_negra: { pal: {}, rows: [
    '........OOOO........',
    '......OOHHHSOO......',
    '.....OHHHBBSSSO.....',
    '....OHHBBBBBSSSO....',
    '...OHHBBBBBBSSSSO...',
    '...OHBBBBBBBBSSSO...',
    '..OHBBBBBBBBBSSSSO..',
    '..OBBBBBBBBBBBSSSO..',
    '..OBBBBBBBBBBBSSSO..',
    '..OBBBBBBBBBBSSSSO..',
    '..OSBBBBBBBBBSSSSO..',
    '...OSBBBBBBBSSSSO...',
    '...OSSBBBBBSSSSSO...',
    '....OSSSSSSSSSSO....',
    '.....OOSSSSSSOO.....',
    '.......OOOOOO.......',
  ], eyes: [[6, 8], [12, 8]], eyeKind: 'ink' },
  mancha: { pal: {}, rows: [
    '....OO..........OO........',
    '...OHHO...OO...OHSO.......',
    '..OHHBBO.OHHO.OBBSSO......',
    '..OHBBBBOHHBBOBBBSSSO.....',
    '.OHBBBBBBBBBBBBBBSSSSO....',
    '.OHBBBBBBBcccBBBBSSSSO....',
    'OHBBBBBBBcCCccBBBBSSSSO...',
    'OBBBBBBBBcCcccBBBBSSSSSO..',
    'OBBBBBBBBBccccBBBBBSSSSO..',
    'OSBBBBBBBBBccBBBBBSSSSSO..',
    '.OSBBBBBBBBBBBBBBSSSSSO...',
    '..OSSBBBBBBBBBBBSSSSSO....',
    '...OOSSSSSSSSSSSSSSOO.....',
    '.....OOOOOOOOOOOOOO.......',
  ], eyes: [[7, 4], [13, 4]], eyeKind: 'ink' },
  borron: { pal: {}, rows: [
    '.....OOO....',
    '....OHHSO...',
    '...OHHBSSO..',
    '...OHBBSSO..',
    '..OHBBBSSSO.',
    '..OHBBBBSSO.',
    '..OBBcccSSO.',
    '..OBBcCcSSO.',
    '..OBBcccSSO.',
    '..OBBBBBSSO.',
    '..OBBBBBSSO.',
    '..OSBBBSSSO.',
    '...OSBBSSO..',
    '...OSSSSSO..',
    '...OSSSSSO..',
    '..OSSSSSSSO.',
    '..OSSSSSSSO.',
    '...OOOOOOO..',
  ], eyes: [[4, 4], [8, 4]], eyeKind: 'ink' },
  charco: { pal: {}, rows: [
    '..........OOOOO.................',
    '.......OOOHHHBBOOO..............',
    '....OOOHHHBBBBBBBSOOO...........',
    '..OOHHBBBBBBcccBBBBSSOO.........',
    '.OHHBBBBBBBcCCccBBBBSSSO........',
    'OHBBBBBBBBBcccccBBBBBSSSOO......',
    'OBBBBBBBBBBBcccBBBBBBSSSSSO.....',
    'OSBBBBBBBBBBBBBBBBBBBSSSSSSO....',
    '.OSSBBBBBBBBBBBBBBBBSSSSSSSO....',
    '..OOSSSSSSSSSSSSSSSSSSSSSOO.....',
    '....OOOOOOOOOOOOOOOOOOOOO.......',
  ], eyes: [[6, 5], [17, 5]], eyeKind: 'ink' },
  grumo: { pal: {}, rows: [
    '.......OOO...OO.......',
    '.....OOHHSOOOHSO......',
    '....OHHBBBSSBBSSO.....',
    '...OHHBBBBBBBBSSSO....',
    '..OHHBBBBBBBBBSSSSO...',
    '..OHBBBBBcccBBBSSSO...',
    '.OHBBBBBcCCccBBBSSSO..',
    '.OBBBBBBcCcccBBBSSSSO.',
    '.OBBBBBBBccccBBBSSSSO.',
    '.OBBBBBBBBccBBBBSSSSO.',
    '.OSBBBBBBBBBBBBSSSSSO.',
    '..OSBBBBBBBBBBSSSSSO..',
    '..OSSBBBBBBBBSSSSSSO..',
    '...OSSSSSSSSSSSSSSO...',
    '....OOSSSSSSSSSSOO....',
    '......OOOOOOOOOO......',
  ], eyes: [[7, 4], [14, 4]], eyeKind: 'ink' },
  tinta: { pal: {}, rows: [
    '....................OOOOOO....................',
    '.................OOOHHHHHSSOOO................',
    '..............OOOHHHHHBBBBSSSSOOO.............',
    '............OOHHHHBBBBBBBBBSSSSSSOO...........',
    '..........OOHHHBBBBBBBBBBBBBSSSSSSSOO.........',
    '.........OHHHBBBBBBBBBBBBBBBBSSSSSSSSO........',
    '........OHHBBBBBBBBBBBBBBBBBBBSSSSSSSSO.......',
    '.......OHHBBBBBBBBBBBBBBBBBBBBBSSSSSSSSO......',
    '......OHHBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO.....',
    '.....OHBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO....',
    '.....OHBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO....',
    '....OHBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO...',
    '....OBBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSO...',
    '....OBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSO...',
    '...OBBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSO..',
    '...OBBBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSO..',
    '...OSBBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSO..',
    '...OSBBBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSO..',
    '...OSSBBBBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSSO..',
    '....OSSBBBBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSSSO...',
    '....OSSSBBBBBBBBBBBBBBBBSSSSSSSSSSSSSSSSSSO...',
    '.....OSSSSBBBBBBBBBBBBSSSSSSSSSSSSSSSSSSSO....',
    '.....OOSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSOO....',
    '......OOSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSOO.....',
    '.......OOOSSSSSSSSSSSSSSSSSSSSSSSSSSOOO.......',
    '.........OOOOSSSSSSSSSSSSSSSSSSSOOOO..........',
    '............OOOOOOOOOOOOOOOOOOOO..............',
    '..........OO.....OO.......OO....OO............',
    '..........OO.....OO.......OO....OO............',
    '..........O......O........OO....O.............',
  ], eyes: [[14, 12], [30, 12]], eyeKind: 'ink', big: true },
};
// Construye un sprite: rampa del color + paleta fija. core = color del núcleo (enemigos), dark = cuerpo de tinta
function buildSprite(name, color, core, opt = {}) {
  const key = `spr|${name}|${color}|${core || ''}|${opt.eyes || 'normal'}`;
  return cached(key, () => {
    const def = SPRITES[name], rp = ramp(color), rows = def.rows, h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const cr = core ? ramp(core) : null;
    const P = Object.assign({ O: rp.out, D: rp.dk, S: rp.sh, B: rp.base, H: rp.hi, W: rp.spec, c: cr ? cr.base : rp.base, C: cr ? cr.hi : rp.hi }, def.pal);
    for (let y = 0; y < h; y++) for (let X = 0; X < rows[y].length; X++) { const ch = rows[y][X]; if (ch === '.') continue; const col = P[ch]; if (!col) continue; x.fillStyle = col; x.fillRect(X, y, 1, 1); }
    // especular: un brillo húmedo arriba a la izquierda del cuerpo
    const spec = def.big ? [[11, 6, 5, 2], [9, 8, 2, 3]] : def.eyeKind === 'ink' ? [[Math.round(w * .28), 2, 3, 1], [Math.round(w * .24), 3, 1, 2]] : [[Math.round(w * .3), Math.round(h * .3), 3, 1], [Math.round(w * .28), Math.round(h * .3) + 1, 1, 2]];
    for (const [sx, sy, sw, sh] of spec) { if (rows[sy] && rows[sy][sx] && rows[sy][sx] !== '.' && 'HB'.includes(rows[sy][sx])) { x.fillStyle = rp.spec; x.fillRect(sx, sy, sw, sh); } }
    drawEyes(x, def, opt.eyes || 'normal', def.eyeKind, rp);
    c.__key = key; return c;
  });
}
// Ojos y cejas: normal | blink | hurt | ko | happy | angry
function drawEyes(x, def, mode, kind, rp) {
  const F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const ink = kind === 'ink', eyeCol = ink ? '#f4f0ea' : '#14121c', hi = ink ? '#ffffff' : '#ffffff';
  def.eyes.forEach(([ex, ey], i) => {
    if (mode === 'ko') { F(eyeCol, ex - 1, ey - 1); F(eyeCol, ex + 1, ey - 1); F(eyeCol, ex, ey); F(eyeCol, ex - 1, ey + 1); F(eyeCol, ex + 1, ey + 1); return; }
    if (mode === 'hurt') { F(eyeCol, ex - 1, ey); F(eyeCol, ex + 1, ey); F(eyeCol, ex, ey - 1); F(eyeCol, ex, ey + 1); return; }
    if (mode === 'happy') { F(eyeCol, ex - 1, ey); F(eyeCol, ex, ey - 1); F(eyeCol, ex + 1, ey); return; }
    if (mode === 'blink') { F(eyeCol, ex - 1, ey, 3, 1); return; }
    if (ink) { F(eyeCol, ex, ey - 1, 2, 3); F('#14121c', ex + 1, ey, 1, 1); if (def.big) { F(eyeCol, ex - 1, ey - 2, 4, 5); F('#14121c', ex + 1, ey, 2, 2); } return; }
    if (kind === 'side') { F(eyeCol, ex, ey - 1, 1, 3); F(hi, ex, ey - 1); F(eyeCol, ex + 1, ey, 1, 1); }
    else { F(eyeCol, ex, ey - 1, 2, 3); F(hi, ex, ey - 1); }
    if (mode === 'angry' || def.brow === 'angry') { F('#14121c', ex - 1 + (i ? 1 : 0), ey - 3, 2, 1); F('#14121c', ex + (i ? 0 : 1), ey - 2, 1, 1); }
    if (def.brow === 'sharp') F('#14121c', ex - 1, ey - 3, 3, 1);
  });
}
// Gotitas satélite de Añil (orbitan; se dibujan aparte del sprite)
function drawSatellites(x, y, t, col, sc = 1) { const rp = ramp(col); for (let i = 0; i < 3; i++) { const a = t * .08 + i * 2.09, r = (16 + Math.sin(t * .1 + i) * 3) * sc, dx = Math.cos(a) * r, dy = Math.sin(a) * r * .35 - 14 * sc; const s = Math.max(2, Math.round(3 * sc)); g.fillStyle = rp.out; g.fillRect(Math.round(x + dx) - 1, Math.round(y + dy) - 1, s + 2, s + 2); g.fillStyle = rp.base; g.fillRect(Math.round(x + dx), Math.round(y + dy), s, s); g.fillStyle = rp.hi; g.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1); } }
// Sprite de una unidad según pose y frame: vista (back/side/front) + deformación squash & stretch
const VIEW = { idle: 'back', hop: 'back', attack: 'side', charge: 'side', hurt: 'front', ko: 'front', happy: 'front' };
const EYES = { idle: 'normal', hop: 'normal', attack: 'angry', charge: 'normal', hurt: 'hurt', ko: 'ko', happy: 'happy' };
const SQ = { idle: [[1, 1], [1.03, .97], [1, 1], [.97, 1.03]], hop: [[.92, 1.1]], attack: [[1.06, .96]], charge: [[.9, 1.12]], hurt: [[1.16, .84]], ko: [[1.4, .4]], happy: [[.96, 1.06]] };
function unitSpriteInfo(u, frame) {
  const party = u.kind === 'party', pose = u.pose || 'idle';
  const name = party ? `${u.id}_${VIEW[pose] || 'back'}` : u.id;
  const blink = pose === 'idle' && ((B.t + u.idx * 37) % 160) < 6;
  const spr = buildSprite(name, party ? C(u.color) : C('negro'), party ? null : u.def.core, { eyes: blink ? 'blink' : (party ? EYES[pose] : (pose === 'hurt' ? 'hurt' : pose === 'ko' ? 'ko' : 'normal')) });
  const sq = (SQ[pose] || SQ.idle), [sx, sy] = sq[frame % sq.length];
  return { spr, sx, sy };
}
// Versión mini (2:1) de un sprite para el mapa: por cada bloque 2×2 se queda el color más frecuente; si el bloque toca el
// borde del sprite gana el contorno. Así conserva silueta y ojos sin el emborronado de un escalado normal.
function miniSprite(name, color, core, opt = {}) {
  const key = `mini|${name}|${color}|${core || ''}|${opt.eyes || 'normal'}`;
  return cached(key, () => {
    const src = buildSprite(name, color, core, opt), sw = src.width, sh = src.height, d = src.getContext('2d').getImageData(0, 0, sw, sh).data;
    const w = Math.ceil(sw / 2), h = Math.ceil(sh / 2), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const out = ramp(color).out, [orr, og, ob] = hexRgb(out);
    const at = (px, py) => (px < 0 || py < 0 || px >= sw || py >= sh) ? null : (d[(py * sw + px) * 4 + 3] ? [d[(py * sw + px) * 4], d[(py * sw + px) * 4 + 1], d[(py * sw + px) * 4 + 2]] : null);
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      const cols = {}, list = []; let edge = false;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const px = X * 2 + dx, py = y * 2 + dy, p = at(px, py); if (!p) { edge = true; continue; } const k = p.join(','); cols[k] = (cols[k] || 0) + 1; list.push(k); if (!at(px - 1, py) || !at(px + 1, py) || !at(px, py - 1) || !at(px, py + 1)) edge = true; }
      if (list.length < 2) continue;
      let best = null, bn = 0; for (const k in cols) if (cols[k] > bn) { bn = cols[k]; best = k; }
      const isOut = `${orr},${og},${ob}`; if (edge && cols[isOut]) best = isOut;
      // ojos: si hay píxel de ojo (blanco o negro puro) en el bloque, conservarlo
      for (const k of list) if (k === '244,240,234' || k === '20,18,28' || k === '255,255,255') { best = k; break; }
      x.fillStyle = `rgb(${best})`; x.fillRect(X, y, 1, 1);
    }
    c.__key = key; return c;
  });
}
