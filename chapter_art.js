// El reverso uses the same pixel matrices, ink ramp and painter's materials.
'use strict';
function devoralineasMatrix(phase=1,mini=false) {
  const w=66,h=57,rows=Array.from({length:h},()=>Array(w).fill('.'));
  const dot=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<w&&y>=0&&y<h)rows[y][x]=c;};
  const box=(x,y,ww,hh,c)=>{for(let j=y;j<y+hh;j++)for(let i=x;i<x+ww;i++)dot(i,j,c);};
  const ellipse=(x,y,rx,ry,c)=>{for(let j=Math.floor(y-ry);j<=y+ry;j++)for(let i=Math.floor(x-rx);i<=x+rx;i++)if(((i-x)/rx)**2+((j-y)/ry)**2<=1)dot(i,j,c);};
  const stroke=(a,b,r,c)=>{const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=0;i<=n;i++)ellipse(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,r,r,c);};
  // A spreading Gota Negra: no skeleton or mask, just wet pigment and stolen tools.
  for(const side of [-1,1]){
    const path=[[33+side*16,34],[33+side*24,32],[33+side*29,20],[33+side*30,17]];
    for(let i=1;i<path.length;i++){stroke(path[i-1],path[i],3,'O');stroke(path[i-1],path[i],2,'S');stroke([path[i-1][0]-1,path[i-1][1]-1],[path[i][0]-1,path[i][1]-1],.7,'H');}
  }
  ellipse(33,47,30,8,'O');ellipse(33,46,27,7,'S');
  ellipse(32,33,22,21,'O');ellipse(32,32,20,19,'B');ellipse(25,26,12,13,'H');ellipse(36,36,17,17,'S');ellipse(29,30,14,13,'B');
  box(18,21,5,2,'W');box(16,24,2,4,'H');
  // Three fountain-pen nibs set into its crown, drawn in the existing metal colours.
  for(const [x,y] of [[22,7],[33,2],[44,9]]){
    for(let yy=0;yy<16;yy++){const half=yy<8?Math.floor(yy/2):Math.max(1,5-Math.floor((yy-8)/2));box(x-half,y+yy,half*2+1,1,'O');if(half>0)box(x-half+1,y+yy,half*2-1,1,'m');dot(x-1,y+yy,'l');}
    box(x,y+5,1,8,'d');ellipse(x,y+10,1,1,'O');
  }
  // A mouth of torn paper, becoming a widening ink well in later phases.
  const mouthH=phase===1?4:phase===2?9:12;
  ellipse(33,39,12,mouthH,'O');
  for(let i=0;i<5;i++){box(23+i*5,36-mouthH*.3|0,2,3+(i%2),'p');if(phase>1)box(25+i*4,39+mouthH-3,2,2,'p');}
  if(phase>1){ellipse(33,40,3,4,'c');dot(32,38,'C');}
  for(let i=0;i<7;i++){const x=12+i*7;box(x,49+(i%2),3,4+(i%3),'S');box(x+1,50+(i%2),1,4,'H');}
  if(phase===3)for(const [x,y] of [[18,30],[45,29],[25,45]]){stroke([x,y],[x+4,y+5],.6,'p');dot(x+3,y+5,'C');}
  const pal={m:'#8c8ab0',l:'#c9c4d4',d:'#4a4460',p:'#e9dec5'};
  if(mini){const small=[];for(let y=0;y<h;y+=2)small.push(rows[y].filter((_,x)=>x%2===0).join(''));return {rows:small,pal,eyes:[[12,15],[20,15]],eyeKind:'ink',mini:true,big:true};}
  return {rows:rows.map(r=>r.join('')),pal,eyes:[[24,29],[41,29]],eyeKind:'ink',big:true};
}
SPRITES.devoralineas=devoralineasMatrix();
SPRITES.devoralineas_2=devoralineasMatrix(2);
SPRITES.devoralineas_3=devoralineasMatrix(3);
SPRITES.devoralineas_mini=devoralineasMatrix(1,true);

