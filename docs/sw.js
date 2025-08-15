
// Optimized service worker for deployment
const CACHE_NAME = 'vocabulary-app-v1';

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event received but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (err) {
    console.log('Unable to parse push data');
    return;
  }

  const options = {
    body: data.meaning || 'New vocabulary word',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.word || 'Vocabulary', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});

// Simple install and activate handlers
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event) {
  const requestURL = new URL(event.request.url);
  if (requestURL.origin === location.origin && (requestURL.pathname.startsWith('/assets/') || requestURL.pathname.match(/\.(js|css|svg|png|ico)$/))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        const cachedResponse = new Response(response.clone().body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        cachedResponse.headers.set('Cache-Control', 'public, max-age=31536000');
        cache.put(event.request, cachedResponse.clone());
        return cachedResponse;
      })
    );
  }
});
