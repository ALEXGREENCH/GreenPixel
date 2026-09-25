import {blendPixel,hsl as hsv,rgbHsl as rgb} from './blend.js';
import {composite} from './model.js';
export function walkLine(x0,y0,x1,y1,put){let dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx+dy;while(true){put(x0,y0);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}}
export function paint(p,x,y,c,opts={}){const size=opts.size||1,half=Math.floor(size/2);for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++){
  const px=x+dx-half,py=y+dy-half;if(px<0||py<0||px>=p.width||py>=p.height)continue;const n=py*p.width+px;
  if(p.selection&&!p.selection[n])continue;
  const u=(dx+.5-size/2)/(size/2),v=(dy+.5-size/2)/(size/2),shape=opts.shape||'sharp';
  if(shape==='round'&&u*u+v*v>1||shape==='slash'&&Math.abs(dx+dy-size+1)>1||shape==='backslash'&&Math.abs(dx-dy)>1||shape==='horizontal'&&dy!==half||shape==='vertical'&&dx!==half||shape==='spray'&&Math.random()>.18)continue;
  if(opts.pattern&&((((px+py)&1)!==0)!==!!opts.patternInvert))continue;
  for(const l of p.layers.filter(l=>l.selected)){
    const i=n*4;
    if(opts.erase){l.pixels[i+3]*=1-(opts.strength??1);l.inverted[n]=0;}
    else if(opts.inverted){l.inverted[n]=1;l.pixels[i+3]=0;}
    else if(c[3]===0){l.pixels.fill(0,i,i+4);l.inverted[n]=0;}
    else {if(opts.recolor&&opts.target&&Math.max(...[0,1,2].map(k=>Math.abs(l.pixels[i+k]-opts.target[k])))>(opts.tolerance||0)*2.55)continue;blendPixel(l.pixels,i,c,0);l.inverted[n]=0;}
  }
}}
export function region(data,w,h,x,y,tolerance=0,contiguous=true){const result=new Uint8Array(w*h),start=y*w+x;if(x<0||y<0||x>=w||y>=h)return result;const target=data.slice(start*4,start*4+4),match=n=>target.every((v,c)=>Math.abs(data[n*4+c]-v)<=tolerance*2.55);
  if(!contiguous){for(let n=0;n<w*h;n++)if(match(n))result[n]=255;return result;}
  const stack=[start];result[start]=255;while(stack.length){const n=stack.pop(),px=n%w;for(const k of [px?n-1:-1,px<w-1?n+1:-1,n-w,n+w])if(k>=0&&k<w*h&&!result[k]&&match(k)){result[k]=255;stack.push(k);}}return result;
}
export function bucket(p,x,y,c,opts={}){const src=opts.sampleAll?composite(p):p.layers.find(l=>l.selected)?.pixels;if(!src)return;const mask=region(src,p.width,p.height,x,y,opts.tolerance,opts.contiguous);for(let n=0;n<mask.length;n++)if(mask[n])paint(p,n%p.width,Math.floor(n/p.width),c,{...opts,size:1});}
export function shape(p,a,b,c,opts={}){let [x0,y0]=a,[x1,y1]=b;if(opts.square){const d=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));x1=x0+Math.sign(x1-x0||1)*d;y1=y0+Math.sign(y1-y0||1)*d;}
  if(opts.kind==='line'){walkLine(x0,y0,x1,y1,(x,y)=>paint(p,x,y,c,opts));return;}
  const left=Math.min(x0,x1),top=Math.min(y0,y1),right=Math.max(x0,x1),bottom=Math.max(y0,y1),rx=(right-left+1)/2,ry=(bottom-top+1)/2,cx=left+rx-.5,cy=top+ry-.5;
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){let inside=true,border=x===left||x===right||y===top||y===bottom;
    if(opts.kind==='ellipse'){const d=((x-cx)/rx)**2+((y-cy)/ry)**2;inside=d<=1;border=d>=Math.max(0,1-2/Math.min(rx,ry));}
    if(inside&&(opts.filled||border))paint(p,x,y,c,{...opts,size:opts.filled?1:opts.size});
  }
}
export function combineSelection(p,mask,mode='replace'){if(!p.selection||mode==='replace'){p.selection=mask;return;}for(let i=0;i<mask.length;i++)p.selection[i]=mode==='add'?Math.max(p.selection[i],mask[i]):mode==='subtract'?Math.max(0,p.selection[i]-mask[i]):Math.min(p.selection[i],mask[i]);}
export function shapeMask(p,a,b,kind='rect'){const mask=new Uint8Array(p.width*p.height),l=Math.max(0,Math.min(a[0],b[0])),r=Math.min(p.width-1,Math.max(a[0],b[0])),t=Math.max(0,Math.min(a[1],b[1])),bt=Math.min(p.height-1,Math.max(a[1],b[1]));for(let y=t;y<=bt;y++)for(let x=l;x<=r;x++){if(kind==='ellipse'&&((x-(l+r)/2)/((r-l+1)/2))**2+((y-(t+bt)/2)/((bt-t+1)/2))**2>1)continue;mask[y*p.width+x]=255;}return mask;}
export function polygonMask(p,points){const mask=new Uint8Array(p.width*p.height);for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside)mask[y*p.width+x]=255;}return mask;}
export function selectionBounds(p){let l=p.width,t=p.height,r=-1,b=-1;for(let i=0;i<p.width*p.height;i++)if(!p.selection||p.selection[i]){const x=i%p.width,y=Math.floor(i/p.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return r<l?null:{x:l,y:t,width:r-l+1,height:b-t+1};}
export function floatSelection(p,cut=true){if(p.floating)return p.floating;const b=selectionBounds(p);if(!b)return null;const selected=p.layers.filter(l=>l.selected);if(!selected.length)return null;const data=composite({...p,layers:selected.map(l=>({...l,visible:true,opacity:255,blendMode:"normal"}))}),pixels=new Uint8ClampedArray(b.width*b.height*4),inverted=new Uint8Array(b.width*b.height);for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++){const n=(y+b.y)*p.width+x+b.x,k=y*b.width+x;if(p.selection&&!p.selection[n])continue;pixels.set(data.subarray(n*4,n*4+4),k*4);for(const l of selected){if(l.inverted[n])inverted[k]=1;if(cut){l.pixels.fill(0,n*4,n*4+4);l.inverted[n]=0;}}}p.floating={...b,pixels,inverted,angle:0,layerId:selected.at(-1).id};p.selection=null;return p.floating;}
export function anchor(p){const f=p.floating;if(!f){p.selection=null;return;}const l=p.layers.find(l=>l.id===f.layerId)||p.layers.findLast(l=>l.selected);if(!l)return;for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const px=f.x+x,py=f.y+y;if(px<0||py<0||px>=p.width||py>=p.height)continue;const n=py*p.width+px,k=y*f.width+x;blendPixel(l.pixels,n*4,f.pixels,k*4);if(f.inverted?.[k])l.inverted[n]=1;}p.floating=null;p.selection=null;}
export function gradient(p,a,b,fore,back,opts={}){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,angle=Math.atan2(dy,dx);for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){let t=((x-a[0])*dx+(y-a[1])*dy)/(len*len),theta=(Math.atan2(y-a[1],x-a[0])-angle)/(2*Math.PI);if(opts.gradient==='radial')t=Math.hypot(x-a[0],y-a[1])/len;if(opts.gradient==='conical')t=(theta+1)%1;if(opts.gradient==='spiral')t=(theta+Math.hypot(x-a[0],y-a[1])/len+1)%1;if(opts.repeat==='asym')t=((t%1)+1)%1;else if(opts.repeat==='sym')t=1-Math.abs(((t%2)+2)%2-1);else t=Math.max(0,Math.min(1,t));const c=fore.map((v,i)=>Math.round(v*(1-t)+back[i]*t));if(opts.transparency){c.splice(0,3,...fore.slice(0,3));c[3]=Math.round(fore[3]*(1-t));}paint(p,x,y,c,{...opts,size:1});}}
export function retouch(p,x,y,opts){const radius=Math.floor((opts.size||1)/2);for(const l of p.layers.filter(l=>l.selected)){const source=l.pixels.slice();for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++){if(xx<0||yy<0||xx>=p.width||yy>=p.height)continue;const n=yy*p.width+xx,i=n*4;if(p.selection&&!p.selection[n])continue;const c=Array.from(source.slice(i,i+3));if(opts.retouch==='hue'||opts.retouch==='sponge'){const h=hsv(c);if(opts.retouch==='hue')h[0]+=.025;else h[1]*=.9;l.pixels.set(rgb(h),i);}else if(opts.retouch==='dodge'||opts.retouch==='burn')for(let k=0;k<3;k++)l.pixels[i+k]=c[k]*(opts.retouch==='dodge'?1.1:.9);else {for(let k=0;k<3;k++){let sum=0,count=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const sx=Math.max(0,Math.min(p.width-1,xx+dx)),sy=Math.max(0,Math.min(p.height-1,yy+dy));sum+=source[(sy*p.width+sx)*4+k];count++;}l.pixels[i+k]=opts.retouch==='sharpen'?2*c[k]-sum/count:sum/count;}}}}}
