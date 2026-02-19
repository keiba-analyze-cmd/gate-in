// src/components/push/PushNotificationPrompt.tsx
"use client";

import { useState, useEffect } from "react";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";

type Props = {
  userId: string;
};

export default function PushNotificationPrompt({ userId }: Props) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // ブラウザサポートチェック
    const supported = typeof window !== "undefined" && 
      "Notification" in window && 
      "serviceWorker" in navigator;
    setIsSupported(supported);

    if (!supported) return;

    // 既に許可済みかチェック
    if (Notification.permission === "granted") {
      checkExistingSubscription();
    } else if (Notification.permission === "default") {
      // 未回答の場合、少し遅延して表示
      const timer = setTimeout(() => {
        const dismissedAt = localStorage.getItem("push_prompt_dismissed");
        if (dismissedAt) {
          const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
          if (daysSinceDismissed < 7) return; // 7日間は再表示しない
        }
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // フォアグラウンドメッセージ受信設定
    const unsubscribe = onForegroundMessage((payload) => {
      // トースト通知を表示
      if (payload.notification) {
        showToast(payload.notification.title, payload.notification.body);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  async function checkExistingSubscription() {
    try {
      const res = await fetch(`/api/push/check?userId=${userId}`);
      const data = await res.json();
      setIsSubscribed(data.subscribed);
    } catch (error) {
      console.error("購読状態確認エラー:", error);
    }
  }

  async function handleSubscribe() {
    setIsLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // サーバーにトークンを保存
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setShowPrompt(false);
        showToast("🔔 通知ON", "レース開始や的中をお知らせします！");
      }
    } catch (error) {
      console.error("購読エラー:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("push_prompt_dismissed", Date.now().toString());
  }

  function showToast(title: string, body?: string) {
    // 簡易トースト（実際のプロジェクトのトーストシステムに置き換え可能）
    const toast = document.createElement("div");
    toast.className = "fixed top-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 animate-slide-in";
    toast.innerHTML = `
      <div class="font-bold text-gray-800">${title}</div>
      ${body ? `<div class="text-sm text-gray-600 mt-1">${body}</div>` : ""}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  if (!isSupported || isSubscribed || dismissed || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="text-3xl">🔔</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">通知をオンにしませんか？</h3>
          <p className="text-sm text-gray-600 mt-1">
            レース開始前や的中時にお知らせします
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white text-sm font-bold py-2 px-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? "設定中..." : "オンにする"}
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-500 text-sm py-2 px-3 hover:bg-gray-100 rounded-lg"
            >
              あとで
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
