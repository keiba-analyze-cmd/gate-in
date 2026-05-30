#!/usr/bin/env node
/**
 * WIN5 Flex-H（スコア連続配分）最適化
 * 
 * 各レッグの難易度スコアに応じて候補数を個別設定し、
 * 予算キャップ内で的中数・ROIを最大化するパラメータを探索。
 * 
 * 使い方:
 *   node win5-flex-h-optimize.mjs
 *   node win5-flex-h-optimize.mjs --verbose
 */

import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: { verbose: { type: 'boolean', default: false } },
});

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

// ── スコア→候補数マッピング定義 ──
// thresholds: [{min: score, n: candidates}] 降順（高スコア=Easy=少候補 → 低スコア=Hard=多候補）
function scoreToN(score, thresholds) {
  for (const t of thresholds) {
    if (score >= t.min) return t.n;
  }
  return thresholds[thresholds.length - 1].n;
}

// ── バックテスト ──
function runFlexH(dailyRaces, thresholds, budgetCap) {
  let totalLegs = 0, legHits = 0, totalCost = 0, totalPayout = 0;
  let win5Hits = 0, days = 0, overBudget = 0;
  const weeklyCosts = [];

  for (const [date, dayLegs] of dailyRaces) {
    if (dayLegs.length !== 5) continue;
    days++;

    // 各レッグのスコア・候補数
    const legPlans = dayLegs.map(leg => {
      const score = rawScore(calcSignals(leg.entries));
      const rawN = scoreToN(score, thresholds);
      return { ...leg, score, rawN, n: Math.min(rawN, leg.entries.length) };
    });

    // 予算チェック・調整
    let combos = legPlans.reduce((p, l) => p * l.n, 1);
    let cost = combos * 100;

    if (cost > budgetCap) {
      // 予算超過 → 最も候補が多いレッグから1ずつ減らす
      const plans = [...legPlans];
      while (cost > budgetCap) {
        // 最も候補が多いレッグを探す
        let maxN = 0, maxIdx = -1;
        for (let i = 0; i < plans.length; i++) {
          if (plans[i].n > maxN) { maxN = plans[i].n; maxIdx = i; }
        }
        if (maxN <= 1) break;
        plans[maxIdx].n--;
        combos = plans.reduce((p, l) => p * l.n, 1);
        cost = combos * 100;
      }
      // 調整後の候補数を反映
      for (let i = 0; i < legPlans.length; i++) legPlans[i].n = plans[i].n;
    }

    if (cost > budgetCap) overBudget++;

    // 馬選択・的中判定
    const legResults = legPlans.map(leg => {
      const scored = leg.entries.map(e => ({
        umaban: e.umaban,
        s: compositeScore(e, leg.entries),
      })).sort((a, b) => b.s - a.s);
      const cands = scored.slice(0, leg.n).map(x => x.umaban);
      const hit = cands.includes(leg.winning_umaban);
      return { hit, n: leg.n };
    });

    const dayCost = legResults.reduce((p, l) => p * l.n, 1) * 100;
    totalCost += dayCost;
    weeklyCosts.push(dayCost);
    totalLegs += 5;
    legHits += legResults.filter(l => l.hit).length;

    if (legResults.every(l => l.hit) && dayLegs[0].payout) {
      win5Hits++;
      totalPayout += dayLegs[0].payout;
    }
  }

  const avgCost = days ? Math.round(totalCost / days) : 0;
  const medianCost = weeklyCosts.sort((a,b) => a-b)[Math.floor(weeklyCosts.length/2)] || 0;
  const maxCost = Math.max(...weeklyCosts, 0);
  const yearSpan = days / 52;

  return {
    days, win5Hits, totalLegs, legHits,
    legRate: +(legHits/totalLegs*100).toFixed(1),
    totalCost, totalPayout,
    roi: totalCost ? Math.round(totalPayout/totalCost*100) : 0,
    avgCost, medianCost, maxCost, overBudget,
    annualCost: Math.round(totalCost / yearSpan),
    annualProfit: Math.round((totalPayout - totalCost) / yearSpan),
  };
}

