// HTTP caches need no destructive clearing: every release has immutable URLs.
// Check the small mutable manifest; preserve both draft documents and preferences.
export function watchUpdates({hasUnsavedWork,saveDraft,allowAutomaticReload}){
  const build=new URL(import.meta.url).pathname.match(/\/assets\/([^/]+)\//)?.[1];
  if(!build)return;
  let checking=false,offered=null,banner=null;
  async function reload(next){
    await saveDraft();
    const url=new URL(location.href);url.searchParams.set('build',next.build);
    location.replace(url.href);
  }
  async function check(){
    if(checking||document.hidden)return;checking=true;
    try{
      const url=new URL('version.json',location.href);url.searchParams.set('check',String(Date.now()));
      const response=await fetch(url,{cache:'no-store'});if(!response.ok)return;
      const next=await response.json();if(!/^[a-f0-9]{12}$/.test(next.build)||next.build===build)return;
      // Probe the immutable entry before moving away from the working release.
      const entry=await fetch(new URL(`assets/${next.build}/src/boot.js`,location.href),{cache:'no-store'});if(!entry.ok)return;
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
