import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const contestId = "5d45e96e-cff7-42a2-9741-43a7ffd9283f";

const { data: entries } = await s.from("contest_entries")
  .select("user_id, total_points, is_eligible, hit_race_count, profiles(display_name)")
  .eq("contest_id", contestId)
  .eq("is_eligible", true)
  .order("total_points", { ascending: false })
  .limit(5);

console.log("=== 5/10 大会 TOP5 ===");
for (let i = 0; i < (entries?.length || 0); i++) {
  const e = entries[i];
  const medal = ["🥇","🥈","🥉","4位","5位"][i];
  const { data: auth } = await s.auth.admin.getUserById(e.user_id);
  console.log(`${medal} ${e.profiles?.display_name} | ${e.total_points}P | ${auth?.user?.email || "メールなし"} | user_id: ${e.user_id}`);
}
