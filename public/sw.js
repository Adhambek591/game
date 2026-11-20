// Qırq qız service worker. Network-first for pages/js/json/css (never a stale module), cache-first for heavy assets, videos/range requests untouched.
// Bump V ONLY when already-cached assets (glb/jpg/mp3 with the same file name) were replaced: it makes every player download them again.
const V = 'qq-3';
const SHELL = ['./', './manifest.webmanifest', './assets/img/icon-192.png'];
const OFFLINE = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qırq qız</title><style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#10142b;color:#f8eed8;font-family:system-ui,sans-serif;text-align:center}div{max-width:520px;padding:20px;line-height:1.5}h1{color:#e8bd62;font-weight:400}button{margin-top:14px;padding:12px 28px;font-size:17px;border:0;border-radius:10px;background:#9c1f1b;color:#fff}</style></head><body><div><h1>Qırq qız</h1><p>Internet joq. Oyındı birinshi ret júklew ushın internet kerek.<br>Internet yo‘q. O‘yinni birinchi marta yuklash uchun internet kerak.<br>Нет интернета. Для первой загрузки игры нужно подключение.<br>No connection. The first download of the game needs the internet.</p><button onclick="location.reload()">↻</button></div></body></html>';
const offlinePage = () => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const shell = r => caches.match(r, { ignoreSearch: true }).then(hit => hit || caches.match('./', { ignoreSearch: true })).then(hit => hit || offlinePage());
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'no-cache' }).then(res => { if (res.ok && res.status === 200) return c.put(u, res); }).catch(() => { })))).catch(() => { }).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /\/video\//.test(u.pathname) || r.headers.has('range')) return;
  if (r.mode === 'navigate') {
    // page: network first; offline or a server error (5xx) falls back to the cached shell, then to a tiny offline page (never a browser error screen)
    e.respondWith(fetch(r).then(res => { if (res.status >= 500) return shell(r); if (res.ok && res.status === 200) { const c = res.clone(); caches.open(V).then(ca => ca.put(r, c)).catch(() => { }); } return res; }).catch(() => shell(r)));
    return;
  }
  if (/\.(js|json|html|css|webmanifest)$/.test(u.pathname)) { e.respondWith(fetch(r).then(res => { if (res.ok && res.status === 200) { const c = res.clone(); caches.open(V).then(ca => ca.put(r, c)).catch(() => { }); } return res; }).catch(() => caches.match(r).then(hit => hit || caches.match(r, { ignoreSearch: true })).then(hit => hit || Response.error()))); return; }
  e.respondWith(caches.open(V).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok && res.status === 200) c.put(r, res.clone()).catch(() => { }); return res; }))));
});
