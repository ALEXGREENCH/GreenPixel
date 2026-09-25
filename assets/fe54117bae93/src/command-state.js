export function selectedLayers(page){return !!page?.layers.some(layer=>layer.selected);}
export function hasSelection(page){return !!(page?.floating||page?.selection);}
export function canEditPixels(page){
 if(!page)return false;
 if(page.floating)return true;
 return selectedLayers(page)&&(!page.selection||page.selection.some(value=>value!==0));
}
export function canFloatSelection(page){return hasSelection(page)&&canEditPixels(page);}
