#!/usr/bin/env node
/**
 * WIN5 バックテスト詳細Excelエクスポート
 * 
 * 全モデル × 全日の予想・結果・配当 + 難易度判定をExcelファイルに出力。
 * 
 * 使い方:
 *   cd ~/gate-in/scripts/win5
 *   npm install xlsx    # 初回のみ
 *   export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/gate-in/.env.local | xargs)
 *   node win5-export-excel.mjs
 */

import XLSX from 'xlsx';
import { parseArgs } from 'util';

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

// ── モデル定義 ──
const MODELS = {
  IDMトップ:    { fn: e => e.idm || 0 },
  ハヤテ式:    { fn: e => (e.idm||0)*0.8 + (e.jockey_index||0)*0.2 },
  オッズ順:    { fn: e => -(e.base_odds || 999) },
  ヒバリ式:    { fn: e => (e.ten_index||0)*0.2 + (e.agari_index||0)*0.3 + (e.position_index||0)*0.2 + (e.idm||0)*0.3 },
  複合:       { fn: (e, all) => {
    const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
    const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
    return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
  }},
};

// ── 難易度 ──
function calcSignals(entries) {
  if (!entries || entries.length < 2) return null;
  const idms = entries.map(e => e.idm||0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds||99).filter(o => o > 0).sort((a, b) => a - b);
  const invOdds = odds.map(o => 1/o);
  const sumInv = invOdds.reduce((s, v) => s + v, 0);
  const hhi = invOdds.reduce((s, v) => s + (v/sumInv)**2, 0);
  return {
    idmSpread: +(idms[0] - idms[1]).toFixed(1),
    idmTop3Spread: +(idms[0] - (idms[2]||idms[1])).toFixed(1),
    headCount: entries.length,
    hhi: +hhi.toFixed(4),
    minOdds: +(odds[0]||1).toFixed(1),
    odds12gap: +((odds[1]||0) - (odds[0]||0)).toFixed(1),
  };
}

function rawScore(sig) {
  if (!sig) return 50;
  return +(Math.min(sig.idmSpread*8,100)*0.25 + Math.max(0,(18-sig.headCount)*8)*0.20
    + sig.hhi*400*0.25 + Math.max(0,(10-sig.minOdds)*12)*0.15 + Math.min(sig.odds12gap*8,100)*0.15).toFixed(1);
}

function scoreToLevel(score) {
  if (score >= 48) return 'Easy';
  if (score >= 40) return 'Med-Easy';
  if (score >= 33) return 'Med-Hard';
  return 'Hard';
}

function scoreToN(score) { return score >= 48 ? 1 : score >= 40 ? 2 : score >= 33 ? 4 : 7; }

