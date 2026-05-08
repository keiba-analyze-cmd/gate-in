import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/9-10の重賞・特別レースを確認
const { data: races } = await s.from("races")
  .select("id, name, grade, race_date, course_name, race_number")
  .in("race_date", ["2026-05-09", "2026-05-10"])
  .order("race_date")
  .order("race_number", { ascending: false });

console.log("=== 5/9-10 重賞・特別レース ===");
const gradeRaces = races?.filter(r => r.grade) || [];
const specialRaces = races?.filter(r => !r.grade && !/未勝利|1勝|2勝|障害/.test(r.name)) || [];

console.log("\n重賞:");
gradeRaces.forEach(r => console.log(`  ${r.race_date} ${r.course_name} ${r.race_number}R ${r.name} (${r.grade}) | id: ${r.id}`));

console.log("\n特別:");
specialRaces.forEach(r => console.log(`  ${r.race_date} ${r.course_name} ${r.race_number}R ${r.name} | id: ${r.id}`));
