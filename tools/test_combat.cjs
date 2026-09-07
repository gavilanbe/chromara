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
const element = () => ({ classList: {toggle:noop,remove:noop}, textContent:'', dataset:{}, style: {}, width:320, height:180, addEventListener:noop, setAttribute:noop, appendChild:noop, getContext:context2d, getBoundingClientRect: () => ({left:0,top:0,width:320,height:180}) });
const elements = {}, listeners = {};
const ctx = vm.createContext({
  console, Math:Object.create(Math), Uint8ClampedArray, Set, Map,
  document: { createElement:element, getElementById:id => elements[id] ||= element(), addEventListener:noop, querySelectorAll:()=>[], querySelector:element, documentElement:element(), body:element(), hidden:false },
  localStorage: {getItem:()=>null,setItem:noop}, navigator: {}, matchMedia:()=>({matches:false}),
  innerWidth:960, innerHeight:560, requestAnimationFrame:noop, performance:{now:()=>0},
  addEventListener:(event, fn) => (listeners[event] ||= []).push(fn),
  Audio: new Proxy({ positions:{}, muted:false, sfx:noop, play:noop, init:noop, prepare:noop, stop:noop, bend:noop }, {get:(o,k)=>o[k] || noop}), SFX:{ambient:noop}, MUSIC:{},
});
ctx.window = ctx; ctx.Math.random = () => .5;
for (const file of ['data.js','font.js','sprites.js','world_art.js','rinse.js','field.js','scene.js','gui.js','battle.js','attacks.js','combat.js','battle_ui.js','settings.js','mobile.js','game.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const run = code => vm.runInContext(code,ctx);
function scenario(group='5') {
  run(`resetGame(); Game.overlay = null; initBattle(OW.foes.find(f=>f.key==='${group}') || {...OW.foes[0],key:'${group}',enemies:DATA.encounters['${group}'],boss:'${group}'==='B'}); B.gen=null; B.tr=null; B.phase='fight'; B.fightStart=-100; Game.state='battle'; B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=0;}); B.unitScale=1; B.propScale=1; camSet(SCENE.rest); projectUnits(); B.party.forEach(u=>u.atb=100); ATB_ACTIVE=false; Prefs.speed=1;`);
}
function drain() { run(`for(let count=0; B.actions.length || B.actQueue.length; count++) { if(count>3000)throw new Error('Action did not finish'); updateBattle(); }`); }
let tests=0;
function test(name, fn) { fn(); console.log('PASS '+name); tests++; }
test('basic preview includes equipment, resistance and actual damage', () => {
  scenario();
  const preview=run(`previewAction(B.party[2],{type:'attack'},B.enemies[0])`);
  const before=run(`B.enemies[0].hp`); run(`executeCommand(B.party[2],{type:'attack'},[B.enemies[0]])`); drain();
  const delta=before-run(`B.enemies[0].hp`); assert(delta>=preview.lo&&delta<=preview.hi); assert.equal(run(`B.enemies[0].coat.col`),'azul'); assert.equal(run(`B.enemies[0].coat.turns`),3);
});
test('green paint reaction heals the group and slows once per multi-hit action', () => {
  scenario(); run(`B.party.forEach(u=>u.hp-=40); putCoat(B.enemies[0],'azul',3);`);
  const hp=run(`B.party[0].hp`); run(`executeCommand(B.party[1],{type:'tech',techId:'trazo'},[B.enemies[0]])`); drain();
  assert(run(`B.party[0].hp`)>hp); assert.equal(run(`B.stats.mixes`),1); assert.equal(run(`B.enemies[0].status.lento`),3);
});
test('orange reaction damages the adjacent enemy without recursive mixing', () => {
  scenario(); run(`B.party[0].data.weapon='lapiz'; putCoat(B.enemies[0],'amarillo');`);
  const hp=run(`B.enemies[1].hp+B.enemies[2].hp`); run(`executeCommand(B.party[0],{type:'attack'},[B.enemies[0]])`); drain();
  assert(run(`B.enemies[1].hp+B.enemies[2].hp`)<hp); assert.equal(run(`B.stats.mixes`),1);
});
test('violet reaction interrupts an announced attack and marks the target', () => {
  scenario(); run(`putCoat(B.enemies[0],'rojo'); B.enemies[0].atb=80; planEnemy(B.enemies[0]); executeCommand(B.party[2],{type:'attack'},[B.enemies[0]])`); drain();
  assert.equal(run(`B.stats.interrupts`),1); assert.equal(run(`B.enemies[0].status.firmado`),2); assert(run(`B.enemies[0].atb`)<55);
});
test('reserving, cancelling and re-reserving never spends MP or erases ATB', () => {
  scenario(); run(`B.party[0].atb=45; openCmd(B.party[1]); B.menu.pending={type:'tech',techId:'llamarada'}; commit(alive(B.enemies));`);
  assert.equal(run(`B.reservation.users.length`),2); assert.equal(run(`B.party[1].mp`),20); assert.equal(run(`B.party[1].atb`),100);
  run(`cancelReservation()`); assert.equal(run(`B.reservation`),null); assert.equal(run(`B.party[0].atb`),45);
  run(`openCmd(B.party[1]);B.menu.pending={type:'tech',techId:'llamarada'};commit(alive(B.enemies));B.party[0].atb=100;tickReservation();`);
  assert.equal(run(`B.reservation`),null); assert.equal(run(`B.party[0].mp`),12); assert.equal(run(`B.party[1].mp`),14); assert.equal(run(`B.party[0].acting&&B.party[1].acting`),true); drain();
});
test('KO and stolen MP cancel reservations with no resource loss', () => {
  for (const event of [`kill(B.party[0])`,`B.party[0].mp=0`]) {
    scenario(); run(`B.party[0].atb=40;openCmd(B.party[1]);B.menu.pending={type:'tech',techId:'llamarada'};commit(alive(B.enemies));${event};tickReservation();`);
    assert.equal(run(`B.reservation`),null);assert.equal(run(`B.party[1].mp`),20); assert.equal(run(`B.party[1].atb`),100);
  }
});
test('invalid commands are atomic, and discounted costs are per participant', () => {
  scenario();run(`B.party[0].mp=0;`); assert.equal(run(`executeCommand(B.party[0],{type:'tech',techId:'arcoiris'},B.enemies)`),false); assert.equal(run(`B.party[1].mp`),20);
  scenario();run(`executeCommand(B.party[2],{type:'tech',techId:'brote'},B.enemies)`);assert.equal(run(`B.party[2].mp`),40);assert.equal(run(`B.party[1].mp`),15);drain();
});
test('cover redirects exactly one enemy hit and halves it', () => {
  scenario();run(`executeCommand(B.party[0],{type:'role'},[B.party[2]])`);drain();
  const hp=run(`B.party[2].hp`), guardHP=run(`B.party[0].hp`);
  run(`B.currentAction={users:[B.enemies[0]],tier:0,painted:new Set()};damage(B.party[2],20,'negro');B.currentAction=null;`);
  assert.equal(run(`B.party[2].hp`),hp); assert.equal(guardHP-run(`B.party[0].hp`),10); assert.equal(run(`B.party[0].guard.charges`),0);
});
test('role interruption, study bonus, reload and fallen-only revival', () => {
  scenario();run(`Game.studies.pulso=true; B.enemies[0].atb=80;planEnemy(B.enemies[0]);executeCommand(B.party[1],{type:'role'},[B.enemies[0]])`);drain();assert(run(`B.party[1].atb>=35&&B.party[1].atb<36`));
  run(`B.party[2].mp=0;B.party[2].atb=100;executeCommand(B.party[2],{type:'reload'},[B.party[2]])`);drain();assert.equal(run(`B.party[2].mp`),6);
  run(`kill(B.party[0]);B.party[2].atb=100;executeCommand(B.party[2],{type:'item',item:'savia'},[B.party[0]])`);drain();assert.equal(run(`B.party[0].hp`),64);assert.equal(run(`Game.inventory.savia`),1);
  assert.equal(run(`validTargets({type:'item',item:'savia'},B.party[2]).length`),0);
});
test('area skills always open a preview before committing', () => {
  scenario();run(`openCmd(B.party[1]);B.menu.level='tech';B.menu.idx=1;pressed.ok=true;updateBattleMenu();`);
  assert.equal(run(`B.menu.level`),'target');assert.equal(run(`selectedTargets(B.menu).length`),3);assert.equal(run(`B.party[1].mp`),20);
});
test('status durations count completed actions, not animation frames or double ticks', () => {
  scenario();run(`B.enemies[0].status.tiznado=3;B.enemies[0].intent={kind:'attack',target:B.party[0]};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}))`);drain();
  assert.equal(run(`B.enemies[0].status.tiznado`),2);
  scenario(); run(`B.party[2].data.weapon='lapiz';applyStatus(B.party[2],'contorno',3);executeCommand(B.party[2],{type:'tech',techId:'contorno'},B.party)`); drain();
  assert.equal(run(`B.party[2].status.contorno`),3,'Refreshing the same status starts a fresh duration');
});
test('boss phase gates, shell exposure, intent locking and erasure', () => {
  scenario('B');
  const closed=run(`previewAction(B.party[0],{type:'tech',techId:'arcoiris'},B.enemies[0]).lo`);
  run(`B.enemies[0].status.expuesto=2;`); assert(run(`previewAction(B.party[0],{type:'tech',techId:'arcoiris'},B.enemies[0]).lo`)>closed*3);
  run(`damage(B.enemies[0],10000,'blanco')`);assert.equal(run(`B.enemies[0].bossPhase`),2);assert.equal(run(`B.enemies[0].hp`),349);
  run(`damage(B.enemies[0],10000,'blanco')`);assert.equal(run(`B.enemies[0].bossPhase`),3);assert.equal(run(`B.enemies[0].hp`),177);
  run(`putCoat(B.enemies[1],'azul');B.enemies[0].intent={kind:'erase',name:'Borrar el lienzo',all:true,target:B.party[0]};B.actQueue.push(tracked(B.enemies[0],actEnemy(B.enemies[0]),[B.enemies[0]],{type:'enemy'}))`);drain();
  assert.equal(run(`B.enemies[1].coat`),null);
});
test('all weapon/character choreographies and four combined techniques finish', () => {
  for (const id of run(`Object.keys(DATA.techs)`)) {
    scenario('B'); run(`{ B.enemies.forEach(t=>{t.hp=t.maxhp=100000;t.boss=false}); const testTech=DATA.techs['${id}'];const owner=B.party.find(u=>u.id===(testTech.user||testTech.users[0]));if(testTech.weapon)owner.data.weapon=testTech.weapon;executeCommand(owner,{type:'tech',techId:'${id}'},validTargets({type:'tech',techId:'${id}'},owner)); }`); drain();
    assert.equal(run(`B.party.some(u=>u.acting)`),false,id);
  }
});
test('every offensive technique damages its targets within the preview range', () => {
  for (const id of run(`Object.keys(DATA.techs).filter(id=>DATA.techs[id].power>0)`)) {
    for (const coating of [null,'rojo','azul']) {
      scenario();
      const previews = run(`(() => { B.enemies.forEach(t=>{t.hp=t.maxhp=10000;t.boss=false;${coating ? `putCoat(t,'${coating}');` : ''}}); const p={type:'tech',techId:'${id}'},tech=DATA.techs[p.techId],u=B.party.find(u=>u.id===(tech.user||tech.users[0]));if(tech.weapon)u.data.weapon=tech.weapon;const targets=targetGroup(p,u)?validTargets(p,u):[B.enemies[0]];const ranges=targets.map(t=>({idx:t.idx,...previewAction(u,p,t)}));executeCommand(u,p,targets);return ranges;})()`);
      drain();
      for (const p of previews) {
        const damage = 10000-run(`B.enemies[${p.idx}].hp`);
        // Orange area reactions also splash neighbours, explicitly outside the
        // direct-hit estimate. Every other outcome must match the shown range.
        assert(damage >= p.lo && (p.reaction==='naranja' || damage<=p.hi),`${id}, ${coating}, enemy ${p.idx}: ${damage} outside ${p.lo}-${p.hi}`);
      }
    }
  }
});
test('retry restores pre-encounter items and party without erasing progress', () => {
  scenario(); const hp=run(`B.party[0].hp`), mp=run(`B.party[2].mp`);
  run(`Game.pigmento=40;Game.studies.pulso=true;Game.inventory.savia=0;B.party.forEach(kill);checkEnd();B.t=90;pressed.ok=true;updateEnd()`);
  assert.equal(run(`B.phase`),'fight'); assert.equal(run(`B.party[0].hp`),hp); assert.equal(run(`B.party[2].mp`),mp); assert.equal(run(`Game.inventory.savia`),2);
  assert.equal(run(`Game.pigmento`),40); assert.equal(run(`Game.studies.pulso`),true); assert.equal(run(`B.actions.length+B.actQueue.length`),0);
});
test('decision cameras keep their painter or recipients clear of sheets', () => {
  for (const group of ['1','2','3','4','5','6','B']) {
    scenario(group);
    for (const level of ['idle','cmd','tech','target']) {
      run(`openCmd(B.party[0]);B.menu.level='${level}';B.menu.pending={type:'tech',techId:'arcoiris'};if('${level}'==='idle')B.menu=null;camSet(menuCameraPose(B.menu));projectUnits()`);
      const bounds=run(`(menuCameraSubjects(B.menu)||B.units).map(u=>({x:u.x-u.def.w*u.sc*(u.kind==='enemy'?(u.boss?1.35:1.6):1)*.5,y:u.y-u.def.h*u.sc*(u.kind==='enemy'?(u.boss?1.35:1.6):1),bottom:u.y}))`);
      for (const b of bounds) {assert(b.y>=32&&b.bottom<=(level==='target'?123:145),JSON.stringify({group,level,b}));if(level==='cmd')assert(b.x>=106);if(level==='tech')assert(b.x>=117);}
    }
  }
});
test('clock semantics, full-party reservation and options pause', () => {
  scenario();run(`openCmd(B.party[1]);ATB_ACTIVE=true;B.enemies[0].atb=20;updateBattleClock()`);assert(run(`B.enemies[0].atb`)>20);
  run(`B.menu.level='tech';const timeBefore=B.enemies[0].atb;updateBattleClock();`);assert(run(`B.enemies[0].atb > timeBefore`));
  run(`ATB_ACTIVE=false;const waitBefore=B.enemies[0].atb;updateBattleClock();`);assert.equal(run(`B.enemies[0].atb === waitBefore`),true);
  run(`openOverlay('settings'); const menuTime=B.t;update()`);assert.equal(run(`B.t===menuTime`),true);
  scenario();run(`B.party[0].atb=50;B.party[2].atb=50;openCmd(B.party[1]);B.menu.pending={type:'tech',techId:'arcoiris'};commit(B.enemies);`);
  run(`for(let i=0;i<500&&!B.actQueue.length;i++)updateBattleClock()`);assert.equal(run(`B.reservation`),null);assert.equal(run(`B.actQueue.length`),1);
});
test('pigment buys each study once; insufficient funds preserve balance', () => {
  scenario();run(`openOverlay('studies');Game.pigmento=20`);assert.equal(run(`buyStudy('veladura')`),true);assert.equal(run(`Game.pigmento`),2);assert.equal(run(`buyStudy('veladura')`),false);assert.equal(run(`buyStudy('pulso')`),false);assert.equal(run(`Game.pigmento`),2);
});
test('the boss can be beaten with starting equipment and finite supplies', () => {
  scenario('B');
  const result=run(`(() => {
    B.party.forEach(u=>u.atb=33);B.enemies.forEach(u=>u.atb=20);B.menu=null;
    let decisions=0;
    for (let frame=0;frame<40000&&B.phase==='fight';frame++) {
      if(B.menu&&!B.currentAction) {
        const u=B.menu.unit, dead=B.party.find(p=>!p.alive), weak=alive(B.party).sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp)[0];
        let p={type:'attack'},target;
        if(dead&&Game.inventory.savia) {p={type:'item',item:'savia'};target=dead;}
        else if(weak.hp<weak.maxhp*.55&&Game.inventory.gota_agua) {p={type:'item',item:'gota_agua'};target=weak;}
        else {
          target=alive(B.enemies).sort((a,b)=>{
            const score=t=>Math.min(previewAction(u,p,t).lo,t.hp)+(paintReaction(t,u.color)?20:0)+(t.hp<40?20:0);
            return score(b)-score(a);
          })[0];
        }
        if(!executeCommand(u,p,[target]))throw new Error('Autoplayer could not submit '+p.type);
        decisions++;
      }
      updateBattle();
    }
    return {phase:B.phase,decisions,remaining:B.party.map(p=>p.hp),actions:B.stats.actions};
  })()`);
  assert.equal(result.phase,'victory',JSON.stringify(result)); assert(result.decisions>5&&result.decisions<90,JSON.stringify(result));
});
test('keyboard rebinding and gamepad disconnect do not leave stuck inputs', () => {
  scenario();run(`openOverlay('bindings');Game.overlay.capture='release';captureBinding({key:'q',preventDefault(){},repeat:false})`);
  assert.equal(run(`actionForKey('q')`),'release');assert.equal(run(`actionForKey('v')`),null);
  run(`Game.overlay.capture='release';captureBinding({key:'z',preventDefault(){},repeat:false})`);assert.equal(run(`Prefs.bindings.release`),'q');
  run(`keyboardAction('ok',true);navigator.getGamepads=()=>[{buttons:Array.from({length:16},(_,i)=>({pressed:i===0})),axes:[0,0]}];pollGamepad();keyboardAction('ok',false)`);assert.equal(run(`keys.ok`),true);
  run(`navigator.getGamepads=()=>[];pollGamepad()`);assert.equal(run(`keys.ok`),false);
  run(`Prefs.bindings={...DEFAULT_BINDINGS};releaseInputs()`);
});
test('HUD, target panels and options render within the native canvas', () => {
  scenario();
  const states = [`openCmd(B.party[0])`,`B.menu.level='tech';B.menu.idx=3`,`beginTarget(B.menu,{type:'tech',techId:'arcoiris'})`,`openOverlay('settings')`,`Game.overlay.type='bindings'`,`Game.overlay.type='studies'`,`Game.overlay.type='guide';Game.overlay.idx=0`,`Game.overlay.idx=1`,`Game.overlay.idx=2`];
  for (const state of states) {
    run(state); run(`UI_TEXT.length=0;UI_HITS.length=0; if(Game.overlay)drawOverlay();else drawBattleUI()`);
    const outside=run(`UI_TEXT.filter(t=>t.x<0||t.y<0||t.x+t.w>320||t.y+t.h>180)`); assert.equal(outside.length,0,JSON.stringify(outside));
  }
  scenario();run(`openCmd(B.party[2]);beginTarget(B.menu,{type:'item',item:'gota_agua'});UI_HITS.length=0;drawPartyCards();UI_HITS[1].run()`);
  assert.equal(run(`B.menu.level`),'target');assert.equal(run(`B.menu.tidx`),1);
  run(`UI_HITS[1].run()`);assert.equal(run(`pressed.ok`),true);
  const longGuide=run(`GUIDE_PAGES.flatMap(p=>p.lines).filter(s=>textWidth(s)>251)`);assert.equal(longGuide.length,0,JSON.stringify(longGuide));
});
console.log(`${tests} combat integration checks passed.`);
// Reuse the actual-game fixture for mobile input regressions.
module.exports = { ctx, run, scenario };
