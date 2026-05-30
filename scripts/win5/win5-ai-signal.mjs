#!/usr/bin/env node
/**
 * AI予想家5体のシグナルをWIN5レッグで分析
 * 各予想家の◎一致度と的中率の関係を検証
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌'); process.exit(1); }
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

const CC = { '札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05','中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10' };

// AI予想家5体の◎選出ロジック（バックテスト用シミュレーション）
function hayatePick(entries) { // IDM*0.8 + 騎手*0.2
  return entries.map(e => ({ u: e.umaban, s: (e.idm||0)*0.8 + (e.jockey_index||0)*0.2 })).sort((a,b) => b.s-a.s)[0]?.u;
}
function gantetsuPick(entries) { // 総合差8+で厳選（IDM1位-2位≥8なら1位を◎）
  const sorted = [...entries].sort((a,b) => (b.idm||0)-(a.idm||0));
  if (sorted.length < 2) return null;
  return (sorted[0].idm||0) - (sorted[1].idm||0) >= 8 ? sorted[0].umaban : null;
}
function kazanPick(entries) { // IDM3-6位 × ln(odds), odds≥5
  const sorted = [...entries].sort((a,b) => (b.idm||0)-(a.idm||0));
  return sorted.map((e, i) => {
    const rank = i + 1;
    if (rank <= 2 || rank > 6 || (e.base_odds||0) < 5) return { u: e.umaban, s: 0 };
    return { u: e.umaban, s: (e.idm||0) * Math.log(e.base_odds||1) };
  }).sort((a,b) => b.s-a.s)[0]?.u;
}
function hakusenPick(entries, sireMap, horseMap, cc) { // 父条件×IDM
  return entries.map(e => {
    const sire = horseMap.get(e.horse_code);
    const stats = sire ? sireMap.get(`${sire}|${cc}`) : null;
    const sireBoost = (stats && stats.runs >= 10) ? (1 + (stats.place_rate||0)) : 1;
    return { u: e.umaban, s: (e.idm||0) * sireBoost };
  }).sort((a,b) => b.s-a.s)[0]?.u;
}
function hibariPick(entries) { // テン*0.2+上がり*0.3+位置*0.2+IDM*0.3
  return entries.map(e => ({
    u: e.umaban,
    s: (e.ten_index||0)*0.2 + (e.agari_index||0)*0.3 + (e.position_index||0)*0.2 + (e.idm||0)*0.3
  })).sort((a,b) => b.s-a.s)[0]?.u;
}

async function main() {
  console.log('\n🤖 AI予想家5体 × WIN5 シグナル分析\n');

  // データ読込
  const [allStats, allHorses] = await Promise.all([
    queryAll('sire_course_distance_stats?select=sire_name,course_code,runs,place_rate'),
    queryAll('jrdb_horses?select=horse_code,sire_name'),
  ]);
  const sireMap = new Map();
  for (const s of allStats) sireMap.set(`${s.sire_name}|${s.course_code}`, s);
  const horseMap = new Map();
  for (const h of allHorses) horseMap.set(h.horse_code, h.sire_name);

  const legs = await queryAll('win5_results?select=race_date,leg_number,course_name,race_number,winning_umaban,winning_odds,winning_popularity,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,horse_code,idm,jockey_index,base_odds,ten_index,agari_index,position_index&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }
  console.log(`\n  対象: ${legs.length}レッグ\n`);

  // 各レッグで5体の◎を算出
  const agreementStats = { 5:{total:0,win:0}, 4:{total:0,win:0}, 3:{total:0,win:0}, 2:{total:0,win:0}, 1:{total:0,win:0}, 0:{total:0,win:0} };
  const predictorStats = { hayate:{total:0,win:0}, gantetsu:{picks:0,win:0,skip:0}, kazan:{total:0,win:0}, hakusen:{total:0,win:0}, hibari:{total:0,win:0} };
  // 一致馬が勝つ確率（一致度別）
  const consensusWinRate = {};
  // コンポジットの◎と一致度の関係
  let compositeMatchCount = 0;

  for (const leg of legs) {
    const entries = jrdb.get(leg.jrdb_race_key) || [];
    if (entries.length < 3) continue;
    const cc = CC[leg.course_name];

    // 5体の◎
    const picks = {
      hayate: hayatePick(entries),
      gantetsu: gantetsuPick(entries),
      kazan: kazanPick(entries),
      hakusen: hakusenPick(entries, sireMap, horseMap, cc),
      hibari: hibariPick(entries),
    };

    // 本命系（ハヤテ/ガンテツ/ハクセン/ヒバリ）の一致度
    const honmeiPicks = [picks.hayate, picks.gantetsu, picks.hakusen, picks.hibari].filter(Boolean);
    
    // 最頻出馬番を特定
    const freq = {};
    for (const p of honmeiPicks) freq[p] = (freq[p]||0) + 1;
    const maxFreq = Math.max(...Object.values(freq), 0);
    const consensusHorse = Object.entries(freq).filter(([,v]) => v === maxFreq).map(([k]) => parseInt(k));
    
    // 全5体での一致度（カザンは穴馬なので別扱い）
    const allPicks = Object.values(picks).filter(Boolean);
    const allFreq = {};
    for (const p of allPicks) allFreq[p] = (allFreq[p]||0) + 1;
    const maxAllFreq = Math.max(...Object.values(allFreq), 0);
    const isWin = consensusHorse.includes(leg.winning_umaban);

    agreementStats[maxFreq] = agreementStats[maxFreq] || {total:0,win:0};
    agreementStats[maxFreq].total++;
    if (allPicks.some(p => p === leg.winning_umaban)) { /* any predictor hit */ }

    // 本命一致度と、一致馬の勝率
    if (!consensusWinRate[maxFreq]) consensusWinRate[maxFreq] = {total:0,win:0};
    consensusWinRate[maxFreq].total++;
    if (isWin) consensusWinRate[maxFreq].win++;

    // 個別予想家の成績
    for (const [name, pick] of Object.entries(picks)) {
      if (name === 'gantetsu') {
        if (pick !== null) { predictorStats.gantetsu.picks++; if (pick === leg.winning_umaban) predictorStats.gantetsu.win++; }
        else predictorStats.gantetsu.skip++;
      } else {
        predictorStats[name].total++;
        if (pick === leg.winning_umaban) predictorStats[name].win++;
      }
    }

    // 現行コンポジットの◎
    const compSorted = entries.map(e => {
      const sorted = [...entries].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
      const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
      return { u: e.umaban, s: (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((entries.length-rank+1)/entries.length*100)*0.3 };
    }).sort((a,b) => b.s-a.s);
    if (compSorted[0]?.u === leg.winning_umaban) compositeMatchCount++;
  }

  // 結果表示
  console.log('═'.repeat(60));
  console.log('📊 分析1: 各予想家の単独◎勝率');
  console.log('═'.repeat(60));
  console.log('\n  予想家     | 予想数 | 的中  | 勝率    | 備考');
  console.log('  ' + '-'.repeat(55));
  for (const [name, s] of Object.entries(predictorStats)) {
    if (name === 'gantetsu') {
      console.log(`  ガンテツ     | ${String(s.picks).padStart(5)}  | ${String(s.win).padStart(4)}  | ${s.picks>0?(s.win/s.picks*100).toFixed(1):'0'}%   | ${s.skip}回見送り`);
    } else {
      const label = { hayate:'ハヤテ', kazan:'カザン', hakusen:'ハクセン', hibari:'ヒバリ' }[name];
      console.log(`  ${(label||name).padEnd(8)}   | ${String(s.total).padStart(5)}  | ${String(s.win).padStart(4)}  | ${(s.win/s.total*100).toFixed(1)}%   |`);
    }
  }
  console.log(`  コンポジット   | ${legs.length}  | ${compositeMatchCount}  | ${(compositeMatchCount/legs.length*100).toFixed(1)}%   | 現行WIN5モデル`);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 分析2: 本命4体の一致度と勝率');
  console.log('  （ハヤテ/ガンテツ/ハクセン/ヒバリの◎一致数）');
  console.log('═'.repeat(60));
  console.log('\n  一致数 | レッグ数 | 一致馬勝利 | 勝率    | 意味');
  console.log('  ' + '-'.repeat(60));
  for (let n = 4; n >= 1; n--) {
    const s = consensusWinRate[n];
    if (!s || s.total === 0) continue;
    const meaning = n >= 4 ? '鉄板' : n === 3 ? '強い合意' : n === 2 ? '意見分裂' : '全員バラバラ';
    console.log(`  ${n}体一致 | ${String(s.total).padStart(6)}  | ${String(s.win).padStart(5)}      | ${(s.win/s.total*100).toFixed(1).padStart(5)}%  | ${meaning}`);
  }

  // 一致度×WIN5での活用方法
  console.log('\n' + '═'.repeat(60));
  console.log('📊 分析3: 一致度のWIN5活用シミュレーション');
  console.log('  一致度が高い→候補を1頭に絞る（コスト削減）');
  console.log('═'.repeat(60));

  // 日別でシミュレーション
  const daily = new Map();
  for (const leg of legs) { if (!daily.has(leg.race_date)) daily.set(leg.race_date, []); daily.get(leg.race_date).push(leg); }

  // 一致度3+のレッグで候補を1頭に絞った場合のコスト削減効果
  let narrowDays = 0, narrowCost = 0, narrowWin5 = 0, narrowPayout = 0;
  let baseDays = 0, baseCost = 0, baseWin5 = 0, basePayout = 0;

  for (const [date, dayLegs] of daily) {
    if (dayLegs.length !== 5) continue;
    baseDays++; narrowDays++;

    let baseCombo = 1, narrowCombo = 1;
    let baseHits = 0, narrowHits = 0;

    for (const leg of dayLegs) {
      const entries = jrdb.get(leg.jrdb_race_key) || [];
      if (entries.length < 3) { baseCombo *= 2; narrowCombo *= 2; continue; }
      const cc = CC[leg.course_name];

      // 難易度
      const idms = entries.map(e => e.idm||0).sort((a,b)=>b-a);
      const odds = entries.map(e => e.base_odds||99).filter(o=>o>0).sort((a,b)=>a-b);
      const inv = odds.map(o=>1/o), sum = inv.reduce((s,v)=>s+v,0);
      const hhi = inv.reduce((s,v)=>s+(v/sum)**2,0);
      const ds = Math.min((idms[0]-idms[1])*8,100)*0.25+Math.max(0,(18-entries.length)*8)*0.20+hhi*400*0.25+Math.max(0,(10-(odds[0]||1))*12)*0.15+Math.min(((odds[1]||0)-(odds[0]||0))*8,100)*0.15;

      // ベースライン（現行v3.1）
      let bH=2,bA=1;
      if(ds>=48){bH=1;bA=0}else if(ds>=40){bH=2;bA=0}else if(ds>=33){bH=2;bA=1}else{bH=2;bA=3}

      // 予想家の◎
      const picks = [hayatePick(entries), gantetsuPick(entries), hakusenPick(entries,sireMap,horseMap,cc), hibariPick(entries)].filter(Boolean);
      const freq = {};
      for (const p of picks) freq[p] = (freq[p]||0)+1;
      const maxFreq = Math.max(...Object.values(freq),0);
      const consensus = Object.entries(freq).filter(([,v])=>v===maxFreq).map(([k])=>parseInt(k))[0];

      // ナローモデル: 一致度3+かつEasy/Med-Easyなら1頭に絞る
      let nH = bH, nA = bA;
      if (maxFreq >= 3 && ds >= 40) { nH = 1; nA = 0; }

      // コンポジットtop
      const compSorted = entries.map(e => {
        const sorted = [...entries].sort((a,b)=>(a.base_odds||999)-(b.base_odds||999));
        const rank = sorted.findIndex(x=>x.umaban===e.umaban)+1;
        return { u:e.umaban, s:(e.idm||0)*0.5+(e.jockey_index||0)*0.2+((entries.length-rank+1)/entries.length*100)*0.3 };
      }).sort((a,b)=>b.s-a.s);

      const baseCands = compSorted.slice(0,bH).map(x=>x.u);
      baseCombo *= Math.max(baseCands.length + bA, 1);
      if (baseCands.includes(leg.winning_umaban)) baseHits++;

      // ナロー: 一致度高→コンセンサス馬を使う
      let narrowCands;
      if (maxFreq >= 3 && ds >= 40 && consensus) {
        narrowCands = [consensus];
      } else {
        narrowCands = compSorted.slice(0,nH).map(x=>x.u);
      }
      narrowCombo *= Math.max(narrowCands.length + nA, 1);
      if (narrowCands.includes(leg.winning_umaban)) narrowHits++;
    }

    baseCost += Math.min(baseCombo, 150) * 100;
    narrowCost += Math.min(narrowCombo, 150) * 100;
    if (baseHits === 5 && dayLegs[0].payout) { baseWin5++; basePayout += dayLegs[0].payout; }
    if (narrowHits === 5 && dayLegs[0].payout) { narrowWin5++; narrowPayout += dayLegs[0].payout; }
  }

  console.log(`\n  現行v3.1:     WIN5 ${baseWin5}回 | コスト ¥${baseCost.toLocaleString()} | ROI ${baseCost>0?Math.round(basePayout/baseCost*100):0}%`);
  console.log(`  一致度ナロー:   WIN5 ${narrowWin5}回 | コスト ¥${narrowCost.toLocaleString()} | ROI ${narrowCost>0?Math.round(narrowPayout/narrowCost*100):0}%`);
  console.log(`  コスト削減: ¥${(baseCost-narrowCost).toLocaleString()} (${((baseCost-narrowCost)/baseCost*100).toFixed(1)}%)`);

  console.log('\n═══ 完了 ═══');
}
main().catch(e => { console.error(e); process.exit(1); });
