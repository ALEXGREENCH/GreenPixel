import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFilter,filters,blur,gaussianBlur} from '../src/filters.js';
const w=9,h=9,source=new Uint8ClampedArray(w*h*4);
for(let y=1;y<8;y++)for(let x=1;x<8;x++)source.set([x*27,y*29,(x+y)*14,(x+y)%3?255:128],(y*w+x)*4);
const params={rgb:{red:50},hs:{hue:120,saturation:50},exposure:{brightness:20,gamma:1.3},formulae:{formulaR:'255-r'},opacity:{opacity:50},removeMatte:{color:'#ffffff'},paintContour:{color:'#ff0000'},dropShadow:{distance:1,radius:1},glow:{radius:1},bevel:{radius:1}};
for(const kind of filters)test(`filter ${kind}: modifies control image, preserves input and dimensions`,()=>{
 const before=source.slice(),out=applyFilter(source,w,h,kind,params[kind]);
 assert.deepEqual(source,before);assert.equal(out.length,source.length);assert.notDeepEqual(out,source);
 if(!['blurSoft','blurMore','blurCustom','dropShadow','glow','opacity'].includes(kind))for(let i=3;i<source.length;i+=4)assert.equal(out[i],source[i]);
});
test('invert twice restores exact channels; opacity affects alpha only',()=>{
 assert.deepEqual(applyFilter(applyFilter(source,w,h,'invert'),w,h,'invert'),source);
 const out=applyFilter(source,w,h,'opacity',{opacity:0});for(let i=0;i<out.length;i++)assert.equal(out[i],i%4===3?0:source[i]);
});
test('Gaussian has distinct weighted kernel, zero radius is identity, no dark alpha halos',()=>{
 const impulse=new Uint8ClampedArray(9*4);impulse.set([255,0,0,255],16);
 const box=blur(impulse,9,1,2),gauss=gaussianBlur(impulse,9,1,2);
 assert.notDeepEqual(box,gauss);assert.ok(gauss[19]>gauss[15]);assert.ok(gauss[15]>gauss[11]);
 for(let i=0;i<gauss.length;i+=4)if(gauss[i+3])assert.equal(gauss[i],255);
 assert.deepEqual(blur(impulse,9,1,0),impulse);assert.deepEqual(gaussianBlur(impulse,9,1,0),impulse);
});
test('toroidal shadow wraps shifted alpha through the right edge',()=>{
 const a=new Uint8ClampedArray(5*4);a.set([255,0,0,255],16);
 const options={radius:0,distance:1,angle:0,opacity:100};
 assert.equal(applyFilter(a,5,1,'dropShadow',options)[3],0);
 assert.equal(applyFilter(a,5,1,'dropShadow',{...options,torus:true})[3],255);
});
test('zero inner-glow opacity is identity and invalid parameters fail visibly',()=>{
 assert.deepEqual(applyFilter(source,w,h,'glow',{inner:true,opacity:0}),source);
 for(const options of [{radius:-1},{opacity:101},{gamma:0},{amount:Infinity}])assert.throws(()=>applyFilter(source,w,h,'blurCustom',options));
 assert.throws(()=>applyFilter(source,w,h,'formulae',{formulaR:'unknown(1)'}));
});
