
// Service worker for push notifications
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.meaning,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.word, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
