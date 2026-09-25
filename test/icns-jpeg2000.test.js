import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {icnsChunks,legacyICNS} from '../src/icns.js';
import {decodeFourComponentJ2K} from '../src/jpeg2000-rgba.js';
const chunks=icnsChunks(readFileSync(new URL('../reference/Samples/Bluecat.icns',import.meta.url)));
test('Bluecat ICNS: 256px JPEG 2000 RGBA matches independent OpenJPEG golden',()=>{
 const result=decodeFourComponentJ2K(chunks.find(c=>c.type==='ic08').data,256,256);
 assert.equal(createHash('sha256').update(result.pixels).digest('hex'),'09c3b2855a217523fcae3eefaef6467ba208eb3774e7c87e0fffb696bfbd63b9');
 assert.deepEqual(legacyICNS(chunks).map(p=>p.width),[16,48]);
 // Golden produced by Pillow 12.3/OpenJPEG from the embedded raw jp2c stream.
 assert.equal(result.pixels[3],0);
 assert.ok(result.pixels.some((v,i)=>i%4===3&&v===255));
});
test('RGBA JPEG 2000 rejects mismatched dimensions and truncated input',()=>{
 const bytes=chunks.find(c=>c.type==='ic08').data;
 assert.throws(()=>decodeFourComponentJ2K(bytes,128,128));
 assert.throws(()=>decodeFourComponentJ2K(bytes.slice(0,100),256,256));
});

