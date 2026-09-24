// CHROMARA — paisaje de pigmentos. Arte en píxeles, sin imágenes ni red.
'use strict';
const WORLD_COLORS = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'];
const WORLD_REGIONS = [
  { name: 'Refugio Carmín', x: 5, y: 23, rx: 6, ry: 6, color: 'rojo', paper: '#e8c3b8' },
  { name: 'Prado Ámbar', x: 19, y: 23, rx: 8, ry: 6, color: 'amarillo', paper: '#ecd9a8' },
  { name: 'Río de Añil', x: 12, y: 14.5, rx: 13, ry: 2.2, color: 'azul', paper: '#bfd8d8' },
  { name: 'Jardín de los bocetos', x: 11, y: 6, rx: 11, ry: 7, color: 'verde', paper: '#c6dbb2' },
  { name: 'Colinas Violeta', x: 28.5, y: 7, rx: 4, ry: 7, color: 'violeta', paper: '#d5c2e1' },
  { name: 'El Tiznal', x: 36, y: 6, rx: 3.6, ry: 7, color: 'violeta', paper: '#9d93ad', drained: true },
  { name: 'Atelier de las tres tintas', x: 33, y: 22, rx: 6, ry: 7, color: 'naranja', paper: '#e9d9bd' },
];
// Un solo hito por zona y objetos que la cuentan; los caballetes explican el color que piden los bocetos cercanos.
// Coordinates are the centre of each object's feet; collision uses only its base.
const WORLD_OBJECTS = [
  // Refugio Carmín: la casa-bote, un tubo y un tarro; aquí empieza todo
  { kind: 'house', x: 4, y: 20.2, color: 'rojo', title: 'Refugio Carmín', lines: ['Un viejo frasco de pigmento.', 'Aquí empezó la primera pincelada.', 'El color aún vive en el cristal.'] },
  { kind: 'tube', x: 2.3, y: 25.2, color: 'rojo' },
  { kind: 'jar', x: 9.6, y: 23.4, color: 'rojo' },
  { kind: 'palette', x: 6.4, y: 17.8, color: 'rojo', title: 'La paleta de Carmín', lines: ['Rojo, amarillo y azul:', 'tres gotas, todos los colores.', 'Lo que es lápiz se borra; lo que es boceto, se colorea.'] },
  // Prado Ámbar: el molino y la caja de acuarelas
  { kind: 'mill', x: 19.5, y: 26.8, color: 'amarillo', title: 'Molino cromático', lines: ['Seis pétalos recogen la luz.', 'Cada vuelta deja caer', 'un poquito de color.'] },
  { kind: 'box', x: 16.5, y: 20.4, color: 'amarillo', title: 'Acuarelas de viaje', lines: ['Pigmento seco en seis pocillos.', 'Una gota de agua basta', 'para despertar la pintura.'] },
  { kind: 'tube', x: 24.4, y: 18.6, color: 'amarillo' },
  { kind: 'fan', x: 21.4, y: 25.2, color: 'amarillo' },
  // Río de Añil
  { kind: 'boat', x: 5.6, y: 15.2, color: 'azul' },
  { kind: 'boat', x: 19.2, y: 14.6, color: 'amarillo' },
  { kind: 'lotus', x: 15.6, y: 15.2, color: 'azul' },
  // Jardín de los bocetos: el invernadero y dos caballetes que explican sus bocetos
  { kind: 'house', x: 8.4, y: 4.4, color: 'verde', title: 'Invernadero de Ámbar', lines: ['Aquí crecen los bocetos.', 'Sin color no tienen cuerpo;', 'con el suyo, se vuelven reales.'] },
  { kind: 'easel', x: 21.4, y: 4.6, color: 'verde', mix: ['amarillo', 'azul'], title: 'Estudio verde', lines: ['Amarillo + azul = verde.', 'La pasarela del arroyo es un boceto:', 'pide verde para aguantar.'] },
  { kind: 'easel', x: 9.2, y: 11.6, color: 'naranja', mix: ['rojo', 'amarillo'], title: 'Estudio naranja', lines: ['Rojo + amarillo = naranja.', 'El puentecito del estanque', 'espera un color cálido.'] },
  { kind: 'lotus', x: 3.6, y: 9.4, color: 'verde' },
  { kind: 'crystal', x: 15.4, y: 4.2, color: 'verde' },
  { kind: 'jar', x: 2.6, y: 6.6, color: 'verde' },
  { kind: 'tube', x: 18.4, y: 12.4, color: 'verde' },
  // Colinas Violeta: cristales y el caballete que explica la puerta del Tiznal
  { kind: 'easel', x: 28.6, y: 4.4, color: 'violeta', mix: ['rojo', 'azul'], title: 'Estudio violeta', lines: ['Rojo + azul = violeta.', 'La puerta del Tiznal es un boceto:', 'sólo el violeta la hace real.'] },
  { kind: 'crystal', x: 27.2, y: 11.2, color: 'violeta' },
  { kind: 'crystal', x: 30.6, y: 2.6, color: 'violeta' },
  { kind: 'fan', x: 27, y: 8.6, color: 'violeta' },
  // El Tiznal: lo que la Tinta ya se bebió
  { kind: 'jar', x: 34.6, y: 9.2, color: 'violeta', drained: true },
  { kind: 'crystal', x: 37.4, y: 6.6, color: 'violeta', drained: true },
  { kind: 'tube', x: 33.8, y: 3.4, color: 'azul', drained: true },
  // Atelier de las tres tintas
  { kind: 'box', x: 35.5, y: 26.6, color: 'naranja', title: 'Mesa del taller', lines: ['Tres tintas y un estuche', 'que nadie ha podido abrir.', 'Se escribe con lo que se pinta.'] },
  { kind: 'jar', x: 32.4, y: 27.2, color: 'naranja' },
  { kind: 'tube', x: 37.6, y: 22.6, color: 'naranja' },
];
const WORLD_SIZES = { house: [44, 52, 14, 9], palette: [46, 29, 14, 6], tube: [30, 20, 0, 0], jar: [23, 31, 7, 5], crystal: [28, 34, 7, 5], easel: [34, 43, 10, 5], box: [48, 34, 15, 6], mill: [42, 52, 7, 5], flower: [18, 24, 0, 0], boat: [24, 16, 0, 0], fan: [30,24,0,0], lotus: [28,20,0,0], reeds: [22,29,0,0] };
const WORLD_ART = { objects: null, ground: new Map(), palettes: new Map() };
function worldMix(a, b, k) { const aa = hexRgb(a), bb = hexRgb(b); return rgbHex(...aa.map((v, i) => lerp(v, bb[i], k))); }
function worldPigment(color, pal, drained = false) {
  const col = C(color); return pal === 'vivo' ? col : desat(col, drained ? .94 : .48, drained ? -.12 : .02);
}
function worldRegion(tx, ty) {
  let best = WORLD_REGIONS[0], dist = Infinity;
  for (const r of WORLD_REGIONS) { const d = ((tx - r.x) / r.rx) ** 2 + ((ty - r.y) / r.ry) ** 2; if (d < dist) { best = r; dist = d; } }
  return best;
}
// Soft overlapping washes keep region borders from becoming rectangular tiles.
function worldGroundPalette(tx, ty, pal) {
  const posKey = pal + '|' + tx + '|' + ty;
  if (WORLD_ART.ground.has(posKey)) return WORLD_ART.ground.get(posKey);
  const sum = [0, 0, 0]; let total = 0;
  for (const r of WORLD_REGIONS) {
    const k = Math.exp(-2.5 * (((tx - r.x) / r.rx) ** 2 + ((ty - r.y) / r.ry) ** 2));
    const rgb = hexRgb(r.paper); total += k; rgb.forEach((v, i) => sum[i] += v * k);
  }
  const tint = rgbHex(...sum.map(v => Math.round(v / Math.max(.00001, total) / 6) * 6));
  const key = pal + '|' + tint;
  if (!WORLD_ART.palettes.has(key)) {
    const paper = Game.page >= 1 && pal === 'gris' ? worldMix(MAP.paper || '#81778f', tint, .24) : worldMix(pal === 'vivo' ? '#f4e7c9' : '#d0c5ac', tint, pal === 'vivo' ? .66 : .40);
    WORLD_ART.palettes.set(key, { ...PAL[pal], key,
      grass: paper, grass2: worldMix(paper, '#776c72', .10), grassHi: worldMix(paper, '#fff6d6', .25),
      grassDk: worldMix(paper, '#74745e', .32), hatch: worldMix(paper, '#827474', .17),
      crayon: worldMix(paper, '#fff2cf', .28), flower: worldPigment('amarillo', pal), flower2: worldPigment('rojo', pal),
    });
  }
  const p = WORLD_ART.palettes.get(key); WORLD_ART.ground.set(posKey, p); return p;
}
function worldObjects() {
  if (WORLD_ART.objects) return WORLD_ART.objects;
  const objects = WORLD_OBJECTS.map((o, i) => ({ ...o, id: i, wx: Math.round(o.x * TILE), wy: Math.round(o.y * TILE), size: WORLD_SIZES[o.kind] }));
  // Reeds are bundles of nibs at the water's edge, arranged away from paths.
  for(let ty=7;ty<28;ty++)for(let tx=3;tx<27;tx++){
    if(tileAt(tx,ty)!=='.'||hash2(tx+18,ty)%4!==0||![[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>tileAt(tx+a,ty+b)==='~'))continue;
    const wx=tx*TILE+8,wy=ty*TILE+13;
    if(objects.some(o=>Math.hypot(o.wx-wx,o.wy-wy)<25)||MAP.spots.some(o=>Math.hypot(o.x*TILE+8-wx,o.y*TILE+12-wy)<28))continue;
    if(MAP.merchant&&Math.hypot(MAP.merchant.x*TILE+8-wx,MAP.merchant.y*TILE+12-wy)<36)continue;
    objects.push({id:objects.length,kind:'reeds',wx,wy,color:'verde',size:WORLD_SIZES.reeds});
  }
  // Small flowers gather near the edge of a clearing, never in the puzzle or road.
  for (let ty = 2; ty < 28; ty++) for (let tx = 1; tx < 39; tx++) {
    const seed = hash2(tx + 37, ty + 93);
    if (tileAt(tx, ty) !== '.' || seed % 11 !== 0 || (tx >= 26 && ty >= 15 && ty <= 24)) continue;
    const wx = tx * TILE + 8, wy = ty * TILE + 13;
    if (objects.some(o => Math.hypot(o.wx - wx, o.wy - wy) < 29)) continue;
    if (MAP.spots.some(o => Math.hypot(o.x * TILE + 8 - wx, o.y * TILE + 12 - wy) < 24)) continue;
    if (MAP.signs.some(o => Math.hypot(o.x * TILE + 8 - wx, o.y * TILE + 8 - wy) < 22)) continue;
    if (MAP.jar && Math.hypot(MAP.jar.x * TILE + 16 - wx, MAP.jar.y * TILE + 20 - wy) < 39) continue;
    if (MAP.merchant && Math.hypot(MAP.merchant.x * TILE + 8 - wx, MAP.merchant.y * TILE + 12 - wy) < 40) continue; // el puesto de Sepia queda despejado
    objects.push({ id: objects.length, kind: 'flower', wx, wy, color: worldRegion(tx, ty).color, size: WORLD_SIZES.flower, variant: seed % 3 });
  }
  return WORLD_ART.objects = objects;
}
function worldBlocked(x, y) {
  return worldObjects().some(o => o.size[2] && Math.abs(x - o.wx) < o.size[2] + 4 && y > o.wy - o.size[3] - 3 && y < o.wy + 3);
}
function worldNearby() {
  let nearest = null, distance = 28;
  for (const o of worldObjects()) {
    if (!o.title) continue;
    const d = Math.hypot(OW.x - o.wx, (OW.y - (o.wy + 6)) * 1.2);
    if (d < distance) { nearest = o; distance = d; }
  }
  return nearest;
}

// Every prop shares a dark plum outline, top-left light and an anchored shadow.
function worldSprite(o, pal, frame = 0) {
  const variant = o.variant || 0;
  return cached(`world|${o.kind}|${o.color}|${pal}|${o.drained ? 1 : 0}|${variant}|${frame}`, () => {
    const c = document.createElement('canvas'); c.width = o.size[0]; c.height = o.size[1];
    const x = c.getContext('2d'), w = c.width, h = c.height, ink = '#493c4e', paper = '#fff0ce';
    const r = ramp(worldPigment(o.color, pal, o.drained)), wood = '#b58a62', woodHi = '#e2bd86', woodDk = '#785550';
    const rect = (col, a, b, cw = 1, ch = 1) => px(x, col, a, b, cw, ch);
    const poly = (col, points) => { x.fillStyle = col; x.beginPath(); points.forEach(([a,b], i) => i ? x.lineTo(a,b) : x.moveTo(a,b)); x.closePath(); x.fill(); };
    // Scanline ellipses preserve crisp silhouettes at the native resolution.
    const oval = (col, cx, cy, rx, ry) => { for (let dy = -ry; dy <= ry; dy++) { const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - dy * dy / (ry * ry)))); rect(col, cx - half, cy + dy, half * 2 + 1); } };
    const gleam = (cx, cy, col = paper) => { rect(col, cx - 2, cy, 5); rect(col, cx, cy - 2, 1, 5); };
    if (WORLD_HD[o.kind]) { const oval2 = (col, cx, cy, rx, ry) => { if (rx < 1 || ry < 1) { rect(col, Math.round(cx), Math.round(cy)); return; } oval(col, Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry)); };
      WORLD_HD[o.kind]({ x, r, rect, poly, oval: oval2, paper, wood, woodHi, woodDk, pal, o, frame }); return worldFinish(c); }
    if (o.kind === 'house') {
      // Glass pigment bottle as a little cottage, ribbed screw-top and paper label.
      oval(ink, 22, 47, 18, 4); rect(ink, 5, 18, 34, 29); oval(ink, 22, 18, 17, 5);
      rect(r.dk, 7, 20, 30, 26); oval(r.sh, 22, 44, 15, 4);
      rect(r.base, 8, 20, 25, 23); rect(r.hi, 9, 22, 3, 18); rect(r.sh, 32, 20, 4, 24);
      oval(r.hi, 22, 19, 14, 3); rect(paper, 10, 22, 2, 11); rect(paper, 10, 35, 2, 2);
      rect(ink, 7, 7, 30, 9); oval(ink, 22, 7, 15, 4); rect(wood, 8, 8, 28, 6); oval(woodHi, 22, 7, 14, 3);
      for (let a = 10; a < 36; a += 4) rect(woodDk, a, 10, 1, 4);
      rect('#f9de9e', 11, 6, 13); rect(ink, 13, 28, 19, 14); rect(paper, 14, 29, 17, 11);
      rect(woodDk, 16, 31, 5, 5); rect('#f7cb67', 17, 32, 3, 3); rect(paper, 18, 32, 1, 3);
      rect(ink, 24, 32, 5, 10); rect(wood, 25, 33, 3, 9); rect(paper, 27, 36);
      rect(ink, 23, 43, 9, 2); rect(woodHi, 23, 42, 9); rect(wood, 22, 45, 12, 2);
      rect(r.sh, 37, 31, 3, 11); rect(r.hi, 38, 33, 1, 6); oval(r.base, 38, 43, 2, 1);
      gleam(30, 22);
      rect(ink, 29, 0, 5, 9); rect('#8a8a96', 30, 1, 3, 7); rect('#c9c4d4', 30, 1, 1, 7); rect(ink, 28, 0, 7, 2); rect('#6a6480', 29, 0, 5, 1); // la chimenea: un tubo de latón en la tapa
    } else if (o.kind === 'palette') {
      oval(ink, 22, 17, 22, 11); oval(woodDk, 22, 18, 21, 9); oval(wood, 22, 14, 21, 11); oval(woodHi, 21, 12, 19, 8);
      rect(wood, 5, 13, 27); rect(wood, 9, 19, 19); oval(ink, 32, 17, 4, 3); oval('#c4b499', 32, 16, 3, 2);
      [[8,11],[14,6],[25,5],[36,9],[23,20],[12,19]].forEach(([a,b], i) => {
        const p = ramp(worldPigment(WORLD_COLORS[i], pal)); oval(p.dk,a,b+1,4,3); oval(p.base,a,b,4,2); rect(p.hi,a-2,b-1,3); rect(paper,a-2,b-1);
      });
      rect(woodDk, 16, 12, 9); rect(wood, 20, 14, 6);
    } else if (o.kind === 'tube') {
      // Un tubo de óleo tumbado y medio exprimido: cuerpo de aluminio con arrugas, etiqueta de su color, tapón y un churro de pintura.
      oval('rgba(40,30,40,.25)', 15, 17, 13, 2);
      poly(ink, [[2,10],[5,6],[20,4],[24,6],[24,13],[20,15],[5,15]]);
      poly('#cfd0cc', [[3,10],[6,7],[20,5],[23,7],[23,12],[20,14],[6,14]]);
      rect('#f2f2ea', 7, 7, 13, 1); rect('#9a9aa0', 6, 13, 15, 1); for (let a = 4; a < 9; a += 2) { rect('#9a9aa0', a, 8, 1, 5); rect('#f2f2ea', a + 1, 8, 1, 4); } // el culo, doblado y arrugado
      rect(ink, 10, 6, 9, 9); rect(r.base, 11, 7, 7, 7); rect(r.hi, 11, 7, 7, 2); rect(r.sh, 11, 12, 7, 2); rect(paper, 13, 9, 3, 2); // etiqueta
      rect(ink, 24, 7, 2, 5); rect('#8c8ab0', 24, 8, 1, 3); rect(ink, 26, 6, 3, 7); rect('#6a6480', 26, 7, 2, 5); rect('#b8b6cc', 26, 7, 1, 2); // cuello y tapón
      poly(r.out, [[24,14],[27,13],[29,16],[26,19],[21,18]]); poly(r.base, [[24,15],[27,14],[28,16],[26,18],[22,17]]); rect(r.hi, 24, 15, 2, 1); rect(paper, 25, 15); // el churro
    } else if (o.kind === 'jar') {
      oval(ink, 11, 27, 10, 3); rect(ink, 1, 8, 21, 19); oval(ink, 11, 8, 10, 4);
      rect('#aebbc1', 3, 9, 17, 17); rect(r.sh, 3, 17, 17, 9); oval(r.base,11,18,8,3); oval(r.sh,11,26,8,2);
      rect(r.base, 4, 19, 12, 6); rect(r.dk, 18, 18, 2, 8); rect(paper, 4, 10, 2, 12); rect('#e0ddd4', 4, 24, 2);
      oval(ink, 11, 7, 10, 3); oval('#cfc5ae',11,6,9,2); oval(r.dk,11,6,6,1); rect(r.hi,7,5,5);
      rect(ink, 14, 0, 3, 17); rect(woodHi, 14, 0, 2, 12); rect('#dedfdd', 14, 12, 2, 3); rect(r.base, 14, 15, 2, 3);
      rect(paper, 9, 21, 6, 4); rect(r.base, 11, 22, 2, 2);
    } else if (o.kind === 'crystal') {
      oval(r.dk,14,30,12,3); oval(r.sh,14,29,10,2);
      const shard = (a,b,cw,ch) => {
        poly(ink, [[a,b],[a+cw/2,b-ch],[a+cw,b],[a+cw-2,b+8],[a+2,b+8]]);
        poly(r.sh, [[a+1,b],[a+cw/2,b-ch+2],[a+cw-1,b],[a+cw-3,b+6],[a+2,b+6]]);
        poly(r.hi, [[a+1,b],[a+cw/2,b-ch+2],[a+cw/2,b+5],[a+2,b+6]]);
        poly(r.base, [[a+cw/2,b-ch+2],[a+cw-1,b],[a+cw/2,b+5]]);
        rect(paper,a+cw/2-1,b-ch+4,1,Math.max(2,ch/2|0));
      };
      shard(8,21,12,20); shard(0,24,10,11); shard(18,25,10,13); rect(r.hi,8,31,4); gleam(24,8);
    } else if (o.kind === 'easel') {
      rect(ink,15,1,4,40); rect(woodHi,16,2,2,38);
      poly(ink,[[7,14],[11,15],[6,42],[3,42]]); poly(ink,[[23,14],[27,14],[31,42],[28,42]]);
      poly(wood,[[8,16],[10,16],[5,41],[4,41]]); poly(woodHi,[[24,16],[26,16],[30,41],[29,41]]);
      rect(ink,3,5,28,27); rect(wood,4,6,26,25); rect(paper,6,8,22,21); rect('#e5d4b1',6,27,22,2);
      const mix = o.mix || ['rojo','azul'];
      const first = ramp(worldPigment(mix[0],pal)), second = ramp(worldPigment(mix[1],pal));
      oval(first.base,11,14,4,3); oval(second.base,23,14,4,3); rect(first.hi,9,12,3); rect(second.hi,21,12,3);
      rect(woodDk,16,14,3); rect(woodDk,17,13,1,3); rect(woodDk,16,19,3); rect(woodDk,16,21,3);
      oval(r.sh,17,25,5,3); oval(r.base,17,24,5,2); rect(r.hi,14,23,4);
      rect(ink,1,31,32,3); rect(woodHi,2,31,30); rect(woodDk,11,36,12,2);
    } else if (o.kind === 'box') {
      // Open metal watercolour tin; stains in the lid echo its six pigment pans.
      rect(ink,3,1,42,16); rect('#97939d',4,2,40,14); rect(paper,6,3,36,11); rect('#d7cbb6',7,12,34,2);
      rect(ink,1,16,46,15); rect('#817d8c',2,17,44,13); rect('#d9d4d0',3,17,42,10); rect('#eee9dc',3,17,42);
      for(let i=0;i<6;i++) { const p=ramp(worldPigment(WORLD_COLORS[i],pal)); rect(ink,4+i*7,19,6,8); rect(p.sh,5+i*7,20,4,6); rect(p.base,5+i*7,20,4,4); rect(p.hi,5+i*7,20,3); rect(worldMix(p.base,paper,.72),8+i*5,6+(i%2)*3,4,2); }
      rect(ink,18,31,12,2); rect('#d9d4d0',20,30,8,2); rect('#645a6b',7,15,5); rect('#645a6b',36,15,5);
    } else if (o.kind === 'mill') {
      rect(ink,18,18,6,32); rect(wood,19,18,4,31); rect(woodHi,19,23,1,24); rect(woodDk,14,49,16,2); rect(woodHi,16,48,12);
      // A printed RYB wheel rotates in eight deliberately drawn pixel steps.
      for(let i=0;i<6;i++) { const a=(i/6+frame/48)*Math.PI*2, col=ramp(worldPigment(WORLD_COLORS[i],pal));
        const points=[[21+Math.cos(a)*3,19+Math.sin(a)*3],[21+Math.cos(a+.18)*18,19+Math.sin(a+.18)*18],[21+Math.cos(a+.78)*15,19+Math.sin(a+.78)*15]].map(p=>p.map(Math.round));
        poly(ink,points); poly(col.base,points.map(([px,py])=>[Math.round(21+(px-21)*.88),Math.round(19+(py-19)*.88)]));
        rect(col.hi,Math.round(21+Math.cos(a+.3)*11),Math.round(19+Math.sin(a+.3)*11),2,2);
      }
      oval(ink,21,19,4,4); oval(woodHi,21,19,2,2); rect(paper,20,18);
      rect(ink,23,36,8,7); rect(paper,24,37,6,5); rect(r.base,25,38,4,2);
    } else if (o.kind === 'flower') {
      // Flor de pigmento: tallo con dos hojas, cinco pétalos redondos con sombra y el centro de polen; se mece.
      const stem = pal === 'vivo' ? '#5f8a4c' : '#86836c', leaf = pal === 'vivo' ? '#7fae5c' : '#9a9a7c', sway = frame === 1 ? 1 : frame === 3 ? -1 : 0, hx = 9 + sway, hy = 7;
      rect(ink, 8, 11, 3, 13); rect(stem, 9, 11, 1, 12); rect(pal === 'vivo' ? '#8fbf6a' : '#a8a88c', 9, 12, 1, 5);
      poly(ink, [[9,18],[3,14],[2,17],[8,20]]); poly(leaf, [[9,18],[4,15],[3,16],[8,19]]); poly(ink, [[10,15],[16,12],[16,15],[10,17]]); poly(leaf, [[10,15],[15,13],[15,14],[10,16]]);
      if (variant === 1) { oval(ink, hx, hy + 1, 6, 5); oval(r.sh, hx, hy + 1, 5, 4); oval(r.base, hx, hy, 5, 3); rect(r.hi, hx - 3, hy - 2, 3); rect(paper, hx - 3, hy - 2); rect(r.dk, hx - 1, hy + 3, 3); } // capullo
      else { [[0,-4],[4,-1],[3,3],[-3,3],[-4,-1]].forEach(([dx,dy]) => oval(ink, hx + dx, hy + dy, 3, 3)); [[0,-4],[4,-1],[3,3],[-3,3],[-4,-1]].forEach(([dx,dy]) => { oval(r.sh, hx + dx, hy + dy + 1, 2, 2); oval(r.base, hx + dx, hy + dy, 2, 2); rect(r.hi, hx + dx - 1, hy + dy - 1, 2, 1); });
        oval(ink, hx, hy, 2, 2); oval('#e8a830', hx, hy, 2, 1); rect('#ffe6a0', hx - 1, hy - 1, 2, 1); }
    } else if(o.kind==='fan') {
      // Hinged colour-sample cards: paper edging, two tones and a brass rivet.
      for(let i=0;i<5;i++){
        const col=ramp(worldPigment(WORLD_COLORS[(i+WORLD_COLORS.indexOf(o.color))%6],pal));
        x.save();x.translate(15,21);x.rotate((i-2)*.31);rect(ink,-4,-20,8,20);rect(paper,-3,-19,6,18);rect(col.base,-2,-18,4,8);rect(col.hi,-2,-10,4,4);rect('#bfb099',-2,-5,3,1);x.restore();
      }
      oval(woodDk,15,20,2,2);rect(paper,14,19);rect(woodHi,15,20);
    } else if(o.kind==='lotus') {
      const leaf=pal==='vivo'?'#52936e':'#819b85';oval('#3c6e79',14,17,12,2);oval(leaf,14,15,12,3);rect('#b3caa0',5,14,8,1);rect(PAL[pal].wash,20,15,6,2);
      const lift=frame===1?1:0;
      [[-6,0],[-3,-4],[3,-4],[6,0],[0,-1]].forEach(([a,b])=>{oval(r.sh,14+a,11+b-lift,4,4);oval(r.base,14+a,10+b-lift,3,3);rect(r.hi,13+a,8+b-lift,2,1);});
      oval('#edd481',14,10-lift,3,2);rect(paper,13,8-lift,2,1);
    } else if(o.kind==='reeds') {
      // Juncos de plumilla: tallos de caña con puntas de pluma metálica, y una mata de hojas a sus pies.
      for(let i=0;i<3;i++){
        const xx=5+i*6,top=i===1?0:5;rect(ink,xx-1,top+9,3,19-top);rect(woodDk,xx,top+9,1,18-top);rect(woodHi,xx,top+10,1,12-top);
        poly(ink,[[xx-3,top+10],[xx,top],[xx+4,top+10],[xx+2,top+14],[xx-1,top+14]]);
        poly('#c8d2cc',[[xx-2,top+9],[xx,top+2],[xx+2,top+10],[xx,top+12]]);poly('#8fa3a8',[[xx,top+2],[xx+3,top+10],[xx,top+12]]);rect('#3a4a5a',xx,top+5,1,6);rect(paper,xx-1,top+6,1,3);
      }
      const lf=pal==='vivo'?'#7c9e67':'#969d77';poly(ink,[[11,28],[0,16],[4,15],[11,23],[21,15],[22,19],[13,28]]);poly(lf,[[11,27],[1,17],[4,16],[11,24],[20,16],[21,19],[13,27]]);rect('#c0c58e',3,17,2,1);rect('#c0c58e',19,17,1,1);
    } else if(o.kind==='boat') {
      // Barco de papel doblado: casco con sus pliegues, vela en dos caras y una franja pintada de su color.
      poly(ink,[[0,9],[23,9],[18,15],[5,15]]); poly('#f4ecd8',[[2,10],[21,10],[17,14],[6,14]]); poly('#c9bfa8',[[11,10],[21,10],[17,14],[11,14]]); rect(r.base,5,11,14,2); rect(r.hi,5,11,6,1);
      poly(ink,[[4,10],[12,0],[19,10]]); poly('#fbf5e6',[[6,9],[12,2],[12,9]]); poly('#d8cfbd',[[12,2],[17,9],[12,9]]); rect('#fff9e9',8,6,2,2); rect(ink,12,1,1,9);
    }
    return c;
  });
}

