#!/usr/bin/env node
/**
 * WIN5 週次予想生成 v3.1
 * 
 * E本命H穴3 + 見送り判定 + WIN5自動判定 + 血統×コース適性
 * 
 * v3.1変更点: カザン式穴馬選出に血統ブーストを追加
 *   血統ブースト = 1 + max(0, sire_place_rate - 0.20) * 2.0
 *   バックテスト: WIN5 10→11回, ROI 549→568%, 利益+¥82万
 *   6種のブースト式で同一結果→過学習リスクなし
 * 
 * 戦略:
 *   Easy(≥48):    本命1頭
 *   Med-Easy(≥40): 本命2頭
 *   Med-Hard(≥33): 本命2頭 + 穴馬1頭（血統ブースト付き）
 *   Hard(<33):     本命2頭 + 穴馬3頭（血統ブースト付き）
 * 
 * 見送り: Hard≥3 AND 合計頭数>75
 * WIN5判定: R12除外 → post_time降順TOP5
 * 
 * 使い方:
 *   node win5-predict.mjs                           # 次の日曜を自動検出
 *   node win5-predict.mjs --date 2026-05-17         # 日付指定
 *   node win5-predict.mjs --date 2026-05-17 --save  # Supabase保存
 *   node win5-predict.mjs --force                   # 見送り判定を無視
 *   node win5-predict.mjs --cap 20000               # 予算キャップ変更
 */

import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values: args } = parseArgs({
  options: {
    date:  { type: 'string', default: '' },
    save:  { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    cap:   { type: 'string', default: '15000' },
  },
});

const BUDGET_CAP = parseInt(args.cap);
const COURSE_CODE = { '札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05','中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10' };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ 環境変数未設定'); process.exit(1); }
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function query(p) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}
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

// ── 複合モデル（本命選出用） ──
function compositeScore(e, all) {
  const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
  const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
  return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
}

// ── カザン式 + 血統ブースト（穴馬選出用） ──
function kazanScoreWithSire(e, all, sireMap, horseMap, courseCode) {
  const idmSorted = [...all].sort((a, b) => (b.idm||0) - (a.idm||0));
  const idmRank = idmSorted.findIndex(x => x.umaban === e.umaban) + 1;
  const odds = e.base_odds || 1;
  if (idmRank <= 2 || idmRank > 8 || odds < 5) return { score: 0, sireBoost: null };

  let baseScore = (e.idm || 0) * Math.log(odds);
  let sireBoost = null;

  // 血統ブースト: 1 + max(0, place_rate - 0.20) * 2.0
  const sire = horseMap.get(e.horse_code);
  if (sire && courseCode) {
    const stats = sireMap.get(`${sire}|${courseCode}`);
    if (stats && stats.runs >= 10) {
      const boost = 1 + Math.max(0, stats.place_rate - 0.20) * 2.0;
      sireBoost = { sire, placeRate: stats.place_rate, runs: stats.runs, boost: +boost.toFixed(2) };
      baseScore *= boost;
    }
  }

  return { score: baseScore, sireBoost };
}

// ── 候補選出 ──
function selectCandidates(entries, honmeiN, anaN, sireMap, horseMap, courseCode) {
  const compScored = entries.map(e => ({ ...e, compScore: compositeScore(e, entries) })).sort((a, b) => b.compScore - a.compScore);
  const kazScored = entries.map(e => {
    const { score, sireBoost } = kazanScoreWithSire(e, entries, sireMap, horseMap, courseCode);
    return { ...e, kazScore: score, sireBoost };
  }).sort((a, b) => b.kazScore - a.kazScore);

  const honmei = compScored.slice(0, honmeiN);
  const honmeiSet = new Set(honmei.map(x => x.umaban));
  const ana = kazScored.filter(x => x.kazScore > 0 && !honmeiSet.has(x.umaban)).slice(0, anaN);

  return { honmei, ana, all: [...honmei, ...ana] };
}