// ---- Los Contrarios: lo que serían las tres gotas si fueran su opuesto. Misma forma, pero en espejo, del color
// complementario y podrido (moho, moratón, óxido), con venas oscuras que lo agrietan y goterones de pintura pasada.
// Juntos, los complementarios se anulan: forman El Negro.
const CONTRARIOS = {
  moho:    { hero: 'carmin', hex: '#6f8a3a', name: 'Moho',    col: 'verde' },
  moraton: { hero: 'ambar',  hex: '#6a3f86', name: 'Moratón', col: 'violeta' },
  oxido:   { hero: 'anil',   hex: '#b0582a', name: 'Óxido',   col: 'naranja' },
};
function contraDef(id, view, kind) {
  const C0 = CONTRARIOS[id], base = heroDef(C0.hero, view, kind), w = Math.max(...base.rows.map(r => r.length)), rp = ramp(C0.hex), rnd = seeded(id.length * 97 + (kind === 'mini' ? 3 : kind === 'title' ? 7 : 1));
  const flipX = x => w - 1 - x, grid = base.rows.map(r => r.padEnd(w, '.').split('').reverse());
  const H = grid.length, body = (x, y) => y >= 0 && y < H && x >= 0 && x < w && 'BSHDW'.includes(grid[y][x]);
  // venas: grietas oscuras que bajan quebrándose por el cuerpo
  if (kind !== 'mini') for (let v = 0; v < 3; v++) { let x = Math.round(w * (.3 + v * .2)), y = Math.round(H * .25); for (let n = 0; n < H; n++) { if (body(x, y) && grid[y][x] !== 'D') grid[y][x] = n % 5 === 4 ? 'S' : 'D'; y++; x += rnd() < .5 ? -1 : rnd() < .5 ? 1 : 0; if (y >= H) break; } }
  // goterones de pintura pasada colgando del borde de abajo
  const extra = kind === 'mini' ? 2 : 4; for (let i = 0; i < extra; i++) grid.push(Array(w).fill('.'));
  for (const f of kind === 'mini' ? [.35, .7] : [.25, .5, .78]) { const x = Math.round(w * f); let y0 = H - 1; while (y0 > 0 && !body(x, y0)) y0--; if (y0 <= 0) continue; const L = Math.min(grid.length - 2 - y0, 1 + Math.round(rnd() * (extra - 1))); if (L < 1) continue;
    for (let k = 1; k <= L; k++) { grid[y0 + k][x] = k === L ? 'D' : 'B'; if (grid[y0 + k][x - 1] === '.') grid[y0 + k][x - 1] = 'O'; if (grid[y0 + k][x + 1] === '.') grid[y0 + k][x + 1] = 'O'; } if (grid[y0 + L + 1]) grid[y0 + L + 1][x] = 'O'; }
  const pal = { ...base.pal, O: '#140f14', D: mixHex(rp.dk, '#140f14', .35), S: rp.sh, B: rp.base, H: mixHex(rp.hi, rp.base, .35), W: mixHex(rp.spec, '#c9d09a', .5), b: '#241a20', c: mixHex(rp.sh, '#241a20', .3), d: '#140f14' };
  const m = ([x, y]) => [flipX(x), y];
  return { ...base, rows: grid.map(r => r.join('')), pal, brow: 'angry', eyes: base.eyes.map(m).reverse(), mouth: base.mouth ? [flipX(base.mouth[0]) - 1, base.mouth[1]] : null, blush: null, freckles: base.freckles ? base.freckles.map(m) : null };
}
// se dibujan la primera vez que hacen falta (las rampas de color viven en game.js, que carga después)
function lazySprite(name, make) { Object.defineProperty(SPRITES, name, { configurable: true, enumerable: true, get() { const d = make(); Object.defineProperty(SPRITES, name, { value: d, writable: true, enumerable: true, configurable: true }); return d; } }); }
for (const id of Object.keys(CONTRARIOS)) { lazySprite(id, () => contraDef(id, 'front', 'battle')); lazySprite(id + '_mini', () => contraDef(id, 'front', 'mini')); lazySprite(id + '_title', () => contraDef(id, 'front', 'title')); }
// El Negro: los tres Contrarios fundidos. En la primera fase aún se ven los tres (con su color, seis ojos); luego la
// mezcla los ensucia y al final sólo queda negro, agrietado por los tres colores.
function elNegroMatrix(phase = 1, mini = false) {
  const w = 62, h = 44, rows = Array.from({ length: h }, () => Array(w).fill('.'));
  const parts = [['carmin', 0, 18, 'x'], ['anil', 27, 23, 'z'], ['ambar', 19, 3, 'y']], coreOf = {};
  for (const [hero, ox, oy, key] of parts) { const d = heroDef(hero, 'front', 'battle'); d.rows.forEach((r, y) => r.split('').forEach((c, x) => { if (c === '.') return; const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= w || Y >= h) return;
    const cur = rows[Y][X]; if (c === 'O' && cur !== '.' && cur !== 'O') return; rows[Y][X] = c === 'O' ? 'O' : c === 'W' ? 'H' : 'BSHD'.includes(c) ? c : 'S'; })); coreOf[key] = [ox + d.rows[0].length / 2, oy + d.rows.length * .55, d.rows[0].length * .28]; }
  // el color que les queda: grande al principio, sólo vetas al final
  const rnd = seeded(40 + phase);
  for (const [, , , key] of parts) { const [cx, cy, r0] = coreOf[key], r = phase === 1 ? r0 : phase === 2 ? r0 * .55 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] !== '.' && rows[y][x] !== 'O' && ((x - cx) / r) ** 2 + ((y - cy) / (r * .8)) ** 2 <= 1) rows[y][x] = key;
    if (phase > 1) { let x = Math.round(cx), y = Math.round(cy); for (let n = 0; n < 14; n++) { if (rows[y] && rows[y][x] && rows[y][x] !== '.' && rows[y][x] !== 'O') rows[y][x] = key; x += Math.round(rnd() * 2 - 1); y += rnd() < .6 ? 1 : -1; } } }
  // barro que chorrea bajo el conjunto
  for (let i = 0; i < 8; i++) { const x = 6 + i * 7, L = 2 + (i * 5) % 4; for (let k = 0; k < L; k++) if (rows[h - 3 + k - 2] && rows[h - 5 + k]) { if (rows[h - 5 + k][x] === '.') rows[h - 5 + k][x] = k === L - 1 ? 'D' : 'S'; } }
  const pal = { x: CONTRARIOS.moho.hex, y: CONTRARIOS.moraton.hex, z: CONTRARIOS.oxido.hex };
  const eyes = phase === 1 ? [[11, 27], [18, 27], [27, 13], [33, 13], [38, 30], [46, 30]] : phase === 2 ? [[18, 26], [27, 20], [36, 20], [44, 27]] : [[24, 22], [38, 22]];
  if (mini) { const small = []; for (let y = 0; y < h; y += 2) small.push(rows[y].filter((_, x) => x % 2 === 0).join('')); return { rows: small, pal, eyes: eyes.map(([x, y]) => [x >> 1, y >> 1]), eyeKind: 'ink', mini: true, big: false }; }
  return { rows: rows.map(r => r.join('')), pal, eyes, eyeKind: 'ink', big: phase === 3 };
}
lazySprite('el_negro', () => elNegroMatrix(1)); lazySprite('el_negro_2', () => elNegroMatrix(2)); lazySprite('el_negro_3', () => elNegroMatrix(3)); lazySprite('el_negro_mini', () => elNegroMatrix(1, true));

