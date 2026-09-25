import test from 'node:test';import assert from 'node:assert/strict';
import {page,layer,clone,composite} from '../src/model.js';
import {cursorComposite} from '../src/cursor-composite.js';
import {mergePageLayers} from '../src/merge-layers.js';
test('merge keeps bottom identity and name, selected floating pixels and special mask',()=>{
 const p=page(3,1),bottom=p.layers[0];bottom.name='Original';bottom.inverted[0]=1;
 const top=layer(3,1);top.pixels.set([10,20,30,255],4);p.layers.push(top);
 p.floating={layerId:top.id,x:2,y:0,width:1,height:1,pixels:new Uint8ClampedArray([40,50,60,255]),inverted:new Uint8Array(1)};
 const before=cursorComposite(p);mergePageLayers(p,'all');
 assert.equal(p.layers.length,1);assert.equal(p.layers[0],bottom);assert.equal(bottom.name,'Original');assert.equal(p.floating,null);
 assert.deepEqual(cursorComposite(p),before);
});
test('double inversion cancels during merge and opaque pixels cover inversion',()=>{
 const p=page(2,1);p.layers[0].inverted.fill(1);const top=layer(2,1);top.inverted[0]=1;top.pixels.set([1,2,3,255],4);p.layers.push(top);
 mergePageLayers(p);assert.deepEqual([...p.layers[0].inverted],[0,0]);assert.deepEqual([...p.layers[0].pixels],[0,0,0,0,1,2,3,255]);
});
test('visible merge preserves hidden layers and their floating selection',()=>{
 const p=page(1,1);p.layers[0].pixels.set([20,40,60,255]);const hidden=layer(1,1);hidden.visible=false;p.layers.push(hidden);
 p.floating={layerId:hidden.id,x:0,y:0,width:1,height:1,pixels:new Uint8ClampedArray([1,2,3,255]),inverted:new Uint8Array(1)};
 const f=p.floating,before=composite(p);mergePageLayers(p,'visible');assert.equal(p.layers[1],hidden);assert.equal(p.floating,f);assert.deepEqual(composite(p),before);
});
test('unsupported inversion merge fails without partial structural or pixel changes',()=>{
 const p=page(1,1);p.layers[0].inverted[0]=1;p.layers[0].opacity=128;p.layers.push(layer(1,1));const before=clone(p);
 assert.throws(()=>mergePageLayers(p),/непрозрачность/);assert.deepEqual(p,before);
});
