/* Browser/audio regressions. Start a local HTTP server, then:
   CHROME_BIN=/path/to/chrome node tools/test_audio.cjs [http://127.0.0.1:8765]
   Development dependency: playwright. No dependencies are added to the game. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:8765';
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
 const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN} : {}),
  headless: true, args:['--autoplay-policy=no-user-gesture-required']
 });
 try {
   // Fetch-failure checks below must reach page.route, rather than being served
   // successfully by the game's service-worker cache after the network aborts.
   const page = await browser.newPage({serviceWorkers:'block'}); const errors = []; const requests = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r=>requests.push(r.url()));
  await page.goto(base); await page.waitForFunction(()=>window.__chromara);
  assert.equal(requests.some(x=>x.includes('music_samples.js')), false, 'HTTP must not load the offline music bundle');
  assert.equal(requests.some(x=>new URL(x).pathname.endsWith('.opus.ogg')), false, 'no autoplay before a gesture');
  await page.keyboard.press('z'); await delay(180); await page.keyboard.press('z');
  await page.waitForFunction(()=>__chromara.Audio.src?.name==='title');
  console.log('PASS title starts after opening the notebook');
  await page.evaluate(()=>{__chromara.start();__chromara.OW.msg=null;__chromara.Game.intro=false;});
  await page.waitForFunction(()=>__chromara.Audio.src?.name==='map'); await delay(650);
  await page.evaluate(()=>__chromara.battle('1'));
  await page.waitForFunction(()=>__chromara.Game.state==='battle' && __chromara.Audio.src?.name==='battle',null,{timeout:20000});
   assert.equal(await page.evaluate(()=>MUSIC_CUES.battle.title),'Tres gotas');
   assert.equal(await page.evaluate(()=>MUSIC_FALLBACK.battle.bpm),160);
  assert(requests.some(x=>/battle\.opus\.ogg\?v=[a-f0-9]{12}$/.test(x)), 'new composition bypasses cached combat audio');
  const choreography = await page.evaluate(()=>{
   const A=__chromara.Audio, original=A.sfx, calls=[];__chromara.pause(true);
   A.sfx=function(name,options){calls.push({name,options});return original.call(this,name,options);};
   const target=B.enemies[0], hp=target.hp; target.hp=10000;
   const run=gen=>{for(let i=0;i<800;i++)if(gen.next().done)return;throw new Error('Attack never completes');};
   try {
    for(const u of B.party)run(actAttack(u,target));
    for(const id of ['llamarada','brote','eclipse','arcoiris']) {
     const tech=DATA.techs[id], users=tech.users.map(id=>B.party.find(p=>p.id===id));
     run(actTech(users,tech,[target],tech.color));
    }
    damage(B.party[0],1,'negro');
   } finally {target.hp=hp;A.sfx=original;__chromara.pause(false);}
   return calls;
  });
  for(const name of ['brush_sweep','scratch','scratch_long','brush_hiss','ink_hit'])assert(choreography.some(e=>e.name===name),name+' reaches actual choreography');
  assert(choreography.some(e=>e.name==='charge'&&e.options.semi===0),'Carmín retains Re, not the enemy pitch');
  assert.deepEqual(choreography.filter(e=>e.name==='mix').map(e=>e.options.colours),[[0,4],[4,7],[0,7],[0,4,7]],'all four techs use their actual participants');
  console.log('PASS three tool choreographies, pigment pitches, fusion and ink impact routing');
  const saved = await page.evaluate(()=>__chromara.Audio.positions.map);
  assert(saved>.4, 'the map position is remembered');
  await page.evaluate(()=>__chromara.win());
  await page.waitForFunction(()=>__chromara.B.showResult);
  assert.equal(await page.evaluate(()=>__chromara.Audio.cur),'victory');
  await delay(650); await page.keyboard.press('z');
  await page.waitForFunction(()=>__chromara.Game.state==='overworld' && __chromara.Audio.src?.name==='map');
  assert((await page.evaluate(()=>__chromara.Audio.src.offset))>=saved-.05,'world music resumes after combat');
  console.log('PASS encounter → battle → victory → map resumes');
  await page.evaluate(()=>{__chromara.OW.x=30*16+8;__chromara.OW.y=21*16+8;__chromara.OW.msg=null;});
  await page.waitForFunction(()=>__chromara.Audio.src?.name==='atelier');
  // Brief excursions over the doorway must not retrigger the music.
  await page.evaluate(()=>__chromara.OW.x=27*16); await delay(80);
  await page.evaluate(()=>__chromara.OW.x=30*16); await delay(100);
  assert.equal(await page.evaluate(()=>__chromara.Audio.cur),'atelier');
  console.log('PASS atelier cue and doorway debounce');
  await page.evaluate(()=>{__chromara.battle('B');});
  await page.waitForFunction(()=>__chromara.B.tr?.stage==='dialogue' && __chromara.Audio.src?.name==='prelude');
  for(let i=0;i<13;i++){await page.keyboard.press('z');await delay(90);}
  await page.waitForFunction(()=>__chromara.Game.state==='battle' && __chromara.Audio.src?.name==='boss',null,{timeout:20000});
  await page.evaluate(()=>__chromara.win()); await page.waitForFunction(()=>__chromara.B.showResult);
  await delay(650); await page.keyboard.press('z');
  await page.waitForFunction(()=>__chromara.Game.bossDown && __chromara.Audio.src?.name==='restored');
  assert.equal(await page.evaluate(()=>__chromara.Game.palette),'vivo');
  console.log('PASS La Tinta dialogue → boss → restored world');
  await page.evaluate(()=>__chromara.pause(true));
  // Several nested mix/impact ducks must recover to a fixed level, never ratchet down.
  await page.evaluate(()=>{__chromara.SFX.duck(-6,100,80);__chromara.SFX.duck(-3,60,30);__chromara.SFX.duck(-5,80,60);});
  await delay(650);
  const levels=await page.evaluate(()=>[__chromara.Audio.musicBus.gain.value,__chromara.Audio.musicLevel]);
  assert(Math.abs(levels[0]-levels[1])<.005,'overlapping ducks recover');
  // All three scheduled colours must reach the sampler, even within one JS tick.
  const notes=await page.evaluate(()=>{
   const S=__chromara.SFX, original=S.sample, calls=[];
   S.sample=function(...args){calls.push(args);return original.apply(this,args);};
   S.play('ready',{semi:0});S.play('ready',{semi:4,when:.08});S.play('ready',{semi:7,when:.16});
   S.sample=original;return calls.map(x=>x[1]);
  });
  assert.deepEqual(notes,[0,4,7]);
  await page.keyboard.press('m');await delay(180);
  assert((await page.evaluate(()=>__chromara.Audio.master.gain.value))<.002);
  await page.keyboard.press('m');await delay(180);
  assert(Math.abs((await page.evaluate(()=>__chromara.Audio.master.gain.value))-.55)<.002);
  console.log('PASS ducking, three-colour notes and mute');
  // Check decoded buffers, both sides of every seam, and memory eviction.
  const decoded=await page.evaluate(async()=>{
   const A=__chromara.Audio, results=[];
   for(const name of Object.keys(MUSIC_CUES)){
    const b=await A.decode(name), m=MUSIC_CUES[name];let peak=0,nonfinite=0;
    for(let c=0;c<b.numberOfChannels;c++)for(const v of b.getChannelData(c)){peak=Math.max(peak,Math.abs(v));if(!Number.isFinite(v))nonfinite++;}
    const d=b.getChannelData(0),a=Math.round(m.loopStart*b.sampleRate),z=Math.min(d.length,Math.round(m.loopEnd*b.sampleRate));
    results.push({name,duration:b.duration,loop:m.loop,valid:!m.loop||(a>=0&&a<z&&z<=d.length),peak,nonfinite,jump:m.loop?Math.abs(d[z-1]-d[a]):0});
   }
   return {results,cache:Object.keys(A.buffers).length};
  });
  for(const d of decoded.results){assert(d.valid,d.name);assert(d.peak>.01 && d.peak<1,d.name+' headroom');assert.equal(d.nonfinite,0);}
  assert(decoded.cache<=4,'bounded PCM cache');
  console.log('PASS 9 decoded cues, finite samples, headroom, loop bounds and bounded cache');
  console.log(JSON.stringify(decoded.results,null,2));
  // Race: a slow/stale decode may not replace the last requested cue.
  const current=await page.evaluate(async()=>{
   const A=__chromara.Audio;A.play('map',{restart:true});A.play('battle');A.play('restored');
   await new Promise(r=>setTimeout(r,350));return A.cur;
  });
  assert.equal(current,'restored');
  // A failed fetch/decode must preserve both a world cue and the revised battle score.
  for(const name of ['atelier','battle']) {
   await page.route('**/music/'+name+'.opus.ogg*',route=>route.abort());
   await page.evaluate(name=>{delete __chromara.Audio.buffers[name];__chromara.Audio.play(name,{restart:true});},name);
   await page.waitForFunction(name=>__chromara.Audio.cur===name && !!__chromara.Audio.seq,name);
  }
  await page.evaluate(()=>__chromara.Audio.stop());
  assert.equal(await page.evaluate(()=>__chromara.Audio.seq),null);
  console.log('PASS cancellation race and failed-fetch fallback');
  const loopNotes=await page.evaluate(async()=>{
   const A=__chromara.Audio, original=A.note, notes=[];
   MUSIC_FALLBACK.__loop_test={bpm:960,stepsPerBeat:4,length:16,loopStart:4,loop:true,
    tracks:[{notes:[[0,61,1],[4,65,1],[12,69,1]]}]};
   A.note=(tr,time,midi)=>notes.push(midi);
   try {A.play('__loop_test',{fallback:true});await new Promise(r=>setTimeout(r,550));}
   finally {A.stop();A.note=original;delete MUSIC_FALLBACK.__loop_test;}
   return notes;
  });
  assert.equal(loopNotes.filter(n=>n===61).length,1,'fallback intro plays once');
  assert(loopNotes.filter(n=>n===65).length>=3,'fallback repeats the written loop');
  console.log('PASS fallback retains the introduction only on first entry');
  // Render the actual sound-design primitives offline, not a mock AudioParam.
  const sfxSource = fs.readFileSync(path.join(root,'sfx.js'),'utf8');
  const effects = await page.evaluate(async source => {
   const names=[...new Set(Object.values(SFX_SAMPLES).filter(s=>s.kind==='effect').map(s=>s.event)), 'mix_bell','discovery','ready','equip','rainbow','heal','saturate','pigment_return'];
   const rate=32000, interval=3.5, context=new OfflineAudioContext(2, Math.ceil((names.length*interval+3)*rate), rate);
   const master=context.createGain();master.gain.value=.55;master.connect(context.destination);
   const kit=new Function(source+'; return SFX;')();kit.init(context,master);kit.duck=()=>{};
   names.forEach((name,i)=>kit.play(name,{when:i*interval,semi:i===9?7:0}));
   if(Object.keys(kit.effects).length !== 49 || Object.keys(kit.effectCounters).length !== 49) throw new Error('Every new material must actually reach the effect sampler');
   const out=await context.startRendering(); const data=out.getChannelData(0);
   return names.map((name,i)=>{let peak=0,energy=0;for(const v of data.slice(Math.round(i*interval*rate),Math.round((i+1)*interval*rate))){peak=Math.max(peak,Math.abs(v));energy+=v*v;}return {name,peak,rms:Math.sqrt(energy/(interval*rate))};});
  },sfxSource);
  for(const effect of effects){assert(Number.isFinite(effect.peak)&&effect.peak>.001&&effect.peak<.95,JSON.stringify(effect));assert(effect.rms>0);}
  console.log('PASS actual offline SFX renders: finite output, audible signal and headroom');
  assert.deepEqual(errors,[]);
  // file:// is a separate origin/path: embedded Opus must work without HTTP fetch.
  const offline=await browser.newPage();offline.on('pageerror',e=>errors.push(e.message));
  const offlineRequests=[];offline.on('request',r=>offlineRequests.push(r.url()));
  await offline.goto('file://'+path.join(root,'index.html'));await offline.waitForFunction(()=>window.__chromara);
  await offline.keyboard.press('z');await offline.evaluate(()=>{__chromara.start();__chromara.OW.msg=null;});
  await offline.waitForFunction(()=>__chromara.Audio.src?.name==='map');
  assert(offlineRequests.some(x=>x.includes('music_samples.js')));
  assert(!offlineRequests.some(x=>new URL(x).pathname.endsWith('.opus.ogg')));
  console.log('PASS file:// offline embedded playback');
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
