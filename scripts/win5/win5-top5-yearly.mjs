#!/usr/bin/env node
/**
 * WIN5 TOP5モデル 年別実績分析
 */
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
  return Math.min((idms[0]-idms[1])*8,100)*0.25 + Math.max(0,(18-entries.length)*8)*0.20
    + hhi*400*0.25 + Math.max(0,(10-(odds[0]||1))*12)*0.15 + Math.min(((odds[1]||0)-(odds[0]||0))*8,100)*0.15;
}

function selectCands(entries, hN, aN) {
  const comp = entries.map(e => ({ u: e.umaban, s: compositeScore(e, entries) })).sort((a, b) => b.s - a.s);
  const kaz = entries.map(e => ({ u: e.umaban, s: kazanScore(e, entries) })).sort((a, b) => b.s - a.s);
  const hSet = new Set(comp.slice(0, hN).map(x => x.u));
  const aF = kaz.filter(x => x.s > 0 && !hSet.has(x.u)).slice(0, aN).map(x => x.u);
  return [...hSet, ...aF];
}

// TOP5モデル定義
const TOP5 = [
  { name: 'E: E本命H穴3 ★推奨', allocs: [{h:1,a:0},{h:2,a:0},{h:2,a:1},{h:2,a:3}] },
  { name: 'C: E少H多',          allocs: [{h:1,a:0},{h:2,a:0},{h:2,a:1},{h:2,a:2}] },
  { name: 'D: E本命H穴多',       allocs: [{h:1,a:0},{h:2,a:1},{h:2,a:1},{h:2,a:2}] },
  { name: 'K: Easy0穴Hard穴多',  allocs: [{h:1,a:0},{h:2,a:0},{h:2,a:2},{h:3,a:3}] },
  { name: 'H: 本命重視+穴少',     allocs: [{h:2,a:0},{h:2,a:0},{h:3,a:1},{h:3,a:1}] },
];

const CAP = 15000;

function runYearly(daily, allocs) {
  const mapping = [
    { ms: 48, h: allocs[0].h, a: allocs[0].a },
    { ms: 40, h: allocs[1].h, a: allocs[1].a },
    { ms: 33, h: allocs[2].h, a: allocs[2].a },
    { ms: 0,  h: allocs[3].h, a: allocs[3].a },
  ];

  const yearly = {};

  for (const [date, dayLegs] of daily) {
    if (dayLegs.length !== 5) continue;
    const year = date.slice(0, 4);
    if (!yearly[year]) yearly[year] = { days: 0, legHits: 0, totalLegs: 0, win5: 0, cost: 0, payout: 0, hitPayouts: [] };
    const y = yearly[year];
    y.days++;

    const plans = dayLegs.map(leg => {
      const ds = calcDifficulty(leg.entries);
      let h = 2, a = 1;
      for (const m of mapping) { if (ds >= m.ms) { h = m.h; a = m.a; break; } }
      const c = selectCands(leg.entries, h, a);
      return { leg, c, n: c.length };
    });

    let combo = plans.reduce((p, l) => p * l.n, 1), cost = combo * 100;
    if (cost > CAP) {
      while (cost > CAP) {
        let mi=-1,mn=0;
        for (let i=0;i<plans.length;i++) if(plans[i].n>mn){mn=plans[i].n;mi=i;}
        if(mn<=1)break;
        plans[mi].n--;plans[mi].c=plans[mi].c.slice(0,plans[mi].n);
        combo=plans.reduce((p,l)=>p*l.n,1);cost=combo*100;
      }
    }

    y.cost += cost;
    let dh = 0;
    for (const p of plans) {
      y.totalLegs++;
      if (p.c.includes(p.leg.winning_umaban)) { y.legHits++; dh++; }
    }
    if (dh === 5 && dayLegs[0].payout) {
      y.win5++;
      y.payout += dayLegs[0].payout;
      y.hitPayouts.push({ date, payout: dayLegs[0].payout });
    }
  }

  return yearly;
}

