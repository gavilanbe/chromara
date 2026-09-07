// CHROMARA — paisaje de pigmentos. Arte en píxeles, sin imágenes ni red.
'use strict';
const WORLD_COLORS = ['rojo', 'naranja', 'amarillo', 'verde', 'azul', 'violeta'];
const WORLD_REGIONS = [
  { name: 'Jardín de pigmentos', x: 5, y: 21, rx: 13, ry: 12, color: 'amarillo', paper: '#ead8ac' },
  { name: 'Prado Carmín', x: 4, y: 6, rx: 9, ry: 9, color: 'rojo', paper: '#e5b9b5' },
  { name: 'Bosque de Brotes', x: 16, y: 3, rx: 10, ry: 9, color: 'verde', paper: '#bed6b2' },
  { name: 'Laguna de Añil', x: 20, y: 15, rx: 10, ry: 12, color: 'azul', paper: '#bfd8d8' },
  { name: 'Colinas Violeta', x: 33, y: 11, rx: 9, ry: 6, color: 'violeta', paper: '#d5c2e1' },
  { name: 'Margen de la Tinta', x: 34, y: 3, rx: 8, ry: 7, color: 'violeta', paper: '#c3b8cf' },
  { name: 'Atelier de las tres tintas', x: 33, y: 21, rx: 6, ry: 6, color: 'naranja', paper: '#e9d9bd' },
];
// Coordinates are the centre of each object's feet; collision uses only its base.
const WORLD_OBJECTS = [
  { kind: 'house', x: 3.1, y: 20.8, color: 'rojo', title: 'Refugio Carmín', lines: ['Un viejo frasco de pigmento.', 'Aquí empezó la primera pincelada.', 'El color aún vive en el cristal.'] },
  { kind: 'palette', x: 3.3, y: 24.7, color: 'amarillo', title: 'La paleta del jardín', lines: ['Rojo, amarillo y azul:', 'tres gotas, todos los colores.', 'Busca los caballetes de mezclas.'] },
  { kind: 'tube', x: 2.1, y: 23.3, color: 'rojo' },
  { kind: 'tube', x: 5, y: 26.5, color: 'amarillo' },
  { kind: 'mill', x: 12.9, y: 21.7, color: 'amarillo', title: 'Molino cromático', lines: ['Seis pétalos recogen la luz.', 'Cada vuelta deja caer', 'un poquito de color.'] },
  { kind: 'box', x: 13.4, y: 25.4, color: 'azul', title: 'Acuarelas de viaje', lines: ['Pigmento seco en seis pocillos.', 'Una gota de agua basta', 'para despertar la pintura.'] },
  { kind: 'easel', x: 11.9, y: 18.5, color: 'naranja', mix: ['rojo', 'amarillo'], title: 'Estudio naranja', lines: ['Rojo + amarillo = naranja.', 'Como Llamarada: una mezcla cálida', 'que alcanza a varios enemigos.'] },
  { kind: 'tube', x: 16.3, y: 23.7, color: 'azul' },
  { kind: 'jar', x: 10.8, y: 23.2, color: 'amarillo' },
  { kind: 'crystal', x: 15.3, y: 19.3, color: 'naranja' },
  { kind: 'house', x: 3.1, y: 4.6, color: 'rojo', title: 'El herbario Carmín', lines: ['Aquí las flores beben pigmento.', 'Sus pétalos guardan el rojo', 'que la tinta no logró llevarse.'] },
  { kind: 'jar', x: 7.6, y: 5.2, color: 'rojo' },
  { kind: 'tube', x: 3.2, y: 7.8, color: 'rojo' },
  { kind: 'palette', x: 7.9, y: 3.5, color: 'naranja' },
  { kind: 'crystal', x: 2.1, y: 12.6, color: 'rojo' },
  { kind: 'easel', x: 7.9, y: 14, color: 'verde', mix: ['amarillo', 'azul'], title: 'Estudio verde', lines: ['Amarillo + azul = verde.', 'Como Brote: el color de la vida.', 'La mezcla también cura al grupo.'] },
  { kind: 'tube', x: 2.1, y: 15.8, color: 'amarillo' },
  { kind: 'mill', x: 13.7, y: 2.8, color: 'verde' },
  { kind: 'box', x: 20.8, y: 2.8, color: 'verde' },
  { kind: 'jar', x: 15.6, y: 6.9, color: 'verde' },
  { kind: 'crystal', x: 13.5, y: 9.2, color: 'verde' },
  { kind: 'tube', x: 14, y: 12.5, color: 'azul' },
  { kind: 'jar', x: 23.1, y: 12.3, color: 'azul' },
  { kind: 'house', x: 27.5, y: 12.5, color: 'azul', title: 'Observatorio de acuarela', lines: ['El agua lleva el azul de Añil.', 'Mira los barcos de papel:', 'navegan sobre una pincelada.'] },
  { kind: 'easel', x: 31.8, y: 13.2, color: 'violeta', mix: ['rojo', 'azul'], title: 'Estudio violeta', lines: ['Rojo + azul = violeta.', 'Como Eclipse: luz y sombra', 'se encuentran en un solo color.'] },
  { kind: 'crystal', x: 36.8, y: 12.7, color: 'violeta' },
  { kind: 'crystal', x: 33.6, y: 8.6, color: 'violeta' },
  { kind: 'tube', x: 37.5, y: 8.9, color: 'violeta' },
  { kind: 'jar', x: 29, y: 5.7, color: 'violeta', drained: true },
  { kind: 'crystal', x: 36.6, y: 4.7, color: 'violeta', drained: true },
  { kind: 'tube', x: 31.8, y: 2.4, color: 'azul', drained: true },
  { kind: 'box', x: 33.5, y: 26.5, color: 'naranja' },
  { kind: 'jar', x: 37, y: 26.2, color: 'violeta' },
  { kind: 'tube', x: 37.5, y: 16.1, color: 'naranja' },
  { kind: 'boat', x: 5.7, y: 10.8, color: 'rojo' },
  { kind: 'boat', x: 19.8, y: 8.2, color: 'azul' },
  { kind: 'boat', x: 19.2, y: 18.6, color: 'amarillo' },
  { kind: 'boat', x: 25.8, y: 26.8, color: 'violeta' },
  { kind: 'fan', x: 11.8, y: 16.8, color: 'amarillo' },
  { kind: 'fan', x: 6.6, y: 6.7, color: 'rojo' },
  { kind: 'fan', x: 34.5, y: 10.6, color: 'violeta' },
  { kind: 'lotus', x: 6.4, y: 11.2, color: 'rojo' },
  { kind: 'lotus', x: 17.9, y: 13.6, color: 'azul' },
  { kind: 'lotus', x: 22.6, y: 22.3, color: 'violeta' },
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
    const paper = Game.page === 1 && pal === 'gris' ? worldMix('#81778f', tint, .24) : worldMix(pal === 'vivo' ? '#f4e7c9' : '#d0c5ac', tint, pal === 'vivo' ? .66 : .40);
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
    } else if (o.kind === 'palette') {
      oval(ink, 22, 17, 22, 11); oval(woodDk, 22, 18, 21, 9); oval(wood, 22, 14, 21, 11); oval(woodHi, 21, 12, 19, 8);
      rect(wood, 5, 13, 27); rect(wood, 9, 19, 19); oval(ink, 32, 17, 4, 3); oval('#c4b499', 32, 16, 3, 2);
      [[8,11],[14,6],[25,5],[36,9],[23,20],[12,19]].forEach(([a,b], i) => {
        const p = ramp(worldPigment(WORLD_COLORS[i], pal)); oval(p.dk,a,b+1,4,3); oval(p.base,a,b,4,2); rect(p.hi,a-2,b-1,3); rect(paper,a-2,b-1);
      });
      rect(woodDk, 16, 12, 9); rect(wood, 20, 14, 6);
    } else if (o.kind === 'tube') {
      oval(r.sh, 8, 17, 7, 2); oval(r.base, 7, 16, 5, 2); rect(r.hi, 4, 15, 3);
      poly(ink, [[7,13],[14,3],[27,8],[22,18],[12,16]]);
      poly('#d9d5cb', [[9,12],[15,5],[25,9],[21,16],[12,14]]);
      poly(paper, [[10,11],[15,5],[24,9],[19,11]]);
      poly(r.sh, [[14,9],[18,5],[24,8],[21,13]]); poly(r.base, [[14,9],[17,6],[23,9],[20,12]]);
      rect(ink, 23, 6, 5, 2); rect('#a09aa1', 24, 5, 5); rect('#67616d', 7, 11, 4, 4); rect('#e5dfd2', 7, 11, 3); rect(r.base, 6, 14, 2, 2);
      rect('#9b9294', 15, 12, 3); rect(paper, 18, 8, 2);
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
      const stem=pal==='vivo'?'#638250':'#85816a';
      const sway = frame === 1 ? 1 : frame === 3 ? -1 : 0, head=8+sway;
      rect(ink,8,10,2,13); rect(stem,8,10,1,12); rect(stem,4,16,4,2); rect(stem,10,13,4,2); rect('#b4bc7d',4,15,2);
      if(variant===1) { oval(r.dk,head,8,7,5); oval(r.base,head,6,7,4); rect(r.hi,head-4,3,4); rect(paper,head-3,4); rect(paper,head+2,6,2); }
      else { [[0,-4],[4,-1],[3,3],[-3,3],[-4,-1]].forEach(([dx,dy])=>{oval(r.sh,head+dx,8+dy,3,3);oval(r.base,head+dx,7+dy,2,2);}); oval(woodDk,head,7,2,2); rect('#ffe6a0',head-1,6,2,2); }
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
      for(let i=0;i<3;i++){
        const xx=5+i*6,top=i===1?0:6;rect(woodDk,xx,top+8,2,19-top);rect(woodHi,xx,top+9,1,16-top);
        poly(ink,[[xx-3,top+9],[xx,top],[xx+4,top+9],[xx+2,top+14],[xx-1,top+14]]);
        poly('#b8c7bc',[[xx-2,top+9],[xx,top+2],[xx+2,top+10],[xx,top+12]]);rect('#526f73',xx,top+5,1,6);rect(paper,xx-1,top+7,1,3);
      }
      poly(pal==='vivo'?'#7c9e67':'#969d77',[[10,27],[0,17],[3,16],[11,23],[20,17],[21,20],[13,27]]);rect('#c0c58e',3,18,2,1);
    } else if(o.kind==='boat') {
      poly('#726978',[[0,10],[23,10],[18,15],[7,15]]); poly(paper,[[2,10],[21,10],[17,13],[7,13]]);
      poly('#ede1c9',[[5,9],[13,0],[18,9]]); poly('#a7a4b8',[[13,0],[13,9],[18,9]]); rect(r.base,7,12,11); rect('#fff9e9',8,8,4);
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
  const nearby=worldNearby();if(!nearby||fieldNearby().length||OW.jar?.toast>0)return;
  const label=battleKey('ok')+' / '+nearby.title,w=Math.min(308,textWidth(label)+16),x=Math.round((W-w)/2);
  const nearAt=artObserve('landmark',nearby.title);
  g.save();g.translate(0,Math.round((1-artIn(nearAt,14))*26));
  artTag(label,x,160-Math.round(artPop(nearAt)*3),col);
  g.restore();
  uiHit(x,155,w,24,()=>{OW.msg={lines:[nearby.title,...nearby.lines],t:0};Audio.sfx('page');});
}
function drawWorldAtmosphere(cx,cy,pal) {
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
