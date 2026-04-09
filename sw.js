const CACHE = 'tc-ork-v1.2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap'
];

// Kurulum: dosyaları cache'e al
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(() => {}); // font hataları tolere et
    })
  );
  self.skipWaiting();
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: önce cache, yoksa network
self.addEventListener('fetch', e => {
  // POST ve chrome-extension isteklerini atla
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  // Döviz kuru ve API isteklerini her zaman networkten al
  if (e.request.url.includes('er-api.com') ||
      e.request.url.includes('api.anthropic.com') ||
      e.request.url.includes('api.openai.com')) {
    return; // cache kullanma, direkt network
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Sadece başarılı yanıtları cache'e al
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => cached); // network hata → cache'e dön
    })
  );
});
