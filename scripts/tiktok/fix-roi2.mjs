import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// oddsがnullの的中結果を取得
const { data: nullResults } = await s
  .from("ai_prediction_results")
  .select("id, prediction_id, race_id, is_honmei_win, honmei_win_odds")
  .eq("is_honmei_win", true)
  .is("honmei_win_odds", null);

console.log(`オッズnullの的中: ${nullResults?.length}件`);

// ai_predictionsからumabanを取得し、jrdb_race_entriesからbase_oddsを取得
let fixed = 0;
for (const r of nullResults || []) {
  const { data: pred } = await s.from("ai_predictions")
    .select("umaban, race_id, races(external_id)")
    .eq("id", r.prediction_id)
    .single();
  if (!pred?.umaban || !pred.races?.external_id) continue;

  // external_id → race_key
  const eid = pred.races.external_id;
  const raceKey = eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);

  const { data: jrdb } = await s.from("jrdb_race_entries")
    .select("base_odds")
    .eq("race_key", raceKey)
    .eq("umaban", pred.umaban)
    .single();

  if (jrdb?.base_odds) {
    await s.from("ai_prediction_results")
      .update({ honmei_win_odds: jrdb.base_odds })
      .eq("id", r.id);
    fixed++;
  }
}
console.log(`補完: ${fixed}件`);

// 複勝的中のオッズも補完
const { data: placeNulls } = await s
  .from("ai_prediction_results")
  .select("id, prediction_id, race_id, is_honmei_place, honmei_place_odds")
  .eq("is_honmei_place", true)
  .is("honmei_place_odds", null);

console.log(`\n複勝オッズnull: ${placeNulls?.length}件`);
let fixedPlace = 0;
for (const r of placeNulls || []) {
  const { data: pred } = await s.from("ai_predictions")
    .select("umaban, race_id, races(external_id)")
    .eq("id", r.prediction_id)
    .single();
  if (!pred?.umaban || !pred.races?.external_id) continue;

  const eid = pred.races.external_id;
  const raceKey = eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);

  const { data: jrdb } = await s.from("jrdb_race_entries")
    .select("base_odds")
    .eq("race_key", raceKey)
    .eq("umaban", pred.umaban)
    .single();

  if (jrdb?.base_odds) {
    await s.from("ai_prediction_results")
      .update({ honmei_place_odds: jrdb.base_odds })
      .eq("id", r.id);
    fixedPlace++;
  }
}
console.log(`複勝補完: ${fixedPlace}件`);

// 回収率再計算
const predictorIds = ['hayate','kazan','hakusen','hibari','gantetsu'];
for (const pid of predictorIds) {
  const { data: results } = await s
    .from("ai_prediction_results")
    .select("is_honmei_win, honmei_win_odds")
    .eq("predictor_id", pid);
  if (!results?.length) continue;

  const total = results.length;
  const totalReturn = results.reduce((sum, r) => {
    if (r.is_honmei_win && r.honmei_win_odds) return sum + r.honmei_win_odds;
    return sum;
  }, 0);
  const roi = total > 0 ? Math.round((totalReturn / total) * 1000) / 10 : 0;

  await s.from("ai_monthly_stats")
    .update({ roi_win: roi })
    .eq("predictor_id", pid)
    .eq("year_month", "2026-05");

  console.log(`${pid}: 回収率 ${roi}%`);
}
