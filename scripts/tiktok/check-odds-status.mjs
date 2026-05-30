import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

for (const date of ["2026-05-23", "2026-05-24"]) {
  const { data: races } = await s.from("races")
    .select("id, name, course_name, race_number, race_entries(odds)")
    .eq("race_date", date)
    .order("course_name")
    .order("race_number");

  let noOdds = 0;
  let hasOdds = 0;
  let partial = 0;
  for (const r of races || []) {
    const entries = r.race_entries || [];
    const withOdds = entries.filter(e => e.odds !== null).length;
    const total = entries.length;
    if (withOdds === 0) { noOdds++; }
    else if (withOdds === total) { hasOdds++; }
    else { partial++; }
  }
  console.log(`=== ${date} ===`);
  console.log(`全レース: ${races?.length} | オッズあり: ${hasOdds} | 部分的: ${partial} | オッズなし: ${noOdds}`);

  // オッズなしのレース一覧
  for (const r of races || []) {
    const entries = r.race_entries || [];
    const withOdds = entries.filter(e => e.odds !== null).length;
    if (withOdds === 0) {
      console.log(`  ❌ ${r.course_name} ${r.race_number}R ${r.name} (${entries.length}頭, オッズ0)`);
    }
  }
}
