/* The notebook letters: every character the game writes has a drawn glyph, the
   pen writes at a readable pace, and the exported TrueType files cover the same
   characters. Runs on the inert canvas fixture; no browser needed. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { run } = require('./test_combat.cjs');
const root = path.resolve(__dirname, '..');
let checks = 0;
function test(name, fn) { fn(); console.log('PASS ' + name); checks++; }

test('every string literal in the game only uses drawn glyphs', () => {
  const files = ['data.js', 'gui.js', 'battle_ui.js', 'combat.js', 'field.js', 'world_art.js', 'chapters.js', 'rinse.js', 'settings.js', 'game.js', 'attacks.js', 'battle.js', 'mobile.js'];
  const glyphs = run('Object.keys(CUADERNO)'), aliases = run('Object.keys(TEXT_ALIASES)'), missing = new Map();
  for (const file of files) {
    const src = fs.readFileSync(path.join(root, file), 'utf8').replace(/\/\/[^\n]*/g, '');
    for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
      const text = (m[1] ?? m[2]).replace(/\\./g, '');
      for (const c of text) if (c.charCodeAt(0) > 127 && !glyphs.includes(c) && !aliases.includes(c)) missing.set(c, file);
    }
  }
  assert.deepEqual([...missing], [], 'missing glyphs');
});
test('bitmap rows are consistent and widths are deterministic', () => {
  const bad = run(`Object.entries(CUADERNO).concat(Object.entries(ROTULO)).filter(([c,gl])=>gl.rows.some(r=>r.length!==gl.w||/[^01]/.test(r))).map(([c])=>c)`);
  assert.deepEqual(Array.from(bad), []);
  assert.equal(run(`textWidth('Añil y Ámbar')`), run(`textWidth('Añil y Ámbar')`));
  assert(run(`textWidth('Chromara')`) > 0 && run(`rotuloWidth('Chromara')`) > run(`textWidth('Chromara')`));
  assert.equal(run(`textWidth('')`), 0);
  for (const s of ['Yo tracé cada línea de Chromara antes de que nadie pintara nada.', 'Rojo + amarillo: daño y salpicadura.']) assert(run(`wrapSmall(${JSON.stringify(s)},120).every(l=>textWidth(l)<=120)`));
  assert.equal(run(`textBox('gota').h`), 9); assert.equal(run(`textBox('Tinta').h`), 7);
});
test('the pen advances about half a letter per frame and breathes at punctuation', () => {
  run(`var pen={ch:0};var penFrames=0;while(!writerAdvance(pen,'Hola, mundo.')){penFrames++;if(penFrames>400)break;}`);
  const frames = run('penFrames');
  assert(frames > 22 && frames < 60, 'frames ' + frames);
  run(`var pen2={ch:0};var plain=0;while(!writerAdvance(pen2,'Hola  mundo')){plain++;}`);
  assert(run('plain') < frames, 'punctuation should cost time');
  assert.equal(run(`{const w={ch:0};for(let i=0;i<500;i++)writerAdvance(w,'fin');w.ch}`), 3);
});
test('partial writing registers the text box and never throws on odd input', () => {
  run(`UI_TEXT.length=0;smallText('Añil: ¡mezcla!',10,10,'#000',{progress:3.5,wet:'#3a6fe2',nib:true});`);
  assert.equal(run('UI_TEXT.length'), 1); assert.equal(run('UI_TEXT[0].w'), run(`textWidth('Añil: ¡mezcla!')`));
  run(`smallText('→ ← ↑ ↓ × · … « » ♥ ★ ✓ ½ °',0,0);bigText('Trazo doble · ¡Ráfaga! ñ',0,0,'#fff',{progress:12});writtenLines(['uno','dos'],0,0,'#000',4.2,{nib:true});`);
  assert.equal(run(`textWidth('\\u2014')`), run(`textWidth('-')`), 'em dashes alias to the hyphen');
});
test('the exported TrueType files exist, parse and carry the same characters', () => {
  for (const [file, set] of [['chromara-cuaderno.ttf', 'CUADERNO'], ['chromara-rotulo.ttf', 'ROTULO']]) {
    const d = fs.readFileSync(path.join(root, file));
    assert.equal(d.readUInt32BE(0), 0x00010000);
    const n = d.readUInt16BE(4), tables = {};
    for (let i = 0; i < n; i++) tables[d.toString('latin1', 12 + i * 16, 16 + i * 16)] = { off: d.readUInt32BE(20 + i * 16), len: d.readUInt32BE(24 + i * 16) };
    for (const tag of ['cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post', 'OS/2']) assert(tables[tag], file + ' lacks ' + tag);
    assert.equal(tables['OS/2'].len, 96); assert.equal(tables.post.len, 32); assert.equal(tables.head.len, 54);
    assert.equal(d.readUInt16BE(tables.head.off + 18), 16, 'units per em');
    // cmap format 4: rebuild the character set from its segments
    const sub = tables.cmap.off + d.readUInt32BE(tables.cmap.off + 8), segs = d.readUInt16BE(sub + 6) / 2, chars = new Set();
    for (let s = 0; s < segs; s++) { const end = d.readUInt16BE(sub + 14 + s * 2), start = d.readUInt16BE(sub + 16 + segs * 2 + s * 2); if (start === 0xFFFF) continue; for (let c = start; c <= end; c++) chars.add(String.fromCharCode(c)); }
    const expected = run(`Object.keys(${set}).concat([' '])`);
    for (const c of expected) assert(chars.has(c), file + ' lacks ' + c);
    let total = 0; for (let i = 0; i + 4 <= d.length; i += 4) total = (total + d.readUInt32BE(i)) >>> 0;
    assert.equal(total, 0xB1B0AFBA, file + ' checksum adjustment');
  }
});
console.log(checks + ' font checks passed.');
