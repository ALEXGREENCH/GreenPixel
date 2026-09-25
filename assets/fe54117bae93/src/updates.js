import {inspectRelease,releaseBuild,reloadRelease} from './release-check.js';
// HTTP caches need no destructive clearing: every release has immutable URLs.
// Check the small mutable manifest; preserve both draft documents and preferences.
export function watchUpdates({hasUnsavedWork,saveDraft,allowAutomaticReload}){
  const build=releaseBuild(import.meta.url);
  if(!build)return;
  let checking=false,offered=null,banner=null;
  async function reload(next){
    await reloadRelease(next,location.href,saveDraft,url=>location.replace(url));
  }
  async function check(){
    if(checking||document.hidden)return;checking=true;
    try{
      const next=await inspectRelease(import.meta.url,location.href);if(!next.available)return;
      if(!hasUnsavedWork()&&allowAutomaticReload()){await reload(next);return;}
      if(offered===next.build)return;offered=next.build;banner?.remove();
      banner=document.createElement('aside');banner.id='update-banner';banner.setAttribute('role','status');
      const message=document.createElement('span');message.textContent=`Доступна GreenPixel ${next.version}. Черновик будет сохранён перед обновлением.`;
      const update=document.createElement('button');update.textContent='Обновить';update.onclick=async()=>{update.disabled=true;try{await reload(next);}catch(error){message.textContent='Не удалось сохранить черновик: '+error.message;update.disabled=false;}};
      const later=document.createElement('button');later.textContent='Позже';later.onclick=()=>banner.remove();banner.append(message,update,later);document.body.append(banner);
    }catch{/* Offline: keep the current editor usable. */}finally{checking=false;}
  }
  const timer=setInterval(check,60000);document.addEventListener('visibilitychange',check);window.addEventListener('online',check);check();
  return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check);window.removeEventListener('online',check);banner?.remove();};
}
