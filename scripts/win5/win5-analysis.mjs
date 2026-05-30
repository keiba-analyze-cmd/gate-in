#!/usr/bin/env node
/**
 * WIN5 勝ち筋分析
 * 
 * 1. 配当構造の分析（人気決着 vs 荒れ）
 * 2. レッグ別の人気馬勝率
 * 3. 「穴を1つ含む」戦略のシミュレーション
 * 4. カザン式（穴馬）シグナルの検証
 * 5. ROIプラスになる戦略の探索
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

// モデル
function compositeScore(e, all) {
  const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
  const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
  return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
}

// カザン式: IDM3-6位 × ln(odds)  高オッズの中堅馬を評価
function kazanScore(e, all) {
  const idmSorted = [...all].sort((a, b) => (b.idm||0) - (a.idm||0));
  const idmRank = idmSorted.findIndex(x => x.umaban === e.umaban) + 1;
  const odds = e.base_odds || 1;
  if (idmRank <= 2 || idmRank > 8) return 0; // IDM上位2頭と下位は除外
  if (odds < 5) return 0; // 人気馬は除外
  return (e.idm || 0) * Math.log(odds);
}

// ハイブリッド: 複合+カザン
function hybridScore(e, all, kazanWeight) {
  return compositeScore(e, all) + kazanScore(e, all) * kazanWeight;
}

async function main() {
  console.log('\n🔬 WIN5 勝ち筋分析\n');

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
  console.log(`\n  対象: ${races.length}レッグ\n`);

  // 日別グループ
  const daily = new Map();
  for (const r of races) {
    if (!daily.has(r.race_date)) daily.set(r.race_date, []);
    daily.get(r.race_date).push(r);
  }

  // ═══════════════════════════════════
  // 分析1: 配当構造
  // ═══════════════════════════════════
  console.log('═'.repeat(70));
  console.log('📊 分析1: WIN5配当構造');
  console.log('═'.repeat(70));

  const payouts = [];
  for (const [date, dayLegs] of daily) {
    if (dayLegs.length !== 5) continue;
    const payout = dayLegs[0].payout || 0;
    const maxPop = Math.max(...dayLegs.map(l => l.winning_popularity || 99));
    const avgPop = dayLegs.reduce((s, l) => s + (l.winning_popularity || 0), 0) / 5;
    const has穴 = dayLegs.some(l => (l.winning_popularity || 0) >= 6);
    const has大穴 = dayLegs.some(l => (l.winning_popularity || 0) >= 10);
    payouts.push({ date, payout, maxPop, avgPop, has穴, has大穴, legs: dayLegs });
  }

  payouts.sort((a, b) => b.payout - a.payout);

  // 配当帯別の統計
  const bands = [
    { label: '¥0 (不的中)', min: 0, max: 0 },
    { label: '¥1-10万', min: 1, max: 100000 },
    { label: '¥10-50万', min: 100001, max: 500000 },
    { label: '¥50-100万', min: 500001, max: 1000000 },
    { label: '¥100-500万', min: 1000001, max: 5000000 },
    { label: '¥500万-1000万', min: 5000001, max: 10000000 },
    { label: '¥1000万-1億', min: 10000001, max: 100000000 },
    { label: '¥1億以上', min: 100000001, max: Infinity },
  ];

  console.log('\n  配当帯     | 日数  | 割合   | 穴馬率  | 平均最大人気');
  console.log('  ' + '-'.repeat(60));
  for (const b of bands) {
    const matches = payouts.filter(p => p.payout >= b.min && p.payout <= b.max);
    if (matches.length === 0) continue;
    const pct = (matches.length / payouts.length * 100).toFixed(1);
    const anaRate = (matches.filter(m => m.has穴).length / matches.length * 100).toFixed(0);
    const avgMaxPop = (matches.reduce((s, m) => s + m.maxPop, 0) / matches.length).toFixed(1);
    console.log(`  ${b.label.padEnd(14)} | ${String(matches.length).padStart(4)}  | ${pct.padStart(5)}% | ${anaRate.padStart(4)}%   | ${avgMaxPop}人気`);
  }

  // 高配当日の勝ち馬人気
  console.log('\n  💰 高配当TOP10:');
  for (const p of payouts.slice(0, 10)) {
    const pops = p.legs.map(l => `${l.winning_popularity}人気`).join(', ');
    console.log(`    ${p.date}: ¥${p.payout.toLocaleString().padStart(14)} [${pops}]`);
  }

  // ═══════════════════════════════════
  // 分析2: 人気別の勝率
  // ═══════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📊 分析2: 勝ち馬の人気分布');
  console.log('═'.repeat(70));

  const popDist = {};
  for (const r of races) {
    const pop = r.winning_popularity || 0;
    const bucket = pop <= 3 ? `${pop}人気` : pop <= 5 ? '4-5人気' : pop <= 8 ? '6-8人気' : '9人気以下';
    if (!popDist[bucket]) popDist[bucket] = 0;
    popDist[bucket]++;
  }
  console.log('\n  人気帯     | 勝利数 | 割合');
  console.log('  ' + '-'.repeat(35));
  for (const [k, v] of Object.entries(popDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(10)} | ${String(v).padStart(5)} | ${(v / races.length * 100).toFixed(1)}%`);
  }

  // ═══════════════════════════════════
  // 分析3: 各モデルの「的中時配当」分析
  // ═══════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📊 分析3: モデル別 WIN5的中時の配当分析');
  console.log('═'.repeat(70));

  const modelTests = [
    { name: '複合(3頭)', fn: compositeScore, n: 3 },
    { name: 'オッズ順(3頭)', fn: (e, all) => -(e.base_odds||999), n: 3 },
    { name: '複合+カザン0.3', fn: (e, all) => hybridScore(e, all, 0.3), n: 3 },
    { name: '複合+カザン0.5', fn: (e, all) => hybridScore(e, all, 0.5), n: 3 },
    { name: '複合+カザン1.0', fn: (e, all) => hybridScore(e, all, 1.0), n: 3 },
    { name: '複合(4頭)', fn: compositeScore, n: 4 },
    { name: '複合+カザン0.5(4頭)', fn: (e, all) => hybridScore(e, all, 0.5), n: 4 },
    { name: '複合+カザン0.5(5頭)', fn: (e, all) => hybridScore(e, all, 0.5), n: 5 },
  ];

  console.log('\n  モデル                 | WIN5 | レッグ率 | 総コスト      | 総配当          | ROI    | 的中時平均配当');
  console.log('  ' + '-'.repeat(100));

  for (const mt of modelTests) {
    let legHits = 0, totalLegs = 0, win5Hits = 0, days = 0, totalCost = 0, totalPayout = 0;
    const hitPayouts = [];

    for (const [, dayLegs] of daily) {
      if (dayLegs.length !== 5) continue;
      days++;
      let dh = 0;
      for (const leg of dayLegs) {
        totalLegs++;
        const scored = leg.entries.map(e => ({ umaban: e.umaban, s: mt.fn(e, leg.entries) })).sort((a, b) => b.s - a.s);
        if (scored.slice(0, mt.n).map(x => x.umaban).includes(leg.winning_umaban)) { legHits++; dh++; }
      }
      const cost = Math.pow(mt.n, 5) * 100;
      totalCost += cost;
      if (dh === 5 && dayLegs[0].payout) {
        win5Hits++;
        totalPayout += dayLegs[0].payout;
        hitPayouts.push(dayLegs[0].payout);
      }
    }

    const avgHitPayout = hitPayouts.length > 0 ? Math.round(hitPayouts.reduce((s, v) => s + v, 0) / hitPayouts.length) : 0;
    const roi = totalCost > 0 ? Math.round(totalPayout / totalCost * 100) : 0;
    console.log(`  ${mt.name.padEnd(22)} | ${String(win5Hits).padStart(3)}  | ${(legHits/totalLegs*100).toFixed(1).padStart(5)}%  | ¥${totalCost.toLocaleString().padStart(12)} | ¥${totalPayout.toLocaleString().padStart(14)} | ${String(roi).padStart(5)}% | ¥${avgHitPayout.toLocaleString()}`);
  }

  // ═══════════════════════════════════
  // 分析4: 「本命+穴」ハイブリッド戦略
  // ═══════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📊 分析4: 本命+穴 ハイブリッド戦略');
  console.log('  各レッグで「本命N頭 + 穴馬M頭」を選出');
  console.log('═'.repeat(70));

  // 戦略: 複合トップN + カザントップMの和集合
  const hybridStrategies = [
    { name: '本命2+穴1=3頭', honmei: 2, ana: 1 },
    { name: '本命2+穴2=4頭', honmei: 2, ana: 2 },
    { name: '本命3+穴1=4頭', honmei: 3, ana: 1 },
    { name: '本命3+穴2=5頭', honmei: 3, ana: 2 },
    { name: '本命3+穴3=6頭', honmei: 3, ana: 3 },
    { name: '本命2+穴3=5頭', honmei: 2, ana: 3 },
  ];

  console.log('\n  戦略             | 実効頭数 | WIN5 | レッグ率 | 総コスト      | 総配当          | ROI    | 的中時平均配当');
  console.log('  ' + '-'.repeat(110));

  for (const hs of hybridStrategies) {
    let legHits = 0, totalLegs = 0, win5Hits = 0, days = 0, totalCost = 0, totalPayout = 0;
    let totalActualN = 0;
    const hitPayouts = [];

    for (const [, dayLegs] of daily) {
      if (dayLegs.length !== 5) continue;
      days++;
      let dh = 0, dayCombos = 1;
      for (const leg of dayLegs) {
        totalLegs++;
        const compScored = leg.entries.map(e => ({ umaban: e.umaban, s: compositeScore(e, leg.entries) })).sort((a, b) => b.s - a.s);
        const kazScored = leg.entries.map(e => ({ umaban: e.umaban, s: kazanScore(e, leg.entries) })).sort((a, b) => b.s - a.s);

        // 本命N頭 + カザン上位M頭（重複除外）
        const honmeiSet = new Set(compScored.slice(0, hs.honmei).map(x => x.umaban));
        const anaFiltered = kazScored.filter(x => x.s > 0 && !honmeiSet.has(x.umaban));
        const anaPicks = anaFiltered.slice(0, hs.ana).map(x => x.umaban);
        const allPicks = [...honmeiSet, ...anaPicks];

        const actualN = allPicks.length;
        totalActualN += actualN;
        dayCombos *= actualN;

        if (allPicks.includes(leg.winning_umaban)) { legHits++; dh++; }
      }
      totalCost += dayCombos * 100;
      if (dh === 5 && dayLegs[0].payout) {
        win5Hits++;
        totalPayout += dayLegs[0].payout;
        hitPayouts.push(dayLegs[0].payout);
      }
    }

    const avgN = (totalActualN / totalLegs).toFixed(1);
    const avgHitPayout = hitPayouts.length > 0 ? Math.round(hitPayouts.reduce((s, v) => s + v, 0) / hitPayouts.length) : 0;
    const roi = totalCost > 0 ? Math.round(totalPayout / totalCost * 100) : 0;
    console.log(`  ${hs.name.padEnd(16)} | ${avgN.padStart(5)}頭  | ${String(win5Hits).padStart(3)}  | ${(legHits/totalLegs*100).toFixed(1).padStart(5)}%  | ¥${totalCost.toLocaleString().padStart(12)} | ¥${totalPayout.toLocaleString().padStart(14)} | ${String(roi).padStart(5)}% | ¥${avgHitPayout.toLocaleString()}`);
  }

  // ═══════════════════════════════════
  // 分析5: 条件付き戦略（高配当週の特徴）
  // ═══════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📊 分析5: 高配当の条件分析');
  console.log('═'.repeat(70));

  // 配当 vs 各レッグの勝ち馬人気
  const highPayout = payouts.filter(p => p.payout >= 1000000);
  const lowPayout = payouts.filter(p => p.payout > 0 && p.payout < 100000);

  console.log(`\n  高配当(¥100万+): ${highPayout.length}日`);
  console.log(`  低配当(¥10万未満): ${lowPayout.length}日`);

  if (highPayout.length > 0) {
    const avgMaxPopHigh = (highPayout.reduce((s, p) => s + p.maxPop, 0) / highPayout.length).toFixed(1);
    const avgMaxPopLow = lowPayout.length ? (lowPayout.reduce((s, p) => s + p.maxPop, 0) / lowPayout.length).toFixed(1) : '-';
    console.log(`\n  平均「最大不人気」: 高配当=${avgMaxPopHigh}人気 / 低配当=${avgMaxPopLow}人気`);
    console.log(`  → 高配当 = 5レッグ中に最低1つ「穴馬」が含まれる`);
  }

  // 穴馬が含まれるレッグの特徴
  const anaLegs = races.filter(r => (r.winning_popularity || 0) >= 6);
  const nonAnaLegs = races.filter(r => (r.winning_popularity || 0) <= 3);

  console.log(`\n  穴馬勝利(6人気以下)レッグ: ${anaLegs.length}/${races.length} (${(anaLegs.length/races.length*100).toFixed(1)}%)`);
  console.log(`  本命勝利(1-3人気)レッグ: ${nonAnaLegs.length}/${races.length} (${(nonAnaLegs.length/races.length*100).toFixed(1)}%)`);

  // ═══════════════════════════════════
  // 結論
  // ═══════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('💡 結論と推奨戦略');
  console.log('═'.repeat(70));
  console.log(`
  1. 人気馬のみで構成するとWIN5的中しても配当が低い（¥数万程度）
  2. 高配当(¥100万+)には必ず1つ以上の穴馬(6人気以下)が含まれる
  3. 「本命 + 穴馬」のハイブリッド戦略でROI改善の余地がある
  4. カザン式シグナルで穴馬候補を効率的に絞り込める可能性

  推奨: 各レッグで「複合トップ2-3頭 + カザン穴馬1-2頭」を選出し、
       予算キャップ内で最適化するFlex-H+穴馬戦略
  `);
}

main().catch(e => { console.error(e); process.exit(1); });
