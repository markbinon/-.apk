/* Service worker «Расписания»: офлайн-оболочка и последние загруженные замены.
   Чтобы принудительно сбросить кэш у всех, поменяйте номер в CACHE. */
const CACHE = 'raspisanie-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'app-config.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Страница: сначала сеть (чтобы обновления сайта приходили сразу), при обрыве или медленной сети — копия из кэша.
async function navigate(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]);
    if (res.ok) cache.put('index.html', res.clone());
    return res;
  } catch (e) {
    return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
  }
}

// Замены: сначала сеть, без интернета — последние успешно загруженные.
async function replacements(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request.url, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(request.url);
    if (cached) return cached;
    return new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

// Остальные файлы сайта: отдаём из кэша и тихо обновляем в фоне.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => cached);
  return cached || fresh;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.endsWith('/api/replacements')) {
    event.respondWith(replacements(request));
    return;
  }
  // Уведомление о техработах всегда берём свежим, старое из кэша показывать нельзя.
  if (url.pathname.includes('/api/')) return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
