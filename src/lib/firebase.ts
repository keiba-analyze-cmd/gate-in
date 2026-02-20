// src/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase設定が存在するかチェック
const isFirebaseConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

// Firebase App 初期化（設定がある場合のみ）
let app: FirebaseApp | null = null;
if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

// Messaging インスタンス取得（ブラウザのみ）
let messaging: Messaging | null = null;

export function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  if (!app) return null;
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error("Firebase Messaging初期化エラー:", error);
      return null;
    }
  }
  return messaging;
}

// プッシュ通知トークン取得
export async function requestNotificationPermission(): Promise<string | null> {
  if (!isFirebaseConfigured) {
    console.log("Firebase未設定のため通知機能は利用できません");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("通知許可が拒否されました");
      return null;
    }

    // Service Worker 登録して準備完了を待つ
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;
    
    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) return null;

    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("FCMトークン取得:", token);
    return token;
  } catch (error) {
    console.error("通知許可エラー:", error);
    return null;
  }
}

// フォアグラウンドメッセージ受信
export function onForegroundMessage(callback: (payload: any) => void) {
  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) return () => {};
  
  return onMessage(messagingInstance, (payload) => {
    console.log("フォアグラウンドメッセージ:", payload);
    callback(payload);
  });
}

// Firebase設定状況を外部から確認できるようにエクスポート
export { isFirebaseConfigured };
