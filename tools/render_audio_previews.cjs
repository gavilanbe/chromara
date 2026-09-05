/* Audition exports made from the actual game sampler and published masters.
   Start the HTTP server and run with the same Playwright setup as test_audio.cjs. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const E = (at, name, options = {}) => ({at, name, options});
const groups = [
 [0, 'Cuaderno: pasar página, cursor, confirmar', [E(0,'page'),E(.5,'cursor'),E(.75,'cursor',{semi:4}),E(1,'confirm')]],
 [3, 'Carmín: cerdas, brocha y pintura espesa', [E(0,'charge',{semi:0}),E(.3,'brush_big'),E(.7,'splat_big'),E(.7,'hit')]],
 [6, 'Ámbar: dos cortes de grafito', [E(0,'charge',{semi:4}),E(.25,'scratch'),E(.58,'scratch_long'),E(.85,'hitweak')]],
 [9, 'Añil: pincel y agua', [E(0,'charge',{semi:7}),E(.3,'brush_hiss'),E(.55,'splash_clean'),E(.62,'hit')]],
 [12, 'Golpe resistido; goma y virutas', [E(0,'resist'),E(.5,'rub'),E(.65,'rub'),E(.8,'crumbs')]],
 [15, 'La tinta se disuelve; el pigmento vuelve', [E(0,'die'),E(.95,'splash_clean',{vol:.6}),E(1.03,'pigment_return',{vol:.8})]],
 [19, 'Llamarada: Carmín y Ámbar', [E(0,'mix',{colours:[0,4]}),E(.4,'fwoom'),E(.55,'crackle'),E(.6,'impact_sub',{vol:.6})]],
 [23, 'Brote: Ámbar y Añil', [E(0,'mix',{colours:[4,7]}),E(.4,'grow'),E(.6,'leaves'),E(.9,'heal_bells')]],
 [27, 'Eclipse: Carmín y Añil', [E(0,'mix',{colours:[0,7]}),E(.45,'hum_down'),E(1.1,'impact_sub'),E(1.12,'glass')]],
 [31, 'Arcoíris: las tres voces', [E(0,'charge',{semi:0}),E(.1,'charge',{semi:4}),E(.2,'charge',{semi:7}),E(.6,'mix'),E(1,'rainbow'),E(1.4,'saturate')]],
 [36, 'Enemigo: aviso, embestida y golpe de tinta', [E(0,'enemy_soon'),E(.6,'lunge'),E(.95,'ink_hit')]],
 [39, 'Tinta proyectada; impacto sobre papel', [E(0,'ink_jet'),E(.5,'ink_hit'),E(.8,'ink_jet'),E(1.3,'ink_hit')]],
 [43, 'La Tinta: carga y Marea negra', [E(0,'hum_down',{vol:.6}),E(.7,'impact_sub',{vol:.4}),E(1.1,'ink_tide'),E(1.15,'ink_hit')]],
 [48, 'La Pluma: descubrimiento', [E(0,'discovery')]],
];
const excerpts = [
 ['title',0,8,'La promesa: faltaba el salto; aparecen los tres colores'],
 ['map',9.6,9.6,'El papel gris: Re–Fa–Mi–La'],
 ['battle',0,12,'El mismo gesto convertido en impulso'],
 ['boss',6.666667,8,'La Tinta: La–Fa–Mi♭–Re'],
 ['restored',9.6,9.6,'El mapa recuperado: Re–Fa♯–Mi–La'],
 ['victory',0,7.7,'La resolución'],
];
const ffmpeg = (...args) => execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',...args]);
(async()=>{
 const browser = await chromium.launch({...(process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN}:{}),headless:true});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'chromara-preview-'));
 try {
  const page=await browser.newPage();await page.goto(process.argv[2]||'http://127.0.0.1:8765');
  await page.waitForFunction(()=>window.__chromara);await page.evaluate(()=>__chromara.pause(true));
  const pcm=await page.evaluate(async({groups,source})=>{
   const rate=32000, context=new OfflineAudioContext(2,52*rate,rate), master=context.createGain();
   master.gain.value=.55;master.connect(context.destination);
   const kit=new Function(source+';return SFX;')();kit.init(context,master);kit.duck=()=>{};
   for(const [at,label,events] of groups) for(const e of events) kit.play(e.name,{...e.options,when:at+e.at});
   const out=await context.startRendering(), channels=[out.getChannelData(0),out.getChannelData(1)];
   const bytes=new Uint8Array(out.length*4), view=new DataView(bytes.buffer);let peak=0;
   for(let i=0;i<out.length;i++)for(let c=0;c<2;c++){
    const value=channels[c][i];peak=Math.max(peak,Math.abs(value));
    if(!Number.isFinite(value)||Math.abs(value)>=1) throw new Error('Invalid audition render');
    view.setInt16((i*2+c)*2,Math.round(value*32767),true);
   }
   let encoded='';for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {data:btoa(encoded),peak};
  },{groups,source:fs.readFileSync(path.join(root,'sfx.js'),'utf8')});
  const raw=path.join(tmp,'sfx.pcm');fs.writeFileSync(raw,Buffer.from(pcm.data,'base64'));
  ffmpeg('-f','s16le','-ar','32000','-ac','2','-i',raw,'-c:a','libmp3lame','-q:a','3',path.join(root,'music/sfx-demo.mp3'));
  const segments=[],cueSheet=[];let start=0;
  for(const [name,offset,duration,meaning] of excerpts){
   const segment=path.join(tmp,name+'.wav');
   ffmpeg('-ss',String(offset),'-t',String(duration),'-i',path.join(root,'music',name+'.mp3'),
    '-af',`afade=t=in:d=0.012,afade=t=out:st=${duration-.16}:d=0.16,apad=pad_dur=0.7`,'-ar','48000','-ac','2',segment);
   segments.push(segment);cueSheet.push({at:Number(start.toFixed(2)),name,meaning,sourceStart:offset,duration});start+=duration+.7;
  }
  const list=path.join(tmp,'list.txt');fs.writeFileSync(list,segments.map(s=>`file '${s.replace(/'/g,"'\\''")}'`).join('\n'));
  ffmpeg('-f','concat','-safe','0','-i',list,'-c:a','libmp3lame','-q:a','3',path.join(root,'music/leitmotif-demo.mp3'));
  fs.writeFileSync(path.join(root,'music/score/preview-cues.json'),JSON.stringify({
   leitmotif:cueSheet,sfx:groups.map(([at,title,events])=>({at,title,events})),sfxPeak:pcm.peak,
   note:'Extractos y efectos del juego; no son dos composiciones nuevas. SFX sin música, con los niveles del bus del juego.'
  },null,2)+'\n');
  console.log('Created leitmotif-demo.mp3 and sfx-demo.mp3. SFX peak:',pcm.peak.toFixed(4));
 } finally {await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
