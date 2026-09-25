export const $=id=>document.getElementById(id);
export function el(tag,attrs={},children=[]){const e=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')e.textContent=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='class')e.className=v;else if(k==='checked')e.checked=v;else e.setAttribute(k,v);}for(const c of [].concat(children))if(c!=null)e.append(typeof c==='string'?document.createTextNode(c):c);return e;}
export function field(name,label,value,type='text',choices){const input=type==='select'?el('select',{name},choices.map(c=>el('option',{value:Array.isArray(c)?c[0]:c,text:Array.isArray(c)?c[1]:c}))):type==='textarea'?el('textarea',{name}):el('input',{name,type});if(type==='checkbox')input.checked=!!value;else input.value=value??'';return el('label',{class:type==='textarea'?'full':''},[label,input]);}
export function values(form){const result=Object.fromEntries(new FormData(form));for(const i of form.querySelectorAll('input[type=checkbox]'))result[i.name]=i.checked;return result;}
export function dialog(title,body,{onOk,onCancel,extra=[],ok='OK',cancel='Отмена'}={}){
  const d=$('dialog');if(d.open)d.close();$('dialog-title').textContent=title;$('dialog-body').replaceChildren(body);$('dialog-buttons').replaceChildren(...extra);
  let ended=false;const finish=()=>{ended=true;d.close();};
  if(cancel)$('dialog-buttons').append(el('button',{type:'button',text:cancel,onclick:()=>{onCancel?.();finish();}}));
  $('dialog-buttons').append(el('button',{type:'submit',text:ok,autofocus:''}));
  $('dialog-form').onsubmit=async e=>{e.preventDefault();try{const result=await onOk?.(values($('dialog-form')));if(result!==false)finish();}catch(error){let note=$('dialog-body').querySelector('.dialog-error');if(!note){note=el('p',{class:'dialog-error'});$('dialog-body').append(note);}note.textContent=error.message;}};
  $('dialog-close').onclick=()=>{onCancel?.();finish();};d.oncancel=()=>{onCancel?.();ended=true;};d.onclose=()=>{if(!ended)onCancel?.();};d.showModal();return d;
}
export function confirmAction(message){return new Promise(resolve=>dialog('Подтверждение',el('p',{text:message}),{onOk:()=>resolve(true),onCancel:()=>resolve(false),ok:'Да',cancel:'Нет'}));}
export function notify(message){$('statusbar').textContent=message;}
