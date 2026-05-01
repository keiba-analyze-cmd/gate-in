import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/2のレースでoddsが入っているか確認
const { data: withOdds } = await s
  .from("race_entries")
  .select("post_number, odds, popularity, race_id, races(name, race_date)")
  .eq("races.race_date", "2026-05-02")
  .not("odds", "is", null)
  .limit(5);

console.log("=== odds入りエントリー ===");
if (withOdds?.length) {
  withOdds.forEach(e => console.log(e.races?.name, "#" + e.post_number, "odds:", e.odds, "pop:", e.popularity));
} else {
  console.log("oddsが入っているエントリーなし");
}

// 全体のodds状況
const { count: total } = await s.from("race_entries").select("*", { count: "exact", head: true }).eq("races.race_date", "2026-05-02");
const { count: withOddsCount } = await s.from("race_entries").select("*", { count: "exact", head: true }).not("odds", "is", null);

console.log("\n=== odds全体状況 ===");
console.log("odds入り:", withOddsCount, "件");

// cron認証の確認
const secret = process.env.CRON_SECRET;
console.log("\n=== CRON_SECRET ===");
console.log(secret ? "設定あり (" + secret.slice(0, 5) + "...)" : "未設定");
