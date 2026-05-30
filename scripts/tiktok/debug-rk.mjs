import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// JRDBに入っている5/24付近のrace_keyを確認
const { data } = await s.from("jrdb_race_entries")
  .select("race_key")
  .like("race_key", "%2610%")
  .limit(5);
console.log("race_key with 2610:", data);

// 260524のKYGファイルの先頭を確認
const { data: d2 } = await s.from("jrdb_race_entries")
  .select("race_key")
  .like("race_key", "%260%")
  .order("race_key", { ascending: false })
  .limit(10);
console.log("\n最新race_key:", d2?.map(r => r.race_key));

// 5/24のexternal_idパターン
const { data: races } = await s.from("races")
  .select("name, external_id, course_name, race_number")
  .eq("race_date", "2026-05-24")
  .limit(5);
console.log("\n5/24 external_ids:");
for (const r of races || []) {
  const eid = r.external_id;
  const rk = eid?.slice(4,6) + eid?.slice(2,4) + eid?.slice(7,8) + eid?.slice(9,10) + eid?.slice(10,12);
  console.log(`${r.course_name}${r.race_number}R ${r.name}: eid=${eid} → rk=${rk}`);
}
