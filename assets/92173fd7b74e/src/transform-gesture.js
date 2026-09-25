import {transformImage} from './transform.js';
export function transformFloating(source,handle,start,current,proportional=false,smooth=false){
 const cx=source.x+source.width/2,cy=source.y+source.height/2;
 if(handle==='rotate'){
  let angle=Math.atan2(current[1]-cy,current[0]-cx)-Math.atan2(start[1]-cy,start[0]-cx);
  if(proportional)angle=Math.round(angle/(Math.PI/12))*Math.PI/12;
  const image=transformImage(source,source.width,source.height,angle,smooth);
  return {...source,...image,x:Math.round(cx-image.width/2),y:Math.round(cy-image.height/2),angle:0};
 }
 const dx=current[0]-start[0],dy=current[1]-start[1];
 let width=Math.max(1,Math.round(source.width+(handle.includes('w')?-dx:handle.includes('e')?dx:0))),height=Math.max(1,Math.round(source.height+(handle.includes('n')?-dy:handle.includes('s')?dy:0)));
 if(proportional){let scale;if(handle==='n'||handle==='s')scale=height/source.height;else if(handle==='e'||handle==='w')scale=width/source.width;else scale=Math.abs(width/source.width-1)>=Math.abs(height/source.height-1)?width/source.width:height/source.height;width=Math.max(1,Math.round(source.width*scale));height=Math.max(1,Math.round(source.height*scale));}
 const x=handle.includes('w')?source.x+source.width-width:proportional&&!handle.includes('e')?Math.round(cx-width/2):source.x;
 const y=handle.includes('n')?source.y+source.height-height:proportional&&!handle.includes('s')?Math.round(cy-height/2):source.y;
 return {...source,...transformImage(source,width,height,0,smooth),x,y,angle:0};
}
