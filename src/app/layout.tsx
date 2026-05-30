import type { Metadata, Viewport } from "next";
import StagingBanner from "@/components/layout/StagingBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ゲートイン！ | 競馬予想で腕試し",
    template: "%s | ゲートイン！",
  },
  description:
    "競馬予想SNS「ゲートイン！」。本命・対抗・穴馬を予想してポイントを稼ごう。AI予想家5体があなたの予想をサポート。月間ランキング上位者にはAmazonギフト券をプレゼント！",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏇</text></svg>",
  },
  metadataBase: new URL("https://gate-in.jp"),
  openGraph: {
    title: "ゲートイン！ | 競馬予想SNS｜AI予想家と腕試し",
    description:
      "みんなの予想で腕試し！AI予想家5体と一緒に本命・対抗・穴馬を予想してポイントを稼ごう。月間ランキング上位者にはAmazonギフト券をプレゼント！",
    siteName: "ゲートイン！",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/images/hero-ai.jpg", width: 1200, height: 630 }],
  },
  verification: { google: "6bhGEFMP9Ks_vGaFch0SVAJz45i_9Yn7ZuvzZKwUpS8" },
  twitter: {
    card: "summary_large_image",
    title: "ゲートイン！ | 競馬予想SNS",
    description:
      "AI予想家5体と一緒に競馬予想で腕試し！月間ランキング上位者にはAmazonギフト券をプレゼント。",
    images: ["/images/hero-ai.jpg"],
  },
  keywords: [
    "競馬予想",
    "競馬SNS",
    "AI予想",
    "競馬予想家",
    "無料競馬予想",
    "ゲートイン",
    "gate-in",
    "競馬ポイント",
    "競馬ランキング",
    "穴馬予想",
    "本命予想",
  ],
  alternates: {
    canonical: "https://gate-in.jp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Roboto+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "ゲートイン！",
              url: "https://gate-in.jp",
              logo: "https://gate-in.jp/images/logo.png",
              description:
                "競馬予想SNS。AI予想家5体と一緒に本命・対抗・穴馬を予想してポイントを競おう。月間ランキング上位者にはAmazonギフト券をプレゼント。",
              applicationCategory: "SportsApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "JPY",
              },
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
