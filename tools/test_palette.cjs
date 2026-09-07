/* Spatial controls and real pointer callbacks must agree with the painted wells. */
const {ctx,run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(name,fn){scenario();run("releaseInputs();Prefs.camera='suave';Prefs.shake=.5;Prefs.bindings={...DEFAULT_BINDINGS};MOBILE.enabled=false;openCmd(B.party[0]);");fn();checks++;console.log('PASS '+name);}
function press(action){run(`pressed.${action}=true;updateBattleMenu()`);}
function draw(){run('UI_HITS.length=0;UI_TEXT.length=0;drawBattleUI()');}
function tapTool(i){run(`{const [x,y]=PALETTE_TOOLS[${i}],px=PALETTE_ORIGIN.x+x,py=PALETTE_ORIGIN.y+y;UI_HITS.slice().reverse().find(h=>px>=h.x&&px<=h.x+h.w&&py>=h.y&&py<=h.y+h.h).run();updateBattleMenu();}`);}
test('four directions follow the wells without switching painters or moving the camera',()=>{
 run('updateMenuCamera();for(let i=0;i<46;i++)camTick();var palettePose=JSON.stringify(SCENE.cam),paletteResources=JSON.stringify(B.party.map(u=>[u.mp,u.atb]));');
 for(const [key,expected] of [['right',1],['down',3],['right',2],['up',1],['left',0],['down',4],['right',3]]){
  press(key);assert.equal(run('B.menu.idx'),expected,key);assert.equal(run('B.menu.unit.id'),'carmin');
  run('updateMenuCamera();camTick()');assert.equal(run('JSON.stringify(SCENE.cam)===palettePose'),true);
 }
 assert.equal(run('JSON.stringify(B.party.map(u=>[u.mp,u.atb]))===paletteResources'),true);
});
test('every tool is reachable with directions, and pressing beyond an edge holds selection',()=>{
 for(let start=0;start<5;start++){
  const reached=new Set([start]),queue=[start];
  while(queue.length){const i=queue.shift();for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){const next=run(`paletteNeighbor(${i},${dx},${dy})`);if(!reached.has(next)){reached.add(next);queue.push(next);}}}
  assert.equal(reached.size,5,'Unreachable well from '+start);
 }
 run('B.menu.idx=2');press('right');assert.equal(run('B.menu.idx'),2);
});
test('a touch selects another well before opening, with no premature resource spend',()=>{
 draw();tapTool(4);assert.equal(run('B.menu.level'),'cmd');assert.equal(run('B.menu.idx'),4);
 draw();tapTool(4);assert.equal(run('B.menu.level'),'target');assert.equal(run('B.menu.pending.type'),'reload');
 assert.equal(run('B.party[0].atb'),100);assert.equal(run('B.actQueue.length'),0);
});
test('painted names are touch targets and hover keeps all hit areas stationary',()=>{
 draw();run('var paletteHits=JSON.stringify(UI_HITS.filter(h=>h.hover).map(h=>[h.x,h.y,h.w,h.h]));');
 run("{const label=UI_TEXT.find(t=>t.text==='Objetos');UI_HITS.slice().reverse().find(h=>h.hover&&label.x>=h.x&&label.x<=h.x+h.w&&label.y>=h.y&&label.y<=h.y+h.h).run();}");
 assert.equal(run('B.menu.idx'),2);assert.equal(run('B.menu.level'),'cmd');
 run('B.t+=4');draw();assert.equal(run('JSON.stringify(UI_HITS.filter(h=>h.hover).map(h=>[h.x,h.y,h.w,h.h]))===paletteHits'),true);
});
test('Tab and the owner tab cycle ready painters and remember each tool',()=>{
 run('B.party[1].atb=20;B.party[2].lastCmd=3;');press('swap');
 assert.equal(run('B.menu.unit.id'),'anil');assert.equal(run('B.menu.idx'),3);
 draw();run('UI_HITS.find(h=>h.y===33&&h.h===16).run()');assert.equal(run('B.menu.unit.id'),'carmin');
 run('B.party[2].acting=true');press('swap');assert.equal(run('B.menu.unit.id'),'carmin');
 run('B.party[2].acting=false;B.reservation={users:[B.party[2]]}');press('swap');assert.equal(run('B.menu.unit.id'),'carmin');
});
test('one full brush does not freeze the other painters in either time mode',()=>{
 for(const mode of ['active','wait']){
  run(`Prefs.mode='${mode}';ATB_ACTIVE=Prefs.mode==='active';B.party[0].atb=100;B.party[1].atb=90;B.party[2].atb=80;B.enemies.forEach(u=>{u.atb=0;u.spd=1;});B.party.forEach(u=>u.spd=10);openCmd(B.party[0]);for(let i=0;i<40;i++)updateBattleClock();`);
  assert.equal(run('B.menu.unit.id'),'carmin','Auto-selection stole the current painter');
  assert.equal(run('readyPainters().length'),3,mode+' froze at the first ready painter');
  press('swap');assert.equal(run('B.menu.unit.id'),'ambar');
 }
});
test('Tab can leave techniques, items and targets without spending any resources',()=>{
 for(const level of ['tech','item','target']){
  run(`openCmd(B.party[0]);B.menu.level='${level}';B.menu.pending={type:'attack'};B.party[1].lastCmd=2;var swapResources=JSON.stringify([B.party.map(u=>[u.hp,u.mp,u.atb]),Game.inventory]);`);
  press('swap');assert.equal(run('B.menu.unit.id'),'ambar');assert.equal(run('B.menu.idx'),2);
  assert(run('JSON.stringify([B.party.map(u=>[u.hp,u.mp,u.atb]),Game.inventory])===swapResources'));
  assert.equal(run('B.actQueue.length'),0);
 }
});
test('portraits switch painters while targeting an enemy, but select recipients for healing',()=>{
 run("beginTarget(B.menu,{type:'attack'})");draw();
 run('UI_HITS.find(h=>h.x===109&&h.y===148).run()');assert.equal(run('B.menu.unit.id'),'ambar');
 run("beginTarget(B.menu,{type:'item',item:'gota_agua'})");draw();
 run('UI_HITS.find(h=>h.x===215&&h.y===148).run()');assert.equal(run('B.menu.unit.id'),'ambar');assert.equal(run('selectedTargets(B.menu)[0].id'),'anil');assert.equal(run('B.actQueue.length'),0);
});
test('Active keeps charging during every selection; Wait pauses only inside submenus',()=>{
 for(const level of ['cmd','tech','item','target'])for(const mode of ['active','wait']){
  run(`releaseInputs();openCmd(B.party[0]);B.menu.level='${level}';B.menu.pending={type:'attack'};ATB_ACTIVE='${mode}'==='active';B.party[2].atb=40;B.enemies.forEach(u=>u.atb=20);updateBattleClock();`);
  assert.equal(run('B.party[2].atb>40'),mode==='active'||level==='cmd',mode+' / '+level);
 }
});
test('an enemy action in Active preserves the pending selection and ignores hidden target controls',()=>{
 run("ATB_ACTIVE=true;B.party[0].hp=1000;beginTarget(B.menu,{type:'item',item:'gota_agua'});B.menu.tidx=2;var pendingMenu=B.menu,itemsBefore=JSON.stringify(Game.inventory);B.enemies[0].atb=100;B.enemies[0].intent={kind:'attack',target:B.party[0]};updateBattleClock();updateBattle();");
 draw();run('UI_HITS.find(h=>h.x===215&&h.y===148).run()');assert.equal(run('pressed.ok'),false);
 run('for(let i=0;B.actions.length||B.actQueue.length;i++){if(i>1200)throw Error("Enemy action never ended");updateBattle();render();}');
 assert(run('B.menu===pendingMenu'));assert.equal(run('B.menu.tidx'),2);assert(run('JSON.stringify(Game.inventory)===itemsBefore'));assert(run('B.party[0].hp<1000'));
});
test('back returns to the exact command, technique and object without changing painters',()=>{
 for(const command of [0,3,4]){
  run(`openCmd(B.party[0]);B.menu.idx=${command}`);press('ok');assert.equal(run('B.menu.level'),'target');press('back');assert.equal(run('B.menu.idx'),command);assert.equal(run('B.menu.level'),'cmd');
 }
 for(const level of ['tech','item']){
  run(`openCmd(B.party[0]);B.menu.level='${level}';B.menu.idx=2`);press('ok');assert.equal(run('B.menu.level'),'target');press('back');assert.equal(run('B.menu.level'),level);assert.equal(run('B.menu.idx'),2);
 }
 run('openCmd(B.party[0])');press('back');assert.equal(run('B.menu.unit.id'),'carmin');
});
test('role pigment costs preview on focus and unavailable actions stay safely in the palette',()=>{
 run('openCmd(B.party[1]);B.menu.idx=3;B.party[1].mp=1');assert.equal(run('selectedPaintCost(B.party[1])'),2);
 press('ok');assert.equal(run('B.menu.level'),'cmd');assert.equal(run('B.party[1].mp'),1);assert.equal(run('B.party[1].atb'),100);
});
test('mouse wheel cycles the palette deliberately and respects overlay input ownership',()=>{
 const handlers={};ctx.document.getElementById('c').addEventListener=(name,fn)=>handlers[name]=fn;
 let now=500;ctx.performance.now=()=>now;run('initPlayerControls()');
 const event={deltaY:1,preventDefault(){}};handlers.wheel(event);assert.equal(run('B.menu.idx'),1);
 handlers.wheel(event);assert.equal(run('B.menu.idx'),1);
 now+=120;handlers.wheel(event);assert.equal(run('B.menu.idx'),2);assert.equal(run('B.menu.unit.lastCmd'),2);
 run('openOverlay("settings")');now+=120;handlers.wheel(event);assert.equal(run('B.menu.idx'),2);
});
console.log(checks+' palette interaction checks passed.');
