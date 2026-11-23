// Service worker de la app Cocina: muestra las notificaciones
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(x){d={title:'Cocina',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'Cocina',{body:d.body||'',icon:'icon.png?v=2',badge:'icon.png?v=2',data:{url:d.url||'./#panel'},tag:d.tag||undefined}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const url=new URL(e.notification.data?.url||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const w of ws){if(w.url.startsWith(self.registration.scope)){w.navigate(url);return w.focus()}}return self.clients.openWindow(url)}));
});
// Siempre buscar la versión más nueva de la app (sin quedarse con una vieja guardada)
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method==='GET'&&new URL(r.url).origin===self.location.origin)e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match(r)));
});
