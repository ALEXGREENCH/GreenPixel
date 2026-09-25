import test from 'node:test';import assert from 'node:assert/strict';
import {inspectRelease,reloadRelease,releaseBuild} from '../src/release-check.js';
const base='https://example.org/GreenPixel/?x=1#canvas',moduleURL='https://example.org/GreenPixel/assets/012345abcdef/src/app.js';
function response(value,ok=true){return {ok,status:ok?200:404,json:async()=>value};}
test('same immutable build is current regardless of hardcoded version strings',async()=>{
 const calls=[];const result=await inspectRelease(moduleURL,base,async(url,options)=>{calls.push(String(url));assert.equal(options.cache,'no-store');return response({version:'0.2.18',build:'012345abcdef'});});
 assert.equal(result.available,false);assert.equal(result.version,'0.2.18');assert.equal(calls.length,1);assert.match(calls[0],/\/GreenPixel\/version.json\?check=/);
});
test('different build is offered only after its entry is available under project base',async()=>{
 const calls=[];const result=await inspectRelease(moduleURL,base,async url=>{calls.push(String(url));return response({version:'0.2.19',build:'abcdef012345'});});
 assert.equal(result.available,true);assert.equal(calls[1],'https://example.org/GreenPixel/assets/abcdef012345/src/boot.js');
 let count=0;await assert.rejects(inspectRelease(moduleURL,base,async()=>response({version:'0.2.19',build:'abcdef012345'},++count===1)),/не готова/);
});
test('invalid manifests, HTTP errors and source-only builds are not reported as updates',async()=>{
 for(const value of [null,{}, {version:'x',build:'../../outside'}, {version:5,build:'abcdef012345'}])await assert.rejects(inspectRelease(moduleURL,base,async()=>response(value)),/некорректные/);
 await assert.rejects(inspectRelease(moduleURL,base,async()=>response(null,false)),/HTTP 404/);
 assert.equal(releaseBuild('https://example.org/src/app.js'),null);
});
test('reload saves draft before navigation and preserves page query and hash',async()=>{
 const events=[];await reloadRelease({build:'abcdef012345'},base,async()=>events.push('saved'),url=>events.push(url));
 assert.deepEqual(events,['saved','https://example.org/GreenPixel/?x=1&build=abcdef012345#canvas']);
 let navigated=false;await assert.rejects(reloadRelease({build:'abcdef012345'},base,async()=>{throw Error('quota');},()=>navigated=true),/quota/);assert.equal(navigated,false);
});
