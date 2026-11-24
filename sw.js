// sw.js — the service worker. It keeps a copy of the app's own files on
// the phone so the app opens instantly and still works with no signal.
//
// When you change any app file, bump VERSION so phones fetch the new copy.

const VERSION = "banff-snow-v1";
const APP_FILES = [
  "./",
  "index.html",
  "manifest.json",
  "css/styles.css",
  "js/resorts.js",
  "js/api.js",
  "js/snow.js",
  "js/chart.js",
  "js/app.js",
  "data/sample.json",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// 1. Install: download and store every app file.
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

// 2. Activate: delete stored copies from older versions.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// 3. Fetch: for our own files, answer from the stored copy and refresh it
//    in the background. Anything else (the weather API, fonts) goes to the
//    network as normal.
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  event.respondWith(
    caches.open(VERSION).then(async cache => {
      const stored = await cache.match(event.request, { ignoreSearch: true });
      const fresh = fetch(event.request)
        .then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => stored);
      return stored || fresh;
    })
  );
});
