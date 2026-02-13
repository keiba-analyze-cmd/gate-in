#!/usr/bin/env python3
"""
Task #60: Cookie同意バナー
- src/components/CookieConsent.tsx: Cookie同意バナー
- root layout.tsxに追加
- GA4をcookie同意後のみ読み込み
"""

import os

# ============================================================
# 1. Cookie同意バナー
# ============================================================
COOKIE_CONSENT = '''\
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("gate-in-cookie-consent");
    if (!consent) {
      // 少し遅延させて表示（ページ読み込み後）
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("gate-in-cookie-consent", "accepted");
    setShow(false);
    // GA4を動的にロード
    loadGA();
  };

  const decline = () => {
    localStorage.setItem("gate-in-cookie-consent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-lg p-4 md:p-0">
      <div className="max-w-5xl mx-auto md:flex md:items-center md:justify-between md:py-4 md:px-4">
        <p className="text-sm text-gray-600 mb-3 md:mb-0 md:mr-4">
          当サイトではサービス改善のためCookieを使用しています。
          詳しくは<Link href="/privacy" className="text-green-600 hover:underline mx-0.5">プライバシーポリシー</Link>をご確認ください。
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            拒否
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-bold"
          >
            同意する
          </button>
        </div>
      </div>
    </div>
  );
}

function loadGA() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId || typeof window === "undefined") return;

  // 既にロード済みならスキップ
  if (document.querySelector(`script[src*="googletagmanager"]`)) return;

  const script1 = document.createElement("script");
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement("script");
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}', { page_path: window.location.pathname });
  `;
  document.head.appendChild(script2);
}
'''

# ============================================================
# 2. GoogleAnalytics.tsx を同意ベースに変更
# ============================================================
GA_UPDATED = '''\
"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("gate-in-cookie-consent");
    if (consent === "accepted") {
      setConsented(true);
    }
  }, []);

  if (!GA_ID || !consented) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
'''

def run():
    # 1. CookieConsent コンポーネント
    with open("src/components/CookieConsent.tsx", "w") as f:
        f.write(COOKIE_CONSENT)
    print("  ✅ src/components/CookieConsent.tsx")

    # 2. GoogleAnalytics.tsx を同意ベースに更新
    with open("src/components/GoogleAnalytics.tsx", "w") as f:
        f.write(GA_UPDATED)
    print("  ✅ src/components/GoogleAnalytics.tsx 更新（同意ベース）")

    # 3. root layout.tsx に CookieConsent 追加
    layout = "src/app/layout.tsx"
    with open(layout, "r") as f:
        content = f.read()

    if "CookieConsent" not in content:
        # import追加
        content = content.replace(
            'import GoogleAnalytics from "@/components/GoogleAnalytics";',
            'import GoogleAnalytics from "@/components/GoogleAnalytics";\nimport CookieConsent from "@/components/CookieConsent";'
        )
        # body内に追加
        content = content.replace(
            "<GoogleAnalytics />",
            "<GoogleAnalytics />\n        <CookieConsent />"
        )
        with open(layout, "w") as f:
            f.write(content)
        print("  ✅ layout.tsx に CookieConsent 追加")
    else:
        print("  ⏭️  既に追加済み")

    print("\n🏁 Task #60 完了")

if __name__ == "__main__":
    run()
