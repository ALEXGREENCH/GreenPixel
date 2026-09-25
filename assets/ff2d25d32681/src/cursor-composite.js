import {blendPixel} from './blend.js';
// Cursor screen inversion is a separate state, not an RGBA color.
// Preserve exact AND/XOR semantics; do not approximate unsupported alpha mixes.
export function cursorComposite(page){
 if(page.layers.some(l=>l.visible&&l.blendMode==='mask'))throw Error('CUR/ICO: экспорт экранной инверсии со слоями-масками пока не поддерживается');
 const size=page.width*page.height,pixels=new Uint8ClampedArray(size*4),inverted=new Uint8Array(size);
 for(const layer of page.layers){
  if(!layer.visible||layer.opacity===0)continue;
  let data=layer.pixels,inv=layer.inverted;
  const f=page.floating;
  if(f&&(f.layerId===layer.id||!f.layerId&&layer===page.layers.findLast(l=>l.selected))){
   data=data.slice();inv=inv.slice();
   for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
    const dx=x+f.x,dy=y+f.y;if(dx<0||dy<0||dx>=page.width||dy>=page.height)continue;
    const n=dy*page.width+dx,k=y*f.width+x;
    if(f.inverted?.[k]){inv[n]=1;data.fill(0,n*4,n*4+4);}else if(f.pixels[k*4+3]){if(inv[n]&&f.pixels[k*4+3]!==255)throw Error('CUR/ICO: полупрозрачное выделение поверх инверсии нельзя сохранить без потерь');blendPixel(data,n*4,f.pixels,k*4);inv[n]=0;}
   }
  }
  for(let n=0;n<size;n++){
   const i=n*4,a=data[i+3]*layer.opacity/255;
   if(inv[n]){
    if(layer.opacity!==255||layer.blendMode!=='normal')throw Error('CUR/ICO: инвертирующий слой требует Normal и непрозрачность 255');
    if(inverted[n]){inverted[n]=0;pixels.fill(0,i,i+4);}
    else if(pixels[i+3]===0){inverted[n]=1;pixels.fill(0,i,i+4);}
    else if(pixels[i+3]===255){for(let c=0;c<3;c++)pixels[i+c]=255-pixels[i+c];}
    else throw Error('CUR/ICO: инверсия поверх полупрозрачности не представима маской AND/XOR');
   }else if(a){
    if(inverted[n]){if(a!==255||layer.blendMode!=='normal')throw Error('CUR/ICO: смешивание с инверсией не представимо маской AND/XOR');inverted[n]=0;}
    blendPixel(pixels,i,data,i,layer.opacity/255,layer.blendMode,n);
   }
  }
 }
 return {width:page.width,height:page.height,pixels,inverted};
}
