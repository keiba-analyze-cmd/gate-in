// scripts/rating/backfill.ts
//
// 過去の確定済みレースをまとめてレート初期化するバックフィル。
//
// 使い方:
//   npx tsx scripts/rating/backfill.ts --limit 20   → 直近20レースだけ（まず動作確認）
//   npx tsx scripts/rating/backfill.ts              → 確定済み全レース
//   npx tsx scripts/rating/backfill.ts --reset      → 既存レート状態を消してからやり直し（任意）
//   npx tsx scripts/rating/backfill.ts --no-recompute → Pass2をスキップ（デバッグ用）
//
// 仕組み（順序依存EWMAを正しく収束させる2パス）:
//   Pass1: 各レースで rating_score を保存し rating_applied を立てる（順不同でOK）
//   Pass2: predictor ごとに created_at 順（時系列）で再計算 → 最終レート確定
//
// 安全性: 新テーブル predictor_ratings と新列 rating_* にしか書かない。冪等で、
//         途中で止めても再実行で続行可。--reset を付けない限り既存状態は壊さない。

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  settleRaceRatingWithSupabase,
  recomputePredictorWithSupabase,
} from "../../src/lib/rating/supabase-deps";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const k = m[1];
    const v = m[2].trim().replace(/^['"]|['"]$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が読めません(.env.local)");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const NO_RECOMPUTE = args.includes("--no-recompute");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? "0", 10) : 0;

const PAGE = 500;

async function reset() {
  console.log("⚠️  --reset: 既存のレート状態を消去します...");
  await supabase.from("predictor_ratings").delete().neq("predictor_id", "__none__");
  await supabase
    .from("votes")
    .update({ rating_applied: false, rating_score: null, rating_voided: false })
    .eq("rating_applied", true);
  await supabase
    .from("ai_predictions")
    .update({ rating_applied: false, rating_score: null, rating_voided: false })
    .eq("rating_applied", true);
  console.log("   完了。\n");
}

async function getFinishedRaceIds(): Promise<string[]> {
  // --limit のときは「直近N件」を対象（AI予想/投票がある新しいレースで確認しやすい）
  // 全件のときは順不同でOK（Pass2で時系列に直す）
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("races")
      .select("id, post_time")
      .eq("status", "finished")
      .order("post_time", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as any[];
    for (const r of batch) ids.push(r.id);
    if (batch.length < PAGE) break;
    if (LIMIT && ids.length >= LIMIT) break;
  }
  return LIMIT ? ids.slice(0, LIMIT) : ids;
}

async function getAppliedPredictorKeys(): Promise<string[]> {
  const keys = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("votes")
      .select("user_id")
      .eq("rating_applied", true)
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data ?? []) as any[];
    for (const v of batch) keys.add(`user:${v.user_id}`);
    if (batch.length < 1000) break;
  }
  const { data, error } = await supabase
    .from("ai_predictions")
    .select("predictor_id")
    .eq("rating_applied", true);
  if (error) throw error;
  for (const a of (data ?? []) as any[]) keys.add(`ai:${a.predictor_id}`);
  return [...keys];
}

async function main() {
  console.log("=== レート バックフィル ===");
  console.log(
    `mode: ${LIMIT ? `直近${LIMIT}レース` : "全確定済みレース"}${RESET ? " / reset" : ""}${
      NO_RECOMPUTE ? " / no-recompute" : ""
    }\n`
  );

  if (RESET) await reset();

  // Pass1: 採点 + 適用
  const raceIds = await getFinishedRaceIds();
  console.log(`Pass1: ${raceIds.length} レースを採点...`);
  let scored = 0,
    applied = 0,
    failed = 0;
  for (let i = 0; i < raceIds.length; i++) {
    try {
      const r = await settleRaceRatingWithSupabase(supabase, raceIds[i]);
      scored += r.scored;
      applied += r.applied;
    } catch (e) {
      failed++;
      console.error(`  ✗ race ${raceIds[i]}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if ((i + 1) % 50 === 0 || i === raceIds.length - 1) {
      console.log(`  ...${i + 1}/${raceIds.length}  (scored=${scored}, applied=${applied}, failed=${failed})`);
    }
  }
  console.log(`Pass1 完了: scored=${scored}, applied=${applied}, failed=${failed}\n`);

  // Pass2: 時系列で再計算
  if (!NO_RECOMPUTE) {
    const keys = await getAppliedPredictorKeys();
    console.log(`Pass2: ${keys.length} predictor を時系列で再計算...`);
    let done = 0,
      rfail = 0;
    for (const k of keys) {
      try {
        await recomputePredictorWithSupabase(supabase, k);
      } catch (e) {
        rfail++;
        console.error(`  ✗ ${k}: ${e instanceof Error ? e.message : String(e)}`);
      }
      done++;
      if (done % 100 === 0 || done === keys.length) console.log(`  ...${done}/${keys.length} (failed=${rfail})`);
    }
    console.log(`Pass2 完了: recomputed=${done - rfail}, failed=${rfail}\n`);
  }

  // プレビュー
  const { data: top } = await supabase
    .from("predictor_ratings")
    .select("predictor_type, predictor_id, rating, n, provisional")
    .order("rating", { ascending: false })
    .limit(15);
  console.log("▼ リーダーボード上位15（rating降順）:");
  for (const r of (top ?? []) as any[]) {
    console.log(
      `  ${r.predictor_type}:${r.predictor_id}  rating=${Math.round(r.rating)}  n=${r.n}${
        r.provisional ? "  (暫定)" : ""
      }`
    );
  }
  console.log("\n✅ バックフィル完了。");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
