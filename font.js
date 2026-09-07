// CHROMARA — font.js: la letra propia del cuaderno.
//
// Dos familias dibujadas píxel a píxel para 320×180, sin fuentes externas:
//  · CUADERNO: caja y minúsculas a mano de pintor (altura de mayúscula 7, de x 5,
//    descendentes 2). Proporcional, con acentos y eñes de verdad. Es la letra de
//    todos los menús, fichas, diálogos y carteles.
//  · RÓTULO: mayúsculas de brocha, trazo de dos píxeles y nueve de alto, con
//    contorno de tinta y brillo húmedo. Para títulos, nombres de técnicas y números
//    de daño, que antes venían de una fuente ajena.
// Además, el escritor de tinta: el texto no aparece a saltos de máquina, lo escribe
// una plumilla. Cada letra sale mojada del color de quien habla, se seca hasta la
// tinta del papel y la plumilla se detiene un instante en comas y puntos.
'use strict';
const UI_HITS = [], UI_TEXT = [];
function uiHit(x, y, w, h, run, hover) { UI_HITS.push({ x, y, w, h, run, hover }); }
// Glifo = "desplazamiento|filas". El desplazamiento cuenta desde la línea alta de las
// mayúsculas: 0 = altura de mayúscula, 2 = altura de x. Sin número, 0.
const CUADERNO_SRC = {
  A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01110/10001/10000/10000/10000/10001/01110',D:'11110/10001/10001/10001/10001/10001/11110',
  E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01110/10001/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',
  I:'111/010/010/010/010/010/111',J:'00111/00010/00010/00010/00010/10010/01100',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',
  M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',
  Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',
  U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',
  Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111',
  Ñ:'01001/10110/10001/11001/10101/10011/10001',Á:'00100/01000/01110/10001/11111/10001/10001',É:'00100/01000/11111/10000/11110/10000/11111',Í:'00100/01000/01110/00100/00100/00100/01110',
  Ó:'00100/01000/01110/10001/10001/10001/01110',Ú:'00100/01000/10001/10001/10001/10001/01110',Ü:'01010/00000/10001/10001/10001/10001/01110',Ç:'01110/10001/10000/10000/10001/01110/00100/01100',
  a:'2|0110/0001/0111/1001/0111',b:'1000/1000/1110/1001/1001/1001/1110',c:'2|0110/1001/1000/1001/0110',d:'0001/0001/0111/1001/1001/1001/0111',e:'2|0110/1001/1111/1000/0111',
  f:'0011/0100/1110/0100/0100/0100/0100',g:'2|0111/1001/1001/0111/0001/0001/0110',h:'1000/1000/1110/1001/1001/1001/1001',i:'1/0/1/1/1/1/1',j:'001/000/001/001/001/001/001/001/110',
  k:'1000/1000/1001/1010/1100/1010/1001',l:'10/10/10/10/10/10/01',m:'2|11110/10101/10101/10101/10101',n:'2|1110/1001/1001/1001/1001',ñ:'0101/1010/1110/1001/1001/1001/1001',
  o:'2|0110/1001/1001/1001/0110',p:'2|1110/1001/1001/1110/1000/1000/1000',q:'2|0111/1001/1001/0111/0001/0001/0001',r:'2|110/101/100/100/100',s:'2|0111/1000/0110/0001/1110',
  t:'1|010/111/010/010/010/011',u:'2|1001/1001/1001/1001/0111',v:'2|10001/10001/01010/01010/00100',w:'2|10001/10001/10101/10101/01010',x:'2|10001/01010/00100/01010/10001',
  y:'2|1001/1001/1001/0111/0001/0001/0110',z:'2|1111/0001/0110/1000/1111',
  á:'0010/0100/0110/0001/0111/1001/0111',é:'0010/0100/0110/1001/1111/1000/0111',í:'01/10/01/01/01/01/01',ó:'0010/0100/0110/1001/1001/1001/0110',ú:'0010/0100/1001/1001/1001/1001/0111',
  ü:'1001/0000/1001/1001/1001/1001/0111',ç:'2|0110/1001/1000/1001/0110/0010/0110',
  '0':'01110/10001/10011/10101/11001/10001/01110','1':'010/110/010/010/010/010/111','2':'01110/10001/00001/00010/00100/01000/11111','3':'11110/00001/00001/01110/00001/00001/11110',
  '4':'00010/00110/01010/10010/11111/00010/00010','5':'11111/10000/10000/11110/00001/00001/11110','6':'01110/10000/10000/11110/10001/10001/01110','7':'11111/00001/00010/00100/01000/01000/01000',
  '8':'01110/10001/10001/01110/10001/10001/01110','9':'01110/10001/10001/01111/00001/00001/01110',
  '.':'0/0/0/0/0/1/1',',':'00/00/00/00/00/01/10',':':'0/1/1/0/1/1/0',';':'00/01/01/00/01/01/10','!':'1/1/1/1/1/0/1','¡':'1/0/1/1/1/1/1','?':'1110/0001/0001/0110/0100/0000/0100','¿':'0010/0000/0010/0100/1000/1001/0110',
  '-':'000/000/000/111/000/000/000','+':'00000/00100/00100/11111/00100/00100/00000','/':'00001/00001/00010/00100/01000/10000/10000','%':'11001/11010/00100/00100/01000/10110/00110',
  '(':'01/10/10/10/10/10/01',')':'10/01/01/01/01/01/10','>':'100/010/001/001/001/010/100','<':'001/010/100/100/100/010/001','=':'0000/0000/1111/0000/1111/0000/0000','*':'00000/10101/01110/11111/01110/10101/00000',
  '^':'00100/01010/10001/00000/00000/00000/00000',"'":'1/1/0/0/0/0/0','"':'101/101/000/000/000/000/000','·':'0/0/0/1/0/0/0','…':'00000/00000/00000/00000/00000/00000/10101','_':'00000/00000/00000/00000/00000/00000/11111',
  '~':'00000/00000/01001/10110/00000/00000/00000','&':'01100/10010/10100/01000/10101/10010/01101','«':'00000/00101/01010/10100/01010/00101/00000','»':'00000/10100/01010/00101/01010/10100/00000',
  '[':'11/10/10/10/10/10/11',']':'11/01/01/01/01/01/11','#':'01010/11111/01010/01010/11111/01010/00000',
  '↑':'00100/01110/10101/00100/00100/00100/00100','↓':'00100/00100/00100/00100/10101/01110/00100','←':'00000/00100/01000/11111/01000/00100/00000','→':'00000/00100/00010/11111/00010/00100/00000',
  '♥':'00000/01010/11111/11111/01110/00100/00000','★':'00100/00100/11111/01110/01010/10001/00000','✓':'00000/00001/00010/10100/01000/00000/00000','×':'00000/10001/01010/00100/01010/10001/00000',
  '°':'010/101/010/000/000/000/000','½':'10001/10010/00100/01011/10001/00010/00111',
};
// RÓTULO: sólo mayúsculas, dígitos y signos; nueve filas, trazo doble, esquinas redondas.
const ROTULO_SRC = {
  A:'0011100/0110110/1100011/1100011/1111111/1100011/1100011/1100011/1100011',B:'1111110/1100011/1100011/1111110/1100011/1100011/1100011/1100011/1111110',
  C:'0111110/1100011/1100000/1100000/1100000/1100000/1100000/1100011/0111110',D:'1111100/1100110/1100011/1100011/1100011/1100011/1100011/1100110/1111100',
  E:'1111111/1100000/1100000/1111110/1100000/1100000/1100000/1100000/1111111',F:'1111111/1100000/1100000/1111110/1100000/1100000/1100000/1100000/1100000',
  G:'0111110/1100011/1100000/1100000/1101111/1100011/1100011/1100011/0111110',H:'1100011/1100011/1100011/1111111/1100011/1100011/1100011/1100011/1100011',
  I:'1111/0110/0110/0110/0110/0110/0110/0110/1111',J:'0011111/0000110/0000110/0000110/0000110/0000110/1100110/1100110/0111100',
  K:'1100011/1100110/1101100/1111000/1111000/1101100/1100110/1100011/1100011',L:'1100000/1100000/1100000/1100000/1100000/1100000/1100000/1100000/1111111',
  M:'11000011/11100111/11111111/11011011/11000011/11000011/11000011/11000011/11000011',N:'1100011/1110011/1111011/1101111/1100111/1100011/1100011/1100011/1100011',
  O:'0111110/1100011/1100011/1100011/1100011/1100011/1100011/1100011/0111110',P:'1111110/1100011/1100011/1100011/1111110/1100000/1100000/1100000/1100000',
  Q:'0111110/1100011/1100011/1100011/1100011/1100011/1101011/1100110/0111011',R:'1111110/1100011/1100011/1100011/1111110/1101100/1100110/1100011/1100011',
  S:'0111110/1100011/1100000/0110000/0011100/0000110/0000011/1100011/0111110',T:'1111111/0011100/0011100/0011100/0011100/0011100/0011100/0011100/0011100',
  U:'1100011/1100011/1100011/1100011/1100011/1100011/1100011/1100011/0111110',V:'1100011/1100011/1100011/1100011/1100011/0110110/0110110/0011100/0011100',
  W:'11000011/11000011/11000011/11000011/11011011/11011011/11111111/01100110/00100100',X:'1100011/1100011/0110110/0011100/0011100/0011100/0110110/1100011/1100011',
  Y:'1100011/1100011/0110110/0011100/0011100/0011100/0011100/0011100/0011100',Z:'1111111/0000011/0000110/0001100/0011000/0110000/1100000/1100000/1111111',
  Ñ:'0110011/1100110/1100011/1110011/1111011/1101111/1100111/1100011/1100011',Á:'0001100/0011000/0011100/0110110/1100011/1111111/1100011/1100011/1100011',
  É:'0001100/0011000/1111111/1100000/1111110/1100000/1100000/1100000/1111111',Í:'0011/0110/1111/0110/0110/0110/0110/0110/1111',
  Ó:'0001100/0011000/0111110/1100011/1100011/1100011/1100011/1100011/0111110',Ú:'0001100/0011000/1100011/1100011/1100011/1100011/1100011/1100011/0111110',
  '0':'0111110/1100011/1100011/1100111/1101011/1110011/1100011/1100011/0111110','1':'00110/01110/11110/00110/00110/00110/00110/00110/11111',
  '2':'0111110/1100011/0000011/0000011/0000110/0011100/0110000/1100000/1111111','3':'0111110/1100011/0000011/0000011/0011110/0000011/0000011/1100011/0111110',
  '4':'0000110/0001110/0011110/0110110/1100110/1111111/0000110/0000110/0000110','5':'1111111/1100000/1100000/1111110/0000011/0000011/0000011/1100011/0111110',
  '6':'0011110/0110000/1100000/1111110/1100011/1100011/1100011/1100011/0111110','7':'1111111/0000011/0000011/0000110/0001100/0011000/0011000/0011000/0011000',
  '8':'0111110/1100011/1100011/0110110/0011100/0110110/1100011/1100011/0111110','9':'0111110/1100011/1100011/1100011/0111111/0000011/0000011/0000110/0111100',
  '+':'0000000/0011000/0011000/1111111/1111111/0011000/0011000/0000000/0000000','-':'00000/00000/00000/00000/11111/11111/00000/00000/00000','!':'11/11/11/11/11/11/00/11/11','¡':'11/11/00/11/11/11/11/11/11',
  '?':'0111110/1100011/0000011/0000110/0011100/0011000/0000000/0011000/0011000','.':'00/00/00/00/00/00/00/11/11',',':'000/000/000/000/000/000/011/011/110',':':'00/00/11/11/00/00/11/11/00',
  '/':'0000011/0000011/0000110/0001100/0011000/0110000/1100000/1100000/0000000','%':'1100011/1100110/0001100/0011000/0110000/1100000/1100011/0000000/0000000',
  '×':'0000000/1100011/0110110/0011100/0011100/0110110/1100011/0000000/0000000','·':'00/00/00/00/11/11/00/00/00','·':'00/00/00/00/11/11/00/00/00',' ':'000/000/000/000/000/000/000/000/000',
  '»':'0000000/1100011/0110011/0011011/0011011/0110011/1100011/0000000/0000000','(':'011/110/110/110/110/110/110/110/011',')':'110/011/011/011/011/011/011/011/110',
};
function parseGlyphs(src) {
  const out = {};
  for (const [ch, def] of Object.entries(src)) { const [a, b] = def.includes('|') ? def.split('|') : ['0', def]; const rows = b.split('/'); out[ch] = { top: +a, rows, w: rows[0].length, h: rows.length }; }
  return out;
}
const CUADERNO = parseGlyphs(CUADERNO_SRC), ROTULO = parseGlyphs(ROTULO_SRC);
const DESCENDERS = new Set(['g', 'j', 'p', 'q', 'y', 'ç', 'Ç', ',', ';']);
const TEXT_ALIASES = { '–': '-', '—': '-', '►': '>', '◄': '<', '▼': '↓', '▲': '↑', '≥': '>', '“': '"', '”': '"', '‘': "'", '’': "'", ' ': ' ' };
// La misma cadena para todos: guiones tipográficos y símbolos raros bajan a lo que el cuaderno sabe dibujar.
function compactString(s) { return [...String(s)].map(c => TEXT_ALIASES[c] || c).join('').normalize('NFC'); }
function glyphOf(c, font = CUADERNO) { return font[c] || (font === ROTULO ? ROTULO[c.toUpperCase()] || ROTULO[c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()] || ROTULO['?'] : CUADERNO[c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || CUADERNO['?']); }
function textWidth(s) { let w = 0; for (const c of compactString(s)) w += c === ' ' ? 3 : glyphOf(c).w + 1; return Math.max(0, w - 1); }
function textBox(s) { const t = compactString(s); let up = 0, down = 7; for (const c of t) { if (DESCENDERS.has(c)) down = 9; } return { w: textWidth(t), h: down, up }; }
// Plumilla del escritor: una punta de pluma de dos tonos apoyada donde nace la próxima letra.
function drawNib(x, y, col) {
  g.fillStyle = '#2a2438'; g.fillRect(x, y - 5, 1, 1); g.fillRect(x + 1, y - 6, 1, 1); g.fillRect(x + 2, y - 7, 2, 1); g.fillRect(x + 3, y - 8, 2, 1);
  g.fillStyle = '#d8c48a'; g.fillRect(x + 1, y - 5, 1, 1); g.fillRect(x + 2, y - 6, 1, 1); g.fillStyle = col; g.fillRect(x, y - 4, 1, 1); g.fillRect(x, y - 3, 1, 1);
}
// Escritura: opt.progress = letras ya escritas (admite fracción: la letra se dibuja
// de izquierda a derecha, como la traza una pluma); opt.wet = color húmedo de las
// últimas letras; opt.nib = dibuja la plumilla; opt.alpha; opt.font = ROTULO.
function smallText(s, x, y, col = UI_INK, opt = null) {
  x = Math.round(x); y = Math.round(y); const t = compactString(s), box = textBox(t);
  UI_TEXT.push({ text: String(s), x, y, w: box.w, h: box.h });
  if (opt?.alpha != null) { g.save(); g.globalAlpha *= opt.alpha; }
  const progress = opt?.progress ?? Infinity, wet = opt?.wet;
  let i = 0, nibX = x, nibY = y + 7, done = true;
  for (const c of t) {
    if (i >= Math.ceil(progress)) { done = false; break; }
    if (c === ' ') { x += 3; i++; nibX = x; continue; }
    const gl = glyphOf(c), age = progress - i, partial = age < 1 ? Math.max(1, Math.round(gl.w * age)) : gl.w;
    if (wet && age < 5) g.fillStyle = age < 2 ? wet : mixHex(wet, col, .55); else g.fillStyle = col;
    for (let yy = 0; yy < gl.h; yy++) { const row = gl.rows[yy]; for (let xx = 0; xx < partial; xx++) if (row[xx] === '1') g.fillRect(x + xx, y + gl.top + yy, 1, 1); }
    if (wet && age < 1.5) { g.fillStyle = wet; g.globalAlpha *= .45; g.fillRect(x + partial - 1, y + gl.top + gl.h - (DESCENDERS.has(c) ? 2 : 0), 1, 1); g.globalAlpha /= .45; }
    x += gl.w + 1; i++; nibX = x - (age < 1 ? gl.w - partial + 1 : 0); nibY = y + 7;
  }
  if (opt?.nib && !done) drawNib(nibX, nibY, wet || col);
  if (opt?.alpha != null) g.restore();
  return x;
}
const mixCache = {};
function mixHex(a, b, k) { const key = a + b + k; if (mixCache[key]) return mixCache[key]; const A = hexRgb(a), B = hexRgb(b); return mixCache[key] = rgbHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); }
function textRight(s, x, y, col, opt) { smallText(s, x - textWidth(s), y, col, opt); }
function textCenter(s, x, y, col, opt) { smallText(s, x - textWidth(s) / 2, y, col, opt); }
function wrapSmall(s, width) {
  const lines = []; let line = '';
  for (const word of String(s).split(' ')) { const next = line ? line + ' ' + word : word; if (textWidth(next) > width && line) { lines.push(line); line = word; } else line = next; }
  if (line) lines.push(line); return lines;
}
function paragraph(s, x, y, width, col = UI_MUTED, max = 3, opt) { const lines = wrapSmall(s, width); lines.slice(0, max).forEach((l, i) => smallText(l, x, y + i * 10, col, opt)); return Math.min(max, lines.length) * 10; }
// Párrafo escrito: la pluma recorre las líneas una tras otra. progress cuenta letras
// del texto completo; devuelve cuántas letras tiene en total.
function writtenLines(lines, x, y, col, progress, opt = {}) {
  let left = progress, total = 0;
  lines.forEach((line, i) => {
    const n = [...compactString(line)].length; total += n + 1;
    if (left <= 0) return;
    smallText(line, x, y + i * (opt.gap || 10), col, { ...opt, progress: left, nib: opt.nib && left < n + .5 });
    left -= n + 1;
  });
  return total - 1;
}
// Ritmo de la pluma: avanza medio carácter por frame y respira en la puntuación.
function writerAdvance(w, text, speed = 1) {
  const t = compactString(text), n = [...t].length;
  if (w.ch >= n) { w.ch = n; return true; }
  if (w.hold > 0) { w.hold -= speed; return false; }
  const next = Math.min(n, (w.ch || 0) + .55 * speed), passed = [...t].slice(Math.floor(w.ch || 0), Math.floor(next));
  w.ch = next; w.wrote = (w.wrote || 0) + passed.filter(c => c !== ' ').length;
  for (const c of passed) { if (',;:'.includes(c)) w.hold = 5; else if ('.!?…'.includes(c)) w.hold = 10; }
  return w.ch >= n;
}
// Texto de rótulo: mayúsculas de brocha con contorno de tinta, brillo arriba y
// sombra abajo. opt.progress revela columnas de izquierda a derecha con la punta mojada.
function rotuloWidth(s) { let w = 0; for (const c of compactString(s).toUpperCase()) w += (c === ' ' ? 4 : glyphOf(c, ROTULO).w + 1); return Math.max(0, w - 1); }
function bigText(s, x, y, col = '#f4f0ea', opt = {}) {
  x = Math.round(x); y = Math.round(y); const t = compactString(s).toUpperCase(), w = rotuloWidth(t);
  UI_TEXT.push({ text: String(s), x: x - 1, y: y - 1, w: w + 2, h: 11 });
  const out = opt.outline ?? '#14121c', hi = opt.hi ?? mixHex(col, '#ffffff', .45), sh = opt.shadow ?? mixHex(col, '#14121c', .35);
  const limit = opt.progress == null ? Infinity : Math.round(opt.progress);
  const cells = [];
  let cx = x;
  for (const c of t) { if (c === ' ') { cx += 4; continue; } const gl = glyphOf(c, ROTULO); for (let yy = 0; yy < gl.h; yy++) for (let xx = 0; xx < gl.w; xx++) if (gl.rows[yy][xx] === '1' && cx + xx - x < limit) cells.push([cx + xx, y + yy]); cx += gl.w + 1; }
  if (out) { g.fillStyle = out; for (const [px, py] of cells) { g.fillRect(px - 1, py, 3, 1); g.fillRect(px, py - 1, 1, 3); if (opt.thick) g.fillRect(px, py + 2, 1, 1); } }
  const set = new Set(cells.map(([px, py]) => px * 1000 + py));
  const wetEdge = opt.progress != null && limit < w ? x + limit - 1 : -1;
  for (const [px, py] of cells) { g.fillStyle = px === wetEdge ? '#fff6dc' : !set.has(px * 1000 + py - 1) ? hi : !set.has(px * 1000 + py + 1) ? sh : col; g.fillRect(px, py, 1, 1); }
  return w;
}
function bigCenter(s, x, y, col, opt) { return bigText(s, x - rotuloWidth(s) / 2, y, col, opt); }
