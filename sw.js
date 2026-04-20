const CACHE = 'tc-ork-v1.6';

// Kurulum: eski cache'leri hemen temizle
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Aktivasyon: eski tüm cache'leri sil
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch stratejisi
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  const url = new URL(e.request.url);

  // API ve kur: direkt network
  if (url.hostname.includes('er-api.com') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('openai.com')) {
    return;
  }

  // index.html: daima network-first (her zaman güncel versiyon)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Diğerleri: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      });
    })
  );
});
