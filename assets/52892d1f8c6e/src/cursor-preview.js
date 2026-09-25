import {el,dialog} from './ui.js';
import {surface,decodeImage} from './codecs.js';
import {displayPlanes} from './display.js';
import {frameAt,testPoint,cursorOrigin} from './preview-timeline.js';

export function testDocument(document,chooseFile){
 const width=480,height=300,canvas=el('canvas',{class:'test-canvas',width,height,'aria-label':'Проверка курсора'}),ctx=canvas.getContext('2d');
 const warning=el('p',{class:'dialog-note'}),body=el('div',{},[canvas,el('p',{text:'Перемещайте указатель; рисуйте для проверки активной точки.'}),warning]);
 let stopped=false,request,start=performance.now(),pointer={x:240,y:150},stroke=null,background=null,preparedIndex=-1,prepared;
 const strokes=[];
 function paint(now){
  if(stopped)return;
  const index=frameAt(document.pages,document.activePage,now-start),page=document.pages[index];
  if(preparedIndex!==index){const planes=displayPlanes(page);prepared={color:surface({...page,pixels:planes.pixels}),inversion:planes.inversion?surface({...page,pixels:planes.inversion}):null};preparedIndex=index;warning.textContent=planes.warning||'';warning.hidden=!planes.warning;}
  ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;
  for(let i=0;i<4;i++){ctx.fillStyle=['#fff','#aaa','#555','#000'][i];ctx.fillRect(i*width/4,0,width/4,height);}
  if(background){ctx.fillStyle=ctx.createPattern(background,'repeat');ctx.fillRect(0,0,width,height);}
  ctx.strokeStyle='#f00';ctx.fillStyle='#f00';ctx.lineWidth=1;
  for(const points of strokes){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();if(points.length===1)ctx.fillRect(points[0].x,points[0].y,1,1);}
  const origin=cursorOrigin(pointer,page);ctx.drawImage(prepared.color,origin.x,origin.y);
  if(prepared.inversion){ctx.globalCompositeOperation='difference';ctx.drawImage(prepared.inversion,origin.x,origin.y);ctx.globalCompositeOperation='source-over';}
  request=requestAnimationFrame(paint);
 }
 const position=e=>testPoint(canvas.getBoundingClientRect(),width,height,e.clientX,e.clientY);
 canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointer=position(e);stroke=[pointer];strokes.push(stroke);};
 canvas.onpointermove=e=>{pointer=position(e);if(stroke)stroke.push(pointer);};
 canvas.onpointerup=e=>{if(stroke){pointer=position(e);stroke.push(pointer);}stroke=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
 canvas.onpointercancel=canvas.onlostpointercapture=()=>{stroke=null;};
 const end=()=>{stopped=true;cancelAnimationFrame(request);};
 dialog('Тестирование',body,{onOk:end,onCancel:end,extra:[
  el('button',{type:'button',text:'Фон…',onclick:()=>chooseFile('image/*',async file=>{const image=await decodeImage(await file.arrayBuffer());if(!stopped)background=surface(image);})}),
  el('button',{type:'button',text:'Очистить рисунок',onclick:()=>{strokes.length=0;stroke=null;}})
 ]});paint(start);
}
