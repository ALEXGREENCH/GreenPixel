import {el} from './ui.js';
import {transformFloating} from './transform-gesture.js';
const handles=[['nw',0,0,'Верхний левый угол'],['n',.5,0,'Верхняя сторона'],['ne',1,0,'Верхний правый угол'],['e',1,.5,'Правая сторона'],['se',1,1,'Нижний правый угол'],['s',.5,1,'Нижняя сторона'],['sw',0,1,'Нижний левый угол'],['w',0,.5,'Левая сторона'],['rotate',.5,0,'Поворот выделения']];
export function attachTransformHandles(wrap,{getPage,getZoom,isActive,smooth,onStart,onPreview,onCommit,onCancel,onError}){
 const root=el('div',{class:'transform-handles'});wrap.append(root);let gesture=null;
 const point=e=>{const r=wrap.getBoundingClientRect(),zoom=getZoom();return [(e.clientX-r.left)/zoom,(e.clientY-r.top)/zoom];};
 function cancel(){if(!gesture)return;const old=gesture;gesture=null;onCancel();if(old.button.hasPointerCapture(old.pointerId))old.button.releasePointerCapture(old.pointerId);}
 for(const [name,x,y,label]of handles){
  const button=el('button',{type:'button',class:'transform-handle handle-'+name,'aria-label':label,title:label+' · Shift: пропорции / шаг поворота 15°'});root.append(button);
  button.onpointerdown=e=>{if(e.button!==0||gesture||!getPage()?.floating)return;e.preventDefault();e.stopPropagation();onStart();gesture={name,start:point(e),source:structuredClone(getPage().floating),button,pointerId:e.pointerId,changed:false};button.setPointerCapture(e.pointerId);};
  button.onpointermove=e=>{if(!gesture||gesture.button!==button)return;e.preventDefault();e.stopPropagation();try{const current=point(e);if(Math.hypot(current[0]-gesture.start[0],current[1]-gesture.start[1])<.01){if(gesture.changed)onPreview(structuredClone(gesture.source));gesture.changed=false;return;}const result=transformFloating(gesture.source,name,gesture.start,current,e.shiftKey,smooth());gesture.changed=true;onPreview(result);}catch(error){onError(error);cancel();}};
  button.onpointerup=e=>{if(!gesture||gesture.button!==button)return;e.stopPropagation();const old=gesture;gesture=null;if(old.changed)onCommit();else onCancel();if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);};
  button.onpointercancel=button.onlostpointercapture=cancel;
 }
 const frame=el('div',{class:'transform-frame','aria-hidden':'true'});root.append(frame);
 document.addEventListener('keydown',e=>{if(gesture&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();}},true);
 return {refresh(){const f=getPage()?.floating;root.hidden=!f||!isActive();if(root.hidden)return;const z=getZoom();Object.assign(frame.style,{left:f.x*z+'px',top:f.y*z+'px',width:f.width*z+'px',height:f.height*z+'px'});handles.forEach(([name,x,y],i)=>{const b=root.children[i];b.style.left=(f.x+f.width*x)*z+'px';b.style.top=((f.y+f.height*y)*z-(name==='rotate'?24:0))+'px';});}};
}