// ── 難易度スコア ──
function calcDifficulty(entries) {
  if (!entries || entries.length < 2) return 50;
  const idms = entries.map(e => e.idm||0).sort((a, b) => b - a);
  const odds = entries.map(e => e.base_odds||99).filter(o => o > 0).sort((a, b) => a - b);
  const inv = odds.map(o => 1/o), sum = inv.reduce((s, v) => s + v, 0);
  const hhi = inv.reduce((s, v) => s + (v/sum)**2, 0);
  return Math.min((idms[0]-idms[1])*8,100)*0.25 + Math.max(0,(18-entries.length)*8)*0.20
    + hhi*400*0.25 + Math.max(0,(10-(odds[0]||1))*12)*0.15 + Math.min(((odds[1]||0)-(odds[0]||0))*8,100)*0.15;
}

const ALLOC = [
  { minScore: 48, h: 1, a: 0, level: 'Easy',     emoji: '🟢' },
  { minScore: 40, h: 2, a: 0, level: 'Med-Easy',  emoji: '🟡' },
  { minScore: 33, h: 2, a: 1, level: 'Med-Hard',  emoji: '🟠' },
  { minScore: 0,  h: 2, a: 3, level: 'Hard',      emoji: '🔴' },
];

function getAlloc(dScore) {
  for (const m of ALLOC) if (dScore >= m.minScore) return m;
  return ALLOC[ALLOC.length - 1];
}

function externalIdToRaceKey(extId) {
  if (!extId || extId.length !== 12) return null;
  const yy = extId.slice(2, 4), cc = extId.slice(4, 6);
  const kai = parseInt(extId.slice(6, 8)).toString(16);
  const nichi = parseInt(extId.slice(8, 10)).toString(16);
  const rr = extId.slice(10, 12);
  return `${cc}${yy}${kai}${nichi}${rr}`;
}

function toJST(isoStr) {
  return new Date(isoStr).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
}

