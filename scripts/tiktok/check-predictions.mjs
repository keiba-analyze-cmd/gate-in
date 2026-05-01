import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from("ai_predictions")
  .select("predictor_id, umaban, horse_name, taikou_umaban, tanpou_umaban, osae_umaban, comment, races(name)")
  .order("created_at", { ascending: false })
  .limit(10);

console.log("=== ai_predictions の内容 ===\n");
data?.forEach(d => {
  console.log(`${d.races?.name} | ${d.predictor_id} | ◎${d.umaban} ${d.horse_name || ""} | ○${d.taikou_umaban || "null"} ▲${d.tanpou_umaban || "null"} △${d.osae_umaban || "null"}`);
  console.log(`  comment: ${d.comment?.slice(0, 50) || "null"}`);
});
