import test from 'node:test';import assert from 'node:assert/strict';
import {document,layer,clone,History} from '../src/model.js';
import {mutateDocument,layerFromSelection} from '../src/document-commands.js';
test('failed multi-layer command restores bytes, structure and captured identities',()=>{
 const d=document(2,1),p=d.pages[0],first=p.layers[0],bytes=first.pixels,layers=p.layers;first.pixels[3]=255;p.layers.push(layer(2,1));p.selection=new Uint8Array([255,0]);const before=clone(d);
 assert.throws(()=>mutateDocument(d,()=>{first.pixels[0]=90;first.inverted[1]=1;first.pixels=new Uint8ClampedArray(40);p.layers.reverse();p.layers.pop();p.layers.push(layer(2,1));p.selection=null;p.width=10;d.dirty=true;d.extra='temporary';throw Error('second layer failed');}),/second layer failed/);
 assert.deepEqual(d,before);assert.equal(d.pages[0],p);assert.equal(p.layers,layers);assert.equal(p.layers[0],first);assert.equal(first.pixels,bytes);
});
test('failed command retains redo history; successful command produces one undo step',()=>{
 let d=document(1,1);const h=new History();let before=mutateDocument(d,()=>{d.pages[0].layers[0].pixels[0]=50;});h.record(before,d,'draw');d=h.undo(d);assert.equal(h.redoStack.length,1);
 assert.throws(()=>mutateDocument(d,()=>{d.pages[0].layers[0].pixels[0]=99;throw Error('failure');}));assert.equal(h.undoStack.length,0);assert.equal(h.redoStack.length,1);assert.equal(d.pages[0].layers[0].pixels[0],0);
 before=mutateDocument(d,()=>{d.pages[0].layers[0].pixels[0]=70;d.pages[0].layers[0].inverted[0]=1;});h.record(before,d,'one action');assert.equal(h.undoStack.length,1);assert.equal(h.redoStack.length,0);d=h.undo(d);assert.equal(d.pages[0].layers[0].pixels[0],0);assert.equal(d.pages[0].layers[0].inverted[0],0);
});
test('layer from selection moves selected pixels and inversion to new layer, undo and redo retain both',()=>{
 let d=document(3,1),p=d.pages[0];p.layers[0].pixels.set([10,20,30,255,0,0,0,0,80,90,100,255]);p.layers[0].inverted[1]=1;p.selection=new Uint8Array([255,255,0]);const h=new History(),before=mutateDocument(d,()=>layerFromSelection(p));h.record(before,d,'layer from selection');
 assert.equal(p.layers.length,2);assert.deepEqual([...p.layers[0].pixels.slice(0,8)],Array(8).fill(0));assert.equal(p.layers[0].pixels[8],80);assert.equal(p.layers[0].inverted[1],0);assert.deepEqual([...p.layers[1].pixels.slice(0,4)],[10,20,30,255]);assert.equal(p.layers[1].inverted[1],1);assert.equal(p.layers[0].selected,false);assert.equal(p.layers[1].selected,true);assert.equal(p.floating,null);
 d=h.undo(d);assert.deepEqual(d,before);d=h.redo(d);assert.equal(d.pages[0].layers.length,2);assert.equal(d.pages[0].layers[1].inverted[1],1);
});
test('existing floating selection anchors in new layer at its offset',()=>{const p=document(3,1).pages[0];p.floating={layerId:p.layers[0].id,x:2,y:0,width:1,height:1,pixels:new Uint8ClampedArray([10,20,30,255]),inverted:new Uint8Array(1)};layerFromSelection(p);assert.equal(p.layers[0].pixels[11],0);assert.deepEqual([...p.layers[1].pixels.slice(8)],[10,20,30,255]);});
