/* Real battle data with a mock canvas: visual events must stay purely visual. */
const {ctx,run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let checks=0;
function test(name,fn){scenario();run(`Prefs.shake=.5;B.menu=null;B.party.forEach(u=>u.atb=0);observeBattleFeedback();`);fn();console.log('PASS '+name);checks++;}
test('ready feedback fires once, and a fresh encounter forgets old events',()=>{
 run(`B.t++;B.party[0].atb=100;observeBattleFeedback();const motesAfterReady=BUI.motes.length;const readyStamp=BUI.cards.get(B.party[0]).readyAt;observeBattleFeedback()`);
 assert.equal(run(`BUI.cards.get(B.party[0]).readyAt===readyStamp`),true);assert.equal(run(`BUI.motes.length===motesAfterReady&&motesAfterReady>0`),true);
 scenario();run(`observeBattleFeedback()`);assert.equal(run(`BUI.motes.length`),0);
});
test('damage paint lingers then dries, and pigment spending squeezes once',()=>{
 const hp=run(`B.party[0].hp`);run(`B.t++;B.party[0].hp-=20;B.party[0].mp-=3;observeBattleFeedback();const squeezeStamp=BUI.cards.get(B.party[0]).squeeze;`);
 assert.equal(run(`BUI.cards.get(B.party[0]).trail`),hp);
 run(`for(let i=0;i<12;i++){B.t++;observeBattleFeedback()}`);assert.equal(run(`BUI.cards.get(B.party[0]).trail`),hp);
 run(`for(let i=0;i<55;i++){B.t++;observeBattleFeedback()}`);assert(Math.abs(run(`BUI.cards.get(B.party[0]).trail`)-(hp-20))<.2);
 assert.equal(run(`BUI.cards.get(B.party[0]).squeeze===squeezeStamp`),true);assert.equal(run(`BUI.motes.length`),0);
});
test('mixture cost previews touch only the participating paint tubes',()=>{
 run(`B.party[0].acc='paleta';B.party[1].acc='goma';B.party.forEach(u=>u.atb=100);openCmd(B.party[1]);B.menu.level='tech';B.menu.idx=techsFor(B.party[1]).findIndex(e=>e.id==='llamarada');`);
 const mp=run(`JSON.stringify(B.party.map(u=>u.mp))`);assert.deepEqual(Array.from(run(`B.party.map(selectedPaintCost)`)),[5,6,0]);
 run(`observeBattleFeedback();drawPartyCards();drawPartyCards()`);assert.equal(run(`JSON.stringify(B.party.map(u=>u.mp))`),mp);
});
test('hover focuses a tool without committing and exit animation has no hit targets',()=>{
 run(`B.party[1].atb=100;openCmd(B.party[1]);UI_HITS.length=0;drawBattleUI();UI_HITS.find(h=>h.hover).hover();const hpBeforeHover=B.enemies[0].hp;`);
 assert.equal(run(`B.menu.level`),'cmd');assert.equal(run(`B.enemies[0].hp===hpBeforeHover&&!B.currentAction`),true);
 run(`observeBattleFeedback();beginTarget(B.menu,{type:'attack'});observeBattleFeedback();UI_HITS.length=0;drawCommandPalette(BUI.closing,true);`);
 assert.equal(run(`UI_HITS.length`),0);
});
test('hovering the last visible sample does not move the row under the pointer',()=>{
 run(`B.party[1].atb=100;openCmd(B.party[1]);B.menu.level='tech';B.menu.idx=0;UI_HITS.length=0;drawBattleUI();const rowsBeforeHover=battleListLayout(B.menu).top;UI_HITS.filter(h=>h.hover)[2].hover();drawBattleUI();`);
 assert.equal(run(`B.menu.idx`),2);assert.equal(run(`battleListLayout(B.menu).top===rowsBeforeHover`),true);
 run(`B.menu.idx=3`);assert.equal(run(`battleListLayout(B.menu).top`),1);
});
test('the target name cycles close-up recipients without confirming or spending',()=>{
 run(`B.party[0].atb=100;openCmd(B.party[0]);beginTarget(B.menu,{type:'attack'});UI_HITS.length=0;drawBattleUI();const mpBeforeTag=B.party[0].mp;UI_HITS.find(h=>h.y===2&&h.h===17).run();`);
 assert.equal(run('B.menu.tidx'),1);assert.equal(run('B.menu.level'),'target');
 assert.equal(run('B.party[0].mp===mpBeforeTag&&!B.currentAction&&!B.actQueue.length'),true);
});
test('reduced motion removes decoration, and feedback never consumes combat RNG',()=>{
 run(`Prefs.shake=0;BUI.motes.length=0;B.t++;B.party[0].hp--;B.party[0].mp--;B.party[0].atb=100;observeBattleFeedback()`);
 assert.equal(run(`BUI.motes.length`),0);assert.equal(run(`uiPop(B.t-3)`),0);
 let randomCalls=0;const originalRandom=ctx.Math.random;ctx.Math.random=()=>{randomCalls++;return .5};
 run(`Prefs.shake=.5;B.t++;B.party[0].mp--;observeBattleFeedback();drawPartyCards();drawPaintMotes()`);
 ctx.Math.random=originalRandom;assert.equal(randomCalls,0);
});
console.log(`${checks} visual feedback checks passed.`);
