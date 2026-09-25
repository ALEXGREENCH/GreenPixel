import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {icnsChunks,indexedICNS,encodeIndexedICNS,indexedTypes} from '../src/icns.js';
import {mac16,mac256} from '../src/icns-palettes.js';
const bluecat=icnsChunks(readFileSync(new URL('../reference/Samples/Bluecat.icns',import.meta.url)));
test('Bluecat exposes six indexed variants in file order, with one-bit masks',()=>{
 const images=indexedICNS(bluecat);assert.deepEqual(images.map(x=>x.type),['ics#','ics4','ics8','ich#','ich4','ich8']);
 for(const im of images){assert.equal(im.pixels[3],0);assert.ok(im.pixels.some((v,i)=>i%4===3&&v===255));const encoded=encodeIndexedICNS(im,im.type);const roundtrip=indexedICNS(encoded).find(x=>x.type===im.type);assert.deepEqual(roundtrip.pixels,im.pixels);}
});
for(const [type,spec]of Object.entries(indexedTypes))test('ICNS indexed '+type+': palette bit order and transparent mask',()=>{
 const n=spec.width*spec.height,bits=spec.bits,data=new Uint8Array(n*bits/8*(bits===1?2:1)),mask=new Uint8Array(n/4);mask.fill(255,n/8);mask[n/8]&=0x7f;
 if(bits===1){data[0]=0x40;data.set(mask.subarray(n/8),n/8);}else if(bits===4)data[0]=0x12;else{data[0]=1;data[1]=2;}
 const chunks=[{type,data}];if(bits!==1)chunks.push({type:spec.mask,data:mask});
 const im=indexedICNS(chunks).find(x=>x.type===type);assert.deepEqual([...im.pixels.slice(0,4)],[0,0,0,0]);assert.deepEqual([...im.pixels.slice(4,8)],bits===1?[0,0,0,255]:[...(bits===4?mac16:mac256)[2],255]);
 assert.throws(()=>indexedICNS([{type,data:data.slice(1)}]));
});
test('indexed ICNS refuses silent alpha/color loss',()=>{
 const im=indexedICNS(bluecat).find(x=>x.type==='ics4');im.pixels.set([1,2,3,255],0);assert.throws(()=>encodeIndexedICNS(im,'ics4'),/палитре/);im.pixels.set([255,255,255,128],0);assert.throws(()=>encodeIndexedICNS(im,'ics4'),/полупрозрачность/);
});
import {legacyICNS} from '../src/icns.js';
import {imagePage,encodeICNS} from '../src/codecs.js';
import {document as makeDocument,parse,serialize} from '../src/model.js';
test('all eight legacy Bluecat pages save together and reopen without pixel loss',async()=>{
 const images=[...indexedICNS(bluecat),...legacyICNS(bluecat)],doc=makeDocument();doc.pages=images.map(im=>Object.assign(imagePage(im),{icnsType:im.type}));
 const restored=parse(serialize(doc));assert.deepEqual(restored.pages.map(p=>p.icnsType),doc.pages.map(p=>p.icnsType));
 const chunks=icnsChunks(await encodeICNS(restored)),decoded=[...indexedICNS(chunks),...legacyICNS(chunks)];
 assert.equal(decoded.length,8);for(const image of images)assert.deepEqual(decoded.find(x=>x.type===image.type).pixels,image.pixels);
});
test('ICNS export rejects incompatible shared masks instead of silently replacing one',async()=>{
 const images=indexedICNS(bluecat).filter(im=>['ics#','ics4'].includes(im.type));const d=makeDocument();d.pages=images.map(im=>Object.assign(imagePage(im),{icnsType:im.type}));
 d.pages[1].layers[0].pixels.set([255,255,255,255],0);
 await assert.rejects(()=>encodeICNS(d),/разные общие маски/);
});
