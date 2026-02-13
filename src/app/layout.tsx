import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ゲートイン！ | 競馬予想で腕試し",
    template: "%s | ゲートイン！",
  },
  description: "みんなの予想で腕試し！レースの1着・複勝・危険馬を予想してポイントを稼ごう。月間ランキング上位者にはAmazonギフト券をプレゼント！",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏇</text></svg>" },
  metadataBase: new URL("https://gate-in.jp"),
  openGraph: {
    title: "ゲートイン！ | 競馬予想で腕試し",
    description: "みんなの予想で腕試し！レースの1着・複勝・危険馬を予想してポイントを稼ごう。",
    siteName: "ゲートイン！",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/api/og?title=ゲートイン！", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ゲートイン！ | 競馬予想で腕試し",
    description: "みんなの予想で腕試し！レースの1着・複勝・危険馬を予想してポイントを稼ごう。",
    images: ["/api/og?title=ゲートイン！"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

import GoogleAnalytics from "@/components/GoogleAnalytics";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "ゲートイン！",
              url: "https://gate-in.jp",
              logo: "https://gate-in.jp/icon.png",
              description: "競馬予想SNS。レースの1着・複勝・危険馬を予想してポイントを稼ごう！",
              sameAs: [],
            }),
          }}
        />
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
