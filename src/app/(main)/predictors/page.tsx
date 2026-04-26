// src/app/(main)/predictors/page.tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI予想家",
  description:
    "ゲートイン！のAI予想家5体を紹介。データ分析型ハヤテ、穴馬ハンターカザン、血統マエストロハクセン、当日派ヒバリ、軸馬マスターガンテツ。",
  openGraph: {
    title: "AI予想家 | ゲートイン！",
    description: "個性豊かなAI予想家5体があなたの競馬予想をサポート",
    images: ["/images/ai-group.jpg"],
  },
};

const PREDICTORS = [
  {
    id: "hayate",
    name: "ハヤテ",
    title: "疾風のデータアナリスト",
    type: "データ分析型",
    colorBg: "from-blue-600 to-blue-800",
    emoji: "⚡",
    shortDesc: "IDM・スピード指数を軸にした的中率重視の堅実派。",
  },
  {
    id: "kazan",
    name: "カザン",
    title: "炎の穴馬ハンター",
    type: "穴馬予測型",
    colorBg: "from-red-600 to-red-800",
    emoji: "🔥",
    shortDesc: "オッズと実力の乖離を狙う回収率特化型。",
  },
  {
    id: "hakusen",
    name: "ハクセン",
    title: "白の血統マエストロ",
    type: "血統分析型",
    colorBg: "from-emerald-600 to-emerald-800",
    emoji: "🌿",
    shortDesc: "種牡馬×条件別の血統データ予想。新馬戦に強い。",
  },
  {
    id: "hibari",
    name: "ヒバリ",
    title: "朝の現場リポーター",
    type: "当日データ型",
    colorBg: "from-amber-600 to-amber-800",
    emoji: "🌅",
    shortDesc: "馬体重・オッズ急変を捉える当日直前派。",
  },
  {
    id: "gantetsu",
    name: "ガンテツ",
    title: "鋼の軸馬マスター",
    type: "軸馬特化型",
    colorBg: "from-slate-600 to-slate-800",
    emoji: "🛡️",
    shortDesc: "全指標統合で◎1頭のみ。複勝的中率90%目標。",
  },
];

export default function PredictorsIndexPage() {
  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      {/* ヘッダー */}
      <section className="text-center pt-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
          🤖 AI予想家
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          個性豊かな5体のAI予想家があなたの予想をサポート
        </p>
      </section>

      {/* 集合画像 */}
      <section className="rounded-2xl overflow-hidden shadow-lg">
        <Image
          src="/images/ai-group.jpg"
          alt="AI予想家5体"
          width={800}
          height={400}
          className="w-full h-auto"
          priority
        />
      </section>

      {/* キャラクター一覧 */}
      <section className="space-y-4">
        {PREDICTORS.map((p) => (
          <Link
            key={p.id}
            href={`/predictors/${p.id}`}
            className="block group"
          >
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${p.colorBg} p-5 text-white hover:shadow-xl transition-shadow`}
            >
              {/* 背景装飾 */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className="text-[120px] leading-none">{p.emoji}</div>
              </div>

              <div className="relative flex items-center gap-4">
                {/* アイコン */}
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30 shrink-0 bg-white/10">
                  <Image
                    src={`/images/predictors/${p.id}.png`}
                    alt={p.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{p.emoji}</span>
                    <h2 className="text-xl font-black">{p.name}</h2>
                    <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                      {p.type}
                    </span>
                  </div>
                  <p className="text-white/80 text-xs mb-1.5">{p.title}</p>
                  <p className="text-white/70 text-sm">{p.shortDesc}</p>
                </div>

                {/* 矢印 */}
                <span className="text-white/40 text-xl group-hover:text-white/80 transition-colors shrink-0">
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* CTA */}
      <section className="text-center py-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          AI予想はレース詳細ページの「🤖 AI予想」タブで確認できます
        </p>
        <Link
          href="/races"
          className="inline-block bg-green-600 text-white font-bold text-sm px-8 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          レース一覧へ →
        </Link>
      </section>
    </div>
  );
}
