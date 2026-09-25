import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
test('published HTML pins stylesheet, entry, imports and workers to one release',()=>{
  const html=readFileSync(new URL('index.html',root),'utf8'),version=JSON.parse(readFileSync(new URL('version.json',root),'utf8')),prefix=`assets/${version.build}`;
  assert.match(version.build,/^[a-f0-9]{12}$/);assert.ok(html.includes(`href="${prefix}/styles.css"`));assert.ok(html.includes(`src="${prefix}/src/boot.js"`));
  const directory=new URL(prefix+'/src/',root);
  for(const name of readdirSync(directory).filter(n=>n.endsWith('.js'))){const source=readFileSync(new URL(name,directory),'utf8');for(const match of source.matchAll(/['"](\.\.?\/[^'"\n]+\.(?:js|json))['"]/g)){assert.ok(existsSync(new URL(match[1],new URL(name,directory))),`${name}: ${match[1]}`);}}
  const app=readFileSync(new URL('app.js',directory),'utf8');assert.ok(app.includes("new URL('./languages.json',import.meta.url)"));assert.ok(!app.includes("fetch('src/languages.json')"));
  const css=readFileSync(new URL(prefix+'/styles.css',root),'utf8');for(const m of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))if(!m[1].startsWith('data:'))assert.ok(existsSync(new URL(m[1],new URL(prefix+'/styles.css',root))),m[1]);
});
