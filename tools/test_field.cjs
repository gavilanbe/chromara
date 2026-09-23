/* Field magic: every tool acts on the page as it should, refuses with a reason (and no cost) when it cannot, spends paint that
   comes back by walking, and the atelier can be solved end to end — borrar, trazar, colorear (mixing on the object), aguada. */
const {run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(name,fn){fn();console.log('PASS '+name);checks++;}
function fresh(){run(`resetGame();Game.intro=false;initOverworld();OW.msg=null;setState('overworld');Party.forEach(p=>{p.cur.mp=effStats(p).mp;p.cur.hp=effStats(p).hp});`);}
function stand(tx,ty,dir,dx=8,dy=8){run(`OW.x=${tx}*TILE+${dx};OW.y=${ty}*TILE+${dy};OW.dir='${dir}';OW.hist=[];`);}
function cast(id){return run(`(()=>{openRing();OW.ring.idx=FIELD.findIndex(a=>a.id==='${id}');const before=Party.map(p=>p.cur.mp);fieldCast();const refused=!OW.act,notice=OW.ring&&OW.ring.notice;OW.ring=null;let n=0;while(OW.act){if(++n>300)throw Error('never ends');if(OW.act.next().done)OW.act=null;}return {refused,notice,spent:before.map((v,i)=>v-Party[i].cur.mp)};})()`);}
function reach(tx,ty){return run(`(()=>{const nx=MAP.w*4,ny=MAP.h*4,st=[Math.round(MAP.spawn[0]*4+2),Math.round(MAP.spawn[1]*4+3)],seen=new Set([st[1]*nx+st[0]]),q=[st];for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+a,Y=y+b,k=Y*nx+X;if(X<0||Y<0||X>=nx||Y>=ny||seen.has(k)||!walkable(X*4,Y*4))continue;seen.add(k);q.push([X,Y]);}}return q.some(([a,b])=>Math.hypot(a*4-(${tx}*16+8),b*4-(${ty}*16+8))<14);})()`);}
test('every art is owned by a painter, costs paint and names its tool',()=>{
 fresh();const arts=run('FIELD.map(a=>[a.id,a.users.join(),a.mp,a.kind])');assert.equal(arts.length,6);
 for(const [id,users,mp] of arts){assert(users.length&&mp>0,id);}
});
test('the atelier is sealed until each step is done, and solvable end to end',()=>{
 fresh();const room=[34,21],upper=[34,17],chestSide=[37,15];
 assert.equal(reach(28,21),false,'the scribble should block the fold');
 stand(25,21,'right',6,4);let r=cast('rojo');assert(r.refused&&/grafito/.test(r.notice),'colour on graphite: '+r.notice);assert.deepEqual([...r.spent],[0,0,0]);
 r=cast('borrar');assert(!r.refused);assert.equal(r.spent[0],1);assert.equal(reach(28,21),true);assert.equal(reach(...room),false);
 stand(28,21,'down',8,12);r=cast('borrar');assert(r.refused,'nothing to erase at the pin');r=cast('trazar');assert(!r.refused,r.notice);assert.equal(reach(...room),true);assert.equal(reach(...upper),false);
 stand(34,21,'up');r=cast('rojo');assert(!r.refused);assert.equal(run('Game.puzzle.real'),0);assert.equal(reach(...upper),false,'orange is not the bridge');
 r=cast('borrar');assert(!r.refused,'erase the wrong colour: '+r.notice);assert.equal(run('Game.puzzle.sketch.length'),0);
 r=cast('amarillo');assert(!r.refused);r=cast('azul');assert(!r.refused);assert.equal(run('Game.puzzle.real'),1);assert.equal(reach(...upper),true);
 assert.equal(run('walkable(37*16+8,15*16+8)'),false,'the ink puddle should block the chest');
 stand(37,18,'up');r=cast('aguada');assert(!r.refused,r.notice);assert.equal(run('Game.puzzle.washed'),1);assert.equal(run('walkable(37*16+8,15*16+8)'),true);
 stand(37,15,'right',8,12);assert.equal(run('fieldNearby().length'),1);run('pressed.ok=true;updateOverworld();let n=0;while(OW.act){if(++n>200)throw Error("chest");if(OW.act.next().done)OW.act=null;}');
 assert.equal(run('Game.owned.pluma&&Game.puzzle.opened'),true);
});
test('arts refuse without paint or with a fallen painter, and paint comes back by walking',()=>{
 fresh();stand(25,21,'right',6,4);run("Party.find(p=>p.id==='carmin').cur.mp=0");let r=cast('borrar');assert(r.refused&&/pintura/.test(r.notice));
 run("Party.find(p=>p.id==='carmin').cur.hp=0;Party.find(p=>p.id==='carmin').cur.mp=5");r=cast('borrar');assert(r.refused&&/descansar/.test(r.notice));
 run("Party.find(p=>p.id==='carmin').cur.hp=50;Party.find(p=>p.id==='carmin').cur.mp=0;fieldWalk(64);");assert.equal(run("Party.find(p=>p.id==='carmin').cur.mp"),1);
 stand(10,10,'down');r=cast('aguada');assert(r.refused&&/nada delante/.test(r.notice));
});
test('drawing the ring and every stage never throws, and the page 1 leaf has no atelier',()=>{
 fresh();for(let i=0;i<6;i++){stand(25,21,'right',6,4);run(`openRing();OW.ring.idx=${i};UI_HITS.length=0;drawOverworld();OW.ring=null;`);}
 run('Game.puzzle.erased=1;Game.puzzle.line=1;Game.puzzle.sketch=["rojo"];drawOverworld();Game.puzzle.real=1;Game.puzzle.washed=1;drawOverworld();');
 run('Game.page=1');assert.equal(run('fieldTargets().length'),0);run('Game.page=0');
});
console.log(checks+' field magic checks passed.');
