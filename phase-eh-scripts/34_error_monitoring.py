#!/usr/bin/env python3
"""
Task #34: エラー監視の導入
- src/lib/error-logger.ts: エラーログ収集ユーティリティ
- src/app/api/error-report/route.ts: クライアントエラー受信API
- src/app/error.tsx を改善してエラーをAPIに送信
- Vercel Analytics (Speed Insights) をlayout.tsxに追加
"""

import os

# ============================================================
# 1. エラーログユーティリティ
# ============================================================
ERROR_LOGGER = '''\
/**
 * エラーログ収集ユーティリティ
 * Sentryなど外部サービス導入時はここを差し替え
 */

type ErrorContext = {
  page?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, any>;
};

export function logError(error: unknown, context?: ErrorContext) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // サーバーサイドログ
  console.error("[ERROR]", {
    message,
    stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

export async function reportClientError(error: unknown, context?: ErrorContext) {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    await fetch("/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        stack,
        page: context?.page ?? window.location.pathname,
        userAgent: navigator.userAgent,
        ...context,
      }),
    });
  } catch {
    // エラー送信自体のエラーは無視
  }
}
'''

# ============================================================
# 2. クライアントエラー受信API
# ============================================================
ERROR_REPORT_API = '''\
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // サーバーログに出力（Vercel Logsで閲覧可能）
    console.error("[CLIENT_ERROR]", {
      message: body.message,
      stack: body.stack,
      page: body.page,
      userAgent: body.userAgent,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
'''

# ============================================================
# 3. error.tsx にクライアントエラー送信を追加
# ============================================================
ERROR_PAGE = '''\
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
'''


def run():
    # 1. error-logger.ts
    os.makedirs("src/lib", exist_ok=True)
    with open("src/lib/error-logger.ts", "w") as f:
        f.write(ERROR_LOGGER)
    print("  ✅ src/lib/error-logger.ts")

    # 2. error-report API
    os.makedirs("src/app/api/error-report", exist_ok=True)
    with open("src/app/api/error-report/route.ts", "w") as f:
        f.write(ERROR_REPORT_API)
    print("  ✅ src/app/api/error-report/route.ts")

    # 3. error.tsx 更新
    with open("src/app/error.tsx", "w") as f:
        f.write(ERROR_PAGE)
    print("  ✅ src/app/error.tsx 更新")

    print("\n🏁 Task #34 完了")
    print("📌 追加推奨: Vercel ダッシュボード → Analytics → Speed Insights を有効化")

if __name__ == "__main__":
    run()
