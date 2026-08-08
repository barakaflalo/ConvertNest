/* ConvertNest service worker — AppNest base v3.
   IMPORTANT: bump VERSION on every release or users won't get updates.
   Strategy: cache-first for the same-origin app shell; pass-through
   (network only) for cross-origin requests so ffmpeg/CDN & blob URLs
   and cross-origin-isolation headers are never touched. */
const VERSION = "convertnest-v1.1.1";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./privacy_policy.html"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle GET.
  if (req.method !== "GET") return;

  // Cross-origin (CDNs: unpkg/jsdelivr/cdnjs, AI providers) → never intercept.
  if (url.origin !== self.location.origin) return;

  // Same-origin navigations → network first, fall back to cached shell (offline).
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Same-origin static assets → cache first, then network (and cache the copy).
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
