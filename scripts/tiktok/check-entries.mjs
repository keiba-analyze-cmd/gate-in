import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetDate = process.argv[2] || new Date(Date.now() + 9*3600000 + 86400000).toISOString().slice(0,10);

const { data: races } = await s.from("races")
  .select("id, name, course_name, race_number, race_entries(count)")
  .eq("race_date", targetDate)
  .order("course_name")
  .order("race_number");

console.log(`=== ${targetDate} 出走馬登録状況 ===`);
let missing = 0;
for (const r of races || []) {
  const count = r.race_entries?.[0]?.count || 0;
  const mark = count === 0 ? "❌" : "✅";
  if (count === 0) missing++;
  console.log(`${mark} ${r.course_name} ${r.race_number}R ${r.name}: ${count}頭`);
}
console.log(`\n未登録: ${missing}件 / 全${races?.length || 0}件`);

// AI予想数
const { count: aiCount } = await s.from("ai_predictions")
  .select("id", { count: "exact", head: true })
  .in("race_id", (races || []).map(r => r.id));
console.log(`AI予想: ${aiCount}件`);
