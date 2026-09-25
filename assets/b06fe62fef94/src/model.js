import {blendPixel,modes} from './blend.js';
let serial=0;
export function id(){return `gp-${Date.now().toString(36)}-${serial++}`;}
export function dimensions(w,h){if(![w,h].every(n=>Number.isInteger(n)&&n>=1&&n<=8192))throw Error('Размер: целое число от 1 до 8192');}
export function layer(w,h,name='Фон'){return {id:id(),name,visible:true,selected:true,opacity:255,blendMode:'normal',pixels:new Uint8ClampedArray(w*h*4),inverted:new Uint8Array(w*h)};}
export function page(w=32,h=32){dimensions(w,h);return {id:id(),width:w,height:h,layers:[layer(w,h)],selection:null,floating:null,hotSpot:{x:0,y:0},duration:0,dpi:96};}
export function document(w=32,h=32,name='Без имени'){return {id:id(),name,pages:[page(w,h)],activePage:0,metadata:{title:'',author:'',copyright:'',comments:'',loopCount:0,dpi:96,quality:.9},memo:'',dirty:false};}
export const clone=value=>structuredClone(value);
export function composite(p){
  const out=new Uint8ClampedArray(p.width*p.height*4);
  const draw=(dest,l,opacity=l.opacity/255,mode=l.blendMode)=>{let data=l.pixels,inv=l.inverted;const f=p.floating;
    if(f&&(f.layerId===l.id||!f.layerId&&l===p.layers.findLast(l=>l.selected))){data=data.slice();inv=inv.slice();for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const dx=x+f.x,dy=y+f.y;if(dx<0||dy<0||dx>=p.width||dy>=p.height)continue;const n=dy*p.width+dx,k=y*f.width+x;if(f.inverted?.[k]){inv[n]=1;data[n*4+3]=0;}else{blendPixel(data,n*4,f.pixels,k*4);if(f.pixels[k*4+3])inv[n]=0;}}}
    for(let i=0;i<dest.length;i+=4){if(inv[i/4]&&mode!=='mask'){dest[i]=255-dest[i];dest[i+1]=255-dest[i+1];dest[i+2]=255-dest[i+2];dest[i+3]=255;}else blendPixel(dest,i,data,i,opacity,mode,i/4);}
  };
  for(let index=0;index<p.layers.length;index++){const l=p.layers[index];if(!l.visible||l.blendMode==='mask')continue;
    if(p.layers[index+1]?.visible&&p.layers[index+1].blendMode==='mask'){const temp=new Uint8ClampedArray(out.length);draw(temp,l,1,'normal');while(p.layers[index+1]?.blendMode==='mask'){const mask=p.layers[++index];if(mask.visible)draw(temp,mask);}for(let i=0;i<out.length;i+=4)blendPixel(out,i,temp,i,l.opacity/255,l.blendMode,i/4);}
    else draw(out,l);
  }return out;
}
export function serialize(doc){return JSON.stringify({format:'greenpixel',version:2,document:doc},(_,v)=>ArrayBuffer.isView(v)?Array.from(v):v);}
export function parse(text){const obj=JSON.parse(text);if(obj.format!=='greenpixel')throw Error('Неизвестный формат проекта');let d;
  if(obj.version===1){d=document(obj.width,obj.height);d.pages[0].layers=obj.layers.map((l,i)=>({...layer(obj.width,obj.height,l.name),...l,selected:i===obj.active,opacity:Math.round(l.opacity*255),blendMode:'normal'}));}
  else if(obj.version===2)d=obj.document;else throw Error('Неизвестная версия проекта');
  if(!d||!Array.isArray(d.pages)||!d.pages.length||d.pages.length>1024)throw Error('Некорректные страницы');let total=0;
  for(const p of d.pages){dimensions(p.width,p.height);if(!Array.isArray(p.layers)||p.layers.length>256)throw Error('Некорректные слои');for(const l of p.layers){total+=p.width*p.height*5;if(total>512*1024*1024)throw Error('Проект превышает 512 МБ');if(!Array.isArray(l.pixels)||l.pixels.length!==p.width*p.height*4||!l.pixels.every(n=>Number.isInteger(n)&&n>=0&&n<=255)||!modes.includes(l.blendMode)||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>255)throw Error('Повреждённый слой');l.pixels=new Uint8ClampedArray(l.pixels);l.inverted=new Uint8Array(l.inverted||p.width*p.height);if(l.inverted.length!==p.width*p.height)throw Error('Повреждённая инверсия');}
    if(p.selection){if(p.selection.length!==p.width*p.height)throw Error('Повреждённая маска');p.selection=new Uint8Array(p.selection);}
    if(p.floating){dimensions(p.floating.width,p.floating.height);if(p.floating.pixels.length!==p.floating.width*p.floating.height*4)throw Error('Повреждённое выделение');p.floating.pixels=new Uint8ClampedArray(p.floating.pixels);p.floating.inverted=new Uint8Array(p.floating.inverted||p.floating.width*p.floating.height);}
  }
  if(!Number.isInteger(d.activePage)||!d.pages[d.activePage])throw Error('Некорректная текущая страница');d.id=id();return d;
}
// Pixel deltas for unchanged document structure, snapshots only for structural edits.
export class History {
  constructor(){this.undoStack=[];this.redoStack=[];this.bytes=0;}
  record(before,after,label){
    const strip=d=>JSON.stringify(d,(k,v)=>['pixels','inverted','selection','floating','dirty'].includes(k)?undefined:v);
    let entry={label};
    if(strip(before)===strip(after)&&before.pages.every((p,i)=>!p.floating&&!after.pages[i].floating)){
      entry.kind='delta';entry.pages=[];entry.bytes=0;
      before.pages.forEach((p,pi)=>{const q=after.pages[pi];const changes=[];p.layers.forEach((l,li)=>{for(const key of ['pixels','inverted']){const a=l[key],b=q.layers[li][key];let start=-1;for(let i=0;i<=a.length;i++){if(i<a.length&&a[i]!==b[i]){if(start<0)start=i;}else if(start>=0){changes.push({li,key,start,a:a.slice(start,i),b:b.slice(start,i)});entry.bytes+=(i-start)*2+32;start=-1;}}}});entry.pages.push({changes,a:p.selection?.slice()||null,b:q.selection?.slice()||null});entry.bytes+=(p.selection?.length||0)+(q.selection?.length||0);});
    }else{entry.kind='snapshot';entry.before=clone(before);entry.after=clone(after);entry.bytes=JSON.stringify(entry,(_,v)=>ArrayBuffer.isView(v)?`bytes:${v.byteLength}`:v).length+before.pages.concat(after.pages).reduce((n,p)=>n+p.layers.reduce((m,l)=>m+l.pixels.length+l.inverted.length,0),0);}
    this.bytes-=this.redoStack.reduce((n,e)=>n+e.bytes,0);this.undoStack.push(entry);this.redoStack=[];this.bytes+=entry.bytes;while(this.undoStack.length>1&&(this.bytes>96*1024*1024||this.undoStack.length>100))this.bytes-=this.undoStack.shift().bytes;
  }
  apply(d,e,forward){if(e.kind==='snapshot')return clone(forward?e.after:e.before);e.pages.forEach((p,i)=>{for(const c of p.changes)d.pages[i].layers[c.li][c.key].set(forward?c.b:c.a,c.start);d.pages[i].selection=(forward?p.b:p.a)?.slice()||null;});return d;}
  undo(d){const e=this.undoStack.pop();if(!e)return d;this.redoStack.push(e);return this.apply(d,e,false);}
  redo(d){const e=this.redoStack.pop();if(!e)return d;this.undoStack.push(e);return this.apply(d,e,true);}
}
export function resizePage(p,w,h,stretch=false,anchor='center'){dimensions(w,h);const ow=p.width,oh=p.height,ox=anchor==='center'?Math.floor((w-ow)/2):anchor==='end'?w-ow:0,oy=anchor==='center'?Math.floor((h-oh)/2):anchor==='end'?h-oh:0;for(const l of p.layers){const data=new Uint8ClampedArray(w*h*4),inv=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=stretch?Math.floor(x*ow/w):x-ox,sy=stretch?Math.floor(y*oh/h):y-oy;if(sx>=0&&sy>=0&&sx<ow&&sy<oh){const a=sy*ow+sx,b=y*w+x;data.set(l.pixels.subarray(a*4,a*4+4),b*4);inv[b]=l.inverted[a];}}l.pixels=data;l.inverted=inv;}p.width=w;p.height=h;p.selection=null;p.floating=null;p.hotSpot={x:Math.min(w-1,p.hotSpot.x),y:Math.min(h-1,p.hotSpot.y)};}