// Ground paint is part of the battle texture as well as the overhead map.
function drawWorldGround(x, cx, cy, pal, width = W, height = H) {
  x.save();
  for(const o of worldObjects()) {
    const sx = o.wx-cx, sy=o.wy-cy;
    if(sx < -65 || sy < -30 || sx > width+65 || sy > height+30 || ['boat','flower','lotus','reeds'].includes(o.kind)) continue;
    const r=ramp(worldPigment(o.color,pal,o.drained));
    if(['house','mill','easel','palette','box'].includes(o.kind)) {
      // Ragged paper offcuts beneath landmarks, with a stitched pencil border.
      const hw=o.kind==='house'?27: o.kind==='easel'?22:31, hh=12;
      x.fillStyle='rgba(75,58,69,.14)'; x.fillRect(sx-hw+2,sy-hh+3,hw*2,hh*2);
      x.fillStyle=pal==='vivo'?'#f4e7c9':'#dfd2b6'; x.fillRect(sx-hw,sy-hh,hw*2,hh*2);
      x.fillRect(sx-hw-2,sy-hh+4,hw*2+4,hh*2-8);
      x.fillStyle='#b9a78f'; for(let i=0;i<hw*2-8;i+=5)x.fillRect(sx-hw+4+i,sy+hh-3,3,1);
      if(o.kind==='easel') { const cols=[...(o.mix||[]),o.color]; cols.forEach((col,i)=>{x.fillStyle=worldPigment(col,pal);x.fillRect(sx-15+i*10,sy+6,7,3);}); }
      if(o.kind==='house'||o.kind==='mill'){
        for(let i=0;i<6;i++){const a=i/6*Math.PI*2;x.globalAlpha=.35;x.fillStyle=worldPigment(WORLD_COLORS[i],pal);x.fillRect(Math.round(sx+Math.cos(a)*19)-2,Math.round(sy+Math.sin(a)*7),4,2);}x.globalAlpha=1;
      }
    }
    // Small pigment spills are readable as paint, with a drying edge and glint.
    if(o.kind==='tube'||o.kind==='jar'||o.kind==='crystal') {
      x.fillStyle=r.sh; x.fillRect(sx-13,sy-2,19,5); x.fillRect(sx-10,sy-4,13,9); x.fillRect(sx-15,sy,23,2);
      x.fillStyle=r.base; x.fillRect(sx-11,sy-2,15,4); x.fillRect(sx-8,sy-3,9,6); x.fillStyle=r.hi;x.fillRect(sx-9,sy-2,4,1);
      x.fillStyle=r.base;x.fillRect(sx+10,sy+3,2,2);x.fillRect(sx-16,sy-4,2,1);
    }
  }
  x.restore();
}
function drawWorldObjects(ents, cx, cy, pal) {
  for(const o of worldObjects()) {
    const x=o.wx-cx,y=o.wy-cy;
    if(x < -o.size[0] || x > W+o.size[0] || y < 0 || y > H+o.size[1]) continue;
    const frame=o.kind==='mill' ? (OW.t/18|0)%8 : o.kind==='flower' ? ((OW.t/22|0)+o.id)%4 : o.kind==='lotus'?(OW.t/32|0)%2:0;
    ents.push({y:o.wy,draw:()=>{
      const floating=o.kind==='boat'||o.kind==='lotus',bob=floating ? Math.round(Math.sin(OW.t*.035+o.id)) : 0;
      if(!floating)shadow(x,y+1,o.kind==='flower'?8:Math.round(o.size[0]*.7));
      else {g.fillStyle=PAL[pal].foam;g.fillRect(x-14,y+2,9,1);g.fillRect(x+7,y+3,6,1);}
      g.drawImage(worldSprite(o,pal,frame),Math.round(x-o.size[0]/2),Math.round(y-o.size[1]+1+bob));
      if((o.kind==='crystal'||o.kind==='jar') && (OW.t+o.id*17)%160<14) {
        const t=(OW.t+o.id*17)%160,r=t<7?Math.min(3,t):Math.min(3,14-t);g.fillStyle='#fff6de';g.fillRect(x-5-r,y-o.size[1]+8,r*2+1,1);g.fillRect(x-5,y-o.size[1]+8-r,1,r*2+1);
      }
    }});
  }
}
function drawWorldLabel() {
  if(OW.msg||OW.menu||OW.ring||OW.heal||OW.act||OW.landT>0)return;
  const region=worldRegion(OW.x/TILE,OW.y/TILE),col=worldPigment(region.color,Game.palette);
  const hurt=Party.some(q=>q.cur.hp<effStats(q).hp*.5||q.cur.mp<effStats(q).mp*.25);
  const at=artObserve('region',region.name),age=ARTUI.t-at;
  // Let the region caption dry away after entering; keep just the color mark.
  if(!hurt){
    if(age<210){const width=textWidth(region.name)+16,slide=Math.round((1-artIn(at,18))*(width+10))+(age>190&&Prefs.shake?Math.round((age-190)/20*(width+10)):0);artTag(region.name,W-width-5+slide,5,col);}
    else paintDab(W-12,12,4*Math.min(1,artIn(at+210,12)),col);
  }
  if(merchantNear()&&!fieldNearby().length){ // Sepia: su propio rótulo, que abre la tienda
    const label=battleKey('ok')+' / '+DATA.merchant.title,w=Math.min(308,textWidth(label)+16),x=Math.round((W-w)/2),nearAt=artObserve('landmark','merchant');
    g.save();g.translate(0,Math.round((1-artIn(nearAt,14))*26));artTag(label,x,160-Math.round(artPop(nearAt)*3),'#9a6a3e');g.restore();
    uiHit(x,155,w,24,openShop);return;
  }
  const nearby=worldNearby();if(!nearby||fieldNearby().length||OW.jar?.toast>0)return;
  const label=battleKey('ok')+' / '+nearby.title,w=Math.min(308,textWidth(label)+16),x=Math.round((W-w)/2);
  const nearAt=artObserve('landmark',nearby.title);
  g.save();g.translate(0,Math.round((1-artIn(nearAt,14))*26));
  artTag(label,x,160-Math.round(artPop(nearAt)*3),col);
  g.restore();
  uiHit(x,155,w,24,()=>{OW.msg={lines:[nearby.title,...nearby.lines],t:0};Audio.sfx('page');});
}
// Huellas de pintura: el líder deja la suya al posarse en cada bote, del color de su gota, y se secan despacio.
function drawFootprints(cx,cy){
  for(const f of OW.prints||[]){const x=Math.round(f.x-cx),y=Math.round(f.y-cy);if(x<-6||x>W+6||y<-6||y>H+6)continue;const a=Math.min(.55,(150-f.t)/150*.55);if(a<=0)continue;
    g.globalAlpha=a;g.fillStyle=f.col;g.fillRect(x-2,y,4,2);g.fillRect(x-1,y-1,2,1);g.fillStyle=ramp(f.col).hi;g.fillRect(x-1,y,1,1);g.globalAlpha=1;}
}
// Motas de pigmento en el aire: suben despacio y toman el color de la región por la que pasan. Son función de OW.t.
function drawPigmentMotes(cx,cy,pal){
  if(!Prefs.shake||Game.page>=1)return;
  for(let i=0;i<18;i++){const sp=.12+(i%5)*.04,life=H+40,ph=(OW.t*sp+i*47)%life,x=Math.round(((i*73+Math.sin(OW.t*.01+i)*14)%W+W)%W),y=Math.round(H+10-ph);
    const r=worldRegion((x+cx)/TILE|0,(y+cy)/TILE|0),col=worldPigment(r.color,pal,r.drained);g.globalAlpha=.45*Math.sin(ph/life*Math.PI);g.fillStyle=i%3?col:'#fff6e2';g.fillRect(x,y,i%4===0?2:1,i%4===0?2:1);}
  g.globalAlpha=1;
}
// Humo de chimenea: las casas-bote echan bocanadas de su color que suben y se deshacen.
function drawChimneys(cx,cy,pal){
  if(!Prefs.shake)return;
  for(const o of worldObjects()){if(o.kind!=='house')continue;const bx=o.wx-cx+9,by=o.wy-cy-52;if(bx<-20||bx>W+20||by<-40||by>H+20)continue;const col=worldPigment(o.color,pal);
    for(let k=0;k<4;k++){const q=((OW.t*.012+k/4+o.id*.13)%1),x=bx+Math.sin(q*6+k)*3+q*6,y=by-q*26,r=1.5+q*3.5;g.globalAlpha=.55*(1-q);g.fillStyle=k%2?col:worldMix(col,'#fff6e2',.5);g.beginPath();g.ellipse(x,y,r,r*.8,0,0,6.29);g.fill();}}
  g.globalAlpha=1;
}
function drawWorldAtmosphere(cx,cy,pal) {
  drawChimneys(cx,cy,pal);drawPigmentMotes(cx,cy,pal);
  // Paper butterflies visit a few flowers; the walking route stays visually quiet.
  for(const o of worldObjects()){
    if(o.kind!=='flower'||o.id%4!==0)continue;
    const t=OW.t*.033+o.id*1.7,x=Math.round(o.wx-cx+Math.cos(t*.7)*12),y=Math.round(o.wy-cy-24+Math.sin(t)*5);
    if(x<-8||x>W+8||y<-8||y>H+8)continue;
    const wing=Math.sin(t*4)>0?3:1,col=worldPigment(o.color,pal);
    g.fillStyle=worldMix(col,'#fff2d3',.35);g.fillRect(x-wing,y-1,wing,2);g.fillRect(x+1,y-1,wing,2);
    g.fillStyle=col;g.fillRect(x-wing,y+1,wing,1);g.fillRect(x+1,y+1,wing,1);g.fillStyle='#6b6170';g.fillRect(x,y,1,3);
  }
}
// A 3×5 pixel alphabet stays legible on the game's 320×180 canvas.
const WORLD_GLYPHS = {
  '?':'110001010000010',
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',
  '0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110','·':'000000010000000','+':'000010111010000','-':'000000111000000','/':'001001010100100','[':'110100100100110',']':'011001001001011','!':'010010010000010','¡':'010000010010010',
};
function worldTinyText(label,x,y,color) {
  g.fillStyle=color;
  [...label.toUpperCase()].forEach((ch,i)=>{ const base=ch.normalize('NFD')[0],bits=WORLD_GLYPHS[base];if(!bits)return;for(let j=0;j<15;j++)if(bits[j]==='1')g.fillRect(x+i*4+j%3,y+(j/3|0),1,1);if(ch!==base){g.fillRect(x+i*4+2,y-2,1,1);g.fillRect(x+i*4+1,y-1,1,1);} });
}
// =====================================================================
// Sepia, la marchante de pigmentos: una gota de tinta sepia con sombrero de paja y un fardo de tubos a la espalda,
// sentada junto al camino con su género extendido sobre una manta. Vende el nivel 2 de las mezclas (tienda en settings.js).
// =====================================================================
function merchantAt() { const m = MAP.merchant; return m ? { x: m.x * TILE + 8, y: m.y * TILE + 12 } : null; }
function merchantBlocked(x, y) { const m = merchantAt(); return !!m && Math.abs(x - m.x) < 11 && y > m.y - 7 && y < m.y + 3; }
function merchantNear() { const m = merchantAt(); return !!m && !OW.act && Math.hypot(OW.x - m.x, (OW.y - (m.y + 6)) * 1.2) < 30; }
function openShop() { openOverlay('shop'); Game.overlay.message = DATA.merchant.greet; }
function merchantSprite(blink) {
  return cached('merchant|' + (blink ? 1 : 0), () => {
    const c = document.createElement('canvas'); c.width = 26; c.height = 31; const x = c.getContext('2d'), F = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const rp = ramp('#9a6a3e');
    // el fardo: una caja de madera a la espalda con tubos de pintura asomando
    [['rojo', 14, 4], ['amarillo', 16, 2], ['azul', 18, 3], ['verde', 20, 5]].forEach(([k, tx, ty]) => { const t = ramp(C(k)); F('#241e32', tx - 1, ty - 1, 4, 10); F(t.base, tx, ty + 1, 2, 8); F(t.hi, tx, ty + 1, 1, 8); F('#c9c4d4', tx, ty, 2, 1); });
    F('#3a2414', 12, 8, 12, 15); F('#8a5a34', 13, 9, 10, 13); F('#a8784a', 13, 9, 10, 1); F('#6b4424', 13, 13, 10, 1); F('#6b4424', 13, 17, 10, 1); F('#3a2414', 17, 9, 1, 13);
    // el cuerpo: una gota sepia con brillo arriba a la izquierda y sombra abajo a la derecha
    for (let y = 8; y <= 29; y++) { const w = y < 15 ? (y - 8) / 7 * 6.5 : Math.sqrt(Math.max(0, 70 - (y - 21) ** 2)); if (w < .5) continue; const a = Math.round(10 - w), b = Math.round(10 + w); F(rp.out, a - 1, y, b - a + 2); F(rp.base, a, y, b - a); if (y > 20) F(rp.sh, Math.round(10 + w * .2), y, Math.max(1, b - Math.round(10 + w * .2))); }
    F(rp.out, 4, 30, 13); F(rp.hi, 5, 16, 2, 3); F(rp.spec, 5, 16, 1, 1);
    // cara: ojos (o párpados), mofletes y media sonrisa
    if (blink) { F('#241e32', 7, 21, 2); F('#241e32', 12, 21, 2); } else { F('#241e32', 7, 20, 1, 2); F('#241e32', 12, 20, 1, 2); F('#ffffff', 7, 20); F('#ffffff', 12, 20); }
    F('#c9776a', 5, 23, 2); F('#c9776a', 13, 23, 2); F('#241e32', 9, 24, 2); F('#241e32', 8, 23); F('#241e32', 11, 23);
    // sombrero de paja de ala ancha con cinta roja
    F('#5a3f1e', 0, 12, 21, 3); F('#d8b070', 1, 12, 19, 2); F('#f0d49a', 2, 12, 8, 1); F('#5a3f1e', 5, 6, 11, 7); F('#d8b070', 6, 7, 9, 5); F('#f0d49a', 7, 7, 3, 1); F('#a6423a', 6, 10, 9, 2); F('#d8b070', 3, 13, 15, 1);
    c.__key = 'merchant'; return c;
  });
}
function drawMerchant(ents, cx, cy) {
  const m = merchantAt(); if (!m) return; const x = m.x - cx, y = m.y - cy; if (x < -40 || y < -50 || x > W + 40 || y > H + 40) return;
  // la manta con el género: tubos tumbados y un par de tarros, siempre bajo los pies
  ents.push({ y: m.y - 30, draw: () => { g.fillStyle = '#6b4a33'; g.beginPath(); g.ellipse(x - 14, y + 3, 15, 6, 0, 0, 6.29); g.fill(); g.fillStyle = '#c9a26b'; g.beginPath(); g.ellipse(x - 14, y + 2, 14, 5, 0, 0, 6.29); g.fill(); g.fillStyle = '#a6423a'; for (let i = -2; i <= 2; i++) g.fillRect(Math.round(x - 14 + i * 5), y - 2, 1, 8);
    [['rojo', -24, 0], ['amarillo', -18, 3], ['azul', -11, -1], ['verde', -6, 2]].forEach(([k, dx, dy]) => { const t = ramp(C(k)); g.fillStyle = '#241e32'; g.fillRect(Math.round(x + dx - 1), Math.round(y + dy - 1), 6, 4); g.fillStyle = t.base; g.fillRect(Math.round(x + dx), Math.round(y + dy), 4, 2); g.fillStyle = '#c9c4d4'; g.fillRect(Math.round(x + dx + 4), Math.round(y + dy), 1, 2); }); } });
  ents.push({ y: m.y, draw: () => {
    const near = merchantNear(), bob = Prefs.shake ? ((Game.t >> 4) & 1) : 0, blink = (Game.t % 150) < 5, wave = near && Prefs.shake ? Math.round(Math.sin(Game.t * .25) * 1.5) : 0;
    shadow(x, y, 16); drawSprite(merchantSprite(blink), x + 3, y + 1 - bob, 1);
    if (wave) { g.fillStyle = '#5a3f1e'; g.fillRect(Math.round(x - 10), Math.round(y - 19 + wave), 3, 1); }
    // sobre ella flotan tres pinceladas que giran: aquí se mezcla
    if (!near) { const t = Game.t * .06; ['rojo', 'amarillo', 'azul'].forEach((k, i) => { const a = t + i * 2.09; paintDab(Math.round(x + 1 + Math.cos(a) * 5), Math.round(y - 36 + Math.sin(a) * 2 - bob), 2, C(k)); }); }
  } });
}
// ---- El borde del mundo es el borde de la hoja: papel rasgado sobre la mesa de nogal, sin setos que encierren.
function pageEdgeTile(tx, ty) {
  const L = tx === 0, Rt = tx === MAP.w - 1, T = ty === 0, B = ty === MAP.h - 1, v = hash2(tx, ty) & 3;
  return cached(`page-edge|${L ? 1 : 0}${Rt ? 1 : 0}${T ? 1 : 0}${B ? 1 : 0}|${v}`, () => {
    const c = document.createElement('canvas'); c.width = c.height = TILE; const x = c.getContext('2d'), rnd = seeded(v * 17 + (L ? 1 : 0) + (Rt ? 2 : 0) + (T ? 4 : 0) + (B ? 8 : 0));
    x.fillStyle = '#4a3122'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#5a3d2a'; for (let i = 0; i < 6; i++) x.fillRect(rnd() * 16 | 0, rnd() * 16 | 0, 3, 1); // la mesa
    // cuánto papel queda en cada columna/fila: un filo irregular a unos 6 px del borde exterior
    const edge = i => 6 + Math.round(Math.sin(i * 1.7 + v * 2) * 1.5 + (rnd() - .5) * 1.4);
    for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) {
      const inside = (!L || xx >= edge(yy)) && (!Rt || xx < 16 - edge(yy)) && (!T || yy >= edge(xx)) && (!B || yy < 16 - edge(xx)); if (!inside) continue;
      const near = (L && xx === edge(yy)) || (Rt && xx === 15 - edge(yy)) || (T && yy === edge(xx)) || (B && yy === 15 - edge(xx));
      x.fillStyle = near ? '#fff6e2' : '#e6dcc5'; x.fillRect(xx, yy, 1, 1);
    }
    // sombra del papel sobre la mesa, del lado de fuera
    x.fillStyle = 'rgba(20,10,4,.35)'; if (L) for (let yy = 0; yy < 16; yy++) x.fillRect(edge(yy) - 2, yy, 2, 1); if (T) for (let xx = 0; xx < 16; xx++) x.fillRect(xx, edge(xx) - 2, 1, 2);
    return c;
  });
}
function pageEdgeAt(tx, ty) { return Game.page !== 1 && (tx === 0 || ty === 0 || tx === MAP.w - 1 || ty === MAP.h - 1); }
// ---- Detalles de región sobre el suelo: la Tinta ha manchado el Tiznal y el Atelier está sobre una hoja pautada.
function drawRegionDetails(cx, cy) {
  if (Game.page >= 1) { if (Game.page === 2 && typeof drawDirtyWater === 'function') drawDirtyWater(cx, cy); return; }
  const x0 = cx / TILE | 0, y0 = cy / TILE | 0, ink = MAP.pz ? fieldGroups().inkSet : new Set();
  for (let ty = y0; ty <= y0 + 12; ty++) for (let tx = x0; tx <= x0 + 20; tx++) {
    if (pageEdgeAt(tx, ty) || tx < 0 || ty < 0 || tx >= MAP.w || ty >= MAP.h) continue;
    const r = worldRegion(tx, ty), x = tx * TILE - cx, y = ty * TILE - cy, h = hash2(tx * 3, ty * 5), ch = tileAt(tx, ty);
    if (r.name.startsWith('Atelier') && tx >= 30 && !ink.has(tx + ',' + ty) && ch !== 'T') { // hoja pautada: renglones azules y margen rojo
      g.fillStyle = '#f1eadb'; g.fillRect(x, y, 16, 16); g.fillStyle = '#c3d3e4'; g.fillRect(x, y + 5, 16, 1); g.fillRect(x, y + 13, 16, 1);
      if (tx === 30) { g.fillStyle = '#e3a0a0'; g.fillRect(x + 11, y, 1, 16); }
    }
    if (r.drained && ch !== 'T' && !ink.has(tx + ',' + ty)) { // vetas de tinta que la Jefa ha dejado al beberse el color
      if ((h & 7) < 3) { const a = (h >> 3) % 6, len = 5 + (h >> 6) % 7; g.fillStyle = '#2a2438'; for (let i = 0; i < len; i++) g.fillRect(x + 2 + Math.round(i * Math.cos(a)) + (i % 3 === 0 ? 1 : 0), y + 8 + Math.round(i * Math.sin(a) * .6), 1, 1); }
      if ((h & 15) === 5) { g.fillStyle = '#1e1a2c'; g.beginPath(); g.ellipse(x + 8, y + 10, 3, 2, 0, 0, 6.29); g.fill(); g.fillStyle = '#4a4664'; g.fillRect(x + 7, y + 9, 1, 1); }
    }
  }
}
// =====================================================================
// Objetos del mapa redibujados uno a uno. Se pintan sólo con rellenos (tres o cuatro tonos, luz desde arriba a la izquierda y
// en tres cuartos) y después una pasada común les pone contorno de tinta y un filo de luz: así todos comparten acabado.
// =====================================================================
function worldFinish(c, ink = '#3a2c3e', rim = 'rgba(255,248,226,.55)') {
  const x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), a = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && d.data[(Y * w + X) * 4 + 3] > 40, out = [], edge = [];
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) { if (!a(X, Y)) { if (a(X - 1, Y) || a(X + 1, Y) || a(X, Y - 1) || a(X, Y + 1)) out.push([X, Y]); } else if (!a(X - 1, Y) || !a(X, Y - 1)) edge.push([X, Y]); }
  x.fillStyle = rim; for (const [X, Y] of edge) x.fillRect(X, Y, 1, 1);
  x.fillStyle = ink; for (const [X, Y] of out) x.fillRect(X, Y, 1, 1);
  return c;
}
const WORLD_HD = {
  // Refugio: un tarro de pigmento hecho casa. Cristal con hombros, pigmento dentro con su menisco, etiqueta de papel como
  // fachada con puerta en arco y ventana redonda iluminada, jardinera, tapa de rosca como tejado y chimenea de latón.
  house(T) { const { x, r, rect, oval, poly, paper, wood, woodHi, woodDk } = T;
    
    rect('#9fb4b8', 6, 17, 32, 29); oval('#9fb4b8', 22, 46, 16, 3); oval('#9fb4b8', 22, 17, 16, 4); // cristal
    rect(r.sh, 7, 24, 30, 21); oval(r.sh, 22, 45, 15, 3); rect(r.base, 7, 24, 26, 19); oval(r.hi, 22, 24, 15, 2); rect(r.dk, 33, 25, 4, 19); // pigmento
    rect('#d8e8e4', 8, 18, 2, 24); rect('#eef6f2', 8, 19, 1, 10); rect('#7d9498', 36, 18, 1, 26); // brillos del vidrio
    poly('#f4ead0', [[12,25],[31,24],[31,41],[12,42]]); rect('#fff8e6', 12, 25, 19, 1); rect('#d8c8a0', 12, 40, 19, 2); // etiqueta
    rect('#6b4424', 18, 31, 7, 11); oval('#6b4424', 21, 31, 3, 3); rect('#8a5a34', 19, 31, 5, 10); oval('#8a5a34', 21, 31, 2, 2); rect('#e8c070', 23, 36, 1, 1); // puerta en arco
    for (const wx of [13, 26]) { rect('#6b4424', wx, 27, 5, 5); rect('#ffd878', wx + 1, 28, 3, 3); rect('#fff3c0', wx + 1, 28, 1, 1); rect('#6b4424', wx + 2, 28, 1, 3); rect('#6b4424', wx + 1, 29, 3, 1); } // ventanas con luz
    rect('#8a5a34', 25, 34, 6, 2); for (let i = 0; i < 3; i++) { rect(i % 2 ? '#e8707a' : '#f2c94a', 26 + i * 2, 32, 1, 2); } // jardinera
    rect(woodDk, 17, 42, 9, 2); rect(woodHi, 17, 42, 9, 1); // escalón
    rect(wood, 7, 7, 30, 9); oval(woodHi, 22, 7, 15, 3); oval(wood, 22, 15, 15, 2); for (let a = 9; a < 36; a += 3) rect(woodDk, a, 9, 1, 6); rect('#f4d8a0', 10, 6, 12, 1); // tapa de rosca
    rect('#8a8a96', 29, 0, 4, 7); rect('#c9c4d4', 29, 0, 1, 7); rect('#6a6a78', 28, 0, 6, 2); // chimenea
    rect(paper, 30, 20, 2, 1); rect(paper, 31, 19, 1, 3); },
  // Paleta de pintor en tres cuartos: se ve el canto de madera, el agujero del pulgar y seis charcos de color con brillo;
  // un pincel descansa encima.
  palette(T) { const { r, oval, rect, poly, wood, woodHi, woodDk, pal } = T;
    oval(woodDk, 22, 17, 21, 10); oval(wood, 22, 14, 21, 10); oval(woodHi, 21, 12, 18, 7);
    for (let i = 0; i < 5; i++) rect('#caa06a', 8 + i * 6, 11 + (i % 2), 4, 1); // veta
    oval(woodDk, 33, 16, 4, 3); oval('#5a3a26', 33, 16, 3, 2); // agujero del pulgar (hundido)
    [[8,12],[14,7],[23,6],[31,9],[24,19],[13,18]].forEach(([a,b], i) => { const p = ramp(worldPigment(WORLD_COLORS[i], pal)); oval(p.sh, a, b + 1, 4, 2); oval(p.base, a, b, 3, 2); rect(p.hi, a - 2, b - 1, 2); rect('#fff8e6', a - 2, b - 1); });
    poly('#2a2438', [[16,15],[34,22],[33,23],[15,16]]); poly('#e0a060', [[16,15],[29,20],[29,21],[16,16]]); rect('#c9c4d4', 29, 20, 3, 2); oval(r.base, 34, 23, 2, 1); }, // pincel apoyado
  // Tarro de agua con pigmento disuelto y un pincel dentro que se dobla en la superficie.
  jar(T) { const { r, oval, rect, poly, woodHi } = T;
    rect('#a8bec2', 2, 9, 19, 17); oval('#a8bec2', 11, 26, 9, 2); oval('#8aa2a8', 11, 9, 9, 3);
    rect(r.sh, 3, 15, 17, 11); oval(r.sh, 11, 26, 8, 2); rect(r.base, 3, 15, 13, 9); oval(r.hi, 11, 15, 8, 2); rect(r.dk, 17, 16, 3, 10); // agua teñida
    rect('#eef6f2', 4, 10, 1, 13); rect('#d8e8e4', 5, 10, 1, 5); oval('#c9dcdc', 11, 8, 8, 2); oval('#e8f0ec', 11, 7, 7, 1); // vidrio y borde
    poly('#2a2438', [[13,0],[15,0],[15,15],[13,15]]); rect('#e0a060', 13, 0, 2, 8); rect('#c9c4d4', 13, 8, 2, 3); rect('#2a2438', 13, 11, 2, 4); rect(r.dk, 12, 15, 2, 6); // pincel (doblado bajo el agua)
    rect('#fff8e6', 7, 12, 1, 1); },
  // Cristales de pigmento: tres prismas con caras de tres tonos y un destello.
  crystal(T) { const { r, oval, poly, rect } = T;
    oval(r.dk, 14, 29, 11, 3);
    const prism = (a, b, cw, ch) => { poly(r.sh, [[a,b],[a + cw / 2,b - ch],[a + cw,b],[a + cw - 1,b + 7],[a + 1,b + 7]]); poly(r.hi, [[a,b],[a + cw / 2,b - ch],[a + cw / 2,b + 6],[a + 1,b + 7]]); poly(r.base, [[a + cw / 2,b - ch],[a + cw,b],[a + cw - 1,b + 7],[a + cw / 2,b + 6]]); rect('#fff8e6', a + cw / 2 - 2, b - ch + 5, 1, Math.max(2, ch / 3 | 0)); };
    prism(1, 24, 9, 11); prism(18, 25, 9, 13); prism(8, 22, 12, 20); rect('#fff8e6', 22, 6, 1, 3); rect('#fff8e6', 21, 7, 3, 1); },
  // Caballete: trípode de madera, lienzo con la receta (A + B = C) pintada en manchas y una repisa con dos tubos.
  easel(T) { const { r, oval, rect, poly, o, pal, wood, woodHi, woodDk } = T;
    rect(woodDk, 16, 1, 3, 40); rect(woodHi, 16, 2, 1, 38);
    poly(wood, [[8,16],[11,16],[5,41],[3,41]]); poly(wood, [[23,16],[26,16],[31,41],[29,41]]); rect(woodHi, 9, 17, 1, 8); rect(woodHi, 24, 17, 1, 8);
    rect('#e8dcc0', 4, 6, 27, 25); rect('#fbf5e6', 5, 7, 25, 22); rect('#d8c8a0', 5, 27, 25, 2); // lienzo
    const mix = o.mix || ['rojo', 'azul'], A = ramp(worldPigment(mix[0], pal)), B = ramp(worldPigment(mix[1], pal));
    oval(A.base, 10, 13, 4, 3); rect(A.hi, 8, 11, 3); oval(B.base, 24, 13, 4, 3); rect(B.hi, 22, 11, 3); rect('#6b5a4a', 16, 13, 3, 1); rect('#6b5a4a', 17, 12, 1, 3); // A + B
    rect('#6b5a4a', 15, 18, 5, 1); rect('#6b5a4a', 15, 20, 5, 1); oval(r.sh, 17, 25, 6, 3); oval(r.base, 17, 24, 6, 2); rect(r.hi, 14, 23, 4); rect('#fff8e6', 14, 23); // = C
    rect(woodDk, 1, 31, 32, 3); rect(woodHi, 2, 31, 30, 1); rect(A.base, 5, 29, 5, 2); rect(B.base, 25, 29, 5, 2); rect('#c9c4d4', 10, 29, 2, 2); rect('#c9c4d4', 30, 29, 1, 2); }, // repisa con tubos
  // Caja de acuarelas abierta en tres cuartos: tapa levantada con pocillos de mezcla manchados, seis pastillas de color con
  // el brillo del agua y un pincel en su canal.
  box(T) { const { rect, poly, oval, pal } = T;
    
    poly('#8a8696', [[4,1],[44,1],[44,15],[4,15]]); rect('#fbf5e6', 6, 3, 36, 10); rect('#b8b4c0', 4, 1, 40, 1); // tapa
    for (let i = 0; i < 3; i++) { const p = ramp(worldPigment(WORLD_COLORS[i * 2], pal)); oval('#e8e0cc', 12 + i * 12, 8, 4, 3); oval(worldMix(p.base, '#fbf5e6', .55), 12 + i * 12, 8, 3, 2); } // pocillos de mezcla
    poly('#6a6676', [[2,16],[46,16],[46,30],[2,30]]); rect('#dcd8d4', 3, 17, 42, 11); rect('#f0ece8', 3, 17, 42, 1); rect('#a8a4a8', 3, 27, 42, 1);
    for (let i = 0; i < 6; i++) { const p = ramp(worldPigment(WORLD_COLORS[i], pal)); rect('#8a8696', 4 + i * 7, 19, 6, 7); rect(p.sh, 5 + i * 7, 20, 4, 5); rect(p.base, 5 + i * 7, 20, 4, 3); rect(p.hi, 5 + i * 7, 20, 2, 1); rect('#fff8e6', 7 + i * 7, 21); }
    rect('#2a2438', 8, 28, 30, 1); rect('#e0a060', 8, 28, 14, 1); rect('#c9c4d4', 22, 28, 3, 1); }, // pincel en su canal
  // Molinillo de papel: seis aspas de papel de color con pliegue, clavadas en un lápiz; gira.
  mill(T) { const { rect, poly, oval, pal, frame, woodDk } = T;
    rect('#e89aa8', 19, 46, 5, 4); rect('#8c8ab0', 19, 44, 5, 2); rect('#f2c93a', 19, 18, 5, 26); rect('#fbe28a', 19, 18, 2, 26); rect('#c9a02a', 23, 18, 1, 26); // palo-lápiz
    for (let i = 0; i < 6; i++) { const a = (i / 6 + frame / 48) * Math.PI * 2, col = ramp(worldPigment(WORLD_COLORS[i], pal)), P = (ang, d) => [Math.round(21 + Math.cos(ang) * d), Math.round(18 + Math.sin(ang) * d)];
      poly(col.base, [P(a, 2), P(a + .12, 18), P(a + .75, 14)]); poly(col.sh, [P(a, 2), P(a + .45, 16), P(a + .75, 14)]); const [hx, hy] = P(a + .25, 10); rect(col.hi, hx, hy, 2, 1); }
    oval(woodDk, 21, 18, 3, 3); oval('#e8c070', 21, 18, 2, 2); rect('#fff8e6', 20, 17); },
  // Abanico de muestras de color con remache de latón.
  fan(T) { const { x, rect, oval, pal, o } = T;
    for (let i = 0; i < 5; i++) { const col = ramp(worldPigment(WORLD_COLORS[(i + WORLD_COLORS.indexOf(o.color) + 6) % 6], pal)); x.save(); x.translate(15, 21); x.rotate((i - 2) * .32);
      x.fillStyle = '#fbf5e6'; x.fillRect(-3, -19, 7, 19); x.fillStyle = col.base; x.fillRect(-2, -18, 5, 7); x.fillStyle = col.hi; x.fillRect(-2, -18, 5, 1); x.fillStyle = col.sh; x.fillRect(-2, -11, 5, 3); x.fillStyle = '#c9bfa8'; x.fillRect(-2, -6, 4, 1); x.fillRect(-2, -4, 3, 1); x.restore(); }
    oval('#8a5a34', 15, 20, 2, 2); oval('#e8c070', 15, 20, 1, 1); },
  // Nenúfar: hoja con su muesca y nervios, flor de pétalos de pintura con centro de polen.
  lotus(T) { const { r, oval, rect, poly, frame, pal } = T;
    const leaf = pal === 'vivo' ? '#4f8a64' : '#7d9681', leafHi = pal === 'vivo' ? '#78b088' : '#a0b4a0'; oval('#3c6e79', 14, 17, 12, 2); oval(leaf, 14, 15, 12, 3); oval(leafHi, 12, 14, 9, 2); 
    rect(leaf, 18, 13, 5, 1); rect('#5a7a5a', 8, 15, 5, 1); rect('#5a7a5a', 16, 16, 4, 1); const lift = frame === 1 ? 1 : 0;
    [[-5,1],[-3,-3],[3,-3],[5,1],[0,-1]].forEach(([a,b]) => { oval(r.sh, 14 + a, 11 + b - lift, 3, 3); oval(r.base, 14 + a, 10 + b - lift, 3, 2); rect(r.hi, 13 + a, 9 + b - lift, 2, 1); });
    oval('#e8b830', 14, 10 - lift, 2, 1); rect('#fff3c0', 13, 9 - lift, 2, 1); },
};
