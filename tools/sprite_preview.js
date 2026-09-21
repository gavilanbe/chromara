'use strict';
const $=id=>document.getElementById(id),game=$('game');let lab=null,phase=0,lastPhase=0;
const choices={overworld:[['walk','Caminar'],['idle','Reposo'],['contact','Apoyo'],['hop','Salto'],['blink','Parpadeo'],['wide','Sobresalto'],['hurt','Daño'],['ko','KO']],
  battle:[['idle','Reposo'],['blink','Parpadeo'],['charge','Carga'],['attack','Ataque'],['landing','Aterrizaje'],['hop','Salto'],['guard','Defensa'],['hurt','Daño'],['tired','Cansancio'],['ko','KO'],['happy','Victoria']]};
function directions(){
  const mode=$('mode').value,pose=$('pose').value;
  const fixed=mode==='overworld'?['blink','wide','hurt','ko'].includes(pose):!['idle','hop'].includes(pose);
  $('direction').disabled=fixed;
  if(fixed)$('direction').value=['charge','attack','landing'].includes(pose)?'left':'down';
  $('direction-note').textContent=fixed?'Esta reacción tiene una vista fija.':mode==='battle'&&pose==='hop'?'El salto derecho refleja el perfil izquierdo.':'Cuatro vistas disponibles.';
}
function poses(){ $('pose').replaceChildren(...choices[$('mode').value].map(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o;}));directions(); }
poses();$('mode').addEventListener('change',poses);$('pose').addEventListener('change',directions);
function selected(mode){$('map').setAttribute('aria-pressed',mode==='map');$('battle').setAttribute('aria-pressed',mode==='battle');}
async function art(enabled){
  if(!lab)return;
  const result=await lab.art(enabled);$('new-art').setAttribute('aria-pressed',result);$('old-art').setAttribute('aria-pressed',!result);
  $('status').textContent=result?'Nuevos sprites · transparencia y animaciones activas':'Sprites actuales · comparación en la misma escena';
}
$('new-art').onclick=()=>art(true);$('old-art').onclick=()=>art(false);
$('map').onclick=()=>{lab.map();selected('map');game.focus();};
$('battle').onclick=()=>{lab.battle();selected('battle');game.focus();};
$('resume').onclick=()=>{lab.resume();game.focus();};
document.querySelectorAll('[data-reaction]').forEach(b=>b.onclick=()=>{lab.reaction(b.dataset.reaction);selected('battle');$('mode').value='battle';poses();$('pose').value=b.dataset.reaction;directions();});
document.querySelector('[data-scene="attack"]').onclick=()=>{lab.attack();selected('battle');game.focus();};
game.addEventListener('load',async()=>{
  try{
    lab=game.contentWindow.spriteLab;if(!lab)throw Error('No se pudo abrir la prueba.');
    const result=await lab.ready;if(!result.ok)throw Error(result.error);
    document.querySelectorAll('button').forEach(b=>b.disabled=false);await art(true);
  }catch(e){$('status').textContent=e.message;lab=null;$('file-help').style.display='block';}
});
function draw(ts){
  requestAnimationFrame(draw);if(!lab)return;
  if(ts-lastPhase>=150){phase=(phase+1)%4;lastPhase=ts;}
  for(const id of ['carmin','ambar','anil']){
    const canvas=$(id),x=canvas.getContext('2d');x.clearRect(0,0,canvas.width,canvas.height);x.imageSmoothingEnabled=false;
    const src=lab.sample(id,$('mode').value,$('direction').value,$('pose').value,phase);if(!src)continue;
    const scale=3,hop=$('pose').value==='walk'&&phase===2?4:0;
    x.drawImage(src,Math.floor((canvas.width-src.width*scale)/2),canvas.height-src.height*scale-8-hop,src.width*scale,src.height*scale);
  }
}
requestAnimationFrame(draw);
