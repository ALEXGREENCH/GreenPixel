export function releaseBuild(moduleURL){return new URL(moduleURL).pathname.match(/\/assets\/([a-f0-9]{12})\//)?.[1]||null;}
export async function inspectRelease(moduleURL,pageURL,request=fetch){
 const current=releaseBuild(moduleURL);
 if(!current)throw Error('Проверка обновлений доступна в собранной версии приложения');
 const manifest=new URL('version.json',pageURL);manifest.searchParams.set('check',String(Date.now()));
 const response=await request(manifest,{cache:'no-store'});
 if(!response.ok)throw Error('Не удалось проверить обновления (HTTP '+response.status+')');
 const next=await response.json();
 if(!next||typeof next.version!=='string'||!next.version.trim()||next.version.length>80||!/^[a-f0-9]{12}$/.test(next.build))throw Error('Получены некорректные сведения о версии');
 if(next.build===current)return {available:false,version:next.version,build:current};
 const entry=await request(new URL(`assets/${next.build}/src/boot.js`,pageURL),{cache:'no-store'});
 if(!entry.ok)throw Error('Новая сборка ещё не готова к загрузке. Повторите проверку позже.');
 return {available:true,version:next.version,build:next.build};
}
export async function reloadRelease(next,pageURL,saveDraft,navigate){
 if(!/^[a-f0-9]{12}$/.test(next.build))throw Error('Некорректный идентификатор сборки');
 await saveDraft();
 const url=new URL(pageURL);url.searchParams.set('build',next.build);navigate(url.href);
}
