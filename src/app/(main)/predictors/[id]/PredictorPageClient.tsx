// src/app/(main)/predictors/[id]/PredictorPageClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type PredictorMeta = {
  name: string;
  title: string;
  type: string;
  color: string;
  emoji: string;
  catchphrase: string;
  description: string;
  style: string;
  strength: string;
};

type MonthlyStats = {
  year_month: string;
  total_predictions: number;
  win_count: number;
  place_count: number;
  
  win_rate: number;
  place_rate: number;
  roi_win: number;
  total_points: number;
  best_hit_odds: number | null;
};

type Prediction = {
  id: string;
  race_id: string;
  umaban: number;
  horse_name: string;
  comment: string;
  finish_position: number | null;
  created_at: string;
  races: {
    id: string;
    name: string;
    grade: string | null;
    course_name: string;
    race_date: string;
    race_number: number;
  } | null;
};

type Props = {
  predictorId: string;
  meta: PredictorMeta;
  predictor: Record<string, unknown> | null;
  monthlyStats: MonthlyStats[];
  recentPredictions: Prediction[];
};

const TABS = [
  { id: "profile", label: "プロフィール", icon: "👤" },
  { id: "stats", label: "成績", icon: "📊" },
  { id: "predictions", label: "予想履歴", icon: "🏇" },
  { id: "columns", label: "コラム", icon: "📝" },
] as const;

type TabId = "profile" | "stats" | "predictions" | "columns"; // was (typeof TABS)[number]["id"];

// ── 他の予想家への導線 ──
const ALL_PREDICTORS = [
  { id: "hayate", name: "ハヤテ", emoji: "⚡", color: "#1E40AF" },
  { id: "kazan", name: "カザン", emoji: "🔥", color: "#DC2626" },
  { id: "hakusen", name: "ハクセン", emoji: "🌿", color: "#059669" },
  { id: "hibari", name: "ヒバリ", emoji: "🌅", color: "#D97706" },
  { id: "gantetsu", name: "ガンテツ", emoji: "🛡️", color: "#475569" },
];

