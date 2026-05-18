/* eslint-disable no-undef */
// Firebase Messaging Service Worker — handles background push notifications.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyBc4wk6fqqmpMA-DSXyy3D43NkipFLF8uM",
  authDomain:        "sendli-13774.firebaseapp.com",
  projectId:         "sendli-13774",
  storageBucket:     "sendli-13774.firebasestorage.app",
  messagingSenderId: "1081320980551",
  appId:             "1:1081320980551:web:f1800f9bf0641ddd69f162",
});

const messaging = firebase.messaging();

// Background messages (app closed or not focused)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "sendli";
  const body  = payload.notification?.body  ?? "";
  const url   = payload.data?.url ?? "/dashboard";

  self.registration.showNotification(title, {
    body,
    icon:      "/favicon.png",
    badge:     "/favicon.png",
    data:      { url },
    tag:       payload.data?.notifId ?? "sendli-notif",
    renotify:  true,
  });
});

// Click on notification → open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
