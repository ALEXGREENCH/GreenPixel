import {page,clone} from './model.js';
// Clipboard arrays must never alias a document or another paste operation.
export function clipboardPage(source){
 const result=page(source.width,source.height);
 result.layers[0].pixels=source.pixels.slice();
 result.layers[0].inverted=source.inverted?.slice()||new Uint8Array(source.width*source.height);
 return result;
}
export function clipboardSelection(source,target){
 const layer=target.layers.findLast(l=>l.selected);
 if(!layer)throw Error('Выберите слой для вставки');
 return {...clone(source),x:0,y:0,layerId:layer.id};
}
