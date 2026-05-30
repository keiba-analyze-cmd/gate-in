#!/usr/bin/env node
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 環境変数未設定'); process.exit(1); }
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
  console.log('\n🔍 WIN5 対象レース パターン分析\n');
  const legs = await queryAll('win5_results?select=race_date,leg_number,course_name,race_number&order=race_date.desc,leg_number.asc');
  console.log(`  データ: ${legs.length}レッグ\n`);
  const daily = new Map();
  for (const l of legs) { if (!daily.has(l.race_date)) daily.set(l.race_date, []); daily.get(l.race_date).push(l); }

  // 分析1: レース番号分布
  console.log('═'.repeat(60));
  console.log('📊 分析1: WIN5対象レースのレース番号分布');
  console.log('═'.repeat(60));
  const raceNumDist = {};
  for (const l of legs) { const k = `R${l.race_number}`; raceNumDist[k] = (raceNumDist[k] || 0) + 1; }
  console.log('\n  レース番号 | 出現回数 | 割合');
  console.log('  ' + '-'.repeat(35));
  for (const [k, v] of Object.entries(raceNumDist).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${k.padEnd(8)}   | ${String(v).padStart(5)}    | ${(v/legs.length*100).toFixed(1)}%`);
  }

  // 分析2: Leg番号×レース番号
  console.log('\n' + '═'.repeat(60));
  console.log('📊 分析2: Leg番号 × レース番号');
  console.log('═'.repeat(60));
  const legRaceMatrix = {};
  for (const l of legs) { const k = `Leg${l.leg_number}`; if (!legRaceMatrix[k]) legRaceMatrix[k] = {}; const rk = `R${l.race_number}`; legRaceMatrix[k][rk] = (legRaceMatrix[k][rk] || 0) + 1; }
  console.log('\n  Leg | R9   | R10  | R11  | R12  | 最頻');
  console.log('  ' + '-'.repeat(50));
  for (let leg = 1; leg <= 5; leg++) {
    const m = legRaceMatrix[`Leg${leg}`] || {};
    const maxK = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    console.log(`  ${leg}   | ${String(m['R9']||0).padStart(4)} | ${String(m['R10']||0).padStart(4)} | ${String(m['R11']||0).padStart(4)} | ${String(m['R12']||0).padStart(4)} | ${maxK ? maxK[0] : '-'}`);
  }

  // 分析3: 場数と構成パターン
  console.log('\n' + '═'.repeat(60));
  console.log('📊 分析3: レース番号パターン（場別、頻度上位15）');
  console.log('═'.repeat(60));
  const patternDist = {};
  const venueCountDist = {};
  for (const [date, dayLegs] of daily) {
    if (dayLegs.length !== 5) continue;
    const venues = [...new Set(dayLegs.map(l => l.course_name))];
    venueCountDist[venues.length] = (venueCountDist[venues.length] || 0) + 1;
    const venueRaces = {};
    for (const l of dayLegs) { if (!venueRaces[l.course_name]) venueRaces[l.course_name] = []; venueRaces[l.course_name].push(l.race_number); }
    const pattern = Object.entries(venueRaces).map(([v, rs]) => `${v}:${rs.sort().join(',')}`).sort().join(' | ');
    patternDist[pattern] = (patternDist[pattern] || 0) + 1;
  }
  console.log('\n  場数 | 日数');
  for (const [k, v] of Object.entries(venueCountDist).sort()) console.log(`  ${k}場   | ${v}日`);

  // 分析4: 直近20日
  console.log('\n' + '═'.repeat(60));
  console.log('📊 分析4: 直近20日の詳細');
  console.log('═'.repeat(60));
  const recentDates = [...daily.keys()].sort().reverse().slice(0, 20);
  console.log('\n  日付       | Leg1             | Leg2             | Leg3             | Leg4             | Leg5');
  console.log('  ' + '-'.repeat(100));
  for (const date of recentDates) {
    const dayLegs = daily.get(date);
    if (!dayLegs || dayLegs.length !== 5) continue;
    const legStrs = dayLegs.sort((a, b) => a.leg_number - b.leg_number).map(l => `${l.course_name}${l.race_number}R`.padEnd(15));
    console.log(`  ${date} | ${legStrs.join(' | ')}`);
  }

  // 分析5: 場ごとのレース数分布
  console.log('\n' + '═'.repeat(60));
  console.log('📊 分析5: 各場からのWIN5レース数');
  console.log('═'.repeat(60));
  const venueRaceCountDist = {}; // "2場-3R,2R" etc.
  for (const [date, dayLegs] of daily) {
    if (dayLegs.length !== 5) continue;
    const venueRaces = {};
    for (const l of dayLegs) { if (!venueRaces[l.course_name]) venueRaces[l.course_name] = []; venueRaces[l.course_name].push(l.race_number); }
    const counts = Object.values(venueRaces).map(rs => rs.length).sort((a, b) => b - a);
    const key = `${Object.keys(venueRaces).length}場: ${counts.join('-')}`;
    venueRaceCountDist[key] = (venueRaceCountDist[key] || 0) + 1;
  }
  console.log('\n  パターン    | 日数  | 割合');
  console.log('  ' + '-'.repeat(35));
  const total5 = [...daily].filter(([,l])=>l.length===5).length;
  for (const [k, v] of Object.entries(venueRaceCountDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(12)} | ${String(v).padStart(4)}  | ${(v/total5*100).toFixed(1)}%`);
  }

  // 分析6: レース番号の組み合わせ（場名なし）
  console.log('\n' + '═'.repeat(60));
  console.log('📊 分析6: 5レースのレース番号組み合わせ');
  console.log('═'.repeat(60));
  const raceNumPattern = {};
  for (const [date, dayLegs] of daily) {
    if (dayLegs.length !== 5) continue;
    const nums = dayLegs.sort((a, b) => a.leg_number - b.leg_number).map(l => `R${l.race_number}`).join(',');
    raceNumPattern[nums] = (raceNumPattern[nums] || 0) + 1;
  }
  console.log('\n  R番号パターン                  | 日数  | 割合');
  console.log('  ' + '-'.repeat(50));
  for (const [k, v] of Object.entries(raceNumPattern).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${k.padEnd(30)} | ${String(v).padStart(4)}  | ${(v/total5*100).toFixed(1)}%`);
  }

  console.log('\n' + '═'.repeat(60));
}
main().catch(e => { console.error(e); process.exit(1); });
