/* Service worker — caches the app for full offline use.
   Bump CACHE when you change app files or content so phones update. */
var CACHE = "ncoboard-v44";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./data/content.js",
  "./js/storage.js",
  "./js/audio.js",
  "./js/flashcards.js",
  "./js/quiz.js",
  "./js/mockboard.js",
  "./js/drive.js",
  "./js/learn.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/qr.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache:"reload" bypasses the browser HTTP cache so we never precache stale files.
      return Promise.all(ASSETS.map(function (url) {
        return fetch(new Request(url, { cache: "reload" })).then(function (res) {
          if (!res.ok) throw new Error("Precache failed: " + url + " " + res.status);
          return c.put(url, res);
        });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Cache-first: instant load, works with no signal.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copy = res.clone();
          e.waitUntil(
            caches.open(CACHE).then(function (c) { return c.put(e.request, copy); }).catch(function () {})
          );
        }
        return res;
      }).catch(function () {
        // Offline: only page navigations get the app shell; other requests just fail.
        if (e.request.mode === "navigate") {
          return caches.match("./index.html").then(function (shell) { return shell || Response.error(); });
        }
        return Response.error();
      });
    })
  );
});

// Daily reminder (installed Android app, Periodic Background Sync). Opens the app on tap.
self.addEventListener("periodicsync", function (e) {
  if (e.tag !== "ncoboard-daily") return;
  e.waitUntil(self.registration.showNotification("NCO Board", { body: "Today's board cards are waiting. Ten minutes keeps your streak.", icon: "./icons/icon-192.png", tag: "ncoboard-daily" }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(function (cs) { return cs.length ? cs[0].focus() : self.clients.openWindow("./"); }));
});
