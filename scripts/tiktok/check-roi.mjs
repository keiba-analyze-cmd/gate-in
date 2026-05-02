import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ハヤテの的中結果を確認
const { data } = await s
  .from("ai_prediction_results")
  .select("honmei_finish_position, is_honmei_win, honmei_win_odds")
  .eq("predictor_id", "hayate")
  .eq("is_honmei_win", true);

console.log(`ハヤテ的中: ${data?.length}件`);
const withOdds = data?.filter(r => r.honmei_win_odds !== null);
const nullOdds = data?.filter(r => r.honmei_win_odds === null);
console.log(`オッズあり: ${withOdds?.length}件, null: ${nullOdds?.length}件`);
console.log(`オッズ合計: ${withOdds?.reduce((s,r) => s + r.honmei_win_odds, 0)}`);
withOdds?.slice(0, 5).forEach(r => console.log(`  odds: ${r.honmei_win_odds}`));
