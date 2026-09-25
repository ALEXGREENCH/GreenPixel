import {hsl as hsv,rgbHsl as rgb} from './blend.js';
import {evaluate} from './expression.js';
export const filters=['grayscale','invert','solarize','rgb','hs','exposure','formulae','average','blurSoft','blurMore','blurCustom','sharpen','unsharpMask','removeMatte','opacity','paintContour','dropShadow','glow','bevel'];
export function blur(input,w,h,radius,torus=false){
  const r=Math.max(1,Math.min(128,Math.round(radius))),tmp=new Float32Array(input.length),out=new Uint8ClampedArray(input.length);
  // Premultiplied alpha prevents dark halos around transparent pixels.
  const pre=new Float32Array(input.length);for(let i=0;i<input.length;i+=4){for(let c=0;c<3;c++)pre[i+c]=input[i+c]*input[i+3]/255;pre[i+3]=input[i+3];}
  const coord=(v,n)=>torus?((v%n)+n)%n:Math.max(0,Math.min(n-1,v));
  for(let y=0;y<h;y++)for(let c=0;c<4;c++){let sum=0;for(let k=-r;k<=r;k++)sum+=pre[(y*w+coord(k,w))*4+c];for(let x=0;x<w;x++){tmp[(y*w+x)*4+c]=sum/(2*r+1);sum+=pre[(y*w+coord(x+r+1,w))*4+c]-pre[(y*w+coord(x-r,w))*4+c];}}
  const dest=new Float32Array(input.length);
  for(let x=0;x<w;x++)for(let c=0;c<4;c++){let sum=0;for(let k=-r;k<=r;k++)sum+=tmp[(coord(k,h)*w+x)*4+c];for(let y=0;y<h;y++){dest[(y*w+x)*4+c]=sum/(2*r+1);sum+=tmp[(coord(y+r+1,h)*w+x)*4+c]-tmp[(coord(y-r,h)*w+x)*4+c];}}
  for(let i=0;i<input.length;i+=4){out[i+3]=dest[i+3];if(dest[i+3])for(let c=0;c<3;c++)out[i+c]=dest[i+c]*255/dest[i+3];}return out;
}
export function applyFilter(input,w,h,kind,options={}){
  const o={radius:2,amount:1,threshold:0,opacity:100,red:100,green:100,blue:100,hue:0,saturation:100,brightness:0,gamma:1,distance:4,angle:135,color:'#000000',formulaR:'r',formulaG:'g',formulaB:'b',...options};
  if(!filters.includes(kind))throw Error('Неизвестный фильтр');const out=input.slice();let blurred;
  if(['blurSoft','blurMore','blurCustom','sharpen','unsharpMask','glow','dropShadow','bevel'].includes(kind)){blurred=blur(input,w,h,kind==='blurSoft'?1:kind==='blurMore'?3:o.radius,o.torus);if(o.gaussian)blurred=blur(blurred,w,h,Math.max(1,o.radius/2),o.torus);}
  if(['blurSoft','blurMore','blurCustom'].includes(kind))return blurred;
  const tint=(o.color.match(/[a-f\d]{2}/gi)||['00','00','00']).map(n=>parseInt(n,16));
  const mean=[0,0,0];let weight=0;if(kind==='average')for(let i=0;i<input.length;i+=4){weight+=input[i+3];for(let c=0;c<3;c++)mean[c]+=input[i+c]*input[i+3];}
  for(let i=0;i<input.length;i+=4){let c=Array.from(input.slice(i,i+3)),a=input[i+3];switch(kind){
    case'grayscale':c.fill(c[0]*.299+c[1]*.587+c[2]*.114);break;
    case'invert':c=c.map(v=>255-v);break;
    case'solarize':c=c.map(v=>v>=128?255-v:v);break;
    case'rgb':c=c.map((v,k)=>v*[o.red,o.green,o.blue][k]/100);break;
    case'hs':{const v=hsv(c);v[0]+=o.hue/360;v[1]=Math.min(1,v[1]*o.saturation/100);c=rgb(v);break;}
    case'exposure':c=c.map(v=>255*Math.pow(Math.max(0,v/255+o.brightness/100),1/Math.max(.01,o.gamma)));break;
    case'formulae':{const vars={r:c[0],g:c[1],b:c[2],a,x:(i/4)%w,y:Math.floor(i/4/w)};c=[o.formulaR,o.formulaG,o.formulaB].map(f=>evaluate(f,vars));break;}
    case'average':c=mean.map(v=>weight?v/weight:0);break;
    case'sharpen':case'unsharpMask':c=c.map((v,k)=>Math.abs(v-blurred[i+k])>=o.threshold?v+(v-blurred[i+k])*o.amount:v);break;
    case'removeMatte':if(a)c=c.map((v,k)=>(v-tint[k]*(1-a/255))/(a/255));break;
    case'opacity':a*=o.opacity/100;break;
    case'paintContour':{const n=i/4,x=n%w,y=Math.floor(n/w);if(a&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([xx,yy])=>xx<0||yy<0||xx>=w||yy>=h||!input[(yy*w+xx)*4+3]))c=tint;break;}
    case'dropShadow':case'glow':{const n=i/4,x=n%w,y=Math.floor(n/w),dx=kind==='glow'?0:Math.round(Math.cos(o.angle*Math.PI/180)*o.distance),dy=kind==='glow'?0:Math.round(Math.sin(o.angle*Math.PI/180)*o.distance),sx=x-dx,sy=y-dy;let sa=(sx>=0&&sy>=0&&sx<w&&sy<h?blurred[(sy*w+sx)*4+3]:0)/255*o.opacity/100;if(o.inner){sa=(1-sa)*a/255;c=c.map((v,k)=>v*(1-sa)+tint[k]*sa);}else{const aa=a/255+sa*(1-a/255);c=c.map((v,k)=>aa?(v*a/255+tint[k]*sa*(1-a/255))/aa:0);a=aa*255;}break;}
    case'bevel':{const n=i/4,x=n%w,y=Math.floor(n/w),dx=Math.round(Math.cos(o.angle*Math.PI/180)),dy=Math.round(Math.sin(o.angle*Math.PI/180)),get=(xx,yy)=>xx<0||yy<0||xx>=w||yy>=h?0:blurred[(yy*w+xx)*4+3],light=(get(x+dx,y+dy)-get(x-dx,y-dy))*o.amount;c=c.map(v=>v+light);break;}
  }out.set(c,i);out[i+3]=a;}return out;
}