async function main() {
  console.log(`\n🏇 WIN5予想 v3.1 (E本命H穴3+血統 / 予算 ¥${BUDGET_CAP.toLocaleString()})\n`);

  // ── 対象日 ──
  let targetDate = args.date;
  if (!targetDate) {
    const now = new Date();
    const dow = now.getDay();
    const daysToSun = (7 - dow) % 7 || 7;
    const nextSun = new Date(now.getTime() + daysToSun * 86400000);
    targetDate = nextSun.toISOString().slice(0, 10);
  }
  console.log(`📅 ${targetDate}`);

  // ── 血統データ読込 ──
  process.stdout.write('  血統データ読込中...');
  const [allStats, allHorses] = await Promise.all([
    queryAll('sire_course_distance_stats?select=sire_name,course_code,runs,win_rate,place_rate'),
    queryAll('jrdb_horses?select=horse_code,sire_name'),
  ]);
  const sireMap = new Map();
  for (const s of allStats) sireMap.set(`${s.sire_name}|${s.course_code}`, s);
  const horseMap = new Map();
  for (const h of allHorses) horseMap.set(h.horse_code, h.sire_name);
  console.log(` ${allStats.length}種牡馬×場 / ${allHorses.length}頭\n`);

  // ── WIN5対象レース自動判定 ──
  const allRaces = await query(
    `races?select=id,external_id,race_date,course_name,race_number,name,grade,post_time,head_count&race_date=eq.${targetDate}&race_number=lt.12&order=post_time.desc`
  );

  if (allRaces.length === 0) { console.log('⚠️  レースが見つかりません'); process.exit(0); }

  const win5Races = allRaces.slice(0, 5).reverse();

  console.log('  🎯 WIN5対象レース:');
  for (let i = 0; i < win5Races.length; i++) {
    const r = win5Races[i];
    const time = r.post_time ? toJST(r.post_time) : '?';
    const gradeStr = r.grade ? ` [${r.grade}]` : '';
    console.log(`    Leg${i+1}: ${time} ${r.course_name}R${r.race_number} ${r.name || ''}${gradeStr}`);
  }
  console.log();

  // ── 各レースの予想 ──
  const predictions = [];

  for (let i = 0; i < win5Races.length; i++) {
    const race = win5Races[i];
    const raceKey = externalIdToRaceKey(race.external_id);
    if (!raceKey) { console.log(`  ⚠️ ${race.course_name}R${race.race_number}: race_key変換失敗`); continue; }

    const entries = await query(
      `jrdb_race_entries?select=umaban,horse_name,horse_code,idm,jockey_index,jockey_name,base_odds,head_count,ten_index,agari_index,position_index&race_key=eq.${raceKey}&order=umaban.asc`
    );

    if (entries.length === 0) { console.log(`  ⚠️ ${race.course_name}R${race.race_number}: JRDBデータなし`); continue; }

    const dScore = calcDifficulty(entries);
    const alloc = getAlloc(dScore);
    const cc = COURSE_CODE[race.course_name];
    const { honmei, ana, all } = selectCandidates(entries, alloc.h, alloc.a, sireMap, horseMap, cc);

    predictions.push({
      leg: i + 1, race, raceKey, dScore: +dScore.toFixed(1),
      level: alloc.level, emoji: alloc.emoji,
      honmeiN: alloc.h, anaN: alloc.a, n: all.length,
      honmei: honmei.map(e => ({ umaban: e.umaban, horseName: e.horse_name, jockeyName: e.jockey_name, idm: e.idm, odds: e.base_odds, score: +compositeScore(e, entries).toFixed(1) })),
      ana: ana.map(e => {
        const sire = horseMap.get(e.horse_code);
        const sireInfo = sire ? sireMap.get(`${sire}|${cc}`) : null;
        return {
          umaban: e.umaban, horseName: e.horse_name, jockeyName: e.jockey_name,
          idm: e.idm, odds: e.base_odds, kazScore: +e.kazScore.toFixed(1),
          sire: sire || '?',
          sireBoost: e.sireBoost ? `複${(e.sireBoost.placeRate*100).toFixed(0)}%×${e.sireBoost.boost}` : null,
        };
      }),
      headCount: entries.length,
    });
  }

  if (predictions.length === 0) { console.log('❌ 予想生成不可'); process.exit(0); }

  // ── 見送り判定 ──
  const hardCount = predictions.filter(p => p.level === 'Hard').length;
  const totalHeadCount = predictions.reduce((s, p) => s + p.headCount, 0);
  const shouldSkip = hardCount >= 3 && totalHeadCount > 75;

  if (shouldSkip) {
    console.log('═'.repeat(60));
    console.log(`  ⚠️  見送り推奨 (Hard=${hardCount}, 頭数=${totalHeadCount})`);
    if (!args.force) {
      console.log(`  続行するには --force を付けてください`);
      console.log('═'.repeat(60));
      process.exit(0);
    }
    console.log(`  → --force で続行`);
    console.log('═'.repeat(60));
  }

  // ── 予算調整 ──
  let combos = predictions.reduce((p, pred) => p * pred.n, 1);
  let cost = combos * 100;

  if (cost > BUDGET_CAP) {
    console.log(`  ⚠️  予算超過 (¥${cost.toLocaleString()} > ¥${BUDGET_CAP.toLocaleString()}) → 調整中...`);
    while (cost > BUDGET_CAP) {
      let maxN = 0, maxIdx = -1;
      for (let i = 0; i < predictions.length; i++) if (predictions[i].n > maxN) { maxN = predictions[i].n; maxIdx = i; }
      if (maxN <= 1) break;
      predictions[maxIdx].n--;
      if (predictions[maxIdx].ana.length > 0) predictions[maxIdx].ana.pop();
      else predictions[maxIdx].honmei.pop();
      combos = predictions.reduce((p, pred) => p * pred.n, 1); cost = combos * 100;
    }
    console.log(`  → 調整後: ¥${cost.toLocaleString()}\n`);
  }

  // ── 出力 ──
  console.log('═'.repeat(60));
  console.log(`  === WIN5予想 ${targetDate} ===`);
  console.log('═'.repeat(60));

  for (const p of predictions) {
    const r = p.race;
    const time = r.post_time ? toJST(r.post_time) : '';
    const gradeStr = r.grade ? ` [${r.grade}]` : '';
    console.log(`\n  Leg${p.leg}: ${time} ${r.course_name}R${r.race_number} ${r.name || ''}${gradeStr} [${p.emoji} ${p.level}] (難易度${p.dScore}, ${p.headCount}頭)`);

    const marks = ['◎', '○', '▲'];
    for (let j = 0; j < p.honmei.length; j++) {
      const c = p.honmei[j];
      console.log(`    ${marks[j] || '△'} ${String(c.umaban).padStart(2)}番 ${(c.horseName || '').padEnd(14)} IDM:${String(c.idm||'?').padStart(4)} odds:${String(c.odds||'?').padStart(5)} (${c.jockeyName || ''})`);
    }
    for (const c of p.ana) {
      const sireTag = c.sireBoost ? ` 🧬${c.sireBoost}` : '';
      console.log(`    ★ ${String(c.umaban).padStart(2)}番 ${(c.horseName || '').padEnd(14)} IDM:${String(c.idm||'?').padStart(4)} odds:${String(c.odds||'?').padStart(5)} kaz:${c.kazScore}${sireTag} (${c.jockeyName || ''})`);
    }
  }

  console.log(`\n  ─────────────────────────`);
  console.log(`  組み合わせ: ${predictions.map(p => p.n).join(' × ')} = ${combos}`);
  console.log(`  費用: ¥${cost.toLocaleString()}`);
  console.log(`  難易度: ${predictions.map(p => p.emoji).join('')} (Hard=${hardCount}, 頭数=${totalHeadCount})`);
  if (shouldSkip) console.log('  ⚠️  見送り推奨だが --force で続行');
  console.log('═'.repeat(60));

  // ── Supabase保存 ──
  if (args.save) {
    console.log('\n📝 保存中...');
    for (const p of predictions) {
      const allCands = [...p.honmei.map(c => ({ umaban: c.umaban, horse_name: c.horseName, type: 'honmei', score: c.score, idm: c.idm, odds: c.odds })),
                        ...p.ana.map(c => ({ umaban: c.umaban, horse_name: c.horseName, type: 'ana', kaz_score: c.kazScore, sire: c.sire, sire_boost: c.sireBoost, idm: c.idm, odds: c.odds }))];
      const row = {
        race_date: targetDate, leg_number: p.leg,
        jrdb_race_key: p.raceKey, difficulty_score: p.dScore, difficulty_level: p.level,
        candidates: JSON.stringify(allCands),
        pattern_type: 'hybrid-sire', model_version: 'v3.1-sire',
        total_combinations: p.leg === 1 ? combos : null, total_cost: p.leg === 1 ? cost : null,
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/win5_predictions?on_conflict=race_date,leg_number,model_version`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([row]),
      });
      if (!res.ok) console.error(`  Leg${p.leg}: ${await res.text()}`);
    }
    console.log('✅ 保存完了');
  }

  // ── JSON出力 ──
  const outDir = path.join(process.cwd(), 'win5-data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `win5-prediction-${targetDate}.json`);
  fs.writeFileSync(outFile, JSON.stringify({
    date: targetDate, model: 'v3.1-sire', budgetCap: BUDGET_CAP, skipped: false,
    predictions: predictions.map(p => ({
      leg: p.leg, course: p.race.course_name, raceNumber: p.race.race_number,
      raceName: p.race.name, postTime: p.race.post_time,
      difficulty: { score: p.dScore, level: p.level },
      honmei: p.honmei, ana: p.ana, headCount: p.headCount,
    })),
    totalCombinations: combos, cost,
    skipInfo: { hardCount, totalHeadCount, shouldSkip, forced: shouldSkip && args.force },
  }, null, 2));
  console.log(`\n💾 ${outFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });
