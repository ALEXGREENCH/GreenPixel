import {readFile,writeFile,readdir,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
async function files(directory){const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const p=path.join(directory,entry.name);result.push(...(entry.isDirectory()?await files(p):[p]));}return result.sort();}
const hash=createHash('sha256');
for(const file of [...await files(path.join(root,'src')),path.join(root,'styles.css')]){hash.update(path.relative(root,file).replaceAll('\\','/'));hash.update(await readFile(file));}
const build=hash.digest('hex').slice(0,12),relative=`assets/${build}`,target=path.join(root,relative);
await mkdir(target,{recursive:true});await cp(path.join(root,'src'),path.join(target,'src'),{recursive:true});
const css=(await readFile(path.join(root,'styles.css'),'utf8')).replaceAll("url('reference/","url('../../reference/");
await writeFile(path.join(target,'styles.css'),css);
const indexPath=path.join(root,'index.html'),html=await readFile(indexPath,'utf8');
await writeFile(indexPath,html.replace(/href="(?:assets\/[^/]+\/)?styles\.css"/,`href="${relative}/styles.css"`).replace(/src="(?:assets\/[^/]+\/)?src\/(?:app|boot)\.js"/,`src="${relative}/src/boot.js"`));
const versionPath=path.join(root,'version.json'),version=JSON.parse(await readFile(versionPath,'utf8'));version.build=build;await writeFile(versionPath,JSON.stringify(version)+'\n');
console.log(`Built ${version.version}: ${relative}`);
