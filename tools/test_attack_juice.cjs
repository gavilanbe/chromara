/* Real generators and effects: contact timing, material identity, render-pure
   feedback, bounded trails, reduced motion and multi-hit cadence. */
const {run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(name,fn){fn();console.log('PASS '+name);checks++;}
function setup(){scenario('B');run(`Prefs.camera='suave';Prefs.shake=.5;Prefs.flash=.4;Prefs.short=false;ATB_ACTIVE=false;B.menu=null;B.party.forEach(u=>u.atb=0);B.enemies.forEach(u=>{u.hp=u.maxhp=100000;u.boss=false});`);}
function trace(code){return run(`(()=>{${code};const rows=[],seen=new Set();for(let i=0;B.actions.length||B.actQueue.length;i++){
 if(i>3000)throw Error('Unfinished action');updateBattle();
 for(const f of B.fx)if(f.material&&!seen.has(f)){seen.add(f);rows.push({at:i,material:f.material,accent:f.accent,power:f.power,stop:B.hitstop,tool:B.fx.filter(x=>x.tool).map(x=>({kind:x.tool,k:x.stroke.k,lift:x.stroke.lift}))});}
 }return rows;})()`);}
test('four basic tools contact before lifting and preserve damage previews',()=>{
 for(const weapon of ['brocha','lapiz','pincel','pluma']){
  setup();run(`B.party[0].data.weapon='${weapon}';B.party[0].atb=100;`);
  const before=run('B.enemies[0].hp'),preview=run("previewAction(B.party[0],{type:'attack'},B.enemies[0])");
  const rows=trace("executeCommand(B.party[0],{type:'attack'},[B.enemies[0]])");
  assert(rows.length>0,weapon);const hit=rows[0];assert.equal(hit.material,weapon);
  assert(hit.tool.some(t=>t.kind===weapon&&t.k>0&&t.lift===0),weapon+' landed after lifting');
  assert(hit.at>=32&&hit.at<120,weapon+' lost its readable lead-in');
  const delta=before-run('B.enemies[0].hp');assert(delta>=preview.lo&&delta<=preview.hi,weapon+' changed damage');
  assert.equal(run('B.party[0].gesture'),null);assert.equal(run('B.party[0].wz'),0);
 }
});
test('multi-hit techniques build toward a heavier last hit without adding hits',()=>{
 for(const [id,user,weapon,count] of [['trazo',1,'lapiz',2],['punteado',1,'pincel',4],['taquigrafia',1,'pluma',3]]){
  setup();run(`B.party[${user}].data.weapon='${weapon}';B.party[${user}].atb=100;`);
  const rows=trace(`executeCommand(B.party[${user}],{type:'tech',techId:'${id}'},[B.enemies[0]])`);
  assert.equal(rows.length,count,id);assert(rows.slice(0,-1).every(r=>r.accent==='tap'),id);
  assert.equal(rows.at(-1).accent,'finish');assert(rows.at(-1).power>rows[0].power);assert(rows.at(-1).stop>rows[0].stop);
  if(id==='taquigrafia')assert(rows.every(r=>r.tool.some(t=>t.lift===0)),id+' detached contact');
 }
});
test('every technique and enemy shape renders finite effects and releases transient state',()=>{
 const commands=run('Object.keys(DATA.techs)').map(id=>`var tech=DATA.techs['${id}'],u=B.party.find(p=>p.id===(tech.user||tech.users[0]));B.party.forEach(p=>p.atb=100);if(tech.weapon)u.data.weapon=tech.weapon;executeCommand(u,{type:'tech',techId:'${id}'},validTargets({type:'tech',techId:'${id}'},u));`);
 for(const shape of ['round','splash','tall','blob'])commands.push(`B.party.forEach(u=>u.hp=u.maxhp=10000);B.enemies[0].data={...B.enemies[0].data,shape:'${shape}'};B.enemies[0].intent={kind:'attack',target:B.party[2]};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}));`);
 const canvas=run('g');
 const methods=['fillRect','translate','rotate','ellipse','arc','moveTo','lineTo','scale'];
 const saved=new Map();for(const name of methods){saved.set(name,canvas[name]);canvas[name]=(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),name+' invalid geometry');if(name==='arc'||name==='ellipse')assert(args[2]>=0,name+' negative radius');};}
 try{for(const code of commands){setup();run(code);run(`for(let i=0;B.actions.length||B.actQueue.length;i++){if(i>3000)throw Error('unfinished');updateBattle();projectUnits();drawMarks(true);drawMarks(false);B.fx.forEach(f=>f.draw());B.units.forEach(drawUnit);}for(let i=0;i<120;i++)updateBattle();`);assert.equal(run('B.fx.some(f=>f.tool||f.material)'),false);assert.equal(run('B.units.some(u=>u.recoil||u.gesture)'),false);}}
 finally{for(const [name,fn] of saved)canvas[name]=fn;}
});
test('material effects and recoil never change HP, positions or combat RNG when drawn',()=>{
 setup();run(`var rngCalls=0;var keepRandom=Math.random;Math.random=()=>{rngCalls++;return .5};var snapshot=JSON.stringify(B.units.map(u=>[u.hp,u.mp,u.wx,u.wy,u.wz]));`);
 try{for(const material of ['brocha','lapiz','pincel','pluma','ink','fire','leaf','eclipse','prism'])run(`materialImpact(B.enemies[0],C('rojo'),1,{material:'${material}'});`);
 run(`for(let i=0;i<20;i++){B.fx.forEach(f=>f.draw());recoilPose(B.enemies[0]);}`);
 assert.equal(run('rngCalls'),0);assert.equal(run('JSON.stringify(B.units.map(u=>[u.hp,u.mp,u.wx,u.wy,u.wz]))===snapshot'),true);assert.equal(run('B.fx.every(f=>f.t===0)'),true);assert.equal(run('B.enemies[0].recoil.t'),0);
 }finally{run('Math.random=keepRandom');}
});
test('hitstop freezes contact and recoil; reduced motion leaves a readable static impact',()=>{
 setup();run(`materialImpact(B.enemies[0],C('azul'),1);B.hitstop=5;var freezePose=JSON.stringify(recoilPose(B.enemies[0]));for(let i=0;i<5;i++)updateBattle();`);
 assert.equal(run('B.enemies[0].recoil.t'),0);assert.equal(run('B.fx[0].t'),0);assert.equal(run('JSON.stringify(recoilPose(B.enemies[0]))===freezePose'),true);
 run('updateBattle()');assert.equal(run('B.enemies[0].recoil.t'),1);
 run('Prefs.shake=0;Prefs.flash=0;B.flash=null;materialImpact(B.enemies[0],C("azul"),1);');
 assert.equal(run('JSON.stringify(recoilPose(B.enemies[0]))'),JSON.stringify({x:0,y:0,sx:1,sy:1}));assert.equal(run('B.flash'),null);
 run('for(let i=0;i<40;i++)updateBattle()');assert.equal(run('B.enemies[0].recoil'),null);
});
test('afterimages capture their pose, remain bounded and fade by simulation ticks',()=>{
 setup();run(`B.party[0].pose='attack';var trail=ghostsOf(B.party[0]);for(let i=0;i<20;i++){B.party[0].wx++;trail.add();}var samples=JSON.stringify(trail.samples.map(q=>[q.wx,q.at,q.spr.__key]));B.party[0].pose='hurt';for(let i=0;i<20;i++)trail.fx.draw();`);
 assert.equal(run('trail.samples.length'),6);assert.equal(run('JSON.stringify(trail.samples.map(q=>[q.wx,q.at,q.spr.__key]))===samples'),true);
 run('trail.end();for(let i=0;i<12;i++)updateBattle()');assert.equal(run('trail.samples.length'),0);assert.equal(run('B.fx.includes(trail.fx)'),false);
 run('Prefs.shake=0;var stillTrail=ghostsOf(B.party[0]);stillTrail.add()');assert.equal(run('stillTrail.samples.length'),0);
});
test('paint drying fires exactly once and water emissions are independent of render count',()=>{
 setup();run('var dryEvents=0;afterFx(4,()=>dryEvents++);for(let i=0;i<20;i++)B.fx.forEach(f=>f.draw())');assert.equal(run('dryEvents'),0);
 run('for(let i=0;i<8;i++){updateBattle();for(let j=0;j<5;j++)B.fx.forEach(f=>f.draw());}');assert.equal(run('dryEvents'),1);
 function water(draws){setup();return run(`(()=>{B.party[2].atb=100;B.party[2].data.weapon='brocha';executeCommand(B.party[2],{type:'tech',techId:'aguada'},alive(B.enemies));let peak=0;for(let i=0;B.actions.length||B.actQueue.length;i++){if(i>3000)throw Error('unfinished');updateBattle();for(let j=0;j<${draws};j++)B.fx.forEach(f=>f.draw());peak=Math.max(peak,B.particles.length);}return JSON.stringify({hp:B.enemies.map(u=>u.hp),particles:B.particles,peak,t:B.t});})()`);}
 assert.equal(water(0),water(4));
});
console.log(`${checks} attack choreography checks passed.`);
