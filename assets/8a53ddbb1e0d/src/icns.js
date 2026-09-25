import {mac16,mac256} from './icns-palettes.js';
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
    result.push({type,width:w,height:w,pixels});
  }
  return result;
}

// Original ICNS.pas loads every image record, including multiple depths of one size.
export const indexedTypes={};
for(const [prefix,mask,w,h]of [['ics','ics#',16,16],['icl','ICN#',32,32],['ich','ich#',48,48],['icm','icm#',16,12]]){
  indexedTypes[mask]={width:w,height:h,bits:1,mask};
  for(const bits of [4,8])indexedTypes[prefix+bits]={width:w,height:h,bits,mask};
}
export function indexedICNS(chunks){
  return chunks.filter(c=>indexedTypes[c.type]).map(({type,data})=>{
    const {width,height,bits,mask}=indexedTypes[type],n=width*height,plane=n/8;
    if(data.length!==n*bits/8*(bits===1?2:1))throw Error('ICNS '+type+': неверный размер индексированных данных');
    const maskData=chunks.find(c=>c.type===mask)?.data;
    if(maskData&&maskData.length!==plane*2)throw Error('ICNS '+mask+': неверный размер маски');
    const pixels=new Uint8ClampedArray(n*4),palette=bits===4?mac16:mac256;
    for(let i=0;i<n;i++){
      const color=bits===1?((data[i>>3]>>(7-(i&7)))&1?[0,0,0]:[255,255,255]):palette[bits===8?data[i]:(data[i>>1]>>((i&1)?0:4))&15];
      const alpha=!maskData||((maskData[plane+(i>>3)]>>(7-(i&7)))&1)?255:0;
      // Original clears all channels of transparent indexed pixels.
      if(alpha)pixels.set([...color,alpha],i*4);
    }
    return {type,width,height,pixels};
  });
}
export function encodeIndexedICNS(image,type){
  const spec=indexedTypes[type];if(!spec||image.width!==spec.width||image.height!==spec.height)throw Error('ICNS: размер не соответствует '+type);
  const {bits,mask}=spec,n=image.width*image.height,plane=n/8,palette=bits===1?[[255,255,255],[0,0,0]]:bits===4?mac16:mac256;
  const lookup=new Map(palette.map((c,i)=>[c.join(','),i])),data=new Uint8Array(n*bits/8*(bits===1?2:1)),maskData=new Uint8Array(plane*2);
  for(let i=0;i<n;i++){
    const a=image.pixels[i*4+3];if(a!==0&&a!==255)throw Error('ICNS '+type+': полупрозрачность нельзя сохранить в индексированной странице');
    const index=a?lookup.get(Array.from(image.pixels.subarray(i*4,i*4+3)).join(',')):0;
    if(index===undefined)throw Error('ICNS '+type+': цвет отсутствует в палитре Macintosh');
    if(bits===8)data[i]=index;else if(bits===4)data[i>>1]|=index<<((i&1)?0:4);else data[i>>3]|=index<<(7-(i&7));
    if(a)maskData[plane+(i>>3)]|=1<<(7-(i&7));
  }
  if(bits===1){data.set(maskData.subarray(plane),plane);return [{type,data}];}
  return [{type,data},{type:mask,data:maskData,maskOnly:true}];
}
// Emit literal RLE packets (up to 128 samples) for broad legacy-reader support.
export function encodeLegacyRGB(pixels,width,height,type){
 const n=width*height,out=type==='it32'?[0,0,0,0]:[];
 for(let c=0;c<3;c++)for(let start=0;start<n;start+=128){const count=Math.min(128,n-start);out.push(count-1);for(let j=0;j<count;j++)out.push(pixels[(start+j)*4+c]);}
 return new Uint8Array(out);
}
