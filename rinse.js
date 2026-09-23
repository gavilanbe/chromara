// El vaso de agua: cristal por capas y una pequeña coreografía de curación.
'use strict';
const RINSE = { w: 52, h: 68, ox: -10, oy: -30, surface: 32, floor: 63 };
function rinseState() {
  return { phase: 'idle', clock: 0, visits: 0, bubbles: [], tint: [], hidden: [false,false,false],
    inside: [0,0,0], jump: [null,null,null], pos: [], squash: [0,0,0], clean: [false,false,false],
    wob: 0, glow: 0, charge: 0, clarity: 0, zoom: 1, focus: 0, cd: 0, rings: [], spray: [], drops: [], toast: 0, gain: [null,null,null], bursts: [] };
}
function rinseOval(x, col, cx, cy, rx, ry) {
  cx=Math.round(cx);cy=Math.round(cy);rx=Math.max(1,Math.round(rx));ry=Math.max(1,Math.round(ry));
  for(let dy=-ry;dy<=ry;dy++){const a=Math.floor(rx*Math.sqrt(Math.max(0,1-dy*dy/(ry*ry))));px(x,col,cx-a,cy+dy,a*2+1);}
}
function rinseClip(x) {
  x.beginPath();x.moveTo(9,27);x.lineTo(43,27);x.lineTo(43,53);x.lineTo(40,60);x.lineTo(12,60);x.lineTo(9,53);x.closePath();x.clip();
}
function rinseGlass(x,pal,J,t) {
  const p=PAL[pal], ink='#46515f', rim='#d1e5db', light='#fff9dd', oval=(...args)=>rinseOval(x,...args);
  const rect=(col,a,b,w=1,h=1)=>px(x,col,a,b,w,h);
  // Glazed saucer, three tiny pigment drops and a thick curved glass foot.
  oval('#8b7f82',26,63,25,4);oval('#d8d7c7',26,61,25,4);oval('#eee9d2',26,60,24,3);oval('#a2b1b3',26,60,19,2);
  for(let i=0;i<3;i++){const r=ramp(worldPigment(Party[i].color,pal));oval(r.sh,9+i*17,63,2,1);rect(r.hi,8+i*17,62);}
  oval(ink,26,57,19,6);rect(ink,6,19,40,35);rect('#9aaeb5',8,20,36,34);oval('#aebfc0',26,56,17,5);
  rect('#c1d1c7',10,21,32,30);rect('#d8e0ce',11,23,6,22);rect('#9aafb7',39,24,4,30);
  // Water is clipped to the inside of the glass, including floating characters.
  x.save();rinseClip(x);
  const wave=Math.sin(t*.04)*.4+J.wob*Math.sin(t*.21)*1.5, surface=RINSE.surface+wave;
  const water=worldMix(p.wash,'#86d9d5',J.clarity*.45);
  for(let row=Math.round(surface);row<62;row++){
    rect(worldMix(water,p.washDk,(row-surface)/45),9,row,34,1);
  }
  oval(worldMix(p.washHi,'#d5f4d9',J.clarity*.35),26,surface,17,4);oval(water,27,surface+1,14,2);
  // Fine ribbons of pigment circulate in opposite directions at different depths.
  J.tint.forEach((col,i)=>{
    const r=ramp(col);x.globalAlpha=(.36+J.charge*.2)*(1-J.clarity*.82);
    for(let band=0;band<2;band++){
      const cy=40+band*12;
      for(let n=0;n<42;n++){
        const a=t*(.035+J.charge*.045)+i*2.1+n*.1+band, radius=4+n*.27;
        const xx=Math.round(26+Math.cos(a)*radius), yy=Math.round(cy+Math.sin(a)*radius*.34);
        rect(n>32?r.hi:r.base,xx,yy,2,2);
      }
    }
  });x.globalAlpha=1;
  // Visible through the water, with one-pixel refraction between sprite strips.
  J.inside.forEach((k,i)=>{
    if(!k)return;
    const p=Party[i], spr=buildSprite(p.id+'_front_mini',C(p.color),null,{eyes:J.clarity>.45?'happy':'normal'});
    const xx=26+Math.sin(t*.035+i*2.1)*(J.charge>0?10:8), yy=42+i*3+Math.cos(t*.04+i*2)*2;
    x.globalAlpha=.8*k;
    const sw=Math.round(spr.width*.8),sh=Math.round(spr.height*.8);
    for(let row=0;row<sh;row++){const sourceY=Math.min(spr.height-1,Math.floor(row*spr.height/sh)),shift=Math.round(Math.sin(row*.35+t*.07+i));x.drawImage(spr,0,sourceY,spr.width,1,Math.round(xx-sw/2)+shift,Math.round(yy-sh)+row,sw,1);}
  });x.globalAlpha=1;
  x.globalAlpha=.10;rect('#b1eee3',9,34,34,27);x.globalAlpha=1;
  for(const b of J.bubbles){const bx=Math.round(b.x),by=Math.round(b.y);if(b.r>1){rect('#d4f4e7',bx-1,by-1,3,1);rect('#d4f4e7',bx-1,by+1,3,1);rect('#d4f4e7',bx-2,by,1,1);rect('#d4f4e7',bx+2,by,1,1);}else rect(light,bx,by);}
  for(const r of J.rings){x.globalAlpha=(1-r.t/r.life)*.8;const radius=2+r.t*.8;x.strokeStyle=r.col;x.lineWidth=1;x.beginPath();x.ellipse(26+r.x,surface+1,Math.min(18,radius),Math.max(1,radius*.24),0,0,Math.PI*2);x.stroke();}x.globalAlpha=1;
  // The submerged part of the leaning brush bends optically at the meniscus.
  rect('#5c8590',36,34,3,11);rect('#b7d6d5',36,34,1,7);rect('#617c7e',33,44,6,9);rect('#8fc4bd',33,44,2,7);
  x.restore();
  // Air above the water, brush handle, back and front lip, then glass highlights.
  for(let yy=0;yy<33;yy++){const bx=43-Math.floor(yy/5);rect('#6c5653',bx,yy,3,1);rect('#bb925f',bx,yy,2,1);rect('#f0d393',bx,yy,1,1);}
  rect('#6a7b88',36,29,5,4);rect('#e3e7d8',36,29,4,1);
  oval(ink,26,19,21,5);oval(rim,26,18,20,4);oval('#809aa2',26,18,17,3);oval('#b6cec5',26,17,15,2);
  rect(light,11,15,17,1);rect('#f3f3dc',8,17,3,1);rect('#8aa6ad',9,21,33,2);rect(light,13,22,21,1);
  rect('#e7efdf',8,25,2,25);rect(light,10,26,2,15);rect(light,11,44,2,5);rect('#d0e4df',40,27,1,20);
  x.globalAlpha=.27;rect('#f5f6df',13,25,2,29);rect('#e7f5df',37,26,2,25);x.globalAlpha=1;
  rect('#91aab0',8,53,2,5);rect('#8297a4',42,49,1,6);rect('#dbe5d7',12,58,27,2);rect(light,14,59,15,1);rect('#7893a0',13,61,27,1);
  // Engraved water-drop symbol and understated measuring marks.
  rect('#d9eade',20,44,1,2);rect('#d9eade',19,46,3,4);rect(light,20,47,1,2);rect('#d9eade',20,50);
  for(let yy=30;yy<54;yy+=6)rect('#dcead9',30,yy,yy%12===6?5:3,1);
  const gl=(t%(J.phase==='idle'?180:72));if(gl<12){const rr=Math.min(3,gl<6?gl:12-gl);rect(light,11-rr,27,rr*2+1,1);rect(light,11,27-rr,1,rr*2+1);}
}
function rinseSprite(pal) {
  return cached('rinse-icon|'+pal,()=>{const c=document.createElement('canvas');c.width=RINSE.w;c.height=RINSE.h;rinseGlass(c.getContext('2d'),pal,rinseState(),50);return c;});
}
function rinseTick() {
  const J=OW.jar;if(!J||!MAP.jar)return;
  J.clock++;J.wob*=.91;J.glow*=.94;if(J.toast>0)J.toast--;
  for(const b of J.bubbles){b.y-=b.v;b.x+=Math.sin(b.t*.17)*.08;b.t++;}J.bubbles=J.bubbles.filter(b=>b.y>RINSE.surface+1&&b.t<110);
  if(J.clock%(OW.heal?7:70)===0)J.bubbles.push({x:16+(J.clock*7%21),y:56,v:OW.heal?.35:.16,r:OW.heal&&J.clock%3===0?2:1,t:0});
  for(const r of J.rings)r.t++;J.rings=J.rings.filter(r=>r.t<r.life);
  const floor=MAP.jar.y*TILE+35;
  for(const d of J.spray){d.x+=d.vx;d.y+=d.vy;d.vy+=.11;d.t++;if(d.y>=floor){if(J.drops.length<36)J.drops.push({x:d.x,y:floor+1,col:d.col,t:0});d.t=d.life;}}
  J.spray=J.spray.filter(d=>d.t<d.life);
  for(const d of J.drops)d.t++;J.drops=J.drops.filter(d=>d.t<180);
  for(const b of J.bursts||[])b.t++;J.bursts=(J.bursts||[]).filter(b=>b.t<40);
}
function rinseSplash(i,power=1) {
  const J=OW.jar,cx=MAP.jar.x*TILE+16,sy=MAP.jar.y*TILE+RINSE.oy+RINSE.surface;
  J.wob=power;J.rings.push({x:(i-1)*4,t:0,life:30,col:C(Party[i].color)});
  const rng=seeded(i*101+J.clock);
  for(let n=0;n<14;n++){const a=(n/13)*Math.PI, speed=1+rng()*1.7;J.spray.push({x:cx+(i-1)*3,y:sy+1,vx:Math.cos(a)*speed*power,vy:-Math.sin(a)*speed-1,col:n%3?C(Party[i].color):'#d7f4e1',r:n%4===0?2:1,t:0,life:65});}
  Audio.sfx('splash_clean',{semi:[0,4,7][i],vol:.55*power,pan:(i-1)*.25});
}
function drawRinseGround(cx,cy,pal) {
  if(!MAP.jar)return;const x=MAP.jar.x*TILE+16-cx,y=MAP.jar.y*TILE+34-cy;
  if(x<-45||x>W+45||y<-40||y>H+60)return;
  // A cloth, damp wash rings and three primary-colour pebbles mark the spring.
  g.fillStyle='#a29c86';g.fillRect(x-27,y-3,56,18);g.fillStyle=pal==='vivo'?'#e1dfbf':'#c9c8ac';g.fillRect(x-28,y-5,56,18);
  g.fillStyle='#9fae9f';for(let a=-25;a<27;a+=4){g.fillRect(x+a,y+11,2,1);g.fillRect(x+a,y-4,2,1);}
  g.strokeStyle=pal==='vivo'?'#83ada2':'#98aa9e';g.lineWidth=1;g.beginPath();g.ellipse(x+25,y+4,7,3,0,0,Math.PI*2);g.stroke();
  for(let i=0;i<3;i++){g.fillStyle=worldPigment(Party[i].color,pal);g.fillRect(x-23+i*5,y+6,3,2);}
  for(const d of OW.jar.drops){g.globalAlpha=Math.min(.65,(180-d.t)/100);g.fillStyle=d.col;g.fillRect(Math.round(d.x-cx-2),Math.round(d.y-cy),4,1);g.fillRect(Math.round(d.x-cx-1),Math.round(d.y-cy-1),2,1);}g.globalAlpha=1;
}
function drawRinseVessel(cx,cy,pal) {
  const J=OW.jar,x=MAP.jar.x*TILE+16-cx,y=MAP.jar.y*TILE+34-cy;
  if(x<-60||x>W+60||y<-20||y>H+80)return;
  // Reuse one small surface; animated frames never accumulate in the cache.
  if(!RINSE.canvas){RINSE.canvas=document.createElement('canvas');RINSE.canvas.width=RINSE.w;RINSE.canvas.height=RINSE.h;}
  const rc=RINSE.canvas.getContext('2d');rc.clearRect(0,0,RINSE.w,RINSE.h);rinseGlass(rc,pal,J,J.clock);
  g.save();g.translate(x,y);const wob=Math.sin(J.clock*.55)*J.wob*.035;g.scale(1+wob,1-wob*.55);
  shadow(0,1,43);g.drawImage(RINSE.canvas,-26,-64);g.restore();
  if(J.glow>.05 && Prefs.flash>0){g.save();g.globalAlpha=J.glow*Prefs.flash*.24;g.strokeStyle='#fff9d4';g.lineWidth=1;g.beginPath();g.ellipse(x,y-24,26+J.glow*8,35,0,0,Math.PI*2);g.stroke();g.restore();}
}
function drawRinseParty(i,cx,cy) {
  const J=OW.jar,p=Party[i];if(J.hidden[i])return;
  const jp=J.jump[i],pos=jp||J.pos[i];if(!pos)return;
  const x=pos[0]-cx,y=pos[1]-cy,z=jp?jp[2]:0;
  const fade=J.clean[i]?0:pigmentFade(p.cur.mp,effStats(p).mp),spr=desatSprite(buildSprite(p.id+'_front_mini',C(p.color),null,{eyes:J.clean[i]?'happy':J.squash[i]>.15?'blink':'normal'}),fade);
  shadow(x,y,Math.max(3,8-z*.08));
  if(jp){g.save();g.translate(x,y-z);g.rotate(jp[3]||0);drawSprite(spr,0,0,jp[4]||1,false,jp[5]||1);g.restore();}
  else drawSprite(spr,x,y,1+J.squash[i]*.22,false,1-J.squash[i]*.3);
}
function drawRinseSpray(cx,cy) {
  for(const d of OW.jar.spray){g.fillStyle=d.col;const x=Math.round(d.x-cx),y=Math.round(d.y-cy);g.fillRect(x,y,d.r,d.r+Number(d.vy>1));if(d.r>1){g.fillStyle='#fff9df';g.fillRect(x,y,1,1);}}
}
// Al salir del agua, cada gota estalla en su color: un anillo, estrellitas y manchas que quedan en el paño.
function rinseBurst(i,to){const J=OW.jar,col=C(Party[i].color);J.bursts.push({x:to[0],y:to[1]-8,col,t:0});for(let n=0;n<6;n++){const a=n/6*6.283+i;J.drops.push({x:to[0]+Math.cos(a)*(8+n%3*3),y:to[1]+Math.sin(a)*3,col,t:0});}if(Prefs.flash)J.glow=1;}
function drawRinseBursts(cx,cy){const J=OW.jar;if(!J)return;for(const b of J.bursts||[]){const q=b.t/40,x=b.x-cx,y=b.y-cy;paintRing(x,y,q,b.col,26);if(Prefs.shake)for(let n=0;n<8;n++){const a=n/8*6.283+b.t*.05,d=6+q*20;g.globalAlpha=1-q;g.fillStyle=n%2?b.col:'#fff8e6';const sx=Math.round(x+Math.cos(a)*d),sy=Math.round(y+Math.sin(a)*d*.7-q*6);g.fillRect(sx-1,sy,3,1);g.fillRect(sx,sy-1,1,3);}g.globalAlpha=1;}}
// Mientras se aclaran, el mundo se apaga alrededor del vaso y del agua salen rayos de luz tramados.
function drawRinseSpotlight(){
  const J=OW.jar;if(!J||!OW.heal||!MAP.jar)return;const k=J.focus||0;if(k<=0)return;
  const z=J.zoom||1,jx=(MAP.jar.x*TILE+16-OW.cam.x-W/2)*z+W/2,jy=(MAP.jar.y*TILE+10-OW.cam.y-H/2)*z+H/2,r=62*z;
  const c=cached('rinse-spot',()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;}),x=c.getContext('2d');
  x.clearRect(0,0,W,H);x.fillStyle='rgba(22,16,32,'+(.5*k).toFixed(2)+')';x.fillRect(0,0,W,H);x.globalCompositeOperation='destination-out';
  for(let i=0;i<4;i++){x.globalAlpha=.35+i*.2;x.beginPath();x.ellipse(jx,jy,r*(1.3-i*.12),r*(1.1-i*.1),0,0,6.283);x.fill();}
  x.globalCompositeOperation='source-over';x.globalAlpha=1;g.drawImage(c,0,0);
  if(Prefs.flash&&(J.phase==='clear'||J.phase==='exit')){const a=(J.phase==='clear'?J.clarity:1)*Prefs.flash;g.save();g.globalAlpha=.22*a;
    for(let i=0;i<7;i++){const ang=-Math.PI/2+(i-3)*.28+Math.sin(J.clock*.02+i)*.04,len=(70+i%3*16)*z;g.fillStyle=i%2?'#fff3c0':'#e8f6f2';g.beginPath();g.moveTo(jx,jy-10*z);g.lineTo(jx+Math.cos(ang-.05)*len,jy+Math.sin(ang-.05)*len);g.lineTo(jx+Math.cos(ang+.05)*len,jy+Math.sin(ang+.05)*len);g.fill();}g.restore();}
}
// La ficha de la cura: las tres gotas con su pintura (HP) y su pigmento (MP); al salir del agua, cada una se rellena
// con un chorro que corre de izquierda a derecha y los números cuentan hasta el máximo.
function drawRinseUI() {
  const J=OW.jar;if(!J)return;
  if(OW.heal){
    drawRinseSpotlight();
    const labels={focus:'Un respiro junto al agua',enter:'Al agua, gota a gota',mix:'Tres colores en un remolino',clear:'El agua devuelve el color',exit:'Como recién pintados',settle:'Listos para seguir'};
    const label=labels[J.phase]||labels.focus,at=artObserve('rinse-phase',J.phase),w=rotuloWidth(label.toUpperCase())+26,k=clamp((J.focus||0)*1.4,0,1);
    g.save();g.translate(0,Math.round((1-k)*-30));brushBand(Math.round((W-w)/2),4,w,17,KIT_INK);bigText(label,Math.round((W-w)/2)+13,8,'#b8e0f0',{outline:'#0b0912',progress:Prefs.shake?(ARTUI.t-at)*1.4:null});g.restore();
    g.save();g.translate(0,Math.round((1-k)*50));
    Party.forEach((p,i)=>{
      const x=8+i*104,y=150,s=effStats(p),gn=J.gain[i],q=gn?clamp((J.clock-gn.at)/34,0,1):0,e=1-(1-q)**3,hp=gn?lerp(gn.hp0,gn.hp,e):p.cur.hp,mp=gn?lerp(gn.mp0,gn.mp,e):p.cur.mp,col=C(p.color),inside=J.inside[i],clean=J.clean[i];
      maskingLabel(x,y,96,26,clean?'#fff3d2':'#e8dcc4');
      const bob=inside&&Prefs.shake?Math.round(Math.sin(J.clock*.2+i)*1.5):0;
      sticker(x+11,y+12+bob,{...p,alive:p.cur.hp>0,hp:p.cur.hp,maxhp:s.hp,mp:p.cur.mp,maxmp:s.mp},8);
      if(inside){g.fillStyle='#8ec8e8';g.globalAlpha=.5;g.beginPath();g.ellipse(x+11,y+14,10,5,0,0,6.29);g.fill();g.globalAlpha=1;} // en el agua
      smallText(p.name,x+23,y+2,UI_INK);
      g.fillStyle='#cfc1a9';g.fillRect(x+23,y+12,62,3);g.fillStyle=col;g.fillRect(x+23,y+12,Math.round(62*hp/s.hp),3);g.fillStyle=ramp(col).hi;g.fillRect(x+23,y+12,Math.round(62*hp/s.hp),1);
      g.fillStyle='#cfc1a9';g.fillRect(x+23,y+18,62,2);g.fillStyle='#6fa6d8';g.fillRect(x+23,y+18,Math.round(62*mp/s.mp),2);
      if(gn&&q<1&&Prefs.shake){const fx=x+23+Math.round(62*hp/s.hp);g.fillStyle='#fff8e6';g.fillRect(fx-1,y+11,2,5);} // la punta del chorro
      textRight(Math.round(hp),x+93,y+2,clean?'#34733e':UI_MUTED);
      if(gn&&J.clock-gn.at<70&&(gn.dh||gn.dm)){const r=(J.clock-gn.at)/70;g.save();g.globalAlpha=1-r*r;const t2='+'+gn.dh;smallText(t2,x+60-textWidth(t2),y-9-Math.round(r*6),'#34733e');g.restore();}
    });
    g.restore();
  }else if(J.toast>0&&!OW.msg&&!OW.menu&&!OW.ring){
    const label='Como recién pintados: HP y MP al máximo',w=textWidth(label)+34,age=150-J.toast;
    g.save();g.globalAlpha=Math.min(1,J.toast/20);g.translate(0,Math.round((1-(Prefs.shake?easeBack(clamp(age/14,0,1)):1))*26));maskingLabel((W-w)/2,H-24,w,17);
    g.drawImage(iconSprite('item',C('azul')),(W-w)/2+5,H-22);smallText(label,(W-w)/2+24,H-19,UI_INK,{progress:Prefs.shake?age*1.4:Infinity,wet:C('azul')});g.restore();
  }
}
function rinseFocus(k,start) {
  const J=OW.jar;J.focus=k;
  if(Prefs.camera==='fija'){J.zoom=1;return;}
  const eased=k*k*(3-2*k),jx=MAP.jar.x*TILE+16,jy=MAP.jar.y*TILE+5;
  J.zoom=1+eased*(Prefs.camera==='cinema'?.7:.5);
  OW.cam.x=lerp(start.x,clamp(jx-W/2,0,MAP.w*TILE-W),eased);
  OW.cam.y=lerp(start.y,clamp(jy-H*.38,0,MAP.h*TILE-H),eased);
}
function* rinseSequence() {
  const J=OW.jar,cam={...OW.cam},hist=OW.hist.map(h=>[...h]),cx=MAP.jar.x*TILE+16,sy=MAP.jar.y*TILE+RINSE.oy+RINSE.surface;
  const repeat=J.visits>0,focusFrames=repeat?12:24,entryFrames=repeat?23:30,mixFrames=repeat?40:78;
  J.phase='focus';J.gain=[null,null,null];J.bursts=[];J.tint=[];J.inside=[0,0,0];J.hidden=[false,false,false];J.clean=[false,false,false];J.charge=0;J.clarity=0;J.toast=0;
  Audio.sfx('glass',{vol:.4});
  try {
    for(let n=1;n<=focusFrames;n++){rinseFocus(n/focusFrames,cam);yield;}
    J.phase='enter';
    for(let i=0;i<Party.length;i++){
      const from=J.pos[i];
      for(let n=0;n<7;n++){J.squash[i]=(n+1)/7;yield;}
      J.squash[i]=0;Audio.sfx('whip',{semi:[0,4,7][i],vol:.26});
      for(let n=1;n<=entryFrames;n++){
        const q=n/entryFrames,arc=Math.sin(q*Math.PI),stretch=q<.7?1.15:1.28;
        J.jump[i]=[lerp(from[0],cx+(i-1)*4,q),lerp(from[1],sy+7,q),arc*(i===1?43:35),Math.sin(q*Math.PI*2)*(i-1)*.18,1-arc*.12,stretch];yield;
      }
      J.jump[i]=null;J.hidden[i]=true;J.inside[i]=1;J.tint.push(C(Party[i].color));rinseSplash(i);
      for(let n=0;n<9;n++)yield;
    }
    J.phase='mix';Audio.sfx('bubbles',{vol:.3});
    for(let n=0;n<mixFrames;n++){J.charge=Math.sin(n/mixFrames*Math.PI)*.8+.2;if(n%24===0){Audio.sfx('slow_drip',{semi:[0,4,7][n/24%3|0],vol:.3});J.rings.push({x:0,t:0,life:35,col:C(WORLD_COLORS[n/24%6|0])});}yield;}
    J.phase='clear';Audio.sfx('heal_bells',{vol:.75});
    for(let n=0;n<36;n++){J.clarity=(n+1)/36;J.charge*=.94;J.glow=Math.sin(n/36*Math.PI);yield;}
    J.phase='exit';
    for(let i=0;i<Party.length;i++){
      const p=Party[i],to=J.pos[i],s=effStats(p),dh=s.hp-p.cur.hp,dm=s.mp-p.cur.mp;
      J.hidden[i]=false;J.inside[i]=0;J.clean[i]=true;p.cur.hp=s.hp;p.cur.mp=s.mp;rinseSplash(i,.65);
      for(let n=1;n<=24;n++){
        const q=n/24;J.jump[i]=[lerp(cx+(i-1)*4,to[0],q),lerp(sy+6,to[1],q),Math.sin(q*Math.PI)*(30+i*3),Math.sin(q*Math.PI*2)*(1-i)*.12,.93,1.08];yield;
      }
      J.jump[i]=null;Audio.sfx('plop',{semi:[0,4,7][i],vol:.28});Audio.sfx('tinkle',{semi:[0,4,7][i],vol:.35});
      J.gain[i]={hp0:s.hp-dh,mp0:s.mp-dm,hp:s.hp,mp:s.mp,dh,dm,at:J.clock};rinseBurst(i,to);
      for(let n=0;n<8;n++){J.squash[i]=Math.sin((n+1)/8*Math.PI)*.65;yield;}J.squash[i]=0;
    }
    J.phase='settle';
    for(let n=0;n<24;n++){rinseFocus(1-(n+1)/24,cam);J.clarity=1;yield;}
    J.visits++;J.toast=150;J.gain=[null,null,null];
  } finally {
    J.phase='idle';J.zoom=1;J.focus=0;J.glow=0;J.charge=0;J.clarity=0;J.inside=[0,0,0];J.hidden=[false,false,false];J.jump=[null,null,null];J.squash=[0,0,0];J.tint=[];J.cd=1;
    OW.hist=hist;OW.cam.x=cam.x;OW.cam.y=cam.y;OW.vx=OW.vy=0;OW.moving=false;
  }
}
