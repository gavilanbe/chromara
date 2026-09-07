/* Actual game/canvas regression for the rinse glass. Same Playwright setup as
   test_world.cjs. Pass --capture to export a video with the actual timed SFX. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const base=process.argv.find(a=>a.startsWith('http'))||'http://127.0.0.1:8765';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:760}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.__chromara);
    await page.evaluate(()=>{
      window.rinseTest={
        setup(){resetGame();Game.state='overworld';Game.paused=true;Game.intro=false;OW.msg=null;Game.overlay=null;releaseInputs();
          OW.x=MAP.jar.x*TILE+16;OW.y=MAP.jar.y*TILE+40;OW.cam.x=0;OW.cam.y=OW.y-H/2;
          OW.hist=Array.from({length:40},(_,i)=>[OW.x+Math.min(i,24),OW.y+Math.min(i,12)]);
          Party.forEach((p,i)=>{p.cur.hp=i?1:0;p.cur.mp=0;});
        },
        finish(){let n=0;while(OW.heal){if(++n>700)throw new Error('Rinse never ends');updateOverworld();render();}return n;},
        verify(){return{full:Party.every(p=>p.cur.hp===effStats(p).hp&&p.cur.mp===effStats(p).mp),visible:OW.jar.hidden.every(v=>!v)&&OW.jar.inside.every(v=>!v)&&OW.jar.jump.every(v=>!v),zoom:OW.jar.zoom,phase:OW.jar.phase,cd:OW.jar.cd};}
      };
    });
    const first=await page.evaluate(()=>{
      rinseTest.setup();const poses=JSON.stringify([OW.x,OW.y,OW.hist]),cam=JSON.stringify(OW.cam),foes=JSON.stringify(OW.foes);
      const stages=new Set(),fills=[],events=[],audio=Audio.sfx;let t=0,inside=false,spray=false,zoom=false;
      Audio.sfx=(name,o)=>events.push({name,o,frame:t});
      try{
        updateOverworld();if(!OW.heal)throw new Error('Glass did not trigger');
        while(OW.heal){if(++t>700)throw new Error('Rinse never ends');updateOverworld();render();stages.add(OW.jar.phase);fills.push(OW.jar.tint.length);inside ||= OW.jar.inside.every(Boolean);spray ||= OW.jar.spray.length>0;zoom ||= OW.jar.zoom>1.1;}
      }finally{Audio.sfx=audio;}
      return{...rinseTest.verify(),t,stages:[...stages],inside,spray,zoomed:zoom,poses:poses===JSON.stringify([OW.x,OW.y,OW.hist]),camera:cam===JSON.stringify(OW.cam),foes:foes===JSON.stringify(OW.foes),fills:[...new Set(fills)],events,toast:OW.jar.toast,msg:OW.msg};
    });
    assert(first.full&&first.visible&&first.poses&&first.camera&&first.foes&&first.inside&&first.spray&&first.zoomed);
    assert.equal(first.zoom,1);assert.equal(first.phase,'idle');assert.equal(first.cd,1);assert.equal(first.msg,null);assert(first.toast>0);
    assert.deepEqual(first.stages,['focus','enter','mix','clear','exit','settle','idle']);assert.deepEqual(first.fills,[0,1,2,3]);
    assert.equal(first.events.filter(e=>e.name==='splash_clean').length,6);assert.equal(first.events.filter(e=>e.name==='heal_bells').length,1);
    console.log('PASS every phase, visible immersion, six splashes, full healing including KO, original positions and camera');

    const repeat=await page.evaluate(()=>{
      for(let i=0;i<180;i++)updateOverworld();const noLoop=!OW.heal&&OW.jar.visits===1;
      OW.x+=70;OW.msg=null;updateOverworld();const rearmed=OW.jar.cd===0;OW.x-=70;OW.msg=null;updateOverworld();
      const n=rinseTest.finish();return{noLoop,rearmed,n,visits:OW.jar.visits,...rinseTest.verify()};
    });
    assert(repeat.noLoop&&repeat.rearmed&&repeat.full&&repeat.visible);assert.equal(repeat.visits,2);assert(repeat.n<first.t-50);
    console.log('PASS no automatic loop; leaving and returning plays a shorter complete visit');

    const pause=await page.evaluate(()=>{
      rinseTest.setup();Game.paused=false;updateOverworld();for(let i=0;i<40;i++)updateOverworld();
      openOverlay('settings');const clock=OW.jar.clock,phase=OW.jar.phase;for(let i=0;i<40;i++)update();
      const stopped=OW.jar.clock===clock&&OW.jar.phase===phase;closeOverlay();rinseTest.finish();Game.paused=true;
      return{stopped,...rinseTest.verify()};
    });
    assert(pause.stopped&&pause.full&&pause.visible);console.log('PASS options pause the sequence and resume without losing characters');

    const fixed=await page.evaluate(()=>{
      rinseTest.setup();Prefs.camera='fija';Prefs.flash=0;const camera=JSON.stringify(OW.cam);updateOverworld();let moved=false;
      while(OW.heal){updateOverworld();render();moved ||= OW.jar.zoom!==1||JSON.stringify(OW.cam)!==camera;}
      return{moved,...rinseTest.verify()};
    });
    assert(!fixed.moved&&fixed.full&&fixed.visible);console.log('PASS fixed camera and disabled glow preferences');

    const cancel=await page.evaluate(()=>{
      rinseTest.setup();updateOverworld();for(let i=0;i<150;i++)updateOverworld();OW.heal.return();OW.heal=null;
      return rinseTest.verify();
    });
    assert(cancel.visible&&cancel.phase==='idle'&&cancel.zoom===1);console.log('PASS interruption clears immersion, transforms and temporary poses');

    // Warm caches once; identical repeated visits may not create per-frame sprites.
    const cache=await page.evaluate(()=>{
      const counts=[];for(let n=0;n<2;n++){rinseTest.setup();Prefs.camera='suave';Prefs.flash=.4;updateOverworld();rinseTest.finish();counts.push(spriteCache.size);}
      return counts;
    });
    assert.equal(cache[1],cache[0]);console.log('PASS animated glass reuses its render surface and sprite cache');

    if(process.argv.includes('--capture')){
      const captures=await page.evaluate(()=>{
        rinseTest.setup();Prefs.camera='suave';Prefs.flash=.4;const frames=[],shots={},events=[],audio=Audio.sfx;let t=0;
        Audio.sfx=(name,o)=>events.push({name,o,at:t/60});
        const capture=()=>{render();frames.push(buf.toDataURL());};
        try{
          for(t=0;t<30;t+=2)capture();updateOverworld();
          while(OW.heal){updateOverworld();render();if(t%2===0)frames.push(buf.toDataURL());if(OW.jar.phase==='mix'&&OW.jar.charge>.55&&!shots.mix)shots.mix=cv.toDataURL();if(OW.jar.phase==='clear'&&OW.jar.clarity>.8&&!shots.clear)shots.clear=cv.toDataURL();if(OW.jar.phase==='enter'&&OW.jar.jump[1]?.[2]>35&&!shots.jump)shots.jump=cv.toDataURL();t++;}
          for(let n=0;n<45;n++){updateOverworld();if(n%2===0)capture();t++;}shots.end=cv.toDataURL();
          return{frames,shots,events,duration:frames.length/30};
        }finally{Audio.sfx=audio;}
      });
      const output=path.join(root,'artifacts');fs.mkdirSync(output,{recursive:true});
      for(const [name,data]of Object.entries(captures.shots))fs.writeFileSync(path.join(output,'rinse-'+name+'.png'),Buffer.from(data.split(',')[1],'base64'));
      const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'chromara-rinse-'));
      try{
        captures.frames.forEach((data,i)=>fs.writeFileSync(path.join(tmp,String(i).padStart(4,'0')+'.png'),Buffer.from(data.split(',')[1],'base64')));
        const pcm=await page.evaluate(async({events,duration,source})=>{
          const rate=32000,c=new OfflineAudioContext(2,Math.ceil(duration*rate),rate),master=c.createGain();master.gain.value=.55;master.connect(c.destination);
          const kit=new Function(source+';return SFX;')();kit.init(c,master);kit.duck=()=>{};
          for(const e of events)kit.play(e.name,{...e.o,when:e.at+.001});
          const rendered=await c.startRendering(),a=rendered.getChannelData(0),b=rendered.getChannelData(1),bytes=new Uint8Array(a.length*4),view=new DataView(bytes.buffer);let peak=0;
          for(let i=0;i<a.length;i++)for(let j=0;j<2;j++){const v=j?b[i]:a[i];if(!Number.isFinite(v)||Math.abs(v)>=1)throw new Error('Invalid audio');peak=Math.max(peak,Math.abs(v));view.setInt16((i*2+j)*2,Math.round(v*32767),true);}
          let encoded='';for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));return{data:btoa(encoded),peak};
        },{events:captures.events,duration:captures.duration,source:fs.readFileSync(path.join(root,'sfx.js'),'utf8')});
        assert(pcm.peak>.01);fs.writeFileSync(path.join(tmp,'audio.pcm'),Buffer.from(pcm.data,'base64'));
        execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-framerate','30','-i',path.join(tmp,'%04d.png'),'-f','s16le','-ar','32000','-ac','2','-i',path.join(tmp,'audio.pcm'),'-vf','scale=960:540:flags=neighbor','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',path.join(output,'rinse-animation.mp4')]);
        console.log(`PASS captured ${captures.duration.toFixed(1)}s video with synchronized sampler audio, peak ${pcm.peak.toFixed(3)}`);
      }finally{fs.rmSync(tmp,{recursive:true,force:true});}
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
