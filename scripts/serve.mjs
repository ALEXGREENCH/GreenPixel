import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname).replace(/^\/+/,''),relative=name||'index.html';
 const target=path.resolve(root,relative);
 if(!target.startsWith(root)||relative.split('/').some(s=>s.startsWith('.'))||!(/^(src|reference|docs)\//.test(relative)||['index.html','styles.css','LICENSE','NOTICE.md','version.json'].includes(relative))){res.writeHead(404).end();return;}
 const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'}).end(data);
}catch{res.writeHead(404).end('Not found');}}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('GreenPixel http://127.0.0.1:'+(process.env.PORT||4173)));
