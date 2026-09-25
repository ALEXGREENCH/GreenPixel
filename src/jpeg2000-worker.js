import OpenJPEG from './vendor/openjpeg/openjpegjs.js';
const ready=OpenJPEG();
self.onmessage=async({data})=>{
  let codec;
  try{
    const module=await ready;
    if(data.operation==='decode'){
      // Bound allocation before native decode; readHeader() in this build does not populate FrameInfo.
      const b=data.bytes,v=new DataView(b.buffer,b.byteOffset,b.byteLength);let start=0;
      if(b[0]!==255||b[1]!==79){let found=false;for(let at=0;at+8<=b.length;){const size=v.getUint32(at);if(size<8||at+size>b.length)throw Error('JPEG 2000: повреждённый контейнер');if(String.fromCharCode(...b.subarray(at+4,at+8))==='jp2c'){start=at+8;found=true;break;}at+=size;}if(!found)throw Error('JPEG 2000: нет потока');}
      if(start+42>b.length||v.getUint16(start)!==0xff4f||v.getUint16(start+2)!==0xff51)throw Error('JPEG 2000: нет заголовка SIZ');
      const w=v.getUint32(start+8)-v.getUint32(start+16),h=v.getUint32(start+12)-v.getUint32(start+20);
      if(w<1||h<1||w>8192||h>8192||w*h>16777216)throw Error('JPEG 2000: превышен размер');
      codec=new module.J2KDecoder();codec.getEncodedBuffer(data.bytes.length).set(data.bytes);codec.decode();
      const info=codec.getFrameInfo(),{width,height,componentCount,bitsPerSample,isSigned}=info;
      if(!width||!height||width>8192||height>8192||width*height>16777216||![1,3,4].includes(componentCount)||bitsPerSample!==8||isSigned)throw Error('JPEG 2000: поддерживаются 8-битные Gray/RGB/RGBA до 16 млн пикселей');
      const decoded=codec.getDecodedBuffer(),pixels=new Uint8ClampedArray(width*height*4);
      for(let i=0;i<width*height;i++){for(let c=0;c<3;c++)pixels[i*4+c]=decoded[i*componentCount+(componentCount===1?0:c)];pixels[i*4+3]=componentCount===4?decoded[i*componentCount+3]:255;}
      self.postMessage({width,height,pixels},[pixels.buffer]);
    }else{
      const {width,height,pixels}=data;codec=new module.J2KEncoder();
      codec.setDecompositions(Math.min(5,Math.floor(Math.log2(Math.min(width,height)))));codec.setQuality(true,1);
      codec.getDecodedBuffer({width,height,bitsPerSample:8,componentCount:3,isSigned:false}).set(Uint8Array.from({length:width*height*3},(_,i)=>pixels[Math.floor(i/3)*4+i%3]));codec.encode();const bytes=codec.getEncodedBuffer().slice();
      if(bytes.length<4||bytes[0]!==255||bytes[1]!==79||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)throw Error('JPEG 2000: кодировщик не создал полный поток');
      self.postMessage({bytes},[bytes.buffer]);
    }
  }catch(error){self.postMessage({error:String(error.message||error)});}finally{codec?.delete();}
};
