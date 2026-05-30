#!/usr/bin/env node
/**
 * WIN5 柔軟予算シミュレーション
 * 
 * ベース¥15,000 / MAX¥50,000 で、その週のHardレッグ数に応じて
 * Hard候補数を動的に増減する戦略をテスト。
 * 
 * 使い方:
 *   node win5-flex-budget.mjs
 *   node win5-flex-budget.mjs --base 15000 --max 50000
 *   node win5-flex-budget.mjs --verbose
 */

import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    base:    { type: 'string', default: '15000' },
    max:     { type: 'string', default: '50000' },
    verbose: { type: 'boolean', default: false },
  },
});

const BASE_BUDGET = parseInt(args.base);
const MAX_BUDGET = parseInt(args.max);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 環境変数未設定'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function queryAll(p, ps = 1000) {
  let all = [], off = 0;
  while (true) {
    const sep = p.includes('?') ? '&' : '?';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}${sep}limit=${ps}&offset=${off}`, { headers });
    if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
    const d = await r.json(); all = all.concat(d);
    if (d.length < ps) break; off += ps;
  }
  return all;
}

// ── モデル（複合=ベスト） ──
function compositeScore(e, all) {
  const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
  const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
  return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
}

function calcSignals(entries) {
  if (!entries || entries.length < 2) return null;
  const idms = entries.map(e => e.idm||0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds||99).filter(o => o > 0).sort((a, b) => a - b);
  const invOdds = odds.map(o => 1/o);
  const sumInv = invOdds.reduce((s, v) => s + v, 0);
  const hhi = invOdds.reduce((s, v) => s + (v/sumInv)**2, 0);
  return { idmSpread: idms[0]-idms[1], headCount: entries.length, hhi, minOdds: odds[0]||1, odds12gap: (odds[1]||0)-(odds[0]||0) };
}

function rawScore(sig) {
  if (!sig) return 50;
  return Math.min(sig.idmSpread*8,100)*0.25 + Math.max(0,(18-sig.headCount)*8)*0.20
    + sig.hhi*400*0.25 + Math.max(0,(10-sig.minOdds)*12)*0.15 + Math.min(sig.odds12gap*8,100)*0.15;
}

// ── 予算内でHard候補数を最大化 ──
function optimizeHardCandidates(easyCount, medCount, hardCount, budget) {
  // Easy=1頭, Medium=2頭 は固定
  const baseCombos = Math.pow(1, easyCount) * Math.pow(2, medCount);
  if (baseCombos === 0 || hardCount === 0) return { hardN: 1, cost: baseCombos * 100 };

  // Hard N頭 → 総組合せ = baseCombos × N^hardCount
  // budget >= baseCombos × N^hardCount × 100
  // N^hardCount <= budget / (baseCombos × 100)
  const maxHardCombos = budget / (baseCombos * 100);
  const hardN = Math.max(1, Math.floor(Math.pow(maxHardCombos, 1 / hardCount)));
  const cost = baseCombos * Math.pow(hardN, hardCount) * 100;
  return { hardN: Math.min(hardN, 8), cost }; // 上限8頭
}

// ══════════════════════════════════
// 戦略定義
// ══════════════════════════════════

function defineStrategies() {
  return [
    // 固定ベースライン
    {
      name: '固定 1/2/3 (¥5K)',
      desc: 'Easy=1, Med=2, Hard=3 固定',
      allocate: () => ({ eN: 1, mN: 2, hN: 3 }),
    },
    {
      name: '固定 1/2/6 (¥15K)',
      desc: 'Easy=1, Med=2, Hard=6 固定',
      allocate: () => ({ eN: 1, mN: 2, hN: 6 }),
    },
    {
      name: '固定 2/2/7 (¥50K)',
      desc: 'Easy=2, Med=2, Hard=7 固定',
      allocate: () => ({ eN: 2, mN: 2, hN: 7 }),
    },

    // ── 柔軟戦略 ──

    // 戦略A: Hardレッグ数に応じた段階調整
    {
      name: 'Flex-A: 段階調整',
      desc: 'Hard数 0-1→Hard=7, 2→Hard=5, 3+→Hard=4',
      allocate: (eC, mC, hC) => {
        const hN = hC <= 1 ? 7 : hC === 2 ? 5 : 4;
        return { eN: 1, mN: 2, hN };
      },
    },

    // 戦略B: 予算内最大化（ベース15K）
    {
      name: 'Flex-B: ¥15K最大化',
      desc: 'Easy=1,Med=2固定、Hard=予算15K内で最大',
      allocate: (eC, mC, hC) => {
        const { hardN } = optimizeHardCandidates(eC, mC, hC, BASE_BUDGET);
        return { eN: 1, mN: 2, hN: hardN };
      },
    },

    // 戦略C: 予算内最大化（MAX50K）
    {
      name: 'Flex-C: ¥50K最大化',
      desc: 'Easy=1,Med=2固定、Hard=予算50K内で最大',
      allocate: (eC, mC, hC) => {
        const { hardN } = optimizeHardCandidates(eC, mC, hC, MAX_BUDGET);
        return { eN: 1, mN: 2, hN: hardN };
      },
    },

    // 戦略D: ベース15K + Hard多い週だけ50Kに拡大
    {
      name: '★Flex-D: 15K基本+Hard週50K',
      desc: 'Hard≤2は¥15K、Hard≥3は¥50Kに拡大',
      allocate: (eC, mC, hC) => {
        const budget = hC >= 3 ? MAX_BUDGET : BASE_BUDGET;
        const { hardN } = optimizeHardCandidates(eC, mC, hC, budget);
        return { eN: 1, mN: 2, hN: hardN };
      },
    },

    // 戦略E: よりアグレッシブ（Hard≥2で拡大）
    {
      name: 'Flex-E: 15K基本+Hard2以上50K',
      desc: 'Hard≤1は¥15K、Hard≥2は¥50Kに拡大',
      allocate: (eC, mC, hC) => {
        const budget = hC >= 2 ? MAX_BUDGET : BASE_BUDGET;
        const { hardN } = optimizeHardCandidates(eC, mC, hC, budget);
        return { eN: 1, mN: 2, hN: hardN };
      },
    },

    // 戦略F: 段階的予算（Hard数に応じてリニアに増加）
    {
      name: 'Flex-F: 段階予算',
      desc: 'Hard0=¥5K, Hard1=¥15K, Hard2=¥30K, Hard3+=¥50K',
      allocate: (eC, mC, hC) => {
        const budgetMap = [5000, 15000, 30000, 50000, 50000, 50000];
        const budget = budgetMap[Math.min(hC, 5)];
        const { hardN } = optimizeHardCandidates(eC, mC, hC, budget);
        return { eN: 1, mN: 2, hN: hardN };
      },
    },

    // 戦略G: Mediumも動的（Hard多い時はMedも増やす）
    {
      name: 'Flex-G: Med+Hard動的',
      desc: 'Hard≥3: Med=3,Hard=50K最大化。他: Med=2,Hard=15K最大化',
      allocate: (eC, mC, hC) => {
        if (hC >= 3) {
          const mN = 3;
          const baseCombos = Math.pow(1, eC) * Math.pow(mN, mC);
          const maxHC = baseCombos > 0 ? Math.floor(Math.pow(MAX_BUDGET / (baseCombos * 100), 1/hC)) : 3;
          return { eN: 1, mN, hN: Math.min(Math.max(maxHC, 1), 8) };
        }
        const { hardN } = optimizeHardCandidates(eC, mC, hC, BASE_BUDGET);
        return { eN: 1, mN: 2, hN: hardN };
      },
    },

    // 戦略H: 難易度スコアに応じた連続的配分
    {
      name: 'Flex-H: スコア連続配分',
      desc: '各レッグの難易度スコアに応じて1-7頭を個別設定、予算上限内',
      custom: true, // 特別処理
    },
  ];
}

// ══════════════════════════════════
// バックテスト
// ══════════════════════════════════

function runStrategy(strategy, dailyRaces, allScores, easyPct, hardPct) {
  const sorted = [...allScores].sort((a, b) => a - b);
  const easyThresh = sorted[Math.floor(sorted.length * hardPct / 100)] || 55;
  const hardThresh = sorted[Math.floor(sorted.length * easyPct / 100)] || 35;

  let totalLegs = 0, legHits = 0, totalCost = 0, totalPayout = 0;
  let win5Hits = 0, days = 0;
  const weeklyCosts = [];
  const costBuckets = { under5k: 0, under15k: 0, under30k: 0, under50k: 0, over50k: 0 };

  for (const [date, dayLegs] of dailyRaces) {
    if (dayLegs.length !== 5) continue;
    days++;

    // 各レッグの難易度計算
    const legInfos = dayLegs.map(leg => {
      const sig = calcSignals(leg.entries);
      const score = rawScore(sig);
      const level = score >= easyThresh ? 'Easy' : score >= hardThresh ? 'Medium' : 'Hard';
      return { ...leg, score, level };
    });

    const easyCount = legInfos.filter(l => l.level === 'Easy').length;
    const medCount = legInfos.filter(l => l.level === 'Medium').length;
    const hardCount = legInfos.filter(l => l.level === 'Hard').length;

    // 戦略H（個別配分）の特別処理
    let legResults;
    if (strategy.custom) {
      legResults = flexHStrategy(legInfos, easyThresh, hardThresh);
    } else {
      // 通常の戦略: Easy/Med/Hard → 候補数
      const alloc = strategy.allocate(easyCount, medCount, hardCount);
      legResults = legInfos.map(info => {
        const n = info.level === 'Easy' ? alloc.eN : info.level === 'Medium' ? alloc.mN : alloc.hN;
        const actualN = Math.min(n, info.entries.length);
        const scored = info.entries.map(e => ({ umaban: e.umaban, s: compositeScore(e, info.entries) })).sort((a, b) => b.s - a.s);
        const cands = scored.slice(0, actualN).map(x => x.umaban);
        const hit = cands.includes(info.winning_umaban);
        return { hit, n: actualN };
      });
    }

    const dayCost = legResults.reduce((p, l) => p * l.n, 1) * 100;
    const allHit = legResults.every(l => l.hit);

    totalCost += dayCost;
    weeklyCosts.push(dayCost);
    totalLegs += 5;
    legHits += legResults.filter(l => l.hit).length;

    if (dayCost <= 5000) costBuckets.under5k++;
    else if (dayCost <= 15000) costBuckets.under15k++;
    else if (dayCost <= 30000) costBuckets.under30k++;
    else if (dayCost <= 50000) costBuckets.under50k++;
    else costBuckets.over50k++;

    if (allHit && dayLegs[0].payout) { win5Hits++; totalPayout += dayLegs[0].payout; }
  }

  const avgCost = days ? Math.round(totalCost / days) : 0;
  const medianCost = weeklyCosts.length ? weeklyCosts.sort((a,b) => a-b)[Math.floor(weeklyCosts.length/2)] : 0;
  const maxCost = Math.max(...weeklyCosts, 0);
  const yearSpan = days / 52;

  return {
    days, win5Hits, totalLegs, legHits,
    legRate: +(legHits/totalLegs*100).toFixed(1),
    totalCost, totalPayout,
    roi: totalCost ? Math.round(totalPayout/totalCost*100) : 0,
    avgCost, medianCost, maxCost,
    annualCost: Math.round(totalCost / yearSpan),
    annualProfit: Math.round((totalPayout - totalCost) / yearSpan),
    costBuckets,
  };
}

// 戦略H: 個別スコアベース配分
function flexHStrategy(legInfos, easyThresh, hardThresh) {
  // 各レッグのスコアに応じて候補数を決定
  // スコア高い(Easy)→1頭, スコア低い(Hard)→多め
  // 予算上限内で最適化
  const candidates = legInfos.map(info => {
    const score = info.score;
    // スコアを0-100にクリップし、候補数に変換
    // 高スコア(Easy)=1, 低スコア(Hard)=多い
    let n;
    if (score >= 50) n = 1;
    else if (score >= 42) n = 2;
    else if (score >= 36) n = 3;
    else if (score >= 30) n = 5;
    else n = 7;
    return n;
  });

  // 予算チェック
  let combos = candidates.reduce((p, n) => p * n, 1);
  let cost = combos * 100;

  // MAX超えたら最も多い候補を減らす
  while (cost > MAX_BUDGET && candidates.some(n => n > 1)) {
    const maxIdx = candidates.indexOf(Math.max(...candidates));
    candidates[maxIdx]--;
    combos = candidates.reduce((p, n) => p * n, 1);
    cost = combos * 100;
  }

  return legInfos.map((info, i) => {
    const n = Math.min(candidates[i], info.entries.length);
    const scored = info.entries.map(e => ({ umaban: e.umaban, s: compositeScore(e, info.entries) })).sort((a, b) => b.s - a.s);
    const cands = scored.slice(0, n).map(x => x.umaban);
    return { hit: cands.includes(info.winning_umaban), n };
  });
}

// ══════════════════════════════════
// メイン
// ══════════════════════════════════

async function main() {
  console.log(`\n💰 WIN5 柔軟予算シミュレーション (ベース¥${BASE_BUDGET.toLocaleString()} / MAX¥${MAX_BUDGET.toLocaleString()})\n`);

  // データ読込
  const legs = await queryAll('win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,idm,jockey_index,base_odds,ten_index,agari_index,position_index&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }

  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key) || [] })).filter(r => r.entries.length > 0);
  const allScores = races.map(r => rawScore(calcSignals(r.entries)));
  console.log(`\n  対象: ${races.length}レッグ\n`);

  // 日別グループ
  const dailyRaces = new Map();
  for (const r of races) {
    if (!dailyRaces.has(r.race_date)) dailyRaces.set(r.race_date, []);
    dailyRaces.get(r.race_date).push(r);
  }

  // Hard分布確認
  const sorted = [...allScores].sort((a, b) => a - b);
  const easyThresh = sorted[Math.floor(sorted.length * 75 / 100)] || 55;
  const hardThresh = sorted[Math.floor(sorted.length * 40 / 100)] || 35;

  const hardDistribution = {};
  for (const [date, dayLegs] of dailyRaces) {
    if (dayLegs.length !== 5) continue;
    const hCount = dayLegs.filter(l => {
      const s = rawScore(calcSignals(l.entries));
      return s < hardThresh;
    }).length;
    hardDistribution[hCount] = (hardDistribution[hCount] || 0) + 1;
  }

  console.log('📊 1日あたりのHardレッグ数分布:');
  for (let h = 0; h <= 5; h++) {
    const cnt = hardDistribution[h] || 0;
    const bar = '█'.repeat(Math.round(cnt / 5));
    console.log(`  Hard=${h}: ${String(cnt).padStart(3)}日 ${bar}`);
  }

  // ── 戦略テスト ──
  const strategies = defineStrategies();
  const results = [];

  console.log('\n' + '═'.repeat(80));
  console.log('📋 戦略比較');
  console.log('═'.repeat(80));

  for (const strategy of strategies) {
    const r = runStrategy(strategy, dailyRaces, allScores, 40, 75);
    results.push({ name: strategy.name, desc: strategy.desc, ...r });
  }

  // ── 結果表示 ──
  console.log('\n  戦略                          | レッグ率 | WIN5   | 平均コスト | 中央コスト | 年コスト    | 年利益         | ROI');
  console.log('  ' + '-'.repeat(110));
  for (const r of results) {
    console.log(`  ${r.name.padEnd(30)} | ${String(r.legRate).padStart(5)}%  | ${String(r.win5Hits).padStart(2)}/${r.days}  | ¥${r.avgCost.toLocaleString().padStart(7)} | ¥${r.medianCost.toLocaleString().padStart(7)} | ¥${r.annualCost.toLocaleString().padStart(9)} | ¥${r.annualProfit.toLocaleString().padStart(12)} | ${r.roi}%`);
  }

  // ── コスト分布 ──
  console.log('\n📊 週あたりコスト分布:');
  console.log('  戦略                          | ≤¥5K  | ≤¥15K | ≤¥30K | ≤¥50K | >¥50K | 最大コスト');
  console.log('  ' + '-'.repeat(95));
  for (const r of results) {
    const b = r.costBuckets;
    console.log(`  ${r.name.padEnd(30)} | ${String(b.under5k).padStart(4)}  | ${String(b.under15k).padStart(4)}  | ${String(b.under30k).padStart(4)}  | ${String(b.under50k).padStart(4)}  | ${String(b.over50k).padStart(4)}  | ¥${r.maxCost.toLocaleString()}`);
  }

  // ── ベースラインとの比較 ──
  const baseline = results.find(r => r.name.includes('固定 1/2/6'));
  const flexD = results.find(r => r.name.includes('Flex-D'));

  if (baseline && flexD) {
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 キー比較: 固定¥15K vs Flex-D (15K基本+Hard週50K)');
    console.log('═'.repeat(80));
    console.log(`\n  指標              | 固定 1/2/6       | Flex-D           | 差分`);
    console.log('  ' + '-'.repeat(70));
    console.log(`  WIN5的中          | ${String(baseline.win5Hits).padStart(2)}/${baseline.days}           | ${String(flexD.win5Hits).padStart(2)}/${flexD.days}           | +${flexD.win5Hits - baseline.win5Hits}回`);
    console.log(`  レッグ的中率      | ${baseline.legRate}%          | ${flexD.legRate}%          | +${(flexD.legRate - baseline.legRate).toFixed(1)}%`);
    console.log(`  年間コスト        | ¥${baseline.annualCost.toLocaleString().padStart(10)} | ¥${flexD.annualCost.toLocaleString().padStart(10)} | +¥${(flexD.annualCost - baseline.annualCost).toLocaleString()}`);
    console.log(`  年間利益          | ¥${baseline.annualProfit.toLocaleString().padStart(10)} | ¥${flexD.annualProfit.toLocaleString().padStart(10)} | +¥${(flexD.annualProfit - baseline.annualProfit).toLocaleString()}`);
    console.log(`  ROI               | ${baseline.roi}%        | ${flexD.roi}%        |`);
    console.log(`  平均コスト/週     | ¥${baseline.avgCost.toLocaleString().padStart(10)} | ¥${flexD.avgCost.toLocaleString().padStart(10)} |`);
    console.log(`  最大コスト/週     | ¥${baseline.maxCost.toLocaleString().padStart(10)} | ¥${flexD.maxCost.toLocaleString().padStart(10)} |`);

    const addCost = flexD.annualCost - baseline.annualCost;
    const addProfit = flexD.annualProfit - baseline.annualProfit;
    const marginalROI = addCost > 0 ? Math.round(addProfit / addCost * 100) : 0;
    console.log(`\n  📈 追加投資効率: ¥${addCost.toLocaleString()}追加 → ¥${addProfit.toLocaleString()}追加利益 (限界ROI ${marginalROI}%)`);
  }

  // ── 最推奨 ──
  console.log('\n' + '═'.repeat(80));
  results.sort((a, b) => b.annualProfit - a.annualProfit);
  const best = results[0];
  console.log(`🏆 年間利益ベスト: ${best.name}`);
  console.log(`   ${best.desc}`);
  console.log(`   WIN5 ${best.win5Hits}回 | 年利益 ¥${best.annualProfit.toLocaleString()} | ROI ${best.roi}% | 週平均 ¥${best.avgCost.toLocaleString()}`);

  // ROIと利益のバランスが良いものを選出
  const balanced = results.filter(r => r.roi > 5000 && r.annualProfit > 100000000).sort((a, b) => b.win5Hits - a.win5Hits)[0];
  if (balanced && balanced !== best) {
    console.log(`\n⚖️  バランス推奨: ${balanced.name}`);
    console.log(`   WIN5 ${balanced.win5Hits}回 | 年利益 ¥${balanced.annualProfit.toLocaleString()} | ROI ${balanced.roi}% | 週平均 ¥${balanced.avgCost.toLocaleString()}`);
  }

  console.log('═'.repeat(80));
}

main().catch(e => { console.error(e); process.exit(1); });
