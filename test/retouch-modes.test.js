import test from 'node:test';
import assert from 'node:assert/strict';
import {page} from '../src/model.js';
import {retouch} from '../src/raster.js';
test('all six retouch modes keep alpha and do not touch pixels outside selection',()=>{
 for(const mode of ['blur','sharpen','dodge','burn','hue','sponge']){
  const p=page(3,1);p.layers[0].pixels.set([20,40,80,255,100,140,200,128,240,60,10,255]);const before=p.layers[0].pixels.slice();p.selection=new Uint8Array([0,255,0]);
  retouch(p,1,0,{size:3,shape:'sharp',retouch:mode});assert.deepEqual(p.layers[0].pixels.slice(0,4),before.slice(0,4));assert.deepEqual(p.layers[0].pixels.slice(8),before.slice(8));assert.equal(p.layers[0].pixels[7],128);assert.notDeepEqual(p.layers[0].pixels.slice(4,7),before.slice(4,7),mode);
 }
});
