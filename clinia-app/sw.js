// Clinia App · service worker: l'app si apre anche con rete debole.
// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
const CACHE = "clinia-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./img/clinia-logo.svg", "./img/clinia-mark.svg",
  "./img/icone/apple-touch-icon.png", "./img/icone/icon-192.png", "./img/fpm-logo-sm.png", "./img/reception.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Dati, accessi e pagamenti sempre dalla rete: mai dalla cache
  if (/supabase\.co|stripe\.com|api\./.test(url.host)) return;
  // Pagine: prima la rete (versione aggiornata), poi la copia salvata
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put("./index.html", c)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Immagini, caratteri e librerie: prima la copia salvata, poi la rete
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.host))) {
      const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c));
    }
    return r;
  })));
});
