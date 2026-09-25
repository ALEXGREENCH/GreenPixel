// Deterministic 4x4 area sampling for antialiased raster edges.
export function coverageAt(x,y,contains,smooth=true){
 if(!smooth)return contains(x+.5,y+.5)?1:0;
 let count=0;for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++)if(contains(x+(sx+.5)/4,y+(sy+.5)/4))count++;
 return count/16;
}
export function brushCoverage(dx,dy,size,shape,smooth){
 const half=Math.floor(size/2);
 if(shape==='spray')return Math.random()<.18?1:0;
 return coverageAt(dx,dy,(x,y)=>{
  const u=(x-size/2)/(size/2),v=(y-size/2)/(size/2);
  if(shape==='round')return u*u+v*v<=1;
  if(shape==='slash')return Math.abs(x+y-size)<=1;
  if(shape==='backslash')return Math.abs(x-y)<=1;
  if(shape==='horizontal')return Math.floor(y)===half;
  if(shape==='vertical')return Math.floor(x)===half;
  return true;
 },smooth);
}
export function shapeCoverage(p,a,b,kind,filled=true,width=1,smooth=true){
 const mask=new Uint8Array(p.width*p.height),left=Math.min(a[0],b[0]),right=Math.max(a[0],b[0])+1,top=Math.min(a[1],b[1]),bottom=Math.max(a[1],b[1])+1;
 const cx=(left+right)/2,cy=(top+bottom)/2,rx=(right-left)/2,ry=(bottom-top)/2;
 const contains=(x,y)=>{
  if(kind==='line'){
   const vx=b[0]-a[0],vy=b[1]-a[1],length=vx*vx+vy*vy,t=length?Math.max(0,Math.min(1,((x-a[0]-.5)*vx+(y-a[1]-.5)*vy)/length)):0;
   return (x-a[0]-.5-t*vx)**2+(y-a[1]-.5-t*vy)**2<=(width/2)**2;
  }
  if(kind==='ellipse'){
   if(((x-cx)/rx)**2+((y-cy)/ry)**2>1)return false;
   return filled||rx<=width||ry<=width||((x-cx)/(rx-width))**2+((y-cy)/(ry-width))**2>=1;
  }
  return x>=left&&x<right&&y>=top&&y<bottom&&(filled||x<left+width||x>=right-width||y<top+width||y>=bottom-width);
 };
 const pad=kind==='line'?Math.ceil(width/2):0;
 for(let y=Math.max(0,top-pad);y<Math.min(p.height,bottom+pad);y++)for(let x=Math.max(0,left-pad);x<Math.min(p.width,right+pad);x++)mask[y*p.width+x]=Math.round(255*coverageAt(x,y,contains,smooth));
 return mask;
}
