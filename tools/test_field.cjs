/* Field magic and the map's route: each zone is opened by one art (Borrar, Trazar, Colorear, Aguada), the Tiznal needs a mix
   painted on its door, the optional atelier and chests work, and arts refuse with a reason and no cost when they cannot act. */
const {run}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(name,fn){fn();console.log('PASS '+name);checks++;}
function fresh(){run(`resetGame();Game.intro=false;initOverworld();OW.msg=null;setState('overworld');Party.forEach(p=>{p.cur.mp=effStats(p).mp;p.cur.hp=effStats(p).hp});`);}
function stand(tx,ty,dir){run(`OW.x=${tx}*TILE+8;OW.y=${ty}*TILE+8;OW.dir='${dir}';OW.hist=[];Party.forEach(p=>p.cur.mp=effStats(p).mp);`);}
function cast(id){return run(`(()=>{openRing();OW.ring.idx=FIELD.findIndex(a=>a.id==='${id}');const before=Party.map(p=>p.cur.mp);fieldCast();const refused=!OW.act,notice=OW.ring&&OW.ring.notice;OW.ring=null;let n=0;while(OW.act){if(++n>300)throw Error('never ends');if(OW.act.next().done)OW.act=null;}return {refused,notice,spent:before.map((v,i)=>v-Party[i].cur.mp)};})()`);}
function open(){run(`(()=>{OW.msg=null;pressed.ok=true;updateOverworld();let n=0;while(OW.act){if(++n>200)throw Error("chest");if(OW.act.next().done)OW.act=null;}OW.msg=null;})()`);}
function reach(tx,ty){return run(`(()=>{const nx=MAP.w*4,ny=MAP.h*4,st=[Math.round(MAP.spawn[0]*4+2),Math.round(MAP.spawn[1]*4+3)],seen=new Set([st[1]*nx+st[0]]),q=[st];for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+a,Y=y+b,k=Y*nx+X;if(X<0||Y<0||X>=nx||Y>=ny||seen.has(k)||!walkable(X*4,Y*4))continue;seen.add(k);q.push([X,Y]);}}return q.some(([a,b])=>Math.abs(a*4-(${tx}*16+8))<6&&Math.abs(b*4-(${ty}*16+8))<6);})()`);}
const ok=r=>{assert(!r.refused,r.notice);return r;};
const FIELD_INV_EXPECTED=40;
test('every art is owned by a painter and costs paint',()=>{fresh();for(const [id,users,mp] of run('FIELD.map(a=>[a.id,a.users.join(),a.mp])'))assert(users&&mp>0,id);});
test('the route: Refugio → Prado → Jardín → Colinas → Tiznal, each step opened by its art',()=>{
 fresh();
 assert.equal(reach(15,20),false,'the scribble should keep the Refugio closed');
 stand(10,22,'right');let r=cast('rojo');assert(r.refused&&/grafito/.test(r.notice),r.notice);assert.deepEqual([...r.spent],[0,0,0]);
 ok(cast('borrar'));assert.equal(reach(15,20),true);assert.equal(reach(12,10),false);
 stand(12,17,'up');ok(cast('trazar'));assert.equal(reach(12,10),true,'the graphite line crosses the river');assert.equal(reach(27,8),false);
 stand(23,6,'right');ok(cast('rojo'));assert.equal(reach(27,8),false,'orange is not the bridge');ok(cast('borrar'));ok(cast('amarillo'));ok(cast('azul'));assert.equal(reach(27,8),true);
 assert.equal(reach(35,8),false);
 stand(29,5,'right');ok(cast('aguada'));stand(31,5,'right');ok(cast('rojo'));ok(cast('azul'));assert.equal(reach(35,8),true,'the violet door opens the Tiznal');
});
test('the optional atelier: line over the moat, green bridge over the channel, washed ink, then the Pen',()=>{
 fresh();stand(10,22,'right');ok(cast('borrar'));
 assert.equal(reach(31,23),false);stand(26,23,'right');ok(cast('trazar'));assert.equal(reach(31,23),true);
 assert.equal(reach(34,18),false);stand(34,21,'up');ok(cast('amarillo'));ok(cast('azul'));assert.equal(reach(34,18),true);
 assert.equal(run('walkable(36*16+8,17*16+8)'),false);stand(35,17,'right');ok(cast('aguada'));assert.equal(run('walkable(36*16+8,17*16+8)'),true);
 stand(36,17,'right');assert.equal(run('fieldNearby().length'),1);open();assert.equal(run('Game.owned.pluma&&Game.puzzle.opened'),true);
});
test('small chests give their item once',()=>{
 fresh();const before=run('Game.inventory.gota_agua||0');stand(5,12,'up');ok(cast('rojo'));ok(cast('amarillo'));
 stand(5,11,'up');assert.equal(run('fieldNearby().length'),1);open();assert.equal(run('Game.inventory.gota_agua'),before+2);
 assert.equal(run('fieldNearby().length'),0,'an open chest stays open');
});
test('arts refuse without paint or with a fallen painter; paint comes back by walking',()=>{
 fresh();const why=id=>run(`(()=>{openRing();OW.ring.idx=FIELD.findIndex(a=>a.id==='${id}');fieldCast();const n=OW.ring.notice;OW.ring=null;return n;})()`);
 run(`OW.x=10*TILE+8;OW.y=22*TILE+8;OW.dir='right';Party.find(p=>p.id==='carmin').cur.mp=0`);assert(/pintura/.test(why('borrar')));
 run("Party.find(p=>p.id==='carmin').cur.hp=0;Party.find(p=>p.id==='carmin').cur.mp=5");assert(/descansar/.test(why('borrar')));
 run("Party.find(p=>p.id==='carmin').cur.hp=50;Party.find(p=>p.id==='carmin').cur.mp=0;fieldWalk(64);");assert.equal(run("Party.find(p=>p.id==='carmin').cur.mp"),1);
 stand(16,24,'down');assert(/nada delante|Mira/.test(cast('aguada').notice));
});
test('drawing the ring, every stage and the page 1 leaf never throws',()=>{
 fresh();for(let i=0;i<6;i++){stand(10,22,'right');run(`openRing();OW.ring.idx=${i};UI_HITS.length=0;drawOverworld();OW.ring=null;`);}
 run('for(const s of fieldGroups().sketches){Game.puzzle.paint[s.id]=["rojo"];}drawOverworld();for(const s of fieldGroups().sketches)Game.puzzle.real[s.id]=true;drawOverworld();');
 run('Game.page=1');assert.equal(run('fieldTargets().length'),0);run('Game.page=0');
});
test('aiming like Golden Sun: A picks the art, the leader turns to a valid place by itself, arrows only move between valid places, A casts, B goes back',()=>{
 fresh();stand(10,22,'down');
 run(`openRing();OW.ring.idx=FIELD.findIndex(a=>a.id==='borrar');pressed.ok=true;updateRing();pressed.ok=false;`);
 assert.equal(run('OW.ring.mode'),'aim','A on the palette aims instead of casting');assert.equal(run('!!OW.act'),false);
 assert.equal(run('OW.ring.aimDir'),'right','auto-aims at the scribble even when facing away');assert.equal(run('OW.dir'),'right');
 run('UI_HITS.length=0;drawOverworld();');
 run(`pressed.up=true;updateRing();pressed.up=false;`);assert.equal(run('OW.ring.aimDir+OW.dir'),'rightright','an empty direction is never aimed at');
 run(`pressed.back=true;updateRing();pressed.back=false;`);assert.equal(run('OW.ring&&!OW.ring.mode'),true,'B goes back to the palette');
 run(`pressed.ok=true;updateRing();pressed.ok=false;pressed.ok=true;updateRing();pressed.ok=false;`);assert.equal(run('!!OW.act'),true,'A, A casts at the auto-aimed place');
 run('let n=0;while(OW.act){if(++n>300)throw Error("never");if(OW.act.next().done)OW.act=null;}');assert.equal(reach(15,20),true);
 stand(16,24,'down');const mp=run('Party.map(p=>p.cur.mp).join()');run(`openRing();OW.ring.idx=FIELD.findIndex(a=>a.id==='borrar');fieldAim();`);
 assert.equal(run('OW.ring.mode||null'),null,'nothing near: no aiming');assert(/cerca/.test(run('OW.ring.notice')));assert.equal(run('Party.map(p=>p.cur.mp).join()'),mp);run('drawOverworld();OW.ring=null;');
});
test('with two places around, arrows cycle between them and tapping a place casts there',()=>{
 fresh();const spot=run(`(()=>{for(let y=1;y<MAP.h-1;y++)for(let x=1;x<MAP.w-1;x++){OW.x=x*TILE+8;OW.y=y*TILE+8;if(!walkable(OW.x,OW.y))continue;for(let i=0;i<FIELD.length;i++){const v=fieldAimOptions(FIELD[i]).filter(o=>o.check.ok);if(v.length>1)return [x,y,i,v.map(o=>o.dir)];}}return null;})()`);
 if(!spot){console.log('  (no spot with two places on this map)');return;}
 const [x,y,i,dirs]=spot;stand(x,y,dirs[0]);run(`OW.cam.x=clamp(OW.x-W/2,0,MAP.w*TILE-W);OW.cam.y=clamp(OW.y-H/2,0,MAP.h*TILE-H);openRing();OW.ring.idx=${i};fieldAim();`);
 assert.equal(run('OW.ring.aimDir'),dirs[0]);run(`pressed.${dirs[1]}=true;updateRing();pressed.${dirs[1]}=false;`);assert.equal(run('OW.ring.aimDir+OW.dir'),dirs[1]+dirs[1]);
 const empty=['up','right','down','left'].find(d=>!dirs.includes(d));if(empty){run(`pressed.${empty}=true;updateRing();pressed.${empty}=false;`);assert(dirs.includes(run('OW.ring.aimDir')),'an empty direction moves to another valid place');}
 const aimed=run('OW.ring.aimDir');run('OW.ring.t+=20;UI_HITS.length=0;drawRing();UI_HITS.filter(h=>h.w>6&&h.y>40&&h.y<130)[0].run()');assert.notEqual(run('OW.ring.aimDir'),aimed,'tapping another place re-aims');assert.equal(run('!!OW.act'),false);
 run('UI_HITS.length=0;drawRing();UI_HITS.filter(h=>h.w>6&&h.y>40&&h.y<130).pop().run()');assert.equal(run('!!OW.act'),true,'tapping the aimed place casts');run('OW.act=null');
});
test('the invocation (compass, wash, the tool sketched then painted, flight, bloom, paint coming back) draws every frame, with and without motion',()=>{
 for(const shake of [1,0]){fresh();run(`Prefs.shake=${shake}`);stand(10,22,'right');
  const frames=run(`(()=>{openRing();OW.ring.idx=FIELD.findIndex(a=>a.id==='borrar');fieldCast();let n=0,born=0;while(OW.act){if(++n>300)throw Error('never');if(OW.fieldCast&&OW.fieldCast.inv>=38&&OW.fieldCast.t<0)born++;drawOverworld();if(OW.act.next().done)OW.act=null;}return [n,born];})()`);
  assert(frames[0]>FIELD_INV_EXPECTED,'the invocation is part of the cast');assert(frames[1]>0,'the tool is born before it flies');}
 run('Prefs.shake=1');
});
console.log(checks+' field magic checks passed.');
