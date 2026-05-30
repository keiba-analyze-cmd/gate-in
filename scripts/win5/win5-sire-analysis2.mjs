#!/usr/bin/env node
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
async function queryAll(p, ps = 1000) {
  let all = [], off = 0;
  while (true) {
    const sep = p.includes('?') ? '&' : '?';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}${sep}limit=${ps}&offset=${off}`, { headers });
    if (!r.ok) throw new Error(await r.text()); const d = await r.json(); all = all.concat(d);
    if (d.length < ps) break; off += ps;
  }
  return all;
}

async function main() {
  // 1. jrdb_horses構造
  console.log('═══ jrdb_horses 構造 ═══');
  const h = await queryAll('jrdb_horses?limit=2');
  for (const [k, v] of Object.entries(h[0]||{})) console.log(`  ${k}: ${JSON.stringify(v)?.slice(0, 60)}`);
  const hTotal = await queryAll('jrdb_horses?select=horse_code');
  console.log(`  総頭数: ${hTotal.length}`);

  // 2. sire_course_distance_stats: course_code→course_name対応確認
  console.log('\n═══ sire_stats course_code分布 ═══');
  const codes = await queryAll('sire_course_distance_stats?select=course_code&limit=3518');
  const codeDist = {};
  for (const c of codes) codeDist[c.course_code] = (codeDist[c.course_code]||0) + 1;
  for (const [k, v] of Object.entries(codeDist).sort()) console.log(`  ${k}: ${v}件`);

  // 3. sire_stats: distance/track_type分布
  console.log('\n═══ sire_stats distance/track_type分布 ═══');
  const dtSample = await queryAll('sire_course_distance_stats?select=distance,track_type&limit=100');
  const distDist = {}, ttDist = {};
  for (const d of dtSample) { distDist[d.distance] = (distDist[d.distance]||0)+1; ttDist[d.track_type||'(empty)'] = (ttDist[d.track_type||'(empty)']||0)+1; }
  console.log('  distance:', JSON.stringify(distDist));
  console.log('  track_type:', JSON.stringify(ttDist));

  // 4. course_codeがある有効レコード
  console.log('\n═══ 有効レコード（distance>0）サンプル ═══');
  const valid = await queryAll('sire_course_distance_stats?distance=gt.0&limit=10&order=runs.desc&select=sire_name,course_code,distance,track_type,runs,win_rate,place_rate');
  for (const s of valid) {
    console.log(`  ${(s.sire_name||'').padEnd(16)} ${s.course_code} ${s.track_type} ${s.distance}m | ${s.runs}走 勝${((s.win_rate||0)*100).toFixed(1)}% 複${((s.place_rate||0)*100).toFixed(1)}%`);
  }

  // 5. 結合テスト: 2026-05-10 Leg1
  console.log('\n═══ 結合テスト: 2026-05-10 Leg1 ═══');
  const testLegs = await queryAll('win5_results?select=race_date,leg_number,course_name,race_number,winning_umaban,jrdb_race_key&race_date=eq.2026-05-10&leg_number=eq.1');
  if (testLegs.length > 0) {
    const leg = testLegs[0];
    console.log(`  ${leg.course_name}R${leg.race_number} (key:${leg.jrdb_race_key})`);

    const entries = await queryAll(`jrdb_race_entries?select=umaban,horse_name,horse_code,idm,base_odds&race_key=eq.${leg.jrdb_race_key}&order=umaban.asc`);
    const races = await queryAll(`races?select=course_name,track_type,distance,external_id&race_date=eq.${leg.race_date}&course_name=eq.${leg.course_name}&race_number=eq.${leg.race_number}`);
    const ri = races[0];
    console.log(`  コース: ${ri?.course_name} ${ri?.track_type} ${ri?.distance}m (ext:${ri?.external_id})`);
    
    // course_name→course_code対応
    const courseCodeMap = { '札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05','中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10' };
    const cc = courseCodeMap[ri?.course_name] || '??';
    console.log(`  course_code: ${cc}`);

    for (const e of entries.slice(0, 8)) {
      const horses = await queryAll(`jrdb_horses?select=sire_name&horse_code=eq.${e.horse_code}&limit=1`);
      const sire = horses[0]?.sire_name || '不明';
      
      const stats = await queryAll(
        `sire_course_distance_stats?sire_name=eq.${encodeURIComponent(sire)}&course_code=eq.${cc}&distance=eq.${ri.distance}&limit=1`
      );
      
      const w = e.umaban === leg.winning_umaban ? '🏆' : '  ';
      if (stats.length > 0) {
        const s = stats[0];
        console.log(`  ${w} ${String(e.umaban).padStart(2)}番 ${(e.horse_name||'').padEnd(14)} 父:${sire.padEnd(14)} → ${s.runs}走 勝${((s.win_rate||0)*100).toFixed(1)}% 複${((s.place_rate||0)*100).toFixed(1)}%`);
      } else {
        console.log(`  ${w} ${String(e.umaban).padStart(2)}番 ${(e.horse_name||'').padEnd(14)} 父:${sire.padEnd(14)} → 該当なし`);
      }
    }
  }

  console.log('\n═══ 完了 ═══');
}
main().catch(e => { console.error(e); process.exit(1); });
