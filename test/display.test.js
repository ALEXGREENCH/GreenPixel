import test from 'node:test';
import assert from 'node:assert/strict';
import {page,layer,clone} from '../src/model.js';
import {displayPlanes} from '../src/display.js';
test('display separates inverse pixels from RGBA and leaves document unchanged',()=>{
 const p=page(3,1),l=p.layers[0];l.pixels.set([10,20,30,255]);l.inverted[1]=1;const before=clone(p),result=displayPlanes(p);
 assert.deepEqual([...result.pixels],[10,20,30,255,0,0,0,0,0,0,0,0]);
 assert.deepEqual([...result.inversion],[0,0,0,0,255,255,255,255,0,0,0,0]);assert.equal(result.warning,null);assert.deepEqual(p,before);
});
test('double inversion cancels, floating inversion follows its position, hidden inversion disappears',()=>{
 const p=page(2,1);p.layers[0].inverted[0]=1;const top=layer(2,1);top.inverted[0]=1;p.layers.push(top);
 assert.ok(displayPlanes(p).inversion.every(v=>v===0));top.visible=false;assert.equal(displayPlanes(p).inversion[3],255);
 p.layers[0].inverted.fill(0);p.floating={layerId:p.layers[0].id,x:1,y:0,width:1,height:1,pixels:new Uint8ClampedArray(4),inverted:new Uint8Array([1])};assert.equal(displayPlanes(p).inversion[7],255);
 p.layers[0].visible=false;assert.ok(displayPlanes(p).inversion.every(v=>v===0));
});
test('unsupported inversion combinations explicitly report approximate display',()=>{
 const p=page(1,1);p.layers[0].inverted[0]=1;p.layers[0].opacity=128;assert.match(displayPlanes(p).warning,/приближённое/);
});
