// Two leaves in one adventure. Party, equipment, ATB, UI and audio remain shared.
'use strict';
const CHAPTER={turn:null,pages:[],visited:new Set([0]),complete:false,
  seals:[{key:'7',x:216,y:348,color:'rojo'},{key:'8',x:360,y:252,color:'amarillo'},{key:'9',x:472,y:180,color:'azul'}]};
Object.assign(DATA.enemies,{devoralineas:{name:'Devoralíneas',color:'negro',shape:'blob',hp:680,atk:16,def:8,spd:7,exp:85,w:66,h:57,ai:'boss',boss:true,
  phaseSprites:['devoralineas','devoralineas_2','devoralineas_3'],phaseNames:['CORAZA DE TINTA','EL TINTERO ABIERTO','LA ÚLTIMA LÍNEA'],
  intentNames:{attack:'Zarpazo de plumilla',steal:'Beber el color',tide:'Tachón del ejército',erase:'Devorar la página'}}});
Object.assign(DATA.encounters,{'7':['gota_negra','borron'],'8':['mancha','grumo'],'9':['charco','borron'],'N':['devoralineas']});
SPEAKERS.devoralineas={name:'Devoralíneas',col:'#8c8ab0',spr:()=>buildSprite('devoralineas',C('negro'),null,{}),sc:.72};
const REVERSE_DIALOGUE=[
  {who:'carmin',text:'Estas manchas llevan el mismo sello.'},
  {who:'anil',text:'Los Negros. No están robando un color: están borrando páginas enteras.'},
  {who:'devoralineas',text:'Una hoja. Un trazo. Ningún color.'},
  {who:'ambar',text:'Pues vamos a salirnos de la línea.'}
];
function chapterMap() {
  const rows=Array.from({length:30},(_,y)=>Array.from({length:40},(_,x)=>x===0||y===0||x===39||y===29?'T':','));
  const rectangle=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)rows[j][i]=c;};
  // The same paper, paint paths, brush groves and ruler bridges, rearranged.
  rectangle(2,19,13,9,'.');rectangle(12,16,13,9,'.');rectangle(20,10,15,9,'.');rectangle(27,2,10,7,',');
  rectangle(15,8,3,15,'~');rectangle(5,8,8,7,'T');rectangle(20,3,5,7,'T');rectangle(34,18,4,10,'T');
  const route=[[4,24],[10,24],[13,21],[14,19],[22,19],[22,15],[25,13],[29,11],[32,11],[32,5]];
  for(let k=1;k<route.length;k++){const a=route[k-1],b=route[k],n=Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));for(let i=0;i<=n;i++){const x=Math.round(a[0]+(b[0]-a[0])*i/n),y=Math.round(a[1]+(b[1]-a[1])*i/n);rectangle(x-1,y,3,2,'=');}}
  return {w:40,h:30,rows:rows.map(r=>r.join('')),spawn:[4,24],jar:{x:7,y:20},pz:null,
    signs:[{x:5,y:23,lines:['El reverso del lienzo','Los Negros han sellado el camino.','Vence a las tres patrullas','y alcanza al Devoralíneas.']}],
    spots:[...CHAPTER.seals.map(s=>({key:s.key,x:s.x/16|0,y:(s.y-12)/16|0})),{key:'N',x:32,y:5}]};
}
function chapterProps(){return [
  {kind:'house',x:3,y:22,color:'rojo',title:'El mismo frasco',lines:['El pigmento atraviesa el papel.','El jardín sigue al otro lado.']},
  {kind:'palette',x:5,y:26.5,color:'amarillo'}, {kind:'tube',x:10,y:26,color:'rojo'},
  {kind:'box',x:12,y:18,color:'azul'}, {kind:'jar',x:13,y:24,color:'violeta',drained:true},
  {kind:'easel',x:20,y:22,color:'naranja',mix:['rojo','amarillo'],title:'Orden de Los Negros',lines:['Sellad los tinteros.','Apagad los pigmentos.','Que sólo quede el contorno.']},
  {kind:'tube',x:24,y:21,color:'amarillo',drained:true}, {kind:'mill',x:26,y:17,color:'violeta'},
  {kind:'jar',x:20,y:13,color:'azul',drained:true}, {kind:'box',x:29,y:15,color:'violeta'},
  {kind:'easel',x:34,y:11,color:'violeta',mix:['rojo','azul'],title:'Una página arrancada',lines:['Tres sellos sostienen el cerco.','Las mezclas abren su coraza.','Ámbar puede cortar su carga.']},
  {kind:'jar',x:28,y:5,color:'violeta',drained:true}, {kind:'tube',x:36,y:6,color:'azul',drained:true},
  {kind:'boat',x:16,y:13,color:'azul'}, {kind:'fan',x:8,y:17,color:'violeta'}
];}
function chapterPortal(){return Game.page===1?{x:4*16+8,y:25*16+12}:{x:5*16+8,y:22*16+12};}
function chapterSealsOpen(){return CHAPTER.seals.every(s=>Game.defeated.has(s.key));}
function chapterBlocked(x,y){return Game.page===1&&!chapterSealsOpen()&&x>26*16&&x<37*16&&y<8*16+6;}
function chapterNear(){const p=chapterPortal();return Math.hypot(OW.x-p.x,OW.y-p.y)<30;}
function chapterInteract(){if(!chapterNear())return false;return chapterBegin(Game.page===1?0:1);}
function chapterSaveLeaf(){CHAPTER.pages[Game.page||0]={map:{...MAP,rows:MAP.rows.slice(),signs:(MAP.signs||[]).map(s=>({...s}))},objects:WORLD_OBJECTS.slice(),regions:WORLD_REGIONS.slice(),palette:Game.palette,puzzle:Game.puzzle,
  world:{x:OW.x,y:OW.y,foes:OW.foes,puddles:OW.puddles,hist:OW.hist,jar:OW.jar},dialogue:DATA.bossDialogue};}
