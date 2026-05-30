// scripts/rating/smoke.ts
//
// 1レースだけレート計算を実走して predictor_ratings を確認するスモークテスト。
//
// 使い方:
//   npx tsx scripts/rating/smoke.ts            → 直近の確定済みレース候補を一覧
//   npx tsx scripts/rating/smoke.ts <raceId>   → そのレースでレート計算を実行（before/after表示）
//
// 安全性: 新テーブル predictor_ratings と新列 rating_* にしか書き込まない。
//         冪等なので、同じ raceId で再実行しても二重加算されない（2回目は applied=0）。
//         ※ 本番Supabaseの新テーブルに対する初回の書き込みになります（追加のみ・低リスク）。

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { settleRaceRatingWithSupabase } from "../../src/lib/rating/supabase-deps";

// --- .env.local / .env を自前ロード（tsx は自動で読まないため） ---
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
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が読めません。.env.local を確認してください。"
  );
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const raceId = process.argv[2];

async function listRaces() {
  const { data, error } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("post_time", { ascending: false })
    .limit(12);
  if (error) throw error;
  console.log("直近の確定済みレース（この id を引数に渡してください）:\n");
  for (const r of (data ?? []) as any[]) {
    const name = r.name ?? r.race_name ?? r.title ?? "(no name)";
    console.log(`  ${r.id}   ${r.post_time ?? ""}   ${name}`);
  }
  console.log("\n投票やAI予想があったレース（重賞など）を選ぶと結果が見やすいです。");
  console.log("例: npx tsx scripts/rating/smoke.ts <上記のid>");
}

async function runOne(rid: string) {
  const before = await supabase.from("predictor_ratings").select("predictor_id");
  console.log(`▼ 実行前 predictor_ratings 件数: ${before.data?.length ?? 0}\n`);

  console.log(`▶ settleRaceRating 実行: race=${rid}`);
  const res = await settleRaceRatingWithSupabase(supabase, rid);
  console.log(`  → scored=${res.scored}（採点した予想数）, applied=${res.applied}（レート前進した数）\n`);

  const after = await supabase
    .from("predictor_ratings")
    .select("predictor_type, predictor_id, rating, n, provisional")
    .order("rating", { ascending: false })
    .limit(20);
  console.log("▼ 実行後 predictor_ratings（rating降順・上位20）:");
  for (const r of (after.data ?? []) as any[]) {
    console.log(
      `  ${r.predictor_type}:${r.predictor_id}  rating=${Math.round(r.rating)}  n=${r.n}${
        r.provisional ? "  (暫定)" : ""
      }`
    );
  }

  const ai = await supabase
    .from("ai_predictions")
    .select("predictor_id, rating_score, rating_voided, rating_applied")
    .eq("race_id", rid);
  console.log("\n▼ このレースのAIの rating_score:");
  for (const a of (ai.data ?? []) as any[]) {
    const s = typeof a.rating_score === "number" ? a.rating_score.toFixed(3) : a.rating_score;
    console.log(`  ai:${a.predictor_id}  score=${s}  voided=${a.rating_voided}  applied=${a.rating_applied}`);
  }

  console.log("\n✅ 完了。同じ id でもう一度実行すると applied=0 になり、二重加算されないことも確認できます。");
}

(raceId ? runOne(raceId) : listRaces()).catch((e) => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
