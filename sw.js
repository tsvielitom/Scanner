const C='etichette-v1';
const A=['./','index.html','style.css','app.js','fields.js','manifest.webmanifest','icon-192.png','icon-512.png','vendor/tesseract.min.js','vendor/worker.min.js','vendor/xlsx.full.min.js','vendor/core/tesseract-core-lstm.wasm.js','vendor/core/tesseract-core-simd-lstm.wasm.js','vendor/lang/eng.traineddata.gz'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));});
