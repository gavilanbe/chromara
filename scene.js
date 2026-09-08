// CHROMARA — scene.js: escena de batalla estilo Golden Sun.
// Suelo "Mode 7" con la textura del propio mapa cenital, cámara con guiñada/cabeceo/altura y proyección de sprites en coordenadas de mundo.
'use strict';
const SCENE = {
  cam: { x: 0, y: 0, yaw: 0, pitch: 0.62, h: 70, f: 150, hy: 62, cx: 160, uiScale: 1 },
  goal: null, ease: .14, shake: 0, // goal = destino de la cámara (tween), shake en px
  img: null, texCache: {}, fog: null,
};
// Textura cenital del mapa (por paleta): todo el mapa + margen de "vacío" oscuro
function sceneTexture(pal) {
  if (SCENE.texCache[pal]) return SCENE.texCache[pal];
  const tw = MAP.w * TILE, th = MAP.h * TILE, c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d');
  for (let ty = 0; ty < MAP.h; ty++) for (let tx = 0; tx < MAP.w; tx++) x.drawImage(groundTile(tx, ty, pal, 0), tx * TILE, ty * TILE);
  drawWorldGround(x, 0, 0, pal, tw, th);
  const d = x.getImageData(0, 0, tw, th);
  return SCENE.texCache[pal] = { data: d.data, w: tw, h: th };
}
// Utensilios a escala de batalla: pincel o lápiz clavado (34×48) y goma de borrar (26×18)
function bigTree(pal, vr) {
  return cached(`bigtree|${pal}|${vr}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 34; c.height = 48; const x = c.getContext('2d');
    const tint = ramp(worldPigment(TREE_COLS[vr % 6], pal)), pencil = vr % 3 === 2;
    if (pencil) {
      const body = tint ? tint.base : p.rock2, bodyHi = tint ? tint.hi : p.rock3, bodyDk = tint ? tint.sh : p.rockOut;
      px(x, '#14121c', 15, 0, 4, 4); px(x, p.wood2, 13, 4, 8, 2); px(x, p.wood, 11, 6, 12, 4); px(x, p.wood3, 12, 6, 4, 2); px(x, p.wood2, 11, 9, 2, 1); px(x, p.wood2, 21, 9, 2, 1);
      px(x, '#2a2438', 9, 10, 16, 34); px(x, body, 10, 10, 14, 32); px(x, bodyHi, 10, 10, 4, 32); px(x, bodyDk, 20, 10, 4, 32); px(x, bodyHi, 12, 12, 1, 28); px(x, bodyDk, 19, 11, 1, 30);
      px(x, p.ferrule, 10, 38, 14, 4); px(x, p.ferruleHi, 10, 38, 14, 1); px(x, p.ferrule2, 10, 41, 14, 1); px(x, '#2a2438', 9, 42, 16, 6); px(x, '#e89aa8', 10, 42, 14, 5); px(x, '#f4c0c8', 10, 42, 14, 1); px(x, '#b86a7c', 10, 46, 14, 1);
      return c;
    }
    const brush = tint ? tint : { base: p.bristle, hi: p.bristleHi, sh: p.bristle2, dk: p.tip, out: '#2a2438' };
    px(x, '#2a2438', 12, 26, 10, 22); px(x, p.wood2, 13, 26, 8, 22); px(x, p.wood, 13, 26, 5, 20); px(x, p.wood3, 14, 28, 2, 16); px(x, p.wood2, 12, 47, 10, 1);
    px(x, p.ferrule2, 10, 22, 14, 5); px(x, p.ferrule, 11, 22, 12, 4); px(x, p.ferruleHi, 11, 22, 12, 1); px(x, p.ferrule2, 14, 23, 1, 3); px(x, p.ferrule2, 19, 23, 1, 3);
    const ph1 = vr * 1.3, ph2 = vr * 2.1, cx = 17, cy = 12, rx = 15, ry = 11.5;
    const ell = (X, Y) => { const u = (X + .5 - cx) / rx, w = (Y + .5 - cy) / ry; return u * u + w * w <= 1 + 0.08 * Math.sin(X * 1.1 + ph1) * Math.sin(Y * .9 + ph2); };
    for (let Y = 0; Y < 25; Y++) for (let X = 0; X < 34; X++) {
      if (!ell(X, Y)) continue;
      if (!ell(X - 1, Y) || !ell(X + 1, Y) || !ell(X, Y - 1) || !ell(X, Y + 1)) { px(x, brush.out, X, Y); continue; }
      const streak = (X + vr) % 4 === 0 || (X + vr) % 4 === 1;
      px(x, Y < 5 ? brush.hi : Y > 19 ? brush.dk : streak ? brush.sh : brush.base, X, Y);
    }
    px(x, '#ffffff', 12, 4, 4, 1); px(x, brush.hi, 11, 5, 1, 2);
    return c;
  });
}
function bigRock(pal, vr) { // goma de borrar bicolor con funda
  return cached(`bigrock|${pal}|${vr}`, () => {
    const p = PAL[pal], c = document.createElement('canvas'); c.width = 26; c.height = 18; const x = c.getContext('2d');
    px(x, p.rockOut, 1, 3, 24, 14); px(x, p.eraser, 2, 4, 14, 12); px(x, p.eraserHi, 2, 4, 14, 2); px(x, p.eraserHi, 2, 4, 2, 10); px(x, p.eraser2, 2, 14, 14, 2); px(x, p.eraser2, 14, 6, 2, 10);
    px(x, p.ferrule, 16, 4, 8, 12); px(x, p.ferruleHi, 16, 4, 8, 2); px(x, p.ferrule2, 16, 14, 8, 2); px(x, p.ferrule2, 22, 6, 2, 8); px(x, p.rockOut, 15, 4, 1, 12); px(x, p.rulerInk, 18, 8, 4, 1); px(x, p.rulerInk, 18, 10, 3, 1);
    return c;
  });
}
function camBasis(cam) { const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); return { Fx: cy, Fy: sy, Rx: -sy, Ry: cy, cP: Math.cos(cam.pitch), sP: Math.sin(cam.pitch) }; }
// Proyección de un punto de mundo (wx, wy, wz=altura) → [sx, sy, escala, z]
function project(wx, wy, wz = 0, cam = SCENE.cam) {
  const b = camBasis(cam), rx = wx - cam.x, ry = wy - cam.y, fwd = rx * b.Fx + ry * b.Fy, lat = rx * b.Rx + ry * b.Ry;
  const z = fwd * b.cP + (cam.h - wz) * b.sP, yc = (cam.h - wz) * b.cP - fwd * b.sP;
  if (z < 4) return null;
  const k = cam.f / z;
  return [(cam.cx ?? W / 2) + lat * k, cam.hy + yc * k, clamp(Math.pow(110 / z, .55), .7, 1.8) * (cam.uiScale ?? 1), z];
}
// Suelo: por cada fila, un rayo; por cada columna, un punto de la textura (nearest). Niebla hacia el horizonte.
function drawFloor(pal, skyCol, fogCol) {
  const cam = SCENE.cam, tex = sceneTexture(pal), b = camBasis(cam);
  if (!SCENE.img) SCENE.img = g.createImageData(W, H);
  const d = SCENE.img.data, td = tex.data, tw = tex.w, th = tex.h;
  const [fr, fg, fb] = hexRgb(fogCol);
  const fogZ0 = 150, fogZ1 = 520;
  for (let sy = 0; sy < H; sy++) {
    const dy = (sy - cam.hy) / cam.f, down = dy * b.cP + b.sP, row = sy * W * 4;
    if (down <= 0.004) { for (let sx = 0; sx < W; sx++) { const i = row + sx * 4; d[i + 3] = 0; } continue; } // cielo: transparente (se pinta debajo)
    const t = cam.h / down, fwd = (b.cP - dy * b.sP) * t, ox = cam.x + fwd * b.Fx, oy = cam.y + fwd * b.Fy, stepX = t / cam.f * b.Rx, stepY = t / cam.f * b.Ry;
    const fog = clamp((t - fogZ0) / (fogZ1 - fogZ0), 0, .85), inv = 1 - fog;
    let wx = ox - (cam.cx ?? W / 2) * stepX, wy = oy - (cam.cx ?? W / 2) * stepY;
    for (let sx = 0; sx < W; sx++, wx += stepX, wy += stepY) {
      const i = row + sx * 4; let r, gg, bb;
      let tx = wx | 0, ty = wy | 0; // fuera del mapa: se repite el borde (anillo de árboles), nunca vacío
      if (tx < 0) tx = 0; else if (tx >= tw) tx = tw - 1; if (ty < 0) ty = 0; else if (ty >= th) ty = th - 1;
      const j = (ty * tw + tx) * 4; r = td[j]; gg = td[j + 1]; bb = td[j + 2];
      d[i] = r * inv + fr * fog; d[i + 1] = gg * inv + fg * fog; d[i + 2] = bb * inv + fb * fog; d[i + 3] = 255;
    }
  }
  g.fillStyle = skyCol; g.fillRect(0, 0, W, H);
  g.putImageData(SCENE.img, 0, 0); // las filas de cielo son transparentes: putImageData las pisa; repintamos el cielo encima de lo transparente
}
// Cielo y horizonte: bandas de color, silueta lejana de árboles y un sol/luna de pintura
function drawSky(pal) {
  const cam = SCENE.cam, gris = pal === 'gris', hz = Math.round(cam.hy - cam.f * Math.tan(cam.pitch));
  const bands = gris ? ['#3a3d55', '#4a4f6a', '#5f6680', '#767c96'] : ['#2f6fc4', '#3a8fe0', '#62b0f2', '#9ed0f6'];
  const top = Math.min(hz, H); bands.forEach((c, i) => { g.fillStyle = c; const y0 = Math.round(top * i / bands.length); g.fillRect(0, y0, W, Math.round(top * (i + 1) / bands.length) - y0 + 1); });
  // sol de pintura (gris: disco pálido; vivo: amarillo con brillo)
  g.fillStyle = gris ? '#8b91a8' : '#f2c93a'; g.beginPath(); g.arc(250 - cam.yaw * 40, Math.max(8, top - 30), 9, 0, 6.29); g.fill(); if (!gris) { g.fillStyle = '#fbe28a'; g.fillRect(246 - cam.yaw * 40 | 0, Math.max(8, top - 30) - 4, 3, 2); }
  // silueta de bosque lejano que gira con la cámara
  const sil = gris ? '#4a5449' : '#2a6f3a', sil2 = gris ? '#3f4840' : '#215a2e';
  for (let x = -20; x < W + 20; x += 9) { const ph = (x + cam.yaw * 120) * .11; const hh = 6 + Math.abs(Math.sin(ph * 1.7) * 6 + Math.sin(ph * .6) * 4); g.fillStyle = sil; g.fillRect(x, top - hh, 9, hh + 2); g.fillStyle = sil2; g.fillRect(x + 4, top - hh + 3, 5, hh); }
}
// Cámara: pose de reposo calculada para que el grupo quede abajo-derecha y los enemigos arriba-izquierda
function camRest(pc, ec) {
  const dx = ec[0] - pc[0], dy = ec[1] - pc[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const yaw = Math.atan2(uy, ux) + 0.7; // giro para la diagonal
  const cx = (pc[0] + ec[0]) / 2, cy = (pc[1] + ec[1]) / 2;
  const back = 128; return { x: cx - Math.cos(yaw) * back - Math.sin(yaw) * 12, y: cy - Math.sin(yaw) * back + Math.cos(yaw) * 12, yaw, pitch: 0.6, h: 86, f: 180, hy: 66 };
}
// A shot has a world-space pivot. Interpolating pivot, radius and yaw makes a
// real orbit; interpolating camera X/Y alone would cut across the arena.
function camGo(goal, ease = .14) {
  SCENE.menuMove=null;
  SCENE.goal={...SCENE.cam,cx:W/2,uiScale:1,...goal};SCENE.ease=ease;
  if(goal.pivot){
    if(!SCENE.orbit){const c=SCENE.cam,d=Math.hypot(goal.pivot.x-c.x,goal.pivot.y-c.y);SCENE.orbit={x:c.x+Math.cos(c.yaw)*d,y:c.y+Math.sin(c.yaw)*d,dist:d};}
    SCENE.orbitGoal=goal.pivot;
  }else{SCENE.orbit=null;SCENE.orbitGoal=null;}
}
function camSet(pose) { Object.assign(SCENE.cam,{cx:W/2,uiScale:1},pose);SCENE.goal=null;SCENE.menuMove=null;SCENE.orbit=SCENE.orbitGoal=null; }
// Menu shots arrive gently, then hold. Duration is independent of battle speed;
// navigating again starts from the current pose, without a jump or an input lock.
function camMenuTravel(pose, duration=46) {
  camGo(pose);
  SCENE.menuMove={from:{...SCENE.cam},pivot:SCENE.orbit?{...SCENE.orbit}:null,t:0,duration};
}
function camTick() {
  if(B.currentAction)updateActionCamera();
  const c=SCENE.cam,gl=SCENE.goal;if(!gl)return;
  const move=SCENE.menuMove;
  if(move){
    move.t=Math.min(move.duration,move.t+1/Prefs.speed);
    const t=move.t/move.duration,k=t*t*t*(t*(t*6-15)+10),from=move.from;
    for(const key of ['pitch','h','f','hy','cx','uiScale'])c[key]=lerp(from[key],gl[key],k);
    const angle=Math.atan2(Math.sin(gl.yaw-from.yaw),Math.cos(gl.yaw-from.yaw));c.yaw=from.yaw+angle*k;
    if(move.pivot&&SCENE.orbitGoal){
      const p=SCENE.orbit;for(const key of ['x','y','dist'])p[key]=lerp(move.pivot[key],SCENE.orbitGoal[key],k);
      c.x=p.x-Math.cos(c.yaw)*p.dist;c.y=p.y-Math.sin(c.yaw)*p.dist;
    }else{c.x=lerp(from.x,gl.x,k);c.y=lerp(from.y,gl.y,k);}
    if(t===1)SCENE.menuMove=null;
    return;
  }
  for(const k of ['pitch','h','f','hy','cx','uiScale'])c[k]=lerp(c[k],gl[k],SCENE.ease);
  const d=Math.atan2(Math.sin(gl.yaw-c.yaw),Math.cos(gl.yaw-c.yaw));c.yaw+=d*SCENE.ease;
  if(SCENE.orbitGoal){
    const p=SCENE.orbit,q=SCENE.orbitGoal;
    for(const k of ['x','y','dist'])p[k]=lerp(p[k],q[k],SCENE.ease);
    c.x=p.x-Math.cos(c.yaw)*p.dist;c.y=p.y-Math.sin(c.yaw)*p.dist;
  }else{c.x=lerp(c.x,gl.x,SCENE.ease);c.y=lerp(c.y,gl.y,SCENE.ease);}
}
function cameraBounds(u,cam,home=false) {
  const p=project(home?u.hx:u.wx,home?u.hy:u.wy,home?0:u.wz,cam);if(!p)return null;
  const sc=p[2]*(u.kind==='enemy'?(u.boss?1.35:1.6):1);
  return [p[0]-u.def.w*sc*.58-5,p[1]-u.def.h*sc*1.12-5,p[0]+u.def.w*sc*.58+5,p[1]+7];
}
function fitCameraSubjects(subjects,o={}) {
  const units=[...new Set(subjects)].filter(Boolean);if(!units.length)return {...SCENE.rest};
  const center=units.reduce((p,u)=>[p[0]+(o.home?u.hx:u.wx)/units.length,p[1]+(o.home?u.hy:u.wy)/units.length],[0,0]);
  const yaw=o.yaw??SCENE.rest.yaw,dist=o.dist??78;
  const c={x:center[0]-Math.cos(yaw)*dist,y:center[1]-Math.sin(yaw)*dist,yaw,pitch:o.pitch??.55,h:o.h??49,f:o.f??178,hy:80,cx:160,uiScale:o.zoom??1.18};
  const rects=units.map(u=>cameraBounds(u,c,o.home)).filter(Boolean);
  for(const point of o.points||[]){const p=project(point[0],point[1],point[2],c);if(p){const r=(point[3]||0)*p[2];rects.push([p[0]-r,p[1]-r,p[0]+r,p[1]+r]);}}
  const bounds=[Math.min(...rects.map(r=>r[0])),Math.min(...rects.map(r=>r[1]))-(o.headroom??12),Math.max(...rects.map(r=>r[2])),Math.max(...rects.map(r=>r[3]))];
  const box=o.box||[15,34,305,139],scale=Math.min(1,(box[2]-box[0])/(bounds[2]-bounds[0]),(box[3]-box[1])/(bounds[3]-bounds[1]));
  c.f*=scale;c.uiScale*=scale;
  c.cx=(box[0]+box[2])/2-((bounds[0]+bounds[2])/2-160)*scale;
  c.hy=(box[1]+box[3])/2-((bounds[1]+bounds[3])/2-80)*scale;
  c.pivot={x:center[0],y:center[1],dist};return c;
}
function cameraPartyYaw() { return Math.atan2(B.axis.dy,B.axis.dx)+2.45; }
function actionHeadroom(a) { return a.command.type==='item'?(a.command.item==='tubo'?60:a.command.item==='gota_agua'?50:20):12; }
function cameraShowsUnit(u) {
  // Every member of the target team belongs to the shot. Resolve overlaps by
  // depth; only unrelated foreground units are kept out of the HUD.
  const b=cameraBounds(u,SCENE.cam);
  if(!b)return false;
  const m=B.menu,subjects=B.currentAction?SCENE.shot?.subjects:menuCameraSubjects(m)||(m?.level==='target'?validTargets(m.pending,m.unit):null);
  if(!subjects||subjects.includes(u))return true;
  return b[0]>=2&&b[1]>=30&&b[2]<=318&&b[3]<=144;
}
function beginActionCamera(action) {
  const command=action.command,ally=action.targets[0]?.kind==='party';
  action.support=command.type!=='enemy'&&ally;
  SCENE.shot=null;
  if(Prefs.camera==='fija'){camGo(menuCameraPose(null),.16);return;}
  setActionShot(action.support?'target':'source',action.support?action.targets:action.users,{headroom:actionHeadroom(action)});
}
function setActionShot(phase,subjects,o={}) {
  const a=B.currentAction;if(!a||Prefs.camera==='fija')return;
  const old=SCENE.shot,party=subjects.every(u=>u.kind==='party');
  // Incoming attacks and healing look at the team's faces, from the enemy side.
  const base=a.basicEnemy||party&&(a.support||a.command.type==='enemy'||phase==='target')?cameraPartyYaw():SCENE.rest.yaw;
  const turn=(o.turn??0)*(a.basicEnemy?.2:Prefs.camera==='suave'?.65:1);
  SCENE.shot={action:a,phase,subjects:[...subjects],at:B.t,baseYaw:base+turn,options:o,impactAt:-999,
    direction:(B.stats.actions%2?1:-1)*(party?-1:1),held:false};
  if(old?.action===a&&old.phase===phase)SCENE.shot.direction=old.direction;
}
function updateActionCamera() {
  const a=B.currentAction,shot=SCENE.shot;if(!shot||shot.action!==a||Prefs.camera==='fija')return;
  let subjects=shot.subjects;
  if(shot.phase==='target'&&!a.support){
    // Only a nearby attacking body shares the receiving shot. The distant side
    // does not force a wide shot while a projectile or a tool crosses the frame.
    const nearby=a.users.filter(u=>subjects.some(t=>Math.hypot(u.wx-t.wx,u.wy-t.wy)<52));
    subjects=[...new Set([...subjects,...nearby])];
  }
  const t=clamp((B.t-shot.at)/64,0,1),ease=t*t*(3-2*t);
  const orbit=(Prefs.camera==='cinema'?.48:.24)*(a.basicEnemy?.2:a.support?.65:1);
  const yaw=shot.baseYaw+shot.direction*orbit*ease;
  const impact=clamp((B.t-shot.impactAt)/22,0,1),push=Prefs.shake&&!a.basicEnemy?Math.sin(impact*Math.PI)*.045:0;
  const o=shot.options,large=a.tier>=2;
  const pose=fitCameraSubjects(subjects,{...o,yaw,dist:clamp(o.dist??(a.support?78:82),65,large?125:98),h:o.h??49,
    zoom:(large?1.12:a.basicEnemy?1.18:1.25)+push,headroom:o.headroom??actionHeadroom(a)});
  camGo(pose,o.ease??.17);
}
function cameraImpact(target) {
  const a=B.currentAction,shot=SCENE.shot;if(!a||!shot||shot.action!==a)return;
  // Incidental healing/splash reactions never steal the main action's shot.
  if(!a.targets.includes(target)&&!(a.command.type==='enemy'&&target.kind==='party'&&!a.users[0].intent?.all))return;
  if(shot.phase==='source')setActionShot('target',a.targets,{headroom:12});
  if(a.command.type==='enemy'&&a.targets.length===1&&target!==a.targets[0]){
    a.targets=[target];setActionShot('target',[target],{headroom:12});
  }
  if(SCENE.shot.impactAt<0)SCENE.shot.impactAt=B.t;
}
// Existing choreographies request shots at meaningful beats. The director binds
// those requests to bodies, so it follows their movement rather than empty ground.
function camFocus(wx,wy,o={}) {
  if(Prefs.camera==='fija'){if(!B.currentAction)camReset(.1);return;}
  const a=B.currentAction;
  if(a){
    const near=arr=>arr.length?Math.hypot(wx-centroid(arr)[0],wy-centroid(arr)[1]):Infinity;
    const source=near(a.users)<near(a.targets);
    let phase=a.support?'target':source?'source':'target',subjects=phase==='source'?a.users:a.targets;
    if(o.subjects){subjects=o.subjects;phase=subjects.some(u=>a.targets.includes(u))?'target':'source';}
    setActionShot(phase,subjects,{...o,headroom:o.headroom??actionHeadroom(a)});return;
  }
  const yaw=SCENE.rest.yaw+(o.turn??0)*(Prefs.camera==='suave'?.6:1),dist=o.dist??80;
  camGo({x:wx-Math.cos(yaw)*dist,y:wy-Math.sin(yaw)*dist,yaw,pitch:o.pitch??.58,h:o.h??46,f:o.f??170,hy:o.hy??70,pivot:{x:wx,y:wy,dist}},o.ease??.12);
}
function camReset(ease=.1) {
  if(B.currentAction&&SCENE.shot){SCENE.shot.held=true;return;}
  SCENE.shot=null;
  // Let the next decision choose the return shot in the same update. Resetting
  // here used to insert a wide view between an action and the next palette.
  if(B.phase==='fight'){B.viewKey=null;return;}else camGo(SCENE.rest,ease);
}
