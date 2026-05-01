import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/2のレースIDを取得
const { data: races } = await s.from("races").select("id, name, grade").eq("race_date", "2026-05-02").limit(5);
console.log("=== 5/2のレース ===");

for (const race of (races || []).slice(0, 3)) {
  const { data: entries } = await s.from("race_entries").select("post_number, odds, popularity").eq("race_id", race.id).order("post_number").limit(5);
  console.log(`\n${race.name} (${race.grade || "OP"}):`);
  entries?.forEach(e => console.log(`  #${e.post_number} odds:${e.odds} pop:${e.popularity}`));
}
