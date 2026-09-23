/* Sepia's shop: level-2 mixes are bought with pigment, change name, power and cost everywhere the
   tech is read, dispatch their own choreography, and the merchant never cuts a path on the map. */
const {run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(name,fn){fn();console.log('PASS '+name);checks++;}
const MIXES=['llamarada','brote','eclipse','arcoiris'];
test('every mix has a level 2 recipe with a new name and more power',()=>{
 for(const id of MIXES){
  const t=run(`DATA.techs['${id}']`),cost=run(`DATA.merchant.recipes['${id}']`);
  assert(t.lv2&&t.lv2.name&&t.lv2.name!==t.name,id);assert(t.lv2.power>t.power,id);assert(t.lv2.mp>=t.mp,id);assert(cost>0,id);
 }
});
test('buying spends pigment once, refuses without enough, and levels the tech up',()=>{
 run(`resetGame();Game.state='overworld';openShop();Game.pigmento=10;Game.overlay.idx=0;pressed.ok=true;updateOverlay();`);
 assert.equal(run('Game.pigmento'),10);assert.equal(run("techLevel('llamarada')"),1);
 run(`Game.pigmento=50;pressed.ok=true;updateOverlay();`);
 assert.equal(run('Game.pigmento'),50-run("DATA.merchant.recipes.llamarada"));assert.equal(run("techLevel('llamarada')"),2);
 run(`pressed.ok=true;updateOverlay();`);assert.equal(run('Game.pigmento'),50-run("DATA.merchant.recipes.llamarada"),'bought twice');
 run('resetGame()');assert.equal(run("techLevel('llamarada')"),1,'a new game forgets the recipes');
});
test('level 2 changes the menu name, stamp, preview and paint cost',()=>{
 scenario();run(`Game.techLevels={llamarada:2};`);
 const row=run(`techsFor(B.party[0]).find(e=>e.id==='llamarada')`);
 assert.equal(row.t.name,'Fénix');assert.equal(row.cost,run("DATA.techs.llamarada.lv2.mp"));
 assert.equal(run(`actionName({type:'tech',techId:'llamarada'},B.party[0])`),'Fénix');
 const lv1=run(`(Game.techLevels={},previewAction(B.party[0],{type:'tech',techId:'llamarada'},B.enemies[0]))`),lv2=run(`(Game.techLevels={llamarada:2},previewAction(B.party[0],{type:'tech',techId:'llamarada'},B.enemies[0]))`);
 assert(lv2.hi>lv1.hi,'level 2 does not hit harder');assert.equal(lv2.effect,run('DATA.techs.llamarada.lv2.rule'));
});
test('each level 2 choreography runs to the end, spends its own cost and deals damage',()=>{
 for(const id of MIXES){
  scenario();run(`Game.techLevels={${id}:2};B.party.forEach(u=>{u.atb=100;u.mp=40});B.enemies.forEach(e=>{e.hp=e.maxhp=100000});`);
  const users=run(`DATA.techs['${id}'].users`),hp=run('B.enemies.map(e=>e.hp)');
  run(`executeCommand(B.party.find(p=>p.id==='${users[0]}'),{type:'tech',techId:'${id}'},validTargets({type:'tech',techId:'${id}'},B.party.find(p=>p.id==='${users[0]}')))`);
  assert(run(`techCost(B.party.find(p=>p.id==='${users[0]}'),techData('${id}'))`)>run(`techCost(B.party.find(p=>p.id==='${users[0]}'),DATA.techs['${id}'])`),id+' level 2 should cost more paint');
  run(`for(let i=0;B.actions.length||B.actQueue.length;i++){if(i>3000)throw Error('${id} never ended');updateBattle();}`);
  for(const uid of users)assert.equal(run(`B.party.find(p=>p.id==='${uid}').mp`),40-run(`techCost(B.party.find(p=>p.id==='${uid}'),techData('${id}'))`),id+' cost');
  assert(run('B.enemies.map(e=>e.hp)').some((h,i)=>h<hp[i]),id+' dealt no damage');
  assert(run('B.party.every(u=>u.wz===0&&u.wx===u.hx&&u.wy===u.hy)'),id+' left someone out of place');
 }
});
test('Sepia stands in the Refugio, blocks her own spot, opens the shop and is reachable from the start',()=>{
 run(`resetGame();Game.intro=false;initOverworld();OW.msg=null;setState('overworld');`);
 const m=run('merchantAt()');assert(m,'no merchant on the map');assert.equal(run(`walkable(${m.x},${m.y})`),false);
 run(`OW.x=${m.x};OW.y=${m.y}+22;pressed.ok=true;updateOverworld();`);assert.equal(run('Game.overlay?.type'),'shop');
 run('closeOverlay()');
 const lost=run(`(()=>{const nx=MAP.w*4,ny=MAP.h*4,start=[Math.round(MAP.spawn[0]*4+2),Math.round(MAP.spawn[1]*4+3)],seen=new Set([start[1]*nx+start[0]]),q=[start];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=b*nx+a;if(a<0||b<0||a>=nx||b>=ny||seen.has(k)||!walkable(a*4,b*4))continue;seen.add(k);q.push([a,b]);}}
  const near=(x,y,r)=>q.some(([a,b])=>Math.hypot(a*4-x,b*4-y)<r);
  return [['sepia',${m.x},${m.y}+18],['vaso',MAP.jar.x*16+16,MAP.jar.y*16+34]].filter(([,x,y])=>!near(x,y,20)).map(t=>t[0]);})()`);
 assert.equal(lost.length,0,'unreachable: '+[...lost].join(','));
});
console.log(checks+' shop checks passed.');
