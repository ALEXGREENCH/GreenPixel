import {hsl as hsv,rgbHsl as rgb} from './blend.js';
import {evaluate} from './expression.js';
export const filters=['grayscale','invert','solarize','rgb','hs','exposure','formulae','average','blurSoft','blurMore','blurCustom','sharpen','unsharpMask','removeMatte','opacity','paintContour','dropShadow','glow','bevel'];
export function blur(input,w,h,radius,torus=false){
  if(radius===0)return input.slice();
  const r=Math.max(1,Math.min(128,Math.round(radius))),tmp=new Float32Array(input.length),out=new Uint8ClampedArray(input.length);
  // Premultiplied alpha prevents dark halos around transparent pixels.
  const pre=new Float32Array(input.length);for(let i=0;i<input.length;i+=4){for(let c=0;c<3;c++)pre[i+c]=input[i+c]*input[i+3]/255;pre[i+3]=input[i+3];}
  const coord=(v,n)=>torus?((v%n)+n)%n:Math.max(0,Math.min(n-1,v));
  for(let y=0;y<h;y++)for(let c=0;c<4;c++){let sum=0;for(let k=-r;k<=r;k++)sum+=pre[(y*w+coord(k,w))*4+c];for(let x=0;x<w;x++){tmp[(y*w+x)*4+c]=sum/(2*r+1);sum+=pre[(y*w+coord(x+r+1,w))*4+c]-pre[(y*w+coord(x-r,w))*4+c];}}
  const dest=new Float32Array(input.length);
  for(let x=0;x<w;x++)for(let c=0;c<4;c++){let sum=0;for(let k=-r;k<=r;k++)sum+=tmp[(coord(k,h)*w+x)*4+c];for(let y=0;y<h;y++){dest[(y*w+x)*4+c]=sum/(2*r+1);sum+=tmp[(coord(y+r+1,h)*w+x)*4+c]-tmp[(coord(y-r,h)*w+x)*4+c];}}
  for(let i=0;i<input.length;i+=4){out[i+3]=dest[i+3];if(dest[i+3])for(let c=0;c<3;c++)out[i+c]=dest[i+c]*255/dest[i+3];}return out;
}
export function gaussianBlur(input,w,h,radius,torus=false){
  if(radius===0)return input.slice();
  const sigma=Math.max(.1,radius/2),r=Math.min(128,Math.ceil(sigma*3)),kernel=[];
  let sum=0;for(let k=-r;k<=r;k++){const v=Math.exp(-k*k/(2*sigma*sigma));kernel.push(v);sum+=v;}for(let i=0;i<kernel.length;i++)kernel[i]/=sum;
  const pre=new Float32Array(input.length),tmp=new Float32Array(input.length),out=new Uint8ClampedArray(input.length);
  for(let i=0;i<input.length;i+=4){pre[i+3]=input[i+3];for(let c=0;c<3;c++)pre[i+c]=input[i+c]*input[i+3]/255;}
  const coord=(v,n)=>torus?((v%n)+n)%n:Math.max(0,Math.min(n-1,v));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++){let v=0;for(let k=-r;k<=r;k++)v+=pre[(y*w+coord(x+k,w))*4+c]*kernel[k+r];tmp[(y*w+x)*4+c]=v;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=[0,0,0,0];for(let k=-r;k<=r;k++)for(let c=0;c<4;c++)v[c]+=tmp[(coord(y+k,h)*w+x)*4+c]*kernel[k+r];const i=(y*w+x)*4;out[i+3]=v[3];if(v[3])for(let c=0;c<3;c++)out[i+c]=v[c]*255/v[3];}
  return out;
}
export function applyFilter(input,w,h,kind,options={}){
  const o={radius:2,amount:1,threshold:0,opacity:100,red:100,green:100,blue:100,hue:0,saturation:100,brightness:0,gamma:1,distance:4,angle:135,color:'#000000',formulaR:'r',formulaG:'g',formulaB:'b',...options};
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||input.length!==w*h*4)throw Error('Некорректный размер изображения');
  for(const key of ['radius','amount','threshold','opacity','red','green','blue','hue','saturation','brightness','gamma','distance','angle'])if(!Number.isFinite(o[key]))throw Error('Некорректный параметр: '+key);
  if(o.radius<0||o.radius>128||o.opacity<0||o.opacity>100||o.gamma<=0||o.threshold<0||o.amount<0)throw Error('Параметр фильтра вне допустимого диапазона');
  if(!/^#[a-f\d]{6}$/i.test(o.color))throw Error('Некорректный цвет фильтра');
  if(!filters.includes(kind))throw Error('Неизвестный фильтр');const out=input.slice();let blurred;
  if(['blurSoft','blurMore','blurCustom','sharpen','unsharpMask','glow','dropShadow','bevel'].includes(kind)){blurred=(o.gaussian?gaussianBlur:blur)(input,w,h,kind==='blurSoft'?1:kind==='blurMore'?3:o.radius,o.torus);}
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
    case'dropShadow':case'glow':{const n=i/4,x=n%w,y=Math.floor(n/w),dx=kind==='glow'?0:Math.round(Math.cos(o.angle*Math.PI/180)*o.distance),dy=kind==='glow'?0:Math.round(Math.sin(o.angle*Math.PI/180)*o.distance),sx=o.torus?((x-dx)%w+w)%w:x-dx,sy=o.torus?((y-dy)%h+h)%h:y-dy;let sa=(sx>=0&&sy>=0&&sx<w&&sy<h?blurred[(sy*w+sx)*4+3]:0)/255*o.opacity/100;if(o.inner){sa=(1-(sx>=0&&sy>=0&&sx<w&&sy<h?blurred[(sy*w+sx)*4+3]:0)/255)*o.opacity/100;c=c.map((v,k)=>v*(1-sa)+tint[k]*sa);}else{const aa=a/255+sa*(1-a/255);c=c.map((v,k)=>aa?(v*a/255+tint[k]*sa*(1-a/255))/aa:0);a=aa*255;}break;}
    case'bevel':{const n=i/4,x=n%w,y=Math.floor(n/w),dx=Math.round(Math.cos(o.angle*Math.PI/180)),dy=Math.round(Math.sin(o.angle*Math.PI/180)),get=(xx,yy)=>xx<0||yy<0||xx>=w||yy>=h?0:blurred[(yy*w+xx)*4+3],light=(get(x+dx,y+dy)-get(x-dx,y-dy))*o.amount;c=c.map(v=>v+light);break;}
  }out.set(c,i);out[i+3]=a;}return out;
}