async function main() {
  console.log('\n📊 WIN5 バックテスト 詳細Excelエクスポート\n');

  // ── データ取得 ──
  const legs = await queryAll('win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  console.log(`  WIN5レッグ: ${legs.length}`);

  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,horse_name,idm,jockey_index,jockey_name,base_odds,head_count,ten_index,agari_index,position_index&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }

  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key) || [] })).filter(r => r.entries.length > 0);
  console.log(`\n  対象: ${races.length}レッグ\n`);

  // ══════════════════════════════════
  // Sheet 1: 難易度判定基準
  // ══════════════════════════════════
  console.log('📝 Sheet 1: 難易度判定基準...');
  const criteriaData = [
    ['WIN5 AI予想 難易度判定基準'],
    [],
    ['■ 難易度スコア算出方法'],
    ['各レースの以下5つのシグナルを0-100に正規化し、加重平均でスコアを算出。'],
    ['高スコア = 読みやすい（Easy）、低スコア = 難しい（Hard）'],
    [],
    ['シグナル', '重み', '算出方法', '高い=読みやすい理由'],
    ['IDMスプレッド', '25%', 'IDM1位 - IDM2位の差 × 8 (上限100)', '差が大きい = 本命が明確'],
    ['出走頭数', '20%', '(18 - 頭数) × 8 (下限0)', '少頭数 = 荒れにくい'],
    ['HHI（オッズ集中度）', '25%', 'ハーフィンダール指数 × 400', '1頭に人気が集中 = 読みやすい'],
    ['1番人気オッズ', '15%', '(10 - 最低オッズ) × 12 (下限0)', '低オッズ = 強い本命馬がいる'],
    ['1-2番人気オッズ差', '15%', '2番人気オッズ - 1番人気オッズ × 8 (上限100)', '差が大きい = 2番手と差がある'],
    [],
    ['■ 難易度レベル → 候補数マッピング (Flex-H 1-2-4-7)'],
    [],
    ['レベル', 'スコア範囲', 'パーセンタイル', '候補数', '説明'],
    ['Easy', '≥ 48', 'P90以上', '1頭', '明確な本命馬がいる。◎1頭に絞りコスト節約'],
    ['Med-Easy', '40 ≤ x < 48', 'P60-P90', '2頭', 'やや読みやすい。◎○の2頭'],
    ['Med-Hard', '33 ≤ x < 40', 'P30-P60', '4頭', 'やや混戦。4頭でカバー'],
    ['Hard', '< 33', 'P0-P30', '7頭', '大混戦。7頭で広く網を張る'],
    [],
    ['■ 予算制御'],
    ['予算キャップ: ¥30,000/週'],
    ['超過時: 最も候補が多いレッグから1頭ずつ削減して予算内に収める'],
    [],
    ['■ 馬選択モデル（複合スコア）'],
    ['複合スコア = IDM × 0.5 + 騎手指数 × 0.2 + オッズ順位スコア × 0.3'],
    ['各レッグでスコア上位N頭を選出'],
  ];

  // ══════════════════════════════════
  // Sheet 2: レッグ詳細（全レッグ × 全モデル）
  // ══════════════════════════════════
  console.log('📝 Sheet 2: レッグ詳細...');
  const legHeader = [
    '日付', 'Leg', '競馬場', 'R番号', '勝馬番', '勝馬オッズ', '勝馬人気', '配当(Leg1のみ)',
    '頭数', '難易度スコア', '難易度レベル', 'Flex-H候補数',
    'IDMスプレッド', 'HHI', '最低オッズ', 'オッズ差1-2',
  ];
  // モデルごとの列
  const modelNames = Object.keys(MODELS);
  for (const mn of modelNames) {
    legHeader.push(`${mn}_◎`, `${mn}_○`, `${mn}_▲`, `${mn}_的中(3頭)`, `${mn}_的中(FlexH)`);
  }

  const legRows = [legHeader];

  for (const race of races) {
    const entries = race.entries;
    const sig = calcSignals(entries);
    const ds = rawScore(sig);
    const level = scoreToLevel(ds);
    const flexN = scoreToN(ds);

    const row = [
      race.race_date, race.leg_number, race.course_name, race.race_number,
      race.winning_umaban, race.winning_odds, race.winning_popularity,
      race.leg_number === 1 ? race.payout : '',
      entries.length, ds, level, flexN,
      sig?.idmSpread ?? '', sig?.hhi ?? '', sig?.minOdds ?? '', sig?.odds12gap ?? '',
    ];

    for (const mn of modelNames) {
      const model = MODELS[mn];
      const scored = entries.map(e => ({ umaban: e.umaban, s: model.fn(e, entries) })).sort((a, b) => b.s - a.s);
      const top3 = scored.slice(0, 3).map(x => x.umaban);
      const topFlex = scored.slice(0, Math.min(flexN, entries.length)).map(x => x.umaban);

      row.push(top3[0] || '', top3[1] || '', top3[2] || '');
      row.push(top3.includes(race.winning_umaban) ? '○' : '×');
      row.push(topFlex.includes(race.winning_umaban) ? '○' : '×');
    }

    legRows.push(row);
  }

  // ══════════════════════════════════
  // Sheet 3: 日別WIN5結果
  // ══════════════════════════════════
  console.log('📝 Sheet 3: 日別WIN5結果...');
  const dailyMap = new Map();
  for (const race of races) {
    if (!dailyMap.has(race.race_date)) dailyMap.set(race.race_date, []);
    dailyMap.get(race.race_date).push(race);
  }

  const dailyHeader = ['日付', '配当', 'レッグ数'];
  for (const mn of modelNames) {
    dailyHeader.push(`${mn}_Leg的中数`, `${mn}_WIN5的中`, `${mn}_コスト(3頭固定)`, `${mn}_コスト(FlexH)`);
  }
  const dailyRows = [dailyHeader];

  for (const [date, dayLegs] of [...dailyMap].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (dayLegs.length !== 5) continue;
    const payout = dayLegs[0].payout || 0;
    const row = [date, payout, dayLegs.length];

    for (const mn of modelNames) {
      const model = MODELS[mn];
      let legHits3 = 0, legHitsFlex = 0;
      let combo3 = 1, comboFlex = 1;

      for (const leg of dayLegs) {
        const entries = leg.entries;
        const scored = entries.map(e => ({ umaban: e.umaban, s: model.fn(e, entries) })).sort((a, b) => b.s - a.s);

        // 固定3頭
        const top3 = scored.slice(0, 3).map(x => x.umaban);
        if (top3.includes(leg.winning_umaban)) legHits3++;
        combo3 *= 3;

        // FlexH
        const ds = rawScore(calcSignals(entries));
        const flexN = Math.min(scoreToN(ds), entries.length);
        const topFlex = scored.slice(0, flexN).map(x => x.umaban);
        if (topFlex.includes(leg.winning_umaban)) legHitsFlex++;
        comboFlex *= flexN;
      }

      const win5hit3 = legHits3 === 5 ? '○' : '×';
      const win5hitFlex = legHitsFlex === 5 ? '○' : '×';
      row.push(legHits3, win5hit3, combo3 * 100, comboFlex * 100);
    }

    dailyRows.push(row);
  }

  // ══════════════════════════════════
  // Sheet 4: モデルサマリー
  // ══════════════════════════════════
  console.log('📝 Sheet 4: モデルサマリー...');
  const summaryRows = [
    ['モデル', '候補数', 'レッグ的中数', 'レッグ的中率', 'WIN5的中数', 'WIN5日数', 'WIN5的中率', '総コスト', '総配当', 'ROI'],
  ];

  for (const mn of modelNames) {
    for (const fixedN of [1, 2, 3]) {
      let legHits = 0, totalLegs = 0, win5Hits = 0, days = 0, totalCost = 0, totalPayout = 0;
      for (const [, dayLegs] of dailyMap) {
        if (dayLegs.length !== 5) continue;
        days++;
        let dh = 0;
        for (const leg of dayLegs) {
          totalLegs++;
          const scored = leg.entries.map(e => ({ umaban: e.umaban, s: MODELS[mn].fn(e, leg.entries) })).sort((a, b) => b.s - a.s);
          if (scored.slice(0, fixedN).map(x => x.umaban).includes(leg.winning_umaban)) { legHits++; dh++; }
        }
        const cost = Math.pow(fixedN, 5) * 100;
        totalCost += cost;
        if (dh === 5 && dayLegs[0].payout) { win5Hits++; totalPayout += dayLegs[0].payout; }
      }
      summaryRows.push([
        mn, `${fixedN}頭固定`, legHits, +(legHits/totalLegs*100).toFixed(1),
        win5Hits, days, +(win5Hits/days*100).toFixed(2),
        totalCost, totalPayout, totalCost > 0 ? Math.round(totalPayout/totalCost*100) : 0,
      ]);
    }
    // FlexH
    {
      let legHits = 0, totalLegs = 0, win5Hits = 0, days = 0, totalCost = 0, totalPayout = 0;
      for (const [, dayLegs] of dailyMap) {
        if (dayLegs.length !== 5) continue;
        days++;
        let dh = 0, combo = 1;
        for (const leg of dayLegs) {
          totalLegs++;
          const ds = rawScore(calcSignals(leg.entries));
          const n = Math.min(scoreToN(ds), leg.entries.length);
          combo *= n;
          const scored = leg.entries.map(e => ({ umaban: e.umaban, s: MODELS[mn].fn(e, leg.entries) })).sort((a, b) => b.s - a.s);
          if (scored.slice(0, n).map(x => x.umaban).includes(leg.winning_umaban)) { legHits++; dh++; }
        }
        // 予算調整（簡易版: 30Kキャップ）
        let cost = combo * 100;
        totalCost += Math.min(cost, 30000);
        if (dh === 5 && dayLegs[0].payout) { win5Hits++; totalPayout += dayLegs[0].payout; }
      }
      summaryRows.push([
        mn, 'FlexH(1-2-4-7)', legHits, +(legHits/totalLegs*100).toFixed(1),
        win5Hits, days, +(win5Hits/days*100).toFixed(2),
        totalCost, totalPayout, totalCost > 0 ? Math.round(totalPayout/totalCost*100) : 0,
      ]);
    }
  }

  // ══════════════════════════════════
  // Excel出力
  // ══════════════════════════════════
  console.log('\n📦 Excel生成中...');

  const wb = XLSX.utils.book_new();

  // Sheet 1
  const ws1 = XLSX.utils.aoa_to_sheet(criteriaData);
  ws1['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 50 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, '難易度判定基準');

  // Sheet 2
  const ws2 = XLSX.utils.aoa_to_sheet(legRows);
  ws2['!cols'] = [{ wch: 12 }, { wch: 5 }, { wch: 6 }, { wch: 5 }, { wch: 6 }, { wch: 8 }, { wch: 6 }, { wch: 14 },
    { wch: 5 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    ...modelNames.flatMap(() => [{ wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 10 }])
  ];
  ws2['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: legHeader.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws2, 'レッグ詳細');

  // Sheet 3
  const ws3 = XLSX.utils.aoa_to_sheet(dailyRows);
  ws3['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 8 },
    ...modelNames.flatMap(() => [{ wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }])
  ];
  ws3['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: dailyHeader.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws3, '日別WIN5結果');

  // Sheet 4
  const ws4 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws4['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'モデルサマリー');

  const outPath = './win5-data/WIN5_Backtest_Detail.xlsx';
  XLSX.writeFile(wb, outPath);

  console.log(`\n✅ ${outPath}`);
  console.log(`  シート1: 難易度判定基準`);
  console.log(`  シート2: レッグ詳細 (${legRows.length - 1}行)`);
  console.log(`  シート3: 日別WIN5結果 (${dailyRows.length - 1}行)`);
  console.log(`  シート4: モデルサマリー (${summaryRows.length - 1}行)`);
}

main().catch(e => { console.error(e); process.exit(1); });
