import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
http.createServer(async (req,res) => {
  try {
    const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative = name === '/' ? 'index.html' : name.slice(1);
    if (!['index.html','styles.css'].includes(relative) && !/^src\/[a-z-]+\.js$/.test(relative)) { res.writeHead(404).end(); return; }
    const body = await readFile(path.join(root,relative));
    res.writeHead(200,{'Content-Type':types[path.extname(relative)] || 'application/octet-stream','Cache-Control':'no-cache'}).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT || 4173),'127.0.0.1',()=>console.log(`GreenPixel: http://127.0.0.1:${process.env.PORT || 4173}`));
