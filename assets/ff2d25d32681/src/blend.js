export const modes=['normal','mask','behind','dissolve','hue','hueShift','saturation','darken','multiply','colorBurn','linearBurn','darkerColor','lighten','screen','colorDodge','linearDodge','lighterColor','overlay','softLight','hardLight','vividLight','linearLight','pinLight','hardMix','difference','exclusion'];
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// Original ColSpaces.pas calls this HSB, but B is (max+min)/2: HSL lightness.
export function hsl(color){const [r,g,b]=color.map(v=>v/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo,l=(hi+lo)/2;let h=0;if(d)h=(hi===r?(g-b)/d+(g<b?6:0):hi===g?(b-r)/d+2:(r-g)/d+4)/6;return [h,d?d/(1-Math.abs(2*l-1)):0,l];}
export function rgbHsl([h,s,l]){h=((h%1)+1)%1;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h*6%2-1)),m=l-c/2;const values=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h*6)];return values.map(v=>Math.round((v+m)*255));}
export function hsv(rgb){const [r,g,b]=rgb.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d)h=(max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)/6;return [h,max===0?0:d/max,max];}
export function rgb([h,s,v]){h=((h%1)+1)%1;const i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);return [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i%6].map(x=>Math.round(x*255));}
function channel(b,s,m){switch(m){case'darken':return Math.min(b,s);case'multiply':return b*s;case'colorBurn':return s===0?0:1-Math.min(1,(1-b)/s);case'linearBurn':return clamp(b+s-1);case'lighten':return Math.max(b,s);case'screen':return b+s-b*s;case'colorDodge':return s===1?1:Math.min(1,b/(1-s));case'linearDodge':return Math.min(1,b+s);case'overlay':return b<=.5?2*b*s:1-2*(1-b)*(1-s);case'hardLight':return channel(s,b,'overlay');case'softLight':return s<=.5?b-(1-2*s)*b*(1-b):b+(2*s-1)*((b<=.25?((16*b-12)*b+4)*b:Math.sqrt(b))-b);case'vividLight':return s<.5?channel(b,2*s,'colorBurn'):channel(b,2*s-1,'colorDodge');case'linearLight':return clamp(b+2*s-1);case'pinLight':return s<.5?Math.min(b,2*s):Math.max(b,2*s-1);case'hardMix':return channel(b,s,'vividLight')<.5?0:1;case'difference':return Math.abs(b-s);case'exclusion':return b+s-2*b*s;default:return s;}}
export function blendPixel(out,i,src,j,opacity=1,mode='normal',seed=0){
  let a=src[j+3]/255*opacity,b=out[i+3]/255;
  if(mode==='mask'){out[i+3]*=a;return;}
  if(mode==='dissolve'){const random=((Math.imul(seed+1,1664525)+1013904223)>>>0)/4294967296;a=random<a?1:0;}
  if(!a)return;
  let mixed;
  if(['hue','hueShift','saturation'].includes(mode)){const hs=hsl([...src.slice(j,j+3)]),hb=hsl([...out.slice(i,i+3)]);if(mode==='saturation')hb[1]=hs[1];else if(hs[1])hb[0]=mode==='hue'?hs[0]:hb[0]+hs[0];mixed=rgbHsl(hb).map(v=>v/255);}
  if(mode==='darkerColor'||mode==='lighterColor'){const sl=src[j]+src[j+1]+src[j+2],bl=out[i]+out[i+1]+out[i+2];mixed=Array.from((mode==='darkerColor'?sl<bl:sl>bl)?src.slice(j,j+3):out.slice(i,i+3),v=>v/255);}
  const alpha=a+b*(1-a);
  for(let c=0;c<3;c++){const s=src[j+c]/255,d=out[i+c]/255;out[i+c]=255*(mode==='behind'?(d*b+s*a*(1-b))/alpha:(a*((1-b)*s+b*(mixed?.[c]??channel(d,s,mode)))+d*b*(1-a))/alpha);}
  out[i+3]=alpha*255;
}
