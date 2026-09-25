import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {document as doc,layer,clone,History,serialize,parse,resizePage,composite} from '../src/model.js';
import {paint,combineSelection,floatSelection,anchor,region} from '../src/raster.js';
import {evaluate} from '../src/expression.js';
import {gfTree,gfWrite,encodeBMP,decodeBMP,encodePCX,decodePCX,encodeXPM,decodeXPM} from '../src/binary.js';
import {encodeGIF,decodeGIF} from '../src/gif.js';
import {filters,applyFilter} from '../src/filters.js';
import {modes,blendPixel} from '../src/blend.js';
import {readRES,writeRES,readPE,writePE,emptyPE,validateResources} from '../src/resources.js';
import {icnsChunks,icnsPack,legacyICNS} from '../src/icns.js';
import {decodePalette,encodePalette} from '../src/palette.js';
import {transformImage,rotatePage} from '../src/transform.js';
import {library,addIconResources,extractResource} from '../src/library.js';

test('restricted expressions: precedence, functions, rejected JS and nonfinite results',()=>{
  assert.equal(evaluate('-2^2 + sqrt(16)*3'),8);
  assert.equal(evaluate('2^3^2'),512);
  assert.equal(evaluate('r * 2',{r:12}),24);
  for(const value of ['globalThis','constructor(1)','1;2','1/0','sqrt(-1)','a.b',''])assert.throws(()=>evaluate(value));
});
test('painting selected invisible layers, mask, inversion and absent selection',()=>{
  const p=doc(2,1).pages[0];p.layers.push(layer(2,1));p.layers[0].visible=false;p.selection=new Uint8Array([255,0]);
  paint(p,0,0,[255,0,0,255]);paint(p,1,0,[255,0,0,255]);
  for(const l of p.layers)assert.deepEqual([...l.pixels],[255,0,0,255,0,0,0,0]);
  paint(p,0,0,[0,0,0,0],{inverted:true});assert.equal(p.layers[0].inverted[0],1);
  p.layers.forEach(l=>l.selected=false);const before=clone(p);paint(p,0,0,[0,255,0,255]);assert.deepEqual(p,before);
});
test('selection operations and floating cut/move/anchor',()=>{
  const p=doc(3,1).pages[0];paint(p,0,0,[255,0,0,255]);
  combineSelection(p,new Uint8Array([255,0,0]));combineSelection(p,new Uint8Array([0,255,0]),'add');
  assert.deepEqual([...p.selection],[255,255,0]);combineSelection(p,new Uint8Array([0,255,0]),'subtract');
  const f=floatSelection(p);assert.equal(p.layers[0].pixels[3],0);f.x=2;anchor(p);assert.equal(p.layers[0].pixels[11],255);assert.equal(p.floating,null);
});
test('history restores bytes and masks, redo branching',()=>{
  let d=doc(2,1);const h=new History(),a=clone(d);paint(d.pages[0],0,0,[10,20,30,255]);h.record(a,d,'Draw');
  assert.equal(h.undoStack[0].kind,'delta');d=h.undo(d);assert.deepEqual(d.pages[0].layers[0].pixels,a.pages[0].layers[0].pixels);
  d=h.redo(d);assert.equal(d.pages[0].layers[0].pixels[0],10);d=h.undo(d);const b=clone(d);paint(d.pages[0],1,0,[30,20,10,255]);h.record(b,d,'Other');assert.equal(h.redoStack.length,0);
});
test('project roundtrip retains pages, selection, inversion, metadata',()=>{
  const d=doc(2,1);d.pages[0].layers[0].inverted[0]=1;d.pages[0].selection=new Uint8Array([255,0]);d.memo='test';
  const restored=parse(serialize(d));restored.id=d.id;assert.deepEqual(restored,d);
  const broken=JSON.parse(serialize(d));broken.document.pages[0].layers[0].pixels=[];assert.throws(()=>parse(JSON.stringify(broken)));
});
test('resize preserves inverted pixels separately',()=>{
  const p=doc(2,1).pages[0];p.layers[0].inverted[1]=1;resizePage(p,4,2,true);assert.deepEqual([...p.layers[0].inverted],[0,0,1,1,0,0,1,1]);
});
test('original GFIE trees parse and reserialize byte-exactly',()=>{
  const files=readdirSync(new URL('../reference/Samples/',import.meta.url)).filter(n=>n.toLowerCase().endsWith('.gfie'));assert.ok(files.length);
  for(const file of files){const bytes=readFileSync(new URL('../reference/Samples/'+file,import.meta.url));assert.deepEqual(Buffer.from(gfWrite(gfTree(bytes))),bytes);assert.throws(()=>gfTree(bytes.subarray(0,bytes.length-1)));}
});
test('BMP, PCX, XPM preserve opaque RGB across roundtrips',()=>{
  const im={width:3,height:2,pixels:new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,255,255,192,193,194,255,0,0,0,255,255,255,255,255])};
  for(const [encode,decode] of [[encodeBMP,decodeBMP],[encodePCX,decodePCX],[encodeXPM,decodeXPM]]){const result=decode(encode(im));assert.equal(result.width,3);assert.equal(result.height,2);assert.deepEqual(result.pixels,im.pixels);}
});
test('GIF preserves separate frames, binary alpha, delay units and repeat count',()=>{
  const d=doc(2,1);paint(d.pages[0],0,0,[255,0,0,255]);d.pages[0].duration=70;d.pages.push(clone(d.pages[0]));d.pages[1].layers[0].pixels.set([0,0,0,0,0,255,0,255]);d.pages[1].duration=130;d.metadata.loopCount=3;
  const result=decodeGIF(encodeGIF(d));assert.equal(result.pages.length,2);assert.equal(result.metadata.loopCount,3);
  for(let i=0;i<2;i++){assert.deepEqual(result.pages[i].layers[0].pixels,d.pages[i].layers[0].pixels);assert.equal(result.pages[i].duration,d.pages[i].duration);}
});
test('all filters return finite bytes without mutating input (not original golden tests)',()=>{
  const input=new Uint8ClampedArray([255,10,40,255,100,120,140,128,0,0,0,0,0,255,0,255]),before=input.slice();assert.equal(filters.length,19);
  for(const filter of filters){const output=applyFilter(input,2,2,filter,{});assert.equal(output.length,16,filter);assert.ok(output.every(Number.isFinite),filter);assert.deepEqual(input,before,filter);}
});
test('26 blend modes: finite channel outputs (not original golden tests)',()=>{
  assert.equal(modes.length,26);for(const mode of modes){const output=new Uint8ClampedArray([100,120,140,200]);blendPixel(output,0,new Uint8ClampedArray([240,20,60,160]),0,.7,mode,1);assert.ok(output.every(Number.isFinite),mode);}
});
test('RES retains unknown resource types, Unicode names, languages and byte payloads',()=>{
  const resources=[{type:10,name:'Данные',language:1049,data:new Uint8Array([1,2,3])},{type:'CUSTOM',name:7,language:0,data:new Uint8Array([255,0,6,8])}];
  const result=readRES(writeRES(resources));for(let i=0;i<resources.length;i++)for(const key of ['type','name','language','data'])assert.deepEqual(result[i][key],resources[i][key]);
  assert.throws(()=>validateResources([resources[0],resources[0]]));assert.throws(()=>readRES(writeRES(resources).slice(0,-2)));
});
test('PE resource-only ICL and modified PE preserve all unrelated original bytes',()=>{
  const resources=[{type:10,name:'Data',language:0,data:new Uint8Array([1,2,3])}];
  const first=writePE(emptyPE(),resources),decoded=readPE(first);assert.deepEqual(decoded.resources[0].data,resources[0].data);
  resources[0].data=new Uint8Array([5,6,7,8]);resources.push({type:14,name:4,language:1049,data:new Uint8Array([9,0])});
  const second=writePE(first,resources),result=readPE(second);assert.deepEqual(result.resources.map(r=>r.data),resources.map(r=>r.data));assert.deepEqual(second.slice(512,first.length),first.slice(512));assert.throws(()=>readPE(second.slice(0,100)));
});
test('ICNS container boundaries and original legacy icon data',()=>{
  const source=readFileSync(new URL('../reference/Samples/Bluecat.icns',import.meta.url)),chunks=icnsChunks(source);
  assert.deepEqual(Buffer.from(icnsPack(chunks)),source);const images=legacyICNS(chunks);assert.ok(images.length);for(const im of images)assert.equal(im.pixels.length,im.width*im.height*4);
  assert.throws(()=>icnsChunks(source.subarray(0,source.length-1)));
});
test('all original SWA palettes roundtrip in textual TColor format',()=>{
  const root=new URL('../reference/Swatches/',import.meta.url);for(const name of readdirSync(root)){const bytes=readFileSync(new URL(name,root));assert.equal(decodePalette(bytes).length,256);assert.deepEqual(Buffer.from(encodePalette(decodePalette(bytes))),bytes,name);}
});
test('BMP V4 preserves partial and fully transparent alpha',()=>{
  for(const pixels of [new Uint8ClampedArray([10,20,30,0,40,50,60,128]),new Uint8ClampedArray(8)])assert.deepEqual(decodeBMP(encodeBMP({width:2,height:1,pixels})).pixels,pixels);
});
test('mask layer clips only the preceding layer, not accumulated backdrop',()=>{
  const p=doc(1,1).pages[0];p.layers[0].pixels.set([255,0,0,255]);const top=layer(1,1);top.pixels.set([0,255,0,255]);const mask=layer(1,1);mask.blendMode='mask';p.layers.push(top,mask);assert.deepEqual([...composite(p)],[255,0,0,255]);
});
test('floating pixels composite at their source layer depth',()=>{
  const p=doc(1,1).pages[0];const top=layer(1,1);top.pixels.set([0,255,0,255]);p.layers.push(top);p.floating={x:0,y:0,width:1,height:1,layerId:p.layers[0].id,pixels:new Uint8ClampedArray([255,0,0,255]),inverted:new Uint8Array(1)};assert.deepEqual([...composite(p)],[0,255,0,255]);
});
test('90 degree page rotation swaps dimensions and retains hotspot and inversion',()=>{
  const p=doc(2,1).pages[0];p.layers[0].pixels.set([255,0,0,255,0,255,0,255]);p.layers[0].inverted[1]=1;p.hotSpot={x:1,y:0};rotatePage(p,'right');assert.equal(p.width,1);assert.equal(p.height,2);assert.deepEqual(p.hotSpot,{x:0,y:1});assert.deepEqual([...p.layers[0].inverted],[0,1]);rotatePage(p,'left');assert.equal(p.width,2);assert.deepEqual(p.hotSpot,{x:1,y:0});
});
test('selection transform retains inversion through scaling and rotation',()=>{
  const im={width:2,height:1,pixels:new Uint8ClampedArray([255,0,0,255,0,0,0,0]),inverted:new Uint8Array([0,1])},result=transformImage(im,2,1,Math.PI/2);assert.equal(result.width,1);assert.equal(result.height,2);assert.deepEqual([...result.inverted],[0,1]);assert.deepEqual([...result.pixels],[255,0,0,255,0,0,0,0]);
});
test('ICO and CUR resource groups can be added and extracted byte-exactly',()=>{
  for(const name of ['gfie_old.ico','Select.cur']){const bytes=readFileSync(new URL('../reference/Samples/'+name,import.meta.url)),d=library();addIconResources(d,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'Test',1049);const group=d.resources.at(-1),result=extractResource(d,group);assert.deepEqual(Buffer.from(result.bytes),bytes,name);assert.throws(()=>addIconResources(d,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'Test',1049));}
});
