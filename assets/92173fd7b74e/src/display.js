import {composite} from './model.js';
import {cursorComposite} from './cursor-composite.js';

// Keep screen-dependent pixels out of the ordinary RGBA display surface.
export function displayPlanes(page){
 const special=page.layers.some(l=>l.visible&&l.opacity&&l.inverted?.some(Boolean))||page.floating?.inverted?.some(Boolean);
 if(!special)return {pixels:composite(page),inversion:null,warning:null};
 try{
  const result=cursorComposite(page),inversion=new Uint8ClampedArray(page.width*page.height*4);
  for(let n=0;n<result.inverted.length;n++)if(result.inverted[n])inversion.fill(255,n*4,n*4+4);
  return {pixels:result.pixels,inversion,warning:null};
 }catch{
  return {pixels:composite(page),inversion:null,warning:'Отображение инверсии с масками, режимами смешивания или полупрозрачностью пока приближённое'};
 }
}
