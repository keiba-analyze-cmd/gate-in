"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
    // エラーをAPIに送信（Vercel Logsで閲覧可能）
    fetch("/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🐴💦</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">エラーが発生しました</h1>
        <p className="text-sm text-gray-500 mb-6">
          一時的な問題が発生しました。もう一度お試しください。
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-green-600 text-white font-bold text-sm px-6 py-3 rounded-full hover:bg-green-700 transition-colors"
          >
            もう一度試す
          </button>
          <a
            href="/"
            className="border border-gray-200 text-gray-600 font-bold text-sm px-6 py-3 rounded-full hover:bg-gray-50 transition-colors"
          >
            トップへ
          </a>
        </div>
      </div>
    </div>
  );
}
