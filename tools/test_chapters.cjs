/* Deterministic integration tests of the shipped scripts. Canvas/audio are inert;
   combat, input, menus, generators, data and preview calculations are real. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const noop = () => {};
const context2d = () => new Proxy({
  measureText: s => ({ width: String(s).length * 8 }),
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width:w, height:h }),
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
}, { get: (o, k) => k in o ? o[k] : noop });
const element = () => ({ classList: {toggle:noop,remove:noop}, textContent:'', dataset:{}, style: {}, width:320, height:180, addEventListener:noop, matches:()=>false, setAttribute:noop, appendChild:noop, getContext:context2d, getBoundingClientRect: () => ({left:0,top:0,width:320,height:180}) });
const elements = {}, listeners = {};
const ctx = vm.createContext({
  console, Math:Object.create(Math), Uint8ClampedArray, Set, Map, URLSearchParams, location:{search:''},
  document: { createElement:element, getElementById:id => elements[id] ||= element(), addEventListener:noop, querySelectorAll:()=>[], querySelector:element, documentElement:element(), body:element(), hidden:false },
  localStorage: {getItem:()=>null,setItem:noop}, navigator: {}, matchMedia:()=>({matches:false}),
  innerWidth:960, innerHeight:560, requestAnimationFrame:noop, performance:{now:()=>0},
  addEventListener:(event, fn) => (listeners[event] ||= []).push(fn),
  Audio: new Proxy({ positions:{}, muted:false, sfx:noop, play:noop, init:noop, prepare:noop, stop:noop, bend:noop }, {get:(o,k)=>o[k] || noop}), SFX:{ambient:noop}, MUSIC:{},
});
ctx.window = ctx; ctx.Math.random = () => .5;
for (const file of ['data.js','font.js','sprites.js','world_art.js','rinse.js','field.js','scene.js','gui.js','battle.js','ink_transition.js','attacks.js','combat.js','battle_ui.js','settings.js','mobile.js','chapter_art.js','chapters.js','game.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const run = code => vm.runInContext(code,ctx);
function scenario(group='5') {
  run(`resetGame(); Game.overlay = null; initBattle(OW.foes.find(f=>f.key==='${group}') || {...OW.foes[0],key:'${group}',enemies:DATA.encounters['${group}'],boss:'${group}'==='B'}); B.gen=null; B.tr=null; B.phase='fight'; B.fightStart=-100; Game.state='battle'; B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=0;}); B.unitScale=1; B.propScale=1; camSet(SCENE.rest); projectUnits(); B.party.forEach(u=>u.atb=100); ATB_ACTIVE=false; Prefs.speed=1;`);
}
function drain() { run(`for(let count=0; B.actions.length || B.actQueue.length; count++) { if(count>3000)throw new Error('Action did not finish'); updateBattle(); }`); }

let tests=0;function test(name,fn){fn();console.log('PASS '+name);tests++;}
function chapterFrames(count){run(`for(let i=0;i<${count};i++)update();`);}
function travel(to){run(`OW.msg=null;OW.menu=null;OW.landT=0;Game.overlay=null;Game.paused=false;setState('overworld');var assertTravel=chapterBegin(${to});`);assert(run('assertTravel'));for(let i=0;i<238;i++){run('update();render();');}assert.equal(run('Game.state'),'overworld');assert.equal(run('Game.page'),to);}
function walkRoute(points){for(const [x,y] of points){assert(run(`walkable(${x},${y})`),'Unreachable waypoint '+x+','+y);}}
test('new page shares engine, sprites, equipment, resources and the original first leaf',()=>{
 run(`resetGame();Game.intro=false;OW.msg=null;Party[0].weapon='pluma';Party[0].cur.hp=83;Party[1].cur.mp=7;Game.inventory.tubo=1;Game.pigmento=23;Game.studies.pulso=true;Game.defeated.add('1');Game.puzzle.revealed=true;var inventoryBefore=JSON.stringify([Party,Game.inventory,Game.studies,Game.puzzle,Game.pigmento]);var originalRows=MAP.rows.join('');`);
 travel(1);assert.equal(run('fieldTargets().length'),0);assert.equal(run('B.currentAction'),undefined);
 assert.equal(run(`JSON.stringify([Party,Game.inventory,Game.studies,CHAPTER.pages[0].puzzle,Game.pigmento])`),run('inventoryBefore'));
 assert(run(`OW.foes.find(f=>f.key==='N').boss`));assert(run(`SPRITES.devoralineas.eyeKind===SPRITES.tinta.eyeKind`));
 travel(0);assert.equal(run("MAP.rows.join('')"),run('originalRows'));assert.equal(run('JSON.stringify([Party,Game.inventory,Game.studies,Game.puzzle,Game.pigmento])'),run('inventoryBefore'));
});
test('transition has separate departure, empty paper and staggered reappearance; pause freezes it',()=>{
 run(`OW.msg=null;chapterBegin(1);`);chapterFrames(60);const t=run('CHAPTER.turn.t');run('Game.paused=true');chapterFrames(30);assert.equal(run('CHAPTER.turn.t'),t);run('Game.paused=false');chapterFrames(35);assert.equal(run('Game.page'),0);chapterFrames(1);assert.equal(run('Game.page'),1);assert(run('!!CHAPTER.turn.snap'));chapterFrames(74);assert.equal(run('Game.state'),'pageTurn');
 // Arrival pigment must form at the destination, not at the old world position.
 const arrival=run(`(()=>{const ellipse=g.ellipse,points=[];g.ellipse=(x,y)=>points.push([x,y]);chapterDrawTraveller(0,0,0);g.ellipse=ellipse;return {point:points[0],target:[OW.x,OW.y+1]};})()`);assert.deepEqual(arrival.point,arrival.target);
 chapterFrames(68);assert.equal(run('Game.state'),'overworld');
});
test('all three outposts have walkable access and the north seal opens only after their victories',()=>{
 run('OW.msg=null');walkRoute([[72,396],[168,396],[216,366],[232,332],[280,332],[360,332],[360,274],[408,220],[472,206],[520,190]]);
 const accessible=run(`(()=>{const seen=new Set(),q=[[72,396]];for(let n=0;n<q.length;n++){const [x,y]=q[n];for(const [dx,dy] of [[4,0],[-4,0],[0,4],[0,-4]]){const a=x+dx,b=y+dy,k=a+','+b;if(a<8||a>632||b<8||b>472||seen.has(k)||!walkable(a,b))continue;seen.add(k);q.push([a,b]);}}return CHAPTER.seals.map(s=>q.some(([x,y])=>Math.hypot(x-s.x,y-s.y)<20));})()`);assert(accessible.every(Boolean),'Each patrol has a connected walking route');assert.equal(run('walkable(520,120)'),false);run(`CHAPTER.seals.forEach(s=>Game.defeated.add(s.key))`);assert.equal(run('walkable(520,120)'),true);walkRoute([[520,120],[520,104]]);
});
test('Devoralíneas uses the same palette, ATB, colour reactions and boss phases',()=>{
 run(`Party.forEach(p=>{const s=effStats(p);p.cur.hp=s.hp;p.cur.mp=s.mp;});initBattle(OW.foes.find(f=>f.key==='N'));B.gen=null;B.tr=null;B.phase='fight';B.fightStart=-100;setState('battle');B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=0;});B.unitScale=B.propScale=1;camSet(SCENE.rest);projectUnits();B.party.forEach(u=>u.atb=100);ATB_ACTIVE=false;var boss=B.enemies[0];planEnemy(boss);`);
 assert.equal(run('boss.intent.name'),'Beber el color');assert(run(`techsFor(B.party[0]).length>0`));
 run(`executeCommand(B.party[0],{type:'attack'},[boss])`);drain();assert(run(`boss.shellHits.includes('rojo')`));
 run(`boss.hp=Math.ceil(boss.maxhp*.67);bossPhaseCheck(boss);render();`);assert.equal(run('boss.bossPhase'),2);assert.equal(run('unitSpriteInfo(boss,0).spr.__key.includes("devoralineas_2")'),true);
 run(`boss.hp=Math.ceil(boss.maxhp*.34);bossPhaseCheck(boss);render();`);assert.equal(run('boss.bossPhase'),3);
});
test('the new nib attack uses real damage and releases its tool and camera',()=>{
 const hp=run('B.party[0].hp');run(`B.enemies[0].intent={kind:'attack',target:B.party[0],name:'Zarpazo de plumilla'};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}));`);
 for(let i=0;run('B.actions.length||B.actQueue.length');i++){if(i>1000)throw Error('Unfinished nib attack');run('updateBattle();render();');}
 assert(run('B.party[0].hp')<hp);assert.equal(run('B.currentAction'),null);assert.equal(run('B.enemies[0].pose'),'idle');
});
test('victory, return and second visit keep defeated patrols without completing the original boss',()=>{
 run(`setState('overworld');OW.msg=null;Game.bossDown=false;Game.defeated.add('N');chapterWon({boss:true,key:'N'});`);assert(run('CHAPTER.complete'));assert.equal(run('Game.bossDown'),false);
 travel(0);travel(1);assert.equal(run('Game.palette'),'vivo');assert(run(`['7','8','9','N'].every(k=>Game.defeated.has(k))`));
});
test('the complete new boss can be beaten with the shared combat and finite starting supplies',()=>{
 run(`Game.inventory={...DATA.inventory};Party.forEach((p,i)=>{p.weapon=DATA.party[i].weapon;p.acc=DATA.party[i].acc;const s=effStats(p);p.cur.hp=s.hp;p.cur.mp=s.mp;});initBattle(OW.foes.find(f=>f.key==='N'));B.gen=null;B.tr=null;B.phase='fight';B.fightStart=-100;setState('battle');B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=20;});B.unitScale=B.propScale=1;camSet(SCENE.rest);projectUnits();ATB_ACTIVE=false;`);
 const result=run(`(()=>{let decisions=0;for(let f=0;f<40000&&B.phase==='fight';f++){
  if(B.menu&&!B.currentAction){const u=B.menu.unit,dead=B.party.find(p=>!p.alive),weak=alive(B.party).sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp)[0];let p={type:'attack'},t=alive(B.enemies)[0];
   if(dead&&Game.inventory.savia){p={type:'item',item:'savia'};t=dead;}else if(weak.hp<weak.maxhp*.55&&Game.inventory.gota_agua){p={type:'item',item:'gota_agua'};t=weak;}
   if(!executeCommand(u,p,[t]))throw Error('Cannot perform selected action');decisions++;
  }updateBattle();if(f%9===0)render();
 }return {phase:B.phase,decisions,hp:B.party.map(p=>p.hp)};})()`);
 assert.equal(result.phase,'victory',JSON.stringify(result));
});
test('reduced motion still completes the same trip and leaves input neutral',()=>{
 run('Prefs.shake=0;OW.msg=null');travel(0);assert.equal(run('OW.vx+OW.vy'),0);assert.equal(run('CHAPTER.turn'),null);
});
test('the third leaf opens after the Devoralíneas, and its bridges only after the three Contrarios',()=>{
 run(`resetGame();Game.intro=false;OW.msg=null;`);travel(1);
 assert.equal(run('chapterPortals().some(p=>p.to===2)'),false,'the forward fold shows before the boss falls');
 run(`CHAPTER.complete=true;`);assert.equal(run('chapterPortals().some(p=>p.to===2)'),true);
 travel(2);assert.equal(run('MAP.paper'),'#7c8272');assert.equal(run('OW.msg&&OW.msg.lines[0]'),'El agua sucia');run('OW.msg=null');
 // every lair and the back fold are reachable from the arrival; the island is sealed
 const reach=run(`(()=>{const seen=new Set(),q=[[OW.x,OW.y]];for(let n=0;n<q.length;n++){const [x,y]=q[n];for(const [dx,dy] of [[4,0],[-4,0],[0,4],[0,-4]]){const a=x+dx,b=y+dy,k=a+','+b;if(a<8||a>632||b<8||b>472||seen.has(k)||!walkable(a,b))continue;seen.add(k);q.push([a,b]);}}
  const near=(x,y)=>q.some(([a,b])=>Math.hypot(a-x,b-y)<24);return {lairs:CONTRA_LAIRS.map(l=>near(l.x*16+8,l.y*16+12)),fold:near(chapterPortal(1).x,chapterPortal(1).y),island:near(20*16+8,14*16+12)};})()`);
 assert.deepEqual(Array.from(reach.lairs),[true,true,true]);assert(reach.fold);assert.equal(reach.island,false);
 run(`['m','v','o'].forEach(k=>Game.defeated.add(k));`);assert.equal(run('walkable(20*16+8,10*16)'),true,'the bridges stay sealed');
 for(const k of ['m','v','o','X'])assert(run(`OW.foes.some(f=>f.key==='${k}')`),k);assert(run(`OW.foes.find(f=>f.key==='X').contra`));assert.equal(run(`OW.foes.some(f=>f.key==='Z')`),false,'El Negro before the three fall');
 travel(1);travel(2);assert.equal(run('Game.page'),2);
});
test('the three Contrarios fight together as we do: tools, colour techniques, dirty mixes and a black rainbow',()=>{
 for(const [hero,c] of [['rojo','moho'],['amarillo','moraton'],['azul','oxido']]) { assert.equal(run(`colorMult('${hero}','${c}')`),2);assert.equal(run(`colorMult('${c}','${hero}')`),2); }
 const setup=()=>run(`Party.forEach(p=>{const s=effStats(p);p.cur.hp=s.hp;p.cur.mp=s.mp;});initBattle({...OW.foes[0],key:'X',enemies:DATA.encounters.X,boss:false});B.gen=null;B.tr=null;B.phase='fight';B.fightStart=-100;setState('battle');B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=0;});B.unitScale=B.propScale=1;camSet(SCENE.rest);projectUnits();B.negroPlanned=false;`);
 setup();assert.deepEqual(Array.from(run('B.enemies.map(e=>e.id)')),['moho','moraton','oxido']);
 const play=(who,acts,expect)=>{const hp=run('B.party.reduce((a,u)=>a+u.hp,0)');
  run(`(()=>{const u=B.enemies.find(e=>e.id==='${who}');u.acts=${acts};planEnemy(u);if(u.intent.kind!=='${expect}')throw Error('${who} planned '+u.intent.kind+' not ${expect}');B.actQueue.push(tracked(u,actEnemy(u),[u],{type:'enemy'}));})()`);
  for(let i=0;run('B.actions.length||B.actQueue.length');i++){if(i>3000)throw Error(who+' '+expect+' never ends');run('updateBattle();render();');}
  assert(run('B.party.reduce((a,u)=>a+u.hp,0)')<hp,who+' '+expect+' did no damage');assert.equal(run('B.currentAction'),null);
  assert(run('B.enemies.every(e=>!e.acting)'),'a partner was left acting');run('B.party.forEach(u=>{u.hp=u.maxhp;u.alive=true;u.pose="idle";})');};
 play('moho',0,'attack');play('moraton',1,'tech');play('oxido',1,'tech');
 play('moho',2,'mix');play('moraton',2,'mix');
 play('oxido',3,'negro');assert.equal(run('B.negroPlanned'),true);
});
test('the Contrarios have their own intro: they surface, talk, face each drop, flood the page and start their track',()=>{
 run(`resetGame();Game.intro=false;OW.msg=null;CHAPTER.complete=true;chapterInstall(1);chapterInstall(2);['m','v','o'].forEach(k=>Game.defeated.add(k));OW.msg=null;var played=[];Audio.play=(n)=>played.push(n);`);
 const stages=run(`(()=>{const foe=OW.foes.find(f=>f.key==='X');OW.x=foe.x;OW.y=foe.y+20;startTransition(foe);const seen=[];let n=0;
  while(Game.state==='transition'){if(++n>4000)throw Error('intro never ends');if(B.tr&&B.tr.stage==='dialogue')pressed.ok=true;updateTransition();drawTransition();for(const k in pressed)pressed[k]=false;const s=B.tr&&B.tr.stage;if(s&&seen[seen.length-1]!==s)seen.push(s);}
  return seen;})()`);
 assert.deepEqual(Array.from(stages),['surface','dialogue','versus','flood','tide']);assert.equal(run('Game.state'),'battle');
 assert(run(`played.includes('contrarios')`));assert.equal(run('DATA.bossDialogue'),run('DIRTY_DIALOGUE'),'the trio borrowed El Negro\'s dialogue and kept it');
 run(`Audio.play=()=>{}`);
});
test('the three together can be beaten with the shared combat and starting supplies',()=>{
 run(`Game.inventory={...DATA.inventory};Party.forEach((p,i)=>{p.weapon=DATA.party[i].weapon;p.acc=DATA.party[i].acc;const s=effStats(p);p.cur.hp=s.hp;p.cur.mp=s.mp;});initBattle({...OW.foes[0],key:'X',enemies:DATA.encounters.X,boss:false});B.gen=null;B.tr=null;B.phase='fight';B.fightStart=-100;setState('battle');B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=0;});B.unitScale=B.propScale=1;camSet(SCENE.rest);projectUnits();B.negroPlanned=false;`);
 const result=run(`(()=>{for(let f=0;f<60000&&B.phase==='fight';f++){
  if(B.menu&&!B.currentAction){const u=B.menu.unit,dead=B.party.find(p=>!p.alive),weak=alive(B.party).sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp)[0];let p={type:'attack'},t=alive(B.enemies).sort((a,b)=>a.hp-b.hp)[0];
   if(dead&&Game.inventory.savia){p={type:'item',item:'savia'};t=dead;}else if(weak.hp<weak.maxhp*.55&&Game.inventory.gota_agua){p={type:'item',item:'gota_agua'};t=weak;}
   if(!executeCommand(u,p,[t]))throw Error('Cannot perform selected action');}
  updateBattle();if(f%9===0)render();}return {phase:B.phase,hp:B.party.map(p=>p.hp),enemies:B.enemies.map(e=>e.hp)};})()`);
 assert.equal(result.phase,'victory',JSON.stringify(result));
});
test('El Negro fuses the three, changes with its phases and can be beaten with the shared combat',()=>{
 run(`Game.inventory={...DATA.inventory};Party.forEach((p,i)=>{p.weapon=DATA.party[i].weapon;p.acc=DATA.party[i].acc;const s=effStats(p);p.cur.hp=s.hp;p.cur.mp=s.mp;});initBattle({...OW.foes[0],key:'Z',enemies:DATA.encounters.Z,boss:true});B.gen=null;B.tr=null;B.phase='fight';B.fightStart=-100;setState('battle');B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=0;});B.unitScale=B.propScale=1;camSet(SCENE.rest);projectUnits();var boss=B.enemies[0];`);
 run(`boss.hp=Math.ceil(boss.maxhp*.67);bossPhaseCheck(boss);render();`);assert(run('unitSpriteInfo(boss,0).spr.__key.includes("el_negro_2")'));
 run(`boss.hp=boss.maxhp;boss.bossPhase=1;`);
 const result=run(`(()=>{for(let f=0;f<60000&&B.phase==='fight';f++){
  if(B.menu&&!B.currentAction){const u=B.menu.unit,dead=B.party.find(p=>!p.alive),weak=alive(B.party).sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp)[0];let p={type:'attack'},t=alive(B.enemies)[0];
   if(dead&&Game.inventory.savia){p={type:'item',item:'savia'};t=dead;}else if(weak.hp<weak.maxhp*.55&&Game.inventory.gota_agua){p={type:'item',item:'gota_agua'};t=weak;}
   if(!executeCommand(u,p,[t]))throw Error('Cannot perform selected action');}
  updateBattle();if(f%9===0)render();}return {phase:B.phase,hp:B.party.map(p=>p.hp),boss:B.enemies[0].hp};})()`);
 assert.equal(result.phase,'victory',JSON.stringify(result));
 run(`setState('overworld');Game.page=2;OW.msg=null;chapterWon({key:'X'});`);assert(run(`OW.foes.some(f=>f.key==='Z'&&f.boss)`),'El Negro does not rise');run(`OW.msg=null;chapterWon({boss:true,key:'Z'});`);assert(run('CHAPTER.complete2'));assert.equal(run('Game.palette'),'vivo');
});
console.log(tests+' shared-book integration checks passed.');