export default function PredictorPageClient({
  predictorId,
  meta,
  predictor,
  monthlyStats,
  recentPredictions,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const otherPredictors = ALL_PREDICTORS.filter((p) => p.id !== predictorId);

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      {/* ── ヒーローヘッダー ── */}
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)`,
        }}
      >
        {/* 背景パターン */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                               radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                               radial-gradient(circle at 60% 80%, white 1px, transparent 1px)`,
              backgroundSize: "60px 60px, 80px 80px, 40px 40px",
            }}
          />
        </div>

        <div className="relative px-6 py-8 flex items-center gap-5">
          {/* キャラアイコン */}
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/30 shadow-lg bg-white/10">
              <Image
                src={`/images/predictors/${predictorId}.png`}
                alt={meta.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* テキスト */}
          <div className="text-white min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{meta.emoji}</span>
              <h1 className="text-2xl font-black">{meta.name}</h1>
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">
              {meta.title}
            </p>
            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <span className="text-xs font-bold text-white/90">
                {meta.type}
              </span>
            </div>
          </div>
        </div>

        {/* キャッチフレーズ */}
        <div className="relative px-6 pb-6">
          <blockquote className="text-white/90 text-sm italic border-l-2 border-white/40 pl-3">
            「{meta.catchphrase}」
          </blockquote>
        </div>
      </section>

      {/* ── タブ切り替え ── */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── タブコンテンツ ── */}
      {activeTab === "profile" && (
        <ProfileTab meta={meta} predictorId={predictorId} />
      )}
      {activeTab === "stats" && (
        <StatsTab meta={meta} monthlyStats={monthlyStats} />
      )}
      {activeTab === "predictions" && (
        <PredictionsTab
          meta={meta}
          predictions={recentPredictions}
        />
      )}
      {activeTab === "columns" && (
        <ColumnsTab predictorId={predictorId} meta={meta} />
      )}
      <section className="space-y-3">
        <h2 className="text-base font-black text-gray-900 dark:text-white">
          🤖 他のAI予想家
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {otherPredictors.map((p) => (
            <Link
              key={p.id}
              href={`/predictors/${p.id}`}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={`/images/predictors/${p.id}.png`}
                  alt={p.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span>{p.emoji}</span>
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                    {p.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="text-center py-4">
        <Link
          href="/races"
          className="inline-block text-white font-bold text-sm px-8 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          style={{ backgroundColor: meta.color }}
        >
          レースを見て予想する →
        </Link>
      </section>
    </div>
  );
}

// ══════════════════════════════════════
// プロフィールタブ
// ══════════════════════════════════════
function ProfileTab({
  meta,
  predictorId,
}: {
  meta: PredictorMeta;
  predictorId: string;
}) {
  return (
    <div className="space-y-4">
      {/* 予想スタイル */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
          <span>🎯</span>予想スタイル
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {meta.description}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              スタイル
            </div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {meta.style}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              得意分野
            </div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {meta.strength}
            </div>
          </div>
        </div>
      </div>

      {/* キャラ紹介 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3">
        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
          <span>📖</span>キャラクター紹介
        </h3>
        {predictorId === "hayate" && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            元・証券アナリストの経歴を持つデータの申し子。感情に左右されず、数字だけを信じる。
            口数は少ないが、分析結果には絶対の自信を持つ。IDMとスピード指数を独自にブレンドした
            「ハヤテ指数」で的中率を追求する。
          </p>
        )}
        {predictorId === "kazan" && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            「人気馬を買っても儲からない」が信条の穴党。オッズと実力の歪みを見抜き、
            大穴激走を的中させる快感に取り憑かれている。外れることも多いが、
            当たった時の破壊力は5体中No.1。
          </p>
        )}
        {predictorId === "hakusen" && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            血統データベースを丸暗記していると噂される博識家。種牡馬の産駒傾向、
            母父の影響、コース適性まで血統面から多角的に分析。
            特に新馬戦やクラス替わりなど、過去走データが少ない場面で本領を発揮する。
          </p>
        )}
        {predictorId === "hibari" && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            朝一番にトレセンの様子をチェックし、馬体重の増減やパドックの雰囲気、
            馬場状態の変化をリアルタイムで分析。他の予想家が前日に予想を出す中、
            ヒバリだけは発走30分前に予想を公開する当日派。
          </p>
        )}
        {predictorId === "gantetsu" && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            「◎は1頭だけでいい」——全ファクターを総合的に判断し、最も信頼できる馬を
            1頭だけ選出するスタイル。複勝圏内率90%を目標に掲げ、厳選レースのみ予想を出す。
            予想を出さないレースも多いが、出した時の信頼度は随一。
          </p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 成績タブ
// ══════════════════════════════════════
function StatsTab({
  meta,
  monthlyStats,
}: {
  meta: PredictorMeta;
  monthlyStats: MonthlyStats[];
}) {
  if (monthlyStats.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          まだ成績データがありません。
          <br />
          レース確定後に自動で集計されます。
        </p>
      </div>
    );
  }

  // 全期間の集計
  const totals = monthlyStats.reduce(
    (acc, s) => ({
      races: acc.races + (s.total_predictions || 0),
      win: acc.win + s.win_count,
      place: acc.place + s.place_count,
      
    }),
    { races: 0, win: 0, place: 0 }
  );

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
        <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>📈</span>通算成績
        </h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-2xl font-black" style={{ color: meta.color }}>
              {totals.races}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              予想レース
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-500">
              {totals.races > 0
                ? ((totals.win / totals.races) * 100).toFixed(1)
                : "—"}
              %
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              1着的中率
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-500">
              {totals.races > 0
                ? ((totals.place / totals.races) * 100).toFixed(1)
                : "—"}
              %
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              3着内率
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-green-600">
              {totals.win}勝
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              1着的中
            </div>
          </div>
        </div>
      </div>

      {/* 月別成績 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
        <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>📅</span>月別成績
        </h3>
        <div className="space-y-3">
          {monthlyStats.map((s) => (
            <div
              key={s.year_month}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                  {formatYearMonth(s.year_month)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {s.total_predictions}レース
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white dark:bg-gray-600 rounded-lg px-2 py-1.5">
                  <div className="text-sm font-black text-red-500">
                    {s.win_rate?.toFixed(1) ?? '0.0'}%
                  </div>
                  <div className="text-[10px] text-gray-400">勝率</div>
                </div>
                <div className="bg-white dark:bg-gray-600 rounded-lg px-2 py-1.5">
                  <div className="text-sm font-black text-blue-500">
                    {s.place_rate?.toFixed(1) ?? '0.0'}%
                  </div>
                  <div className="text-[10px] text-gray-400">3着内</div>
                </div>
                <div className="bg-white dark:bg-gray-600 rounded-lg px-2 py-1.5">
                  <div className="text-sm font-black text-green-600">
                    {(s.roi_win ?? 0).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-gray-400">回収率</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 予想履歴タブ
// ══════════════════════════════════════
function PredictionsTab({
  meta,
  predictions,
}: {
  meta: PredictorMeta;
  predictions: Prediction[];
}) {
  if (predictions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🏇</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          まだ予想データがありません。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {predictions.map((pred) => {
        const race = pred.races;
        const isHit =
          pred.finish_position !== null && pred.finish_position <= 3;
        const isWin = pred.finish_position === 1;

        return (
          <div
            key={pred.id}
            className={`bg-white dark:bg-gray-800 border rounded-xl p-4 ${
              isWin
                ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/10"
                : isHit
                  ? "border-green-200 bg-green-50/30 dark:bg-green-900/10"
                  : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {/* レース情報 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {race?.grade && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      race.grade === "G1"
                        ? "bg-yellow-100 text-yellow-800"
                        : race.grade === "G2"
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {race.grade}
                  </span>
                )}
                <Link
                  href={`/races/${race?.id}`}
                  className="font-bold text-sm text-gray-800 dark:text-gray-200 hover:underline"
                >
                  {race?.name || "不明なレース"}
                </Link>
              </div>
              <span className="text-[10px] text-gray-400">
                {race?.course_name} {race?.race_date}
              </span>
            </div>

            {/* 予想内容 */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ backgroundColor: meta.color }}
              >
                ◎
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {pred.umaban}番 {pred.horse_name}
                  </span>
                  {pred.finish_position !== null && (
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isWin
                          ? "bg-yellow-200 text-yellow-800"
                          : isHit
                            ? "bg-green-200 text-green-800"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {pred.finish_position}着
                    </span>
                  )}
                </div>
                {pred.comment && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {pred.comment}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ユーティリティ ──
function formatYearMonth(ym: string): string {
  // "2026-04" → "2026年4月"
  const [year, month] = ym.split("-");
  return `${year}年${parseInt(month)}月`;
}

// ══════════════════════════════════════
// コラムタブ
// ══════════════════════════════════════
function ColumnsTab({
  predictorId,
  meta,
}: {
  predictorId: string;
  meta: PredictorMeta;
}) {
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ai-columns?predictor_id=${predictorId}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setColumns(data.columns || []);
        }
      } catch {}
      setLoading(false);
    })();
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
        <div className="text-sm text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          まだコラムがありません。
          <br />
          金曜・土曜・月曜に自動生成されます。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {columns.map((col: any) => (
        <div
          key={col.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{meta.emoji}</span>
            <h3 className="font-black text-gray-900 dark:text-white text-sm flex-1">
              {col.title}
            </h3>
            <span className="text-[10px] text-gray-400">
              {new Date(col.created_at).toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {col.race_name && (
            <div className="flex items-center gap-2 mb-2">
              {col.race_grade && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    col.race_grade === "G1"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400"
                      : col.race_grade === "G2"
                        ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400"
                        : "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400"
                  }`}
                >
                  {col.race_grade}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {col.race_name}
              </span>
            </div>
          )}
          <div
            className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
            style={{ borderLeft: `3px solid ${meta.color}`, paddingLeft: "12px" }}
          >
            {col.content}
          </div>
        </div>
      ))}
    </div>
  );
}
