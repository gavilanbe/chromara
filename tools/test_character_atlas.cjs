/* Browser checks for optional character atlases and the playable art laboratory.
   Start a local HTTP server, then node tools/test_character_atlas.cjs [base URL].
   Requires Playwright; CHROME_BIN may point to an installed Chromium browser. */
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const base=process.argv[2]||'http://127.0.0.1:8765';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
  const errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100},serviceWorkers:'block'});
    context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
    const page=await context.newPage();
    const requests=[];page.on('request',r=>requests.push(r.url()));
    await page.goto(base+'/index.html');await page.waitForFunction(()=>window.__chromara);
    assert.equal(await page.evaluate(()=>SpriteAtlas.active),false);
    assert(!requests.some(r=>r.includes('assets/characters/')));
    console.log('PASS normal startup keeps original art without loading the optional atlas');

    await page.goto(base+'/sprite-preview.html');
    await page.waitForFunction(()=>!document.getElementById('new-art').disabled);
    const frame=page.frames().find(f=>f.url().includes('spriteLab'));
    const atlas=await frame.evaluate(()=>{
      Game.paused=true;
      let count=0;const faults=[];
      for(const id of ['carmin','ambar','anil'])for(const mode of ['overworld','battle']){
        const unique=new Set(),sheet=CHARACTER_ATLAS.sheets[id][mode];
        for(let i=0;i<16;i++){
          const c=SpriteAtlas.frame(id,mode,i),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let opaque=0,clear=0;
          for(let j=3;j<p.length;j+=4){if(p[j]===255)opaque++;else if(p[j]===0)clear++;else faults.push('partial alpha');}
          if(!opaque||!clear)faults.push(id+'/'+mode+'/'+i+' empty or opaque');
          const b=sheet.frames[i].box;
          if(b.x<1||b.x+b.w>=c.width||b.y<1||b.y+b.h!==c.height)faults.push('bad bounds');
          unique.add(c.toDataURL());count++;
        }
        if(unique.size<14)faults.push(id+'/'+mode+' repeated poses');
        const ko=mode==='battle'?14:15;
        if(sheet.frames[ko].box.h>=sheet.frames[0].box.h)faults.push('KO not flattened');
      }
      return {count,faults};
    });
    assert.deepEqual(atlas,{count:96,faults:[]});
    console.log('PASS all 96 frames have binary transparency, clear margins and stable ground anchors');

    assert(await frame.evaluate(()=>['carmin','ambar','anil'].every(id=>
      ['left','right','up'].every(dir=>SpriteAtlas.mapFrame(id,dir,'blink')===SpriteAtlas.mapFrame(id,dir,'idle')))));
    console.log('PASS blinking never changes the overworld facing direction');

    const switchResult=await frame.evaluate(async()=>{
      spriteLab.battle();Game.paused=true;
      const before=JSON.stringify(B.party.map(u=>[u.id,u.hp,u.mp,u.atb,u.wx,u.wy]));
      const current=unitSpriteInfo(B.party[0],0);await spriteLab.art(false);
      const legacy=unitSpriteInfo(B.party[0],0);await spriteLab.art(true);
      return {unchanged:before===JSON.stringify(B.party.map(u=>[u.id,u.hp,u.mp,u.atb,u.wx,u.wy])),
        atlas:!!current.atlas,legacy:!!legacy.atlas,restored:unitSpriteInfo(B.party[0],0).spr===current.spr};
    });
    assert.deepEqual(switchResult,{unchanged:true,atlas:true,legacy:false,restored:true});
    console.log('PASS art comparison preserves gameplay state and cached portraits remain separate');

    const satellites=await frame.evaluate(async()=>{
      const original=drawSatellites;let calls=0;drawSatellites=()=>calls++;
      try{
        const p=Party[2],u=B.party[2];
        mapDrop(p,80,80,'down',0,false,20,2);drawUnit(u);const atlas=calls;
        await spriteLab.art(false);calls=0;mapDrop(p,80,80,'down',0,false,20,2);drawUnit(u);const legacy=calls;
        await spriteLab.art(true);return {atlas,legacy};
      }finally{drawSatellites=original;}
    });
    assert.deepEqual(satellites,{atlas:0,legacy:2});
    console.log('PASS Añil does not get duplicate satellite drops in either renderer');

    for(const pose of ['hurt','tired','ko','happy']){
      await page.locator(`[data-reaction="${pose}"]`).click();
      assert.equal(await page.locator('#pose').inputValue(),pose);
      assert(await frame.evaluate(p=>Game.paused&&B.party.every(u=>u.pose===(p==='tired'?'idle':p))&&!BUI.closing,pose));
      assert(await page.locator('#direction').isDisabled());
    }
    console.log('PASS damage, low HP, KO and victory controls show clean, synchronized poses');

    await page.locator('[data-scene="attack"]').click();
    const action=await frame.evaluate(()=>{
      Game.paused=true;let steps=0,seen=false;const before=B.enemies.reduce((s,u)=>s+u.hp,0);
      while((B.actQueue.length||B.actions.length)&&steps++<1800){updateBattle();projectUnits();render();seen=true;}
      return {seen,finished:steps<1800,damage:B.enemies.reduce((s,u)=>s+u.hp,0)<before};
    });
    assert.deepEqual(action,{seen:true,finished:true,damage:true});
    console.log('PASS the real attack animation completes and deals damage using atlas sprites');

    await page.locator('#map').click();
    await frame.evaluate(()=>{Game.paused=true;});
    const directions=await frame.evaluate(()=>{
      const bad=[];for(const dir of ['down','left','right','up'])for(const phase of [0,.25,.5]){
        OW.dir=dir;Party.forEach((p,i)=>mapDrop(p,60+i*70,100,dir,phase,true,20,i));
      }
      for(const u of B.party){for(const pose of ['idle','hop','charge','attack','hurt','ko','happy']){
        u.pose=pose;const s=unitSpriteInfo(u,1).spr;
        for(const amount of [0,.5,1])desatSprite(s,amount).getContext('2d').getImageData(0,0,1,1);
        tintSprite(s,'#ff0000',.5).getContext('2d').getImageData(0,0,1,1);
      }}return bad;
    });
    assert.deepEqual(directions,[]);
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    console.log('PASS directional rendering, color effects and the narrow-screen viewer');

    const filePage=await context.newPage();
    await filePage.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?sprites=atlas');
    await filePage.waitForFunction(()=>typeof SpriteAtlas!=='undefined'&&SpriteAtlas.active);
    assert(await filePage.evaluate(()=>{
      const c=SpriteAtlas.frame('anil','battle',0);return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v);
    }));
    console.log('PASS embedded atlases load directly from file:// and leave the canvas readable');
    assert.deepEqual(errors,[]);console.log('9 character atlas checks passed; no browser errors.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
