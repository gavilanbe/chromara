// Magias de campo: una misma regla de pigmentos, desde la puerta hasta el circuito.
'use strict';
const FIELD = [
  { id: 'rojo', name: 'Rojo', owner: 'carmin', tool: 'brocha', detail: 'Carmín / brocha' },
  { id: 'amarillo', name: 'Amarillo', owner: 'ambar', tool: 'lapiz', detail: 'Ámbar / lápiz' },
  { id: 'azul', name: 'Azul', owner: 'anil', tool: 'pincel', detail: 'Añil / pincel' },
  { id: 'agua', name: 'Aclarar', owner: 'anil', tool: 'pincel', detail: 'Añil / agua' },
];
const FIELD_MIXES = [
  { pair: ['rojo', 'amarillo'], color: 'naranja', effect: 'Calor' },
  { pair: ['amarillo', 'azul'], color: 'verde', effect: 'Brote' },
  { pair: ['rojo', 'azul'], color: 'violeta', effect: 'Revelar' },
];
function fieldPuzzleState() {
  return { bowls: { wax: [], seed: [], lens: [] }, nodes: { a: null, b: null, c: null },
    painted: 0, sun: 0, sunBend: 0, revealed: false, opened: false, opening: false };
}
function fieldMix(colors) {
  const unique = [...new Set(colors.filter(Boolean))];
  if (!unique.length) return null;
  if (unique.length === 1) return unique[0];
  return FIELD_MIXES.find(m => unique.length === 2 && m.pair.every(c => unique.includes(c)))?.color || 'barro';
}
function fieldColor(color) { return color === 'agua' ? '#99dce4' : color === 'barro' ? '#78644d' : color ? C(color) : '#b6ac99'; }
function fieldOwner(f) { return Party.find(p => p.id === f.owner); }
function fieldOk(f) { return fieldOwner(f)?.cur.hp > 0; }
function fieldTargets() {
  return Game.page === 1 ? [] : DATA.puzzle.targets;
}
function fieldContents(target) {
  const z = Game.puzzle;
  return target.kind === 'node' ? [z.nodes[target.id]].filter(Boolean) : z.bowls[target.id] || [];
}
function fieldSolved(target) {
  const z = Game.puzzle;
  return target.id === 'wax' ? z.painted === 1 : target.id === 'seed' ? z.sunBend === 1 : target.id === 'lens' ? z.revealed : target.kind === 'press' ? z.opened : false;
}
function fieldEdges(nodes = Game.puzzle.nodes) {
  return DATA.puzzle.edges.map(e => ({ ...e, actual: nodes[e.from] && nodes[e.to] ? fieldMix([nodes[e.from], nodes[e.to]]) : null }));
}
function fieldCircuitReady() { return Game.puzzle.revealed && fieldEdges().every(e => e.actual === e.color); }
function fieldPuzzleSolid(tx, ty) {
  const p = MAP.pz, z = Game.puzzle; if (!p || !z) return false;
  if (p.torn.some(([x, y]) => x === tx && y === ty)) return z.painted < 1;
  if (p.river.some(([x, y]) => x === tx && y === ty)) return !(z.sunBend === 1 && ty === p.seed[1]);
  return fieldTargets().some(t => t.kind !== 'wax' && t.kind !== 'seed' && (t.x / TILE | 0) === tx && (t.y / TILE | 0) === ty);
}
// A short unobstructed ray to one of the object's usable sides. This prevents
// casting through walls or across the ink, without requiring pixel-perfect facing.
function fieldReachable(target) {
  if (!target || Math.hypot(OW.x - target.x, OW.y - target.y) > 48) return false;
  return [[0, 13], [-13, 3], [13, 3], [0, -12]].some(([dx, dy]) => {
    const x = target.x + dx, y = target.y + dy;
    if (!walkable(x, y)) return false;
    const steps = Math.ceil(Math.hypot(x - OW.x, y - OW.y) / 3);
    for (let i = 1; i <= steps; i++) if (!walkable(lerp(OW.x, x, i / steps), lerp(OW.y, y, i / steps))) return false;
    return true;
  });
}
function fieldNearby() {
  return fieldTargets().filter(fieldReachable).sort((a, b) => Math.hypot(a.x - OW.x, a.y - OW.y) - Math.hypot(b.x - OW.x, b.y - OW.y));
}
function fieldReason(f, target) {
  if (!target || !fieldReachable(target)) return 'Acércate a un pocillo del taller.';
  if (target.kind === 'press') return fieldCircuitReady() ? 'Cierra la paleta y abre con Z.' : 'El estuche espera los tres canales.';
  if (Game.puzzle.opened && target.kind === 'node') return 'El circuito ya entregó la Pluma.';
  if (fieldSolved(target)) return target.done;
  if (!fieldOk(f)) return fieldOwner(f).name + ' necesita descansar en el vaso.';
  const contents = fieldContents(target);
  if (f.id === 'agua') return contents.length ? null : 'El pocillo ya está limpio.';
  if (contents.includes(f.id)) return 'Ese pigmento ya está en el pocillo.';
  if (target.kind !== 'node' && contents.length >= 3) return 'Aclara el barro antes de mezclar.';
  return null;
}
function fieldPreview(f, target) {
  if (!target || target.kind === 'press') return 'Elige un pocillo cercano.';
  if (f.id === 'agua') return 'Agua > pocillo vacío';
  const before = fieldContents(target), after = target.kind === 'node' ? [f.id] : [...before, f.id];
  const mixed = fieldMix(after);
  if (target.kind === 'node') return before.length ? f.name + ' sustituye ' + before[0] : f.name + ' > dos canales';
  return before.length ? fieldMix(before) + ' + ' + f.name + ' = ' + mixed : f.name + ' > primer pigmento';
}
function fieldDescription(target) {
  if (!target) return 'Busca los pocillos de cerámica.';
  if (fieldSolved(target)) return target.done;
  if (target.kind === 'press') return fieldCircuitReady() ? 'Tres mezclas correctas. Sello abierto.' : Game.puzzle.revealed ? 'Haz coincidir los tres canales.' : 'El plano está escrito con tinta oculta.';
  if (target.kind === 'node') return Game.puzzle.revealed ? 'Iguala cada mezcla a su etiqueta.' : 'La lente revela las etiquetas.';
  const colors = fieldContents(target), mixed = fieldMix(colors);
  if (!colors.length) return target.clue;
  if (colors.length === 1) return 'Añade otro pigmento para mezclar.';
  return mixed === 'barro' ? 'Hay barro. Usa Aclarar.' : 'Sin efecto. Aclara y prueba.';
}
function fieldNotice(text) { OW.fieldToast = { text, t: 180 }; }
function fieldInteract() {
  const target = fieldNearby()[0]; if (!target) return false;
  if (target.kind === 'press') {
    if (Game.puzzle.opened) fieldNotice('La Pluma está en tu equipo.');
    else if (fieldCircuitReady()) OW.act = openEstucheGen();
    else openRing(target.id);
  } else openRing(target.id);
  return true;
}
function openRing(targetId) {
  ARTUI.tracks.delete('field');
  const targets = fieldNearby();
  OW.ring = { idx: OW.fieldSelection || 0, targetId: targets.some(t => t.id === targetId) ? targetId : targets.find(t => !fieldSolved(t))?.id || targets[0]?.id, t: 0, notice: null };
  OW.moving = false; OW.vx = OW.vy = 0;
  const target = fieldTargets().find(t => t.id === OW.ring.targetId);
  // Reframe the workbench beside the palette; no zoom, nudge or camera shake.
  if (target) {
    OW.cam.x = target.id === 'wax' || target.id === 'seed' ? clamp(target.x - 242, 0, MAP.w * TILE - W) : 320;
    OW.cam.y = target.id === 'wax' || target.id === 'seed' ? target.y - 90 : 216;
  }
  Audio.sfx('book_open', { vol: .5 });
}
function fieldSelectTarget(delta) {
  const targets = fieldNearby(), r = OW.ring; if (!r || !targets.length) return;
  const index = targets.findIndex(t => t.id === r.targetId);
  r.targetId = targets[(index + delta + targets.length) % targets.length].id; r.notice = null;
  Audio.sfx('cursor');
}
function fieldApply() {
  const r = OW.ring; if (!r || OW.act) return;
  const target = fieldTargets().find(t => t.id === r.targetId), f = FIELD[r.idx], reason = fieldReason(f, target);
  if (target?.kind === 'press' && fieldReachable(target) && fieldCircuitReady() && !Game.puzzle.opened) { OW.ring = null; OW.act = openEstucheGen(); return; }
  if (reason) { r.notice = reason; Audio.sfx('nope', { vol: .3 }); return; }
  OW.fieldSelection = r.idx; OW.ring = null; OW.act = fieldGen(f, target.id, true);
}
function updateRing() {
  const r = OW.ring; r.t++;
  if (hit('back') || hit('ring')) { OW.ring = null; Audio.sfx('cancel'); return; }
  if (hit('up')) { r.idx = (r.idx + FIELD.length - 1) % FIELD.length; r.notice = null; Audio.sfx('cursor'); }
  if (hit('down')) { r.idx = (r.idx + 1) % FIELD.length; r.notice = null; Audio.sfx('cursor'); }
  if (hit('left')) fieldSelectTarget(-1);
  if (hit('right')) fieldSelectTarget(1);
  if (hit('ok')) fieldApply();
}
function drawRing() {
  UI_HITS.length=0;UI_TEXT.length=0;
  const r=OW.ring,target=fieldTargets().find(t=>t.id===r.targetId),f=FIELD[r.idx],targets=fieldNearby();
  const col=fieldColor(f.id),at=artObserve('field',r.idx+':'+r.targetId+':'+r.notice),openedAt=artObserve('field-open',r),intro=artIn(openedAt,20);
  const canOpen=target?.kind==='press'&&fieldCircuitReady()&&!Game.puzzle.opened,reason=fieldReason(f,target),enabled=canOpen||!reason;
  g.save();g.translate(Math.round((1-intro)*-120),0);
  artTag('MAGIAS',5,8,col);maskingLabel(5,25,92,14);smallText('Sin coste MP',10,29,UI_MUTED);
  // Four paint wells on an actual wooden palette, leaving the workbench open.
  g.translate(50,88);g.rotate((1-intro)*-.4);g.translate(-50,-88);
  g.fillStyle='#553d2b';g.beginPath();g.ellipse(50,88,46,41,-.12,0,6.29);g.fill();
  g.fillStyle='#bf955e';g.beginPath();g.ellipse(49,86,46,40,-.12,0,6.29);g.fill();
  g.strokeStyle='#a37a4a';g.lineWidth=1;
  for(let i=0;i<4;i++){g.beginPath();g.ellipse(49,86,39-i*5,34-i*5,-.12,0,6.29);g.stroke();}
  g.fillStyle='#553d2b';g.beginPath();g.ellipse(50,88,5,8,-.3,0,6.29);g.fill();
  const sx=26+(r.idx%2)*44,sy=67+Math.floor(r.idx/2)*39;
  if(!r.cursor||!Prefs.shake)r.cursor={x:sx,y:sy};else{r.cursor.x+=(sx-r.cursor.x)*.4;r.cursor.y+=(sy-r.cursor.y)*.4;}
  const wells=[];
  FIELD.forEach((spell,i)=>{
    const x=26+(i%2)*44,y=67+Math.floor(i/2)*39,c=fieldColor(spell.id),sel=i===r.idx,grow=Math.min(1.1,artIn(openedAt,14,6+i*3)),ok=fieldOk(spell);
    if(sel){g.fillStyle='#553d2b';g.beginPath();g.ellipse(x,y+2,16,13,0,0,6.29);g.fill();g.fillStyle='#fff3d8';g.beginPath();g.ellipse(r.cursor.x,r.cursor.y,15+artPop(at)*2,12.5+artPop(at)*2,0,0,6.29);g.fill();}
    // The chosen well sits proud of the wood with a glint on the wet paint; the rest rest in shadow.
    if(sel)g.save(),g.translate(0,-2);
    paintDab(x,y,13*grow,ok?c:'#897d72',sel?artPop(at):0);
    if(grow>.5)g.drawImage(iconSprite(spell.id==='agua'?'item':spell.tool,c),x-8,y-8,16,16);
    if(sel&&Prefs.shake){const a=ARTUI.t*.08,gx=Math.round(x+Math.cos(a)*7),gy=Math.round(y-2+Math.sin(a)*3);g.fillStyle='#fff8e6';g.fillRect(gx,gy,2,1);}
    if(sel)g.restore();else{g.fillStyle='#553d2b';g.globalAlpha*=.16;g.beginPath();g.ellipse(x,y,13*grow,10*grow,-.12,0,6.29);g.fill();g.globalAlpha/=.16;}
    const focus=()=>{if(r.idx!==i){artFocus(r,i);OW.fieldSelection=i;}};
    uiHit(x-16,y-16,32,32,focus,focus);
    wells.push({spell,x,y,sel,grow});
  });
  // Names pencilled on the wood; the chosen one becomes a paper tag.
  for(const w of wells){const lw=textWidth(w.spell.name)+8,lx=Math.round(w.x-lw/2),ly=w.y+15;g.save();g.globalAlpha*=clamp(w.grow,0,1);
    if(w.sel){maskingLabel(lx,ly-1,lw,10,'#fff1ca');textCenter(w.spell.name,w.x,ly,UI_INK);g.fillStyle=col;g.fillRect(lx+3,ly+7,lw-6,1);}
    else{textCenter(w.spell.name,w.x+1,ly+1,'#e2c58f');UI_TEXT.pop();textCenter(w.spell.name,w.x,ly,'#4b3320');}
    g.restore();}
  g.restore();
  g.save();g.translate(Math.round((1-artIn(openedAt,16,8))*-120),0);
  maskingLabel(5,133,92,28);smallText(f.name,12,137);smallText(fieldOwner(f).name,12,149,UI_MUTED);
  // The owner's sticker keeps the spell tied to its painter.
  const owner=fieldOwner(f),os=effStats(owner);sticker(84,146,{id:owner.id,color:owner.color,alive:owner.cur.hp>0,hp:owner.cur.hp,maxhp:os.hp,mp:owner.cur.mp,maxmp:os.mp},8);
  artButton('field-close',battleKey('back')+' cerrar',5,165,92,13,'#d2bc95',()=>{OW.ring=null;Audio.sfx('cancel');});
  g.restore();
  g.save();g.translate(Math.round((1-artIn(openedAt,18,6))*230),0);
  const name=target?.name||'Sin objetivo';artTag(name,109,7,col,166);
  if(targets.length>1){
    artButton('target-prev','<',275,6,19,19,'#d2bc95',()=>fieldSelectTarget(-1));
    artButton('target-next','>',296,6,19,19,'#d2bc95',()=>fieldSelectTarget(1));
  }
  // Pigment samples show the recipe on the object, including the resulting mix.
  const contents=target?fieldContents(target):[],mixed=fieldMix(contents),preview=target?.kind==='node'?f.id:fieldMix([...contents,f.id]);
  const samples=target?.kind==='press'?fieldEdges().map(e=>e.actual):target?.kind==='node'||f.id==='agua'?[mixed]:[...contents.slice(0,3),f.id];
  if(target){
    maskingLabel(109,28,Math.min(199,45+samples.length*27),19);
    let dx=121;
    samples.forEach((c,i)=>{paintDab(dx,37,5,fieldColor(c));if(i<samples.length-1&&target.kind!=='press')smallText('+',dx+10,34,UI_MUTED);dx+=27;});
    if(target.kind!=='press'){smallText(target.kind==='node'||f.id==='agua'?'→':'=',dx-14,34);paintDab(dx+8,37,6+(Prefs.shake?Math.sin(ARTUI.t*.15)*.6:0),fieldColor(f.id==='agua'?null:preview),artPop(at));}
  }
  const label=target?.kind==='press'?'Circuito cromático':f.id==='agua'?'El agua limpia el pocillo':mixed?mixed+' → '+(preview||f.name):'Primer pigmento';
  artTag(target?label:'Acércate a un pocillo',109,50,col,204);
  g.restore();
  // A trail of pigment drops runs from the chosen well to the object it would touch.
  if(target&&Prefs.shake){
    const tx=target.x-OW.cam.x,ty=target.y-OW.cam.y;
    if(tx>112&&tx<310&&ty>26&&ty<150){
      const x0=sx+Math.round((1-intro)*-120),y0=sy,cx=(x0+tx)/2,cy=Math.min(y0,ty)-26,n=14;
      for(let i=0;i<n;i++){const k=((i+ARTUI.t*.03)%n)/n,q=1-k,px=q*q*x0+2*q*k*cx+k*k*tx,py=q*q*y0+2*q*k*cy+k*k*ty;
        if(px<100)continue;g.fillStyle=enabled?col:'#9a8f83';g.globalAlpha=.35+k*.55;g.fillRect(Math.round(px),Math.round(py),k>.5?2:1,k>.5?2:1);}
      g.globalAlpha=1;
      const pulse=(ARTUI.t%40)/40;g.strokeStyle=enabled?col:'#9a8f83';g.lineWidth=1;g.globalAlpha=(1-pulse)*.8;g.beginPath();g.ellipse(tx,ty+4,6+pulse*14,3+pulse*6,0,0,6.29);g.stroke();g.globalAlpha=1;
    }
  }
  const lift=enabled&&Prefs.shake?Math.round(Math.sin(ARTUI.t*.12)):0;
  g.save();g.translate(0,-lift);
  artButton('field-apply',battleKey('ok')+(canOpen?' abrir':' aplicar'),222,120,91,21,col,fieldApply,{disabled:!enabled,selected:enabled});
  g.restore();
  artButton('field-recipe','?',109,120,24,21,'#d2bc95',()=>{r.legend=!r.legend;Audio.sfx('page');});
  if(r.legend){
    artSheet(110,69,109,48,col);
    FIELD_MIXES.forEach((mix,i)=>{const y=74+i*13;paintDab(119,y+3,3,fieldColor(mix.pair[0]));smallText('+',125,y);paintDab(137,y+3,3,fieldColor(mix.pair[1]));smallText('=',143,y);paintDab(155,y+3,3,fieldColor(mix.color));smallText(mix.effect,163,y,UI_INK);});
  }
  g.save();g.translate(0,Math.round((1-artIn(openedAt,16,10))*50));
  maskingLabel(106,148,208,29);
  const note=r.notice||fieldDescription(target),noteAt=artObserve('field-note',note);
  paragraph(note,113,153,193,r.notice?'#9c4539':UI_INK,2,{progress:Prefs.shake?(ARTUI.t-noteAt)*2.2:Infinity,wet:r.notice?'#c4384a':col});
  g.restore();
  // Hit areas follow the visible objects instead of a hidden rectangular menu.
  for(const t of targets){const x=t.x-OW.cam.x,y=t.y-OW.cam.y;if(x<119||x>305||y<75||y>107)continue;
    uiHit(x-12,y-12,24,24,()=>{r.targetId=t.id;r.notice=null;Audio.sfx('cursor');});}
}
function fieldCasterPosition(owner) {
  const i = Party.indexOf(owner), h = OW.hist[Math.min(OW.hist.length - 1, i * 12)];
  return i === 0 ? [OW.x, OW.y] : h ? [...h] : [OW.x - i * 12, OW.y];
}
function* fieldGen(f, targetId, reopen = false) {
  const target = fieldTargets().find(t => t.id === targetId), reason = fieldReason(f, target);
  if (reason) { fieldNotice(reason); return; }
  const z = Game.puzzle, owner = fieldOwner(f), pos = fieldCasterPosition(owner);
  const before = [...fieldContents(target)], after = f.id === 'agua' ? [] : target.kind === 'node' ? [f.id] : [...before, f.id];
  const mixed = fieldMix(after), transform = target.kind !== 'node' && mixed === target.color;
  const state = { f, target, from: [pos[0], pos[1] - 9], before, after, mixed, t: 0, transform, committed: false };
  OW.moving = false; OW.vx = OW.vy = 0;
  OW.cast = { p: owner, x: pos[0], y: pos[1], col: fieldColor(f.id), aura: 1 };
  OW.fieldCast = state;
  Audio.sfx(f.id === 'agua' ? 'glass' : 'charge', { semi: SEMI[owner.id] || 0, vol: .45 });
  try {
    for (let t = 0; t < (transform ? 110 : target.kind === 'node' ? 94 : 75); t++) {
      state.t = t; OW.cast.aura = Math.max(0, 1 - t / 64);
      if (t === 16) Audio.sfx(f.id === 'rojo' ? 'brush_sweep' : f.id === 'amarillo' ? 'scratch' : 'brush_hiss', { vol: .6 });
      if (t === 42) {
        // Commit when the pigment arrives, after checking that the target and
        // party are still valid. No MP is consumed by exploration.
        if (Game.puzzle !== z || fieldReason(f, target)) return;
        if (target.kind === 'node') z.nodes[target.id] = after[0] || null;
        else z.bowls[target.id] = after;
        state.committed = true;
        Audio.sfx(f.id === 'agua' ? 'splash_clean' : 'plop', { semi: SEMI[owner.id] || 0, vol: .6 });
      }
      if (t >= 48 && transform) {
        const k = clamp((t - 48) / 52, 0, 1);
        if (target.id === 'wax') z.painted = k;
        if (target.id === 'seed') { z.sun = clamp(k * 2, 0, 1); z.sunBend = clamp((k - .2) / .8, 0, 1); }
        if (t === 50) Audio.sfx(target.id === 'seed' ? 'grow' : target.id === 'wax' ? 'brush_hiss' : 'glass', { vol: .65 });
        if (t === 92 && target.id === 'lens') z.revealed = true;
      }
      if (t === 78 && target.kind === 'node' && fieldCircuitReady()) Audio.sfx('tinkle', { semi: 7 });
      yield;
    }
    if (transform) {
      if (target.id === 'wax') z.painted = 1;
      if (target.id === 'seed') z.sun = z.sunBend = 1;
      if (target.id === 'lens') z.revealed = true;
      fieldNotice(target.done); Audio.sfx('discovery', { vol: .4 });
    } else if (reopen) { openRing(target.id); OW.ring.idx = FIELD.indexOf(f); }
  } finally {
    // An interrupted transformation settles to a stable, traversable result.
    if (state.committed && transform && Game.puzzle === z) {
      if (target.id === 'wax') z.painted = 1;
      if (target.id === 'seed') z.sun = z.sunBend = 1;
      if (target.id === 'lens') z.revealed = true;
    }
    OW.cast = null; OW.fieldCast = null;
  }
}
function* openEstucheGen() {
  const z = Game.puzzle, target = fieldTargets().find(t => t.kind === 'press');
  if (z.opened || z.opening || !fieldCircuitReady() || !fieldReachable(target)) { fieldNotice(fieldDescription(target)); return; }
  z.opening = true; z.zip = 0; OW.moving = false; OW.vx = OW.vy = 0;
  let complete = false;
  try {
    for (let t = 0; t <= 88; t++) {
      z.zip = clamp(t / 26, 0, 1); z.open = clamp((t - 26) / 15, 0, 1); z.rise = clamp((t - 41) / 32, 0, 1);
      if (t < 26 && t % 5 === 0) Audio.sfx('scratch', { vol: .3, semi: t });
      if (t === 28) Audio.sfx('page'); if (t === 42) Audio.sfx('discovery');
      yield;
    }
    if (Game.puzzle !== z || !fieldCircuitReady()) return;
    z.opened = true; Game.owned.pluma = true; complete = true;
    OW.msg = { lines: ['¡Has conseguido la Pluma!', 'Tres pigmentos, tres mezclas.', 'El circuito vuelve a escribir.', 'Equipa la Pluma en el menú.'], t: 0 };
  } finally {
    z.opening = false; z.rise = 0;
    if (!complete) { z.zip = 0; z.open = 0; }
  }
}
function fieldLine(x1, y1, x2, y2, color, width = 1) {
  g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
function fieldBowl(target, cx, cy) {
  const x = target.x - cx, y = target.y - cy, colors = fieldContents(target), col = fieldColor(fieldMix(colors));
  g.fillStyle = 'rgba(34,25,46,.3)'; g.fillRect(x - 9, y + 3, 20, 5);
  g.fillStyle = '#59435e'; g.fillRect(x - 9, y - 6, 18, 11); g.fillRect(x - 7, y + 5, 14, 2);
  g.fillStyle = '#f7ebd0'; g.fillRect(x - 8, y - 7, 16, 10); g.fillRect(x - 6, y + 3, 12, 2);
  g.fillStyle = '#afa18e'; g.fillRect(x - 6, y - 5, 12, 6);
  g.fillStyle = colors.length ? col : '#d2c7b3'; g.fillRect(x - 5, y - 4, 10, 5);
  g.fillStyle = '#fff9ed'; g.fillRect(x - 4, y - 4, 3, 1);
  if (target.kind === 'node') {
    const lx = target.id === 'c' ? x - 20 : x - 5, ly = target.id === 'c' ? y - 4 : y - 19;
    g.fillStyle = '#59435e'; g.fillRect(lx, ly, 10, 9);
    worldTinyText(target.id.toUpperCase(), lx + 4, ly + 2, '#fff4d8');
  } else {
    for (let i = 0; i < 2; i++) { g.fillStyle = colors[i] ? fieldColor(colors[i]) : '#b5a891'; g.fillRect(x - 5 + i * 7, y + 8, 4, 2); }
  }
}
function drawFieldPuzzle(ents, cx, cy, pal) {
  if (!Game.puzzle || !MAP.pz) return;
  const z = Game.puzzle, p = MAP.pz;
  // The room is an actual folded sheet, with an unobstructed drafting area.
  g.fillStyle = '#ddd1b7'; g.fillRect(28 * TILE - cx, 15 * TILE - cy, 11 * TILE, 9 * TILE);
  g.fillStyle = '#efe5cf'; g.fillRect(31 * TILE - cx, 15 * TILE - cy, 8 * TILE - 2, 9 * TILE - 2);
  g.fillStyle = '#e3d7bf'; for (let y = 246; y < 382; y += 8) g.fillRect(498 - cx, y - cy, 122, 1);
  worldTinyText('ATELIER / TRES TINTAS', 505 - cx, 248 - cy, '#867762');
  for (const [tx, ty] of p.river) {
    const x = tx * TILE - cx, y = ty * TILE - cy;
    g.fillStyle = '#282536'; g.fillRect(x, y, 16, 16); g.fillStyle = '#474157';
    g.fillRect(x + 3, y + ((OW.t / 4 + ty * 3) % 14 | 0), 5, 1); g.fillRect(x + 10, y + ((OW.t / 5 + ty * 7) % 14 | 0), 3, 1);
  }
  // Wax on folded paper visibly melts; the paper then settles into a passage.
  const wx = 26 * TILE - cx, wy = 20 * TILE - cy, wax = 1 - z.painted;
  g.fillStyle = '#eaddbd'; g.fillRect(wx, wy, 32, 32);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? '#c3b593' : '#f8efdb'; g.fillRect(wx + i * 8, wy, 8, 32);
    if (wax > 0) { g.fillStyle = '#9e4738'; g.fillRect(wx + i * 8, wy + 5, 8, Math.round(23 * wax)); g.fillStyle = '#d87e53'; g.fillRect(wx + i * 8, wy + 5, 7, 2); }
  }
  if (wax > 0) { g.fillStyle = '#f2b573'; g.fillRect(wx + 10, wy + 7, 12, 13); worldTinyText('CERA', wx + 8, wy - 8, '#f9ebd1'); }
  else { g.fillStyle = '#ba6847'; g.fillRect(wx + 2, wy + 28, 6, 2); g.fillRect(wx + 24, wy + 1, 6, 2); }
  // A wide woven vine spans both ink tiles. It remains after leaving the room.
  if (z.sun > 0) {
    const sx = 456 - cx, sy = 364 - cy, length = 47 * z.sunBend;
    for (let strand = 0; strand < 3; strand++) {
      g.beginPath(); g.moveTo(sx, sy - 3 + strand * 4);
      for (let i = 1; i <= 24; i++) { const q = i / 24; g.lineTo(sx + length * q, sy - 3 + strand * 4 - Math.sin(q * Math.PI) * (1 - z.sunBend) * 23); }
      g.strokeStyle = strand === 1 ? '#8fbf55' : '#36733a'; g.lineWidth = 3; g.stroke();
    }
    for (let i = 0; i < length; i += 7) { g.fillStyle = i % 2 ? '#689949' : '#9fbf61'; g.fillRect(sx + i, sy - 6, 5, 14); g.fillStyle = '#c9d781'; g.fillRect(sx + i, sy - 5, 1, 11); }
  } else { g.fillStyle = '#55733c'; g.fillRect(455 - cx, 351 - cy, 2, 6); g.fillRect(451 - cx, 351 - cy, 5, 2); }
  // Each primary flows down BOTH incident channels. Middle cells mix the ends.
  for (const edge of fieldEdges()) {
    const a = fieldTargets().find(t => t.id === edge.from), b = fieldTargets().find(t => t.id === edge.to);
    const ax = a.x - cx, ay = a.y - cy, bx = b.x - cx, by = b.y - cy, mx = (ax + bx) / 2, my = (ay + by) / 2;
    fieldLine(ax, ay, bx, by, '#b7a88c', 6); fieldLine(ax, ay, bx, by, '#fcf4de', 4);
    fieldLine(ax, ay, mx, my, fieldColor(z.nodes[a.id]), 2); fieldLine(bx, by, mx, my, fieldColor(z.nodes[b.id]), 2);
    for (const node of [a, b]) if (z.nodes[node.id]) {
      const q = (OW.t % 56) / 56; g.fillStyle = '#fff4d5'; g.fillRect(Math.round(lerp(node.x - cx, mx, q)), Math.round(lerp(node.y - cy, my, q)), 2, 1);
    }
    g.fillStyle = '#59435e'; g.fillRect(mx - 6, my - 5, 12, 10); g.fillStyle = fieldColor(edge.actual); g.fillRect(mx - 4, my - 3, 8, 6);
    if (z.revealed) {
      const correct = edge.actual === edge.color, width = edge.color.length * 4 + 7, left = Math.round(mx - width / 2);
      g.fillStyle = correct ? '#dce8b9' : '#f8edcf'; g.fillRect(left, my + 8, width, 8);
      worldTinyText(edge.color.toUpperCase(), mx - edge.color.length * 2 + 1, my + 10, '#574a3f');
      g.fillStyle = fieldColor(edge.color); g.fillRect(left, my + 8, 2, 8);
      if (correct) { g.fillStyle = '#4a7739'; g.fillRect(mx + 13, my - 2, 1, 3); g.fillRect(mx + 14, my - 3, 1, 3); g.fillRect(mx + 15, my - 4, 1, 3); }
    } else { g.fillStyle = '#f5e9cf'; g.fillRect(mx - 5, my + 8, 11, 8); worldTinyText('?', mx - 1, my + 10, '#897c68'); }
  }
  for (const target of fieldTargets()) {
    if (target.kind === 'press') continue;
    ents.push({ y: target.y + 5, draw: () => {
      fieldBowl(target, cx, cy);
      if (target.id === 'lens') {
        const x = target.x - cx, y = target.y - cy;
        g.fillStyle = '#83728b'; g.fillRect(x - 5, y - 18, 10, 7); g.fillStyle = z.revealed ? '#bd91d6' : '#d9d0db'; g.fillRect(x - 3, y - 17, 6, 5);
        worldTinyText('LENTE', x - 9, y + 15, '#766651');
      }
    } });
  }
  const target = fieldTargets().find(t => t.kind === 'press'), x = target.x - cx, y = target.y - cy;
  const ready = fieldCircuitReady(), matched = fieldEdges().filter(e => e.actual === e.color).length;
  ents.push({ y: target.y + 12, draw: () => {
    shadow(x, y + 10, 17); g.drawImage(pzSprite('estuche', pal), x - 12, y - 13);
    if (!z.opened) {
      g.fillStyle = ready ? '#9ec267' : '#a18c69'; g.fillRect(x - 6, y - 5, 12, 5);
      for (let i = 0; i < 3; i++) { g.fillStyle = z.revealed && i < matched ? '#f9e7a0' : '#57485c'; g.fillRect(x - 5 + i * 4, y - 4, 2, 3); }
      if (z.opening) { g.fillStyle = '#fcf2d8'; g.fillRect(x - 9 + z.zip * 18, y - 1, 2, 2); }
    }
    if (z.open || z.opened) { g.fillStyle = '#64536f'; g.fillRect(x - 9, y - 8 - (z.open || 1) * 6, 18, 6); g.fillStyle = '#e9dfc7'; g.fillRect(x - 9, y - 6, 18, 3); }
    if (z.rise) { const img = propSprite('pluma', C('azul')); g.save(); g.translate(x, y - z.rise * 24); g.rotate(-1.05); g.drawImage(img, -24, -8); g.restore(); }
    worldTinyText(z.opened ? 'PLUMA' : ready ? 'ABRIR' : 'SELLO', x - 9, y + 13, '#766651');
  } });
}
function drawFieldEffects(cx, cy) {
  const s = OW.fieldCast;
  if (s) {
    const t = s.t, col = fieldColor(s.f.id), x = s.target.x - cx, y = s.target.y - cy - 3;
    const fx = s.from[0] - cx, fy = s.from[1] - cy, q = clamp((t - 16) / 26, 0, 1);
    if (t < 17) {
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + t * .1, r = 17 - t * .6; g.fillStyle = col; g.fillRect(fx + Math.cos(a) * r, fy + Math.sin(a) * r * .65, 2, 2); }
    }
    if (t >= 16 && t < 48) {
      const sample = u => [lerp(fx, x, u), lerp(fy, y, u) - Math.sin(u * Math.PI) * (s.f.id === 'amarillo' ? 6 : 19)];
      const tail = Math.max(0, q - (s.f.id === 'rojo' ? .34 : .5));
      for (let u = tail; u <= q; u += .025) {
        const [a, b] = sample(u), thick = s.f.id === 'rojo' ? 5 : s.f.id === 'amarillo' ? 1 : 3;
        g.fillStyle = col; g.fillRect(Math.round(a), Math.round(b), thick, thick);
        if (s.f.id === 'rojo' || s.f.id === 'azul' || s.f.id === 'agua') { g.fillStyle = '#fff2d3'; g.fillRect(Math.round(a), Math.round(b), 1, 1); }
      }
      const [a, b] = sample(q), img = propSprite(s.f.tool, col);
      drawProp(img, a, b, s.f.id === 'amarillo' ? -.9 : -.45, 1, PROP[s.f.tool].tip[0], PROP[s.f.tool].tip[1], .65);
      for (let i = 0; i < 5; i++) { const u = Math.max(0, q - i * .08), [a2, b2] = sample(u); g.fillStyle = col; g.fillRect(a2 + Math.sin(i * 3 + t) * 3, b2 + 5 + (t + i * 3) % 9, s.f.id === 'amarillo' ? 1 : 2, 2); }
    }
    if (t >= 42 && t < 73) {
      const k = (t - 42) / 31, mixed = fieldColor(s.mixed || 'agua');
      for (let i = 0; i < 10; i++) {
        const a = i * .628 + k * 3, r = 5 + k * 13;
        g.fillStyle = i % 2 ? mixed : fieldColor(s.before[0] || s.f.id);
        g.globalAlpha = 1 - k; g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * .5 - Math.sin(k * Math.PI) * 8, 2, 2); g.globalAlpha = 1;
      }
      if (s.f.id === 'agua') { g.strokeStyle = '#c5f0f2'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 3, 6 + k * 12, 3 + k * 5, 0, 0, Math.PI * 2); g.stroke(); }
    }
    if (s.target.kind === 'node' && t >= 44 && t <= 88) {
      for (const edge of DATA.puzzle.edges.filter(e => e.from === s.target.id || e.to === s.target.id)) {
        const other = fieldTargets().find(n => n.id === (edge.from === s.target.id ? edge.to : edge.from));
        const k = clamp((t - 44) / 32, 0, 1), mx = (s.target.x + other.x) / 2 - cx, my = (s.target.y + other.y) / 2 - cy;
        g.fillStyle = t > 78 ? fieldColor(fieldMix([s.mixed, Game.puzzle.nodes[other.id]])) : col;
        g.fillRect(lerp(x, mx, k) - 2, lerp(y + 3, my, k) - 2, 4, 4);
      }
    }
    if (s.transform && t >= 50) {
      const k = clamp((t - 50) / 52, 0, 1);
      if (s.target.id === 'lens') {
        const alpha = typeof Prefs === 'undefined' ? .4 : .4 * Prefs.flash;
        for (const edge of fieldEdges()) {
          const a = fieldTargets().find(n => n.id === edge.from), b = fieldTargets().find(n => n.id === edge.to);
          const ex = (a.x + b.x) / 2 - cx, ey = (a.y + b.y) / 2 - cy;
          g.globalAlpha = alpha * Math.sin(k * Math.PI); fieldLine(x, y - 13, lerp(x, ex, k), lerp(y - 13, ey, k), '#b482d9', 5); g.globalAlpha = 1;
          g.fillStyle = '#c6a1dc'; g.fillRect(lerp(x, ex, k) - 1, lerp(y - 13, ey, k) - 1, 3, 3);
        }
      } else if (s.target.id === 'wax') {
        for (let i = 0; i < 8; i++) { const phase = (t + i * 5) % 30 / 30; g.fillStyle = i % 2 ? '#f7b761' : '#e77b41'; g.fillRect(x - 9 + i * 4, y - 4 - phase * 18, 2, 4 * (1 - phase)); }
      } else {
        for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#cce788' : '#80b15e'; g.fillRect(x + k * 46 + Math.sin(i * 3 + t * .15) * 7, y - 5 + Math.cos(i * 2 + t * .1) * 7, 3, 2); }
      }
    }
  }
  const r = OW.ring;
  if (r) for (const target of fieldNearby()) {
    const x = target.x - cx, y = target.y - cy, selected = r.targetId === target.id;
    if (x < 196 || x > 305 || y < 59 || y > 132) continue;
    g.strokeStyle = selected ? '#e29247' : '#9b8c75'; g.lineWidth = 1;
    for (const [a, b] of [[-1,-1],[1,-1],[-1,1],[1,1]]) { g.beginPath(); g.moveTo(x + a * 8, y + b * 11); g.lineTo(x + a * 12, y + b * 11); g.lineTo(x + a * 12, y + b * 7); g.stroke(); }
    uiHit(x - 12, y - 12, 24, 24, () => { r.targetId = target.id; r.notice = null; });
  }
}
function drawFieldUI() {
  if(OW.ring||OW.menu||OW.msg||OW.heal||OW.landT||OW.jar?.toast>0)return;
  const s=OW.fieldCast,toast=OW.fieldToast;
  if(s){
    const col=fieldColor(s.f.id),label=fieldOwner(s.f).name+' / '+s.f.name,castAt=artObserve('field-cast',s);
    g.save();g.translate(Math.round((1-artIn(castAt,14))*-90),0);
    artTag(label,6,151,col);
    const message=s.t<42?'El pigmento viaja...':s.transform?s.target.done:s.f.id==='agua'?'El agua retira la mezcla.':'Mezcla: '+s.mixed,messageAt=artObserve('field-cast-message',message);
    const w=Math.min(308,textWidth(message)+17);maskingLabel(6,167,w,12);smallText(message,14,170,UI_INK,{progress:Prefs.shake?(ARTUI.t-messageAt)*1.6:Infinity,wet:col});
    g.restore();
  }else if(toast?.t>0){
    const lines=wrapSmall(toast.text,280),w=Math.max(...lines.map(textWidth))+18,y=176-lines.length*10-7,toastAt=artObserve('field-toast',toast);
    g.save();g.translate(0,Math.round((1-artIn(toastAt,14))*30));
    maskingLabel(Math.round((W-w)/2),y,w,7+lines.length*10);
    writtenLines(lines,Math.round((W-w)/2)+9,y+4,UI_INK,Prefs.shake?(ARTUI.t-toastAt)*1.6:Infinity,{wet:'#9c4539'});
    g.restore();
  }else{
    const target=fieldNearby()[0];if(!target)return;
    const label=target.name+' / '+battleKey('ok')+(target.kind==='press'&&fieldCircuitReady()?' abrir':' magias');
    const w=textWidth(label)+16,x=Math.round((W-w)/2),at=artObserve('field-nearby',target.id);
    g.save();g.translate(0,Math.round((1-artIn(at,14))*26));
    artTag(label,x,159-Math.round(artPop(at)*3),fieldColor(fieldMix(fieldContents(target))));
    g.restore();
    uiHit(x,154,w,24,()=>fieldInteract());
  }
}
