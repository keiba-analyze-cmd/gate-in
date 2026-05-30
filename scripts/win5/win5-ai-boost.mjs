#!/usr/bin/env node
/**
 * AI予想家一致度ブースト × WIN5バックテスト
 * 候補を絞るのではなく、一致度をcompositeScoreに加点
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
const ALLOC = [{ ms:48,h:1,a:0 },{ ms:40,h:2,a:0 },{ ms:33,h:2,a:1 },{ ms:0,h:2,a:3 }];
const CAP = 15000;

// 予想家ピック関数
function hayatePick(entries) { return entries.map(e=>({u:e.umaban,s:(e.idm||0)*0.8+(e.jockey_index||0)*0.2})).sort((a,b)=>b.s-a.s)[0]?.u; }
function gantetsuPick(entries) { const s=[...entries].sort((a,b)=>(b.idm||0)-(a.idm||0)); return s.length>=2&&(s[0].idm||0)-(s[1].idm||0)>=8?s[0].umaban:null; }
function hakusenPick(entries, sireMap, horseMap, cc) {
  return entries.map(e=>{const sire=horseMap.get(e.horse_code);const st=sire?sireMap.get(`${sire}|${cc}`):null;
    return{u:e.umaban,s:(e.idm||0)*(st&&st.runs>=10?1+(st.place_rate||0):1)};}).sort((a,b)=>b.s-a.s)[0]?.u;
}
function hibariPick(entries) { return entries.map(e=>({u:e.umaban,s:(e.ten_index||0)*0.2+(e.agari_index||0)*0.3+(e.position_index||0)*0.2+(e.idm||0)*0.3})).sort((a,b)=>b.s-a.s)[0]?.u; }

// 各馬の一致度を計算（何体が◎に推したか）
function calcAgreement(entries, sireMap, horseMap, cc) {
  const picks = [hayatePick(entries), gantetsuPick(entries), hakusenPick(entries,sireMap,horseMap,cc), hibariPick(entries)].filter(Boolean);
  const freq = {};
  for (const p of picks) freq[p] = (freq[p]||0) + 1;
  return freq; // {umaban: count}
}

function compositeScore(e, all) {
  const sorted = [...all].sort((a, b) => (a.base_odds||999) - (b.base_odds||999));
  const rank = sorted.findIndex(x => x.umaban === e.umaban) + 1;
  return (e.idm||0)*0.5 + (e.jockey_index||0)*0.2 + ((all.length-rank+1)/all.length*100)*0.3;
}
function kazanWithSire(e, all, sireMap, horseMap, cc) {
  const s = [...all].sort((a, b) => (b.idm||0) - (a.idm||0));
  const r = s.findIndex(x => x.umaban === e.umaban) + 1;
  const odds = e.base_odds || 1;
  if (r <= 2 || r > 8 || odds < 5) return 0;
  let base = (e.idm||0) * Math.log(odds);
  const sire = horseMap.get(e.horse_code);
  if (sire && cc) { const st = sireMap.get(`${sire}|${cc}`); if (st && st.runs >= 10) base *= 1 + Math.max(0, st.place_rate - 0.20) * 2.0; }
  return base;
}
function calcDiff(entries) {
  if (!entries || entries.length < 2) return 50;
  const idms = entries.map(e => e.idm||0).sort((a,b) => b-a);
  const odds = entries.map(e => e.base_odds||99).filter(o => o > 0).sort((a,b) => a-b);
  const inv = odds.map(o => 1/o), sum = inv.reduce((s,v) => s+v, 0);
  const hhi = inv.reduce((s,v) => s+(v/sum)**2, 0);
  return Math.min((idms[0]-idms[1])*8,100)*0.25+Math.max(0,(18-entries.length)*8)*0.20+hhi*400*0.25+Math.max(0,(10-(odds[0]||1))*12)*0.15+Math.min(((odds[1]||0)-(odds[0]||0))*8,100)*0.15;
}

function simDay(dayLegs, sireMap, horseMap, boostFn) {
  const plans = dayLegs.map(leg => {
    const ds = calcDiff(leg.entries);
    let h=2,a=1;
    for (const m of ALLOC) { if (ds>=m.ms) { h=m.h; a=m.a; break; } }
    const cc = CC[leg.course_name];
    const agreement = calcAgreement(leg.entries, sireMap, horseMap, cc);

    // 本命: compositeScore + 一致度ブースト
    const comp = leg.entries.map(e => {
      let s = compositeScore(e, leg.entries);
      const agr = agreement[e.umaban] || 0;
      s = boostFn(s, agr, ds);
      return { u: e.umaban, s };
    }).sort((a,b) => b.s-a.s);

    // 穴馬: カザン+血統
    const kaz = leg.entries.map(e => ({ u: e.umaban, s: kazanWithSire(e, leg.entries, sireMap, horseMap, cc) })).sort((a,b) => b.s-a.s);
    const hSet = new Set(comp.slice(0, h).map(x => x.u));
    const c = [...hSet, ...kaz.filter(x => x.s > 0 && !hSet.has(x.u)).slice(0, a).map(x => x.u)];
    return { leg, c, n: c.length, ds };
  });

  let combo = plans.reduce((p,l)=>p*l.n,1), cost = combo*100;
  if (cost > CAP) {
    while (cost > CAP) {
      let mi=-1,mn=0;
      for (let i=0;i<plans.length;i++) if(plans[i].n>mn){mn=plans[i].n;mi=i;}
      if (mn<=1) break;
      plans[mi].n--; plans[mi].c=plans[mi].c.slice(0,plans[mi].n);
      combo=plans.reduce((p,l)=>p*l.n,1); cost=combo*100;
    }
  }
  let hits=0;
  for (const p of plans) if (p.c.includes(p.leg.winning_umaban)) hits++;
  const hardCount = plans.filter(p=>p.ds<33).length;
  const totalHead = plans.reduce((s,p)=>s+p.leg.entries.length,0);
  const shouldSkip = hardCount>=3 && totalHead>75;
  const payout = (hits===5 && dayLegs[0].payout) ? dayLegs[0].payout : 0;
  return { cost, payout, win5: hits===5&&payout>0, shouldSkip };
}

async function main() {
  console.log('\n🤖 AI予想家一致度ブースト × WIN5バックテスト\n');

  const [allStats, allHorses] = await Promise.all([
    queryAll('sire_course_distance_stats?select=sire_name,course_code,runs,place_rate'),
    queryAll('jrdb_horses?select=horse_code,sire_name'),
  ]);
  const sireMap = new Map(); for (const s of allStats) sireMap.set(`${s.sire_name}|${s.course_code}`, s);
  const horseMap = new Map(); for (const h of allHorses) horseMap.set(h.horse_code, h.sire_name);

  const legs = await queryAll('win5_results?select=race_date,leg_number,course_name,race_number,winning_umaban,jrdb_race_key,payout&jrdb_race_key=not.is.null&order=race_date.asc,leg_number.asc');
  const raceKeys = [...new Set(legs.map(l => l.jrdb_race_key))];
  const jrdb = new Map();
  for (let i = 0; i < raceKeys.length; i += 60) {
    const batch = raceKeys.slice(i, i + 60);
    const entries = await queryAll(`jrdb_race_entries?select=race_key,umaban,horse_code,idm,jockey_index,base_odds,ten_index,agari_index,position_index&race_key=in.(${batch.join(',')})`);
    for (const e of entries) { if (!jrdb.has(e.race_key)) jrdb.set(e.race_key, []); jrdb.get(e.race_key).push(e); }
    process.stdout.write(`  JRDB: ${Math.min(i+60, raceKeys.length)}/${raceKeys.length}\r`);
  }
  const races = legs.map(l => ({ ...l, entries: jrdb.get(l.jrdb_race_key)||[] })).filter(r => r.entries.length > 0);
  const daily = new Map();
  for (const r of races) { if (!daily.has(r.race_date)) daily.set(r.race_date, []); daily.get(r.race_date).push(r); }
  console.log(`\n  対象: ${races.length}レッグ (${[...daily].filter(([,l])=>l.length===5).length}日)\n`);

  const variants = [
    { name: 'ベースライン（v3.1）',    fn: (s, agr, ds) => s },
    { name: 'A: 一致+5/体',          fn: (s, agr, ds) => s + agr * 5 },
    { name: 'B: 一致+10/体',         fn: (s, agr, ds) => s + agr * 10 },
    { name: 'C: 一致+15/体',         fn: (s, agr, ds) => s + agr * 15 },
    { name: 'D: 3体+→+20',          fn: (s, agr, ds) => agr >= 3 ? s + 20 : s },
    { name: 'E: 3体+→+30',          fn: (s, agr, ds) => agr >= 3 ? s + 30 : s },
    { name: 'F: 一致×1.1^n',         fn: (s, agr, ds) => s * Math.pow(1.1, agr) },
    { name: 'G: 一致×1.15^n',        fn: (s, agr, ds) => s * Math.pow(1.15, agr) },
    { name: 'H: 一致×1.2^n',         fn: (s, agr, ds) => s * Math.pow(1.2, agr) },
    { name: 'I: Easy限定 一致+10',    fn: (s, agr, ds) => ds >= 40 ? s + agr * 10 : s },
    { name: 'J: Hard限定 一致+10',    fn: (s, agr, ds) => ds < 33 ? s + agr * 10 : s },
    { name: 'K: 不一致ペナルティ',      fn: (s, agr, ds) => agr === 0 ? s * 0.85 : s + agr * 5 },
  ];

  console.log('═'.repeat(80));
  console.log('📊 一致度ブーストバリエーション比較');
  console.log('═'.repeat(80));

  console.log('\n  見送りなし:');
  console.log('  モデル                   | WIN5 | コスト      | 配当          | ROI    | 利益');
  console.log('  ' + '-'.repeat(80));

  const results = [];
  for (const v of variants) {
    let days=0,win5=0,totalCost=0,totalPayout=0;
    for (const [,dayLegs] of daily) {
      if (dayLegs.length!==5) continue; days++;
      const r = simDay(dayLegs, sireMap, horseMap, v.fn);
      totalCost+=r.cost; totalPayout+=r.payout; if(r.win5) win5++;
    }
    const roi = totalCost>0?Math.round(totalPayout/totalCost*100):0;
    results.push({ name:v.name, days, win5, totalCost, totalPayout, roi, profit:totalPayout-totalCost });
    console.log(`  ${v.name.padEnd(24)} | ${String(win5).padStart(3)}  | ¥${totalCost.toLocaleString().padStart(10)} | ¥${totalPayout.toLocaleString().padStart(12)} | ${String(roi).padStart(5)}% | ¥${(totalPayout-totalCost).toLocaleString()}`);
  }

  // 見送り込み
  console.log('\n  見送り込み（Hard≥3 AND 頭数>75）:');
  console.log('  モデル                   | WIN5 | 見逃し | ROI    | 利益');
  console.log('  ' + '-'.repeat(65));

  for (const v of variants) {
    let days=0,win5=0,totalCost=0,totalPayout=0,missed=0;
    for (const [,dayLegs] of daily) {
      if (dayLegs.length!==5) continue;
      const r = simDay(dayLegs, sireMap, horseMap, v.fn);
      if (r.shouldSkip) { if(r.win5) missed++; continue; }
      days++; totalCost+=r.cost; totalPayout+=r.payout; if(r.win5) win5++;
    }
    const roi = totalCost>0?Math.round(totalPayout/totalCost*100):0;
    console.log(`  ${v.name.padEnd(24)} | ${String(win5).padStart(3)}  | ${String(missed).padStart(4)}   | ${String(roi).padStart(5)}% | ¥${(totalPayout-totalCost).toLocaleString()}`);
  }

  console.log('\n═══ 完了 ═══');
}
main().catch(e => { console.error(e); process.exit(1); });
