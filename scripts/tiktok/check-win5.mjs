import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/10(日)の全レースを競馬場・R番号順に
const { data: races } = await s.from("races")
  .select("id, name, grade, course_name, race_number, post_time")
  .eq("race_date", "2026-05-10")
  .order("course_name")
  .order("race_number");

console.log("=== 5/10(日) 全レース ===\n");
let current = '';
for (const r of races || []) {
  if (r.course_name !== current) { current = r.course_name; console.log(`\n【${current}】`); }
  const time = r.post_time ? new Date(r.post_time).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}) : '';
  console.log(`  ${r.race_number}R ${r.name} ${r.grade || ''} ${time} | id: ${r.id}`);
}
