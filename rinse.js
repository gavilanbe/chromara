// El vaso de agua: cristal por capas y una pequeña coreografía de curación.
'use strict';
const RINSE = { w: 52, h: 68, ox: -10, oy: -30, surface: 32, floor: 63 };
function rinseState() {
  return { phase: 'idle', clock: 0, visits: 0, bubbles: [], tint: [], hidden: [false,false,false],
    inside: [0,0,0], jump: [null,null,null], pos: [], squash: [0,0,0], clean: [false,false,false],
    wob: 0, glow: 0, charge: 0, clarity: 0, zoom: 1, focus: 0, cd: 0, rings: [], spray: [], drops: [], toast: 0, gain: [null,null,null], bursts: [], rise: 0, full: [0,0,0] };
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
  const wave=Math.sin(t*.04)*.4+J.wob*Math.sin(t*.21)*1.5, surface=RINSE.surface+wave-(J.rise||0); // cada gota que entra sube el agua
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
  J.rise=(J.rise||0)+(J.inside.reduce((a,b)=>a+b,0)*2.4-(J.rise||0))*.14;
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
  const J=OW.jar,cx=MAP.jar.x*TILE+16,sy=MAP.jar.y*TILE+RINSE.oy+RINSE.surface-Math.round(J.rise||0);
  J.wob=power;J.rings.push({x:(i-1)*4,t:0,life:30,col:C(Party[i].color)});
  const rng=seeded(i*101+J.clock);
  for(let n=0;n<14;n++){const a=(n/13)*Math.PI, speed=1+rng()*1.7;J.spray.push({x:cx+(i-1)*3,y:sy+1,vx:Math.cos(a)*speed*power,vy:-Math.sin(a)*speed-1,col:n%3?C(Party[i].color):'#d7f4e1',r:n%4===0?2:1,t:0,life:65});}
  // columna de agua que salta por encima del borde
  for(let n=0;n<10;n++)J.spray.push({x:cx+(i-1)*3+(rng()-.5)*4,y:sy,vx:(rng()-.5)*.5,vy:-(2.6+rng()*2.2)*power,col:n%3?'#e8f8f0':C(Party[i].color),r:n%3?2:1,t:0,life:70});
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
// Sin texto: tres frascos con forma de gota (son las tres gotas, con su color y su cara). El nivel de pintura es su
// vida; las cinco chispas de debajo, su pigmento. Al salir del agua, un chorro de su color va del vaso a su frasco, que se
// llena con burbujas y oleaje; las chispas se encienden una a una y, lleno, el frasco salta de alegría.
function rinseScreen(wx,wy){const J=OW.jar,z=J.zoom||1;return [(wx-OW.cam.x-W/2)*z+W/2,(wy-OW.cam.y-H/2)*z+H/2];}
function rinseVialPath(x,y){g.beginPath();g.moveTo(x,y-34);g.bezierCurveTo(x+3,y-27,x+12,y-23,x+12,y-13);g.arc(x,y-13,12,0,Math.PI);g.bezierCurveTo(x-12,y-23,x-3,y-27,x,y-34);g.closePath();}
function drawRinseVial(i,x,y,hp,mp,t,filling,full){
  const p=Party[i],col=C(p.color),r=ramp(col),f=clamp(hp,0,1),sh=Prefs.shake;
  g.save();
  if(full>0&&full<1&&sh){const s=1+Math.sin(full*Math.PI)*.18;g.translate(x,y);g.scale(s,2-s);g.translate(-x,-y);}
  if(f<.3&&!filling&&sh)g.translate(Math.round(Math.sin(t*.9+i)*.6),0); // tiembla, vacío
  // sombra y cristal
  g.fillStyle='rgba(11,9,18,.35)';g.beginPath();g.ellipse(x,y+1,11,3,0,0,6.29);g.fill();
  rinseVialPath(x,y);g.fillStyle='rgba(90,86,112,.45)';g.fill();
  // pintura dentro, con la superficie ondulada (más oleaje mientras se llena)
  g.save();rinseVialPath(x,y);g.clip();
  const top=y-1-f*33,amp=filling&&sh?1.6:.6;
  for(let xx=-12;xx<=12;xx++){const wy=Math.round(top+Math.sin(xx*.5+t*(filling?.35:.08))*amp);g.fillStyle=r.base;g.fillRect(x+xx,wy,1,y-wy+1);g.fillStyle=r.hi;g.fillRect(x+xx,wy,1,1);}
  g.fillStyle=r.sh;g.fillRect(x-12,y-5,25,6);g.fillStyle=r.sh;g.globalAlpha=.5;g.fillRect(x+6,top,6,y-top);g.globalAlpha=1;
  if(filling&&sh)for(let n=0;n<5;n++){const q=((t*.05+n*.21)%1),bx=x-7+n*3.5+Math.sin(t*.2+n)*1.2,by=y-2-q*(y-2-top);g.fillStyle='rgba(255,255,255,.75)';g.fillRect(Math.round(bx),Math.round(by),1,1);}
  g.restore();
  // contorno, brillo del cristal
  rinseVialPath(x,y);g.strokeStyle='#1e1a2c';g.lineWidth=2;g.stroke();rinseVialPath(x,y);g.strokeStyle=f>.99?r.hi:'#6a6480';g.lineWidth=1;g.globalAlpha=.6;g.stroke();g.globalAlpha=1;
  g.fillStyle='rgba(255,255,255,.7)';g.fillRect(x-8,y-18,1,6);g.fillRect(x-7,y-20,1,1);
  // su cara: ojos en X sin pintura, tristes si queda poca, contentos llenos
  const ey=y-13;g.fillStyle='#1e1a2c';
  if(f<=0){for(const d of [-4,4]){g.fillRect(x+d-1,ey-1,1,1);g.fillRect(x+d+1,ey-1,1,1);g.fillRect(x+d,ey,1,1);g.fillRect(x+d-1,ey+1,1,1);g.fillRect(x+d+1,ey+1,1,1);}}
  else if(f>.99){for(const d of [-4,4]){g.fillRect(x+d-1,ey,1,1);g.fillRect(x+d,ey-1,1,1);g.fillRect(x+d+1,ey,1,1);}g.fillRect(x-1,ey+4,3,1);g.fillStyle='#ff9d9d';g.fillRect(x-8,ey+2,2,1);g.fillRect(x+7,ey+2,2,1);}
  else if(f<.4){for(const d of [-4,4]){g.fillRect(x+d,ey-1,1,2);g.fillRect(x+d+(d<0?1:-1),ey-2,1,1);}g.fillRect(x-1,ey+4,3,1);g.fillRect(x-2,ey+5,1,1);g.fillRect(x+2,ey+5,1,1);}
  else{for(const d of [-4,4])g.fillRect(x+d,ey-1,1,2);g.fillRect(x,ey+4,1,1);}
  // chispas de pigmento
  const lit=Math.round(clamp(mp,0,1)*5);
  for(let n=0;n<5;n++){const px2=x-8+n*4,py2=y+5,on=n<lit;g.fillStyle=on?'#8ec8e8':'#3a3652';g.fillRect(px2,py2-1,1,3);g.fillRect(px2-1,py2,3,1);if(on){g.fillStyle='#ffffff';g.fillRect(px2,py2,1,1);}}
  g.restore();
  // lleno: anillo y estrellitas
  if(full>0&&full<1){paintRing(x,y-14,full,col,24);if(sh)for(let n=0;n<6;n++){const a=n/6*6.283+i,d=12+full*14;g.globalAlpha=1-full;g.fillStyle=n%2?col:'#fff8e6';const sx=Math.round(x+Math.cos(a)*d),sy=Math.round(y-14+Math.sin(a)*d);g.fillRect(sx-1,sy,3,1);g.fillRect(sx,sy-1,1,3);}g.globalAlpha=1;}
}
function drawRinseUI() {
  const J=OW.jar;if(!J||!MAP.jar)return;
  const after=!OW.heal&&J.toast>0&&!OW.msg&&!OW.menu&&!OW.ring;if(!OW.heal&&!after)return;
  if(OW.heal)drawRinseSpotlight();
  const k=OW.heal?clamp((J.focus||0)*1.4,0,1):clamp((J.toast-95)/25,0,1),t=J.clock,e=Prefs.shake?easeBack(k):k;
  const [gx,gy]=rinseScreen(MAP.jar.x*TILE+16,MAP.jar.y*TILE+RINSE.oy+RINSE.surface+30);
  // una balda de madera abajo a la izquierda, fuera del vaso y del grupo
  { const y=Math.round(H-5+(1-e)*60);g.fillStyle='#3a2a22';g.fillRect(4,y-1,122,6);g.fillStyle='#8a6440';g.fillRect(4,y-2,122,4);g.fillStyle='#b88a5a';g.fillRect(4,y-2,122,1);g.fillStyle='#5a3e2a';g.fillRect(8,y+2,3,5);g.fillRect(119,y+2,3,5); }
  Party.forEach((p,i)=>{
    const s=effStats(p),gn=J.gain[i],q=gn?clamp((J.clock-gn.at)/40,0,1):1,ez=1-(1-q)**3,hp=gn?lerp(gn.hp0,gn.hp,ez):p.cur.hp,mp=gn?lerp(gn.mp0,gn.mp,clamp((J.clock-gn.at-8)/40,0,1)):p.cur.mp;
    const x=26+i*39,y=Math.round(H-12+(1-e)*60),filling=!!gn&&q<1;
    // el chorro: gotas de su color que saltan del vaso a su frasco
    if(gn&&J.clock-gn.at<44)for(let n=0;n<14;n++){const u=(J.clock-gn.at-n*2)/22;if(u<0||u>1)continue;const cx2=lerp(gx,x,u),cy2=lerp(gy,y-18,u)-Math.sin(u*Math.PI)*34,rr=n%3?1:2;g.fillStyle=n%4?C(p.color):'#fff8e6';g.fillRect(Math.round(cx2),Math.round(cy2),rr,rr+1);}
    if(gn&&q>=1&&!J.full[i])J.full[i]=J.clock;
    const full=J.full[i]?clamp((J.clock-J.full[i])/24,0,1):0;
    drawRinseVial(i,x,y,hp/s.hp,mp/s.mp,t,filling,full>0&&full<1?full:0);
  });
  // al terminar: el grupo da un saltito con chispas (el mapa ya ha vuelto)
  if(after&&J.toast>110&&Prefs.shake){const q=(150-J.toast)/40;Party.forEach((p,i)=>{const h=OW.hist[Math.min(OW.hist.length-1,i*12)],wx=i?h?.[0]??OW.x:OW.x,wy=i?h?.[1]??OW.y:OW.y,x=wx-OW.cam.x,y=wy-OW.cam.y-14-Math.sin(q*Math.PI)*6;
    for(let n=0;n<4;n++){const a=n/4*6.283+q*3+i,d=6+q*8;g.globalAlpha=1-q;g.fillStyle=n%2?C(p.color):'#fff8e6';const sx=Math.round(x+Math.cos(a)*d),sy=Math.round(y+Math.sin(a)*d*.6);g.fillRect(sx-1,sy,3,1);g.fillRect(sx,sy-1,1,3);}g.globalAlpha=1;});}
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
  J.phase='focus';J.gain=[null,null,null];J.full=[0,0,0];J.bursts=[];J.tint=[];J.inside=[0,0,0];J.hidden=[false,false,false];J.clean=[false,false,false];J.charge=0;J.clarity=0;J.toast=0;
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
      J.gain[i]={hp0:s.hp-dh,mp0:s.mp-dm,hp:s.hp,mp:s.mp,dh,dm,at:J.clock};Audio.sfx('tinkle',{semi:[0,4,7][i]+12,vol:.3,when:.35});
      for(let n=1;n<=24;n++){
        const q=n/24;J.jump[i]=[lerp(cx+(i-1)*4,to[0],q),lerp(sy+6,to[1],q),Math.sin(q*Math.PI)*(30+i*3),Math.sin(q*Math.PI*2)*(1-i)*.12,.93,1.08];yield;
      }
      J.jump[i]=null;Audio.sfx('plop',{semi:[0,4,7][i],vol:.28});Audio.sfx('tinkle',{semi:[0,4,7][i],vol:.35});
      rinseBurst(i,to);
      for(let n=0;n<8;n++){J.squash[i]=Math.sin((n+1)/8*Math.PI)*.65;yield;}J.squash[i]=0;
    }
    J.phase='settle';
    for(let n=0;n<24;n++){rinseFocus(1-(n+1)/24,cam);J.clarity=1;yield;}
    J.visits++;J.toast=150;J.gain=[null,null,null];J.full=[0,0,0];
  } finally {
    J.phase='idle';J.zoom=1;J.focus=0;J.glow=0;J.charge=0;J.clarity=0;J.inside=[0,0,0];J.hidden=[false,false,false];J.jump=[null,null,null];J.squash=[0,0,0];J.tint=[];J.cd=1;
    OW.hist=hist;OW.cam.x=cam.x;OW.cam.y=cam.y;OW.vx=OW.vy=0;OW.moving=false;
  }
}
