import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ストーリーズ用テーブル確認
const tables = ["ai_stories", "ai_predictor_stories", "story_contents"];
for (const t of tables) {
  const { data, error } = await s.from(t).select("*").limit(1);
  if (error) console.log(`${t}: ❌ ${error.message}`);
  else console.log(`${t}: ✅ ${data.length}件`, data[0] ? Object.keys(data[0]).join(", ") : "");
}

// 5/2のレース確認
const { data: races } = await s.from("races").select("id, name, grade, course_name, race_number").eq("race_date", "2026-05-02").order("race_number");
console.log(`\n5/2のレース: ${races?.length || 0}件`);
races?.filter(r => r.grade).forEach(r => console.log(`  ${r.name} (${r.grade}) @ ${r.course_name}`));
