// The battle kit: ink frames, painted tabs and readable paper at native 320×180.
'use strict';
const UI_INK = '#302a3b', UI_MUTED = '#706452', UI_LINE = '#cfbea0', UI_PAPER = '#f4eddc';
const COLOR_LETTER = { rojo:'R', amarillo:'A', azul:'Z', naranja:'N', verde:'V', violeta:'P', negro:'T', blanco:'*' };
function quietPaper(x, y, w, h, accent) {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = '#1b1725'; g.globalAlpha = .22; g.fillRect(x + 1, y + 3, w, h); g.globalAlpha = 1;
  g.fillStyle = UI_PAPER; g.fillRect(x, y, w, h);
  g.fillStyle = '#fff9ec'; g.fillRect(x + 1, y, w - 2, 1);
  g.fillStyle = UI_LINE; g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y + 1, 1, h - 1);
  // Texture stays at the paper's edge, away from letters and values.
  for (let i = 7; i < w - 8; i += 23) { g.fillRect(x + i, y + h - 3, 1, 1); g.fillRect(x + i + 3, y + 2, 1, 1); }
  g.fillStyle = '#ded1b7'; g.beginPath(); g.moveTo(x + w - 6, y + h - 1); g.lineTo(x + w - 1, y + h - 6); g.lineTo(x + w - 1, y + h - 1); g.fill();
  if (accent) { g.fillStyle = accent; g.fillRect(x + 2, y + 3, 2, h - 7); }
}
function colorChip(col, x, y, size = 9) {
  const c = C(col), dark = col === 'amarillo' || col === 'blanco';
  g.fillStyle = c; g.fillRect(x, y, size, size); smallText(COLOR_LETTER[col], x + Math.floor((size - textWidth(COLOR_LETTER[col])) / 2), y + 1, dark ? '#4d391f' : '#fff9ed');
}
function paintTrack(x, y, w, f, col, trail) {
  g.fillStyle = '#ded4be'; g.fillRect(x, y, w, 5);
  if (trail != null) { g.fillStyle = '#ceb090'; g.fillRect(x, y, Math.round(w * trail), 5); }
  const n = Math.round(w * clamp(f, 0, 1)); if (n < 1) return;
  g.fillStyle = col; g.fillRect(x, y, n, 5); g.fillStyle = ramp(col).hi; g.fillRect(x, y, Math.max(0, n - 1), 1);
  if (n > 3) { g.fillStyle = UI_PAPER; g.fillRect(x + n - 1, y, 1, 1); g.fillRect(x + n - 2, y + 4, 2, 1); }
}
// Decoration lives on panel edges. Opaque surfaces keep the world out of text.
const KIT_INK = '#241e32', KIT_EDGE = '#78667f', KIT_LIGHT = '#fff1d2', KIT_SOFT = '#c9bec9';
// Short keycaps keep remapped physical keys inside the battle's small buttons.
function battleKey(action) { const label = keyLabel(action); return textWidth(label) <= 19 ? label : label.slice(0, 3); }
function brushBand(x, y, w, h, col) {
  g.fillStyle = col; g.fillRect(x + 2, y + 1, w - 4, h - 2);
  for (let row = 0; row < h; row++) {
    const inset = row === 0 || row === h - 1 ? 4 : row % 3;
    g.fillRect(x + inset, y + row, w - inset - (row * 3 % 4), 1);
  }
}
function kitPanel(x, y, w, h, paper = false) {
  g.fillStyle = '#15111f'; g.fillRect(x + 1, y + 2, w, h);
  g.fillStyle = KIT_EDGE; g.fillRect(x, y, w, h);
  g.fillStyle = paper ? UI_PAPER : KIT_INK; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = paper ? '#fff9eb' : '#4a3a53'; g.fillRect(x + 2, y + 1, w - 4, 1);
  // Worn corners and a double stitch belong to the painter's travel case.
  g.fillStyle = paper ? '#d4c4a4' : '#9c8273';
  g.fillRect(x + 2, y + h - 3, 3, 1); g.fillRect(x + w - 5, y + h - 3, 3, 1);
}
function accentInk(col) {
  const luminance=c=>hexRgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const bg=luminance(col),dark=luminance(KIT_INK),light=luminance('#fff9ed');
  return (Math.max(bg,dark)+.05)/(Math.min(bg,dark)+.05)>=(Math.max(bg,light)+.05)/(Math.min(bg,light)+.05)?KIT_INK:'#fff9ed';
}
function kitBar(x, y, w, f, col, trail) {
  g.fillStyle = '#cfc1a9'; g.fillRect(x, y, w, 3);
  if (trail != null) { g.fillStyle = '#b78479'; g.fillRect(x, y, Math.round(w * clamp(trail, 0, 1)), 3); }
  const n = Math.round(w * clamp(f, 0, 1));
  g.fillStyle = col; g.fillRect(x, y, n, 3);
  g.fillStyle = ramp(col).sh; g.fillRect(x, y + 2, n, 1);
}
// Visual events never alter the combat clock, input, RNG or resource values.
const BUI = { party:null, cards:new Map(), motes:[], serial:0, selection:'', selectedAt:-99, openedAt:-99, action:null, actionAt:-99, closing:null, cursor:null, reticle:null, listY:null, resultAt:-99, showResult:false };
const PALETTE_ORIGIN = {x:3,y:36};
const onPalette = m => ['cmd','tech','item'].includes(m?.level);
function uiAge(at, duration) { return clamp((B.t - (at ?? -999)) / duration, 0, 1); }
function uiPop(at, duration = 14) { return Prefs.shake ? Math.sin(uiAge(at, duration) * Math.PI) * (1 - uiAge(at, duration)) * Prefs.shake : 0; }
// Entrances: 0 → 1 with a small overshoot, and a plain fade. "Sin sacudidas" skips both.
// easeBack covers most of its travel early, so durations are stretched by UI_TEMPO to keep the motion readable.
const UI_TEMPO = 2.6;
// easeBack(0) is a rounding hair below zero; entrances never hand negative radii to the canvas.
function uiIn(at, duration = 18, delay = 0) { return Prefs.shake ? Math.max(0, easeBack(uiAge((at ?? -999) + delay, duration * UI_TEMPO))) : 1; }
function uiFade(at, duration = 12, delay = 0) { return Prefs.shake ? uiAge((at ?? -999) + delay, duration) : 1; }
function artIn(at, duration = 18, delay = 0) { return Prefs.shake ? Math.max(0, easeBack(clamp((ARTUI.t - (at ?? -999) - delay) / (duration * UI_TEMPO), 0, 1))) : 1; }
function artFade(at, duration = 12, delay = 0) { return Prefs.shake ? clamp((ARTUI.t - (at ?? -999) - delay) / duration, 0, 1) : 1; }
function glide(point, tx, ty, k = .38) { if (!point || !Prefs.shake) return { x: tx, y: ty }; point.x += (tx - point.x) * k; point.y += (ty - point.y) * k; if (Math.abs(point.x - tx) < .3) point.x = tx; if (Math.abs(point.y - ty) < .3) point.y = ty; return point; }
function paintMotes(x, y, col, count = 5) {
  if (!Prefs.shake) return;
  for (let i = 0; i < count; i++) {
    const a = (i * 2.4 + ++BUI.serial * .7), speed = .35 + (i % 3) * .2;
    BUI.motes.push({x,y,col,vx:Math.cos(a)*speed,vy:-.4-Math.abs(Math.sin(a))*speed,at:B.t});
  }
  BUI.motes = BUI.motes.slice(-60);
}
function observeBattleFeedback() {
  if (BUI.party !== B.party) {
    BUI.party = B.party; BUI.cards.clear(); BUI.motes.length = 0; BUI.selection = ''; BUI.lastMenu = null; BUI.action = null; BUI.closing = null; BUI.message = null; BUI.selectedAt = BUI.openedAt = BUI.paletteAt = BUI.actionAt = BUI.deniedAt = BUI.resultAt = -99; BUI.serial = 0; BUI.cursor = null; BUI.reticle = null; BUI.listY = null; BUI.showResult = false; BUI.brushAngle = null; BUI.boss = null;
    B.party.forEach(u => BUI.cards.set(u, { hp:u.hp, mp:u.mp, trail:u.hp, ready:u.atb>=100, step:B.t, hit:-99, heal:-99, squeeze:-99, readyAt:-99, koAt:-99 }));
  }
  B.party.forEach((u, i) => {
    const c = BUI.cards.get(u), x = 3 + i * 106;
    if (u.hp !== c.hp) {
      if (u.hp < c.hp) { c.hit = B.t; c.trail = Math.max(c.trail, c.hp); paintMotes(x + 49, 169, '#d97076'); }
      else { c.heal = B.t; paintMotes(x + 15, 161, '#8fba70'); }
      c.hp = u.hp;
    }
    if (u.mp !== c.mp) { c.squeeze = B.t; c.mpFrom = c.mp; paintMotes(x + 100, 169, u.mp < c.mp ? C(u.color) : '#9abadd'); c.mp = u.mp; }
    const ready = u.alive && u.atb >= 100 && !u.acting;
    if (ready && !c.ready) { c.readyAt = B.t; paintMotes(x + 17, 153, C(u.color), 7); }
    c.ready = ready;
    if (!u.alive && c.alive !== false) { c.koAt = B.t; } c.alive = u.alive;
    if (c.step !== B.t) { if (B.t - c.hit > 18) c.trail = Prefs.shake ? lerp(c.trail, u.hp, 1-Math.pow(.85,Math.max(1,B.t-c.step))) : u.hp; c.step = B.t; }
  });
  const m = B.currentAction ? null : B.menu, selection = m ? [m.unit.id,m.level,m.idx,m.tidx].join(':') : '';
  if (selection !== BUI.selection) {
    if (!BUI.lastMenu || !m || BUI.lastMenu.level !== m.level || BUI.lastMenu.unit !== m.unit) { BUI.openedAt = B.t; BUI.listY = null; if (onPalette(m) && (!onPalette(BUI.lastMenu) || BUI.lastMenu.unit !== m.unit)) BUI.paletteAt = B.t; if (onPalette(m)) { const pos = PALETTE_TOOLS[paletteSlot(m)]; BUI.cursor = { x: pos[0], y: pos[1] }; BUI.brushAngle = null; } }
    if (!onPalette(m) && onPalette(BUI.lastMenu)) BUI.closing = {...BUI.lastMenu,at:B.t};
    if (m?.level === 'target' && BUI.lastMenu?.level !== 'target') BUI.reticle = null;
    BUI.selection = selection; BUI.selectedAt = B.t;
    if (onPalette(m)) { const pos = PALETTE_TOOLS[paletteSlot(m)]; paintMotes(PALETTE_ORIGIN.x+pos[0],PALETTE_ORIGIN.y+pos[1],C(m.unit.color),4); }
  }
  BUI.lastMenu = m ? {unit:m.unit,level:m.level,idx:m.idx,scroll:m.scroll} : null;
  if (B.currentAction !== BUI.action) { BUI.action = B.currentAction; BUI.actionAt = B.t; }
  if (B.msg !== BUI.message) {
    BUI.message = B.msg; BUI.messageAt = B.t;
    if (m && B.msg && /falta|caído|reservado|no está/i.test(B.msg.s)) { BUI.deniedAt = B.t; BUI.cards.get(m.unit).squeeze = B.t; }
  }
  if (!!B.showResult !== BUI.showResult) { BUI.showResult = !!B.showResult; if (B.showResult) BUI.resultAt = B.t; }
  BUI.motes = BUI.motes.filter(p => B.t - p.at < 22);
}
function battlePointerFeedback(x,y) { if(Prefs.shake)paintMotes(x,y,C(B.menu?.unit.color||'amarillo'),3); }
function drawPaintMotes() {
  if (!Prefs.shake) return;
  for (const p of BUI.motes) { const t = B.t - p.at; g.fillStyle = p.col; g.globalAlpha = 1 - t / 22; g.fillRect(Math.round(p.x+p.vx*t), Math.round(p.y+p.vy*t+t*t*.022), t<8?2:1, t<8?2:1); }
  g.globalAlpha = 1;
}
// Real paint has a raised edge, an irregular body and a tiny wet highlight.
function paintDab(x, y, r, col, pulse = 0) {
  r += pulse; if (r < 1) return;
  g.fillStyle = KIT_INK; g.beginPath(); g.ellipse(x, y + 1, r + 1, r * .73 + 1, -.12, 0, 6.29); g.fill();
  g.fillStyle = ramp(col).sh; g.beginPath(); g.ellipse(x, y + 1, r, r * .73, -.12, 0, 6.29); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(x - 1, y - 1, Math.max(.5, r - 1), r * .6, -.12, 0, 6.29); g.fill();
  g.fillStyle = ramp(col).hi; g.fillRect(Math.round(x-r*.5), Math.round(y-r*.36), Math.max(2,Math.round(r*.6)), 1);
}
function maskingLabel(x, y, w, h, color = UI_PAPER) {
  brushBand(x + 1, y + 2, w, h, '#30273d'); brushBand(x, y, w, h, color);
  g.fillStyle = '#d0bfa0'; g.fillRect(x + 4, y + h - 2, Math.max(0,w - 11), 1);
}
// A closing ring of paint: confirmations and stamps share it.
function paintRing(x, y, k, col, r = 18) {
  if (k <= 0 || k >= 1 || !Prefs.shake) return;
  g.strokeStyle = col; g.lineWidth = 2 - k; g.globalAlpha = (1 - k) * .9; g.beginPath(); g.ellipse(x, y, 4 + r * k, (4 + r * k) * .7, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1;
}
function selectedPaintCost(u) {
  const m = B.currentAction ? null : B.menu; if (!m) return 0;
  const p = m.level === 'target' ? m.pending : m.level === 'tech' ? {type:'tech',techId:techsFor(m.unit)[m.idx]?.id} : m.level==='cmd'&&m.idx===3?{type:'role'}:null;
  if (p?.type === 'tech' && p.techId) { const t = techData(p.techId); return (t.users || [t.user]).includes(u.id) ? techCost(u,t) : 0; }
  return p?.type === 'role' && u === m.unit ? ROLE_ACTIONS[u.id].mp : 0;
}
// An oil tube lying along the card. What is left sits against the cap; what was spent
// is flattened and rolled up from the crimped tail, as a painter would. The label near
// the cap carries the number; a preview shows the stretch about to be squeezed.
function paintTube(x, y, u, c, cost) {
  const col=u.alive?C(u.color):'#8d8390',rp=ramp(col),tail=x,cap=x+64,H=9,L=cap-(tail+5);
  if(c.mpStep!==B.t){c.mpShow=c.mpShow==null||!Prefs.shake?u.mp:lerp(c.mpShow,u.mp,.18);if(Math.abs(c.mpShow-u.mp)<.05)c.mpShow=u.mp;c.mpStep=B.t;}
  const f=clamp(c.mpShow/u.maxmp,0,1),body=Math.round(L*f),start=cap-body,squeeze=Prefs.shake?Math.round(uiPop(c.squeeze,22)):0;
  // Crimped tail: a flat, ridged end that never goes away.
  g.fillStyle=KIT_INK;g.fillRect(tail,y,5,H);g.fillStyle='#bdb5aa';g.fillRect(tail+1,y+1,3,H-2);g.fillStyle='#8f8779';for(let k=0;k<3;k++)g.fillRect(tail+1,y+1+k*2,3,1);
  // The spent part: flattened aluminium with creases, and a curl where it is rolled.
  if(start>tail+5){const w=start-tail-5;g.fillStyle=KIT_INK;g.fillRect(tail+5,y+2,w,4);g.fillStyle='#b7afa4';g.fillRect(tail+5,y+3,w,2);g.fillStyle='#8f8779';for(let k=tail+7;k<start-2;k+=4)g.fillRect(k,y+3,1,2);
    g.fillStyle=KIT_INK;g.beginPath();g.arc(start,y+4,4,0,6.29);g.fill();g.fillStyle='#d6cfc3';g.beginPath();g.arc(start,y+4,2.8,0,6.29);g.fill();g.fillStyle='#8f8779';g.fillRect(start-1,y+4,3,1);g.fillRect(start,y+3,1,1);}
  // The full part: coloured body with a light top and a darker belly; it bulges when squeezed.
  if(body>0){const top=y-squeeze,h=H+squeeze*2;
    g.fillStyle=KIT_INK;g.fillRect(start,top,body+1,h);g.fillStyle=col;g.fillRect(start+1,top+1,body,h-2);
    g.fillStyle=rp.hi;g.fillRect(start+1,top+1,body,1);g.fillStyle=mixHex(col,rp.sh,.5);g.fillRect(start+1,top+h-3,body,1);g.fillStyle=rp.sh;g.fillRect(start+1,top+h-2,body,1);
    g.fillStyle='#fff6e2';g.fillRect(start+2,top+2,Math.min(4,body-1),1);
    // The stretch a command would spend: pale and breathing, from the rolled end inward.
    if(cost){const n=Math.min(body,Math.max(2,Math.round(L*Math.min(cost,u.mp)/u.maxmp))),over=cost>u.mp,pulse=Prefs.shake?.4+.2*Math.sin(B.t*.2):.55;
      g.fillStyle=over?'#ec8993':mixHex(col,'#fff6e2',pulse);g.fillRect(start+1,top+1,n,h-2);g.fillStyle=over?'#a12f42':mixHex(col,'#fff6e2',pulse*.5);g.fillRect(start+n,top+1,1,h-2);}}
  // Tapered shoulder and ribbed cap.
  g.fillStyle=KIT_INK;g.fillRect(cap,y,3,H);g.fillRect(cap+3,y+1,7,H-2);g.fillStyle='#cfc7bb';g.fillRect(cap+1,y+1,2,H-2);g.fillStyle='#3b3346';g.fillRect(cap+4,y+2,5,H-4);g.fillStyle='#6a6076';g.fillRect(cap+5,y+2,1,H-4);g.fillRect(cap+7,y+2,1,H-4);
  // The label carries what is left; a small tag in front of it says what would be spent.
  const n=String(u.mp),nw=textWidth(n)+5,lx=cap-nw-1;
  g.fillStyle=KIT_INK;g.fillRect(lx-1,y,nw+2,H);g.fillStyle=u.mp?'#fff2cf':'#f3d9d9';g.fillRect(lx,y+1,nw,H-2);textCenter(n,lx+nw/2,y+1,u.mp?UI_INK:'#a73445');
  if(cost){const tag='-'+cost,tw=textWidth(tag)+5,tx=lx-tw-2,over=cost>u.mp;g.fillStyle=KIT_INK;g.fillRect(tx-1,y,tw+2,H);g.fillStyle=over?'#f3c7cb':'#f7dfad';g.fillRect(tx,y+1,tw,H-2);textCenter(tag,tx+tw/2,y+1,over?'#a12f42':'#6b4a1c');}
  // A bead of paint leaves the nozzle when the tube is squeezed.
  const age=B.t-c.squeeze;if(Prefs.shake&&age>=0&&age<16&&u.mp<(c.mpFrom??u.mp+1)){g.fillStyle=col;g.fillRect(cap+10,y+3+Math.round(age*.4),2,2);}
}
function drawATBBrush(x,y,u,c,reserved) {
  const ready=u.alive&&u.atb>=100&&!u.acting,col=reserved?'#ad8dcc':u.alive?C(u.color):'#877b87',rp=ramp(col);
  // The turn is the widest stroke on the card: a groove the length of the card that a
  // working brush fills with the drop's colour. Full, the brush is gone and the paint shines.
  const len=97,end=Math.round((len-2)*clamp(u.atb/100,0,1));
  g.fillStyle=KIT_INK;g.fillRect(x,y,len,5);g.fillRect(x+1,y-1,len-2,1);g.fillRect(x+1,y+5,len-2,1);
  g.fillStyle='#635663';g.fillRect(x+1,y,len-2,5);
  g.fillStyle='#57495a';for(let i=6;i<len-3;i+=12)g.fillRect(x+i,y+3,3,1); // dry grain in the groove
  if(end>0){
    g.fillStyle=col;g.fillRect(x+1,y,end,5);
    // Bristle streaks: the wet edge is ragged, a little longer on the middle hairs.
    g.fillStyle=mixHex(col,rp.sh,.45);for(let i=3,k=0;i<end-2;i+=5+(k*7)%6,k++)g.fillRect(x+1+i,y+3+(k&1),2+(k*3)%4,1);
    g.fillStyle=rp.hi;g.fillRect(x+1,y,end,1);
    if(!ready){g.fillStyle=col;g.fillRect(x+1+end,y+1,1,3);g.fillRect(x+2+end,y+2,1,1);}
  }
  if(ready){
    // A glint travels along the finished stroke.
    const gx=Prefs.shake?((B.t*2)%(len+30))-15:len-12;
    if(gx>0&&gx<len-4){g.fillStyle='#fff7df';g.fillRect(x+gx,y+1,4,1);g.fillRect(x+gx+1,y+2,2,1);}
    // The end of a full stroke keeps a wet bead that catches the light.
    g.fillStyle=rp.hi;g.fillRect(x+len-4,y+1,2,3);g.fillStyle='#fff7df';g.fillRect(x+len-4,y+1,1,1);
    if(Prefs.shake&&uiAge(c.readyAt,24)<1){g.fillStyle=reserved?'#ddc6f3':'#fff4c4';g.fillRect(x+len-2,y-3,1,1);g.fillRect(x+len+1,y-1,1,1);g.fillRect(x+len-6,y-2,1,1);}
  }else{
    const tip=x+1+end;
    g.fillStyle=KIT_INK;g.fillRect(tip-1,y-2,11,4);g.fillStyle='#8d563b';g.fillRect(tip+4,y-1,6,2);g.fillStyle='#e4b774';g.fillRect(tip+4,y-1,6,1);
    g.fillStyle='#e6dfcf';g.fillRect(tip+2,y-2,2,4);g.fillStyle='#ae9775';g.fillRect(tip,y-1,2,3);
  }
}
function unitStateLabels(u) { const labels=Object.keys(u.status).filter(k=>STATUS_INFO[k]).map(k=>STATUS_INFO[k][0]+u.status[k]);if(u.guard?.charges)labels.push('P1');return labels; }
// Card states are tiny material glyphs with one pip per remaining action: a drip, a smudge, a pencil frame, a red flourish, a shield arc.
function drawStatusIcons(u,x,y) {
  const items=[];
  if(u.status.lento)items.push(['lento',u.status.lento]);if(u.status.tiznado)items.push(['tiznado',u.status.tiznado]);if(u.status.contorno)items.push(['contorno',u.status.contorno]);if(u.status.firmado)items.push(['firmado',u.status.firmado]);
  if(u.guard?.charges)items.push(['guard',u.guard.charges]);
  if(!items.length)return;
  maskingLabel(x,y,Math.min(23,items.length*8+1),10);
  items.slice(0,3).forEach(([kind,turns],i)=>{
    const ix=x+2+i*8,iy=y+1;
    if(kind==='lento'){g.fillStyle='#6a4d8a';g.fillRect(ix+2,iy,1,2);g.fillRect(ix+1,iy+2,3,3);g.fillStyle='#b796d0';g.fillRect(ix+1,iy+3,1,1);}
    else if(kind==='tiznado'){g.fillStyle='#1e1a2c';g.fillRect(ix,iy+2,5,2);g.fillRect(ix+1,iy+1,2,1);g.fillRect(ix+3,iy+4,2,1);}
    else if(kind==='contorno'){g.fillStyle='#4a4460';g.fillRect(ix,iy,2,1);g.fillRect(ix+3,iy,2,1);g.fillRect(ix,iy+4,2,1);g.fillRect(ix+3,iy+4,2,1);g.fillRect(ix,iy+2,1,1);g.fillRect(ix+4,iy+2,1,1);}
    else if(kind==='firmado'){const c=C('rojo');g.fillStyle=c;g.fillRect(ix,iy+3,1,2);g.fillRect(ix+1,iy+1,1,2);g.fillRect(ix+2,iy+3,1,2);g.fillRect(ix+3,iy,1,3);g.fillRect(ix+4,iy+3,1,1);}
    else{const c=C('rojo');g.fillStyle=c;g.fillRect(ix+3,iy,2,1);g.fillRect(ix+2,iy+1,1,3);g.fillRect(ix+3,iy+4,2,1);g.fillStyle=ramp(c).hi;g.fillRect(ix+3,iy+1,1,1);}
    g.fillStyle='#79435b';for(let k=0;k<Math.min(3,turns);k++)g.fillRect(ix+k*2,iy+7,1,1);
  });
}
function drawPartyCards() {
  if (BUI.party !== B.party) observeBattleFeedback();
  B.party.forEach((u, i) => {
    const c = BUI.cards.get(u), x = 3 + i * 106, y = 150, col = C(u.color), cost = selectedPaintCost(u);
    const active = B.menu?.unit === u || u.acting, ready = u.alive && u.atb >= 100 && !u.acting, reserved = isReserved(u), low = u.alive && u.hp < u.maxhp * .25;
    // Each card rises from below the page when the fight begins and slips away for the results.
    const rise = Math.round((1 - uiIn(B.fightStart, 15, i * 6)) * 40) + Math.round(uiFade(BUI.resultAt, 18, i * 4) * 44 * (B.showResult ? 1 : 0));
    g.save(); g.translate(0, rise);
    // Three individual stickers and tubes; the continuous HUD slab is gone.
    maskingLabel(x + 24, y, 78, 15, !u.alive ? '#d8d0c4' : UI_PAPER);
    const bounce = Math.round(uiPop(c.readyAt) * 3), jolt = Prefs.shake && uiAge(c.hit, 12) < 1 ? Math.round(Math.sin((B.t-c.hit)*1.8)*2*(1-uiAge(c.hit,12))) : 0;
    if (active || reserved) { g.fillStyle = reserved ? '#b796d0' : col; g.beginPath(); g.arc(x+13,y+10,12,0,6.29); g.fill(); if (active && Prefs.shake) { g.fillStyle = ramp(reserved ? '#b796d0' : col).hi; g.fillRect(x+6, y+3, 2, 1); g.fillRect(x+4, y+5, 1, 2); } }
    paintRing(x+13, y+10, uiAge(c.readyAt, 18), col, 16);
    g.save(); g.translate(x+13+jolt,y+10-bounce); g.rotate(uiPop(c.hit,12)*.12); sticker(0,0,u,10); g.restore();
    smallText(u.name, x + 29, y + 2, u.alive ? UI_INK : UI_MUTED);
    const hpText = String(u.hp), hx = x + 97 - textWidth(hpText); // the stroke below already shows the maximum
    textRight(hpText, x + 97, y + 2, low ? '#a12f42' : u.alive ? UI_INK : UI_MUTED);
    // The heart beats faster when the paint is running out.
    const beat = low && Prefs.shake ? ((B.t >> 3) & 1 ? 1 : 0) : 0, hy = y + 3 - beat, ht = hx - 7;
    g.fillStyle = low ? (beat ? '#d24d5e' : '#a04750') : '#a04750'; g.fillRect(ht,hy,2,2);g.fillRect(ht+3,hy,2,2);g.fillRect(ht,hy+2,5,1);g.fillRect(ht+1,hy+3,3,1);g.fillRect(ht+2,hy+4,1,1);
    // HP is a thick, wet stroke along the bottom of the tape. Lost paint lingers before drying away.
    g.fillStyle = '#a89a88'; g.fillRect(x + 28, y + 11, 70, 2);
    g.fillStyle = '#dfa495'; g.fillRect(x + 28, y + 11, Math.round(70*c.trail/u.maxhp), 2);
    g.fillStyle = low ? '#b23749' : col; g.fillRect(x + 28, y + 11, Math.round(70*u.hp/u.maxhp), 2);
    if (low) { g.fillStyle = '#c4384a'; g.globalAlpha = .35; g.beginPath(); g.ellipse(x+62, y+6, 6, 4, .4, 0, 6.29); g.fill(); g.globalAlpha = 1; }
    if (Prefs.shake && uiAge(c.hit, 20) < 1) { g.fillStyle = '#c4384a'; g.globalAlpha = 1 - uiAge(c.hit, 20); for (let k = 0; k < 4; k++) g.fillRect(x + 48 + ((k * 13) % 26), y + 1 + ((k * 7) % 5), 1 + (k & 1), 1); g.globalAlpha = 1; }
    paintTube(x+27,y+15,u,c,cost);
    drawStatusIcons(u,x+1,y+14);
    // An enemy's ink thread reaches the portrait too: a drop hangs from the sticker while the attack is announced.
    if (u.alive && B.enemies.some(e => e.alive && e.intent && !e.acting && (e.intent.all || e.intent.target === u))) { const wob = Prefs.shake ? Math.round(Math.sin(B.t * .3)) : 0; g.fillStyle = '#2a2438'; g.fillRect(x+3, y-4+wob, 1, 2); g.fillRect(x+2, y-2+wob, 3, 3); g.fillRect(x+3, y+1+wob, 1, 1); g.fillStyle = '#8c8ab0'; g.fillRect(x+2, y-1+wob, 1, 1); }
    drawATBBrush(x+3,174,u,c,reserved);
    if(ready&&Prefs.shake&&uiAge(c.readyAt,24)<1){g.fillStyle=KIT_LIGHT;g.fillRect(x+4,148-bounce,2,2);g.fillRect(x+20,148+bounce,1,2);}
    if (!u.alive) { const k = uiIn(c.koAt, 14); g.save(); g.translate(x+13, y+12); g.rotate(-.2 * k); g.scale(1 + (1 - k) * .8, 1 + (1 - k) * .8); maskingLabel(-10,-5,20,10,'#f3d9d9');smallText('KO',-6,-3,'#a12f42'); g.restore(); }
    g.restore();
    uiHit(x, y-2, 103, 32, () => {
      if(B.currentAction||B.actions.length||B.actQueue.length)return;
      const m = B.menu;
      if (m?.level === 'target') { const targets=validTargets(m.pending,m.unit);if(targets.includes(u)){if(targetGroup(m.pending,m.unit)||targets[m.tidx]===u)pressed.ok=true;else{m.tidx=targets.indexOf(u);Audio.sfx('cursor');}return;} }
      selectBattlePainter(u);
    });
  });
}
function drawClock() {
  // The clock is a small stamped control, not a permanent information panel.
  maskingLabel(271,3,31,12); const stopped=battleClockStopped();g.fillStyle=UI_INK;
  if(stopped){g.fillRect(276,6,2,6);g.fillRect(280,6,2,6);}else{g.beginPath();g.moveTo(276,6);g.lineTo(282,9);g.lineTo(276,12);g.fill();}
  textRight(Prefs.speed+'x',298,6,UI_INK);uiHit(270,2,33,16,()=>openOverlay('settings'));
  paintDab(310,9,7,'#d8bb7c');smallText('?',308,6,UI_INK);uiHit(303,2,16,16,()=>openOverlay('guide'));
}
function selectionStroke(x,y,w,col){hilite(x+4,y+5,x+w-4,10,col,.2);dropCursor(x+1,y+2,col);}
function commandTool(row, u, x, y) {
  if(row[0]==='attack'){
    const prop=propSprite(u.data.weapon,C(u.color));g.save();g.translate(x+6,y+6);g.rotate(-.65);g.drawImage(prop,-10,-4,21,8);g.restore();return;
  }
  if(row[0]==='tech'){
    paintDab(x+2,y+3,4,'#e76b55');paintDab(x+10,y+3,4,'#edc65c');paintDab(x+6,y+10,4,'#638dcd');
    g.fillStyle=KIT_LIGHT;g.fillRect(x+5,y+3,2,5);g.fillRect(x+3,y+5,6,1);return;
  }
  if(row[0]==='reload'){
    g.fillStyle=KIT_INK;g.fillRect(x+2,y+2,8,10);g.fillRect(x+4,y,4,3);g.fillStyle='#dfd5bd';g.fillRect(x+3,y+3,6,8);g.fillStyle=C(u.color);g.fillRect(x+4,y+6,4,4);
    g.fillStyle=KIT_LIGHT;g.fillRect(x+9,y+1,6,3);g.fillRect(x+11,y-1,2,7);return;
  }
  if(row[0]==='item'){
    g.fillStyle=KIT_INK;g.fillRect(x,y+3,14,10);g.fillRect(x+3,y,8,4);g.fillStyle='#d4bd8a';g.fillRect(x+4,y+1,6,3);g.fillStyle='#8e6151';g.fillRect(x+1,y+4,12,8);
    g.fillStyle='#eacb92';g.fillRect(x+1,y+4,12,2);g.fillStyle=KIT_INK;g.fillRect(x+5,y+5,4,5);g.fillStyle='#fff0c9';g.fillRect(x+6,y+5,2,4);return;
  }
  if(row[0]==='role'&&u.id==='carmin') {g.fillStyle=KIT_INK;g.beginPath();g.moveTo(x+2,y);g.lineTo(x+11,y);g.lineTo(x+10,y+8);g.lineTo(x+6,y+12);g.lineTo(x+2,y+8);g.fill();g.fillStyle='#e9ddc0';g.fillRect(x+4,y+2,5,5);return;}
  if(row[0]==='role'&&u.id==='ambar'){
    g.fillStyle=KIT_INK;g.fillRect(x+1,y+1,12,12);g.fillStyle='#eedcaa';g.fillRect(x+2,y+2,10,10);
    g.fillStyle='#694a47';g.fillRect(x+4,y+4,2,5);g.fillRect(x+8,y+4,2,5);g.fillStyle='#f0bd3c';g.fillRect(x,y+10,7,2);g.fillRect(x+8,y,7,2);return;
  }
  g.drawImage(iconSprite(row[2],C(u.color)),x-2,y-2,16,16);
}
function paletteToolHint(row,u) {
  return row[0]==='attack'?DATA.weapons[u.data.weapon].desc:row[0]==='tech'?'Técnicas propias y mezclas con las otras gotas.':row[0]==='item'?'Estuche: agua, tubos, goma y savia.':row[0]==='role'?ROLE_ACTIONS[u.id].desc:'Exprime el tubo: +6 MP. Gasta la brocha.';
}
function activatePaletteTool(m,i) {
  if(B.menu!==m||m.level!=='cmd'||B.currentAction)return;
  if(!focusPaletteTool(m,i))pressed.ok=true;
}
// The painter's palette is the whole menu. A kidney of walnut with a thumb hole; the wells run down the far rim
// and each one has its name written beside it on the wood, so every choice reads at a glance. The painter's own
// brush dips into the chosen well and leaves a wet stroke of their colour under its name. Techniques and objects
// do not open another window: the palette is wiped and refilled with one well per technique or object.
const PALETTE_WELL_COLORS = ['#b46756','#748c59','#688daa','#98749e','#c49a52'];
const ITEM_WELL = { heal:'azul', mp:'amarillo', erase:'violeta', revive:'verde' };
// Small pictograms pressed into each object's well: a drop of water, a tube, an eraser, a leaf of sap.
function itemIcon(kind, x, y, col) {
  const F=(c,a,b,w=1,h=1)=>{g.fillStyle=c;g.fillRect(x+a,y+b,w,h);};
  if(kind==='heal'){F(KIT_INK,5,1,2,1);F(KIT_INK,4,2,4,1);F(KIT_INK,3,3,6,5);F(KIT_INK,4,8,4,1);F('#e8f2fb',5,2,2,1);F('#e8f2fb',4,3,4,4);F('#9fc3e6',4,6,4,2);F('#ffffff',4,3,1,2);}
  else if(kind==='mp'){F(KIT_INK,4,0,4,2);F(KIT_INK,3,2,6,8);F(KIT_INK,4,10,4,1);F('#dfd5bd',4,3,4,6);F(col,4,5,4,3);F(ramp(col).hi,4,5,1,3);F('#8c8ab0',5,1,2,1);}
  else if(kind==='erase'){F(KIT_INK,1,3,10,6);F('#f4f0ea',2,4,5,4);F('#e86a8a',7,4,3,4);F('#ffffff',2,4,4,1);}
  else{F(KIT_INK,5,1,3,1);F(KIT_INK,3,2,6,6);F(KIT_INK,2,5,3,4);F('#9fd07a',4,3,4,4);F('#b8e68a',5,3,2,1);F('#5f8f45',4,6,2,1);F('#6b4a33',2,8,2,2);}
}
function palettePath(x, y, grow = 0) {
  const {cx,cy,rx,ry,n}=PALETTE_SHAPE,sq=v=>Math.sign(v)*Math.abs(v)**(2/n);
  g.beginPath();
  for (let i = 0; i <= 80; i++) {
    const a = i / 80 * 6.283, dent = 1 - .07 * Math.exp(-((a - 5.75) ** 2) / .05), wob = 1 + .012 * Math.sin(a * 5 + 1.3);
    const px = x + cx + sq(Math.cos(a)) * (rx + grow) * dent * wob, py = y + cy + sq(Math.sin(a)) * (ry + grow) * dent * wob;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
  g.moveTo(x + 128 - grow * .3, y + 52); g.ellipse(x + 122, y + 52, 6 - grow * .3, 4.5 - grow * .3, -.2, 0, 6.283); // thumb hole (evenodd cuts it)
}
function battleListRows(m) { return m.level==='tech'?techsFor(m.unit):Object.entries(Game.inventory).filter(([,n])=>n>0).map(([id,n])=>({id,n,it:DATA.items[id]})); }
function battleListLayout(m) {
  const rows=battleListRows(m),count=Math.min(PALETTE_ROWS,rows.length);
  let top=m.scroll||0;if(m.idx<top)top=m.idx;else if(m.idx>=top+PALETTE_ROWS)top=m.idx-PALETTE_ROWS+1;
  m.scroll=clamp(top,0,Math.max(0,rows.length-PALETTE_ROWS));return{rows,count,top:m.scroll};
}
// Which rim slot holds the chosen entry.
function paletteSlot(m) { return m.level==='cmd'?m.idx:clamp(m.idx-(m.scroll||0),0,PALETTE_ROWS-1); }
// Every row of the palette, whatever it holds: a well of paint, a name and, on the right, what it costs.
function paletteEntries(m) {
  const u=m.unit;
  if(m.level==='cmd')return commandRows(u).map((row,i)=>{
    const role=row[0]==='role'?ROLE_ACTIONS[u.id]:null,cost=role?.mp?{text:String(role.mp),tube:true,short:u.mp<role.mp}:row[0]==='reload'?{text:'+6',tube:true}:null;
    return{name:row[1],col:PALETTE_WELL_COLORS[i],icon:(x,y)=>commandTool(row,u,x,y),cost,dim:!!cost?.short};
  });
  return battleListRows(m).map(row=>m.level==='tech'
    ?{name:row.t.name,col:C(row.col),mix:row.combo?row.users.map(p=>C(p.color)):null,cost:{text:String(row.cost),tube:true,short:!row.mpOk},dim:!(row.avail||row.reservable)}
    :{name:row.it.short,col:C(ITEM_WELL[row.it.kind]||'verde'),icon:(x,y)=>itemIcon(row.it.kind,x,y,C(m.unit.color)),cost:{text:'x'+row.n}});
}
function miniTube(x,y,col,dry) {
  g.fillStyle=KIT_INK;g.fillRect(x+1,y,3,1);g.fillRect(x,y+1,5,6);g.fillStyle=dry?'#b9aa9a':col;g.fillRect(x+1,y+2,3,4);g.fillStyle=dry?'#d5c9bb':ramp(col).hi;g.fillRect(x+1,y+2,1,3);
}
function drawPaletteWood(x, y) {
  // Shadow, dark rim, a light bevel on the upper edge and the oiled face; the hole goes all the way through.
  g.save();g.translate(1,3);palettePath(x,y,1);g.fillStyle='rgba(20,16,28,.45)';g.fill('evenodd');g.restore();
  palettePath(x,y,1);g.fillStyle='#201926';g.fill('evenodd');
  palettePath(x,y);g.fillStyle='#77492f';g.fill('evenodd');
  g.save();g.translate(-1,-1);palettePath(x,y,-1.5);g.fillStyle='#e6be83';g.fill('evenodd');g.restore();
  palettePath(x,y,-2.5);g.fillStyle='#c39660';g.fill('evenodd');
  // Grain rings the hole, and old pigment is caught in it where the painter mixes.
  g.save();palettePath(x,y,-2.5);g.clip('evenodd');
  for(let i=0;i<7;i++){g.strokeStyle=i%2?'#cda266':'#b3834f';g.lineWidth=1;g.beginPath();g.ellipse(x+122,y+52,18+i*13,10+i*8,-.1,1.9,4.4);g.stroke();}
  [['#ac554b',96,16,5],['#6a8d85',104,84,4],['#967287',118,32,3],['#e8cc94',84,94,4],['#5c7fa6',114,72,3]].forEach(([c,px,py,r])=>{g.globalAlpha=.55;g.fillStyle=c;g.beginPath();g.ellipse(x+px,y+py,r,r*.55,.3,0,6.29);g.fill();g.globalAlpha=1;g.fillStyle=ramp(c).hi;g.fillRect(x+px-1,y+py-1,2,1);});
  g.restore();
  g.strokeStyle='#4a2e20';g.lineWidth=1;g.beginPath();g.ellipse(x+122.5,y+52.5,6.5,5,-.2,3.4,6.2);g.stroke();g.strokeStyle='#e6be83';g.beginPath();g.ellipse(x+122,y+52,7.5,5.5,-.2,.3,2.6);g.stroke(); // lip and worn edge of the hole
}
// The masking tape stuck across the top edge says whose palette it is and, inside a list, which one.
function drawPaletteTape(m, x, y) {
  const col=C(m.unit.color),canChange=readyPainters().length>1,title=m.level==='tech'?'Técnicas':m.level==='item'?'Objetos':'';
  const nameW=textWidth(m.unit.name),titleW=title?textWidth(title)+12:0,key=battleKey('swap'),kw=textWidth(key)+14,w=nameW+titleW+30+(canChange?kw+4:0),tx=x+8,ty=y-2;
  maskingLabel(tx,ty,w,14);paintDab(tx+10,ty+7,7,col);sticker(tx+10,ty+7,m.unit,6);
  smallText(m.unit.name,tx+21,ty+4);
  if(title){const sx=tx+24+nameW;g.fillStyle=UI_MUTED;g.fillRect(sx,ty+4,1,1);g.fillRect(sx+1,ty+5,1,1);g.fillRect(sx+2,ty+6,1,1);g.fillRect(sx+1,ty+7,1,1);g.fillRect(sx,ty+8,1,1);smallText(title,sx+6,ty+4,UI_INK);}
  if(canChange){const bx=tx+w-kw-2;brushBand(bx,ty+1,kw,12,col);textCenter(key,bx+kw/2-2,ty+4,accentInk(col));g.fillStyle=accentInk(col);g.beginPath();g.moveTo(bx+kw-5,ty+4);g.lineTo(bx+kw-2,ty+7);g.lineTo(bx+kw-5,ty+10);g.fill();uiHit(tx,ty-1,w,16,cycleBattlePainter);}
}
// The keys live on a scrap of tape under the rim: what confirms and, inside a list, what goes back.
function drawPaletteKeys(m, x, y) {
  const col=C(m.unit.color),ok=battleKey('ok'),back=battleKey('back'),inList=m.level!=='cmd';
  const kw=Math.max(13,textWidth(ok)+6),bw=Math.max(13,textWidth(back)+6),w=kw+textWidth('elegir')+12+(inList?bw+textWidth('volver')+10:0),tx=x+PALETTE_SHAPE.cx-w/2,ty=y+PALETTE_SHAPE.cy+PALETTE_SHAPE.ry-6;
  maskingLabel(tx,ty,w,12);brushBand(tx+1,ty,kw,12,col);textCenter(ok,tx+1+kw/2,ty+3,accentInk(col));smallText('elegir',tx+kw+5,ty+3,UI_INK);
  uiHit(tx,ty-1,kw+textWidth('elegir')+8,14,()=>pressed.ok=true);
  if(inList){const bx=tx+kw+textWidth('elegir')+10;brushBand(bx,ty,bw,12,'#d3c5ac');textCenter(back,bx+bw/2,ty+3,UI_INK);smallText('volver',bx+bw+4,ty+3,UI_MUTED);uiHit(bx-1,ty-1,bw+textWidth('volver')+8,14,()=>pressed.back=true);}
}
function drawCommandPalette(m, ghost = false) {
  const {x,y}=PALETTE_ORIGIN,col=C(m.unit.color),list=m.level!=='cmd',entries=paletteEntries(m),top=list?(ghost?(m.scroll||0):battleListLayout(m).top):0,slot=paletteSlot(m);
  const intro=ghost?1:uiIn(BUI.paletteAt,14),wobble=ghost?0:uiPop(BUI.deniedAt,18)*3;
  if(!ghost&&list)m.list=battleListRows(m);
  g.save();
  // The palette swings in from the painter's side and settles with a small overshoot.
  g.translate(Math.round(wobble-(1-intro)*80),Math.round((1-intro)*34));g.translate(x+PALETTE_SHAPE.cx,y+PALETTE_SHAPE.cy);g.rotate((1-intro)*-.3);g.translate(-(x+PALETTE_SHAPE.cx),-(y+PALETTE_SHAPE.cy));
  drawPaletteWood(x,y);
  const cursor=PALETTE_TOOLS[slot],cur=ghost?{x:cursor[0],y:cursor[1]}:glide(BUI.cursor||(BUI.cursor={x:cursor[0],y:cursor[1]}),cursor[0],cursor[1]);
  if(!entries.length)smallText('Estuche vacío',x+PALETTE_TOOLS[0][0]+13,y+PALETTE_TOOLS[0][1]-4,'#6b4a33');
  entries.slice(top,top+PALETTE_ROWS).forEach((e,j)=>{
    const idx=top+j,[px,py]=PALETTE_TOOLS[j],X=x+px,Y=y+py,sel=idx===m.idx,pop=sel&&!ghost?uiPop(BUI.selectedAt,20)*2:0;
    const grow=ghost?1:Math.min(1.08,uiIn(BUI.openedAt,9,3+j*3)),r=(8+(sel?1:0))*grow,right=Math.min(108,Math.round(PALETTE_SHAPE.cx+paletteEdge(py-PALETTE_SHAPE.cy)-10));
    // The well: a raised blob of its own paint, sunk into its shadow unless it is the one in use.
    if(!sel){g.fillStyle=KIT_INK;g.globalAlpha*=.2;g.beginPath();g.ellipse(X+1,Y+2,r,r*.8,-.12,0,6.29);g.fill();g.globalAlpha/=.2;}
    paintDab(X,Y-(sel?1:0),r,e.dim?'#a2978a':e.col,pop);
    if(e.mix&&grow>.55)e.mix.forEach((c,k)=>paintDab(X-5+k*5,Y+7,2.5,e.dim?'#a2978a':c));
    if(e.icon&&grow>.55)e.icon(X-6,Y-7-(sel?1:0)-Math.round(pop));
    if(sel&&Prefs.shake&&grow>.55&&!e.icon){const a=B.t*.09,gx=Math.round(X+Math.cos(a)*(r-3)),gy=Math.round(Y-2+Math.sin(a)*(r*.35));g.fillStyle='#fff8e6';g.fillRect(gx,gy,2,1);}
    // The name is written on the wood; the chosen one sits on a wet stroke of the painter's colour.
    const fade=ghost?1:uiFade(BUI.openedAt,8,4+j*3),lx=X+13,tw=textWidth(e.name);
    g.save();g.globalAlpha*=fade;
    if(sel){const reach=Math.round((ghost?1:uiIn(BUI.selectedAt,8))*(tw+10));if(reach>2)brushBand(lx-5,Y-6,reach,12,e.dim?'#b3a898':col);}
    smallText(e.name,lx+(sel?1:0),Y-4,sel?(e.dim?UI_INK:accentInk(col)):e.dim?'#8d6d52':'#3a2518');
    if(e.cost){const cw=textWidth(e.cost.text);textRight(e.cost.text,x+right,Y-4,e.cost.short?'#9b2f35':'#4a2e20');if(e.cost.tube)miniTube(x+right-cw-8,Y-4,col,e.cost.short);}
    g.restore();
    if(!ghost){
      const hx=X-11,hw=x+right+4-hx; // fixed boxes: hovering never moves them
      if(list)uiHit(hx,Y-8,hw,17,()=>{if(B.menu!==m||m.level==='cmd')return;m.idx=idx;pressed.ok=true;},()=>{if(m.idx!==idx){m.idx=idx;Audio.sfx('cursor',{vol:.35});}});
      else uiHit(hx,Y-8,hw,17,()=>activatePaletteTool(m,idx),()=>focusPaletteTool(m,idx));
    }
  });
  // More wells than fit: small arrows scratched into the rim.
  if(list&&entries.length>PALETTE_ROWS){g.fillStyle='#4a2e20';if(top>0){g.fillRect(x+20,y+10,5,1);g.fillRect(x+21,y+9,3,1);g.fillRect(x+22,y+8,1,1);}if(top+PALETTE_ROWS<entries.length){g.fillRect(x+36,y+100,5,1);g.fillRect(x+37,y+101,3,1);g.fillRect(x+38,y+102,1,1);}}
  // The painter's brush dips into the chosen well: the handle rests up and to the left, the tip bobs in the paint.
  if(!ghost&&entries.length){const dip=Prefs.shake?Math.round(Math.sin(B.t*.12)):0;drawProp(propSprite('pincel',col),x+cur.x-4,y+cur.y-3+dip,.8,1,PROP.pincel.tip[0],PROP.pincel.tip[1],.6);}
  if(!ghost)drawPaletteTape(m,x,y);
  g.restore();
  if(!ghost){g.save();g.globalAlpha*=uiFade(BUI.paletteAt,8,10);g.translate(0,Math.round((1-uiIn(BUI.paletteAt,10,8))*10));drawPaletteKeys(m,x,y);g.restore();}
}
function drawCommandSheet(m) {
  drawCommandPalette(m);
  if(m.level!=='cmd'&&m.list?.[m.idx])drawListDetails(m,m.list[m.idx]);
}
function battleDetailLines(m,e) {return wrapSmall(m.level==='item'?e.it.desc:TECH_RULES[e.id],296).slice(0,2);}
function drawListDetails(m,e) {
  const lines=battleDetailLines(m,e),at=Math.max(BUI.openedAt,BUI.selectedAt),drop=Math.round((1-uiIn(at,12))*-10),fade=uiFade(at,8);
  g.save();g.translate(0,drop);g.globalAlpha*=fade;
  if(m.level==='item'){maskingLabel(3,3,textWidth(e.it.name)+16,12);smallText(e.it.name,11,7);maskingLabel(288,3,29,12);textRight('x'+e.n,308,7,UI_MUTED);}
  else {
    let x=16;
    e.users.forEach((u,i)=>{paintDab(x,10,6,C(u.color),uiPop(BUI.selectedAt,12));smallText(COLOR_LETTER[u.color],x-2,7,accentInk(C(u.color)));x+=15;if(i<e.users.length-1){smallText('+',x-2,7);x+=10;}});
    if(e.combo){smallText('=',x-1,7);paintDab(x+16,10,7,C(e.col),uiPop(BUI.selectedAt,12));x+=29;}
    const status=!e.living?'Gota caída':!e.free?'Reservada':!e.mpOk?'Falta MP':e.ready?battleKey('ok')+' elegir':battleKey('ok')+' reservar';
    maskingLabel(308-textWidth(status)-7,3,textWidth(status)+16,12);textRight(status,308,7,e.avail||e.reservable?'#47643e':'#9b343a');
  }
  const width=Math.max(...lines.map(textWidth))+16;maskingLabel(3,15,width,lines.length*10+2);lines.forEach((line,i)=>smallText(line,11,18+i*10,UI_MUTED));
  g.restore();
}
function drawTargetDetails(m) {
  const ts=selectedTargets(m),t=ts[0];if(!t)return;
  const p=m.pending,preview=previewAction(m.unit,p,t),group=targetGroup(p,m.unit),col=C(preview.col||m.unit.color);
  const title=actionName(p,m.unit),targetName=group?'Todos: '+ts.length:(t.kind==='enemy'?String.fromCharCode(65+t.idx)+': ':'')+t.name+(m.targets.length>1?' >':'');
  const drop=Math.round((1-uiIn(BUI.openedAt,10))*-16),rise=Math.round((1-uiIn(BUI.openedAt,10,4))*10),fade=uiFade(BUI.openedAt,8,4);
  // One tape says what and how much; the health stroke over the target already shows what is left.
  const amount=t.kind==='enemy'&&group?ts.map(q=>String.fromCharCode(65+q.idx)+' '+previewAction(m.unit,p,q).label.replace(' daño','')).join('  '):preview.label.replace(' daño','');
  const states=t.kind==='party'?unitStateLabels(t):[],tail=states.length?'  '+states.join(' '):'';
  g.save();g.translate(0,drop);
  const tw=textWidth(title),aw=textWidth(amount+tail),w=tw+aw+30;
  maskingLabel(3,3,w,12);paintDab(11,9,4,col,uiPop(BUI.selectedAt,12));smallText(title,18,7);smallText(amount+tail,26+tw,7,t.kind==='enemy'&&/\d/.test(amount)?'#8f2f3b':UI_INK);
  maskingLabel(301-textWidth(targetName),3,textWidth(targetName)+16,12);textRight(targetName,308,7,UI_MUTED);
  const mult=t.kind==='enemy'?preview.mult??1:1;
  if(mult!==1){const tag=mult>=2?'x2 complementario':'x'+Number(mult.toFixed(2))+' mismo color',tw2=textWidth(tag)+16;maskingLabel(3,16,tw2,12,mult>=2?'#fff0c2':'#e6e0d6');smallText(tag,11,19,mult>=2?'#8a5a12':UI_MUTED);}
  g.restore();
  if(!group&&m.targets.length>1)uiHit(299-textWidth(targetName),2,textWidth(targetName)+18,17,()=>{m.tidx=(m.tidx+1)%m.targets.length;Audio.sfx('cursor');});
  // Spend is previewed on each participant's physical paint tube below.
  g.save();g.translate(0,rise);g.globalAlpha*=fade;
  if(p.type==='tech'&&preview.effect){const effectLines=wrapSmall(preview.effect,200).slice(0,2);maskingLabel(3,124,Math.max(...effectLines.map(textWidth))+16,effectLines.length*10+1);effectLines.forEach((line,i)=>smallText(line,11,127+i*10,UI_INK));}
  const ok=battleKey('ok'),back=battleKey('back')+' volver',kw=Math.max(13,textWidth(ok)+6),bw=kw+textWidth('usar')+textWidth(back)+22,bx=317-bw;
  maskingLabel(bx,131,bw,13);brushBand(bx+1,131,kw,13,col);textCenter(ok,bx+1+kw/2,134,accentInk(col));smallText('usar',bx+kw+5,134,UI_INK);smallText(back,bx+kw+textWidth('usar')+13,134,UI_MUTED);
  g.restore();
  uiHit(bx,129,bw,17,()=>pressed.ok=true);
}
function drawReservation() {
  const r=B.reservation;if(!r||B.menu&&B.menu.level!=='cmd')return;
  // A small tied pair of paint dabs; each member's brush still shows its ATB.
  const label=techData(r.p.techId).name+' / '+battleKey('release')+' soltar',w=textWidth(label)+14;
  maskingLabel(317-w,131,w,13,'#e4d5ee');smallText(label,324-w,134,'#674875');uiHit(317-w,129,w,18,cancelReservation);
}
// The stamp is the one word the action keeps: a technique's name, brushed on and lifted away before the stroke ends.
function drawActionStamp(action) {
  if(!action.stamp)return;
  const age=B.t-BUI.actionAt,life=70;if(age>life+12)return;
  const raw=C(action.command?.techId?DATA.techs[action.command.techId].color||action.users[0].color:action.users[0].color),col=action.users[0].boss||raw===C('negro')?'#dbbae8':raw,w=rotuloWidth(action.title)+34,x=Math.round((W-w)/2),pop=uiPop(BUI.actionAt,12),out=clamp((age-life)/12,0,1);
  g.save();g.globalAlpha*=1-out;g.translate(0,Prefs.shake?Math.round(out*-12):0);
  brushBand(x,3,w,17+Math.round(pop*2),KIT_INK);paintDab(x+10,11,4,col,pop);bigText(action.title,x+19,7,col,{progress:Prefs.shake?age*7:null,outline:'#0b0912'});
  g.fillStyle=col;g.fillRect(x+4,19,Math.round((w-8)*Math.min(1,(age+3)/10)),2);
  g.restore();
}
// The boss keeps her name and nothing else in words: three phase dabs, her present core and a long stroke of ink for health.
function drawBossBand(boss) {
  const c=BUI.boss||(BUI.boss={trail:boss.hp,phase:boss.bossPhase,phaseAt:-99,core:boss.def.core,coreAt:-99,step:B.t});
  if(c.phase!==boss.bossPhase){c.phase=boss.bossPhase;c.phaseAt=B.t;}
  if(c.core!==boss.def.core){c.core=boss.def.core;c.coreAt=B.t;}
  if(c.step!==B.t){c.trail=Prefs.shake?lerp(c.trail,boss.hp,1-Math.pow(.9,Math.max(1,B.t-c.step))):boss.hp;if(boss.hp>c.trail)c.trail=boss.hp;c.step=B.t;}
  const jolt=Prefs.shake&&uiAge(c.phaseAt,14)<1?Math.round(Math.sin((B.t-c.phaseAt)*1.6)*2*(1-uiAge(c.phaseAt,14))):0;
  g.save();g.translate(jolt,0);
  brushBand(3,3,260,16,KIT_INK);bigText(boss.name,11,5,'#dbbae8',{outline:'#0b0912'});
  const nx=11+rotuloWidth(boss.name)+12;
  for(let i=1;i<=3;i++)paintDab(nx+i*9,11,3,i<=boss.bossPhase?'#b38bc3':'#4a3f57',i===boss.bossPhase?uiPop(c.phaseAt,16)*2:0);
  const bx=nx+42,bw=Math.max(20,240-bx);
  g.fillStyle='#4a3f57';g.fillRect(bx,9,bw,4);g.fillStyle='#8f6f95';g.fillRect(bx,9,Math.round(bw*clamp(c.trail/boss.maxhp,0,1)),4);
  const n=Math.round(bw*clamp(boss.hp/boss.maxhp,0,1));g.fillStyle='#b38bc3';g.fillRect(bx,9,n,4);g.fillStyle='#dbbae8';g.fillRect(bx,9,Math.max(0,n-1),1);
  if(boss.def.core)paintDab(252,11,4,boss.def.core,uiPop(c.coreAt,16)*2);
  g.restore();
}
function drawBattleHeader() {
  const action=B.currentAction;
  if(action){drawActionStamp(action);return;}
  drawClock();
  const boss=alive(B.enemies).find(u=>u.boss),m=B.menu,msgAge=B.msg?B.t-(BUI.messageAt??B.t):0,written=B.msg?{progress:Prefs.shake?msgAge*1.1:null,wet:B.msg.col&&B.msg.col!=='#f4f0ea'?B.msg.col:null}:null;
  if(boss)drawBossBand(boss);
  // Below the band only the painter's own choices speak: a refused command or the well being pointed at.
  const y=boss?20:3,pad=boss?3:5;
  if(B.msg){
    const lines=wrapSmall(B.msg.s,242).slice(0,boss?1:2),w=Math.min(260,Math.max(...lines.map(textWidth))+16);
    const drop=Math.round((1-uiIn(BUI.messageAt,12))*-8);g.save();g.translate(0,drop);
    maskingLabel(3,y,w,lines.length*10+pad);writtenLines(lines,11,y+3,UI_INK,written.progress??Infinity,{wet:written.wet,nib:!!Prefs.shake});
    g.restore();
  }else if(m?.level==='cmd'){
    const hint=paletteToolHint(commandRows(m.unit)[m.idx],m.unit),lines=wrapSmall(hint,236).slice(0,boss?1:2),w=Math.max(...lines.map(textWidth))+16,at=BUI.selectedAt;
    g.save();g.globalAlpha*=uiFade(at,8);g.translate(0,Math.round((1-uiIn(at,12))*-6));
    maskingLabel(3,y,w,lines.length*10+pad);lines.forEach((line,i)=>smallText(line,11,y+3+i*10,UI_MUTED));
    g.restore();
  }
}
function drawBattleUI() {
  observeBattleFeedback();
  if(B.phase==='fight'){
    const m=B.currentAction?null:B.menu;
    if(m?.level==='target')drawTargetDetails(m);
    else{if(m)drawCommandSheet(m);if(!m||m.level==='cmd')drawBattleHeader();}
    if(BUI.closing&&!onPalette(m)&&Prefs.shake&&uiAge(BUI.closing.at,7)<1){g.save();g.globalAlpha=1-uiAge(BUI.closing.at,7);g.translate(0,uiAge(BUI.closing.at,7)*8);drawCommandPalette(BUI.closing,true);g.restore();}
    if(BUI.closing&&!onPalette(m)){const pos=PALETTE_TOOLS[paletteSlot(BUI.closing)];paintRing(PALETTE_ORIGIN.x+pos[0],PALETTE_ORIGIN.y+pos[1],uiAge(BUI.closing.at,14),C(BUI.closing.unit.color),22);}
    drawReservation();
  }
  drawPartyCards();drawPaintMotes();
}
function drawTacticalGround() {
  for (const u of B.enemies) {
    if (!u.alive || !u.coat) continue;
    const c = project(u.wx, u.wy, 0); if (!c) continue;
    const col = C(u.coat.col), w = (u.def.w * .55 + 5) * c[2];
    g.fillStyle = ramp(col).sh; g.globalAlpha = .7; g.beginPath(); g.ellipse(c[0], c[1] + 3, w, w * .32, 0, 0, 6.29); g.fill(); g.globalAlpha = 1;
    // Wet paint keeps for as many enemy actions as there are dabs left at the front of the ring.
    for (let i = 0; i < Math.min(3, u.coat.turns); i++) paintDab(Math.round(c[0] - w * .45 + 3 + i * 6), Math.round(c[1] + 4), 2, col);
  }
  drawIntentThreads();
  const guardian = B.party.find(u => u.alive && u.guard?.charges);
  if (guardian && guardian.guard.target.alive) {
    const a = PJ([guardian.wx, guardian.wy, 0]), b = PJ([guardian.guard.target.wx, guardian.guard.target.wy, 0]);
    g.strokeStyle = '#c56463'; g.lineWidth = 1; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]);
  }
}
// Every announced attack is an ink thread crawling along the ground from the drop to whoever it has chosen;
// the thread lengthens with the charge and, near the end, rings the target's feet.
function drawIntentThreads() {
  if (B.phase !== 'fight') return;
  const urgent = urgentEnemy();
  for (const u of B.enemies) {
    if (!u.alive || !u.intent || u.acting) continue;
    const k = clamp((u.atb - COMBAT_PACE.intentAt) / (100 - COMBAT_PACE.intentAt), 0, 1), targets = u.intent.all ? alive(B.party) : [u.intent.target].filter(x => x?.alive), col = u.boss ? '#5a3f78' : '#2a2438', imminent = u === urgent;
    g.save(); g.globalAlpha *= imminent ? .85 : .4;
    for (const t of targets) {
      const pts = intentThreadPath(u, t), n = pts.length - 1, reach = k * n, crawl = imminent && Prefs.shake ? (B.t >> 3) : 0;
      for (let i = 0; i < n; i++) {
        const seg = clamp(reach - i, 0, 1); if (seg <= 0) break;
        const a = PJ(pts[i]), b = PJ(pts[i + 1]); if (((i + crawl) & 1) && seg >= 1) continue; // dashed: the ink beads along
        pstroke(a[0], a[1], lerp(a[0], b[0], seg), lerp(a[1], b[1], seg), Math.max(1, (imminent ? 2 : 1) * a[2]), col, 1, 0, false);
      }
      const tip = PJ(pointAt(pts, k)); g.fillStyle = col; g.beginPath(); g.ellipse(tip[0], tip[1], Math.max(1, 3 * tip[2]), Math.max(1, 2 * tip[2]), 0, 0, 6.29); g.fill(); g.fillStyle = '#8c8ab0'; g.fillRect(Math.round(tip[0]) - 1, Math.round(tip[1]) - 1, 1, 1);
      if (imminent) { const c = PJ([t.wx, t.wy, 0]), w = t.def.w * .6 * c[2] + 3, ph = Prefs.shake ? (B.t % 36) / 36 : .3; g.strokeStyle = col; g.globalAlpha = .65 * (1 - ph); g.lineWidth = 1; g.beginPath(); g.ellipse(c[0], c[1] + 1, Math.max(1, w * (1 + ph * .5)), Math.max(1, w * .4 * (1 + ph * .5)), 0, 0, 6.29); g.stroke(); g.globalAlpha = .85; }
    }
    g.restore();
  }
}
function drawTacticalMarkers() {
  if (B.phase !== 'fight' || B.currentAction) return;
  const m = B.currentAction ? null : B.menu, targeting = m?.level === 'target', selected = targeting ? selectedTargets(m) : [];
  for (const u of B.enemies) {
    if (!u.alive||!cameraShowsUnit(u)) continue;
    // A stroke that would cross a nearer enemy's body hangs above its own head instead.
    const box = q => { const s = q.sc * B.unitScale; return [q.x - q.def.w * .5 * s, q.y - q.def.h * s, q.x + q.def.w * .5 * s, q.y]; };
    const hidden = B.enemies.some(q => q !== u && q.alive && q.y > u.y && (([l, t, r, b]) => u.x + 12 > l && u.x - 12 < r && u.y + 9 > t && u.y + 3 < b)(box(q)));
    const hx = Math.round(u.x - (targeting ? 12 : 10)), hy = Math.round(hidden ? box(u)[1] - 6 : u.y + 5);
    if(hy<31||hy>145||u.x<15||u.x>305)continue;
    // Only a short ink stroke of health sits below the feet; letters, coats and warnings live on the drop and the ground.
    const bx = hx, px = bx + 1, py = hy + 1, width = targeting ? 22 : 18;
    g.fillStyle = KIT_INK; g.fillRect(px - 1, py - 1, width + 2, 4);
    g.fillStyle = '#574360'; g.fillRect(px, py, width, 2);
    g.fillStyle = selected.includes(u) ? '#ffe2a0' : u.def.core ? mixHex(u.def.core, '#f4f0ea', .35) : '#c3a0cb'; g.fillRect(px, py, Math.round(width * u.hp / u.maxhp), 2); // each drop's stroke carries the colour it stole
    if (selected.includes(u)) {
      const estimate = previewAction(m.unit, m.pending, u), after = Math.max(0, u.hp - (estimate.lo || 0));
      g.fillStyle = (B.t >> 3) & 1 ? '#e77f8b' : '#d16b79';
      for (let i = Math.round(width * after / u.maxhp); i < Math.round(width * u.hp / u.maxhp); i++) g.fillRect(px + i, py + (i % 2), 1, 1);
    }
  }
  if (!targeting) return;
  // A single reticle travels between candidates instead of jumping.
  const focus = selected.length === 1 ? selected[0] : null;
  for (const u of m.targets) {
    if(!cameraShowsUnit(u))continue;
    const sc = u.sc * B.unitScale * (u.kind === 'enemy' ? u.boss ? 1.35 : 1.6 : 1), top = u.y - u.def.h * sc, half = u.def.w * .5 * sc + 4 + uiPop(BUI.selectedAt,12)*3;
    if (selected.includes(u) && !focus) {
      const col = C(previewAction(m.unit, m.pending, u).col), gp = PJ([u.wx,u.wy,0]);
      for (const [stroke, width] of [[KIT_INK, 3], [col, 1]]) { g.strokeStyle = stroke; g.lineWidth = width; g.beginPath();g.ellipse(gp[0],gp[1]+3,half+3,half*.32,-.06,.12,6.05);g.stroke(); }
      if (u.kind === 'enemy') { const lx = clamp(Math.round(u.x - half - 9), 3, 309), ly = Math.round(top + 2); g.fillStyle = '#292333'; g.fillRect(lx, ly, 9, 10); smallText(String.fromCharCode(65 + u.idx), lx + 2, ly + 2, '#fff5d9'); }
    }
    uiHit(u.x - half - 4, Math.max(30, top - 6), half * 2 + 8, Math.max(18, u.y - Math.max(30, top - 6) + 8), () => { if (targetGroup(m.pending, m.unit) || m.targets[m.tidx] === u) pressed.ok = true; else { m.tidx = m.targets.indexOf(u); Audio.sfx('cursor'); } });
  }
  if (focus && cameraShowsUnit(focus)) {
    const u = focus, sc = u.sc * B.unitScale * (u.kind === 'enemy' ? u.boss ? 1.35 : 1.6 : 1), top = u.y - u.def.h * sc, half = u.def.w * .5 * sc + 4, gp = PJ([u.wx,u.wy,0]);
    const goal = { x: gp[0], y: gp[1] + 3, half, tipY: top + 3 };
    if (!BUI.reticle || !Prefs.shake) BUI.reticle = { ...goal }; else for (const k of ['x','y','half','tipY']) BUI.reticle[k] += (goal[k] - BUI.reticle[k]) * .4;
    const r = BUI.reticle, col = C(previewAction(m.unit, m.pending, u).col), breathe = Prefs.shake ? Math.sin(B.t * .18) * 1.5 : 0, arrive = uiPop(BUI.selectedAt, 12) * 3;
    for (const [stroke, width] of [[KIT_INK, 3], [col, 1]]) { g.strokeStyle = stroke; g.lineWidth = width; g.beginPath();g.ellipse(r.x,r.y,r.half+3+breathe+arrive,(r.half+3+breathe+arrive)*.32,-.06,.12,6.05);g.stroke(); }
    const tipX=Math.round(r.x-r.half-6),tipY=Math.max(30,Math.round(r.tipY-arrive-Math.abs(breathe)));
    g.drawImage(iconSprite('pincel',col),tipX,tipY,16,16);paintDab(tipX+15,tipY+1,2,col);
  }
}
function drawBattleResults() {
  UI_HITS.length=0;UI_TEXT.length=0;
  const at=artObserve('victory',B.party),drop=Math.round((1-artIn(at,22))*-110),fade=artFade(at,10,12),sealIn=artIn(at,12,26),sealAge=ARTUI.t-at-26;
  if(sealAge===0)artBurst(258,48,'#397a4d');
  g.save();g.translate(0,drop);
  artSheet(61,40,198,88,C('verde'));
  brushBand(72,31,176,17,'#387850');bigCenter('¡Color recuperado!',160,35,KIT_LIGHT,{outline:'#1d3d2a'});
  // The three drops themselves stand on the card and keep hopping, each a beat after the other; a wash of their colour marks where they land.
  B.party.forEach((u,i)=>{const k=Math.min(1,artIn(at,12,10+i*4)),px=135+i*25;if(k<=0)return;g.fillStyle=mixHex(C(u.color),'#f1e6cc',.45);g.beginPath();g.ellipse(px,70,9*k,2.5*k,0,0,6.29);g.fill();
    const hop=Prefs.shake?Math.round(Math.abs(Math.sin((ARTUI.t-at-i*7)*.09))*5):0,info=unitSpriteInfo({...u,pose:'happy'},(ARTUI.t/9+i*2|0)%4);
    drawSprite(info.spr,px,70-hop,.8*k);});
  g.save();g.globalAlpha*=fade;
  const count='+'+B.result,cw=rotuloWidth(count)+4+textWidth('pigmentos'),cx=Math.round(160-cw/2);
  bigText(count,cx,76,'#f2c93a',{outline:'#4a3a12'});smallText('pigmentos',cx+rotuloWidth(count)+4,78,'#5b4623');
  smallText('Reacciones '+B.stats.mixes,74,98,UI_MUTED);
  smallText('Cortes '+B.stats.interrupts,186,98,UI_MUTED);
  smallText('Invierte el pigmento en estudios',74,109,'#8b6f3b');
  g.restore();
  if(sealIn>0){g.save();g.translate(258,48);const s=Prefs.shake?1+(1-Math.min(1,sealIn))*1.4:1;g.scale(s,s);g.globalAlpha*=Math.min(1,sealIn);artSeal('VIVO',0,0,'#397a4d',18,-99);g.restore();}
  g.restore();
  const rise=Math.round((1-artIn(at,16,30))*30);g.save();g.translate(0,rise);
  artButton('victory-next',battleKey('ok')+' continuar',101,122,118,21,'#d1ad68',()=>pressed.ok=true,{selected:true});
  g.restore();
}
const GUIDE_PAGES = [
  { title:'Pintar y reaccionar',lines:['Núcleo: afinidad del enemigo.','Complementario x2. Mismo color x0.5.','Capa: el aro guarda una gota por acción.','Pincel y Preparar: dura 3 acciones.','Rojo + amarillo: daño y salpicadura.','Amarillo + azul: raíces y cura grupal.','Rojo + azul: interrumpe y firma.','Hilo de tinta: a quién va a atacar.'] },
  { title:'Tiempo y herramientas',lines:['Brocha llena: turno. Tubo: MP.','Tramo claro del tubo: coste. Lila: reservada.','Liberar conserva el ATB de cada gota.','Paleta: arriba y abajo, o la rueda.','Toca para elegir; otra vez para abrir.','Otra gota: su retrato o {swap}.','Volver conserva tu última selección.','Objetivo: flechas o toca su nombre.'] },
  { title:'Leer a La Tinta',lines:['I: roba MP. Su núcleo cambia de color.','Reacción o 3 primarios: rompe coraza.','Abrirla: +2 MP para cada gota viva.','II: núcleo abierto. Vigila la marea.','III: vuelve la coraza y borra capas.','Arcoíris brilla con la coraza abierta.','Gotea: lento. Tizne: pega menos.','Perfil: recibe -40%. Rúbrica: +30%.'] },
];
const BINDING_NAMES = { ok:'Confirmar', back:'Volver', swap:'Cambiar gota', release:'Liberar mezcla', options:'Opciones', journal:'Estudios', help:'Guía', up:'Arriba', down:'Abajo', left:'Izquierda', right:'Derecha', ring:'Herramientas' };
function switchArtOverlay(type) {
  const o=Game.overlay;if(!o||o.capture||o.type===type)return;
  if(type==='studies'&&Game.state!=='overworld')return;
  o.type=type;o.idx=0;o.message='';o.switchedAt=ARTUI.t;o.hl=null;Audio.sfx('page');
}
// The row highlight is a strip of paper that slides under the chosen line.
function overlayHighlight(o,y,x=80,w=225,h=15,col='#e8d6ad') {
  if(o.hl==null||!Prefs.shake)o.hl=y;else{o.hl+=(y-o.hl)*.45;if(Math.abs(o.hl-y)<.4)o.hl=y;}
  maskingLabel(x,Math.round(o.hl)-2,w,h,col);
}
function drawOverlay() {
  const o=Game.overlay;if(!o)return;
  UI_HITS.length=0;UI_TEXT.length=0;
  const cols={settings:'#b08b4e',bindings:'#b08b4e',studies:'#438967',guide:'#597cb1',shop:'#9a6a3e'},col=cols[o.type];
  const at=artObserve('overlay',o.type+':'+o.idx+':'+(o.message||'')),openedAt=o.openedAt??-99,switchedAt=o.switchedAt??openedAt;
  g.fillStyle='rgba(20,15,28,'+(.6*artFade(openedAt,10)).toFixed(2)+')';g.fillRect(0,0,W,H);
  if(o.type==='shop'){
    // En la tienda no hay marcapáginas: Sepia asoma por la izquierda, pegada al cuaderno con cinta, y saluda.
    g.save();g.translate(Math.round((1-artIn(openedAt,16))*-90),0);
    maskingLabel(6,26,62,98,'#e6d3b0');g.fillStyle='#c9a26b';g.beginPath();g.ellipse(37,103,24,6,0,0,6.29);g.fill();
    const hop=Prefs.shake?Math.round(Math.abs(Math.sin(ARTUI.t*.12))*artPop(at)*4):0;drawSprite(merchantSprite((ARTUI.t%150)<5),39,104-hop,2);
    brushBand(12,110,50,13,'#9a6a3e');textCenter(DATA.merchant.name,37,113,accentInk('#9a6a3e'));
    g.restore();
  }else{
  // Paint-stained bookmarks form navigation; each opens its own sheet.
  g.save();g.translate(Math.round((1-artIn(openedAt,16))*-90),0);
  brushBand(14,14,47,151,'#695238');
  [['settings','AJUSTES','item'],['studies','ESTUDIOS','tech'],['guide','GUÍA','pincel']].forEach(([type,label,icon],i)=>{
    const y=22+i*48,sel=o.type===type||(type==='settings'&&o.type==='bindings'),enabled=type!=='studies'||Game.state==='overworld';
    g.save();g.translate(Math.round((1-artIn(openedAt,14,3+i*3))*-70),0);
    maskingLabel(9,y,56,38,enabled?(sel?'#fff0c9':'#cfbd99'):'#a59b88');
    paintDab(37,y+11,9,enabled?cols[type]:'#807775',sel?artPop(at):0);
    g.drawImage(iconSprite(icon,cols[type]),31,y+5);
    textCenter(label,37,y+27,enabled?UI_INK:'#5a514c');
    g.restore();
    if(enabled&&!o.capture)uiHit(6,y-2,61,43,()=>switchArtOverlay(type));
  });
  g.restore();
  }
  // The sheet slides in from the right edge; switching bookmarks turns a fresh leaf.
  g.save();g.translate(Math.round((1-artIn(openedAt,20,4))*260),Math.round((1-artIn(switchedAt,12))*-6));
  artSheet(73,10,239,167,col);
  brushBand(82,15,196,15,col);
  smallText(({settings:'A tu manera',bindings:'Teclado',studies:'Muestras de color',guide:'Cuaderno de campo',shop:'Recetas de Sepia · nivel 2'})[o.type],90,19,accentInk(col));
  artButton('overlay-close',battleKey('back'),282,13,26,19,'#d2bd98',()=>{pressed.back=true;});
  g.globalAlpha*=artFade(switchedAt,8);
  const written=text=>({progress:Prefs.shake?(ARTUI.t-artObserve('overlay-note',text))*2.4:Infinity,wet:col});
  if(o.type==='settings'){
    OPTIONS.forEach((opt,i)=>{
      const y=39+i*16,sel=o.idx===i,n=opt.values.indexOf(Prefs[opt.key]);
      if(sel){overlayHighlight(o,y);g.drawImage(iconSprite('pincel',col),74,Math.round(o.hl)+2);}
      const valueAt=artObserve('option:'+opt.key,Prefs[opt.key]);
      smallText(opt.label,88,y);textRight(opt.labels[n],299,y-Math.round(artPop(valueAt)*2),sel?UI_INK:UI_MUTED);
      // A pencil ruler and paint-filled notches communicate the current setting.
      for(let j=0;j<opt.values.length;j++){g.fillStyle=j<=n?col:'#c3b596';g.fillRect(251+j*16,y+10,12,2);}
      paintDab(257+n*16,y+11,2,col,artPop(valueAt));
      uiHit(81,y-2,223,16,()=>{o.idx=i;changeOption(i,1);},()=>artFocus(o,i));
    });
    const sel=o.idx===6;
    artButton('bindings',typeof MOBILE!=='undefined'&&MOBILE.enabled?'Teclado externo >':'Configurar teclas >',85,135,218,15,sel?'#d6b775':'#dfd1b2',()=>switchArtOverlay('bindings'),{selected:sel,hover:()=>artFocus(o,6)});
    const desc=OPTIONS[o.idx]?.desc||'Mando: A confirma, B vuelve. Start: opciones.';
    paragraph(desc,85,156,218,UI_MUTED,2,written(desc));
  }else if(o.type==='bindings'){
    const rows=[...Object.keys(DEFAULT_BINDINGS),'reset'];
    if(o.idx<(o.scroll||0))o.scroll=o.idx;if(o.idx>=(o.scroll||0)+6)o.scroll=o.idx-5;
    const top=clamp(o.scroll||0,0,rows.length-6);
    rows.slice(top,top+6).forEach((key,j)=>{
      const i=top+j,y=40+j*16,sel=o.idx===i;
      if(sel)overlayHighlight(o,y,80,225,16);
      smallText(key==='reset'?'Restaurar teclas':BINDING_NAMES[key],88,y+1);
      if(key!=='reset'){
        const label=o.capture===key?'...':keyLabel(key),w=Math.max(29,textWidth(label)+12);
        maskingLabel(300-w,y-2,w,14,'#fff8e6');textRight(label,294,y+1,o.capture===key?'#a75438':UI_INK);
      }
      uiHit(81,y-2,223,16,()=>{if(!o.capture){o.idx=i;pressed.ok=true;}},()=>artFocus(o,i));
    });
    smallText((top+1)+'-'+Math.min(top+6,rows.length)+' / '+rows.length,86,140,UI_MUTED);
    artButton('keys-prev','^',249,136,25,15,'#d6bd8d',()=>{if(!o.capture)artFocus(o,(o.idx-1+rows.length)%rows.length);});
    artButton('keys-next','V',279,136,25,15,'#d6bd8d',()=>{if(!o.capture)artFocus(o,(o.idx+1)%rows.length);});
    paragraph(o.message||'Elige una tecla para cambiarla.',86,157,216,UI_MUTED,2,written(o.message||'Elige una tecla para cambiarla.'));
  }else if(o.type==='studies'){
    smallText('Pigmento disponible',87,35,UI_MUTED);textRight(Game.pigmento,301,35,'#84602b');
    Object.entries(DATA.studies).forEach(([id,d],i)=>{
      const y=49+i*27,sel=o.idx===i,learned=!!Game.studies[id],c=C(['azul','rojo','amarillo'][i]);
      maskingLabel(82,y,224,23,sel?'#fff0cb':'#e6dac1');
      brushBand(87,y+3,26,17,c);g.drawImage(iconSprite(['pincel','brocha','lapiz'][i],c),91,y+3,16,16);
      smallText(d.name,123,y+3);
      smallText(learned?'Aprendido':d.cost+' pigmentos',123,y+13,UI_MUTED);
      if(learned)artSeal('OK',287,y+11,'#387850',10,o.stampAt??-99);
      else if(sel){g.drawImage(iconSprite('pincel',c),287,y+4);}
      uiHit(81,y-1,226,25,()=>artFocus(o,i),()=>artFocus(o,i));
    });
    const [id,d]=Object.entries(DATA.studies)[o.idx]||Object.entries(DATA.studies)[0];
    paragraph(o.message||d.desc,86,134,216,UI_MUTED,2,written(o.message||d.desc));
    const learned=Game.studies[id],enough=Game.pigmento>=d.cost;
    artButton('study-buy',learned?'Aprendido':battleKey('ok')+' aprender',183,159,121,16,'#438967',()=>buyStudy(id),{disabled:learned||!enough,selected:!learned&&enough});
  }else if(o.type==='shop'){
    smallText('Tu pigmento',87,33,UI_MUTED);textRight(Game.pigmento,301,33,'#84602b');
    const ids=Object.keys(DATA.merchant.recipes);
    ids.forEach((id,i)=>{
      const t=DATA.techs[id],y=45+i*21,sel=o.idx===i,owned=techLevel(id)>=2,cost=DATA.merchant.recipes[id];
      maskingLabel(82,y,224,19,sel?'#fff0cb':'#e6dac1');
      // la receta se lee como una mezcla: los pigmentos de las gotas = el color nuevo
      let x=91;t.users.forEach((uid,k)=>{paintDab(x,y+9,3,C(DATA.party.find(p=>p.id===uid).color));x+=8;});
      smallText('=',x-2,y+5,UI_MUTED);paintDab(x+9,y+9,5,C(t.color),sel?artPop(at):0);
      smallText(t.lv2.name,x+19,y+5,owned?UI_MUTED:UI_INK);smallText('('+t.name+' II)',x+23+textWidth(t.lv2.name),y+5,UI_MUTED);
      if(owned)artSeal('OK',292,y+10,'#387850',9,o.stampAt??-99);else textRight(cost+' pig.',302,y+5,Game.pigmento>=cost?'#84602b':'#9b343a');
      uiHit(81,y-1,226,21,()=>artFocus(o,i),()=>artFocus(o,i));
    });
    const id=ids[o.idx]||ids[0],t=DATA.techs[id],owned=techLevel(id)>=2,enough=Game.pigmento>=DATA.merchant.recipes[id];
    const text=o.message?'«'+o.message+'»':t.lv2.desc;
    paragraph(text,86,134,216,o.message?'#6b4a33':UI_MUTED,2,written(text));
    artButton('shop-buy',owned?'Ya es tuyo':battleKey('ok')+' comprar',183,159,121,16,'#9a6a3e',()=>buyRecipe(id),{disabled:owned||!enough,selected:!owned&&enough});
  }else{
    const p=GUIDE_PAGES[o.idx];
    smallText((o.idx+1)+'/3',86,37,UI_MUTED);smallText(p.title,115,37);
    brushBand(86,48,217,2,col);
    // Each page is written line by line when it is turned.
    const pageAt=artObserve('guide-page',o.idx);
    p.lines.forEach((line,i)=>{const text=line.replace('{swap}',battleKey('swap')),shown=Prefs.shake?clamp((ARTUI.t-pageAt-i*3)/6,0,1):1;g.save();g.globalAlpha*=shown;g.translate(Math.round((1-shown)*6),0);g.fillStyle=col;g.fillRect(85,58+i*12,2,2);smallText(text,93,55+i*12);g.restore();});
    artButton('guide-back','< anterior',85,157,102,17,'#d4bd91',()=>{o.idx=(o.idx+2)%3;Audio.sfx('page');});
    artButton('guide-next','siguiente >',197,157,107,17,'#d4bd91',()=>{o.idx=(o.idx+1)%3;Audio.sfx('page');});
  }
  g.restore();
}
function drawDefeat() {
  UI_HITS.length=0;UI_TEXT.length=0;
  const at=artObserve('defeat',B.party),k=artIn(at,26),pool=Math.min(1,(ARTUI.t-at)/60);
  g.fillStyle='rgba(20,15,28,'+(.58*artFade(at,20)).toFixed(2)+')';g.fillRect(0,0,W,H);
  // Ink pools at the bottom of the page before the sheet settles on it.
  g.fillStyle='#0b0912';g.beginPath();g.ellipse(160,H+6,60+pool*120,8+pool*14,0,0,6.29);g.fill();
  g.save();g.translate(0,Math.round((1-k)*-90));
  artSheet(56,61,211,65,'#8d739c');
  brushBand(72,45,183,20,'#635173');bigCenter('El color aún espera',164,50,KIT_LIGHT,{outline:'#2b2236'});
  // An almost-empty tube still has one drop: a concrete invitation to repaint.
  g.drawImage(iconSprite('item',C('violeta')),35,51,25,25);paintDab(44,83,3+Math.round(pool*2),C('violeta'));
  paragraph('Repite el encuentro con los objetos y el pigmento que tenías al entrar.',69,78,184,UI_MUTED,3);
  g.restore();
  const ready=B.t>80;g.save();g.translate(0,Math.round((1-artIn(at,16,24))*30));
  artButton('retry',battleKey('ok')+' volver a pintar',88,119,147,24,ready?'#c9a4d2':'#b6a5bd',()=>{if(B.t>80)pressed.ok=true;},{selected:ready});
  g.restore();
}
