import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 5/9のレースのexternal_idとodds状況を確認
const { data: races } = await s.from("races")
  .select("id, name, external_id, race_date, race_entries(post_number, odds)")
  .eq("race_date", "2026-05-09")
  .limit(3);

for (const r of races || []) {
  const eid = r.external_id;
  const rk = eid ? eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12) : 'no eid';
  const nullOdds = r.race_entries?.filter(e => e.odds === null).length;
  const hasOdds = r.race_entries?.filter(e => e.odds !== null).length;
  console.log(`${r.name} | eid: ${eid} | rk: ${rk} | odds有: ${hasOdds} null: ${nullOdds}`);

  // JRDBにマッチするか
  if (eid) {
    const { data: jrdb } = await s.from("jrdb_race_entries")
      .select("umaban, base_odds")
      .eq("race_key", rk)
      .limit(3);
    console.log(`  JRDB match: ${jrdb?.length || 0}件`, jrdb?.slice(0,2));
  }
}
