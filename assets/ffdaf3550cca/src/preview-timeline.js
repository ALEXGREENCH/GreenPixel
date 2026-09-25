// Zero duration is a still page (original Help/English/animation.html).
export function frameAt(pages,start,elapsed){
 let index=Math.max(0,Math.min(pages.length-1,start)),time=Math.max(0,elapsed);
 const total=pages.reduce((sum,p)=>sum+Math.max(0,p.duration||0),0);
 if(pages.every(p=>p.duration>0)&&total)time%=total;
 for(let n=0;n<pages.length;n++){
  const duration=pages[index].duration||0;
  if(duration<=0||time<duration)return index;
  time-=duration;index=(index+1)%pages.length;
 }
 return index;
}
export function testPoint(rect,width,height,clientX,clientY){
 return {x:(clientX-rect.left)*width/rect.width,y:(clientY-rect.top)*height/rect.height};
}
export function cursorOrigin(point,page){return {x:Math.round(point.x)-(page.hotSpot?.x||0),y:Math.round(point.y)-(page.hotSpot?.y||0)};}
