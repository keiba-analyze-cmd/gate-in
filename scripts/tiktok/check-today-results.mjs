import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/9のAI予想結果
const { data } = await s.from("ai_prediction_results")
  .select("predictor_id, is_honmei_win, is_honmei_place, honmei_win_odds, races(name, grade, race_number, course_name)")
  .eq("races.race_date", "2026-05-09")
  .not("races", "is", null);

const byPredictor = {};
for (const r of data || []) {
  const p = r.predictor_id;
  if (!byPredictor[p]) byPredictor[p] = { win: 0, place: 0, total: 0, hits: [] };
  byPredictor[p].total++;
  if (r.is_honmei_win) { byPredictor[p].win++; byPredictor[p].hits.push(`${r.races?.course_name}${r.races?.race_number}R ${r.races?.name} 1着(${r.honmei_win_odds}倍)`); }
  if (r.is_honmei_place) byPredictor[p].place++;
}

console.log("=== 5/9 AI予想家 結果 ===\n");
for (const [p, s2] of Object.entries(byPredictor)) {
  console.log(`${p}: ${s2.total}R中 勝率${s2.win}/${s2.total} 複勝${s2.place}/${s2.total}`);
  if (s2.hits.length) s2.hits.forEach(h => console.log(`  ✅ ${h}`));
}

// ガンテツの結果も個別確認
const { data: gantetsu } = await s.from("ai_predictions")
  .select("horse_name, umaban, races(name, race_number, course_name, race_date, status)")
  .eq("predictor_id", "gantetsu")
  .eq("races.race_date", "2026-05-09")
  .not("races", "is", null);

console.log("\n=== ガンテツ詳細 ===");
for (const g of gantetsu || []) {
  console.log(`${g.races?.course_name}${g.races?.race_number}R ${g.races?.name} ◎${g.umaban}${g.horse_name} (status: ${g.races?.status})`);
}
