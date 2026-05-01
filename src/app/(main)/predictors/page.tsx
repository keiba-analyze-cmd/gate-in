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
    color: "#1E40AF",
    emoji: "⚡",
    shortDesc: "IDM・スピード指数を軸にした的中率重視の堅実派。",
  },
  {
    id: "kazan",
    name: "カザン",
    title: "炎の穴馬ハンター",
    type: "穴馬予測型",
    colorBg: "from-red-600 to-red-800",
    color: "#DC2626",
    emoji: "🔥",
    shortDesc: "人気と実力の乖離を見抜く回収率特化型。",
  },
  {
    id: "hakusen",
    name: "ハクセン",
    title: "白の血統マエストロ",
    type: "血統分析型",
    colorBg: "from-emerald-600 to-emerald-800",
    color: "#059669",
    emoji: "🌿",
    shortDesc: "種牡馬×条件の血統分析で新馬戦に強い。",
  },
  {
    id: "hibari",
    name: "ヒバリ",
    title: "朝の現場リポーター",
    type: "当日データ型",
    colorBg: "from-amber-500 to-amber-700",
    color: "#D97706",
    emoji: "🌅",
    shortDesc: "馬体重・オッズ急変を読む当日勝負の直前派。",
  },
  {
    id: "gantetsu",
    name: "ガンテツ",
    title: "鋼の軸馬マスター",
    type: "軸馬特化型",
    colorBg: "from-slate-500 to-slate-700",
    color: "#475569",
    emoji: "🛡️",
    shortDesc: "全指標統合で◎1頭のみ。複勝的中率90%目標。",
  },
];

const STEPS = [
  {
    num: "1",
    title: "ストーリーズで予想をチェック",
    desc: "TOPページのストーリーズから各AI予想家の◎本命を確認できます",
  },
  {
    num: "2",
    title: "「この予想で乗っかる」",
    desc: "気に入った予想をワンタップ。自分の投票に◎として自動反映されます",
  },
  {
    num: "3",
    title: "レース詳細のAI予想タブ",
    desc: "投票後にAI予想家全員の◎を比較。自分の予想と照らし合わせましょう",
  },
];

export default function PredictorsIndexPage() {
  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* ═══ ローンチヒーロー ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 -mx-4 px-6 pt-10 pb-8 text-center">
        {/* 背景グロー */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[200px] h-[200px] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative">
          <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-400/15 px-4 py-1.5 rounded-full mb-4 tracking-widest">
            NEW FEATURE
          </span>

          <h1 className="text-2xl font-black text-white leading-tight mb-2">
            5体の
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              AI予想家
            </span>
            が
            <br />
            あなたの競馬を変える
          </h1>

          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            JRDBの膨大なデータを分析し
            <br />
            それぞれ異なる視点で◎本命を選出
          </p>

          {/* キャラ画像横並び */}
          <div className="flex justify-center -space-x-2 mb-6">
            {PREDICTORS.map((p) => (
              <div
                key={p.id}
                className="w-14 h-14 rounded-full border-[3px] border-slate-900 overflow-hidden"
                style={{ backgroundColor: p.color + "25" }}
              >
                <Image
                  src={`/images/predictors/${p.id}.webp`}
                  alt={p.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 集合画像 ═══ */}
      <section className="overflow-hidden -mx-4">
        <Image
          src="/images/ai-group.jpg"
          alt="AI予想家5体"
          width={800}
          height={400}
          className="w-full h-auto"
          priority
        />
      </section>

      {/* ═══ キャラクター一覧 ═══ */}
      <section className="space-y-4 mt-6 px-0">
        <h2 className="text-lg font-black text-gray-900 dark:text-white px-1">
          AI予想家を選ぶ
        </h2>
        {PREDICTORS.map((p) => (
          <Link
            key={p.id}
            href={`/predictors/${p.id}`}
            className="block group"
          >
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${p.colorBg} p-5 text-white hover:shadow-xl transition-shadow`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className="text-[120px] leading-none">{p.emoji}</div>
              </div>
              <div className="relative flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30 shrink-0 bg-white/10">
                  <Image
                    src={`/images/predictors/${p.id}.webp`}
                    alt={p.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{p.emoji}</span>
                    <h3 className="text-xl font-black">{p.name}</h3>
                    <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                      {p.type}
                    </span>
                  </div>
                  <p className="text-white/80 text-xs mb-1.5">{p.title}</p>
                  <p className="text-white/70 text-sm">{p.shortDesc}</p>
                </div>
                <span className="text-white/40 text-xl group-hover:text-white/80 transition-colors shrink-0">
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* ═══ 使い方 ═══ */}
      <section className="mt-8">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 px-1">
          使い方
        </h2>
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-5">
          {STEPS.map((step) => (
            <div key={step.num} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.num}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-white">
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="mt-8 text-center">
        <Link
          href="/races"
          className="inline-block bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold text-sm px-10 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          さっそく予想してみる →
        </Link>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
          ※ AI予想はJRDBデータに基づく参考情報です。投資判断にはご注意ください。
        </p>
      </section>
    </div>
  );
}
