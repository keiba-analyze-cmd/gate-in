#!/usr/bin/env node
/**
 * WIN5 バックテスト — Phase 2+3 統合
 * 
 * 難易度スコア計算 → 候補馬選出 → 的中率・ROI算出
 * 
 * 使い方:
 *   node win5-backtest.mjs                     # 全モデルテスト
 *   node win5-backtest.mjs --model idm         # IDMモデルのみ
 *   node win5-backtest.mjs --from 2022         # 2022年以降
 *   node win5-backtest.mjs --verbose           # 詳細ログ
 */

import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    model:   { type: 'string', default: 'all' },
    from:    { type: 'string', default: '' },
    to:      { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
  },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 環境変数を設定してください');
  process.exit(1);
}

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function queryAll(path, pageSize = 1000) {
  let all = [];
  let offset = 0;
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${sep}limit=${pageSize}&offset=${offset}`, { headers });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const data = await res.json();
    all = all.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// =============================================
// 難易度シグナル計算
// =============================================

function calcDifficultySignals(entries) {
  if (!entries || entries.length === 0) return null;

  const idms = entries.map(e => e.idm || 0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds || 99).filter(o => o > 0);
  const n = entries.length;

  // 1. IDMスプレッド（1位 - 2位）
  const idmSpread = idms.length >= 2 ? idms[0] - idms[1] : 0;

  // 2. IDMトップ集中度（1位のIDMが全体平均からどれだけ離れているか）
  const idmMean = idms.reduce((s, v) => s + v, 0) / idms.length;
  const idmDominance = idms[0] - idmMean;

  // 3. 出走頭数（多い＝難しい）
  const headCount = n;

  // 4. オッズ集中度（HHI: ハーフィンダール指数）
  // 各馬の勝率推定 = 1/odds、正規化してHHI計算
  const invOdds = odds.map(o => 1 / o);
  const sumInv = invOdds.reduce((s, v) => s + v, 0);
  const shares = invOdds.map(v => v / sumInv);
  const hhi = shares.reduce((s, v) => s + v * v, 0);
  // HHI: 0〜1、高い=1頭に集中=読みやすい

  // 5. 1番人気オッズ（低い＝読みやすい）
  const minOdds = Math.min(...odds);

  // 6. 上位3頭のオッズ差
  const sortedOdds = [...odds].sort((a, b) => a - b);
  const odds12gap = sortedOdds.length >= 2 ? sortedOdds[1] - sortedOdds[0] : 0;
  const odds13gap = sortedOdds.length >= 3 ? sortedOdds[2] - sortedOdds[0] : 0;

  return {
    idmSpread,
    idmDominance,
    headCount,
    hhi,
    minOdds,
    odds12gap,
    odds13gap,
  };
}

// =============================================
// 難易度スコア計算（0-100、高い=難しい）
// =============================================

function calcDifficultyScore(signals, weights) {
  if (!signals) return 50; // デフォルト: Medium

  const {
    wIdmSpread = 0.25,
    wHeadCount = 0.20,
    wHhi = 0.25,
    wMinOdds = 0.15,
    wOddsGap = 0.15,
  } = weights;

  // 各シグナルを0-100にスケーリング（高い=難しい）
  const sIdmSpread = Math.max(0, 100 - signals.idmSpread * 10);  // spread大→easy→低スコア
  const sHeadCount = Math.min(100, (signals.headCount - 6) * 7);  // 6頭=0, 18頭=84
  const sHhi = Math.max(0, 100 - signals.hhi * 300);              // HHI高→easy→低スコア
  const sMinOdds = Math.min(100, signals.minOdds * 15);           // 人気馬odds低→easy
  const sOddsGap = Math.max(0, 100 - signals.odds12gap * 10);    // 差大→easy

  const score =
    wIdmSpread * sIdmSpread +
    wHeadCount * sHeadCount +
    wHhi * sHhi +
    wMinOdds * sMinOdds +
    wOddsGap * sOddsGap;

  return Math.max(0, Math.min(100, score));
}

function difficultyLevel(score, thresholds = { easy: 35, hard: 65 }) {
  if (score <= thresholds.easy) return 'Easy';
  if (score >= thresholds.hard) return 'Hard';
  return 'Medium';
}

function candidateCount(level) {
  return level === 'Easy' ? 1 : level === 'Medium' ? 2 : 3;
}

// =============================================
// 馬選択モデル
// =============================================

const MODELS = {
  // Model 1: IDMトップ
  idm: {
    name: 'IDMトップ',
    desc: 'IDM順でトップN頭を選択',
    score: (e) => e.idm || 0,
  },

  // Model 2: ハヤテ式（IDM×0.8 + 騎手×0.2）
  hayate: {
    name: 'ハヤテ式',
    desc: 'IDM×0.8 + 騎手指数×0.2',
    score: (e) => (e.idm || 0) * 0.8 + (e.jockey_index || 0) * 0.2,
  },

  // Model 3: オッズ順（人気順）
  odds: {
    name: 'オッズ順',
    desc: 'base_odds昇順（人気順）',
    score: (e) => -(e.base_odds || 999), // 低オッズ＝高スコア
  },

  // Model 4: ヒバリ式（テン+上がり+位置+IDM）
  hibari: {
    name: 'ヒバリ式',
    desc: 'テン×0.2 + 上がり×0.3 + 位置×0.2 + IDM×0.3',
    score: (e) => {
      const ten = e.ten_index || 0;
      const agari = e.agari_index || 0;
      const pos = e.position_index || 0;
      const idm = e.idm || 0;
      return ten * 0.2 + agari * 0.3 + pos * 0.2 + idm * 0.3;
    },
  },

  // Model 5: 複合（IDM + 騎手 + オッズ）
  composite: {
    name: '複合',
    desc: 'IDM×0.5 + 騎手×0.2 + オッズ順位×0.3',
    score: (e, entries) => {
      const idm = e.idm || 0;
      const jockey = e.jockey_index || 0;
      // オッズ順位をスコア化（1位=head_count, 最下位=1）
      const sortedByOdds = [...entries].sort((a, b) => (a.base_odds || 999) - (b.base_odds || 999));
      const oddsRank = sortedByOdds.findIndex(x => x.umaban === e.umaban) + 1;
      const oddsScore = (entries.length - oddsRank + 1) / entries.length * 100;
      return idm * 0.5 + jockey * 0.2 + oddsScore * 0.3;
    },
  },

  // Model 6: IDM + オッズ逆張り（穴対応）
  idm_value: {
    name: 'IDM価値',
    desc: 'IDM上位だがオッズが割安な馬を重視',
    score: (e) => {
      const idm = e.idm || 0;
      const odds = e.base_odds || 99;
      // IDMが高くてオッズも高い＝お得
      return idm + Math.log(Math.max(odds, 1)) * 5;
    },
  },
};

// =============================================
// 固定候補数モデル（難易度スコアなし）
// =============================================

function evaluateFixedModel(modelName, modelFn, races, fixedN) {
  let legHits = 0;
  let totalLegs = 0;

  const dailyResults = new Map(); // date → {legs: [{hit, candidates}], payout}

  for (const race of races) {
    totalLegs++;
    const entries = race.entries;
    if (!entries || entries.length === 0) continue;

    // スコア計算＆ソート
    const scored = entries.map(e => ({
      umaban: e.umaban,
      score: modelFn(e, entries),
    })).sort((a, b) => b.score - a.score);

    const candidates = scored.slice(0, fixedN).map(s => s.umaban);
    const hit = candidates.includes(race.winning_umaban);
    if (hit) legHits++;

    // 日別集計
    if (!dailyResults.has(race.race_date)) {
      dailyResults.set(race.race_date, { legs: [], payout: race.payout });
    }
    dailyResults.get(race.race_date).legs.push({ hit, n: fixedN });
  }

  // WIN5的中: 全5レッグ的中
  let win5Hits = 0;
  let totalDays = 0;
  let totalCost = 0;
  let totalPayout = 0;

  for (const [date, day] of dailyResults) {
    if (day.legs.length !== 5) continue;
    totalDays++;

    const allHit = day.legs.every(l => l.hit);
    const combos = day.legs.reduce((p, l) => p * l.n, 1);
    const cost = combos * 100;
    totalCost += cost;

    if (allHit && day.payout) {
      win5Hits++;
      totalPayout += day.payout;
    }
  }

  return {
    model: modelName,
    fixedN,
    totalLegs,
    legHits,
    legHitRate: (legHits / totalLegs * 100).toFixed(1),
    totalDays,
    win5Hits,
    win5HitRate: totalDays > 0 ? (win5Hits / totalDays * 100).toFixed(1) : '0',
    totalCost,
    totalPayout,
    roi: totalCost > 0 ? (totalPayout / totalCost * 100).toFixed(0) : '0',
  };
}

// =============================================
// 難易度適応モデル
// =============================================

function evaluateAdaptiveModel(modelName, modelFn, races, weights, thresholds) {
  let legHits = 0;
  let totalLegs = 0;
  const levelCounts = { Easy: 0, Medium: 0, Hard: 0 };
  const levelHits = { Easy: 0, Medium: 0, Hard: 0 };

  const dailyResults = new Map();

  for (const race of races) {
    totalLegs++;
    const entries = race.entries;
    if (!entries || entries.length === 0) continue;

    // 難易度計算
    const signals = calcDifficultySignals(entries);
    const dScore = calcDifficultyScore(signals, weights);
    const level = difficultyLevel(dScore, thresholds);
    const n = candidateCount(level);

    levelCounts[level]++;

    // 馬選択
    const scored = entries.map(e => ({
      umaban: e.umaban,
      score: modelFn(e, entries),
    })).sort((a, b) => b.score - a.score);

    const candidates = scored.slice(0, n).map(s => s.umaban);
    const hit = candidates.includes(race.winning_umaban);
    if (hit) { legHits++; levelHits[level]++; }

    if (!dailyResults.has(race.race_date)) {
      dailyResults.set(race.race_date, { legs: [], payout: race.payout });
    }
    dailyResults.get(race.race_date).legs.push({ hit, n, level, dScore });
  }

  let win5Hits = 0;
  let totalDays = 0;
  let totalCost = 0;
  let totalPayout = 0;

  for (const [date, day] of dailyResults) {
    if (day.legs.length !== 5) continue;
    totalDays++;

    const allHit = day.legs.every(l => l.hit);
    const combos = day.legs.reduce((p, l) => p * l.n, 1);
    const cost = combos * 100;
    totalCost += cost;

    if (allHit && day.payout) {
      win5Hits++;
      totalPayout += day.payout;
    }
  }

  const avgCostPerWeek = totalDays > 0 ? Math.round(totalCost / totalDays) : 0;

  return {
    model: modelName + ' (adaptive)',
    totalLegs,
    legHits,
    legHitRate: (legHits / totalLegs * 100).toFixed(1),
    totalDays,
    win5Hits,
    win5HitRate: totalDays > 0 ? (win5Hits / totalDays * 100).toFixed(1) : '0',
    totalCost,
    totalPayout,
    roi: totalCost > 0 ? (totalPayout / totalCost * 100).toFixed(0) : '0',
    avgCostPerWeek,
    levelCounts,
    levelHits,
    levelHitRates: {
      Easy: levelCounts.Easy > 0 ? (levelHits.Easy / levelCounts.Easy * 100).toFixed(1) : '-',
      Medium: levelCounts.Medium > 0 ? (levelHits.Medium / levelCounts.Medium * 100).toFixed(1) : '-',
      Hard: levelCounts.Hard > 0 ? (levelHits.Hard / levelCounts.Hard * 100).toFixed(1) : '-',
    },
  };
}

// =============================================
// メイン
// =============================================

async function main() {
  console.log('\n🏇 WIN5 バックテスト\n');

  // ── データ読み込み ──
  console.log('📡 データ読み込み中...');

  let dateFilter = '&jrdb_race_key=not.is.null';
  if (args.from) dateFilter += `&race_date=gte.${args.from}-01-01`;
  if (args.to) dateFilter += `&race_date=lte.${args.to}-12-31`;

  const win5Legs = await queryAll(
    `win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&order=race_date.asc,leg_number.asc${dateFilter}`
  );
  console.log(`  WIN5レッグ: ${win5Legs.length}`);

  // JRDBデータをバッチ読み込み
  const raceKeys = [...new Set(win5Legs.map(l => l.jrdb_race_key))];
  console.log(`  ユニークレース: ${raceKeys.length}`);

  const jrdbData = new Map(); // race_key → entries[]
  const BATCH = 60;
  for (let i = 0; i < raceKeys.length; i += BATCH) {
    const batch = raceKeys.slice(i, i + BATCH);
    const inClause = batch.join(',');
    const entries = await queryAll(
      `jrdb_race_entries?select=race_key,umaban,idm,jockey_index,base_odds,head_count,ten_index,agari_index,position_index,sire_name&race_key=in.(${inClause})&order=race_key.asc,umaban.asc`
    );
    for (const e of entries) {
      if (!jrdbData.has(e.race_key)) jrdbData.set(e.race_key, []);
      jrdbData.get(e.race_key).push(e);
    }
    process.stdout.write(`  JRDB読込: ${Math.min(i + BATCH, raceKeys.length)}/${raceKeys.length}\r`);
  }
  console.log(`  JRDB読込完了: ${jrdbData.size}レース\n`);

  // レースデータ構築
  const races = win5Legs.map(leg => ({
    ...leg,
    entries: jrdbData.get(leg.jrdb_race_key) || [],
  })).filter(r => r.entries.length > 0);

  console.log(`📊 バックテスト対象: ${races.length}レッグ (${[...new Set(races.map(r => r.race_date))].length}日分)\n`);

  // ── モデル選択 ──
  const targetModels = args.model === 'all' 
    ? Object.keys(MODELS) 
    : [args.model];

  // =============================================
  // テスト1: 固定候補数（ベースライン）
  // =============================================
  console.log('═'.repeat(70));
  console.log('📋 テスト1: 固定候補数モデル（ベースライン）');
  console.log('═'.repeat(70));

  const baseResults = [];
  for (const modelKey of targetModels) {
    const model = MODELS[modelKey];
    if (!model) continue;
    for (const n of [1, 2, 3]) {
      const result = evaluateFixedModel(`${model.name}(${n}頭)`, model.score, races, n);
      baseResults.push(result);
    }
  }

  // 表示
  console.log('\n  モデル              | レッグ的中率 | WIN5的中 | 日数  | 総コスト      | 総配当          | ROI');
  console.log('  ' + '-'.repeat(95));
  for (const r of baseResults) {
    const name = r.model.padEnd(18);
    console.log(`  ${name} | ${r.legHitRate.padStart(7)}%   | ${String(r.win5Hits).padStart(3)}/${r.totalDays}  | ${String(r.totalDays).padStart(4)}  | ¥${r.totalCost.toLocaleString().padStart(12)} | ¥${r.totalPayout.toLocaleString().padStart(14)} | ${r.roi}%`);
  }

  // =============================================
  // テスト2: 難易度適応モデル
  // =============================================
  console.log('\n' + '═'.repeat(70));
  console.log('📋 テスト2: 難易度適応モデル（Easy=1頭, Med=2頭, Hard=3頭）');
  console.log('═'.repeat(70));

  // 複数の重み設定をテスト
  const weightConfigs = [
    { name: 'バランス',     wIdmSpread: 0.25, wHeadCount: 0.20, wHhi: 0.25, wMinOdds: 0.15, wOddsGap: 0.15 },
    { name: 'IDM重視',      wIdmSpread: 0.40, wHeadCount: 0.15, wHhi: 0.20, wMinOdds: 0.15, wOddsGap: 0.10 },
    { name: 'オッズ重視',   wIdmSpread: 0.15, wHeadCount: 0.15, wHhi: 0.35, wMinOdds: 0.25, wOddsGap: 0.10 },
    { name: '頭数重視',     wIdmSpread: 0.20, wHeadCount: 0.35, wHhi: 0.20, wMinOdds: 0.10, wOddsGap: 0.15 },
  ];

  const thresholdConfigs = [
    { name: '標準',     easy: 35, hard: 65 },
    { name: '厳格Easy', easy: 25, hard: 65 },
    { name: '緩いEasy', easy: 45, hard: 65 },
    { name: '広いMed',  easy: 30, hard: 70 },
  ];

  const adaptiveResults = [];
  for (const modelKey of targetModels) {
    const model = MODELS[modelKey];
    if (!model) continue;

    for (const wc of weightConfigs) {
      for (const tc of thresholdConfigs) {
        const result = evaluateAdaptiveModel(
          `${model.name}/${wc.name}/${tc.name}`,
          model.score,
          races,
          wc,
          tc,
        );
        adaptiveResults.push({ ...result, weightConfig: wc.name, thresholdConfig: tc.name, modelKey });
      }
    }
  }

  // ベスト結果を表示
  // ROI順でソート
  adaptiveResults.sort((a, b) => parseInt(b.roi) - parseInt(a.roi));

  console.log('\n  🏆 ROI上位10モデル:');
  console.log('  モデル                              | レッグ率 | WIN5 | 平均コスト/週 | 総コスト      | ROI');
  console.log('  ' + '-'.repeat(100));
  for (const r of adaptiveResults.slice(0, 10)) {
    const name = r.model.slice(0, 36).padEnd(36);
    console.log(`  ${name} | ${r.legHitRate.padStart(5)}%  | ${String(r.win5Hits).padStart(2)}/${r.totalDays} | ¥${r.avgCostPerWeek.toLocaleString().padStart(10)} | ¥${r.totalCost.toLocaleString().padStart(12)} | ${r.roi}%`);
  }

  // WIN5的中数順
  adaptiveResults.sort((a, b) => b.win5Hits - a.win5Hits || parseInt(b.roi) - parseInt(a.roi));
  console.log('\n  🎯 WIN5的中数上位10モデル:');
  console.log('  モデル                              | レッグ率 | WIN5 | 平均コスト/週 | 総コスト      | ROI');
  console.log('  ' + '-'.repeat(100));
  for (const r of adaptiveResults.slice(0, 10)) {
    const name = r.model.slice(0, 36).padEnd(36);
    console.log(`  ${name} | ${r.legHitRate.padStart(5)}%  | ${String(r.win5Hits).padStart(2)}/${r.totalDays} | ¥${r.avgCostPerWeek.toLocaleString().padStart(10)} | ¥${r.totalCost.toLocaleString().padStart(12)} | ${r.roi}%`);
  }

  // ベストモデルの難易度分布
  if (adaptiveResults.length > 0) {
    const best = adaptiveResults[0];
    console.log(`\n  📊 ベストモデル「${best.model}」の難易度分布:`);
    console.log(`    Easy:   ${best.levelCounts.Easy}レッグ (的中率 ${best.levelHitRates.Easy}%)`);
    console.log(`    Medium: ${best.levelCounts.Medium}レッグ (的中率 ${best.levelHitRates.Medium}%)`);
    console.log(`    Hard:   ${best.levelCounts.Hard}レッグ (的中率 ${best.levelHitRates.Hard}%)`);
  }

  // =============================================
  // サマリー
  // =============================================
  console.log('\n' + '═'.repeat(70));
  console.log('📈 総合サマリー');
  console.log('═'.repeat(70));

  // 固定2頭のベスト
  const bestFixed2 = baseResults.filter(r => r.fixedN === 2).sort((a, b) => parseInt(b.roi) - parseInt(a.roi))[0];
  if (bestFixed2) {
    console.log(`\n  固定2頭ベスト: ${bestFixed2.model}`);
    console.log(`    レッグ的中率: ${bestFixed2.legHitRate}% | WIN5: ${bestFixed2.win5Hits}/${bestFixed2.totalDays} | ROI: ${bestFixed2.roi}%`);
  }

  // 適応モデルベスト（ROI）
  const bestAdaptive = adaptiveResults.sort((a, b) => parseInt(b.roi) - parseInt(a.roi))[0];
  if (bestAdaptive) {
    console.log(`\n  適応モデルベスト(ROI): ${bestAdaptive.model}`);
    console.log(`    レッグ的中率: ${bestAdaptive.legHitRate}% | WIN5: ${bestAdaptive.win5Hits}/${bestAdaptive.totalDays} | ROI: ${bestAdaptive.roi}%`);
    console.log(`    平均コスト/週: ¥${bestAdaptive.avgCostPerWeek.toLocaleString()} | 総コスト: ¥${bestAdaptive.totalCost.toLocaleString()} | 総配当: ¥${bestAdaptive.totalPayout.toLocaleString()}`);
  }

  console.log('\n  ※ 曖昧マッチ(540件)のrace_key精度向上で結果が変わる可能性あり');
  console.log('═'.repeat(70));
}

main().catch(e => { console.error(e); process.exit(1); });
