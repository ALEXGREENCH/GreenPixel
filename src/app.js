import {document as createDocument,layer,color,pixel,line,fill,composite,serialize,parse,History,clone} from './core.js';
const $=id=>document.getElementById(id);
let doc=createDocument(),history=new History(),tool='pencil',zoom=12,stroke=null,dirty=false,title='Новый рисунок';
const canvas=$('canvas'),ctx=canvas.getContext('2d'),preview=$('preview').getContext('2d');
const tools=[['pencil','✎','Карандаш','B'],['eraser','▱','Ластик','E'],['fill','◈','Заливка','G'],['picker','⌖','Пипетка','I'],['line','╱','Линия','L'],['rect','□','Рамка','R']];
const colors=['#17211d','#344438','#596952','#879674','#bed2a4','#f0eed7','#ffffff','#e8c49a','#ce9462','#965746','#603e41','#e57b70','#f3ad83','#f0d876','#b7d87c','#83e377','#46ad82','#357567','#284c59','#427ba3','#75bdd2','#a3decd','#a594cf','#d9a5c4'];
function status(text){$('status').textContent=text;}
function setColor(value){$('color').value=value;$('hex').textContent=value.toUpperCase();document.querySelectorAll('#palette button').forEach(b=>b.classList.toggle('selected',b.dataset.color===value));}
function setTool(value){tool=value;document.querySelectorAll('#tools button').forEach(b=>{b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',String(b.dataset.tool===tool));});}
for(const [id,icon,name,key] of tools){const b=document.createElement('button');b.dataset.tool=id;b.title=`${name} (${key})`;b.innerHTML=`<span>${icon}</span>${name}`;b.onclick=()=>setTool(id);$('tools').append(b);}
for(const c of colors){const b=document.createElement('button');b.style.background=c;b.dataset.color=c;b.title=c;b.setAttribute('aria-label',`Цвет ${c}`);b.onclick=()=>setColor(c);$('palette').append(b);}
function render(){
  canvas.width=doc.width;canvas.height=doc.height;
  ctx.putImageData(new ImageData(composite(doc),doc.width,doc.height),0,0);
  $('preview').width=doc.width;$('preview').height=doc.height;preview.drawImage(canvas,0,0);
  const scale=Math.min(4,128/Math.max(doc.width,doc.height));$('preview').style.width=`${doc.width*scale}px`;$('preview').style.height=`${doc.height*scale}px`;
  canvas.style.width=`${doc.width*zoom}px`;canvas.style.height=`${doc.height*zoom}px`;
  $('grid-overlay').style.backgroundSize=`${zoom}px ${zoom}px`;$('grid-overlay').style.display=$('grid').getAttribute('aria-pressed')==='true'&&zoom>=4?'block':'none';
  $('zoom-label').textContent=`${Math.round(zoom*100)}%`;$('docsize').textContent=`${doc.width} × ${doc.height}`;$('docname').textContent=title+(dirty?' •':'');
  $('undo').disabled=!history.undoStack.length;$('redo').disabled=!history.redoStack.length;
}
function renderLayers(){
  $('layers').replaceChildren();
  doc.layers.forEach((l,i)=>{const row=document.createElement('div');row.className='layer'+(i===doc.active?' selected':'');const eye=document.createElement('button');eye.textContent=l.visible?'◉':'○';eye.setAttribute('aria-label',`${l.visible?'Скрыть':'Показать'} ${l.name}`);eye.onclick=()=>change(()=>l.visible=!l.visible);
    const name=document.createElement('button');name.className='layer-name';name.textContent=l.name;name.onclick=()=>{doc.active=i;renderLayers();};row.append(eye,name);$('layers').prepend(row);});
  $('opacity').value=doc.layers[doc.active].opacity*100;$('opacity-value').textContent=`${Math.round(doc.layers[doc.active].opacity*100)}%`;
  $('delete-layer').disabled=doc.layers.length===1;$('add-layer').disabled=doc.layers.length>=32;$('layer-up').disabled=doc.active===doc.layers.length-1;$('layer-down').disabled=doc.active===0;
}
let saveTimer;
function changed(){dirty=true;render();renderLayers();clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('turborium-greenpixel-autosave',serialize(doc));status('Черновик сохранён в этом браузере');}catch{status('Не удалось сохранить черновик. Скачайте проект.');}},500);}
function change(fn){history.push(doc);fn();changed();}
function fit(){zoom=Math.max(1,Math.min(16,Math.floor(Math.min(($('viewport').clientWidth-80)/doc.width,($('viewport').clientHeight-80)/doc.height))));}
function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(doc.width-1,Math.floor((e.clientX-r.left)/r.width*doc.width))),Math.max(0,Math.min(doc.height-1,Math.floor((e.clientY-r.top)/r.height*doc.height)))];}
function drawShape(a,b,rgba){if(tool==='line')line(doc,...a,...b,rgba,+$('size').value);else{line(doc,a[0],a[1],b[0],a[1],rgba);line(doc,b[0],a[1],b[0],b[1],rgba);line(doc,b[0],b[1],a[0],b[1],rgba);line(doc,a[0],b[1],a[0],a[1],rgba);}}
canvas.onpointerdown=e=>{
  if(e.button!==0)return;e.preventDefault();const p=point(e),rgba=color($('color').value);
  if(tool==='picker'){const data=composite(doc),i=(p[1]*doc.width+p[0])*4;setColor('#'+Array.from(data.slice(i,i+3)).map(n=>n.toString(16).padStart(2,'0')).join(''));return;}
  if(!doc.layers[doc.active].visible){status('Сначала включите видимость активного слоя');return;}
  history.push(doc);
  if(tool==='fill'){fill(doc,...p,rgba);changed();return;}
  canvas.setPointerCapture(e.pointerId);stroke={start:p,last:p,base:clone(doc),rgba:tool==='eraser'?[0,0,0,0]:rgba};
  if(['line','rect'].includes(tool))drawShape(p,p,rgba);else pixel(doc,...p,stroke.rgba,+$('size').value);render();
};
canvas.onpointermove=e=>{const p=point(e);$('coords').textContent=`X ${p[0]} · Y ${p[1]}`;if(!stroke)return;
  if(['line','rect'].includes(tool)){doc=clone(stroke.base);drawShape(stroke.start,p,stroke.rgba);}else line(doc,...stroke.last,...p,stroke.rgba,+$('size').value);
  stroke.last=p;render();
};
function finish(){if(stroke){stroke=null;changed();}}
canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.onlostpointercapture=finish;
$('color').oninput=e=>setColor(e.target.value);
$('undo').onclick=()=>{if(history.undoStack.length){doc=history.undo(doc);changed();}};
$('redo').onclick=()=>{if(history.redoStack.length){doc=history.redo(doc);changed();}};
$('grid').onclick=()=>{$('grid').setAttribute('aria-pressed',String($('grid').getAttribute('aria-pressed')!=='true'));render();};
$('plus').onclick=()=>{zoom=Math.min(32,zoom+1);render();};$('minus').onclick=()=>{zoom=Math.max(1,zoom-1);render();};
$('add-layer').onclick=()=>change(()=>{doc.layers.push(layer(doc.width,doc.height,`Слой ${doc.layers.length+1}`));doc.active=doc.layers.length-1;});
$('delete-layer').onclick=()=>{if(doc.layers.length>1)change(()=>{doc.layers.splice(doc.active,1);doc.active=Math.max(0,doc.active-1);});};
for(const [id,delta] of [['layer-up',1],['layer-down',-1]])$(id).onclick=()=>change(()=>{const i=doc.active;[doc.layers[i],doc.layers[i+delta]]=[doc.layers[i+delta],doc.layers[i]];doc.active+=delta;});
$('rename-layer').onclick=()=>{const name=prompt('Название слоя',doc.layers[doc.active].name);if(name?.trim())change(()=>doc.layers[doc.active].name=name.trim().slice(0,100));};
$('opacity').onchange=e=>change(()=>doc.layers[doc.active].opacity=+e.target.value/100);
function replace(next,name){doc=next;title=name;history=new History();fit();changed();}
$('new-form').onsubmit=e=>{e.preventDefault();try{const next=createDocument(+$('width').value,+$('height').value);if(dirty&&!confirm('Создать новый холст? Сначала сохраните нужный проект.'))return;replace(next,'Новый рисунок');}catch(error){status(error.message);}};
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save').onclick=()=>{download(new Blob([serialize(doc)],{type:'application/json'}),`${title}.greenpixel`);dirty=false;render();status('Проект скачан');};
$('export').onclick=()=>{canvas.toBlob(blob=>{if(blob)download(blob,`${title}.png`);},'image/png');status('PNG экспортирован в исходном размере');};
$('open').onclick=()=>$('file').click();
$('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
  if(file.size>160*1024*1024)throw new Error('Файл слишком большой (максимум 160 МБ)');
  if(dirty&&!confirm('Открыть файл вместо текущего проекта? Сначала сохраните нужный проект.'))return;
  let next;
  if(file.name.toLowerCase().endsWith('.greenpixel'))next=parse(await file.text());
  else {const bitmap=await createImageBitmap(file);try{next=createDocument(bitmap.width,bitmap.height);const off=document.createElement('canvas');off.width=bitmap.width;off.height=bitmap.height;const c=off.getContext('2d');c.drawImage(bitmap,0,0);next.layers[0].pixels=c.getImageData(0,0,off.width,off.height).data;}finally{bitmap.close();}}
  replace(next,file.name.replace(/\.[^.]+$/,''));status('Файл открыт');
}catch(error){status(`Не удалось открыть: ${error.message}`);}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||stroke)return;
  if(e.ctrlKey||e.metaKey){const key=e.key.toLowerCase();if(['z','y','s','o'].includes(key))e.preventDefault();if(key==='z')$(e.shiftKey?'redo':'undo').click();if(key==='y')$('redo').click();if(key==='s')$('save').click();if(key==='o')$('open').click();return;}
  const entry=tools.find(t=>t[3].toLowerCase()===e.key.toLowerCase());if(entry)setTool(entry[0]);
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
try{const saved=localStorage.getItem('turborium-greenpixel-autosave');if(saved){doc=parse(saved);dirty=true;status('Восстановлен локальный черновик');}}catch{status('Черновик недоступен. Можно открыть сохранённый проект.');}
setTool('pencil');setColor('#83e377');fit();render();renderLayers();
