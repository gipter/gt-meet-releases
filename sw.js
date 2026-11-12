// GT-Meet 서비스워커: 앱 설치용. 항상 최신 파일을 먼저 받고, 오프라인일 때만 저장본 사용
const CACHE = 'gtmeet-v16';
const SHELL = ['./', 'index.html', 'app.js', 'style.css', 'favicon.png', 'icon-192.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // vendor/ 의 큰 AI 모델·라이브러리는 브라우저가 알아서 보관하므로 앱 저장소에 또 넣지 않음
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('/config.json') || u.pathname.includes('/vendor/')) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
