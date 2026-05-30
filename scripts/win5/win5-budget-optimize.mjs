#!/usr/bin/env node
/**
 * WIN5 予算別最適化バックテスト
 * 
 * 予算上限ごとに Easy/Medium/Hard の候補数(1-6頭)を全パターン探索し、
 * ROI・WIN5的中数・レッグ的中率の最適な組み合わせを算出。
 * 
 * 使い方:
 *   node win5-budget-optimize.mjs
 *   node win5-budget-optimize.mjs --budgets 10000,30000,50000,100000
 *   node win5-budget-optimize.mjs --model composite
 *   node win5-budget-optimize.mjs --verbose
 */

import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    budgets: { type: 'string', default: '5000,15000,30000,50000,100000' },
    model:   { type: 'string', default: 'all' },
    verbose: { type: 'boolean', default: false },
  },
});

const BUDGETS = args.budgets.split(',').map(Number).sort((a, b) => a - b);

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

// ── モデル ──
const MODELS = {
  composite: { name: '複合', fn: (e, all) => {
    const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
    const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
    return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
  }},
  odds: { name: 'オッズ順', fn: e => -(e.base_odds || 999) },
  hayate: { name: 'ハヤテ式', fn: e => (e.idm||0)*0.8 + (e.jockey_index||0)*0.2 },
  idm: { name: 'IDMトップ', fn: e => e.idm || 0 },
};

// ── 難易度 ──
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

// ── 全パターン生成 ──
// Easy: eN頭, Medium: mN頭, Hard: hN頭
// 予算上限: 各日のcombinations × ¥100 の最大値が予算以下
function generateAllocations(maxBudget) {
  const allocations = [];
  for (let e = 1; e <= 6; e++) {
    for (let m = e; m <= 6; m++) { // Medium >= Easy
      for (let h = m; h <= 8; h++) { // Hard >= Medium
        // 最大コスト = 全レッグがHardの場合: h^5
        // 現実的な最大: 5レッグの最悪ケースを見積もり
        const maxCombo = h ** 5; // 全Hard
        const maxCost = maxCombo * 100;
        // 実際は混在するのでh^5は最悪ケース
        // 平均的なケースも確認: 典型的なE/M/H分布
        // E40/H75なので: E≈25%, M≈35%, H≈40% (per leg)
        const typicalCombo = e * m * h * m * h; // E,M,H,M,H パターン
        const typicalCost = typicalCombo * 100;
        
        if (typicalCost <= maxBudget * 2) { // 余裕を持って候補に含める
          allocations.push({ e, m, h });
        }
      }
    }
  }
  return allocations;
}

// ── バックテスト ──
function runBacktest(races, modelFn, allScores, eN, mN, hN, easyPct, hardPct) {
  const sorted = [...allScores].sort((a, b) => a - b);
  const easyThresh = sorted[Math.floor(sorted.length * hardPct / 100)] || 55;
  const hardThresh = sorted[Math.floor(sorted.length * easyPct / 100)] || 35;

  let legHits = 0, totalLegs = 0;
  const daily = new Map();

  for (const race of races) {
    totalLegs++;
    const entries = race.entries;
    if (!entries.length) continue;

    const score = rawScore(calcSignals(entries));
    const level = score >= easyThresh ? 'Easy' : score >= hardThresh ? 'Medium' : 'Hard';
    const n = level === 'Easy' ? eN : level === 'Medium' ? mN : hN;

    const scored = entries.map(e => ({ umaban: e.umaban, s: modelFn(e, entries) })).sort((a, b) => b.s - a.s);
    const cands = scored.slice(0, Math.min(n, entries.length)).map(x => x.umaban);
    const hit = cands.includes(race.winning_umaban);
    if (hit) legHits++;

    if (!daily.has(race.race_date)) daily.set(race.race_date, { legs: [], payout: race.payout });
    daily.get(race.race_date).legs.push({ hit, n: Math.min(n, entries.length) });
  }

  let win5 = 0, totalCost = 0, totalPayout = 0, days = 0;
  let maxWeekCost = 0;
  const weeklyCosts = [];

  for (const [, d] of daily) {
    if (d.legs.length !== 5) continue;
    days++;
    const combo = d.legs.reduce((p, l) => p * l.n, 1);
    const cost = combo * 100;
    totalCost += cost;
    weeklyCosts.push(cost);
    if (cost > maxWeekCost) maxWeekCost = cost;
    if (d.legs.every(l => l.hit) && d.payout) { win5++; totalPayout += d.payout; }
  }

  const avgCost = days ? Math.round(totalCost / days) : 0;
  const medianCost = weeklyCosts.length ? weeklyCosts.sort((a, b) => a - b)[Math.floor(weeklyCosts.length / 2)] : 0;

  return {
    eN, mN, hN,
    totalLegs, legHits, legRate: +(legHits/totalLegs*100).toFixed(1),
    days, win5, 
    totalCost, totalPayout,
    roi: totalCost ? Math.round(totalPayout / totalCost * 100) : 0,
    avgCost, medianCost, maxWeekCost,
    annualCost: days ? Math.round(totalCost / (days / 52)) : 0, // 年間想定
    annualPayout: days ? Math.round(totalPayout / (days / 52)) : 0,
    profitPerYear: days ? Math.round((totalPayout - totalCost) / (days / 52)) : 0,
  };
}

