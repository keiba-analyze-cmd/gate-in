#!/usr/bin/env python3
"""
Task #43: 構造化データ（JSON-LD）
- レース詳細ページに SportsEvent JSON-LD を追加
- レイアウトに Organization JSON-LD を追加
"""

import os, re

# ============================================================
# 1. JSON-LD コンポーネント
# ============================================================
JSONLD_COMPONENT = '''\
type Props = {
  data: Record<string, unknown>;
};

export default function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
'''

os.makedirs("src/components/seo", exist_ok=True)
with open("src/components/seo/JsonLd.tsx", "w") as f:
    f.write(JSONLD_COMPONENT)
print("✅ src/components/seo/JsonLd.tsx")

# ============================================================
# 2. レース詳細に JSON-LD 追加
# ============================================================
race_detail = "src/app/(main)/races/[raceId]/page.tsx"
if os.path.exists(race_detail):
    with open(race_detail, "r") as f:
        content = f.read()

    if "JsonLd" not in content:
        # import 追加
        content = content.replace(
            'import RaceCountdown from "@/components/races/RaceCountdown";',
            'import RaceCountdown from "@/components/races/RaceCountdown";\nimport JsonLd from "@/components/seo/JsonLd";'
        )

        # JSON-LD データ生成コードを追加（return文の前）
        json_ld_code = '''
  // JSON-LD 構造化データ
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: race.name,
    description: `${race.course_name} ${race.race_number ? race.race_number + "R" : ""} ${race.grade ? "[" + race.grade + "]" : ""} ${race.name}`,
    startDate: race.post_time
      ? new Date(race.post_time).toISOString()
      : `${race.race_date}T00:00:00+09:00`,
    location: {
      "@type": "Place",
      name: race.course_name + "競馬場",
      address: { "@type": "PostalAddress", addressCountry: "JP" },
    },
    sport: "Horse Racing",
    url: `https://gate-in.jp/races/${raceId}`,
    organizer: {
      "@type": "Organization",
      name: "ゲートイン！",
      url: "https://gate-in.jp",
    },
    ...(isFinished && results && results.length > 0 ? {
      competitor: results.slice(0, 3).map((r: any) => ({
        "@type": "Person",
        name: r.race_entries?.horses?.name ?? "不明",
        result: `${r.finish_position}着`,
      })),
    } : {}),
  };

'''
        # return文の前に挿入
        return_pattern = "  return ("
        if return_pattern in content:
            content = content.replace(return_pattern, json_ld_code + return_pattern, 1)

            # <div className="space-y-4"> の後に <JsonLd> 追加
            first_div = '    <div className="space-y-4">'
            if first_div in content:
                # return の中の最初の space-y-4 div を探す
                idx = content.index(first_div, content.index("return ("))
                insert_after = first_div
                content = content.replace(
                    insert_after,
                    insert_after + "\n      <JsonLd data={jsonLd} />",
                    1
                )

            with open(race_detail, "w") as f:
                f.write(content)
            print(f"✅ {race_detail} に JSON-LD 追加")
        else:
            print(f"⚠️  return文が見つかりません: {race_detail}")
    else:
        print(f"⏭️  {race_detail}: 既に JsonLd あり")
else:
    print(f"⚠️  {race_detail} が見つかりません")

# ============================================================
# 3. ルートレイアウトに Organization JSON-LD
# ============================================================
layout_path = "src/app/layout.tsx"
if os.path.exists(layout_path):
    with open(layout_path, "r") as f:
        content = f.read()

    if '"@type": "Organization"' not in content and "Organization" not in content:
        org_script = '''
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
        />'''

        # <head> の閉じタグ前、または <body> 開始タグの直前に挿入
        if "</head>" in content:
            content = content.replace("</head>", org_script + "\n      </head>")
        elif "<body" in content:
            idx = content.index("<body")
            content = content[:idx] + org_script + "\n      " + content[idx:]

        with open(layout_path, "w") as f:
            f.write(content)
        print(f"✅ {layout_path} に Organization JSON-LD 追加")
    else:
        print(f"⏭️  {layout_path}: 既に Organization JSON-LD あり")
else:
    print(f"⚠️  {layout_path} が見つかりません")

print("\n🏁 Task #43 完了")
