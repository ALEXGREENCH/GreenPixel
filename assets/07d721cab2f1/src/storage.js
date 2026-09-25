let database;
async function db(){if(!database)database=await new Promise((resolve,reject)=>{const req=indexedDB.open('turborium-greenpixel',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return database;}
export async function load(key){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('state').objectStore('state').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function save(key,value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('state','readwrite');t.objectStore('state').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