async function main() {
  console.log('\n🏆 WIN5 TOP5モデル 年別実績分析 (¥15Kキャップ)\n');

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
  console.log(`\n  対象: ${races.length}レッグ\n`);

  const years = [...new Set(races.map(r => r.race_date.slice(0, 4)))].sort();

  for (const model of TOP5) {
    const yearly = runYearly(daily, model.allocs);

    console.log('\n' + '═'.repeat(85));
    console.log(`  ${model.name}`);
    console.log(`  配分: Easy=${model.allocs[0].h}本${model.allocs[0].a}穴 / MedE=${model.allocs[1].h}本${model.allocs[1].a}穴 / MedH=${model.allocs[2].h}本${model.allocs[2].a}穴 / Hard=${model.allocs[3].h}本${model.allocs[3].a}穴`);
    console.log('═'.repeat(85));

    console.log('\n  年    | 日数 | レッグ率 | WIN5 | 年コスト      | 年配当          | 年利益          | ROI');
    console.log('  ' + '-'.repeat(80));

    let totalDays = 0, totalLH = 0, totalTL = 0, totalW5 = 0, totalC = 0, totalP = 0;

    for (const year of years) {
      const y = yearly[year];
      if (!y) continue;
      const lr = y.totalLegs ? (y.legHits/y.totalLegs*100).toFixed(1) : '0';
      const roi = y.cost > 0 ? Math.round(y.payout / y.cost * 100) : 0;
      const profit = y.payout - y.cost;
      console.log(`  ${year}  | ${String(y.days).padStart(3)}  | ${lr.padStart(5)}%  | ${String(y.win5).padStart(3)}  | ¥${y.cost.toLocaleString().padStart(10)} | ¥${y.payout.toLocaleString().padStart(14)} | ¥${profit.toLocaleString().padStart(13)} | ${String(roi).padStart(5)}%`);

      totalDays += y.days; totalLH += y.legHits; totalTL += y.totalLegs;
      totalW5 += y.win5; totalC += y.cost; totalP += y.payout;
    }

    const totalProfit = totalP - totalC;
    console.log('  ' + '-'.repeat(80));
    console.log(`  合計  | ${String(totalDays).padStart(3)}  | ${(totalLH/totalTL*100).toFixed(1).padStart(5)}%  | ${String(totalW5).padStart(3)}  | ¥${totalC.toLocaleString().padStart(10)} | ¥${totalP.toLocaleString().padStart(14)} | ¥${totalProfit.toLocaleString().padStart(13)} | ${String(totalC > 0 ? Math.round(totalP/totalC*100) : 0).padStart(5)}%`);

    // WIN5的中した日の詳細
    const allHits = [];
    for (const y of Object.values(yearly)) allHits.push(...y.hitPayouts);
    if (allHits.length > 0) {
      console.log(`\n  💰 WIN5的中日:`);
      allHits.sort((a, b) => a.date.localeCompare(b.date));
      for (const h of allHits) {
        console.log(`    ${h.date}: ¥${h.payout.toLocaleString()}`);
      }
    }

    // 年別で赤字の年
    const lossYears = years.filter(yr => yearly[yr] && yearly[yr].payout - yearly[yr].cost < 0);
    if (lossYears.length > 0) {
      console.log(`\n  ⚠️  赤字年: ${lossYears.join(', ')}`);
    }
    const profitYears = years.filter(yr => yearly[yr] && yearly[yr].payout - yearly[yr].cost > 0);
    console.log(`  ✅ 黒字年: ${profitYears.join(', ')} (${profitYears.length}/${years.length}年)`);
  }

  // ═══════════════════════════════════
  // 横断比較サマリー
  // ═══════════════════════════════════
  console.log('\n\n' + '═'.repeat(85));
  console.log('📊 TOP5モデル 横断比較サマリー');
  console.log('═'.repeat(85));

  console.log('\n  モデル                    | WIN5 | ROI   | 7.4年利益     | 黒字年 | 最大年利益       | 最大年損失');
  console.log('  ' + '-'.repeat(90));

  for (const model of TOP5) {
    const yearly = runYearly(daily, model.allocs);
    let totalW5 = 0, totalC = 0, totalP = 0;
    let maxProfit = -Infinity, maxLoss = Infinity;
    let profitYrs = 0;

    for (const year of years) {
      const y = yearly[year];
      if (!y) continue;
      totalW5 += y.win5; totalC += y.cost; totalP += y.payout;
      const p = y.payout - y.cost;
      if (p > maxProfit) maxProfit = p;
      if (p < maxLoss) maxLoss = p;
      if (p > 0) profitYrs++;
    }

    const roi = totalC > 0 ? Math.round(totalP/totalC*100) : 0;
    console.log(`  ${model.name.padEnd(26)} | ${String(totalW5).padStart(3)}  | ${String(roi).padStart(4)}% | ¥${(totalP-totalC).toLocaleString().padStart(12)} | ${profitYrs}/${years.length}年 | ¥${maxProfit.toLocaleString().padStart(12)} | ¥${maxLoss.toLocaleString().padStart(10)}`);
  }

  console.log('\n' + '═'.repeat(85));
}

main().catch(e => { console.error(e); process.exit(1); });
