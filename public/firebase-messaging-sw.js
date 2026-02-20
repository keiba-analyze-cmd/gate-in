// public/firebase-messaging-sw.js
// Firebase Messaging Service Worker

importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBZyLt7gE7kf5cC7_MkXFTCigcEeh1Z8B8",
  authDomain: "gate-in-notifications-6f66e.firebaseapp.com",
  projectId: "gate-in-notifications-6f66e",
  storageBucket: "gate-in-notifications-6f66e.firebasestorage.app",
  messagingSenderId: "737095925634",
  appId: "1:737095925634:web:8236cb3d08f94b1efcd99b",
});

const messaging = firebase.messaging();

// バックグラウンドメッセージ受信
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] バックグラウンドメッセージ受信:", payload);

  const notificationTitle = payload.notification?.title || "ゲートイン！";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.data?.tag || "default",
    data: payload.data,
    actions: [],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] 通知クリック:", event);
  event.notification.close();

  const url = event.notification.data?.url || "/";
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("gate-in.jp") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
