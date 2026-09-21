// Loaded only by index.html?spriteLab=1. This is an isolated art playground.
'use strict';
window.spriteLab = (() => {
  function map() {
    releaseInputs();Game.overlay=null;Game.paused=false;resetGame();
    Game.intro=false;OW.msg=null;Game.palette='vivo';setState('overworld');render();
  }
  function battle() {
    map();const foe=OW.foes.find(f=>f.key==='5')||OW.foes[0];initBattle(foe);
    B.gen=null;B.tr=null;B.phase='fight';B.fightStart=-100;setState('battle');
    B.units.forEach(u=>{u.wx=u.hx;u.wy=u.hy;u.wz=0;u.atb=0;});B.unitScale=1;B.propScale=1;
    camSet(SCENE.rest);projectUnits();B.party.forEach(u=>u.atb=100);
    Prefs.mode='wait';ATB_ACTIVE=false;openCmd(B.party[0]);render();
  }
  function inBattle(){if(Game.state!=='battle'||B.phase!=='fight'||B.currentAction||B.actQueue.length||B.actions.length)battle();}
  function reaction(pose) {
    inBattle();Game.paused=true;B.menu=null;
    B.party.forEach(u=>{u.pose=pose;u.poseT=0;u.wz=0;u.alive=pose!=='ko';u.hp=pose==='ko'?0:pose==='tired'?1:u.maxhp;u.guard=null;});
    if(pose==='tired')B.party.forEach(u=>u.pose='idle');
    // Freeze a clean pose, including HP cards and the command palette's exit.
    BUI.party=null;observeBattleFeedback();
    // A frontal camera makes faces readable, even when every actor is KO.
    const p=B.party[1],yaw=Math.atan2(B.axis.dy,B.axis.dx)+Math.PI;
    camSet({x:p.wx-Math.cos(yaw)*100,y:p.wy-Math.sin(yaw)*100,yaw,pitch:.55,h:65,f:140,hy:54,uiScale:1});
    projectUnits();render();
  }
  function attack() {
    inBattle();Game.paused=false;B.party.forEach(u=>{u.alive=true;u.hp=u.maxhp;u.pose='idle';u.atb=100;});
    B.menu=null;B.enemies.forEach(u=>{u.hp=u.maxhp;u.alive=true;});
    executeCommand(B.party[0],{type:'attack'},[B.enemies[0]]);
  }
  function sample(id,mode,dir,pose,phase) {
    if(SpriteAtlas.active){
      if(mode==='overworld'){
        const state=pose==='walk'?['contact','idle','hop','idle'][phase%4]:pose;
        return SpriteAtlas.mapFrame(id,dir,state);
      }
      const view=dir==='up'?'back':dir==='down'?'front':'side';
      let index=({idle:{front:0,side:dir==='right'?2:1,back:3}[view],blink:4,charge:5,attack:6,landing:7,
        hop:{front:8,side:9,back:10}[view],guard:11,hurt:12,tired:13,ko:14,happy:15})[pose]??0;
      const source=SpriteAtlas.frame(id,'battle',index);
      if(pose==='hop'&&dir==='right'){
        const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
        const x=c.getContext('2d');x.translate(c.width,0);x.scale(-1,1);x.drawImage(source,0,0);return c;
      }
      return source;
    }
    const p=Party.find(p=>p.id===id),view=dir==='up'?'back':dir==='down'?'front':'side';
    const eyes={blink:'blink',wide:'wide',hurt:'hurt',ko:'ko',happy:'happy',attack:'angry'}[pose]||'normal';
    const src=buildSprite(id+'_'+view+(mode==='overworld'?'_mini':''),C(p.color),null,{eyes});
    const c=document.createElement('canvas');c.width=mode==='overworld'?32:48;c.height=mode==='overworld'?28:40;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    const k=pose==='ko'?.45:pose==='hurt'?.84:1,w=src.width,h=Math.max(1,Math.round(src.height*k));
    if(dir==='right'){x.translate(c.width,0);x.scale(-1,1);}
    x.drawImage(src,Math.floor((c.width-w)/2),c.height-h,w,h);return c;
  }
  const ready=SpriteAtlas.ready.then(ok=>{
    Audio.muted=true;map();return {ok,error:SpriteAtlas.error};
  });
  return {ready,map,battle,attack,reaction,sample,
    async art(enabled){await SpriteAtlas.setEnabled(enabled);render();return SpriteAtlas.active;},
    resume(){Game.paused=false;B.party?.forEach(u=>{u.alive=true;u.hp=u.maxhp;u.pose='idle';});if(Game.state==='battle')battle();},
    get state(){return Game.state;},get active(){return SpriteAtlas.active;}
  };
})();
