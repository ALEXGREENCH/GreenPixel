import {composite} from './model.js';
import {cursorComposite} from './cursor-composite.js';
export function mergePageLayers(page,which='selected'){
 if(!['selected','visible','all'].includes(which))throw Error('Неизвестный набор слоёв');
 const chosen=page.layers.filter(l=>which==='all'||(which==='visible'?l.visible:l.selected));
 if(!chosen.length)return false;
 const floating=page.floating;
 const owner=floating&&(page.layers.find(l=>l.id===floating.layerId)||(!floating.layerId&&page.layers.findLast(l=>l.selected)));
 const includeFloating=!!owner&&chosen.includes(owner);
 const renderPage={...page,layers:chosen,floating:includeFloating?{...floating,layerId:owner.id}:null};
 const special=chosen.some(l=>l.visible&&l.inverted.some(Boolean))||(includeFloating&&owner.visible&&floating.inverted?.some(Boolean));
 // Compute first: unsupported inversion combinations must leave all layers intact.
 const image=special?cursorComposite(renderPage):{pixels:composite(renderPage),inverted:new Uint8Array(page.width*page.height)};
 const bottom=chosen[0];
 bottom.pixels=image.pixels;bottom.inverted=image.inverted;bottom.visible=true;bottom.opacity=255;bottom.blendMode='normal';
 page.layers=page.layers.filter(l=>l===bottom||!chosen.includes(l));
 if(includeFloating)page.floating=null;
 return true;
}
