var C="music-hub-v1.4.0";
var P="music-hub-";
var F=["./", "./amazon.html", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./index.html", "./library.html", "./manifest.webmanifest", "./player.js", "./podcasts.html", "./podcasts.js", "./sirius.html", "./youtube.html"];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x.indexOf(P)===0&&x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;var u=new URL(e.request.url);if(u.origin!==location.origin)return;e.respondWith(caches.open(C).then(function(cache){return cache.match(e.request,{ignoreSearch:true}).then(function(r){return r||fetch(e.request).then(function(res){return res}).catch(function(){return e.request.mode==='navigate'?cache.match('./index.html'):undefined})})}))});
