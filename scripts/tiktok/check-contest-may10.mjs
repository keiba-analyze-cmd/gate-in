import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: contests } = await s.from("contests")
  .select("id, title, status, year_month, created_at")
  .order("created_at", { ascending: false })
  .limit(5);

console.log("=== 直近の大会 ===");
for (const c of contests || []) {
  console.log(`${c.year_month} | status: ${c.status} | id: ${c.id}`);

  const { data: entries } = await s.from("contest_entries")
    .select("user_id, total_points, is_eligible, profiles(display_name)")
    .eq("contest_id", c.id)
    .eq("is_eligible", true)
    .order("total_points", { ascending: false })
    .limit(3);

  if (entries?.length) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const medal = ["🥇","🥈","🥉"][i];
      const { data: auth } = await s.auth.admin.getUserById(e.user_id);
      console.log(`  ${medal} ${e.profiles?.display_name} | ${e.total_points}P | ${auth?.user?.email || "メールなし"}`);
    }
  } else {
    console.log("  参加者なし");
  }
  console.log("");
}
