#!/usr/bin/env node
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
async function query(p) { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers }); return r.json(); }

async function main() {
  // 1. is_win5が使われているか確認
  console.log('═══ is_win5フィールド確認 ═══');
  const win5True = await query('races?is_win5=eq.true&limit=5&order=race_date.desc&select=race_date,course_name,race_number,name,is_win5');
  console.log(`  is_win5=true: ${win5True.length}件`);
  for (const r of win5True) console.log(`    ${r.race_date} ${r.course_name}R${r.race_number} ${r.name||''}`);

  const win5False = await query('races?is_win5=eq.false&limit=1&select=race_date,is_win5');
  console.log(`  is_win5=false: ${win5False.length > 0 ? 'あり' : 'なし'}`);

  const win5Null = await query('races?is_win5=is.null&limit=1&select=race_date,is_win5');
  console.log(`  is_win5=null: ${win5Null.length > 0 ? 'あり' : 'なし'}`);

  // 2. post_timeでソートしてWIN5判定テスト
  console.log('\n═══ 5/17 post_time降順 上位8レース ═══');
  const latest = await query('races?race_date=eq.2026-05-17&order=post_time.desc&limit=8&select=course_name,race_number,name,post_time,is_win5');
  for (let i = 0; i < latest.length; i++) {
    const r = latest[i];
    const time = r.post_time ? new Date(r.post_time).toLocaleTimeString('ja-JP', {timeZone:'Asia/Tokyo', hour:'2-digit', minute:'2-digit'}) : '?';
    const w5 = r.is_win5 === true ? '🎯WIN5' : r.is_win5 === false ? '' : '(null)';
    const mark = i < 5 ? '✅' : '  ';
    console.log(`  ${mark} ${time} ${r.course_name}R${r.race_number} ${(r.name||'').padEnd(16)} ${w5}`);
  }

  // 3. 5/16でも確認
  console.log('\n═══ 5/16 post_time降順 上位8レース ═══');
  const latest16 = await query('races?race_date=eq.2026-05-16&order=post_time.desc&limit=8&select=course_name,race_number,name,post_time,is_win5');
  for (let i = 0; i < latest16.length; i++) {
    const r = latest16[i];
    const time = r.post_time ? new Date(r.post_time).toLocaleTimeString('ja-JP', {timeZone:'Asia/Tokyo', hour:'2-digit', minute:'2-digit'}) : '?';
    const w5 = r.is_win5 === true ? '🎯WIN5' : r.is_win5 === false ? '' : '(null)';
    const mark = i < 5 ? '✅' : '  ';
    console.log(`  ${mark} ${time} ${r.course_name}R${r.race_number} ${(r.name||'').padEnd(16)} ${w5}`);
  }

  // 4. win5_resultsと照合
  console.log('\n═══ win5_results 5/16 照合 ═══');
  const w5res = await query('win5_results?race_date=eq.2026-05-16&order=leg_number.asc&select=leg_number,course_name,race_number');
  for (const l of w5res) console.log(`  Leg${l.leg_number}: ${l.course_name}R${l.race_number}`);

  console.log('\n═══ 結論 ═══');
  console.log('  post_timeで降順ソート→上位5件 = WIN5対象レース');
  console.log('  is_win5フラグも使用可能（設定済みなら）');
}
main().catch(e => { console.error(e); process.exit(1); });