async function main() {
  console.log('\n🎯 WIN5 Flex-H スコア連続配分 最適化\n');

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
  console.log(`\n  対象: ${races.length}レッグ\n`);

  const dailyRaces = new Map();
  for (const r of races) {
    if (!dailyRaces.has(r.race_date)) dailyRaces.set(r.race_date, []);
    dailyRaces.get(r.race_date).push(r);
  }

  // スコア分布確認
  const allScores = races.map(r => rawScore(calcSignals(r.entries)));
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const pcts = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  console.log('📊 難易度スコア パーセンタイル:');
  for (const p of pcts) {
    const v = sortedScores[Math.floor(sortedScores.length * p / 100)];
    console.log(`  P${p}: ${v?.toFixed(1)}`);
  }

  // ═══════════════════════════════════════
  // グリッドサーチ
  // ═══════════════════════════════════════

  // スコア→候補数マッピングのバリエーション
  // 形式: [{min: スコア閾値, n: 候補数}] (高スコア=Easy→少候補, 降順)
  const mappings = [
    // パターン名, 閾値配列
    ['A: 1-2-3-5-7', [{ min: 50, n: 1 }, { min: 42, n: 2 }, { min: 36, n: 3 }, { min: 30, n: 5 }, { min: 0, n: 7 }]],
    ['B: 1-2-4-6-8', [{ min: 50, n: 1 }, { min: 42, n: 2 }, { min: 36, n: 4 }, { min: 30, n: 6 }, { min: 0, n: 8 }]],
    ['C: 1-2-3-4-6', [{ min: 50, n: 1 }, { min: 42, n: 2 }, { min: 36, n: 3 }, { min: 30, n: 4 }, { min: 0, n: 6 }]],
    ['D: 1-3-5-7',   [{ min: 48, n: 1 }, { min: 38, n: 3 }, { min: 30, n: 5 }, { min: 0, n: 7 }]],
    ['E: 1-2-4-7',   [{ min: 48, n: 1 }, { min: 40, n: 2 }, { min: 33, n: 4 }, { min: 0, n: 7 }]],
    ['F: 1-2-5-8',   [{ min: 48, n: 1 }, { min: 40, n: 2 }, { min: 33, n: 5 }, { min: 0, n: 8 }]],
    ['G: 2-3-5-7',   [{ min: 48, n: 2 }, { min: 38, n: 3 }, { min: 30, n: 5 }, { min: 0, n: 7 }]],
    ['H: 1-2-3-6',   [{ min: 45, n: 1 }, { min: 38, n: 2 }, { min: 32, n: 3 }, { min: 0, n: 6 }]],
    ['I: 1-3-6-8',   [{ min: 48, n: 1 }, { min: 38, n: 3 }, { min: 30, n: 6 }, { min: 0, n: 8 }]],
    ['J: 1-2-3-7',   [{ min: 45, n: 1 }, { min: 38, n: 2 }, { min: 32, n: 3 }, { min: 0, n: 7 }]],
    // 閾値をずらしたバリエーション
    ['K: 1-2-3-5-7(低閾)', [{ min: 45, n: 1 }, { min: 38, n: 2 }, { min: 32, n: 3 }, { min: 26, n: 5 }, { min: 0, n: 7 }]],
    ['L: 1-2-3-5-7(高閾)', [{ min: 55, n: 1 }, { min: 46, n: 2 }, { min: 40, n: 3 }, { min: 34, n: 5 }, { min: 0, n: 7 }]],
    ['M: 1-2-4-6(低閾)',   [{ min: 45, n: 1 }, { min: 38, n: 2 }, { min: 30, n: 4 }, { min: 0, n: 6 }]],
    ['N: 1-2-4-8',   [{ min: 48, n: 1 }, { min: 40, n: 2 }, { min: 33, n: 4 }, { min: 0, n: 8 }]],
    ['O: 1-3-5-8',   [{ min: 48, n: 1 }, { min: 38, n: 3 }, { min: 30, n: 5 }, { min: 0, n: 8 }]],
    ['P: 2-3-5-8',   [{ min: 48, n: 2 }, { min: 38, n: 3 }, { min: 30, n: 5 }, { min: 0, n: 8 }]],
    ['Q: 1-2-6-8',   [{ min: 48, n: 1 }, { min: 40, n: 2 }, { min: 30, n: 6 }, { min: 0, n: 8 }]],
    ['R: 2-4-6-8',   [{ min: 48, n: 2 }, { min: 38, n: 4 }, { min: 30, n: 6 }, { min: 0, n: 8 }]],
  ];

  const budgetCaps = [15000, 30000, 50000, 75000, 100000];

  console.log(`\n🔍 グリッドサーチ: ${mappings.length}マッピング × ${budgetCaps.length}予算 = ${mappings.length * budgetCaps.length}パターン\n`);

  const results = [];
  for (const [name, thresholds] of mappings) {
    for (const cap of budgetCaps) {
      const r = runFlexH(dailyRaces, thresholds, cap);
      results.push({ name, cap, thresholds, ...r });
    }
  }

  // ═══════════════════════════════════════
  // 予算別ベスト
  // ═══════════════════════════════════════

  for (const cap of budgetCaps) {
    const capResults = results.filter(r => r.cap === cap);

    console.log('\n' + '═'.repeat(75));
    console.log(`💰 予算キャップ ¥${cap.toLocaleString()}`);
    console.log('═'.repeat(75));

    // WIN5的中数ベスト
    capResults.sort((a, b) => b.win5Hits - a.win5Hits || b.roi - a.roi);
    console.log('\n  🎯 WIN5的中数上位5:');
    console.log('  マッピング               | WIN5   | レッグ率 | 週平均     | 週中央     | 年利益         | ROI');
    console.log('  ' + '-'.repeat(95));
    for (const r of capResults.slice(0, 5)) {
      console.log(`  ${r.name.padEnd(25)} | ${String(r.win5Hits).padStart(2)}/${r.days}  | ${String(r.legRate).padStart(5)}%  | ¥${r.avgCost.toLocaleString().padStart(7)} | ¥${r.medianCost.toLocaleString().padStart(7)} | ¥${r.annualProfit.toLocaleString().padStart(12)} | ${r.roi}%`);
    }

    // 年利益ベスト
    capResults.sort((a, b) => b.annualProfit - a.annualProfit);
    console.log('\n  📈 年間利益上位5:');
    console.log('  マッピング               | WIN5   | レッグ率 | 週平均     | 週中央     | 年利益         | ROI');
    console.log('  ' + '-'.repeat(95));
    for (const r of capResults.slice(0, 5)) {
      console.log(`  ${r.name.padEnd(25)} | ${String(r.win5Hits).padStart(2)}/${r.days}  | ${String(r.legRate).padStart(5)}%  | ¥${r.avgCost.toLocaleString().padStart(7)} | ¥${r.medianCost.toLocaleString().padStart(7)} | ¥${r.annualProfit.toLocaleString().padStart(12)} | ${r.roi}%`);
    }
  }

  // ═══════════════════════════════════════
  // 全体ベスト & 横断比較
  // ═══════════════════════════════════════

  console.log('\n\n' + '═'.repeat(75));
  console.log('📊 予算別 最適Flex-H比較');
  console.log('═'.repeat(75));

  console.log('\n  予算キャップ | ベストマッピング            | WIN5   | レッグ率 | 週平均     | 年利益         | ROI');
  console.log('  ' + '-'.repeat(100));

  for (const cap of budgetCaps) {
    const capResults = results.filter(r => r.cap === cap);
    // 年利益ベスト
    capResults.sort((a, b) => b.annualProfit - a.annualProfit);
    const best = capResults[0];
    console.log(`  ¥${cap.toLocaleString().padStart(7)}   | ${best.name.padEnd(25)} | ${String(best.win5Hits).padStart(2)}/${best.days}  | ${String(best.legRate).padStart(5)}%  | ¥${best.avgCost.toLocaleString().padStart(7)} | ¥${best.annualProfit.toLocaleString().padStart(12)} | ${best.roi}%`);
  }

  // WIN5的中数ベスト版
  console.log('\n  予算キャップ | ベストマッピング            | WIN5   | レッグ率 | 週平均     | 年利益         | ROI');
  console.log('  ' + '-'.repeat(100));
  console.log('  (WIN5的中数ベスト)');

  for (const cap of budgetCaps) {
    const capResults = results.filter(r => r.cap === cap);
    capResults.sort((a, b) => b.win5Hits - a.win5Hits || b.annualProfit - a.annualProfit);
    const best = capResults[0];
    console.log(`  ¥${cap.toLocaleString().padStart(7)}   | ${best.name.padEnd(25)} | ${String(best.win5Hits).padStart(2)}/${best.days}  | ${String(best.legRate).padStart(5)}%  | ¥${best.avgCost.toLocaleString().padStart(7)} | ¥${best.annualProfit.toLocaleString().padStart(12)} | ${best.roi}%`);
  }

  // ═══════════════════════════════════════
  // ¥50Kキャップの最推奨モデル詳細
  // ═══════════════════════════════════════

  const target = results.filter(r => r.cap === 50000).sort((a, b) => b.win5Hits - a.win5Hits || b.annualProfit - a.annualProfit)[0];
  if (target) {
    console.log('\n\n' + '═'.repeat(75));
    console.log(`🏆 推奨モデル詳細 (¥50,000キャップ)`);
    console.log('═'.repeat(75));
    console.log(`\n  マッピング: ${target.name}`);
    console.log(`  スコア閾値:`);
    for (const t of target.thresholds) {
      console.log(`    スコア ≥ ${String(t.min).padStart(2)} → ${t.n}頭`);
    }
    console.log(`\n  WIN5的中: ${target.win5Hits}/${target.days}日 (${(target.win5Hits/target.days*100).toFixed(1)}%)`);
    console.log(`  レッグ的中率: ${target.legRate}%`);
    console.log(`  年間コスト: ¥${target.annualCost.toLocaleString()}`);
    console.log(`  年間利益: ¥${target.annualProfit.toLocaleString()}`);
    console.log(`  ROI: ${target.roi}%`);
    console.log(`  週平均コスト: ¥${target.avgCost.toLocaleString()}`);
    console.log(`  週中央値コスト: ¥${target.medianCost.toLocaleString()}`);
    console.log(`  週最大コスト: ¥${target.maxCost.toLocaleString()}`);
  }

  console.log('\n' + '═'.repeat(75));
}

main().catch(e => { console.error(e); process.exit(1); });
