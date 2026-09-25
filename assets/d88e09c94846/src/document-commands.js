import {clone,layer} from './model.js';
import {floatSelection,anchor} from './raster.js';

// Preserve object identities on rollback: an open dialog can retain a page/layer.
export function mutateDocument(document,operation){
 const before=clone(document),originals=new Map();
 function pair(original,snapshot){
  if(!snapshot||typeof snapshot!=='object'||originals.has(snapshot))return;
  originals.set(snapshot,original);
  if(ArrayBuffer.isView(snapshot))return;
  for(const key of Object.keys(snapshot))pair(original[key],snapshot[key]);
 }
 pair(document,before);
 try{operation();return before;}
 catch(error){
  for(const [snapshot,original]of originals){
   if(ArrayBuffer.isView(snapshot)){original.set(snapshot);continue;}
   for(const key of Object.keys(original))if(!Object.hasOwn(snapshot,key))delete original[key];
   if(Array.isArray(original))original.length=snapshot.length;
   for(const key of Object.keys(snapshot))original[key]=originals.get(snapshot[key])??snapshot[key];
  }
  throw error;
 }
}
export function layerFromSelection(page){
 const floating=floatSelection(page,true);if(!floating)return false;
 const destination=layer(page.width,page.height,'Выделение');
 page.layers.forEach(layer=>layer.selected=false);
 page.layers.push(destination);floating.layerId=destination.id;
 anchor(page);return true;
}
