#!/usr/bin/env node
/**
 * 血統×コース適性シグナルのWIN5バックテスト
 * カザン式に血統ブーストを加えた場合のROI改善効果を測定
 */
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

const CC = { '札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05','中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10' };
const ALLOC = [{ ms: 48, h: 1, a: 0 }, { ms: 40, h: 2, a: 0 }, { ms: 33, h: 2, a: 1 }, { ms: 0, h: 2, a: 3 }];
const CAP = 15000;

function compositeScore(e, all) {
  const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
  const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
  return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
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

// カザンスコア（血統ブースト付き）
function kazanScoreWithSire(e, all, sireMap, horseMap, courseCode, boostFn) {
  const s = [...all].sort((a, b) => (b.idm||0) - (a.idm||0));
  const r = s.findIndex(x => x.umaban === e.umaban) + 1;
  const odds = e.base_odds || 1;
  if (r <= 2 || r > 8 || odds < 5) return 0;
  let baseScore = (e.idm||0) * Math.log(odds);

  // 血統ブースト
  const sire = horseMap.get(e.horse_code);
  if (sire && courseCode) {
    const stats = sireMap.get(`${sire}|${courseCode}`);
    if (stats && stats.runs >= 10) {
      baseScore *= boostFn(stats);
    }
  }
  return baseScore;
}

function selectCands(entries, hN, aN, sireMap, horseMap, cc, boostFn) {
  const comp = entries.map(e => ({ u: e.umaban, s: compositeScore(e, entries) })).sort((a, b) => b.s - a.s);
  const kaz = entries.map(e => ({ u: e.umaban, s: kazanScoreWithSire(e, entries, sireMap, horseMap, cc, boostFn) })).sort((a, b) => b.s - a.s);
  const hSet = new Set(comp.slice(0, hN).map(x => x.u));
  return [...hSet, ...kaz.filter(x => x.s > 0 && !hSet.has(x.u)).slice(0, aN).map(x => x.u)];
}

function simDay(dayLegs, sireMap, horseMap, boostFn) {
  const plans = dayLegs.map(leg => {
    const ds = calcDiff(leg.entries);
    let h = 2, a = 1;
    for (const m of ALLOC) { if (ds >= m.ms) { h = m.h; a = m.a; break; } }
    const cc = CC[leg.course_name];
    const c = selectCands(leg.entries, h, a, sireMap, horseMap, cc, boostFn);
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
  const hardCount = plans.filter(p => p.ds < 33).length;
  const totalHead = plans.reduce((s, p) => s + p.leg.entries.length, 0);
  const shouldSkip = hardCount >= 3 && totalHead > 75;
  const payout = (hits === 5 && dayLegs[0].payout) ? dayLegs[0].payout : 0;
  return { cost, payout, hits, win5: hits === 5 && payout > 0, shouldSkip };
}

async function main() {
  console.log('\n🧬 血統×コース適性 WIN5バックテスト\n');

  // データ読込
  console.log('  データ読込中...');
  const [allStats, allHorses] = await Promise.all([
    queryAll('sire_course_distance_stats?select=sire_name,course_code,runs,win_rate,place_rate'),
    queryAll('jrdb_horses?select=horse_code,sire_name'),
  ]);
  const sireMap = new Map();
  for (const s of allStats) sireMap.set(`${s.sire_name}|${s.course_code}`, s);
  const horseMap = new Map();
  for (const h of allHorses) horseMap.set(h.horse_code, h.sire_name);
  console.log(`  sire_stats: ${allStats.length}件 / horses: ${allHorses.length}頭`);

  const legs = await queryAll('win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,horse_code,idm,jockey_index,base_odds&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }
  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key) || [] })).filter(r => r.entries.length > 0);
  const daily = new Map();
  for (const r of races) { if (!daily.has(r.race_date)) daily.set(r.race_date, []); daily.get(r.race_date).push(r); }
  console.log(`\n  対象: ${races.length}レッグ (${[...daily].filter(([,l])=>l.length===5).length}日)\n`);

  // ブースト関数のバリエーション
  const boostVariants = [
    { name: 'ベースライン（血統なし）', fn: () => 1 },
    { name: '血統A: 複勝率×1.5',     fn: s => 1 + Math.max(0, s.place_rate - 0.20) * 1.5 },
    { name: '血統B: 複勝率×2.0',     fn: s => 1 + Math.max(0, s.place_rate - 0.20) * 2.0 },
    { name: '血統C: 複勝率×3.0',     fn: s => 1 + Math.max(0, s.place_rate - 0.20) * 3.0 },
    { name: '血統D: 勝率×5.0',       fn: s => 1 + Math.max(0, s.win_rate - 0.08) * 5.0 },
    { name: '血統E: 勝率×10.0',      fn: s => 1 + Math.max(0, s.win_rate - 0.08) * 10.0 },
    { name: '血統F: 複勝≥30%→×1.5',  fn: s => s.place_rate >= 0.30 ? 1.5 : 1.0 },
    { name: '血統G: 複勝≥35%→×2.0',  fn: s => s.place_rate >= 0.35 ? 2.0 : 1.0 },
    { name: '血統H: 勝率≥12%→×2.0',  fn: s => s.win_rate >= 0.12 ? 2.0 : 1.0 },
    { name: '血統I: 複合(勝+複)',     fn: s => 1 + (s.win_rate||0)*3 + Math.max(0, s.place_rate-0.20)*2 },
    { name: '血統J: 低適性ペナルティ',  fn: s => s.place_rate < 0.15 ? 0.5 : (s.place_rate >= 0.30 ? 1.5 : 1.0) },
  ];

  console.log('═'.repeat(75));
  console.log('📊 血統ブーストバリエーション比較');
  console.log('═'.repeat(75));
  console.log('\n  見送りなし:');
  console.log('  モデル                     | WIN5 | レッグ率 | 総コスト      | 総配当          | ROI    | 利益');
  console.log('  ' + '-'.repeat(95));

  const results = [];
  for (const variant of boostVariants) {
    let days = 0, win5 = 0, totalCost = 0, totalPayout = 0, legHits = 0, totalLegs = 0;
    for (const [, dayLegs] of daily) {
      if (dayLegs.length !== 5) continue;
      days++;
      const r = simDay(dayLegs, sireMap, horseMap, variant.fn);
      totalCost += r.cost; totalPayout += r.payout;
      if (r.win5) win5++;
      legHits += r.hits; totalLegs += 5;
    }
    const roi = totalCost > 0 ? Math.round(totalPayout / totalCost * 100) : 0;
    const legRate = +(legHits / totalLegs * 100).toFixed(1);
    const profit = totalPayout - totalCost;
    results.push({ name: variant.name, days, win5, legRate, totalCost, totalPayout, roi, profit });
    console.log(`  ${variant.name.padEnd(26)} | ${String(win5).padStart(3)}  | ${String(legRate).padStart(5)}%  | ¥${totalCost.toLocaleString().padStart(10)} | ¥${totalPayout.toLocaleString().padStart(14)} | ${String(roi).padStart(5)}% | ¥${profit.toLocaleString()}`);
  }

  // 見送り込み
  console.log('\n  見送り込み（Hard≥3 AND 頭数>75）:');
  console.log('  モデル                     | WIN5 | 見逃し | 参加日 | ROI    | 利益');
  console.log('  ' + '-'.repeat(80));

  for (const variant of boostVariants) {
    let days = 0, win5 = 0, totalCost = 0, totalPayout = 0, skipped = 0, missed = 0;
    for (const [, dayLegs] of daily) {
      if (dayLegs.length !== 5) continue;
      const r = simDay(dayLegs, sireMap, horseMap, variant.fn);
      if (r.shouldSkip) { skipped++; if (r.win5) missed++; continue; }
      days++;
      totalCost += r.cost; totalPayout += r.payout;
      if (r.win5) win5++;
    }
    const roi = totalCost > 0 ? Math.round(totalPayout / totalCost * 100) : 0;
    console.log(`  ${variant.name.padEnd(26)} | ${String(win5).padStart(3)}  | ${String(missed).padStart(4)}   | ${String(days).padStart(4)}   | ${String(roi).padStart(5)}% | ¥${(totalPayout - totalCost).toLocaleString()}`);
  }

  // ベストモデル
  const best = results.filter(r => r.win5 >= 10).sort((a, b) => b.roi - a.roi)[0];
  const baseline = results[0];
  if (best && best !== baseline) {
    console.log(`\n  🏆 ベスト: ${best.name}`);
    console.log(`     WIN5 ${best.win5}回 | ROI ${best.roi}% (ベースライン${baseline.roi}%から+${best.roi - baseline.roi}%) | 利益 ¥${best.profit.toLocaleString()}`);
  }

  console.log('\n═══ 完了 ═══');
}
main().catch(e => { console.error(e); process.exit(1); });
