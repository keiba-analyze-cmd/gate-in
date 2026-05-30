#!/usr/bin/env node
/**
 * WIN5 バックテスト v2
 * 
 * 改善点:
 *   - 難易度スコアをパーセンタイルで自動キャリブレーション
 *   - 年別・コース別・グレード別の詳細分析
 *   - Easy/Medium/Hard閾値のグリッドサーチ
 *   - ベストモデルの設定をJSONで出力（win5-predict.mjsで使用）
 * 
 * 使い方:
 *   node win5-backtest-v2.mjs
 *   node win5-backtest-v2.mjs --from 2022
 *   node win5-backtest-v2.mjs --verbose
 */

import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    from:    { type: 'string', default: '' },
    to:      { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
  },
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

// ── 馬選択モデル ──
const MODELS = {
  idm:     { name: 'IDMトップ',  fn: e => e.idm || 0 },
  hayate:  { name: 'ハヤテ式',   fn: e => (e.idm || 0) * 0.8 + (e.jockey_index || 0) * 0.2 },
  odds:    { name: 'オッズ順',   fn: e => -(e.base_odds || 999) },
  hibari:  { name: 'ヒバリ式',   fn: e => (e.ten_index||0)*0.2 + (e.agari_index||0)*0.3 + (e.position_index||0)*0.2 + (e.idm||0)*0.3 },
  composite: { name: '複合', fn: (e, all) => {
    const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
    const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
    return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length - rank + 1)/all.length*100)*0.3;
  }},
};

// ── 難易度シグナル ──
function calcSignals(entries) {
  if (!entries || entries.length < 2) return null;
  const idms = entries.map(e => e.idm || 0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds || 99).filter(o => o > 0).sort((a, b) => a - b);
  const n = entries.length;

  const idmSpread = idms[0] - idms[1];
  const idmTop3Spread = idms[0] - (idms[2] || idms[1]);
  const invOdds = odds.map(o => 1/o);
  const sumInv = invOdds.reduce((s, v) => s + v, 0);
  const hhi = invOdds.reduce((s, v) => s + (v/sumInv)**2, 0);

  return { idmSpread, idmTop3Spread, headCount: n, hhi, minOdds: odds[0] || 1, odds12gap: (odds[1]||0) - (odds[0]||0) };
}

// ── 難易度スコア（raw: 高い＝読みやすい = Easy） ──
function rawDifficultyScore(sig) {
  if (!sig) return 50;
  // 高い = 読みやすい（後でパーセンタイル反転して難易度に変換）
  const sSpread = Math.min(sig.idmSpread * 8, 100);
  const sHead = Math.max(0, (18 - sig.headCount) * 8);
  const sHhi = sig.hhi * 400;
  const sOdds = Math.max(0, (10 - sig.minOdds) * 12);
  const sGap = Math.min(sig.odds12gap * 8, 100);
  return sSpread * 0.25 + sHead * 0.20 + sHhi * 0.25 + sOdds * 0.15 + sGap * 0.15;
}

// ── 評価 ──
function evaluate(races, modelFn, easyPct, hardPct, allScores) {
  // パーセンタイル閾値
  const sorted = [...allScores].sort((a, b) => a - b);
  const easyThresh = sorted[Math.floor(sorted.length * easyPct / 100)] || 30;
  const hardThresh = sorted[Math.floor(sorted.length * hardPct / 100)] || 60;

  let legHits = 0, totalLegs = 0;
  const lvlCount = { Easy: 0, Medium: 0, Hard: 0 };
  const lvlHit = { Easy: 0, Medium: 0, Hard: 0 };
  const daily = new Map();
  const yearStats = {};

  for (const race of races) {
    totalLegs++;
    const entries = race.entries;
    if (!entries.length) continue;

    const score = rawDifficultyScore(calcSignals(entries));
    // 高スコア = 読みやすい = Easy
    const level = score >= hardThresh ? 'Easy' : score >= easyThresh ? 'Medium' : 'Hard';
    const n = level === 'Easy' ? 1 : level === 'Medium' ? 2 : 3;

    lvlCount[level]++;
    const scored = entries.map(e => ({ umaban: e.umaban, s: modelFn(e, entries) })).sort((a, b) => b.s - a.s);
    const cands = scored.slice(0, n).map(x => x.umaban);
    const hit = cands.includes(race.winning_umaban);
    if (hit) { legHits++; lvlHit[level]++; }

    const y = race.race_date.slice(0, 4);
    if (!yearStats[y]) yearStats[y] = { legs: 0, hits: 0 };
    yearStats[y].legs++; if (hit) yearStats[y].hits++;

    if (!daily.has(race.race_date)) daily.set(race.race_date, { legs: [], payout: race.payout });
    daily.get(race.race_date).legs.push({ hit, n, level });
  }

  let win5 = 0, cost = 0, payout = 0, days = 0;
  for (const [, d] of daily) {
    if (d.legs.length !== 5) continue;
    days++;
    const c = d.legs.reduce((p, l) => p * l.n, 1) * 100;
    cost += c;
    if (d.legs.every(l => l.hit) && d.payout) { win5++; payout += d.payout; }
  }

  return {
    totalLegs, legHits, legRate: +(legHits/totalLegs*100).toFixed(1),
    days, win5, win5Rate: days ? +(win5/days*100).toFixed(2) : 0,
    cost, payout, roi: cost ? Math.round(payout/cost*100) : 0,
    avgWeekCost: days ? Math.round(cost/days) : 0,
    lvlCount, lvlHit, yearStats,
    easyThresh: +easyThresh.toFixed(1), hardThresh: +hardThresh.toFixed(1),
  };
}

