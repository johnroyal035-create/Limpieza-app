// Offline support: the whole app is cached on install, so the calculator works without internet.
// Bump VERSION whenever any app file changes so phones pick up the update.
const VERSION = 'lva-v1.2.3';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/core.js', 'js/engine.js', 'js/defaults.js', 'js/i18n.js', 'js/db.js', 'js/pages.js', 'js/quote.js', 'js/media.js', 'js/backup.js', 'js/keys.js', 'js/tariffs-data.js', 'js/tariffs.js', 'js/presupuestos.js', 'js/documentos.js', 'js/docs-data.js', 'js/search.js', 'js/access.js', 'js/i18n-docs.js', 'js/i18n-budget.js', 'js/lang/fr.js', 'js/lang/eu.js', 'js/lang/pt.js', 'js/lang/it.js', 'js/lang/de.js', 'js/lang/nl.js', 'js/lang/ar.js', 'js/lang/b-fr.js', 'js/lang/b-eu.js', 'js/lang/b-pt.js', 'js/lang/b-it.js', 'js/lang/b-de.js', 'js/lang/b-nl.js', 'js/lang/b-ar.js',
  'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js', 'vendor/font-dejavu-ar.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png', 'icons/logo-128.png', 'icons/logo-pdf.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only the app's own files are cached. Calls to the AI service always go to the network.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
