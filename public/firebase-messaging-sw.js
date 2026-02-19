// public/firebase-messaging-sw.js
// Firebase Messaging Service Worker

importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAb3m-_lXm_U7ngVG40mgte1Ao0g8P6gB4",
  authDomain: "gate-in-2fba2.firebaseapp.com",
  projectId: "gate-in-2fba2",
  storageBucket: "gate-in-2fba2.firebasestorage.app",
  messagingSenderId: "637412540854",
  appId: "1:637412540854:web:5c4852859e6fd4d25bc117",
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
    // クリック時のURL
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
      // 既存のタブがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes("gate-in.jp") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // なければ新しいタブを開く
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
