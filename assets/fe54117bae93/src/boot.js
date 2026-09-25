// A release lives in its own content-addressed directory. Relative imports,
// workers and dictionaries therefore cannot mix with another cached release.
try{await import('./app.js');}
catch(error){
  const banner=document.createElement('div');banner.setAttribute('role','alert');banner.style.cssText='position:fixed;inset:20px 20px auto;padding:20px;background:#fff;color:#900;border:2px solid #900;z-index:10000;font:16px sans-serif';
  const message=document.createElement('p');message.textContent='Не удалось загрузить GreenPixel: '+error.message;
  const link=document.createElement('a'),url=new URL(location.href);url.searchParams.set('reload',String(Date.now()));link.href=url.href;link.textContent='Повторить загрузку';banner.append(message,link);document.body.append(banner);console.error(error);
}
