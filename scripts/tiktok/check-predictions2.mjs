import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// まずカラム構造を確認
const { data, error } = await s.from("ai_predictions").select("*").limit(3);
if (error) { console.log("ERROR:", error); process.exit(); }
if (!data?.length) { console.log("ai_predictions テーブルが空です"); process.exit(); }

console.log("=== ai_predictions カラム一覧 ===");
console.log(Object.keys(data[0]).join(", "));
console.log("\n=== サンプル3件 ===");
data.forEach(d => console.log(JSON.stringify(d, null, 2)));
