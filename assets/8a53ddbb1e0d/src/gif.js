import {GifReader,GifWriter} from './vendor/omggif/omggif.js';
import {document as newDocument, page, composite, dimensions} from './model.js';

export function decodeGIF(bytes){
  const reader=new GifReader(bytes);dimensions(reader.width,reader.height);
  const count=reader.numFrames();
  if(!count||reader.width*reader.height*count*5>512*1024*1024)throw Error('GIF превышает лимит памяти');
  const doc=newDocument();doc.pages=[];doc.metadata.loopCount=reader.loopCount()??1;
  let pixels=new Uint8ClampedArray(reader.width*reader.height*4);
  for(let i=0;i<count;i++){
    const info=reader.frameInfo(i),previous=pixels.slice();
    reader.decodeAndBlitFrameRGBA(i,pixels);
    const p=page(reader.width,reader.height);p.layers[0].pixels=pixels.slice();p.duration=info.delay*10;doc.pages.push(p);
    if(info.disposal===2)for(let y=info.y;y<info.y+info.height;y++)pixels.fill(0,(y*reader.width+info.x)*4,(y*reader.width+info.x+info.width)*4);
    else if(info.disposal===3)pixels=previous;
  }
  return doc;
}

function indexed(pixels){
  const colors=new Map();let transparent=false;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)transparent=true;else colors.set((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2],0);}
  const palette=transparent?[0]:[],indices=new Uint8Array(pixels.length/4);
  if(colors.size<=256-palette.length){for(const c of colors.keys()){colors.set(c,palette.length);palette.push(c);}for(let i=0;i<indices.length;i++)indices[i]=pixels[i*4+3]<128?0:colors.get((pixels[i*4]<<16)|(pixels[i*4+1]<<8)|pixels[i*4+2]);}
  else {
    for(let r=0;r<6;r++)for(let g=0;g<6;g++)for(let b=0;b<6;b++)palette.push((r*51<<16)|(g*51<<8)|b*51);
    for(let i=0;i<indices.length;i++)indices[i]=pixels[i*4+3]<128?0:(transparent?1:0)+Math.round(pixels[i*4]/51)*36+Math.round(pixels[i*4+1]/51)*6+Math.round(pixels[i*4+2]/51);
  }
  while(palette.length<2||palette.length&(palette.length-1))palette.push(0);
  return {palette,indices,transparent:transparent?0:undefined};
}
export function encodeGIF(doc){
  const w=doc.pages[0].width,h=doc.pages[0].height;
  if(doc.pages.some(p=>p.width!==w||p.height!==h))throw Error('Для GIF размеры кадров должны совпадать');
  const capacity=doc.pages.length*(w*h*2+2048)+1024;
  if(capacity>512*1024*1024)throw Error('GIF превышает лимит памяти');
  const buffer=new Uint8Array(capacity),writer=new GifWriter(buffer,w,h,{loop:Math.min(65535,Math.max(0,doc.metadata.loopCount||0))});
  for(const p of doc.pages){const data=indexed(composite(p));writer.addFrame(0,0,w,h,data.indices,{palette:data.palette,transparent:data.transparent,delay:Math.min(65535,Math.max(0,Math.round(p.duration/10))),disposal:2});}
  const length=writer.end();if(length>buffer.length)throw Error('Недостаточно памяти для GIF');return buffer.slice(0,length);
}
