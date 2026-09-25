import {bytes,concat,utf8,text} from './binary.js';
export const modernSizes={icp4:16,icp5:32,icp6:64,ic07:128,ic08:256,ic09:512,ic10:1024,ic11:32,ic12:64,ic13:256,ic14:512};
export function icnsChunks(buffer){
  const b=bytes(buffer),v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=[];
  if(b.length<8||text.decode(b.slice(0,4))!=='icns'||v.getUint32(4)!==b.length)throw Error('Некорректный ICNS');
  for(let at=8;at<b.length;){if(at+8>b.length)throw Error('Обрезанный ICNS');const size=v.getUint32(at+4);if(size<8||at+size>b.length)throw Error('Обрезанный элемент ICNS');out.push({type:text.decode(b.slice(at,at+4)),data:b.slice(at+8,at+size)});at+=size;}
  return out;
}
export function icnsPack(chunks){const pack=(type,data)=>{const h=new Uint8Array(8);h.set(utf8.encode(type));new DataView(h.buffer).setUint32(4,8+data.length);return concat([h,data]);};return pack('icns',concat(chunks.map(c=>pack(c.type,c.data))));}
export function legacyICNS(chunks){
  const result=[];
  for(const [type,maskType,w] of [['is32','s8mk',16],['il32','l8mk',32],['ih32','h8mk',48],['it32','t8mk',128]]){
    const data=chunks.find(c=>c.type===type)?.data;if(!data)continue;
    const mask=chunks.find(c=>c.type===maskType)?.data,n=w*w,pixels=new Uint8ClampedArray(n*4);
    if(mask&&mask.length!==n)throw Error('Некорректная маска ICNS');
    let at=w===128?4:0;
    if(data.length===n*4){for(let i=0;i<n;i++)pixels.set(data.subarray(i*4+1,i*4+4),i*4);}
    else for(let c=0;c<3;c++){let i=0;while(i<n){if(at>=data.length)throw Error('Обрезанный ICNS RLE');const code=data[at++],run=code<128?code+1:code-125;if(i+run>n||at+(code<128?run:1)>data.length)throw Error('Некорректный ICNS RLE');if(code<128)for(let j=0;j<run;j++)pixels[(i++)*4+c]=data[at++];else{const value=data[at++];for(let j=0;j<run;j++)pixels[(i++)*4+c]=value;}}}
    for(let i=0;i<n;i++)pixels[i*4+3]=mask?mask[i]:255;
    result.push({width:w,height:w,pixels});
  }
  return result;
}
