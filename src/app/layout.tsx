import type { Metadata, Viewport } from "next";
import StagingBanner from "@/components/layout/StagingBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ゲートイン！ | 競馬予想で腕試し",
    template: "%s | ゲートイン！",
  },
  description: "競馬予想SNS&競馬学習プラットフォーム。本命・対抗・危険馬を予想してポイントを稼ごう！血統やコース攻略などの知識もクイズで楽しく学べる。",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏇</text></svg>" },
  metadataBase: new URL("https://gate-in.jp"),
  openGraph: {
    title: "ゲートイン！ | 競馬予想で腕試し",
    description: "みんなの予想で腕試し！本命・対抗・危険馬を予想してポイントを稼ごう。",
    siteName: "ゲートイン！",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/api/og?title=ゲートイン！", width: 1200, height: 630 }],
  },
  verification: { google: "6bhGEFMP9Ks_vGaFch0SVAJz45i_9Yn7ZuvzZKwUpS8" },
  twitter: {
    card: "summary_large_image",
    title: "ゲートイン！ | 競馬予想で腕試し",
    description: "みんなの予想で腕試し！本命・対抗・危険馬を予想してポイントを稼ごう。",
    images: ["/api/og?title=ゲートイン！"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#16a34a",
};

import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "ゲートイン！",
              url: "https://gate-in.jp",
              logo: "https://gate-in.jp/icon.png",
              description: "競馬予想SNS。本命・対抗・危険馬を予想してポイントを稼ごう！",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body>
        <StagingBanner />
        <GoogleAnalytics />
        <CookieConsent />
        {children}
      </body>
    </html>
  );
}
