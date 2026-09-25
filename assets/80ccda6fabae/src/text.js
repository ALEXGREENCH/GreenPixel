export const defaultTextSettings=Object.freeze({font:'Arial',size:16,bold:false,italic:false,underline:false,antialias:false});
export function textSettings(value={}){
 const font=value.font??'Arial',size=Number(value.size??16);
 if(typeof font!=='string'||!font.trim()||font.length>200||/[\u0000-\u001f]/.test(font))throw Error('Некорректное имя шрифта');
 if(!Number.isFinite(size)||size<1||size>512)throw Error('Размер шрифта: от 1 до 512');
 const result={font:font.trim(),size};
 for(const key of ['bold','italic','underline','antialias']){if(value[key]!==undefined&&typeof value[key]!=='boolean')throw Error('Некорректное свойство '+key);result[key]=value[key]??false;}
 return result;
}
export function encodeTextSettings(value){return JSON.stringify({format:'greenpixel-text-settings',version:1,settings:textSettings(value)},null,2);}
export function decodeTextSettings(text){if(text.length>8192)throw Error('Настройки текста слишком велики');const value=JSON.parse(text);if(value.format!=='greenpixel-text-settings'||value.version!==1)throw Error('Неизвестный формат настроек текста');return textSettings(value.settings);}
export function textLayout(metrics,size){
 const ascent=Math.max(size,...metrics.map(m=>m.actualBoundingBoxAscent||0)),descent=Math.max(size*.25,...metrics.map(m=>m.actualBoundingBoxDescent||0));
 const left=Math.max(0,...metrics.map(m=>m.actualBoundingBoxLeft||0)),right=Math.max(1,...metrics.map(m=>Math.max(m.width,m.actualBoundingBoxRight||0)));
 const lineHeight=Math.ceil(Math.max(size*1.4,ascent+descent));
 return {width:Math.max(1,Math.ceil(left+right)),height:Math.max(1,Math.ceil(ascent+descent+(metrics.length-1)*lineHeight)),left,ascent,lineHeight};
}
export function renderText(text,settings,color){
 const style=textSettings(settings),lines=text.replace(/\r\n?/g,'\n').split('\n');
 if(lines.length>4096||text.length>100000)throw Error('Текст слишком велик');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const font=`${style.italic?'italic ':''}${style.bold?'bold ':''}${style.size}px ${JSON.stringify(style.font)}`;ctx.font=font;
 const metrics=lines.map(line=>ctx.measureText(line)),layout=textLayout(metrics,style.size);
 if(layout.width>8192||layout.height>8192||layout.width*layout.height>16777216)throw Error('Изображение текста превышает допустимый размер');
 canvas.width=layout.width;canvas.height=layout.height;ctx.font=font;ctx.textBaseline='alphabetic';ctx.fillStyle=`rgba(${color[0]},${color[1]},${color[2]},${color[3]/255})`;
 lines.forEach((line,i)=>{const baseline=layout.ascent+i*layout.lineHeight;ctx.fillText(line,layout.left,baseline);if(style.underline)ctx.fillRect(layout.left,baseline+Math.max(1,style.size*.08),metrics[i].width,Math.max(1,style.size/16));});
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 if(!style.antialias)for(let i=3;i<pixels.length;i+=4)pixels[i]=pixels[i]>=color[3]/2?color[3]:0;
 return {width:canvas.width,height:canvas.height,pixels,inverted:new Uint8Array(canvas.width*canvas.height)};
}
