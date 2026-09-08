/* Usable decision windows, enemy telegraphs and basic action duration, using
   the actual clock/input/generators. One update() is one real 60 Hz tick. */
const {run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function readyPair(speed=1){
  scenario('1');
  run(`releaseInputs();ATB_ACTIVE=true;Prefs.speed=${speed};B.menu=null;B.enemies.forEach(u=>u.atb=100);B.party.forEach(u=>u.hp=u.maxhp=10000);`);
}
function firstEnemyEnds(){
  run(`for(let f=0;B.stats.actions<1;f++){if(f>300)throw Error('Enemy never finished');update();}`);
}
test('two ready enemies leave a full second of usable input at every speed',()=>{
  for(const speed of [1,1.5,2]){
    readyPair(speed);firstEnemyEnds();
    assert(run('!!B.menu'),'Ready party was denied its menu');
    const gap=run(`(()=>{let frames=0;while(!B.currentAction){if(frames++>130)throw Error('Next enemy never attacked');update();}return frames;})()`);
    assert(gap>=59&&gap<=62,JSON.stringify({speed,gap}));
  }
});
test('recovery lets the player confirm a command before the next ready enemy',()=>{
  readyPair();firstEnemyEnds();
  run(`B.party[1].atb=0;var enemyCharge=B.enemies[0].atb;pressed.ok=true;update();`);
  assert.equal(run('B.menu.level'),'target');
  assert(run('B.party[1].atb>0'),'Allied bars stopped during recovery');
  assert.equal(run('B.enemies[0].atb'),run('enemyCharge'),'Enemies recharged during their recovery');
  run('pressed.ok=true;update();update()');
  assert.equal(run('B.currentAction.command.type'),'attack');
  assert.equal(run('B.currentAction.users[0].kind'),'party');
});
test('overlays, Wait selection and allied animations preserve the decision window',()=>{
  readyPair();firstEnemyEnds();
  const before=run('B.enemyRecovery');
  run(`openOverlay('settings');for(let i=0;i<90;i++)update();closeOverlay();`);
  assert.equal(run('B.enemyRecovery'),before);
  run(`ATB_ACTIVE=false;beginTarget(B.menu,{type:'attack'});for(let i=0;i<90;i++)update();`);
  assert.equal(run('B.enemyRecovery'),before);
  run(`ATB_ACTIVE=true;executeCommand(B.party[0],{type:'tech',techId:'brochazo'},[B.enemies[0]]);for(let i=0;B.actions.length||B.actQueue.length;i++){if(i>1000)throw Error('Unfinished technique');update();}`);
  assert(run(`B.enemyRecovery>=${before}-1`),'Animation consumed the recovery');
});
test('early intentions are quiet; only the next enemy is urgent in the final 15 percent',()=>{
  scenario('5');run(`B.menu=null;ATB_ACTIVE=true;B.enemies[0].atb=55;planEnemy(B.enemies[0]);`);
  assert.equal(run('B.enemies[0].warned'),false);
  assert.equal(run('urgentEnemy()'),null);
  run('B.enemies[0].atb=84.9');assert.equal(run('urgentEnemy()'),null);
  run('B.enemies[0].atb=85');assert.equal(run('urgentEnemy()===B.enemies[0]'),true);
  run('B.enemies[1].atb=95;planEnemy(B.enemies[1])');assert.equal(run('urgentEnemy()===B.enemies[1]'),true);
  run('B.enemyRecovery=30');assert.equal(run('urgentEnemy()'),null);
  run('B.enemyRecovery=0;executeCommand(B.party[0],{type:"attack"},[B.enemies[0]])');assert.equal(run('urgentEnemy()'),null);
});
test('the urgent sound plays once per intent and drawing does not advance it',()=>{
  scenario('1');run(`B.menu=null;ATB_ACTIVE=true;B.enemies[0].atb=85;planEnemy(B.enemies[0]);var alerts=0,oldSfx=Audio.sfx;Audio.sfx=(name)=>{if(name==='enemy_soon')alerts++};`);
  try{
    run('for(let i=0;i<10;i++)updateBattleClock()');assert.equal(run('alerts'),1);
    run(`var oldRandom=Math.random;Math.random=()=>{throw Error('Telegraph consumed RNG')};for(let i=0;i<10;i++){drawIntentThreads();B.enemies.forEach(drawUnit);}`);
    assert.equal(run('alerts'),1);
  }finally{run('Audio.sfx=oldSfx;Math.random=oldRandom||(()=>.5)');}
});
test('common attacks stay brief, deliver one hit and return their bodies home',()=>{
  for(const shape of ['round','splash','tall','blob']){
    scenario('1');run(`B.menu=null;B.party.forEach(u=>u.atb=0);B.enemies[0].data={...B.enemies[0].data,shape:'${shape}'};B.enemies[0].intent={kind:'attack',target:B.party[2]};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}));`);
    const trace=run(`(()=>{let frames=0,hits=0,hp=B.party[2].hp;while(B.actions.length||B.actQueue.length){if(frames++>300)throw Error('Unfinished basic');updateBattle();if(B.party[2].hp<hp)hits++;hp=B.party[2].hp;}return {frames,hits,home:B.enemies[0].wx===B.enemies[0].hx&&B.enemies[0].wy===B.enemies[0].hy&&B.enemies[0].wz===0};})()`);
    assert(trace.frames>=55&&trace.frames<=85,JSON.stringify({shape,...trace}));
    assert.equal(trace.hits,1);assert(trace.home);
  }
});
test('a retry and a new encounter discard the previous recovery',()=>{
  readyPair();firstEnemyEnds();run('retryBattle()');
  assert.equal(run('B.enemyRecovery'),0);assert.equal(run('B.recoveringEnemy'),null);
  run('B.enemyRecovery=60;B.recoveringEnemy=B.enemies[0]');scenario('5');
  assert.equal(run('B.enemyRecovery'),0);assert.equal(run('B.recoveringEnemy'),null);
});
console.log(`${checks} combat pacing checks passed.`);
