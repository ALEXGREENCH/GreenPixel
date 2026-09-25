import {applyFilter} from './filters.js';
self.onmessage=({data})=>{try{const pixels=applyFilter(data.pixels,data.width,data.height,data.kind,data.options);self.postMessage({id:data.id,pixels},[pixels.buffer]);}catch(error){self.postMessage({id:data.id,error:error.message});}};
