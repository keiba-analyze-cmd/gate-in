// src/app/(main)/predictors/[id]/page.tsx
import { createAdminClient } from "@/lib/admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PredictorJsonLd } from "@/components/seo/PredictorJsonLd";
import PredictorPageClient from "./PredictorPageClient";

// ── キャラクターマスタ（フォールバック用） ──
const PREDICTOR_META: Record<
  string,
  {
    name: string;
    title: string;
    type: string;
    color: string;
    emoji: string;
    catchphrase: string;
    description: string;
    style: string;
    strength: string;
  }
> = {
  hayate: {
    name: "ハヤテ",
    title: "疾風のデータアナリスト",
    type: "データ分析型",
    color: "#1E40AF",
    emoji: "⚡",
    catchphrase: "数字は嘘をつかない。",
    description:
      "IDM・スピード指数を軸にした的中率重視の予想スタイル。データに裏打ちされた堅実な◎選びが持ち味。",
    style: "的中率重視・堅実派",
    strength: "重賞レースでの安定感",
  },
  kazan: {
    name: "カザン",
    title: "炎の穴馬ハンター",
    type: "穴馬予測型",
    color: "#DC2626",
    emoji: "🔥",
    catchphrase: "人気と実力の歪み、そこに宝がある。",
    description:
      "人気と実力の乖離を見抜く回収率特化型。他が見逃す激走馬を炙り出す。",
    style: "回収率重視・一撃必殺",
    strength: "人気薄の好走を見抜く嗅覚",
  },
  hakusen: {
    name: "ハクセン",
    title: "白の血統マエストロ",
    type: "血統分析型",
    color: "#059669",
    emoji: "🌿",
    catchphrase: "血は語る。走りの答えは、その血脈にある。",
    description:
      "種牡馬×条件別の成績データを駆使した血統予想の専門家。新馬戦・未勝利戦で真価を発揮。",
    style: "血統重視・条件特化",
    strength: "新馬戦・条件替わりでの発見力",
  },
  hibari: {
    name: "ヒバリ",
    title: "朝の現場リポーター",
    type: "当日データ型",
    color: "#D97706",
    emoji: "🌅",
    catchphrase: "朝イチの馬体を見れば、走る馬がわかる。",
    description:
      "馬体重・オッズ急変・馬場状態など、当日にしか手に入らない情報で勝負。発走30分前に予想を公開。",
    style: "当日データ重視・直前派",
    strength: "馬体重変動・オッズ急変の読み",
  },
  gantetsu: {
    name: "ガンテツ",
    title: "鋼の軸馬マスター",
    type: "軸馬特化型",
    color: "#475569",
    emoji: "🛡️",
    catchphrase: "◎は1頭。迷わない。",
    description:
      "全ファクターを統合し、最も信頼できる◎を1頭だけ選出。複勝的中率90%を目標とする鉄壁の軸馬選び。",
    style: "軸馬特化・鉄壁型",
    strength: "複勝圏内率の高さ",
  },
};

// ── メタデータ ──
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = PREDICTOR_META[id];
  if (!meta) return {};

  return {
    title: `${meta.name}（${meta.title}）- AI予想家`,
    description: meta.description,
    openGraph: {
      title: `${meta.emoji} ${meta.name} - ${meta.title} | ゲートイン！`,
      description: meta.description,
      images: [`/images/predictors/${id}.png`],
    },
  };
}

// ── 静的パス生成 ──
export function generateStaticParams() {
  return Object.keys(PREDICTOR_META).map((id) => ({ id }));
}

// ── ページ本体 ──
export default async function PredictorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = PREDICTOR_META[id];
  if (!meta) notFound();

  const admin = createAdminClient();

  // AI予想家のDB情報を取得
  const { data: predictor } = await admin
    .from("ai_predictors")
    .select("*")
    .eq("id", id)
    .single();

  // 月間成績を取得（直近3ヶ月）
  const { data: monthlyStats } = await admin
    .from("ai_monthly_stats")
    .select("*")
    .eq("predictor_id", id)
    .order("year_month", { ascending: false })
    .limit(3);

  // 直近の予想を取得（最新20件）
  const { data: recentPredictions } = await admin
    .from("ai_predictions")
    .select(
      `
      *,
      races:race_id (
        id, name, grade, course_name, race_date, race_number
      )
    `
    )
    .eq("predictor_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  // ── 着順を取得してマッピング ──
  // race_entries(race_id + post_number) → race_results(finish_position)
  let predictionsWithResults = recentPredictions || [];

  if (recentPredictions && recentPredictions.length > 0) {
    const raceIds = [...new Set(recentPredictions.map((p) => p.race_id))];

    // 該当レースの race_entries を取得
    const { data: entries } = await admin
      .from("race_entries")
      .select("id, race_id, post_number")
      .in("race_id", raceIds);

    if (entries && entries.length > 0) {
      const entryIds = entries.map((e) => e.id);

      // race_results を取得
      const { data: results } = await admin
        .from("race_results")
        .select("race_entry_id, finish_position")
        .in("race_entry_id", entryIds);

      // ルックアップマップ: entry_id → finish_position
      const resultMap = new Map<string, number>();
      if (results) {
        for (const r of results) {
          resultMap.set(r.race_entry_id, r.finish_position);
        }
      }

      // ルックアップマップ: "race_id:post_number" → finish_position
      const positionMap = new Map<string, number>();
      for (const e of entries) {
        const fp = resultMap.get(e.id);
        if (fp !== undefined) {
          positionMap.set(`${e.race_id}:${e.post_number}`, fp);
        }
      }

      // 予想に着順を付与
      predictionsWithResults = recentPredictions.map((pred) => ({
        ...pred,
        finish_position:
          positionMap.get(`${pred.race_id}:${pred.umaban}`) ?? null,
      }));
    }
  }

  return (
    <>
      <PredictorJsonLd
        name={`${meta.name}（${meta.title}）`}
        description={meta.description}
        image={`https://gate-in.jp/images/predictors/${id}.png`}
        url={`https://gate-in.jp/predictors/${id}`}
      />
      <PredictorPageClient
        predictorId={id}
        meta={meta}
        predictor={predictor}
        monthlyStats={monthlyStats || []}
        recentPredictions={predictionsWithResults}
      />
    </>
  );
}
