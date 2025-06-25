
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
