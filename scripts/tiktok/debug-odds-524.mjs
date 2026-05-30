import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 日付確認
const jst = new Date(Date.now()+9*3600000);
const today = jst.toISOString().slice(0,10);
const tmr = new Date(jst.getTime()+86400000).toISOString().slice(0,10);
const yest = new Date(jst.getTime()-86400000).toISOString().slice(0,10);
console.log("フィルタ日付:", yest, today, tmr);

// 5/24のレース1件でマッチ確認
const { data: races } = await s.from("races")
  .select("id, name, external_id")
  .eq("race_date", "2026-05-24")
  .limit(2);

for (const r of races || []) {
  const eid = r.external_id;
  if (!eid || eid.length < 12) { console.log(`${r.name}: external_id=${eid} (不正)`); continue; }
  const rk = eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);
  
  const { data: jrdb } = await s.from("jrdb_race_entries")
    .select("umaban, base_odds")
    .eq("race_key", rk)
    .limit(3);
  
  const { data: entries } = await s.from("race_entries")
    .select("post_number, odds")
    .eq("race_id", r.id)
    .limit(3);
  
  console.log(`${r.name}: eid=${eid} rk=${rk} JRDB=${jrdb?.length}件 entries=${entries?.length}件 odds=${entries?.[0]?.odds}`);
}
