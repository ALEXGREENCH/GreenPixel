import {JpxImage} from './vendor/jpeg2000/src/jpx.js';
// The native wrapper rejects four components. Preserve all channels, including
// ICNS alpha, instead of dropping the failing page or reducing it to RGB.
export function decodeFourComponentJ2K(bytes,width,height){
  const image=new JpxImage();image.failOnCorruptedImage=true;image.parse(bytes);
  if(image.width!==width||image.height!==height||image.componentsCount!==4)throw Error('JPEG 2000: некорректные размеры или каналы RGBA');
  const pixels=new Uint8ClampedArray(width*height*4);
  let count=0;
  for(const tile of image.tiles){
    if(tile.left<0||tile.top<0||tile.left+tile.width>width||tile.top+tile.height>height||tile.items.length!==tile.width*tile.height*4)throw Error('JPEG 2000: повреждённый блок RGBA');
    for(let y=0;y<tile.height;y++)pixels.set(tile.items.subarray(y*tile.width*4,(y+1)*tile.width*4),((tile.top+y)*width+tile.left)*4);
    count+=tile.width*tile.height;
  }
  if(count!==width*height)throw Error('JPEG 2000: неполное изображение RGBA');
  return {width,height,pixels};
}
