import test from 'node:test';import assert from 'node:assert/strict';
import {document,layer} from '../src/model.js';
import {encodeICO,decodeICO,encodeANI,decodeANI} from '../src/codecs.js';
import {cursorComposite} from '../src/cursor-composite.js';
import {encodeBMP,decodeBMP} from '../src/binary.js';
function fixture(){const d=document(4,1),p=d.pages[0],l=p.layers[0];l.pixels.set([0,0,0,255,255,255,255,255,255,255,255,0,0,0,0,0]);l.inverted[3]=1;p.hotSpot={x:3,y:0};return d;}
test('ICO/CUR preserve black, white, transparent and screen inversion even below PNG threshold',async()=>{
 for(const cursor of [false,true]){const d=fixture(),encoded=await encodeICO(d,cursor,1),v=new DataView(encoded.buffer),offset=v.getUint32(18,true);assert.equal(v.getUint32(offset,true),40);assert.equal(v.getUint16(offset+14,true),24);
 const p=(await decodeICO(encoded)).pages[0],l=p.layers[0];assert.deepEqual([...l.inverted],[0,0,0,1]);assert.deepEqual([...l.pixels.slice(0,12)],[0,0,0,255,255,255,255,255,0,0,0,0]);if(cursor)assert.deepEqual(p.hotSpot,{x:3,y:0});
 // Independent Windows truth table on byte planes: (screen AND mask) XOR color.
 const mask=encoded[offset+40+12];assert.equal(mask,0x30);for(const screen of [0,51,127,255]){const rendered=Array.from({length:4},(_,x)=>(screen&((mask&(128>>x))?255:0))^encoded[offset+40+x*3]);assert.deepEqual(rendered,[0,255,screen,255-screen]);}
 }
});
test('cursor composition respects visibility, opacity zero, opaque cover and double inversion',()=>{
 const d=fixture(),p=d.pages[0],top=layer(4,1);p.layers.push(top);top.inverted[3]=1;assert.equal(cursorComposite(p).inverted[3],0);
 top.visible=false;assert.equal(cursorComposite(p).inverted[3],1);top.visible=true;top.opacity=0;assert.equal(cursorComposite(p).inverted[3],1);
 top.opacity=255;top.inverted.fill(0);top.pixels.set([20,30,40,255],12);assert.equal(cursorComposite(p).inverted[3],0);assert.deepEqual([...cursorComposite(p).pixels.slice(12)],[20,30,40,255]);
});
test('floating inversion retains its location and PNG cannot silently erase it',async()=>{
 const d=document(2,1),p=d.pages[0];p.floating={width:1,height:1,x:1,y:0,layerId:p.layers[0].id,pixels:new Uint8ClampedArray(4),inverted:new Uint8Array([1])};const result=await decodeICO(await encodeICO(d,true,1));assert.deepEqual([...result.pages[0].layers[0].inverted],[0,1]);
});
test('inversion with fractional alpha rejects lossy conversion',async()=>{const d=fixture();d.pages[0].layers[0].pixels[3]=128;await assert.rejects(()=>encodeICO(d,true),/полупрозрачность/);});
test('transparent white must not become inversion when exporting ordinary 24-bit DIB',()=>{const im={width:1,height:1,pixels:new Uint8ClampedArray([255,255,255,0])};const out=decodeBMP(encodeBMP(im,24,true,true),true,true);assert.equal(out.inverted[0],0);assert.equal(out.pixels[3],0);});
test('ANI retains screen inversion and cursor hotspot in frame containers',async()=>{const d=fixture();d.pages[0].duration=100;const p=(await decodeANI(await encodeANI(d))).pages[0];assert.deepEqual([...p.layers[0].inverted],[0,0,0,1]);assert.deepEqual(p.hotSpot,{x:3,y:0});assert.equal(p.duration,100);});
import {readFileSync} from 'node:fs';
test('original Select.cur preserves its 21 inverted pixels and hotspot',async()=>{
 const d=await decodeICO(readFileSync(new URL('../reference/Samples/Select.cur',import.meta.url))),p=d.pages[0];assert.equal(p.layers[0].inverted.reduce((n,v)=>n+v,0),21);
 const q=(await decodeICO(await encodeICO(d,true,1))).pages[0];assert.deepEqual(q.hotSpot,p.hotSpot);assert.deepEqual(q.layers[0].inverted,p.layers[0].inverted);for(let i=0;i<p.layers[0].pixels.length;i+=4)if(p.layers[0].pixels[i+3])assert.deepEqual(q.layers[0].pixels.slice(i,i+4),p.layers[0].pixels.slice(i,i+4));
});
test('original Progress.ani retains all twelve frames and timings',async()=>{
 const d=await decodeANI(readFileSync(new URL('../reference/Samples/Progress.ani',import.meta.url))),q=await decodeANI(await encodeANI(d));assert.equal(q.pages.length,12);assert.deepEqual(q.pages.map(p=>[p.duration,p.hotSpot]),d.pages.map(p=>[p.duration,p.hotSpot]));
});
