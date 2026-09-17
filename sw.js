/* 樂齡健身 Service Worker
   策略：網路優先（network-first）。
   有網路時一律抓最新版本，並存一份備份；
   沒網路時才拿備份出來用。
   這樣「更新 index.html 後長輩看不到新版」的問題不會發生。 */

const CACHE_NAME = 'senior-fitness-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  // 立即啟用新版 service worker
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

  // 只處理本站的 GET 請求；YouTube 縮圖等外部資源交給瀏覽器自己處理
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // 有網路：更新備份後回傳最新內容
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        // 沒網路：改用備份
        caches.match(req).then(cached => cached || caches.match('./index.html'))
      )
  );
});
