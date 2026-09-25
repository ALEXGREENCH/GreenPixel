import test from 'node:test';
import assert from 'node:assert/strict';
import {page,layer} from '../src/model.js';
import {retouch} from '../src/raster.js';
function filled(w,h){const p=page(w,h);for(let i=0;i<w*h;i++)p.layers[0].pixels.set([100,100,100,255],i*4);return p;}
test('retouch respects exact even brush size and horizontal shape',()=>{
 const p=filled(8,8);retouch(p,4,4,{size:4,shape:'horizontal',retouch:'dodge'});
 const changed=[];for(let i=0;i<64;i++)if(p.layers[0].pixels[i*4]!==100)changed.push(i);
 assert.equal(changed.length,4);assert.equal(new Set(changed.map(i=>Math.floor(i/8))).size,1);
});
test('retouch weights fractional masks and edits hidden selected layers only',()=>{
 const p=filled(1,1);p.selection=new Uint8Array([128]);p.layers[0].visible=false;
 const untouched=layer(1,1);untouched.selected=false;untouched.pixels.set([100,100,100,255]);p.layers.push(untouched);
 retouch(p,0,0,{size:1,retouch:'dodge'});
 assert.deepEqual([...p.layers[0].pixels],[105,105,105,255]);assert.equal(untouched.pixels[0],100);
});
test('blur excludes transparent RGB and inverse pixels from color samples',()=>{
 const p=page(3,1);p.layers[0].pixels.set([200,50,20,255],4);p.layers[0].inverted[2]=1;
 retouch(p,1,0,{size:3,shape:'sharp',retouch:'blur'});
 assert.deepEqual([...p.layers[0].pixels],[0,0,0,0,200,50,20,255,0,0,0,0]);assert.equal(p.layers[0].inverted[2],1);
});
test('retouch floating image uses local coordinates and leaves source layer alone',()=>{
 const p=filled(4,4);p.floating={x:2,y:1,width:1,height:1,pixels:new Uint8ClampedArray([100,100,100,128]),inverted:new Uint8Array(1)};
 retouch(p,2,1,{size:1,retouch:'burn'});assert.deepEqual([...p.floating.pixels],[90,90,90,128]);assert.equal(p.layers[0].pixels[24],100);
});
