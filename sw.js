// Necesario para poder instalar La Plata como app. No guarda nada en caché: siempre carga la última versión.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",()=>{});
