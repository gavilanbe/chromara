/* Check the rendered labels across skills, devices and low-resource states. */
const {run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let views=0;
function check(label){
 const texts=run('UI_TEXT');
 const outside=texts.filter(t=>t.x<0||t.y<0||t.x+t.w>320||t.y+t.h>180);
 assert.equal(outside.length,0,label+': '+JSON.stringify(outside));
 for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
  const a=texts[i],b=texts[j];
  assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),label+': text overlap '+JSON.stringify([a,b]));
 }
 views++;
}
for(const mobile of [false,true,'bindings']){
 scenario('B');run(`MOBILE.enabled=${mobile === true};${mobile==='bindings'?"Prefs.bindings.ok=' ';Prefs.bindings.back='Backspace';Prefs.bindings.swap='PageDown';Prefs.bindings.help='Delete';Prefs.bindings.release='PageUp';":'Prefs.bindings={...DEFAULT_BINDINGS};'}`);
 for(const who of [0,1,2])for(const idx of [0,1,2,3,4]){
  run(`openCmd(B.party[${who}]);B.menu.idx=${idx};UI_TEXT.length=0;UI_HITS.length=0;drawBattleUI()`);check('palette '+who+':'+idx+' '+mobile);
 }
 for(const id of run('Object.keys(DATA.techs)')){
  run(`{ const t=DATA.techs['${id}'],u=B.party.find(q=>q.id===(t.user||t.users[0])); if(t.weapon)u.data.weapon=t.weapon;openCmd(u);B.menu.level='tech';B.menu.idx=techsFor(u).findIndex(e=>e.id==='${id}'); UI_TEXT.length=0;UI_HITS.length=0;drawBattleUI(); }`);
  check(id+' list '+mobile);
  run(`beginTarget(B.menu,{type:'tech',techId:'${id}'});UI_TEXT.length=0;UI_HITS.length=0;drawBattleUI()`);
  check(id+' target '+mobile);
 }
 for(const p of run(`Object.keys(DATA.items).map(item=>({type:'item',item}))`)){
  run(`openCmd(B.party[0]);B.menu.level='item';B.menu.idx=Object.keys(Game.inventory).indexOf('${p.item}');if(B.menu.idx<0)B.menu.idx=0;UI_TEXT.length=0;UI_HITS.length=0;drawBattleUI()`);check(p.item+' list');
 }
 run(`openCmd(B.party[0]);B.party.forEach(u=>{u.status={lento:3,tiznado:3,contorno:3};u.hp=1;u.mp=0});UI_TEXT.length=0;UI_HITS.length=0;drawBattleUI()`);check('statuses');
 run(`B.msg=null;B.enemies[0].atb=80;planEnemy(B.enemies[0]);UI_TEXT.length=0;UI_HITS.length=0;drawBattleUI()`);check('boss intent');
 run(`B.menu=null;B.currentAction={users:B.party,title:'Arcoíris'};UI_TEXT.length=0;UI_HITS.length=0;drawBattleUI()`);check('action');
}
console.log(views+' UI layouts within canvas, with no overlapping labels.');
