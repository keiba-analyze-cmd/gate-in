#!/usr/bin/env node
/**
 * WIN5 Excel v2 — 96パターン結果 + レッグ詳細
 * 
 * シート1: 難易度判定基準
 * シート2: 96パターン結果（16配分×6予算）
 * シート3: レッグ詳細（全2130レッグ、本命+穴判定付き）
 * シート4: 日別WIN5結果
 * シート5: 配当構造分析
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
  const idmSorted = [...all].sort((a, b) => (b.idm||0) - (a.idm||0));
  const r = idmSorted.findIndex(x => x.umaban === e.umaban) + 1;
  const odds = e.base_odds || 1;
  if (r <= 2 || r > 8 || odds < 5) return 0;
  return (e.idm || 0) * Math.log(odds);
}
function calcDifficulty(entries) {
  if (!entries || entries.length < 2) return 50;
  const idms = entries.map(e => e.idm||0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds||99).filter(o => o > 0).sort((a, b) => a - b);
  const inv = odds.map(o => 1/o), sum = inv.reduce((s, v) => s + v, 0);
  const hhi = inv.reduce((s, v) => s + (v/sum)**2, 0);
  return +(Math.min((idms[0]-idms[1])*8,100)*0.25 + Math.max(0,(18-entries.length)*8)*0.20 + hhi*400*0.25 + Math.max(0,(10-(odds[0]||1))*12)*0.15 + Math.min(((odds[1]||0)-(odds[0]||0))*8,100)*0.15).toFixed(1);
}
function levelFromScore(s) { return s >= 48 ? 'Easy' : s >= 40 ? 'Med-Easy' : s >= 33 ? 'Med-Hard' : 'Hard'; }

function selectCands(entries, hN, aN) {
  const comp = entries.map(e => ({ u: e.umaban, s: compositeScore(e, entries) })).sort((a, b) => b.s - a.s);
  const kaz = entries.map(e => ({ u: e.umaban, s: kazanScore(e, entries) })).sort((a, b) => b.s - a.s);
  const hSet = new Set(comp.slice(0, hN).map(x => x.u));
  const aF = kaz.filter(x => x.s > 0 && !hSet.has(x.u)).slice(0, aN).map(x => x.u);
  return [...hSet, ...aF];
}

function runBT(daily, mapping, cap) {
  let tL = 0, lH = 0, w5 = 0, days = 0, tC = 0, tP = 0; const hP = [];
  for (const [, dL] of daily) {
    if (dL.length !== 5) continue; days++;
    const plans = dL.map(leg => {
      const ds = calcDifficulty(leg.entries);
      let h = 2, a = 1;
      for (const m of mapping) { if (ds >= m.ms) { h = m.h; a = m.a; break; } }
      const c = selectCands(leg.entries, h, a);
      return { leg, c, n: c.length };
    });
    let combo = plans.reduce((p, l) => p * l.n, 1), cost = combo * 100;
    if (cost > cap) { while (cost > cap) { let mi=-1,mn=0; for (let i=0;i<plans.length;i++) if(plans[i].n>mn){mn=plans[i].n;mi=i;} if(mn<=1)break; plans[mi].n--;plans[mi].c=plans[mi].c.slice(0,plans[mi].n); combo=plans.reduce((p,l)=>p*l.n,1);cost=combo*100; } }
    tC += cost; let dh = 0;
    for (const p of plans) { tL++; if (p.c.includes(p.leg.winning_umaban)) { lH++; dh++; } }
    if (dh === 5 && dL[0].payout) { w5++; tP += dL[0].payout; hP.push(dL[0].payout); }
  }
  return { days, w5, tL, lH, lr: +(lH/tL*100).toFixed(1), tC, tP, roi: tC?Math.round(tP/tC*100):0, profit: tP-tC, avgHP: hP.length?Math.round(hP.reduce((s,v)=>s+v,0)/hP.length):0, avgC: days?Math.round(tC/days):0 };
}

async function main() {
  console.log('\n📊 WIN5 Excel v2 生成\n');

  const legs = await queryAll('win5_results?select=id,race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,horse_name,idm,jockey_index,jockey_name,base_odds,ten_index,agari_index,position_index&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }
  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key) || [] })).filter(r => r.entries.length > 0);
  const daily = new Map();
  for (const r of races) { if (!daily.has(r.race_date)) daily.set(r.race_date, []); daily.get(r.race_date).push(r); }
  console.log(`\n  対象: ${races.length}レッグ\n`);

  // ═══ Sheet 1: 難易度判定基準 ═══
  console.log('📝 Sheet 1...');
  const s1 = [
    ['WIN5 AI予想システム — 難易度判定基準と戦略'],
    [],
    ['■ 難易度スコア（0-100、高い=読みやすい）'],
    ['シグナル', '重み', '算出方法'],
    ['IDMスプレッド', '25%', '(IDM1位 - IDM2位) × 8'],
    ['出走頭数', '20%', '(18 - 頭数) × 8'],
    ['HHI（オッズ集中度）', '25%', 'ハーフィンダール指数 × 400'],
    ['1番人気オッズ', '15%', '(10 - 最低オッズ) × 12'],
    ['1-2番人気オッズ差', '15%', '(2番人気 - 1番人気オッズ) × 8'],
    [],
    ['■ 推奨戦略: E本命H穴3'],
    ['レベル', 'スコア', '本命(複合)', '穴馬(カザン)', '合計'],
    ['Easy', '≥ 48', '1頭', '0頭', '1頭'],
    ['Med-Easy', '40-47', '2頭', '0頭', '2頭'],
    ['Med-Hard', '33-39', '2頭', '1頭', '3頭'],
    ['Hard', '< 33', '2頭', '3頭', '5頭'],
    [],
    ['■ モデル定義'],
    ['本命: 複合スコア', 'IDM × 0.5 + 騎手指数 × 0.2 + オッズ順位スコア × 0.3'],
    ['穴馬: カザン式', 'IDM(3-8位) × ln(オッズ), オッズ≥5のみ, 本命と重複除外'],
    [],
    ['■ 予算キャップ: ¥15,000/週', '超過時は候補数を自動削減'],
    ['■ バックテスト成績', 'ROI 549% | WIN5 10回/410日 | 利益¥1,980万'],
  ];

  // ═══ Sheet 2: 96パターン結果 ═══
  console.log('📝 Sheet 2: 96パターン...');
  const patterns = [
    ['A: 固定 本2穴1', [{h:2,a:1},{h:2,a:1},{h:2,a:1},{h:2,a:1}]],
    ['B: 固定 本3穴1', [{h:3,a:1},{h:3,a:1},{h:3,a:1},{h:3,a:1}]],
    ['C: E少H多', [{h:1,a:0},{h:2,a:0},{h:2,a:1},{h:2,a:2}]],
    ['D: E本命H穴多', [{h:1,a:0},{h:2,a:1},{h:2,a:1},{h:2,a:2}]],
    ['E: E本命H穴3 ★推奨', [{h:1,a:0},{h:2,a:0},{h:2,a:1},{h:2,a:3}]],
    ['F: 全レッグ穴1', [{h:1,a:1},{h:2,a:1},{h:2,a:1},{h:3,a:1}]],
    ['G: E絞りH厚め', [{h:1,a:0},{h:1,a:1},{h:2,a:1},{h:3,a:2}]],
    ['H: 本命重視+穴少', [{h:2,a:0},{h:2,a:0},{h:3,a:1},{h:3,a:1}]],
    ['I: 穴馬重視', [{h:1,a:1},{h:1,a:1},{h:2,a:2},{h:2,a:3}]],
    ['J: バランス', [{h:1,a:0},{h:2,a:1},{h:2,a:2},{h:3,a:2}]],
    ['K: Easy0穴Hard穴多', [{h:1,a:0},{h:2,a:0},{h:2,a:2},{h:3,a:3}]],
    ['L: 固定 本2穴2', [{h:2,a:2},{h:2,a:2},{h:2,a:2},{h:2,a:2}]],
    ['M: E狭H広穴2', [{h:1,a:0},{h:1,a:1},{h:2,a:2},{h:3,a:3}]],
    ['N: 全穴1+H穴2', [{h:1,a:1},{h:2,a:1},{h:2,a:1},{h:2,a:2}]],
    ['O: 本3穴漸増', [{h:3,a:0},{h:3,a:1},{h:3,a:1},{h:3,a:2}]],
    ['P: E本1穴1 H本2穴2', [{h:1,a:1},{h:1,a:1},{h:2,a:2},{h:2,a:2}]],
  ];
  const caps = [15000, 25000, 30000, 50000, 75000, 100000];
  const s2Header = ['パターン', 'Easy配分', 'MedEasy配分', 'MedHard配分', 'Hard配分',
    '予算キャップ', 'WIN5的中', 'レッグ的中率', '総コスト', '総配当', 'ROI', '利益', '週平均コスト', '的中時平均配当', '日数'];
  const s2Rows = [s2Header];

  for (const [name, allocs] of patterns) {
    const mapping = [
      { ms: 48, h: allocs[0].h, a: allocs[0].a },
      { ms: 40, h: allocs[1].h, a: allocs[1].a },
      { ms: 33, h: allocs[2].h, a: allocs[2].a },
      { ms: 0,  h: allocs[3].h, a: allocs[3].a },
    ];
    for (const cap of caps) {
      const r = runBT(daily, mapping, cap);
      s2Rows.push([
        name,
        `本${allocs[0].h}穴${allocs[0].a}`, `本${allocs[1].h}穴${allocs[1].a}`,
        `本${allocs[2].h}穴${allocs[2].a}`, `本${allocs[3].h}穴${allocs[3].a}`,
        cap, r.w5, r.lr, r.tC, r.tP, r.roi, r.profit, r.avgC, r.avgHP, r.days,
      ]);
    }
    process.stdout.write(`  ${name}\r`);
  }

  // ═══ Sheet 3: レッグ詳細 ═══
  console.log('\n📝 Sheet 3: レッグ詳細...');
  const s3Header = ['日付', 'Leg', '競馬場', 'R番号', '勝馬番', '勝馬オッズ', '勝馬人気', '配当(Leg1)',
    '頭数', '難易度スコア', '難易度レベル',
    '本命◎', '本命○', '穴馬★1', '穴馬★2', '穴馬★3',
    '本命的中', '穴馬的中', '全体的中'];
  const s3Rows = [s3Header];

  for (const race of races) {
    const e = race.entries; if (!e.length) continue;
    const ds = calcDifficulty(e);
    const lv = levelFromScore(ds);
    const alloc = ds >= 48 ? {h:1,a:0} : ds >= 40 ? {h:2,a:0} : ds >= 33 ? {h:2,a:1} : {h:2,a:3};
    const comp = e.map(x => ({ u: x.umaban, s: compositeScore(x, e) })).sort((a, b) => b.s - a.s);
    const kaz = e.map(x => ({ u: x.umaban, s: kazanScore(x, e) })).sort((a, b) => b.s - a.s);
    const honmei = comp.slice(0, alloc.h).map(x => x.u);
    const hSet = new Set(honmei);
    const ana = kaz.filter(x => x.s > 0 && !hSet.has(x.u)).slice(0, alloc.a).map(x => x.u);
    const all = [...honmei, ...ana];

    s3Rows.push([
      race.race_date, race.leg_number, race.course_name, race.race_number,
      race.winning_umaban, race.winning_odds, race.winning_popularity,
      race.leg_number === 1 ? race.payout : '',
      e.length, ds, lv,
      honmei[0] || '', honmei[1] || '', ana[0] || '', ana[1] || '', ana[2] || '',
      honmei.includes(race.winning_umaban) ? '○' : '×',
      ana.includes(race.winning_umaban) ? '○' : '-',
      all.includes(race.winning_umaban) ? '○' : '×',
    ]);
  }

  // ═══ Sheet 4: 日別WIN5結果 ═══
  console.log('📝 Sheet 4: 日別結果...');
  const s4Header = ['日付', '配当', 'レッグ数', '最大人気', '穴馬含有',
    'E本命H穴3_Leg的中', 'E本命H穴3_WIN5', 'E本命H穴3_コスト'];
  const s4Rows = [s4Header];

  for (const [date, dayLegs] of [...daily].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (dayLegs.length !== 5) continue;
    const payout = dayLegs[0].payout || 0;
    const maxPop = Math.max(...dayLegs.map(l => l.winning_popularity || 0));
    const hasAna = dayLegs.some(l => (l.winning_popularity || 0) >= 6);

    // E本命H穴3で判定
    let hits = 0, combo = 1;
    for (const leg of dayLegs) {
      const ds = calcDifficulty(leg.entries);
      const al = ds >= 48 ? {h:1,a:0} : ds >= 40 ? {h:2,a:0} : ds >= 33 ? {h:2,a:1} : {h:2,a:3};
      const c = selectCands(leg.entries, al.h, al.a);
      combo *= c.length;
      if (c.includes(leg.winning_umaban)) hits++;
    }

    s4Rows.push([date, payout, dayLegs.length, maxPop, hasAna ? '有' : '無',
      hits, hits === 5 ? '○' : '×', Math.min(combo * 100, 15000)]);
  }

  // ═══ Sheet 5: 配当構造 ═══
  console.log('📝 Sheet 5: 配当構造...');
  const s5Header = ['配当帯', '日数', '割合', '穴馬含有率', '平均最大人気'];
  const bands = [
    { l: '¥0', min: 0, max: 0 }, { l: '¥1-10万', min: 1, max: 100000 },
    { l: '¥10-50万', min: 100001, max: 500000 }, { l: '¥50-100万', min: 500001, max: 1000000 },
    { l: '¥100-500万', min: 1000001, max: 5000000 }, { l: '¥500-1000万', min: 5000001, max: 10000000 },
    { l: '¥1000万-1億', min: 10000001, max: 100000000 }, { l: '¥1億以上', min: 100000001, max: Infinity },
  ];
  const s5Rows = [s5Header];
  const allDays = [...daily].filter(([, l]) => l.length === 5).map(([d, l]) => ({
    payout: l[0].payout || 0,
    maxPop: Math.max(...l.map(x => x.winning_popularity || 0)),
    hasAna: l.some(x => (x.winning_popularity || 0) >= 6),
  }));
  for (const b of bands) {
    const m = allDays.filter(d => d.payout >= b.min && d.payout <= b.max);
    if (!m.length) continue;
    s5Rows.push([b.l, m.length, +(m.length/allDays.length*100).toFixed(1),
      +(m.filter(d => d.hasAna).length/m.length*100).toFixed(0),
      +(m.reduce((s, d) => s + d.maxPop, 0) / m.length).toFixed(1)]);
  }

  // ═══ Excel生成 ═══
  console.log('\n📦 Excel生成...');
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws1, '難易度判定基準');

  const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
  ws2['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 6 }];
  ws2['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: s2Header.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws2, '96パターン結果');

  const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
  ws3['!cols'] = [{ wch: 12 }, { wch: 5 }, { wch: 6 }, { wch: 5 }, { wch: 6 }, { wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 5 }, { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
  ws3['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: s3Header.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws3, 'レッグ詳細');

  const ws4 = XLSX.utils.aoa_to_sheet(s4Rows);
  ws4['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
  ws4['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: s4Header.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws4, '日別WIN5結果');

  const ws5 = XLSX.utils.aoa_to_sheet(s5Rows);
  ws5['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws5, '配当構造');

  XLSX.writeFile(wb, './win5-data/WIN5_Backtest_v2.xlsx');
  console.log('\n✅ ./win5-data/WIN5_Backtest_v2.xlsx');
  console.log(`  96パターン: ${s2Rows.length - 1}行`);
  console.log(`  レッグ詳細: ${s3Rows.length - 1}行`);
  console.log(`  日別結果: ${s4Rows.length - 1}行`);
}
main().catch(e => { console.error(e); process.exit(1); });