async function main() {
  console.log('\n🏇 WIN5 バックテスト v2\n');

  // ── データ読込 ──
  let f = '&jrdb_race_key=not.is.null';
  if (args.from) f += `&race_date=gte.${args.from}-01-01`;
  if (args.to) f += `&race_date=lte.${args.to}-12-31`;

  const legs = await queryAll(`win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&order=race_date.asc,leg_number.asc${f}`);
  console.log(`  WIN5レッグ: ${legs.length}`);

  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  const BATCH = 60;
  for (let i = 0; i < raceKeys.length; i += BATCH) {
    const batch = raceKeys.slice(i, i + BATCH);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,idm,jockey_index,base_odds,head_count,ten_index,agari_index,position_index,grade,distance,surface_code,course_name&race_key=in.(${batch.join(',')})`);
    for (const e of entries) {
      if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []);
      jrdb.get(e.race_key).push(e);
    }
    process.stdout.write(`  JRDB: ${Math.min(i+BATCH, raceKeys.length)}/${raceKeys.length}\r`);
  }

  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key) || [] })).filter(r => r.entries.length > 0);
  console.log(`\n  対象: ${races.length}レッグ (${[...new Set(races.map(r => r.race_date))].length}日)\n`);

  // ── 全レースの難易度スコア分布 ──
  const allScores = races.map(r => rawDifficultyScore(calcSignals(r.entries)));
  const pct = [10, 25, 33, 50, 66, 75, 90];
  const sortedScores = [...allScores].sort((a, b) => a - b);
  console.log('📊 難易度スコア分布:');
  console.log(`  min=${sortedScores[0]?.toFixed(1)} max=${sortedScores[sortedScores.length-1]?.toFixed(1)} mean=${(allScores.reduce((s,v)=>s+v,0)/allScores.length).toFixed(1)}`);
  for (const p of pct) {
    const idx = Math.floor(sortedScores.length * p / 100);
    console.log(`  P${p}: ${sortedScores[idx]?.toFixed(1)}`);
  }

  // ═══════════════════════════════════════════
  // グリッドサーチ
  // ═══════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('🔍 グリッドサーチ: モデル × Easy/Hard パーセンタイル');
  console.log('═'.repeat(70));

  const results = [];
  const pctPairs = [
    [25, 75], [30, 70], [33, 66], [40, 60], [20, 80], [25, 66], [33, 75], [40, 75],
  ];

  for (const [mk, m] of Object.entries(MODELS)) {
    for (const [ep, hp] of pctPairs) {
      const r = evaluate(races, m.fn, ep, hp, allScores);
      results.push({ model: mk, modelName: m.name, easyPct: ep, hardPct: hp, ...r });
    }
  }

  // ── ROI上位 ──
  results.sort((a, b) => b.roi - a.roi);
  console.log('\n🏆 ROI上位15:');
  console.log('  モデル     E%/H% | レッグ率 | WIN5   | 週コスト    | ROI     | E/M/H分布');
  console.log('  ' + '-'.repeat(85));
  for (const r of results.slice(0, 15)) {
    const dist = `${r.lvlCount.Easy}/${r.lvlCount.Medium}/${r.lvlCount.Hard}`;
    console.log(`  ${r.modelName.padEnd(7)} ${String(r.easyPct).padStart(2)}/${String(r.hardPct).padEnd(2)} | ${String(r.legRate).padStart(5)}%  | ${String(r.win5).padStart(2)}/${r.days}  | ¥${r.avgWeekCost.toLocaleString().padStart(8)} | ${String(r.roi).padStart(6)}% | ${dist}`);
  }

  // ── WIN5的中上位 ──
  results.sort((a, b) => b.win5 - a.win5 || b.roi - a.roi);
  console.log('\n🎯 WIN5的中数上位15:');
  console.log('  モデル     E%/H% | レッグ率 | WIN5   | 週コスト    | ROI     | E/M/H分布');
  console.log('  ' + '-'.repeat(85));
  for (const r of results.slice(0, 15)) {
    const dist = `${r.lvlCount.Easy}/${r.lvlCount.Medium}/${r.lvlCount.Hard}`;
    console.log(`  ${r.modelName.padEnd(7)} ${String(r.easyPct).padStart(2)}/${String(r.hardPct).padEnd(2)} | ${String(r.legRate).padStart(5)}%  | ${String(r.win5).padStart(2)}/${r.days}  | ¥${r.avgWeekCost.toLocaleString().padStart(8)} | ${String(r.roi).padStart(6)}% | ${dist}`);
  }

  // ═══════════════════════════════════════════
  // ベストモデルの詳細分析
  // ═══════════════════════════════════════════
  // WIN5的中数が最も多いモデルを選択
  const best = results[0];
  console.log('\n' + '═'.repeat(70));
  console.log(`📈 ベストモデル詳細: ${best.modelName} (E${best.easyPct}/H${best.hardPct})`);
  console.log('═'.repeat(70));

  console.log(`\n  レッグ的中率: ${best.legRate}%`);
  console.log(`  WIN5的中: ${best.win5}/${best.days} (${best.win5Rate}%)`);
  console.log(`  総コスト: ¥${best.cost.toLocaleString()} | 総配当: ¥${best.payout.toLocaleString()} | ROI: ${best.roi}%`);
  console.log(`  週平均コスト: ¥${best.avgWeekCost.toLocaleString()}`);
  console.log(`  閾値: Easy≥${best.hardThresh} Medium≥${best.easyThresh} Hard<${best.easyThresh}`);

  // 難易度別的中率
  console.log('\n  難易度別:');
  for (const lv of ['Easy', 'Medium', 'Hard']) {
    const cnt = best.lvlCount[lv];
    const hit = best.lvlHit[lv];
    const rate = cnt ? (hit/cnt*100).toFixed(1) : '-';
    console.log(`    ${lv.padEnd(6)}: ${String(cnt).padStart(5)}レッグ | 的中${String(hit).padStart(4)} | ${rate}%`);
  }

  // 年別
  console.log('\n  年別成績:');
  for (const [y, s] of Object.entries(best.yearStats).sort()) {
    console.log(`    ${y}: ${s.legs}レッグ 的中${s.hits} (${(s.hits/s.legs*100).toFixed(1)}%)`);
  }

  // ═══════════════════════════════════════════
  // コース別分析（ベストモデルで）
  // ═══════════════════════════════════════════
  console.log('\n  コース別的中率:');
  const courseStats = {};
  const bestModel = MODELS[best.model];

  for (const race of races) {
    const entries = race.entries;
    if (!entries.length) continue;
    const course = race.course_name || '不明';
    if (!courseStats[course]) courseStats[course] = { legs: 0, hits: 0 };
    courseStats[course].legs++;

    const sig = calcSignals(entries);
    const score = rawDifficultyScore(sig);
    const level = score >= best.hardThresh ? 'Easy' : score >= best.easyThresh ? 'Medium' : 'Hard';
    const n = level === 'Easy' ? 1 : level === 'Medium' ? 2 : 3;
    const scored = entries.map(e => ({ umaban: e.umaban, s: bestModel.fn(e, entries) })).sort((a, b) => b.s - a.s);
    const cands = scored.slice(0, n).map(x => x.umaban);
    if (cands.includes(race.winning_umaban)) courseStats[course].hits++;
  }

  const courseArr = Object.entries(courseStats).sort((a, b) => b[1].legs - a[1].legs);
  for (const [c, s] of courseArr) {
    console.log(`    ${c.padEnd(4)}: ${String(s.legs).padStart(4)}レッグ 的中${String(s.hits).padStart(3)} (${(s.hits/s.legs*100).toFixed(1)}%)`);
  }

  // ═══════════════════════════════════════════
  // ベストモデル設定をJSON出力
  // ═══════════════════════════════════════════
  const config = {
    model: best.model,
    modelName: best.modelName,
    easyPercentile: best.easyPct,
    hardPercentile: best.hardPct,
    easyThreshold: best.easyThresh,
    hardThreshold: best.hardThresh,
    stats: {
      legHitRate: best.legRate,
      win5Hits: best.win5,
      win5Days: best.days,
      roi: best.roi,
      avgWeeklyCost: best.avgWeekCost,
    },
    generatedAt: new Date().toISOString(),
  };

  const outDir = path.join(process.cwd(), 'win5-data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const configFile = path.join(outDir, 'best-model-config.json');
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  console.log(`\n💾 ベストモデル設定: ${configFile}`);

  console.log('\n' + '═'.repeat(70));
  console.log('✅ 完了。次: node win5-predict.mjs で週次予想生成');
  console.log('═'.repeat(70));
}

main().catch(e => { console.error(e); process.exit(1); });
