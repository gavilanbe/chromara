/* Real action generators + world projection: camera framing, subject ownership,
   continuous orbit, fixed-camera preference and unchanged combat outcomes. */
const {run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(label,fn){fn();checks++;console.log('PASS '+label);}
function start(p,who=0,kind='5',target=0){
 scenario(kind);run(`Prefs.camera='suave';Prefs.speed=1;Prefs.short=false;Prefs.shake=.5;ATB_ACTIVE=false;camSet(menuCameraPose(null));executeCommand(B.party[${who}],${JSON.stringify(p)},[validTargets(${JSON.stringify(p)},B.party[${who}])[${target}]])`);
}
function trace(){return run(`(()=>{const rows=[];for(let i=0;B.actQueue.length||B.actions.length;i++){
 if(i>3000)throw Error('Unfinished camera action');updateBattle();projectUnits();const a=B.currentAction,s=SCENE.shot;if(!a||!s)continue;
 rows.push({t:B.t,phase:s.phase,age:B.t-s.at,yaw:SCENE.cam.yaw,scale:SCENE.cam.uiScale,targets:a.targets.map(u=>({id:u.id,kind:u.kind,sc:u.sc,box:cameraBounds(u,SCENE.cam),goal:cameraBounds(u,SCENE.goal||SCENE.cam)})),subjects:s.subjects.map(u=>u.kind),pose:{...SCENE.cam}});
 }return rows})()`);}
function finite(rows){assert(rows.length>15);for(const r of rows)for(const k of ['x','y','h','f','hy','cx','yaw','uiScale'])assert(Number.isFinite(r.pose[k]),k+': '+JSON.stringify(r));}
function contained(box,pad=0){return box&&box[0]>=-pad&&box[1]>=26-pad&&box[2]<=320+pad&&box[3]<=146+pad;}
test('target selection gives its chosen recipients the frame, including fallen allies',()=>{
 for(const group of ['1','2','3','4','5','6','B'])for(const p of [{type:'attack'},{type:'item',item:'gota_agua'},{type:'item',item:'savia'},{type:'reload'}]){
  scenario(group);run(`Prefs.camera='suave';${p.item==='savia'?'kill(B.party[1]);':''}openCmd(B.party[0]);beginTarget(B.menu,${JSON.stringify(p)});camSet(menuCameraPose(B.menu));projectUnits()`);
  const r=run('selectedTargets(B.menu).map(u=>({box:cameraBounds(u,SCENE.cam),sc:u.sc}))');
  for(const u of r)assert(contained(u.box),JSON.stringify({group,p,u}));
  if(p.type!=='attack')assert(r.some(u=>u.sc>1),'Healing selection stayed too far away');
 }
});
test('every selectable enemy stays visible when switching the target, including boss companions',()=>{
 for(const group of ['1','2','3','4','5','6','B']){
  scenario(group);run("releaseInputs();Prefs.camera='suave';openCmd(B.party[0]);beginTarget(B.menu,{type:'attack'});updateMenuCamera();for(let i=0;i<46;i++)camTick();projectUnits();var targetTeamPose=JSON.stringify(SCENE.cam)");
  for(let i=0;i<run('B.enemies.length');i++){
   run('pressed.right=true;updateBattleMenu();updateMenuCamera();for(let i=0;i<40;i++)camTick();projectUnits()');
   const team=run('validTargets(B.menu.pending,B.menu.unit).map(u=>({id:u.id,visible:cameraShowsUnit(u),box:cameraBounds(u,SCENE.cam)}))');
   for(const u of team){assert(u.visible,group+' hid '+u.id);assert(contained(u.box),JSON.stringify({group,u}));}
   assert(run('JSON.stringify(SCENE.cam)===targetTeamPose'),'Cursor movement cropped another target');
  }
 }
});
test('healing items and MP tubes stay on their actual recipient throughout the animation',()=>{
 for(const item of ['gota_agua','tubo','savia']){
  scenario();run(`Prefs.camera='suave';Prefs.short=false;Prefs.speed=1;${item==='savia'?'kill(B.party[1]);':''}B.party[1].hp=${item==='savia'?0:30};B.party[1].mp=2;camSet(menuCameraPose(null));executeCommand(B.party[0],{type:'item',item:'${item}'},[B.party[1]])`);
  const rows=trace();finite(rows);assert(rows.every(r=>r.targets.every(t=>t.kind==='party')));
  const settled=rows.filter(r=>r.age>24);assert(settled.length>10);
  assert(settled.every(r=>r.targets.every(t=>contained(t.box,4))),item+' recipient cropped');
  assert(settled.some(r=>r.targets[0].sc>1.1),item+' still wide');
  assert(Math.abs(rows.at(-1).yaw-rows[0].yaw)>.4,item+' has no orbit');
 }
});
test('each enemy shape follows the attacked teammate, including a protecting guardian',()=>{
 for(const shape of ['round','splash','tall','blob']){
  scenario();run(`Prefs.camera='suave';Prefs.short=false;B.enemies[0].data={...B.enemies[0].data,shape:'${shape}'};B.enemies[0].intent={kind:'attack',target:B.party[2]};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}));camSet(menuCameraPose(null))`);
  const rows=trace();finite(rows);assert(rows.some(r=>r.phase==='source'));
  const receivers=rows.filter(r=>r.phase==='target'&&r.age>26);assert(receivers.length>0);
  assert(receivers.some(r=>r.targets[0].sc>1.05),shape+' recipient too small');
  assert(receivers.filter(r=>contained(r.targets[0].box,8)).length/receivers.length>.8,shape+' target lost');
 }
 scenario();run("Prefs.camera='suave';B.party[0].guard={target:B.party[2],charges:1};B.enemies[0].intent={kind:'attack',target:B.party[2]};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}))");
 const rows=trace();assert(rows.some(r=>r.targets[0].id==='carmin'),'Cover did not redirect camera');
});
test('every technique has finite camera poses and keeps its target shot inside the playfield',()=>{
 for(const id of run('Object.keys(DATA.techs)')){
  scenario('B');run(`Prefs.camera='suave';Prefs.short=false;var cameraTech=DATA.techs['${id}'],cameraUser=B.party.find(u=>u.id===(cameraTech.user||cameraTech.users[0]));if(cameraTech.weapon)cameraUser.data.weapon=cameraTech.weapon;B.enemies.forEach(u=>{u.hp=u.maxhp=100000;u.boss=false});executeCommand(cameraUser,{type:'tech',techId:'${id}'},validTargets({type:'tech',techId:'${id}'},cameraUser))`);
  const rows=trace();finite(rows);
  for(const r of rows.filter(r=>r.phase==='target'&&r.age>0))for(const t of r.targets)assert(contained(t.goal,2),id+' goal outside '+JSON.stringify(t.goal));
 }
});
test('boss waves frame the whole team while pigment theft singles out its victim',()=>{
 for(const kind of ['steal','tide','erase']){
  scenario('B');run(`Prefs.camera='cinema';Prefs.short=false;B.enemies[0].intent={kind:'${kind}',target:B.party[1],all:'${kind}'!=='steal',name:'Prueba'};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}))`);
  const rows=trace();finite(rows);const targetRows=rows.filter(r=>r.phase==='target'&&r.age>20);assert(targetRows.length>0);
  for(const r of targetRows){assert.equal(r.targets.length,kind==='steal'?1:3);assert(r.targets.every(t=>contained(t.goal,2)));}
 }
});
test('cinematic mode rotates further; fixed mode never starts an action orbit',()=>{
 const ranges=[];
 for(const mode of ['suave','cinema']){
  start({type:'item',item:'tubo'});run(`Prefs.camera='${mode}'`);const rows=trace().filter(r=>r.age>=20);ranges.push(Math.max(...rows.map(r=>r.yaw))-Math.min(...rows.map(r=>r.yaw)));
 }
 assert(ranges[1]>ranges[0],JSON.stringify(ranges));
 start({type:'attack'});run("Prefs.camera='fija';const fixedYaw=SCENE.cam.yaw");run('for(let i=0;(B.actions.length||B.actQueue.length)&&i<500;i++)updateBattle()');
 assert.equal(run('SCENE.shot'),null);assert.equal(run('SCENE.cam.yaw===fixedYaw'),true);
});
test('paused options freeze the orbit and closing actions do not reset to the wide rest shot',()=>{
 start({type:'item',item:'gota_agua'});run('for(let i=0;i<40;i++)updateBattle();const beforePause=JSON.stringify(SCENE.cam);openOverlay("settings");for(let i=0;i<20;i++)update()');assert.equal(run('JSON.stringify(SCENE.cam)===beforePause'),true);
 run('closeOverlay();const heldShot=SCENE.shot;camReset()');assert.equal(run('SCENE.shot===heldShot'),true);
 run("Prefs.camera='cinema';changeOption(3,1);const fixedMidAction={...SCENE.cam};for(let i=0;i<10;i++)updateBattle()");assert.equal(run('Prefs.camera'), 'fija');assert.equal(run('SCENE.cam.yaw===fixedMidAction.yaw'),true);
});
test('orbit ticks are deterministic and do not consume combat RNG',()=>{
 start({type:'attack'});run('updateBattle();Math.random=()=>{throw Error("camera consumed RNG")};for(let i=0;i<20;i++){B.t++;camTick();projectUnits()}');run('Math.random=()=>.5');
});
test('the palette gives its painter a close shot and browsing does not restart the camera',()=>{
 for(const who of [0,1,2]){
  scenario();run(`Prefs.camera='suave';openCmd(B.party[${who}]);updateMenuCamera();for(let i=0;i<46;i++)camTick();projectUnits()`);
  assert(run('B.menu.unit.sc')>1.5,'Painter too far from palette');
  assert(contained(run('cameraBounds(B.menu.unit,SCENE.cam)')));
  run("var heldMenuPose=JSON.stringify(SCENE.cam);B.menu.idx=1;updateMenuCamera();B.menu.level='tech';updateMenuCamera();for(let i=0;i<60;i++)camTick()");
  assert.equal(run('JSON.stringify(SCENE.cam)===heldMenuPose'),true,'Browsing moved the camera');
 }
});
test('menu travel eases in, holds its destination and keeps the same duration at 2x',()=>{
 const snapshots=[];
 for(const speed of [1,2]){
  scenario();run(`Prefs.camera='suave';Prefs.speed=${speed};openCmd(B.party[0]);updateMenuCamera();var menuStart={...SCENE.cam};for(let i=0;i<5*Prefs.speed;i++)camTick()`);
  const fraction=run('Math.abs((SCENE.cam.yaw-menuStart.yaw)/(SCENE.goal.yaw-menuStart.yaw))');assert(fraction<.04,'Abrupt first camera step');
  run('for(let i=0;i<18*Prefs.speed;i++)camTick()');snapshots.push(run('JSON.stringify(SCENE.cam)'));
  assert(run('SCENE.menuMove!==null'),'Shot finished too soon');
  run('for(let i=0;i<23*Prefs.speed;i++)camTick()');assert.equal(run('SCENE.menuMove'),null);
  assert(run('Math.abs(SCENE.cam.f-SCENE.goal.f)')<1e-9);
 }
 assert.equal(snapshots[0],snapshots[1]);
});
test('retargeting during travel remains continuous and selecting never spends resources',()=>{
 scenario();run("Prefs.camera='suave';Prefs.speed=1;openCmd(B.party[0]);beginTarget(B.menu,{type:'attack'});updateMenuCamera();for(let i=0;i<11;i++)camTick();const beforeRetarget={...SCENE.cam},beforeDecision=JSON.stringify(B.party.map(u=>[u.hp,u.mp,u.atb]));pressed.right=true;updateBattleMenu();updateMenuCamera()");
 assert.equal(run('JSON.stringify(SCENE.cam)===JSON.stringify(beforeRetarget)'),true);
 run('for(let i=0;i<38;i++)camTick();projectUnits()');assert(contained(run('cameraBounds(selectedTargets(B.menu)[0],SCENE.cam)')));
 assert.equal(run('JSON.stringify(B.party.map(u=>[u.hp,u.mp,u.atb]))===beforeDecision'),true);
 run("openOverlay('settings');const menuPause=JSON.stringify(SCENE.cam);for(let i=0;i<20;i++)update()");assert.equal(run('JSON.stringify(SCENE.cam)===menuPause'),true);
});
test('normal attacks and items respect 1x; only seen techniques use the optional abbreviation',()=>{
 scenario();run("Prefs.speed=1;Prefs.short=true;B.currentAction={command:{type:'attack'},tier:0,seen:true}");assert.equal(run('battleUpdateRate()'),1);
 run("B.currentAction.command={type:'item'}");assert.equal(run('battleUpdateRate()'),1);
 run("B.currentAction.command={type:'tech'}");assert.equal(run('battleUpdateRate()'),1.6);
 run('Prefs.short=false');assert.equal(run('battleUpdateRate()'),1);
});
console.log(checks+' action camera checks passed.');
