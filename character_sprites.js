// Optional image-based character art. Normal play keeps the original sprites.
// Enable with ?sprites=atlas; the laboratory can switch art without resetting play.
'use strict';
const SpriteAtlas = (() => {
  const requested = new URLSearchParams(location.search).get('sprites') === 'atlas';
  const base = new URL('.', document.currentScript.src);
  const images = new Map(), frames = new Map(), portraits = new Map();
  let enabled = requested, loaded = false, loading = null, error = null;
  const active = () => enabled && loaded;
  function load() {
    if (loading) return loading;
    loading = (async () => {
      if (!window.CHARACTER_ATLAS) await new Promise((resolve,reject) => {
        const script=document.createElement('script');
        script.src=new URL('assets/characters/atlas.js',base).href;
        script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar el atlas de personajes.'));
        document.head.appendChild(script);
      });
      await Promise.all(Object.entries(window.CHARACTER_ATLAS.sheets).flatMap(([id,modes]) => Object.entries(modes).map(async([mode,data]) => {
        const image=new Image();
        await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('No se pudo leer '+id+'/'+mode));image.src=data.image;});
        images.set(id+'/'+mode,image);
      })));
      loaded=true;return true;
    })().catch(e=>{error=e.message;enabled=false;return false;});
    return loading;
  }
  function frame(id,mode,index) {
    if (!active() || !images.has(id+'/'+mode)) return null;
    const key=`atlas:1:${id}:${mode}:${index}`;
    if(frames.has(key))return frames.get(key);
    const sheet=window.CHARACTER_ATLAS.sheets[id][mode],[w,h]=sheet.cell;
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    x.drawImage(images.get(id+'/'+mode),(index%4)*w,(index>>2)*h,w,h,0,0,w,h);
    c.__key=key;c.__atlas=true;frames.set(key,c);return c;
  }
  function mapFrame(id,dir,state='idle') {
    const column={down:0,left:1,right:2,up:3}[dir]??0;
    // Only the front has a blink drawing; never turn a resting back toward us.
    if(state==='blink' && dir!=='down')state='idle';
    const index={blink:12,wide:13,hurt:14,ko:15}[state] ?? column+({contact:4,hop:8}[state]||0);
    return frame(id,'overworld',index);
  }
  function battle(u,animationFrame,view) {
    if(!active() || u.kind!=='party')return null;
    const pose=u.pose||'idle',v={front:0,side:1,back:3}[view]??3;
    let index=({charge:5,attack:6,hurt:12,ko:14,happy:15})[pose];
    if(pose==='hop')index={front:8,side:9,back:10}[view]??10;
    if(index===undefined){
      index=v;
      if(u.guard?.charges)index=11;
      else if(view==='front' && u.hp<u.maxhp*.25)index=13;
      else if(view==='front' && ((B.t+u.idx*37)%160)<6)index=4;
    }
    const spr=frame(u.id,'battle',index);if(!spr)return null;
    // Deformed action/KO silhouettes are already drawn in the atlas.
    const [sx,sy]=pose==='idle' ? SQ.idle[animationFrame%4] : [1,1];
    return {spr,sx,sy,atlas:true,index};
  }
  function staticSprite(name,eyes='normal') {
    if(!active())return null;
    const match=/^(carmin|ambar|anil)_(front|back|side|title)(_mini)?$/.exec(name);
    if(!match || !SPRITES[name])return null;
    const [,id,view,mini]=match,mode=mini?'overworld':'battle';
    let index={front:0,title:0,side:1,back:3}[view],sourceMode=mode;
    const expressions=mini ? {blink:12,wide:13,hurt:14,ko:15} : {blink:4,hurt:12,ko:14,happy:15,angry:6};
    if(expressions[eyes]!==undefined && !(eyes==='blink' && (view==='back'||view==='side')))index=expressions[eyes];
    if(eyes==='happy'&&mini){sourceMode='battle';index=15;}
    if(eyes==='wide'&&!mini){sourceMode='overworld';index=13;}
    const key=`atlas:static:${name}:${eyes}`;
    if(portraits.has(key))return portraits.get(key);
    const source=frame(id,sourceMode,index);if(!source)return null;
    const box=window.CHARACTER_ATLAS.sheets[id][sourceMode].frames[index].box;
    const def=SPRITES[name],w=Math.max(...def.rows.map(r=>r.length)),h=def.rows.length;
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    // Preserve the existing portrait/field sprite bounds, including UI clipping.
    const scale=Math.min((w-2)/box.w,(h-1)/box.h),dw=Math.max(1,Math.round(box.w*scale)),dh=Math.max(1,Math.round(box.h*scale));
    x.drawImage(source,box.x,box.y,box.w,box.h,Math.floor((w-dw)/2),h-dh,dw,dh);
    c.__key=key;c.__atlas=true;portraits.set(key,c);return c;
  }
  return {get active(){return active();},get enabled(){return enabled;},get error(){return error;},
    get ready(){return load();},frame,mapFrame,battle,staticSprite,
    async setEnabled(value){enabled=!!value;if(enabled)await load();return active();},
    start(){if(requested)load();}
  };
})();
SpriteAtlas.start();
