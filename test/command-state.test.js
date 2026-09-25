import test from 'node:test';
import assert from 'node:assert/strict';
import {page} from '../src/model.js';
import {selectedLayers,hasSelection,canEditPixels,canFloatSelection} from '../src/command-state.js';
test('pixel commands require a page and a selected layer, visibility does not block editing',()=>{
 assert.equal(canEditPixels(null),false);const p=page(2,2);assert.equal(canEditPixels(p),true);
 p.layers[0].visible=false;assert.equal(canEditPixels(p),true);
 p.layers[0].selected=false;assert.equal(selectedLayers(p),false);assert.equal(canEditPixels(p),false);
});
test('empty mask disables pixel mutations but remains dismissible',()=>{
 const p=page(2,2);p.selection=new Uint8Array(4);
 assert.equal(hasSelection(p),true);assert.equal(canEditPixels(p),false);assert.equal(canFloatSelection(p),false);
 p.selection[0]=1;assert.equal(canEditPixels(p),true);assert.equal(canFloatSelection(p),true);
});
test('selection-specific commands require a mask or floating image',()=>{
 const p=page(2,2);assert.equal(canFloatSelection(p),false);assert.equal(hasSelection(p),false);
 p.layers[0].selected=false;p.floating={width:1,height:1};assert.equal(canEditPixels(p),true);assert.equal(canFloatSelection(p),true);
});
