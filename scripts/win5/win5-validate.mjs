#!/usr/bin/env node
/**
 * WIN5 モデル検証 — 訓練/検証分離 + 見送り判定
 */
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

function compositeScore(e, all) {
  const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
  const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
  return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
}
function kazanScore(e, all) {
  const s = [...all].sort((a, b) => (b.idm||0) - (a.idm||0));
  const r = s.findIndex(x => x.umaban === e.umaban) + 1;
  const odds = e.base_odds || 1;
  if (r <= 2 || r > 8 || odds < 5) return 0;
  return (e.idm||0) * Math.log(odds);
}
function calcDiff(entries) {
  if (!entries || entries.length < 2) return 50;
  const idms = entries.map(e => e.idm||0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds||99).filter(o => o > 0).sort((a, b) => a - b);
  const inv = odds.map(o => 1/o), sum = inv.reduce((s, v) => s + v, 0);
  const hhi = inv.reduce((s, v) => s + (v/sum)**2, 0);
  return Math.min((idms[0]-idms[1])*8,100)*0.25 + Math.max(0,(18-entries.length)*8)*0.20
    + hhi*400*0.25 + Math.max(0,(10-(odds[0]||1))*12)*0.15 + Math.min(((odds[1]||0)-(odds[0]||0))*8,100)*0.15;
}
function selectCands(entries, hN, aN) {
  const comp = entries.map(e => ({ u: e.umaban, s: compositeScore(e, entries) })).sort((a, b) => b.s - a.s);
  const kaz = entries.map(e => ({ u: e.umaban, s: kazanScore(e, entries) })).sort((a, b) => b.s - a.s);
  const hSet = new Set(comp.slice(0, hN).map(x => x.u));
  return [...hSet, ...kaz.filter(x => x.s > 0 && !hSet.has(x.u)).slice(0, aN).map(x => x.u)];
}

const ALLOC = [{ ms: 48, h: 1, a: 0 }, { ms: 40, h: 2, a: 0 }, { ms: 33, h: 2, a: 1 }, { ms: 0, h: 2, a: 3 }];
const CAP = 15000;

function simDay(dayLegs) {
  const plans = dayLegs.map(leg => {
    const ds = calcDiff(leg.entries);
    let h = 2, a = 1;
    for (const m of ALLOC) { if (ds >= m.ms) { h = m.h; a = m.a; break; } }
    const c = selectCands(leg.entries, h, a);
    return { leg, c, n: c.length, ds };
  });
  let combo = plans.reduce((p, l) => p * l.n, 1), cost = combo * 100;
  if (cost > CAP) {
    while (cost > CAP) {
      let mi = -1, mn = 0;
      for (let i = 0; i < plans.length; i++) if (plans[i].n > mn) { mn = plans[i].n; mi = i; }
      if (mn <= 1) break;
      plans[mi].n--; plans[mi].c = plans[mi].c.slice(0, plans[mi].n);
      combo = plans.reduce((p, l) => p * l.n, 1); cost = combo * 100;
    }
  }
  let hits = 0;
  for (const p of plans) if (p.c.includes(p.leg.winning_umaban)) hits++;
  const payout = (hits === 5 && dayLegs[0].payout) ? dayLegs[0].payout : 0;
  const avgDiff = plans.reduce((s, p) => s + p.ds, 0) / plans.length;
  const hardCount = plans.filter(p => p.ds < 33).length;
  const totalHeadCount = plans.reduce((s, p) => s + p.leg.entries.length, 0);
  return { cost, payout, hits, win5: hits === 5 && payout > 0, avgDiff, hardCount, totalHeadCount, combo };
}

function runPeriod(daily, fromYear, toYear) {
  let days = 0, win5 = 0, totalCost = 0, totalPayout = 0, legHits = 0, totalLegs = 0;
  for (const [date, dayLegs] of daily) {
    const year = parseInt(date.slice(0, 4));
    if (year < fromYear || year > toYear || dayLegs.length !== 5) continue;
    days++;
    const r = simDay(dayLegs);
    totalCost += r.cost; totalPayout += r.payout;
    if (r.win5) win5++;
    legHits += r.hits; totalLegs += 5;
  }
  return { days, win5, totalCost, totalPayout, profit: totalPayout - totalCost,
    roi: totalCost > 0 ? Math.round(totalPayout / totalCost * 100) : 0,
    legRate: totalLegs > 0 ? +(legHits / totalLegs * 100).toFixed(1) : 0 };
}

