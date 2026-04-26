// src/components/seo/PredictorJsonLd.tsx
// AI予想家ページ用の構造化データ

export function PredictorJsonLd({
  name,
  description,
  image,
  url,
}: {
  name: string;
  description: string;
  image: string;
  url: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description,
    image,
    url,
    jobTitle: "AI競馬予想家",
    memberOf: {
      "@type": "WebApplication",
      name: "ゲートイン！",
      url: "https://gate-in.jp",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
