export const MAX_SIZE = 512;
export function dimensions(w,h) {
  if (![w,h].every(n=>Number.isInteger(n)&&n>0&&n<=MAX_SIZE)) throw new Error(`Размер должен быть целым числом от 1 до ${MAX_SIZE}`);
}
export function layer(w,h,name='Слой 1') { return {name,visible:true,opacity:1,pixels:new Uint8ClampedArray(w*h*4)}; }
export function document(w=32,h=32) { dimensions(w,h); return {width:w,height:h,layers:[layer(w,h)],active:0}; }
export function clone(doc) { return {...doc,layers:doc.layers.map(l=>({...l,pixels:l.pixels.slice()}))}; }
export function color(hex) { return [...hex.replace('#','').match(/../g).map(v=>parseInt(v,16)),255]; }
export function pixel(doc,x,y,rgba,size=1) {
  const data=doc.layers[doc.active].pixels;
  const offset=Math.floor((size-1)/2);
  for(let dy=0;dy<size;dy++) for(let dx=0;dx<size;dx++) {
    const px=x+dx-offset,py=y+dy-offset;
    if(px>=0&&py>=0&&px<doc.width&&py<doc.height) data.set(rgba,(py*doc.width+px)*4);
  }
}
export function line(doc,x0,y0,x1,y1,rgba,size=1) {
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1; let err=dx+dy;
  while(true) { pixel(doc,x0,y0,rgba,size); if(x0===x1&&y0===y1) break; const e=2*err; if(e>=dy){err+=dy;x0+=sx;} if(e<=dx){err+=dx;y0+=sy;} }
}
export function fill(doc,x,y,rgba) {
  if(x<0||y<0||x>=doc.width||y>=doc.height)return;
  const p=doc.layers[doc.active].pixels,start=y*doc.width+x,target=p.slice(start*4,start*4+4);
  if(target.every((v,i)=>v===rgba[i]))return;
  const stack=[start]; const matches=i=>target.every((v,c)=>p[i*4+c]===v);
  p.set(rgba,start*4);
  while(stack.length) { const i=stack.pop(),px=i%doc.width; for(const n of [px>0?i-1:-1,px<doc.width-1?i+1:-1,i-doc.width,i+doc.width]) if(n>=0&&n<doc.width*doc.height&&matches(n)){p.set(rgba,n*4);stack.push(n);} }
}
export function composite(doc) {
  const out=new Uint8ClampedArray(doc.width*doc.height*4);
  for(const l of doc.layers) if(l.visible) for(let i=0;i<out.length;i+=4) {
    const a=l.pixels[i+3]/255*l.opacity,b=out[i+3]/255,alpha=a+b*(1-a);
    if(alpha) for(let c=0;c<3;c++)out[i+c]=(l.pixels[i+c]*a+out[i+c]*b*(1-a))/alpha;
    out[i+3]=alpha*255;
  }
  return out;
}
export function serialize(doc) {return JSON.stringify({format:'greenpixel',version:1,...doc,layers:doc.layers.map(l=>({...l,pixels:Array.from(l.pixels)}))});}
export function parse(text) {
  const d=JSON.parse(text); if(d.format!=='greenpixel'||d.version!==1)throw new Error('Неизвестный формат проекта');
  dimensions(d.width,d.height);
  if(!Array.isArray(d.layers)||d.layers.length<1||d.layers.length>32)throw new Error('Допустимо от 1 до 32 слоёв');
  if(!Number.isInteger(d.active)||d.active<0||d.active>=d.layers.length)throw new Error('Некорректный активный слой');
  return {width:d.width,height:d.height,active:d.active,layers:d.layers.map(l=>{
    if(typeof l.name!=='string'||l.name.length>100||typeof l.visible!=='boolean'||!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>1||!Array.isArray(l.pixels)||l.pixels.length!==d.width*d.height*4||!l.pixels.every(v=>Number.isInteger(v)&&v>=0&&v<=255))throw new Error('Повреждённые данные слоя');
    return {name:l.name,visible:l.visible,opacity:l.opacity,pixels:new Uint8ClampedArray(l.pixels)};
  })};
}
export class History {
  constructor(limit=30,maxBytes=64*1024*1024){this.limit=limit;this.maxBytes=maxBytes;this.undoStack=[];this.redoStack=[];}
  push(doc){
    this.undoStack.push(clone(doc));this.redoStack=[];
    let bytes=this.undoStack.reduce((sum,d)=>sum+d.layers.reduce((n,l)=>n+l.pixels.byteLength,0),0);
    while(this.undoStack.length>1&&(this.undoStack.length>this.limit||bytes>this.maxBytes)) {
      const old=this.undoStack.shift();bytes-=old.layers.reduce((n,l)=>n+l.pixels.byteLength,0);
    }
  }
  undo(doc){if(!this.undoStack.length)return doc;this.redoStack.push(clone(doc));return this.undoStack.pop();}
  redo(doc){if(!this.redoStack.length)return doc;this.undoStack.push(clone(doc));return this.redoStack.pop();}
}
