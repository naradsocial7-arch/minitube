
/*
  MiniTube — minimal service worker.

  This exists mainly to satisfy PWA "installability"
  requirements (needed for the Android/TWA wrapper).
  It does light caching of same-origin page shells so
  the app opens a little faster on repeat visits, but it
  always prefers the network first — video content and
  API calls are never cached, so nothing here will ever
  show stale videos, likes, or comments.
*/

const CACHE_NAME = "minitube-shell-v1";

const SHELL_FILES = [
  "./index.html"
];

self.addEventListener("install", function(event){

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES).catch(function(){
        /* ignore — don't block install on a caching failure */
      });
    })
  );

});

self.addEventListener("activate", function(event){

  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys
          .filter(function(key){ return key !== CACHE_NAME; })
          .map(function(key){ return caches.delete(key); })
      );
    })
  );

  self.clients.claim();

});

self.addEventListener("fetch", function(event){

  const request = event.request;

  /*
    Only handle simple same-origin GET page requests.
    Everything else (API calls to the Worker, Supabase,
    video streaming, R2 files) goes straight to the
    network, untouched.
  */

  if(
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ){
    return;
  }

  event.respondWith(
    fetch(request)
      .then(function(response){

        const copy = response.clone();

        caches.open(CACHE_NAME).then(function(cache){
          cache.put(request, copy);
        });

        return response;

      })
      .catch(function(){

        return caches.match(request);

      })
  );

});
