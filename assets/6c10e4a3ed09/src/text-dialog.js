import {el,field,values,dialog} from './ui.js';
import {defaultTextSettings,textSettings,encodeTextSettings,decodeTextSettings,renderText} from './text.js';
import {evaluate} from './expression.js';
let settingsClipboard=null;
export function textDialog(initial,color,onApply){
 let settings;try{settings=textSettings(initial);}catch{settings={...defaultTextSettings};}
 const body=el('div',{class:'form-grid'},[field('text','Текст','','textarea'),field('font','Шрифт',settings.font),field('size','Размер',settings.size),field('bold','Жирный',settings.bold,'checkbox'),field('italic','Курсив',settings.italic,'checkbox'),field('underline','Подчёркивание',settings.underline,'checkbox'),field('antialias','Сглаживание',settings.antialias,'checkbox')]);
 const preview=el('canvas',{class:'text-preview','aria-label':'Предпросмотр текста'}),message=el('p',{class:'full dialog-note','aria-live':'polite'}),transfer=field('preset','Настройки текста (JSON)','','textarea');transfer.hidden=true;
 body.append(el('div',{class:'full text-preview-wrap'},preview),message,transfer);
 const read=()=>{const v=values(body.closest('form'));return {...v,size:evaluate(v.size)};};
 const showError=error=>{message.textContent=error.message;};
 function redraw(){try{const v=read(),im=renderText(v.text||'Abc Аа',v,color);preview.width=im.width;preview.height=im.height;preview.getContext('2d').putImageData(new ImageData(im.pixels,im.width,im.height),0,0);message.textContent='';}catch(error){showError(error);}}
 const applyPreset=()=>{try{const next=decodeTextSettings(transfer.querySelector('textarea').value);for(const [key,value]of Object.entries(next)){const input=body.querySelector(`[name=${key}]`);if(input.type==='checkbox')input.checked=value;else input.value=value;}redraw();}catch(error){showError(error);}};
 body.addEventListener('input',e=>{if(e.target.name!=='preset')redraw();});
 const importButton=el('button',{type:'button',text:'Применить настройки',hidden:'',onclick:applyPreset});body.append(importButton);
 dialog('Вставить текст',body,{extra:[
  el('button',{type:'button',text:'Копировать настройки',onclick:async()=>{try{settingsClipboard=encodeTextSettings(read());try{await navigator.clipboard.writeText(settingsClipboard);message.textContent='Настройки скопированы';}catch{message.textContent='Настройки скопированы во внутренний буфер';}}catch(error){showError(error);}}}),
  el('button',{type:'button',text:'Вставить настройки',onclick:()=>{transfer.hidden=false;importButton.hidden=false;transfer.querySelector('textarea').value=settingsClipboard||'';if(settingsClipboard)applyPreset();else message.textContent='Вставьте настройки в поле JSON и нажмите «Применить настройки»';}})
 ],onOk:v=>{if(!v.text.trim())throw Error('Введите текст');const style=textSettings({...v,size:evaluate(v.size)}),image=renderText(v.text,style,color);onApply(image,style);}});redraw();
}
