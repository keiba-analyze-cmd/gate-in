import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const pids = ['hayate','kazan','hakusen','hibari','gantetsu'];
for (const pid of pids) {
  const { data } = await s.from("ai_prediction_results")
    .select("is_honmei_win, is_honmei_place, honmei_win_odds, honmei_place_odds, honmei_finish_position")
    .eq("predictor_id", pid);
  if (!data?.length) { console.log(`${pid}: データなし`); continue; }

  const total = data.length;
  const wins = data.filter(r => r.is_honmei_win).length;
  const places = data.filter(r => r.is_honmei_place).length;
  const totalReturn = data.reduce((s, r) => r.is_honmei_win && r.honmei_win_odds ? s + r.honmei_win_odds : s, 0);
  const roi = (totalReturn / total * 100).toFixed(1);
  const avgWinOdds = wins > 0 ? (totalReturn / wins).toFixed(1) : '-';
  
  // 人気別の内訳
  const top3fav = data.filter(r => r.honmei_win_odds && r.honmei_win_odds < 5);
  const mid = data.filter(r => r.honmei_win_odds && r.honmei_win_odds >= 5 && r.honmei_win_odds < 15);
  const longshot = data.filter(r => r.honmei_win_odds && r.honmei_win_odds >= 15);

  console.log(`\n=== ${pid} ===`);
  console.log(`${total}予想 | 勝率${(wins/total*100).toFixed(1)}% | 複勝${(places/total*100).toFixed(1)}% | 回収率${roi}% | 平均勝ちオッズ${avgWinOdds}`);
  console.log(`人気馬(<5倍): ${top3fav.length}件 | 中穴(5-15倍): ${mid.length}件 | 大穴(15倍+): ${longshot.length}件`);
}
