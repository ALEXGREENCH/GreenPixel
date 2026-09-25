import {dimensions} from './model.js';
export function transformImage(image,width,height,angle=0,antialias=false){
  dimensions(width,height);const c=Math.cos(angle),s=Math.sin(angle),w=Math.max(1,Math.ceil(Math.abs(width*c)+Math.abs(height*s)-1e-9)),h=Math.max(1,Math.ceil(Math.abs(width*s)+Math.abs(height*c)-1e-9));dimensions(w,h);
  const pixels=new Uint8ClampedArray(w*h*4),inverted=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const dx=x+.5-w/2,dy=y+.5-h/2,u=(dx*c+dy*s+width/2)*image.width/width,v=(-dx*s+dy*c+height/2)*image.height/height,n=y*w+x;
    if(u<0||v<0||u>=image.width||v>=image.height)continue;
    const nearest=Math.floor(v)*image.width+Math.floor(u);inverted[n]=image.inverted?.[nearest]||0;
    if(!antialias){pixels.set(image.pixels.subarray(nearest*4,nearest*4+4),n*4);continue;}
    const sx=u-.5,sy=v-.5,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0,color=[0,0,0];let alpha=0;
    for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const px=Math.max(0,Math.min(image.width-1,x0+xx)),py=Math.max(0,Math.min(image.height-1,y0+yy)),i=(py*image.width+px)*4,weight=(xx?fx:1-fx)*(yy?fy:1-fy),a=image.pixels[i+3]*weight;alpha+=a;for(let k=0;k<3;k++)color[k]+=image.pixels[i+k]*a;}
    for(let k=0;k<3;k++)pixels[n*4+k]=alpha?color[k]/alpha:0;pixels[n*4+3]=alpha;
  }
  return {width:w,height:h,pixels,inverted};
}
export function rotatePage(p,kind){const angle=kind==='left'?-Math.PI/2:kind==='right'?Math.PI/2:Math.PI,w=p.width,h=p.height;
  const coordinate=(x,y)=>kind==='left'?[y,w-1-x]:kind==='right'?[h-1-y,x]:kind==='horizontal'?[w-1-x,y]:kind==='vertical'?[x,h-1-y]:[w-1-x,h-1-y];
  const nw=['left','right'].includes(kind)?h:w,nh=['left','right'].includes(kind)?w:h;
  for(const l of p.layers){const pixels=new Uint8ClampedArray(w*h*4),inverted=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const [dx,dy]=coordinate(x,y),n=dy*nw+dx;pixels.set(l.pixels.subarray((y*w+x)*4,(y*w+x)*4+4),n*4);inverted[n]=l.inverted[y*w+x];}l.pixels=pixels;l.inverted=inverted;}
  const [x,y]=coordinate(p.hotSpot.x,p.hotSpot.y);p.hotSpot={x,y};p.width=nw;p.height=nh;
}