function chapterFoldSprite() {
  return cached('chapter-fold',()=>{
    const c=document.createElement('canvas');c.width=34;c.height=29;const x=c.getContext('2d');
    px(x,'#6a5873',2,23,30,4);px(x,'#d4c7ad',1,7,30,17);px(x,'#f1e5c9',2,6,29,15);
    for(let i=0;i<4;i++)px(x,'#b7a795',5,10+i*3,15-i*2,1);
    x.fillStyle='#8c8ab0';x.beginPath();x.moveTo(20,22);x.lineTo(32,7);x.lineTo(32,23);x.fill();
    x.fillStyle='#fff0cf';x.beginPath();x.moveTo(20,22);x.lineTo(24,4);x.lineTo(32,7);x.fill();
    px(x,'#e23c3c',6,5,2,3);px(x,'#f2c93a',9,5,2,3);px(x,'#3a6fe2',12,5,2,3);return c;
  });
}
function drawChapterLandmarks(ents,cx,cy) {
  for(const portal of chapterPortals())ents.push({y:portal.y,draw:()=>{const x=portal.x-cx,y=portal.y-cy,lift=Prefs.shake?Math.round(Math.sin(OW.t*.06+portal.to)*1.2):0;shadow(x,y+3,19);g.drawImage(chapterFoldSprite(),x-17,y-24+lift);}});
  if(Game.page===2){drawDirtyLandmarks(ents,cx,cy);return;}
  if(Game.page!==1)return;
  for(const seal of CHAPTER.seals){const x=seal.x-cx,y=seal.y-cy,done=Game.defeated.has(seal.key);
    ents.push({y:seal.y,draw:()=>{
      shadow(x,y+3,16);g.drawImage(pzSprite('tintero',Game.palette),x-12,y-21);
      g.save();g.translate(x+13,y);g.rotate(.07);g.fillStyle='#8b7151';g.fillRect(0,-36,2,37);g.fillStyle=done?C(seal.color):'#2a2438';
      g.beginPath();g.moveTo(2,-35);g.lineTo(21,-33);g.lineTo(19,-17);g.lineTo(13,-21);g.lineTo(7,-18);g.lineTo(2,-21);g.fill();
      g.fillStyle=done?'#fff1ce':'#8c8ab0';g.fillRect(7,-30,8,2);g.fillRect(10,-33,2,11);g.restore();
      if(done){g.fillStyle=C(seal.color);g.fillRect(x-8,y+3,16,2);}
    }});
  }
  if(!chapterSealsOpen()){
    const y=8*TILE-cy;
    ents.push({y:8*TILE,draw:()=>{for(let x=26*TILE;x<37*TILE;x+=13){g.drawImage(pzSprite('tintero','gris'),x-cx,y-13,18,18);g.fillStyle='#2a2438';g.fillRect(x-cx,y,14,5);}}});
  }
}
// Hoja III: cada guarida es un charco podrido del color de su Contrario; al vencerlo, el charco se aclara. Mientras
// queden Contrarios, los dos puentes al fondo del vaso están sellados con tinta.
function drawDirtyLandmarks(ents,cx,cy){
  for(const l of CONTRA_LAIRS){const x=l.x*16+8-cx,y=l.y*16+12-cy,done=Game.defeated.has(l.key),col=done?C(l.color):DATA.colors[l.id].hex;
    ents.push({y:l.y*16,draw:()=>{g.save();g.globalAlpha=done?.55:.85;g.fillStyle=ramp(col).sh;g.beginPath();g.ellipse(x,y+6,22,7,0,0,6.29);g.fill();g.fillStyle=col;g.beginPath();g.ellipse(x,y+5,17,5,0,0,6.29);g.fill();
      if(!done){g.fillStyle='#140f14';for(let i=0;i<5;i++){const q=((OW.t*.02+i*.2)%1);g.globalAlpha=.6*(1-q);g.beginPath();g.arc(x-12+i*6,y+5-q*8,1+q,0,6.29);g.fill();}}g.restore();}});}
  if(!contraDone())for(const by of [8,18])ents.push({y:(by+3)*16,draw:()=>{for(let x=19*16;x<22*16;x+=12){g.drawImage(pzSprite('tintero','gris'),x-cx-2,(by+2)*16-cy-10,16,16);}g.fillStyle='#2a2438';g.fillRect(19*16-cx,(by+2)*16-cy+4,48,5);}});
}
// El agua del vaso sucio: una película turbia con grumos y un brillo aceitoso de los tres colores podridos que gira
// despacio. Cuando cae El Negro, el agua se aclara.
function drawDirtyWater(cx,cy){
  if(CHAPTER.complete2)return;const x0=cx/TILE|0,y0=cy/TILE|0,t=OW.t,oil=['#6f8a3a','#6a3f86','#b0582a'];
  for(let ty=y0;ty<=y0+12;ty++)for(let tx=x0;tx<=x0+20;tx++){if(tileAt(tx,ty)!=='~')continue;const X=tx*TILE-cx,Y=ty*TILE-cy,h=hash2(tx,ty);
    g.fillStyle='rgba(58,52,34,.5)';g.fillRect(X,Y,TILE,TILE);
    g.fillStyle='rgba(20,15,20,.35)';for(let n=0;n<3;n++){const a=(h>>(n*3))&15;g.fillRect(X+a,Y+((h>>(n*4+2))&15),2,1);}
    const k=(h&7)+Math.floor(t/40);if(k%5===0){g.save();g.globalAlpha=.35;g.fillStyle=oil[(k/5|0)%3];const off=Math.round(Math.sin(t*.03+h)*3);g.fillRect(X+3+off,Y+6,9,1);g.fillRect(X+5+off,Y+7,6,1);g.restore();}}
}
function chapterDrawTraveller(i,cx,cy) {
  const T=CHAPTER.turn,p=Party[i],enter=T.t>=96,local=enter?T.t-174-i*10:T.t-34-i*10;
  const k=clamp(local/32,0,1),from=T.positions[i],anchor=enter?[OW.x-i*12,OW.y]:[T.anchor[0]-i*12,T.anchor[1]],gather=clamp(T.t/32,0,1);
  let x=(enter?anchor[0]:lerp(from[0],anchor[0],gather))-cx,y=(enter?anchor[1]:lerp(from[1],anchor[1],gather))-cy;
  const visible=enter?k:1-k,col=C(p.color),spr=buildSprite(p.id+'_front_mini',col,null,{eyes:p.cur.hp<=0?'ko':'normal'});
  const fade=Prefs.shake?1:visible;
  g.save();g.globalAlpha=enter?Math.min(1,(T.t-166)/8):Math.min(1,(96-T.t)/10);g.fillStyle=ramp(col).sh;g.beginPath();g.ellipse(x,y+1,3+(1-visible)*6,2,0,0,Math.PI*2);g.fill();
  if(!enter&&local>0){const q=clamp(local/40,0,1);g.globalAlpha=.45*(1-clamp((T.t-80)/16,0,1));g.fillStyle=col;g.beginPath();g.ellipse(x,y+1,4+q*9,1.5+q*3,0,0,Math.PI*2);g.fill();} // la gota se empapa en el papel
  if(enter&&local>0&&local<22&&Prefs.shake){const q=local/22;g.globalAlpha=1-q;g.fillStyle=ramp(col).hi;for(let n=0;n<6;n++){const a=-Math.PI*.1-n/5*Math.PI*.8;g.fillRect(Math.round(x+Math.cos(a)*q*10),Math.round(y+Math.sin(a)*q*12+q*q*10),1,2);}} // brota del papel
  if(visible>0){g.globalAlpha=fade;const swell=Prefs.shake?Math.sin(k*Math.PI)*(enter?.12:.4):0;drawSprite(spr,x,y,1+swell,false,Math.max(.02,visible)*(p.cur.hp<=0?.45:1));}
  if(Prefs.shake&&local>0&&local<40){for(let n=0;n<4;n++){const q=clamp(local/40,0,1),a=n*Math.PI/2;g.globalAlpha=(1-q)*.75;g.fillStyle=col;g.fillRect(Math.round(x+Math.cos(a)*q*12),Math.round(y+Math.sin(a)*q*3-(enter?Math.sin(q*Math.PI)*9:0)),1,2);}}
  g.restore();
}
// Pasar página: la cámara se acerca al pliegue mientras las gotas se empapan en el papel; la hoja se levanta en diagonal
// arrojando sombra sobre la nueva, con recortes de papel volando; una carta de capítulo se pinta a brocha sobre una
// banda de tinta que gotea los tres colores; y en la hoja nueva las gotas brotan de su propio color.
const chEase=k=>k*k*(3-2*k);
function chapterZoomK(T){if(!Prefs.shake)return 0;return T.t<96?chEase(clamp((T.t-18)/74,0,1)):1-chEase(clamp((T.t-118)/80,0,1));}
function chapterZoom(T){
  const k=chapterZoomK(T);if(k<=0)return;const z=1+.22*k,ax=T.anchor[0]-OW.cam.x,ay=T.anchor[1]-OW.cam.y-8,c=cached('chapter-zoom',()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;}),x=c.getContext('2d');
  x.clearRect(0,0,W,H);x.drawImage(buf,0,0);const fx=T.t<96?ax:W/2+(ax-W/2)*k,fy=T.t<96?ay:H/2+(ay-H/2)*k;g.save();g.clearRect(0,0,W,H);g.translate(fx,fy);g.scale(z,z);g.translate(-fx,-fy);g.drawImage(c,0,0);g.restore();
}
function chapterCard(T){
  const t=T.t,q=chEase(clamp((t-128)/16,0,1)),out=chEase(clamp((t-214)/18,0,1));if(q<=0||out>=1)return;
  const y=62,h=42,x0=Math.round(W*out),x1=Math.round(W*q),name=CHAPTER_NAMES[T.to]||'',tag='HOJA '+(CHAPTER_ROMAN[T.to]||'');
  g.save();g.beginPath();g.rect(x0,0,Math.max(0,x1-x0),H);g.clip();
  g.fillStyle='rgba(11,9,18,.35)';g.fillRect(0,0,W,H);brushBand(-6,y+2,W+12,h,'#07060c');brushBand(-6,y,W+12,h,'#1a1522');
  // goterones de los tres colores colgando de la banda
  [['rojo',70],['amarillo',160],['azul',250]].forEach(([c,x],n)=>{const L=Math.max(0,Math.min(18,(t-140-n*6)*.5)),rp=ramp(C(c));g.fillStyle=rp.out;g.fillRect(x-1,y+h-2,4,L+2);g.fillStyle=rp.base;g.fillRect(x,y+h-2,2,L+1);g.beginPath();g.arc(x+1,y+h+L,2.4,0,6.29);g.fill();g.fillStyle=rp.hi;g.fillRect(x,y+h-1,1,2);});
  smallText(tag,Math.round((W-textWidth(tag))/2),y+7,'#b8a8c8');
  const nw=rotuloWidth(name.toUpperCase());bigText(name,Math.round((W-nw)/2),y+20,'#efe2c4',{outline:'#07060c',progress:Prefs.shake?(t-136)*2.2:null});
  g.fillStyle='#07060c';const r=seeded(T.to*7+3);for(let n=0;n<10;n++){g.beginPath();g.arc(r()*W,y+(r()<.5?-4-r()*8:h+4+r()*8),.8+r()*2,0,6.29);g.fill();}
  g.restore();
}
function chapterDrawTurn() {
  const T=CHAPTER.turn;if(!T)return;
  drawOverworld();
  if(T.t>=96&&T.t<174){const q=clamp((T.t-96)/78,0,1),k=q*q*(3-2*q);
    if(Prefs.shake){
      // sombra que la hoja levantada proyecta sobre la nueva, justo delante del pliegue
      const L=Math.hypot(W,H),u=[-W/L,-H/L],P=[W+u[0]*L*k*1.02,H+u[1]*L*k*1.02],sh=g.createLinearGradient(P[0],P[1],P[0]-u[0]*46,P[1]-u[1]*46);sh.addColorStop(0,'rgba(11,9,18,.55)');sh.addColorStop(1,'rgba(11,9,18,0)');g.fillStyle=sh;g.fillRect(0,0,W,H);
      pageCurl(T.snap,k,'#d8c9b4','#aa9baa');
      // recortes de papel que levanta la hoja al pasar
      const r=seeded(97);for(let n=0;n<12;n++){const s0=r(),life=(T.t-96-s0*30)/50;if(life<0||life>1)continue;const x=P[0]+(r()-.5)*60-life*(80+r()*80),y=P[1]+(r()-.5)*40-life*(40+r()*60)+life*life*50,a=life*6+n;
        g.save();g.translate(x,y);g.rotate(a);g.globalAlpha=1-life;g.fillStyle=n%3?'#efe2c4':'#c9bd9c';g.fillRect(-2,-1,4+(n%2),2);g.restore();}
    }else{g.save();g.globalAlpha=1-k;g.drawImage(T.snap,0,0);g.restore();}
  }
  chapterZoom(T);
  chapterCard(T);
}

// Its claws are fountain pens: the strike uses the existing stroke renderer,
// damage pipeline, impact timing, pigments, camera and material sounds.
function* devoralineasStrike(u,t) {
  setActionShot('source',[u],{dist:98,turn:-.2,headroom:14});
  yield* anticipate(u,18);u.pose='attack';Audio.sfx('scratch_long',{vol:.65});
  setActionShot('target',[t],{dist:82,turn:.2,headroom:15});
  const pts=[[t.wx-19,t.wy-5,t.def.h+12],[t.wx-10,t.wy-3,t.def.h*.8],[t.wx+3,t.wy+1,t.def.h*.35],[t.wx+18,t.wy+5,1]];
  yield* toolStroke({kind:'pluma',color:C('negro'),col:C('negro'),pts,w:5,frames:24,scale:1.35,from:[u.wx,u.wy,u.def.h*.6],hitAt:.62,
    contact:p=>{hitBasic(u,t,{point:p,accent:'finish'});goop(t,C('negro'),65);Audio.sfx('ink_hit');}});
  yield* wait(18);u.pose='idle';camReset();
}
