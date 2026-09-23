/* Native-layout and real-input regressions for every non-combat interface.
   Reuses the shipped game in the inert canvas fixture; no browser hooks. */
const {run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
let layouts=0,checks=0;
function layout(label,draw){
 run('UI_TEXT.length=0;UI_HITS.length=0;'+draw);
 const texts=run('UI_TEXT');
 for(const a of texts)assert(a.x>=0&&a.y>=0&&a.x+a.w<=320&&a.y+a.h<=180,label+' outside: '+JSON.stringify(a));
 for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
  const a=texts[i],b=texts[j];
  assert(!(a.w>0&&b.w>0&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),label+' overlap: '+JSON.stringify([a,b]));
 }
 for(const h of run('UI_HITS'))assert(h.x>=0&&h.y>=0&&h.x+h.w<=320&&h.y+h.h<=180,label+' hit outside');
 layouts++;
}
function test(label,fn){fn();checks++;console.log('PASS '+label);}
for(const mobile of [false,true,'bindings']){
 scenario();run(`Game.state='overworld';OW.menu=OW.msg=OW.ring=null;MOBILE.enabled=${mobile===true};Prefs.bindings={...DEFAULT_BINDINGS};${mobile==='bindings'?"Prefs.bindings.ok=' ';Prefs.bindings.back='Backspace';":''}`);
 for(const type of ['settings','bindings','studies','guide']){
  run(`openOverlay('${type}')`);
  const n=type==='settings'?7:type==='bindings'?13:3;
  for(let idx=0;idx<n;idx++){
   run(`Game.overlay.idx=${idx}`);layout(type+idx+'/'+mobile,'drawOverlay()');
   if(type==='bindings'&&idx<12){run(`Game.overlay.capture=Object.keys(DEFAULT_BINDINGS)[${idx}];Game.overlay.message='Teclado físico: pulsa una tecla. B cancela.'`);layout('capture'+idx,'drawOverlay()');run('Game.overlay.capture=null');}
  }
 }
 run('closeOverlay();openMenu();OW.menu.t=20;Game.owned.pluma=true');
 for(let idx=0;idx<3;idx++)for(let row=0;row<2;row++){
  run(`OW.menu.idx=${idx};OW.menu.level='equip';OW.menu.row=${row}`);
  for(let i=0;i<(row?5:4);i++){
   run('changeEquipment(OW.menu,1)');layout('equipment '+idx+'/'+row+'/'+i,'drawMenu()');
  }
 }
 run('OW.menu=null;OW.msg={lines:DATA.texts.intro,t:50}');
 for(const key of ['intro','ending','gameover'])layout('message '+key,`drawMessage(DATA.texts.${key})`);
 assert(run("DATA.bossDialogue.every(l=>l.who==='tinta'?['smug','cold','menace','angry'].includes(l.mood):l.mood in MOOD_EYES)"),'every dialogue line needs a mood its speaker can show');
 for(let i=0;i<run('DATA.bossDialogue.length');i++)for(const ch of [0,12,999])layout('dialogue '+i+'/'+ch,`drawDialogue({i:${i},ch:${ch},t:50})`);
 run('OW.msg=null;Game.overlay=null');
 // the field ring, aimed at each piece of the atelier, with every art selected and each stage of the puzzle
 for(const [x,y,dir] of [[10*16+8,22*16+8,'right'],[12*16+8,17*16+8,'up'],[23*16+8,6*16+8,'right'],[29*16+8,5*16+8,'right'],[34*16+8,21*16+8,'up'],[37*16+8,26*16+8,'down']])for(let idx=0;idx<6;idx++)for(const stage of [0,1]){
  run(`OW.x=${x};OW.y=${y};OW.dir='${dir}';OW.cam.x=clamp(OW.x-W/2,0,MAP.w*TILE-W);OW.cam.y=clamp(OW.y-H/2,0,MAP.h*TILE-H);Game.puzzle=PUZ0();if(${stage}){for(const t of fieldGroups().sketches)Game.puzzle.paint[t.id]=['rojo'];}openRing();OW.ring.idx=${idx};OW.ring.t=20;`);
  layout('field '+x+','+y+'/'+idx+'/'+stage, 'drawRing()');
 }
 run('OW.ring=null');layout('pigment','drawPigmentHUD()');layout('rinse','OW.heal=true;OW.jar.phase="clear";drawRinseUI();OW.heal=false');
 scenario();layout('victory','B.result=999;B.stats={mixes:18,interrupts:12};drawBattleResults()');layout('defeat','B.t=90;drawDefeat()');
}

