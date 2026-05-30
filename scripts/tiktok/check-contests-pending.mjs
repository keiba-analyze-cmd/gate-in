import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targets = [
  { ym: "2026-05-17", label: "5/17" },
  { ym: "2026-05-24", label: "5/24" },
];

const { data: contests } = await s.from("contests")
  .select("id, year_month, status")
  .in("year_month", targets.map(t => t.ym));

for (const t of targets) {
  const c = contests?.find(x => x.year_month === t.ym);
  if (!c) { console.log(`=== ${t.label} 大会 === 見つかりません\n`); continue; }

  const { data: entries } = await s.from("contest_entries")
    .select("user_id, total_points, is_eligible, profiles(display_name)")
    .eq("contest_id", c.id)
    .eq("is_eligible", true)
    .order("total_points", { ascending: false })
    .limit(5);

  console.log(`=== ${t.label} 大会 (${c.status}) ===`);
  for (let i = 0; i < (entries?.length || 0); i++) {
    const e = entries[i];
    const medal = ["🥇","🥈","🥉","4位","5位"][i];
    const { data: auth } = await s.auth.admin.getUserById(e.user_id);
    console.log(`${medal} ${e.profiles?.display_name} | ${e.total_points}P | ${auth?.user?.email || "メールなし"} | uid: ${e.user_id}`);
  }
  console.log("");
}
