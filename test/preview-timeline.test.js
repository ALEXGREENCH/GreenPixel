import test from 'node:test';import assert from 'node:assert/strict';
import {frameAt,testPoint,cursorOrigin} from '../src/preview-timeline.js';
test('still icon pages do not cycle and preview starts at active page',()=>{const pages=[{duration:0},{duration:0}];for(const time of [0,100,100000])assert.equal(frameAt(pages,1,time),1);});
test('animation respects individual durations, boundaries and elapsed cycles',()=>{const pages=[{duration:50},{duration:125},{duration:25}];assert.deepEqual([0,49,50,174,175,199,200,450].map(t=>frameAt(pages,0,t)),[0,0,1,1,2,2,0,1]);assert.equal(frameAt(pages,1,125),2);assert.equal(frameAt(pages,1,200),1);});
test('a zero-duration page holds rather than introducing an invented 100 ms delay',()=>{assert.equal(frameAt([{duration:10},{duration:0},{duration:20}],0,10000),1);});
test('scaled preview maps pointer to canvas coordinates and uses each page hotspot',()=>{const point=testPoint({left:20,top:30,width:240,height:150},480,300,80,80);assert.deepEqual(point,{x:120,y:100});assert.deepEqual(cursorOrigin(point,{hotSpot:{x:3,y:7}}),{x:117,y:93});assert.deepEqual(cursorOrigin(point,{hotSpot:{x:9,y:2}}),{x:111,y:98});});