async function main() {
  console.log('\n💰 WIN5 予算別最適化バックテスト\n');
  console.log(`  予算設定: ${BUDGETS.map(b => '¥' + b.toLocaleString()).join(', ')}\n`);

  // ── データ読込 ──
  const legs = await queryAll('win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  console.log(`  WIN5レッグ: ${legs.length}`);

  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  const BATCH = 60;
  for (let i = 0; i < raceKeys.length; i += BATCH) {
    const batch = raceKeys.slice(i, i + BATCH);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,idm,jockey_index,base_odds,ten_index,agari_index,position_index&race_key=in.(${batch.join(',')})`);
    for (const e of entries) {
      if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []);
      jrdb.get(e.race_key).push(e);
    }
    process.stdout.write(`  JRDB: ${Math.min(i+BATCH, raceKeys.length)}/${raceKeys.length}\r`);
  }

  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key) || [] })).filter(r => r.entries.length > 0);
  const allScores = races.map(r => rawScore(calcSignals(r.entries)));
  const yearSpan = races.length > 0 ? (new Date(races[races.length-1].race_date) - new Date(races[0].race_date)) / (365.25 * 86400000) : 1;
  console.log(`\n  対象: ${races.length}レッグ (${[...new Set(races.map(r => r.race_date))].length}日, ${yearSpan.toFixed(1)}年間)\n`);

  // ── 最適パーセンタイル設定（v2から） ──
  const EASY_PCT = 40;
  const HARD_PCT = 75;

  // ── モデル選択 ──
  const targetModels = args.model === 'all' ? Object.keys(MODELS) : [args.model];

  // ══════════════════════════════════════
  // 各予算で最適化
  // ══════════════════════════════════════

  for (const budget of BUDGETS) {
    console.log('\n' + '═'.repeat(70));
    console.log(`💰 予算上限: ¥${budget.toLocaleString()}/週`);
    console.log('═'.repeat(70));

    const allResults = [];

    for (const mk of targetModels) {
      const model = MODELS[mk];
      const allocations = generateAllocations(budget);

      for (const { e, m, h } of allocations) {
        const result = runBacktest(races, model.fn, allScores, e, m, h, EASY_PCT, HARD_PCT);
        
        // 予算チェック: 中央値コストが予算以下
        if (result.medianCost > budget) continue;
        
        allResults.push({ model: mk, modelName: model.name, ...result });
      }
    }

    if (allResults.length === 0) {
      console.log('  候補なし');
      continue;
    }

    // ── ROI順 ──
    allResults.sort((a, b) => b.roi - a.roi);
    console.log(`\n  🏆 ROI上位5 (中央値コスト ≤ ¥${budget.toLocaleString()}):`);
    console.log('  モデル     E/M/H | レッグ率 | WIN5   | 中央コスト  | 最大コスト  | 年利益         | ROI');
    console.log('  ' + '-'.repeat(95));
    for (const r of allResults.slice(0, 5)) {
      console.log(`  ${r.modelName.padEnd(7)}  ${r.eN}/${r.mN}/${r.hN} | ${String(r.legRate).padStart(5)}%  | ${String(r.win5).padStart(2)}/${r.days}  | ¥${r.medianCost.toLocaleString().padStart(8)} | ¥${r.maxWeekCost.toLocaleString().padStart(8)} | ¥${(r.profitPerYear).toLocaleString().padStart(12)} | ${r.roi}%`);
    }

    // ── WIN5的中数順 ──
    allResults.sort((a, b) => b.win5 - a.win5 || b.roi - a.roi);
    console.log(`\n  🎯 WIN5的中数上位5:`);
    console.log('  モデル     E/M/H | レッグ率 | WIN5   | 中央コスト  | 最大コスト  | 年利益         | ROI');
    console.log('  ' + '-'.repeat(95));
    for (const r of allResults.slice(0, 5)) {
      console.log(`  ${r.modelName.padEnd(7)}  ${r.eN}/${r.mN}/${r.hN} | ${String(r.legRate).padStart(5)}%  | ${String(r.win5).padStart(2)}/${r.days}  | ¥${r.medianCost.toLocaleString().padStart(8)} | ¥${r.maxWeekCost.toLocaleString().padStart(8)} | ¥${(r.profitPerYear).toLocaleString().padStart(12)} | ${r.roi}%`);
    }

    // ── 年利益順（実利重視） ──
    allResults.sort((a, b) => b.profitPerYear - a.profitPerYear);
    console.log(`\n  📈 年間利益上位5:`);
    console.log('  モデル     E/M/H | レッグ率 | WIN5   | 年コスト      | 年配当          | 年利益         | ROI');
    console.log('  ' + '-'.repeat(105));
    for (const r of allResults.slice(0, 5)) {
      console.log(`  ${r.modelName.padEnd(7)}  ${r.eN}/${r.mN}/${r.hN} | ${String(r.legRate).padStart(5)}%  | ${String(r.win5).padStart(2)}/${r.days}  | ¥${r.annualCost.toLocaleString().padStart(10)} | ¥${r.annualPayout.toLocaleString().padStart(14)} | ¥${r.profitPerYear.toLocaleString().padStart(12)} | ${r.roi}%`);
    }
  }

  // ══════════════════════════════════════
  // 全予算横断比較
  // ══════════════════════════════════════
  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 予算別 最適モデル比較');
  console.log('═'.repeat(70));
  console.log('\n  予算         | ベスト配分 | モデル   | WIN5 | レッグ率 | 年コスト      | 年利益         | ROI');
  console.log('  ' + '-'.repeat(100));

  for (const budget of BUDGETS) {
    const allResults = [];
    for (const mk of targetModels) {
      const model = MODELS[mk];
      for (const { e, m, h } of generateAllocations(budget)) {
        const result = runBacktest(races, model.fn, allScores, e, m, h, EASY_PCT, HARD_PCT);
        if (result.medianCost <= budget) {
          allResults.push({ model: mk, modelName: model.name, ...result });
        }
      }
    }

    // 年利益ベスト
    allResults.sort((a, b) => b.profitPerYear - a.profitPerYear);
    const best = allResults[0];
    if (best) {
      console.log(`  ¥${budget.toLocaleString().padStart(7)}/週  | ${best.eN}/${best.mN}/${best.hN}      | ${best.modelName.padEnd(7)} | ${String(best.win5).padStart(2)}/${best.days} | ${String(best.legRate).padStart(5)}%  | ¥${best.annualCost.toLocaleString().padStart(10)} | ¥${best.profitPerYear.toLocaleString().padStart(12)} | ${best.roi}%`);
    }
  }

  console.log('\n  ※ 年利益 = (総配当 - 総コスト) ÷ 期間年数 × 52週');
  console.log('  ※ ROIが高い ≠ 利益が大きい（低コストだとROI高いが利益額は小さい）');
  console.log('═'.repeat(70));
}

main().catch(e => { console.error(e); process.exit(1); });
