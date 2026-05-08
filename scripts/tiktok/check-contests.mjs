import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 全大会を取得
const { data: contests } = await s.from("contests")
  .select("id, title, status, year_month, notified_at, created_at")
  .order("created_at", { ascending: false });

console.log("=== 大会一覧 ===\n");

for (const c of contests || []) {
  const { data: entries } = await s.from("contest_entries")
    .select("user_id, total_points, is_eligible, hit_race_count, profiles(display_name)")
    .eq("contest_id", c.id)
    .eq("is_eligible", true)
    .order("total_points", { ascending: false })
    .limit(3);

  console.log(`📅 ${c.title || c.year_month} | status: ${c.status} | notified: ${c.notified_at || '未通知'}`);
  
  if (entries?.length) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const medal = ['🥇','🥈','🥉'][i];
      console.log(`  ${medal} ${e.profiles?.display_name || 'unknown'} | ${e.total_points}P | user_id: ${e.user_id}`);
    }
  } else {
    console.log("  参加者なし");
  }
  console.log("");
}
