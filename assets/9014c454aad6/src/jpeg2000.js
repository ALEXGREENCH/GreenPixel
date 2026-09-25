export function jpeg2000(data){return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./jpeg2000-worker.js',import.meta.url),{type:'module'});
  const timeout=setTimeout(()=>{worker.terminate();reject(Error('JPEG 2000: превышено время обработки'));},60000);
  const finish=()=>{clearTimeout(timeout);worker.terminate();};
  worker.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{finish();reject(Error(e.message));};worker.postMessage(data);
});}