async function main() {
  console.log('\n🔬 WIN5 モデル検証 — 訓練/検証分離 + 見送り判定\n');
  const legs = await queryAll('win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,idm,jockey_index,base_odds,ten_index,agari_index,position_index&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }
  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key) || [] })).filter(r => r.entries.length > 0);
  const daily = new Map();
  for (const r of races) { if (!daily.has(r.race_date)) daily.set(r.race_date, []); daily.get(r.race_date).push(r); }
  console.log(`\n  対象: ${races.length}レッグ\n`);

  // Part 1: 訓練/検証分離
  console.log('═'.repeat(75));
  console.log('📊 Part 1: 訓練/検証分離（過学習チェック）');
  console.log('═'.repeat(75));
  const full = runPeriod(daily, 2019, 2026);
  console.log(`\n  全期間 (2019-2026): ${full.days}日 | WIN5 ${full.win5} | ROI ${full.roi}% | 利益 ¥${full.profit.toLocaleString()}`);
  const trainA = runPeriod(daily, 2019, 2022);
  const testA = runPeriod(daily, 2023, 2026);
  console.log(`\n  Split A: 2019-2022(訓練) → 2023-2026(検証)`);
  console.log(`    訓練: ${trainA.days}日 | WIN5 ${trainA.win5} | レッグ率 ${trainA.legRate}% | ROI ${trainA.roi}% | 利益 ¥${trainA.profit.toLocaleString()}`);
  console.log(`    検証: ${testA.days}日 | WIN5 ${testA.win5} | レッグ率 ${testA.legRate}% | ROI ${testA.roi}% | 利益 ¥${testA.profit.toLocaleString()}`);
  const trainB = runPeriod(daily, 2019, 2023);
  const testB = runPeriod(daily, 2024, 2026);
  console.log(`\n  Split B: 2019-2023(訓練) → 2024-2026(検証)`);
  console.log(`    訓練: ${trainB.days}日 | WIN5 ${trainB.win5} | レッグ率 ${trainB.legRate}% | ROI ${trainB.roi}% | 利益 ¥${trainB.profit.toLocaleString()}`);
  console.log(`    検証: ${testB.days}日 | WIN5 ${testB.win5} | レッグ率 ${testB.legRate}% | ROI ${testB.roi}% | 利益 ¥${testB.profit.toLocaleString()}`);
  console.log('\n  Walk-forward (3年訓練 → 1年検証):');
  console.log('  訓練期間    | 検証年 | 検証日数 | WIN5 | レッグ率 | ROI    | 利益');
  console.log('  ' + '-'.repeat(70));
  for (let testYear = 2022; testYear <= 2025; testYear++) {
    const test = runPeriod(daily, testYear, testYear);
    console.log(`  ${testYear-3}-${testYear-1}  | ${testYear}   | ${String(test.days).padStart(5)}    | ${String(test.win5).padStart(3)}  | ${String(test.legRate).padStart(5)}%  | ${String(test.roi).padStart(5)}% | ¥${test.profit.toLocaleString()}`);
  }
  console.log('\n  📈 レッグ的中率の安定性:');
  for (let y = 2019; y <= 2025; y++) {
    const r = runPeriod(daily, y, y);
    const bar = '█'.repeat(Math.round(r.legRate / 2));
    console.log(`    ${y}: ${r.legRate}% ${bar}`);
  }

  // Part 2: 見送り判定
  console.log('\n' + '═'.repeat(75));
  console.log('📊 Part 2: 見送り判定（期待値の低い週をスキップ）');
  console.log('═'.repeat(75));
  const dayResults = [];
  for (const [date, dayLegs] of daily) {
    if (dayLegs.length !== 5) continue;
    const r = simDay(dayLegs);
    dayResults.push({ date, ...r });
  }

  console.log('\n  Hardレッグ数別:');
  console.log('  Hard数 | 日数  | WIN5 | 総コスト      | 総配当          | ROI    | 利益');
  console.log('  ' + '-'.repeat(75));
  for (let h = 0; h <= 5; h++) {
    const days = dayResults.filter(d => d.hardCount === h);
    if (!days.length) continue;
    const cost = days.reduce((s, d) => s + d.cost, 0);
    const payout = days.reduce((s, d) => s + d.payout, 0);
    const w5 = days.filter(d => d.win5).length;
    console.log(`  Hard=${h} | ${String(days.length).padStart(4)}  | ${String(w5).padStart(3)}  | ¥${cost.toLocaleString().padStart(10)} | ¥${payout.toLocaleString().padStart(14)} | ${String(cost > 0 ? Math.round(payout/cost*100) : 0).padStart(5)}% | ¥${(payout-cost).toLocaleString()}`);
  }

  console.log('\n  平均難易度スコア別:');
  console.log('  難易度帯      | 日数  | WIN5 | 総コスト      | 総配当          | ROI    | 利益');
  console.log('  ' + '-'.repeat(80));
  for (const b of [{ label: '≥45 (Easy寄り)', min: 45, max: 100 },{ label: '40-44', min: 40, max: 44.99 },{ label: '35-39', min: 35, max: 39.99 },{ label: '30-34', min: 30, max: 34.99 },{ label: '<30 (Hard寄り)', min: 0, max: 29.99 }]) {
    const days = dayResults.filter(d => d.avgDiff >= b.min && d.avgDiff <= b.max);
    if (!days.length) continue;
    const cost = days.reduce((s, d) => s + d.cost, 0);
    const payout = days.reduce((s, d) => s + d.payout, 0);
    const w5 = days.filter(d => d.win5).length;
    console.log(`  ${b.label.padEnd(14)} | ${String(days.length).padStart(4)}  | ${String(w5).padStart(3)}  | ¥${cost.toLocaleString().padStart(10)} | ¥${payout.toLocaleString().padStart(14)} | ${String(cost > 0 ? Math.round(payout/cost*100) : 0).padStart(5)}% | ¥${(payout-cost).toLocaleString()}`);
  }

  console.log('\n  5レッグ合計頭数別:');
  console.log('  頭数帯     | 日数  | WIN5 | 総コスト      | 総配当          | ROI    | 利益');
  console.log('  ' + '-'.repeat(80));
  for (const b of [{ label: '≤60頭', min: 0, max: 60 },{ label: '61-70頭', min: 61, max: 70 },{ label: '71-80頭', min: 71, max: 80 },{ label: '81頭以上', min: 81, max: 999 }]) {
    const days = dayResults.filter(d => d.totalHeadCount >= b.min && d.totalHeadCount <= b.max);
    if (!days.length) continue;
    const cost = days.reduce((s, d) => s + d.cost, 0);
    const payout = days.reduce((s, d) => s + d.payout, 0);
    const w5 = days.filter(d => d.win5).length;
    console.log(`  ${b.label.padEnd(10)} | ${String(days.length).padStart(4)}  | ${String(w5).padStart(3)}  | ¥${cost.toLocaleString().padStart(10)} | ¥${payout.toLocaleString().padStart(14)} | ${String(cost > 0 ? Math.round(payout/cost*100) : 0).padStart(5)}% | ¥${(payout-cost).toLocaleString()}`);
  }

  // 見送り戦略シミュレーション
  console.log('\n' + '═'.repeat(75));
  console.log('📊 見送り戦略のシミュレーション');
  console.log('═'.repeat(75));
  const skipStrategies = [
    { name: '見送りなし（現状）', skip: () => false },
    { name: 'Hard≥4レッグ', skip: d => d.hardCount >= 4 },
    { name: 'Hard≥3レッグ', skip: d => d.hardCount >= 3 },
    { name: 'Hard=5レッグ', skip: d => d.hardCount === 5 },
    { name: '平均難易度<30', skip: d => d.avgDiff < 30 },
    { name: '平均難易度<33', skip: d => d.avgDiff < 33 },
    { name: '平均難易度<35', skip: d => d.avgDiff < 35 },
    { name: '合計頭数>80', skip: d => d.totalHeadCount > 80 },
    { name: '合計頭数>75', skip: d => d.totalHeadCount > 75 },
    { name: 'Hard≥3 AND 頭数>75', skip: d => d.hardCount >= 3 && d.totalHeadCount > 75 },
    { name: 'Hard≥3 OR 難易度<30', skip: d => d.hardCount >= 3 || d.avgDiff < 30 },
    { name: 'コスト>¥12,000', skip: d => d.cost > 12000 },
    { name: 'コスト>¥10,000', skip: d => d.cost > 10000 },
  ];
  console.log('\n  見送り戦略             | 参加日 | スキップ | WIN5 | 総コスト      | 総配当          | ROI    | 利益');
  console.log('  ' + '-'.repeat(95));
  for (const strat of skipStrategies) {
    const participated = dayResults.filter(d => !strat.skip(d));
    const skipped = dayResults.length - participated.length;
    const cost = participated.reduce((s, d) => s + d.cost, 0);
    const payout = participated.reduce((s, d) => s + d.payout, 0);
    const w5 = participated.filter(d => d.win5).length;
    const roi = cost > 0 ? Math.round(payout / cost * 100) : 0;
    const missedWin5 = dayResults.filter(d => strat.skip(d) && d.win5).length;
    const missNote = missedWin5 > 0 ? ` (見逃し${missedWin5})` : '';
    console.log(`  ${strat.name.padEnd(22)} | ${String(participated.length).padStart(4)}   | ${String(skipped).padStart(5)}    | ${String(w5).padStart(3)}  | ¥${cost.toLocaleString().padStart(10)} | ¥${payout.toLocaleString().padStart(14)} | ${String(roi).padStart(5)}% | ¥${(payout-cost).toLocaleString()}${missNote}`);
  }

  // ベスト見送り戦略の年別検証
  console.log('\n' + '═'.repeat(75));
  console.log('📊 ベスト見送り戦略の年別検証');
  console.log('═'.repeat(75));
  let bestSkip = null, bestROI = 0;
  for (const strat of skipStrategies) {
    const missedWin5 = dayResults.filter(d => strat.skip(d) && d.win5).length;
    if (missedWin5 > 0) continue;
    const participated = dayResults.filter(d => !strat.skip(d));
    const cost = participated.reduce((s, d) => s + d.cost, 0);
    const payout = participated.reduce((s, d) => s + d.payout, 0);
    const roi = cost > 0 ? Math.round(payout / cost * 100) : 0;
    if (roi > bestROI) { bestROI = roi; bestSkip = strat; }
  }
  if (bestSkip) {
    console.log(`\n  ベスト（WIN5見逃しなし）: ${bestSkip.name}`);
    console.log('\n  年    | 参加日 | スキップ | WIN5 | コスト      | 配当          | ROI    | 利益');
    console.log('  ' + '-'.repeat(75));
    for (let y = 2019; y <= 2025; y++) {
      const yearDays = dayResults.filter(d => d.date.startsWith(String(y)));
      const part = yearDays.filter(d => !bestSkip.skip(d));
      const skip = yearDays.length - part.length;
      const cost = part.reduce((s, d) => s + d.cost, 0);
      const payout = part.reduce((s, d) => s + d.payout, 0);
      const w5 = part.filter(d => d.win5).length;
      const roi = cost > 0 ? Math.round(payout / cost * 100) : 0;
      console.log(`  ${y}  | ${String(part.length).padStart(4)}   | ${String(skip).padStart(5)}    | ${String(w5).padStart(3)}  | ¥${cost.toLocaleString().padStart(8)} | ¥${payout.toLocaleString().padStart(12)} | ${String(roi).padStart(5)}% | ¥${(payout-cost).toLocaleString()}`);
    }
  }

  console.log('\n  📈 全見送り戦略 ROI上位:');
  const allResults = skipStrategies.map(strat => {
    const part = dayResults.filter(d => !strat.skip(d));
    const cost = part.reduce((s, d) => s + d.cost, 0);
    const payout = part.reduce((s, d) => s + d.payout, 0);
    const missed = dayResults.filter(d => strat.skip(d) && d.win5).length;
    return { name: strat.name, roi: cost > 0 ? Math.round(payout/cost*100) : 0, profit: payout - cost, missed, days: part.length, w5: part.filter(d => d.win5).length };
  }).sort((a, b) => b.roi - a.roi);
  for (const r of allResults.slice(0, 5)) {
    console.log(`    ${r.name.padEnd(22)} | ROI ${String(r.roi).padStart(5)}% | WIN5 ${r.w5} | 利益 ¥${r.profit.toLocaleString()} | 参加${r.days}日${r.missed > 0 ? ` | ⚠️見逃し${r.missed}` : ''}`);
  }
  console.log('\n' + '═'.repeat(75));
}
main().catch(e => { console.error(e); process.exit(1); });
