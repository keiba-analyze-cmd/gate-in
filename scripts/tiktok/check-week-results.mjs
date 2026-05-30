import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/9-10のAI成績記録があるか
const { data, count } = await s.from("ai_prediction_results")
  .select("predictor_id, races(race_date)", { count: "exact" })
  .in("races.race_date", ["2026-05-09", "2026-05-10"])
  .not("races", "is", null);

const byDate = {};
for (const r of data || []) {
  const d = r.races?.race_date;
  byDate[d] = (byDate[d] || 0) + 1;
}
console.log("AI成績記録:", byDate, "合計:", count);

// 5/10大会の結果
const { data: contests } = await s.from("contests")
  .select("id, title, status, year_month")
  .gte("created_at", "2026-05-08")
  .order("created_at", { ascending: false });

console.log("\n大会:", contests?.map(c => `${c.year_month} status:${c.status}`));

// 5/10大会TOP3
for (const c of contests || []) {
  const { data: entries } = await s.from("contest_entries")
    .select("user_id, total_points, is_eligible, profiles(display_name)")
    .eq("contest_id", c.id)
    .eq("is_eligible", true)
    .order("total_points", { ascending: false })
    .limit(3);
  
  if (entries?.length) {
    console.log(`\n=== ${c.year_month} TOP3 ===`);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const medal = ["🥇","🥈","🥉"][i];
      const { data: auth } = await s.auth.admin.getUserById(e.user_id);
      console.log(`${medal} ${e.profiles?.display_name} | ${e.total_points}P | ${auth?.user?.email || "メールなし"}`);
    }
  }
}