test('pointer: hovering a tool only previews it; clicking a tool or a pocket equips exactly that one',()=>{
 scenario();run("Game.state='overworld';openMenu();OW.menu.t=20;releaseInputs();UI_HITS.length=0;drawMenu();");
 const slot=i=>`UI_HITS.find(h=>h.x===MENU_SLOTS.wx(${i})-16&&h.y===26)`,pocket=i=>`UI_HITS.find(h=>h.x===MENU_SLOTS.ax(${i})-1&&h.y===MENU_SLOTS.ay-2)`;
 run(slot(1)+'.hover()');assert.equal(run('Party[0].weapon'),'brocha','hover must not equip');assert.equal(run('OW.menu.cur[0]'),1);
 run('UI_HITS.length=0;drawMenu();'+slot(1)+'.run()');assert.equal(run('Party[0].weapon'),'lapiz');assert.equal(run("Party.find(p=>p.id==='ambar').weapon"),'brocha','the other painter swaps');
 run('UI_HITS.length=0;drawMenu();'+pocket(3)+'.run()');assert.equal(run('Party[0].acc'),'lienzo');
 run("Game.owned.pluma=false;UI_HITS.length=0;drawMenu();"+slot(3)+'.run()');assert.equal(run('Party[0].weapon'),'lapiz','an unfound tool cannot be worn');
});
test('hovering study cards never spends; explicit learning spends once and stamps',()=>{
 scenario();run("Game.state='overworld';openOverlay('studies');Game.pigmento=50;UI_HITS.length=0;drawOverlay();UI_HITS.find(h=>h.y===48).hover()");
 assert.equal(run('Game.pigmento'),50);assert.equal(run('!!Game.studies.veladura'),false);
 run('UI_HITS.find(h=>h.y===159).run()');assert.equal(run('Game.pigmento'),32);assert.equal(run('Game.studies.veladura'),true);assert.equal(run('Game.overlay.stampAt===ARTUI.t'),true);
 run('UI_HITS.find(h=>h.y===159).run()');assert.equal(run('Game.pigmento'),32);
});
test('capture cannot be switched by hover or a different notebook bookmark',()=>{
 run("openOverlay('bindings');Game.overlay.capture='ok';artFocus(Game.overlay,5);switchArtOverlay('guide')");assert.equal(run('Game.overlay.idx'),0);assert.equal(run('Game.overlay.type'),'bindings');
});
test('UI clock advances through options while combat remains paused',()=>{
 scenario();run("openOverlay('settings');releaseInputs();const atelierTime=ARTUI.t,battleTime=B.t;update()");assert.equal(run('ARTUI.t===atelierTime+1&&B.t===battleTime'),true);
});
test('field ring icons select without casting, consuming MP or changing a puzzle',()=>{
 scenario();run("Game.state='overworld';OW.x=10*16+8;OW.y=22*16+8;OW.dir='right';openRing();OW.ring.t=20;const atelierPuzzle=JSON.stringify(Game.puzzle),atelierMP=Party.map(p=>p.cur.mp).join();UI_HITS.length=0;drawRing();UI_HITS[1].hover()");
 assert.equal(run('OW.ring.idx'),1);assert.equal(run('JSON.stringify(Game.puzzle)===atelierPuzzle&&Party.map(p=>p.cur.mp).join()===atelierMP'),true);
});
test('map buttons withdraw during cinematics and field actions cannot open studies',()=>{
 scenario();run("Game.state='transition';OW.menu=OW.msg=OW.ring=null;UI_HITS.length=0;drawOverworld()");assert.equal(run('UI_HITS.length'),0);
 run("Game.state='overworld';OW.act={};UI_HITS.length=0;drawPigmentHUD()");assert.equal(run('UI_HITS.length'),0);run('OW.act=null');
});
test('reduced motion silences UI events and no feedback consumes combat RNG',()=>{
 run("Prefs.shake=0;ARTUI.motes=[];artBurst(10,10);tickArtUI();Math.random=()=>{throw Error('UI consumed RNG')};openOverlay('guide');drawOverlay();drawArtFeedback()");assert.equal(run('ARTUI.motes.length'),0);assert.equal(run('artPop(ARTUI.t-5)'),0);run('Math.random=()=>.5');
});
console.log(`${layouts} atelier layouts, ${checks} interaction checks passed.`);
