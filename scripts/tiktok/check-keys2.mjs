import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// April 2026のrace_keyパターンを探す
const patterns = ["2605%", "2608%", "0526%", "0826%", "26%"];
for (const p of patterns) {
  const { data, count } = await s.from("jrdb_race_entries").select("race_key, horse_name", { count: "exact" }).like("race_key", p).limit(3);
  if (count > 0) console.log(`Pattern "${p}": ${count}件`, data);
}

// race_keyのユニーク値をサンプル
const { data: samples } = await s.rpc("", {}).catch(() => null) || {};
const { data: distinct } = await s.from("jrdb_race_entries").select("race_key").order("race_key", { ascending: false }).limit(20);
const uniq = [...new Set(distinct?.map(d => d.race_key))];
console.log("\n=== 最新のユニーク race_key (上位10) ===");
uniq.slice(0, 10).forEach(k => console.log(`  "${k}" (len:${k.length})`));

// 最古も見る
const { data: oldest } = await s.from("jrdb_race_entries").select("race_key").order("race_key", { ascending: true }).limit(10);
const oldUniq = [...new Set(oldest?.map(d => d.race_key))];
console.log("\n=== 最古のユニーク race_key ===");
oldUniq.slice(0, 5).forEach(k => console.log(`  "${k}" (len:${k.length})`));
