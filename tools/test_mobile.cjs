/* Input/rotation integration checks. Browser layout is also checked via CUA. */
const {ctx,run,scenario}=require('./test_combat.cjs');
const assert=require('node:assert/strict');
const events={},buttons=[];
const classes=()=>({toggle(){},remove(){}});
const node=(dataset={})=>({dataset,disabled:false,style:{},classList:classes(),handlers:{},addEventListener(k,fn){this.handlers[k]=fn},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:112,height:112}},closest(){return this}});
for(const k of ['ok','back','swap','release','ring','journal','help','options'])buttons.push(node({touchAction:k}));
buttons.push(node({touchMenu:'equipment'}));
for(const k of ['up','down','left','right'])buttons.push(node({touchDirection:k}));
const pad=node(),fullscreen=node(),span={textContent:''},body=ctx.document.body;
body.classList=classes();ctx.document.documentElement=node();
ctx.document.querySelectorAll=()=>buttons;ctx.document.querySelector=()=>span;
const originalGet=ctx.document.getElementById;
ctx.document.getElementById=id=>id==='touch-pad'?pad:id==='touch-fullscreen'?fullscreen:originalGet(id);
ctx.document.addEventListener=(k,fn)=>(events[k]||=[]).push(fn);
// The fixture loads mobile.js before game.js, exactly as index.html does.
run(`initMobileControls();MOBILE.enabled=true;MOBILE.portrait=false;`);
let count=0;
function test(name,fn){scenario();run(`MOBILE.enabled=true;MOBILE.portrait=false;releaseInputs();`);fn();count++;console.log('PASS '+name)}
const pointer=(id,target,extras={})=>({pointerId:id,target,clientX:56,clientY:12,preventDefault(){},...extras});
test('touch layout covers phones, tablets and small windows without changing desktop',()=>{
 assert.equal(run(`useTouchLayout(844,390,false)`),true);assert.equal(run(`useTouchLayout(390,844,true)`),true);assert.equal(run(`useTouchLayout(390,844,false)`),false);
 assert.equal(run(`useTouchLayout(1024,768,true)`),true);assert.equal(run(`useTouchLayout(1280,720,false)`),false);
});
test('independent fingers hold movement and confirm together',()=>{
 pad.handlers.pointerdown(pointer(1,buttons.find(b=>b.dataset.touchDirection==='right')));
 buttons[0].handlers.pointerdown(pointer(2,buttons[0]));run(`pollGamepad()`);
 assert.equal(run(`keys.right&&keys.ok`),true);assert.equal(run(`pressed.ok`),true);
 events.pointerup.forEach(fn=>fn(pointer(2)));assert.equal(run(`keys.ok`),false);assert.equal(run(`keys.right`),true);
 events.pointercancel.forEach(fn=>fn(pointer(1)));assert.equal(run(`keys.right`),false);
});
test('dragging the pad changes direction and lost capture clears movement',()=>{
 run(`Game.state='overworld';OW.msg=null;OW.menu=null;OW.ring=null;OW.act=null;OW.heal=null`);
 pad.handlers.pointerdown(pointer(3,buttons.find(b=>b.dataset.touchDirection==='up')));
 pad.handlers.pointermove(pointer(3,pad,{clientX:104,clientY:104}));assert.equal(run(`keys.down&&keys.right&&!keys.up`),true);
 events.lostpointercapture.forEach(fn=>fn(pointer(3)));assert.equal(run(`keys.down||keys.right`),false);
 assert.deepEqual(Array.from(run(`touchDirections(56,56,112,112,true)`)),[]);
 assert.equal(run(`touchDirections(105,104,112,112,false).length`),1);
});
test('opening menus releases touch and keyboard without stuck keys',()=>{
 run(`setTouchPointer(4,['up']);keyboardAction('ok',true);openOverlay('settings')`);
 assert.equal(run(`keys.up||keys.ok||TOUCH_HELD.up`),false);assert.equal(run(`MOBILE.pointers.size`),0);
});
test('keyboard and touch retain separate ownership of a held direction',()=>{
 run(`keyboardAction('left',true);setTouchPointer(5,['left']);endTouchPointer(5)`);assert.equal(run(`keys.left`),true);
 run(`setTouchPointer(5,['left']);keyboardAction('left',false)`);assert.equal(run(`keys.left`),true);
 run(`endTouchPointer(5);pollGamepad()`);assert.equal(run(`keys.left`),false);
});
test('portrait keeps playing with its own layout and rotation releases fingers',()=>{
 run(`setTouchPointer(6,['ok']);MOBILE.forced=true;`);ctx.innerWidth=390;ctx.innerHeight=844;run(`fit();const portraitTime=Game.t;update()`);
 assert.equal(run(`MOBILE.portrait`),true);assert.equal(run(`Game.t>portraitTime`),true);assert.equal(run(`MOBILE.pointers.size`),0);assert.equal(run(`mobilePaused()`),false);
 ctx.innerWidth=844;ctx.innerHeight=390;run(`fit();update()`);assert.equal(run(`MOBILE.portrait`),false);assert.equal(run(`mobilePaused()`),false);run(`MOBILE.forced=false`);
});
test('canvas scales fractionally without distorting its aspect ratio',()=>{
 const screen=originalGet('game-screen');screen.getBoundingClientRect=()=>({width:443,height:319,left:124,top:48});
 ctx.innerWidth=667;ctx.innerHeight=375;run(`fit()`);
 const canvas=originalGet('c'),w=parseFloat(canvas.style.width),h=parseFloat(canvas.style.height);
 assert.equal(w,443);assert(Math.abs(w/h-16/9)<.001);assert(h<=319);
});
test('touch controls operate equipment and repeat menu navigation deliberately',()=>{
 run(`Game.state='overworld';OW.msg=null;OW.menu=null;OW.ring=null;OW.heal=null;OW.act=null;touchEquipment()`);assert.equal(run(`OW.menu.level`),'chars');
 run(`setTouchPointer(7,['down']);pressed.down=false;for(let i=0;i<23;i++)updateTouchControls()`);assert.equal(run(`pressed.down`),false);
 run(`updateTouchControls()`);assert.equal(run(`pressed.down`),true);assert.equal(run(`keyLabel('ok')`),'A');
});
test('touch back cancels keyboard capture without a physical Escape key',()=>{
 run(`openOverlay('bindings');Game.overlay.capture='ok';setTouchPointer(8,['back']);updateOverlay()`);
 assert.equal(run(`Game.overlay.capture`),null);assert.equal(run(`Game.overlay.type`),'bindings');
});
test('Y is available only for another ready painter and arrows still choose wells',()=>{
 run('B.party[1].atb=20;B.party[2].atb=20;openCmd(B.party[0]);updateTouchControls()');
 const swap=buttons.find(b=>b.dataset.touchAction==='swap');assert.equal(swap.disabled,true);
 run('B.party[2].atb=100;updateTouchControls()');assert.equal(swap.disabled,false);
 swap.handlers.pointerdown(pointer(9,swap));run('updateBattleMenu()');assert.equal(run('B.menu.unit.id'),'anil');
 events.pointerup.forEach(fn=>fn(pointer(9)));run('pressed.down=true;updateBattleMenu()');
 assert.equal(run('B.menu.unit.id'),'anil');assert.equal(run('B.menu.idx'),1); // down walks the rim from Attack to Techniques
 for(const level of ['tech','item','target']){
  run(`openCmd(B.party[0]);B.menu.level='${level}';B.menu.pending={type:'attack'};updateTouchControls()`);assert.equal(swap.disabled,false,level);
  swap.handlers.pointerdown(pointer(10,swap));run('updateBattleMenu()');assert.equal(run('B.menu.unit.id'),'anil');events.pointerup.forEach(fn=>fn(pointer(10)));
 }
});
test('tapping the map walks there around obstacles, and tapping Sepia opens her shop on arrival',()=>{
 run(`resetGame();Game.intro=false;initOverworld();OW.msg=null;OW.menu=null;OW.ring=null;setState('overworld');for(const sg of MAP.signs||[])sg.read=true;`);
 const m=run('merchantAt()');
 // a spot the lead can reach: straight to it, with no keys held
 run(`OW.x=${m.x}-60;OW.y=${m.y}+26;OW.cam.x=clamp(OW.x-160,0,MAP.w*16-320);OW.cam.y=clamp(OW.y-90,0,MAP.h*16-180);releaseInputs();`);
 const tx=run(`${m.x}-20-OW.cam.x`),ty=run(`${m.y}+26-OW.cam.y`);
 assert.equal(run(`tapWalk(${tx},${ty})`),true,run('JSON.stringify([Game.state,!!OW.menu,!!OW.ring,!!OW.msg,!!OW.act,!!OW.heal,!!Game.overlay,OW.landT])'));assert(run('!!TAP.route'),'no route to an open spot');
 run(`for(let i=0;i<200&&TAP.route;i++)updateOverworld();`);assert(run('!TAP.route'));
 assert(run(`Math.hypot(OW.x-(${m.x}-20),OW.y-(${m.y}+26))<6`),'did not arrive: '+run('[OW.x,OW.y]'));
 // arrow keys take over at once
 run(`tapWalk(${tx}-40,${ty});keys.up=true;updateOverworld();keys.up=false;`);assert.equal(run('TAP.route'),null);
 // tapping the merchant herself walks next to her and opens the shop
 run(`tapWalk(${m.x}-OW.cam.x,${m.y}-OW.cam.y)`);assert(run('TAP.route&&TAP.route.interact'));
 run(`for(let i=0;i<300&&!Game.overlay;i++){updateOverworld();for(const k in pressed)if(k!=='ok')pressed[k]=false;}`);
 assert.equal(run('Game.overlay?.type'),'shop');run('closeOverlay()');
 // an unreachable spot leaves a crossed-out mark and no route
 run(`OW.x=${m.x}-60;OW.y=${m.y}+26;TAP.route=null;`);assert.equal(run('tapPath(-50,-50)'),null);
 run('drawOverworld()');
});
test('the floating stick: the thumb sets its own centre, eight directions on the map and four in menus, released cleanly',()=>{
 run(`resetGame();Game.intro=false;OW.msg=null;OW.menu=null;OW.ring=null;setState('overworld');releaseInputs();globalThis.stickPad=document.getElementById('touch-pad');globalThis.stickEv=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){},target:{closest(){return null}}});`);
 run(`touchPadDown(stickPad,stickEv(9,300,200),true)`);assert.equal(run('keys.left||keys.right||keys.up||keys.down'),false,'the landing spot is the centre: no direction yet');
 run(`touchPadMove(stickPad,stickEv(9,304,203))`);assert.equal(run('keys.left||keys.right||keys.up||keys.down'),false,'dead zone');
 run(`touchPadMove(stickPad,stickEv(9,345,200))`);assert.equal(run('keys.right&&!keys.up&&!keys.down'),true);
 run(`touchPadMove(stickPad,stickEv(9,340,240))`);assert.equal(run('keys.right&&keys.down'),true,'diagonal on the map');
 run(`OW.menu={t:0};touchPadMove(stickPad,stickEv(9,341,241))`);assert.equal(run('[keys.right,keys.down].filter(Boolean).length'),1,'menus snap to four');
 events.pointerup.forEach(fn=>fn(pointer(9)));assert.equal(run('keys.right||keys.down'),false);assert.equal(run('stickPad.style.transform'),'');run('OW.menu=null');
});
test('landscape folds the menu tabs into one notebook tab; the first visual hint goes away once the player moves',()=>{
 run(`document.body.classList={set:new Set(),toggle(k,v){v??=!this.set.has(k);v?this.set.add(k):this.set.delete(k);return v},contains(k){return this.set.has(k)},remove(k){this.set.delete(k)},add(k){this.set.add(k)}};`);
 run('touchDrawer(true)');assert.equal(run(`document.body.classList.contains('drawer-open')`),true);run('touchDrawer(false)');assert.equal(run(`document.body.classList.contains('drawer-open')`),false);
 run(`MOBILE.coachSeen=false;MOBILE.coach=null;resetGame();Game.intro=false;OW.msg=null;OW.landT=0;setState('overworld');touchCoachUpdate();`);assert.equal(run(`document.body.classList.contains('touch-coach')`),true);
 run(`tapWalk(200,100)`);assert.equal(run('MOBILE.coachSeen'),true);run('touchCoachUpdate()');assert.equal(run(`document.body.classList.contains('touch-coach')`),false);
 run(`document.body.classList={toggle(){},remove(){},add(){},contains(){return false}};`);
});
console.log(`${count} mobile integration checks passed.`);
