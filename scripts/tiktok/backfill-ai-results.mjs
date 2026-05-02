import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 結果未記録のAI予想を取得
const { data: predictions } = await s
  .from("ai_predictions")
  .select("id, predictor_id, race_id, umaban");

console.log(`AI予想: ${predictions?.length}件`);

let inserted = 0;
for (const pred of predictions || []) {
  // 既に結果があるかチェック
  const { data: existing } = await s
    .from("ai_prediction_results")
    .select("id")
    .eq("prediction_id", pred.id)
    .limit(1);
  if (existing?.length) continue;

  // レース結果を取得
  const { data: results } = await s
    .from("race_results")
    .select("finish_position, race_entries(post_number, odds)")
    .eq("race_id", pred.race_id);
  if (!results?.length) continue;

  const honmeiResult = results.find(r => r.race_entries?.post_number === pred.umaban);
  if (!honmeiResult) continue;

  const finishPos = honmeiResult.finish_position;
  const isWin = finishPos === 1;
  const isPlace = finishPos <= 3;
  const odds = honmeiResult.race_entries?.odds ?? null;

  let pts = 0;
  if (isWin) pts = 30;
  else if (isPlace) pts = 10;

  const { error } = await s.from("ai_prediction_results").insert({
    prediction_id: pred.id,
    predictor_id: pred.predictor_id,
    race_id: pred.race_id,
    honmei_finish_position: finishPos,
    is_honmei_win: isWin,
    is_honmei_place: isPlace,
    points: pts,
    honmei_win_odds: isWin ? odds : null,
    honmei_place_odds: isPlace ? odds : null,
    settled_at: new Date().toISOString(),
  });
  if (error) {
    console.log(`ERROR ${pred.predictor_id}:`, error.message);
  } else {
    inserted++;
  }
}
console.log(`\n結果記録: ${inserted}件`);

// 月間成績更新
const predictorIds = ['hayate','kazan','hakusen','hibari','gantetsu'];
const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
const yearMonth = jstNow.toISOString().slice(0, 7);

for (const predictorId of predictorIds) {
  const { data: allResults } = await s
    .from("ai_prediction_results")
    .select("is_honmei_win, is_honmei_place, points, honmei_win_odds")
    .eq("predictor_id", predictorId);

  if (!allResults?.length) { console.log(`${predictorId}: データなし`); continue; }

  const total = allResults.length;
  const wins = allResults.filter(r => r.is_honmei_win).length;
  const places = allResults.filter(r => r.is_honmei_place).length;
  const totalPts = allResults.reduce((s, r) => s + (r.points || 0), 0);
  const winOdds = allResults.filter(r => r.is_honmei_win && r.honmei_win_odds).map(r => r.honmei_win_odds);
  const bestOdds = winOdds.length ? Math.max(...winOdds) : null;

  const { error } = await s.from("ai_monthly_stats").upsert({
    predictor_id: predictorId,
    year_month: yearMonth,
    total_predictions: total,
    win_count: wins,
    place_count: places,
    total_points: totalPts,
    win_rate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0,
    place_rate: total > 0 ? Math.round((places / total) * 1000) / 10 : 0,
    best_hit_odds: bestOdds,
    updated_at: new Date().toISOString(),
  }, { onConflict: "predictor_id,year_month" });

  if (error) console.log(`${predictorId} stats ERROR:`, error.message);
  else console.log(`${predictorId}: ${total}予想, ${wins}勝, ${places}複勝, ${totalPts}pts`);
}
