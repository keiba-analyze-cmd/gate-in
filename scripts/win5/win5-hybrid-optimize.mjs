#!/usr/bin/env node
/**
 * WIN5 本命+穴 ハイブリッド × Flex-H 最適化
 * 
 * 各レッグで「複合トップN頭 + カザン穴馬M頭」を難易度に応じて配分。
 * 予算キャップ内で最適な(N,M)×難易度マッピングを探索。
 */

import { parseArgs } from 'util';
const { values: args } = parseArgs({ options: { verbose: { type: 'boolean', default: false } } });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 環境変数未設定'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function queryAll(p, ps = 1000) {
  let all = [], off = 0;
  while (true) {
    const sep = p.includes('?') ? '&' : '?';
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}${sep}limit=${ps}&offset=${off}`, { headers });
    if (!r.ok) throw new Error(await r.text());
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

function kazanScore(e, all) {
  const idmSorted = [...all].sort((a, b) => (b.idm||0) - (a.idm||0));
  const idmRank = idmSorted.findIndex(x => x.umaban === e.umaban) + 1;
  const odds = e.base_odds || 1;
  if (idmRank <= 2 || idmRank > 8) return 0;
  if (odds < 5) return 0;
  return (e.idm || 0) * Math.log(odds);
}

function calcDifficulty(entries) {
  if (!entries || entries.length < 2) return 50;
  const idms = entries.map(e => e.idm||0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds||99).filter(o => o > 0).sort((a, b) => a - b);
  const invOdds = odds.map(o => 1/o);
  const sumInv = invOdds.reduce((s, v) => s + v, 0);
  const hhi = invOdds.reduce((s, v) => s + (v/sumInv)**2, 0);
  return Math.min((idms[0]-idms[1])*8,100)*0.25 + Math.max(0,(18-entries.length)*8)*0.20
    + hhi*400*0.25 + Math.max(0,(10-(odds[0]||1))*12)*0.15 + Math.min(((odds[1]||0)-(odds[0]||0))*8,100)*0.15;
}

// 各レッグの候補選出: 本命H頭 + 穴A頭（重複除外）
function selectCandidates(entries, honmeiN, anaN) {
  const compScored = entries.map(e => ({ umaban: e.umaban, s: compositeScore(e, entries) })).sort((a, b) => b.s - a.s);
  const kazScored = entries.map(e => ({ umaban: e.umaban, s: kazanScore(e, entries) })).sort((a, b) => b.s - a.s);

  const honmeiSet = new Set(compScored.slice(0, honmeiN).map(x => x.umaban));
  const anaFiltered = kazScored.filter(x => x.s > 0 && !honmeiSet.has(x.umaban));
  const anaPicks = anaFiltered.slice(0, anaN).map(x => x.umaban);

  return [...honmeiSet, ...anaPicks];
}

// バックテスト実行
function runBacktest(dailyRaces, mapping, budgetCap) {
  // mapping: [{minScore, honmei, ana}] 降順（高スコア=Easy→少候補）
  let totalLegs = 0, legHits = 0, win5Hits = 0, days = 0;
  let totalCost = 0, totalPayout = 0;
  const hitPayouts = [];

  for (const [, dayLegs] of dailyRaces) {
    if (dayLegs.length !== 5) continue;
    days++;

    // 各レッグの候補数計算
    const legPlans = dayLegs.map(leg => {
      const ds = calcDifficulty(leg.entries);
      let honmei = 2, ana = 1; // デフォルト
      for (const m of mapping) {
        if (ds >= m.minScore) { honmei = m.honmei; ana = m.ana; break; }
      }
      const cands = selectCandidates(leg.entries, honmei, ana);
      return { leg, cands, n: cands.length, ds };
    });

    // 予算調整
    let combos = legPlans.reduce((p, l) => p * l.n, 1);
    let cost = combos * 100;
    if (cost > budgetCap) {
      // 最も候補が多いレッグから穴馬を削減
      while (cost > budgetCap) {
        let maxN = 0, maxIdx = -1;
        for (let i = 0; i < legPlans.length; i++) {
          if (legPlans[i].n > maxN) { maxN = legPlans[i].n; maxIdx = i; }
        }
        if (maxN <= 1) break;
        legPlans[maxIdx].n--;
        legPlans[maxIdx].cands = legPlans[maxIdx].cands.slice(0, legPlans[maxIdx].n);
        combos = legPlans.reduce((p, l) => p * l.n, 1);
        cost = combos * 100;
      }
    }

    totalCost += cost;
    let dayHits = 0;
    for (const lp of legPlans) {
      totalLegs++;
      if (lp.cands.includes(lp.leg.winning_umaban)) { legHits++; dayHits++; }
    }
    if (dayHits === 5 && dayLegs[0].payout) {
      win5Hits++;
      totalPayout += dayLegs[0].payout;
      hitPayouts.push(dayLegs[0].payout);
    }
  }

  const avgHitPayout = hitPayouts.length ? Math.round(hitPayouts.reduce((s,v)=>s+v,0)/hitPayouts.length) : 0;
  const avgCost = days ? Math.round(totalCost / days) : 0;
  return {
    days, win5Hits, totalLegs, legHits,
    legRate: +(legHits/totalLegs*100).toFixed(1),
    totalCost, totalPayout,
    roi: totalCost > 0 ? Math.round(totalPayout / totalCost * 100) : 0,
    avgCost, avgHitPayout,
    profit: totalPayout - totalCost,
  };
}

async function main() {
  console.log('\n🏇 WIN5 本命+穴 × Flex-H 最適化\n');

  // データ読込
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
  console.log(`\n  対象: ${races.length}レッグ (${[...daily].filter(([,l])=>l.length===5).length}日)\n`);

  // ═══════════════════════════════════
  // 難易度別配分のグリッドサーチ
  // ═══════════════════════════════════

  // 配分パターン: [Easy, MedEasy, MedHard, Hard] それぞれ {honmei, ana}
  const allocPatterns = [
    // パターン名, [Easy(≥48), MedEasy(≥40), MedHard(≥33), Hard(<33)]
    ['A: 固定 本2穴1',     [{h:2,a:1},{h:2,a:1},{h:2,a:1},{h:2,a:1}]],
    ['B: 固定 本3穴1',     [{h:3,a:1},{h:3,a:1},{h:3,a:1},{h:3,a:1}]],
    ['C: E少H多',         [{h:1,a:0},{h:2,a:0},{h:2,a:1},{h:2,a:2}]],
    ['D: E本命H穴多',      [{h:1,a:0},{h:2,a:1},{h:2,a:1},{h:2,a:2}]],
    ['E: E本命H穴3',       [{h:1,a:0},{h:2,a:0},{h:2,a:1},{h:2,a:3}]],
    ['F: 全レッグ穴1',      [{h:1,a:1},{h:2,a:1},{h:2,a:1},{h:3,a:1}]],
    ['G: E絞りH厚め',      [{h:1,a:0},{h:1,a:1},{h:2,a:1},{h:3,a:2}]],
    ['H: 本命重視+穴少',    [{h:2,a:0},{h:2,a:0},{h:3,a:1},{h:3,a:1}]],
    ['I: 穴馬重視',         [{h:1,a:1},{h:1,a:1},{h:2,a:2},{h:2,a:3}]],
    ['J: バランス',         [{h:1,a:0},{h:2,a:1},{h:2,a:2},{h:3,a:2}]],
    ['K: Easy0穴Hard穴多',  [{h:1,a:0},{h:2,a:0},{h:2,a:2},{h:3,a:3}]],
    ['L: 固定 本2穴2',     [{h:2,a:2},{h:2,a:2},{h:2,a:2},{h:2,a:2}]],
    ['M: E狭H広穴2',       [{h:1,a:0},{h:1,a:1},{h:2,a:2},{h:3,a:3}]],
    ['N: 全穴1+H穴2',      [{h:1,a:1},{h:2,a:1},{h:2,a:1},{h:2,a:2}]],
    ['O: 本3穴漸増',        [{h:3,a:0},{h:3,a:1},{h:3,a:1},{h:3,a:2}]],
    ['P: E本1穴1 H本2穴2', [{h:1,a:1},{h:1,a:1},{h:2,a:2},{h:2,a:2}]],
  ];

  const budgetCaps = [15000, 25000, 30000, 50000, 75000, 100000];

  console.log(`🔍 グリッドサーチ: ${allocPatterns.length}パターン × ${budgetCaps.length}予算 = ${allocPatterns.length * budgetCaps.length}通り\n`);

  const results = [];
  for (const [name, allocs] of allocPatterns) {
    const mapping = [
      { minScore: 48, honmei: allocs[0].h, ana: allocs[0].a },
      { minScore: 40, honmei: allocs[1].h, ana: allocs[1].a },
      { minScore: 33, honmei: allocs[2].h, ana: allocs[2].a },
      { minScore: 0,  honmei: allocs[3].h, ana: allocs[3].a },
    ];

    for (const cap of budgetCaps) {
      const r = runBacktest(daily, mapping, cap);
      results.push({ name, cap, ...r });
    }
  }

  // ═══════════════════════════════════
  // 結果表示
  // ═══════════════════════════════════

  for (const cap of budgetCaps) {
    const capResults = results.filter(r => r.cap === cap);
    console.log('\n' + '═'.repeat(75));
    console.log(`💰 予算キャップ ¥${cap.toLocaleString()}`);
    console.log('═'.repeat(75));

    // ROI順
    capResults.sort((a, b) => b.roi - a.roi);
    console.log('\n  🏆 ROI上位5:');
    console.log('  パターン             | WIN5 | レッグ率 | 週平均     | ROI    | 的中時配当     | 利益');
    console.log('  ' + '-'.repeat(90));
    for (const r of capResults.slice(0, 5)) {
      console.log(`  ${r.name.padEnd(20)} | ${String(r.win5Hits).padStart(3)}  | ${String(r.legRate).padStart(5)}%  | ¥${r.avgCost.toLocaleString().padStart(7)} | ${String(r.roi).padStart(5)}% | ¥${r.avgHitPayout.toLocaleString().padStart(12)} | ¥${r.profit.toLocaleString()}`);
    }

    // WIN5的中数順
    capResults.sort((a, b) => b.win5Hits - a.win5Hits || b.roi - a.roi);
    console.log('\n  🎯 WIN5的中数上位5:');
    console.log('  パターン             | WIN5 | レッグ率 | 週平均     | ROI    | 的中時配当     | 利益');
    console.log('  ' + '-'.repeat(90));
    for (const r of capResults.slice(0, 5)) {
      console.log(`  ${r.name.padEnd(20)} | ${String(r.win5Hits).padStart(3)}  | ${String(r.legRate).padStart(5)}%  | ¥${r.avgCost.toLocaleString().padStart(7)} | ${String(r.roi).padStart(5)}% | ¥${r.avgHitPayout.toLocaleString().padStart(12)} | ¥${r.profit.toLocaleString()}`);
    }

    // 利益順
    capResults.sort((a, b) => b.profit - a.profit);
    console.log('\n  📈 利益上位3:');
    for (const r of capResults.slice(0, 3)) {
      console.log(`  ${r.name.padEnd(20)} | WIN5 ${r.win5Hits} | ROI ${r.roi}% | 利益 ¥${r.profit.toLocaleString()} | 的中時 ¥${r.avgHitPayout.toLocaleString()}`);
    }
  }

  // ═══════════════════════════════════
  // 横断比較
  // ═══════════════════════════════════
  console.log('\n\n' + '═'.repeat(75));
  console.log('📊 予算別 最適戦略 横断比較');
  console.log('═'.repeat(75));

  console.log('\n  [ROIベスト]');
  console.log('  予算キャップ | 戦略                | WIN5 | ROI    | 利益             | 的中時配当');
  console.log('  ' + '-'.repeat(90));
  for (const cap of budgetCaps) {
    const best = results.filter(r => r.cap === cap).sort((a, b) => b.roi - a.roi)[0];
    if (best) console.log(`  ¥${cap.toLocaleString().padStart(7)}   | ${best.name.padEnd(18)} | ${String(best.win5Hits).padStart(3)}  | ${String(best.roi).padStart(5)}% | ¥${best.profit.toLocaleString().padStart(14)} | ¥${best.avgHitPayout.toLocaleString()}`);
  }

  console.log('\n  [利益ベスト]');
  console.log('  予算キャップ | 戦略                | WIN5 | ROI    | 利益             | 的中時配当');
  console.log('  ' + '-'.repeat(90));
  for (const cap of budgetCaps) {
    const best = results.filter(r => r.cap === cap).sort((a, b) => b.profit - a.profit)[0];
    if (best) console.log(`  ¥${cap.toLocaleString().padStart(7)}   | ${best.name.padEnd(18)} | ${String(best.win5Hits).padStart(3)}  | ${String(best.roi).padStart(5)}% | ¥${best.profit.toLocaleString().padStart(14)} | ¥${best.avgHitPayout.toLocaleString()}`);
  }

  // ベストモデル詳細
  const overallBest = results.filter(r => r.profit > 0).sort((a, b) => b.roi - a.roi)[0];
  if (overallBest) {
    console.log('\n' + '═'.repeat(75));
    console.log(`🏆 総合推奨: ${overallBest.name} @ ¥${overallBest.cap.toLocaleString()}キャップ`);
    console.log('═'.repeat(75));
    console.log(`  WIN5的中: ${overallBest.win5Hits}回 / ${overallBest.days}日`);
    console.log(`  レッグ的中率: ${overallBest.legRate}%`);
    console.log(`  ROI: ${overallBest.roi}%`);
    console.log(`  利益: ¥${overallBest.profit.toLocaleString()}`);
    console.log(`  週平均コスト: ¥${overallBest.avgCost.toLocaleString()}`);
    console.log(`  的中時平均配当: ¥${overallBest.avgHitPayout.toLocaleString()}`);
  }

  console.log('\n' + '═'.repeat(75));
}

main().catch(e => { console.error(e); process.exit(1); });
