#!/usr/bin/env node
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
async function query(p) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers }); return r.json(); }

async function main() {
  // 1. racesテーブルのカラム確認（2026-05-17の1レースの全フィールド）
  console.log('═══ racesテーブル構造 ═══');
  const sample = await query('races?race_date=eq.2026-05-17&limit=1');
  if (sample.length > 0) {
    console.log('カラム一覧:');
    for (const [k, v] of Object.entries(sample[0])) {
      console.log(`  ${k}: ${JSON.stringify(v)?.slice(0, 60)}`);
    }
  }

  // 2. 5/17の全レースを取得してrace_number分布確認
  console.log('\n═══ 2026-05-17 全レース ═══');
  const allRaces = await query('races?race_date=eq.2026-05-17&order=course_name.asc,race_number.asc&select=course_name,race_number,name,post_time,start_time');
  const byVenue = {};
  for (const r of allRaces) {
    if (!byVenue[r.course_name]) byVenue[r.course_name] = [];
    byVenue[r.course_name].push(r);
  }
  for (const [v, races] of Object.entries(byVenue)) {
    const nums = races.map(r => `R${r.race_number}`).join(', ');
    console.log(`  ${v}: ${races.length}R (${nums})`);
  }

  // 3. post_time or start_timeがあるか確認
  console.log('\n═══ 時刻フィールド確認 ═══');
  const timeFields = allRaces.map(r => ({
    course: r.course_name, rn: r.race_number,
    post_time: r.post_time, start_time: r.start_time
  })).filter(r => r.rn >= 9);
  for (const t of timeFields) {
    console.log(`  ${t.course} R${t.rn}: post_time=${t.post_time} start_time=${t.start_time}`);
  }

  // 4. win5_resultsと照合（5/17は結果未確定かもしれないので5/16も）
  console.log('\n═══ win5_results照合 ═══');
  for (const date of ['2026-05-17', '2026-05-16']) {
    const w5 = await query(`win5_results?race_date=eq.${date}&order=leg_number.asc&select=leg_number,course_name,race_number`);
    if (w5.length > 0) {
      console.log(`\n  ${date} WIN5実績:`);
      for (const l of w5) console.log(`    Leg${l.leg_number}: ${l.course_name} R${l.race_number}`);
    }
  }

  // 5. 自動判定テスト: race_number降順で上位5つ
  console.log('\n═══ 自動判定テスト: race_number降順TOP5 ═══');
  const sorted = allRaces.sort((a, b) => b.race_number - a.race_number || a.course_name.localeCompare(b.course_name));
  const top6 = sorted.slice(0, 6);
  for (let i = 0; i < top6.length; i++) {
    const r = top6[i];
    const mark = i < 5 ? '✅' : '❌';
    console.log(`  ${mark} ${r.course_name} R${r.race_number} ${r.name || ''}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
