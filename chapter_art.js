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
  const portal=chapterPortal();
  ents.push({y:portal.y,draw:()=>{const x=portal.x-cx,y=portal.y-cy;shadow(x,y+3,19);g.drawImage(chapterFoldSprite(),x-17,y-24);}});
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
function chapterDrawTraveller(i,cx,cy) {
  const T=CHAPTER.turn,p=Party[i],enter=T.t>=96,local=enter?T.t-174-i*10:T.t-34-i*10;
  const k=clamp(local/32,0,1),from=T.positions[i],anchor=enter?[OW.x-i*12,OW.y]:[T.anchor[0]-i*12,T.anchor[1]],gather=clamp(T.t/32,0,1);
  let x=(enter?anchor[0]:lerp(from[0],anchor[0],gather))-cx,y=(enter?anchor[1]:lerp(from[1],anchor[1],gather))-cy;
  const visible=enter?k:1-k,col=C(p.color),spr=buildSprite(p.id+'_front_mini',col,null,{eyes:p.cur.hp<=0?'ko':'normal'});
  const fade=Prefs.shake?1:visible;
  g.save();g.globalAlpha=enter?Math.min(1,(T.t-166)/8):Math.min(1,(96-T.t)/10);g.fillStyle=ramp(col).sh;g.beginPath();g.ellipse(x,y+1,3+(1-visible)*6,2,0,0,Math.PI*2);g.fill();
  if(visible>0){g.globalAlpha=fade;const swell=Prefs.shake?Math.sin(k*Math.PI)*(enter?.12:.4):0;drawSprite(spr,x,y,1+swell,false,Math.max(.02,visible)*(p.cur.hp<=0?.45:1));}
  if(Prefs.shake&&local>0&&local<40){for(let n=0;n<4;n++){const q=clamp(local/40,0,1),a=n*Math.PI/2;g.globalAlpha=(1-q)*.75;g.fillStyle=col;g.fillRect(Math.round(x+Math.cos(a)*q*12),Math.round(y+Math.sin(a)*q*3-(enter?Math.sin(q*Math.PI)*9:0)),1,2);}}
  g.restore();
}
function chapterDrawTurn() {
  const T=CHAPTER.turn;if(!T)return;
  drawOverworld();
  if(T.t>=96&&T.t<174){const q=clamp((T.t-96)/78,0,1),k=q*q*(3-2*q);
    if(Prefs.shake){pageCurl(T.snap,k,'#d8c9b4','#aa9baa');}
    else{g.save();g.globalAlpha=1-k;g.drawImage(T.snap,0,0);g.restore();}
  }
  if(T.t>=174){const alpha=Math.min(1,(T.t-174)/12)*Math.min(1,(238-T.t)/15);g.save();g.globalAlpha=clamp(alpha,0,1);artTag(T.to?'El reverso / Los Negros':'De vuelta al jardín',12,9,'#8c8ab0');g.restore();}
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
