/* 樂齡健身 Service Worker
   策略：網路優先（network-first），並強制略過瀏覽器的 HTTP 快取。
   有網路時一律向伺服器重新要一次最新版本（不吃瀏覽器磁碟快取），
   拿到後更新備份；沒網路時才用備份。 */

const CACHE_NAME = 'senior-fitness-v2'; // 版本號往上加，才會清掉舊快取
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => { /* 個別檔案抓不到也不要讓安裝失敗 */ })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    // { cache: 'no-store' }：明確告訴瀏覽器不要用磁碟快取，
    // 一定要真的連到 GitHub Pages 問一次「現在最新版本是什麼」。
    fetch(req, { cache: 'no-store' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then(cached => cached || caches.match('./index.html'))
      )
  );
});