function chapterInstall(to){
  chapterSaveLeaf();let leaf=CHAPTER.pages[to];
  if(!leaf){leaf={map:chapterMap(),objects:chapterProps(),regions:[
    {name:'El reverso del lienzo',x:6,y:23,rx:13,ry:12,color:'violeta',paper:'#b9b0c3'},
    {name:'Los sellos de Los Negros',x:23,y:15,rx:13,ry:12,color:'azul',paper:'#a7a4b7'},
    {name:'El tintero sin fondo',x:32,y:5,rx:10,ry:8,color:'violeta',paper:'#9d93ad'}],palette:'gris',puzzle:PUZ0(),dialogue:REVERSE_DIALOGUE};CHAPTER.pages[to]=leaf;}
  for(const key of Object.keys(MAP))delete MAP[key];Object.assign(MAP,leaf.map);Game.page=to;Game.palette=leaf.palette;Game.puzzle=leaf.puzzle;DATA.bossDialogue=leaf.dialogue;
  WORLD_OBJECTS.splice(0,WORLD_OBJECTS.length,...leaf.objects);WORLD_REGIONS.splice(0,WORLD_REGIONS.length,...leaf.regions);
  WORLD_ART.objects=null;WORLD_ART.ground.clear();WORLD_ART.palettes.clear();SCENE.texCache={};
  const intro=Game.intro;Game.intro=false;initOverworld();Game.intro=intro;
  if(leaf.world){Object.assign(OW,leaf.world);OW.hist=[];}
  OW.msg=null;OW.menu=null;OW.landT=0;OW.landZ=null;OW.scare=null;OW.shake=0;OW.camNudge=null;OW.moving=false;OW.vx=OW.vy=0;
  OW.cam.x=clamp(OW.x-W/2,0,MAP.w*TILE-W);OW.cam.y=clamp(OW.y-H/2,0,MAP.h*TILE-H);
  OW.foes.forEach(f=>{f.boss=!!DATA.enemies[f.enemies[0]].boss;});
}
function chapterBegin(to){
  if(CHAPTER.turn||Game.state!=='overworld'||OW.msg||OW.act||OW.heal||OW.landT||Game.overlay||to===Game.page)return false;
  const positions=Party.map((p,i)=>{const h=OW.hist[Math.min(OW.hist.length-1,i*12)];return i&&h?h.slice():[OW.x-i*12,OW.y];});
  CHAPTER.turn={from:Game.page||0,to,t:0,anchor:[OW.x,OW.y],positions,snap:null,first:!CHAPTER.visited.has(to)};
  OW.vx=OW.vy=0;OW.moving=false;OW.menu=OW.ring=null;OW.shake=0;releaseInputs();setState('pageTurn');Audio.sfx('page',{vol:.4});return true;
}
function chapterTick(){
  const T=CHAPTER.turn;if(!T)return;T.t++;
  for(let i=0;i<3;i++)if(T.t===34+i*10||T.t===206+i*10)Audio.sfx('plop',{semi:[0,4,7][i],vol:.45});
  if(T.t===96){drawOverworld();T.snap=document.createElement('canvas');T.snap.width=W;T.snap.height=H;T.snap.getContext('2d').drawImage(buf,0,0);chapterInstall(T.to);Audio.sfx('page');Audio.prepare(worldCue());}
  if(T.t>=238){const first=T.first;CHAPTER.visited.add(T.to);CHAPTER.turn=null;OW.hist=[];OW.dir='down';releaseInputs();setState('overworld');Audio.play(worldCue(),{resume:true,fade:.8});
    if(first)OW.msg={lines:['El reverso del lienzo','Los Negros se esconden detrás de la página.','Las tres patrullas mantienen el cerco.','Tu equipo y tus mezclas siguen contigo.'],t:0};}
}
function chapterHUD(){
  if(Game.state!=='overworld'||OW.msg||OW.menu||OW.ring||OW.heal||OW.act||OW.landT)return;
  if(chapterNear()){const label=Game.page===1?'Volver a la hoja anterior':'Pasar página / Los Negros',w=textWidth(label)+30,x=(W-w)/2,at=artObserve('chapter-near',label);g.save();g.translate(0,Math.round((1-artIn(at,14))*30));artTag(label,x,151,'#827093');g.restore();uiHit(x,146,w,28,()=>chapterInteract());}
  else if(Game.page===1){const n=CHAPTER.seals.filter(s=>Game.defeated.has(s.key)).length;const label=CHAPTER.complete?'La línea resiste':n===3?'El cerco está abierto':'Sellos rotos '+n+'/3';maskingLabel(6,28,textWidth(label)+14,13);smallText(label,13,31,UI_INK);}
}
function chapterWon(foe){
  if(Game.page!==1)return false;
  if(foe.boss){CHAPTER.complete=true;Game.palette='vivo';OW.msg={lines:['La línea también necesita color.','El Devoralíneas devuelve los trazos robados.','Los Negros retroceden. El cuaderno continúa.','Puedes regresar por el mismo pliegue.'],t:0};Audio.sfx('saturate');}
  else if(CHAPTER.seals.some(s=>s.key===foe.key)){OW.msg={lines:[chapterSealsOpen()?'El último sello se rompe.':'Un sello menos.',chapterSealsOpen()?'La tinta se aparta del camino al norte.':'El estandarte recupera una gota de color.','Vida y pigmento recuperados en parte.'],t:0};Party.forEach(p=>{const s=effStats(p);p.cur.hp=Math.min(s.hp,p.cur.hp+25);p.cur.mp=Math.min(s.mp,p.cur.mp+4);});}
  return true;
}
function chapterPreview(){if(Game.state!=='title'||TITLE.exit)return;Audio.init();titleStartButton.style.display='none';chapterTitleButton.style.display='none';Game.intro=false;initOverworld();OW.msg=null;setState('overworld');chapterBegin(1);}
let chapterTitleButton;
function chapterInitialize(){
  Game.page=0;
  chapterTitleButton=document.createElement('button');chapterTitleButton.type='button';chapterTitleButton.textContent='Pasar página · Los Negros';chapterTitleButton.setAttribute('aria-label','Pasar página: Los Negros');
  chapterTitleButton.style.cssText='position:fixed;display:none;border:0;padding:0;background:transparent;color:transparent;cursor:pointer;outline:none;';
  chapterTitleButton.addEventListener('click',chapterPreview);document.body.appendChild(chapterTitleButton);
  CHAPTER.direct=new URLSearchParams(location.search).get('hoja')==='reverso';
}
function chapterTitleUI(){
  if(!chapterTitleButton)return;const show=Game.state==='title'&&TITLE.t>=LOGO_BEATS.ready&&!TITLE.exit;
  chapterTitleButton.style.display=show?'block':'none';if(!show)return;
  const label='Pasar página >',x=Math.round((W-textWidth(label))/2),y=109,r=cv.getBoundingClientRect(),s=r.width/W;
  smallText(label,x,y,chapterTitleButton.matches(':hover, :focus-visible')?'#624278':'#786b68');
  g.fillStyle='#ab9892';g.fillRect(x,y+9,textWidth(label),1);
  Object.assign(chapterTitleButton.style,{left:r.left+(x-4)*s+'px',top:r.top+(y-4)*s+'px',width:(textWidth(label)+8)*s+'px',height:19*s+'px'});
}
