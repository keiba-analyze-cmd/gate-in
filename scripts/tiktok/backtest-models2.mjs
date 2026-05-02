import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// JRDBエントリーを全件取得（ページネーション）
async function fetchAll(table, select, filters = {}) {
  let all = [], offset = 0;
  while (true) {
    let q = s.from(table).select(select).range(offset, offset + 999);
    for (const [k, v] of Object.entries(filters)) q = q.not(k, 'is', v);
    const { data } = await q;
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

console.log("データ読み込み中...");
const jrdbEntries = await fetchAll("jrdb_race_entries", "race_key, umaban, horse_name, idm, jockey_index, sogo_index, base_odds, base_popularity, ten_index, agari_index, position_index, sire_name");
console.log(`JRDB entries: ${jrdbEntries.length}`);

const results = await fetchAll("race_results", "race_id, finish_position, race_entries(post_number, odds)");
console.log(`Race results: ${results.length}`);

const races = await fetchAll("races", "id, external_id", {});
const racesWithEid = races.filter(r => r.external_id);
console.log(`Races with external_id: ${racesWithEid.length}`);

// レース結果をrace_idでグループ化
const raceResults = new Map();
for (const r of results) {
  if (!raceResults.has(r.race_id)) raceResults.set(r.race_id, []);
  raceResults.get(r.race_id).push({
    post_number: r.race_entries?.post_number,
    odds: r.race_entries?.odds,
    finish: r.finish_position,
  });
}

// JRDBをrace_keyでグループ化
const jrdbByRace = new Map();
for (const e of jrdbEntries) {
  if (!jrdbByRace.has(e.race_key)) jrdbByRace.set(e.race_key, []);
  jrdbByRace.get(e.race_key).push(e);
}

// race_key → race_id
const raceKeyToId = new Map();
for (const race of racesWithEid) {
  const eid = race.external_id;
  if (eid?.length >= 12) {
    const rk = eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);
    raceKeyToId.set(rk, race.id);
  }
}

// マッチ確認
let matchCount = 0;
for (const rk of jrdbByRace.keys()) {
  const rid = raceKeyToId.get(rk);
  if (rid && raceResults.has(rid)) matchCount++;
}
console.log(`JRDB×結果マッチ: ${matchCount}レース\n`);

function evaluate(name, selector) {
  let total = 0, wins = 0, places = 0, totalReturn = 0;
  for (const [rk, entries] of jrdbByRace) {
    const raceId = raceKeyToId.get(rk);
    if (!raceId) continue;
    const rr = raceResults.get(raceId);
    if (!rr?.length) continue;

    const pick = selector(entries);
    if (!pick) continue;
    total++;

    const result = rr.find(r => r.post_number === pick.umaban);
    if (!result) continue;

    const odds = pick.base_odds || result.odds || 0;
    if (result.finish === 1) { wins++; totalReturn += odds; }
    if (result.finish <= 3) places++;
  }
  const roi = total > 0 ? (totalReturn / total * 100).toFixed(1) : '0';
  console.log(`  ${name}: ${total}R | 勝率${total>0?(wins/total*100).toFixed(1):'0'}% | 複勝${total>0?(places/total*100).toFixed(1):'0'}% | 回収率${roi}% | ${wins}勝`);
}

console.log("=== ハヤテ改善案 ===");
evaluate("現行(IDM*0.8+騎手*0.2)", e => {
  const sorted = e.filter(x => x.idm!=null).sort((a,b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2));
  return sorted[0];
});
evaluate("案1: +odds>=2.0", e => {
  const sorted = e.filter(x => x.idm!=null && (x.base_odds||99)>=2.0).sort((a,b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2));
  return sorted[0];
});
evaluate("案2: IDM差>=3のみ", e => {
  const sorted = e.filter(x => x.idm!=null).sort((a,b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2));
  if (sorted.length < 2) return sorted[0];
  const s1 = (sorted[0].idm||0)*0.8+(sorted[0].jockey_index||0)*0.2;
  const s2 = (sorted[1].idm||0)*0.8+(sorted[1].jockey_index||0)*0.2;
  return (s1 - s2) >= 3 ? sorted[0] : null;
});
evaluate("案3: IDM差>=5のみ", e => {
  const sorted = e.filter(x => x.idm!=null).sort((a,b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2));
  if (sorted.length < 2) return sorted[0];
  const s1 = (sorted[0].idm||0)*0.8+(sorted[0].jockey_index||0)*0.2;
  const s2 = (sorted[1].idm||0)*0.8+(sorted[1].jockey_index||0)*0.2;
  return (s1 - s2) >= 5 ? sorted[0] : null;
});
evaluate("案4: +log(odds)加味", e => {
  const sorted = e.filter(x => x.idm!=null && (x.base_odds||0)>1).sort((a,b) => ((b.idm||0)*0.7+(b.jockey_index||0)*0.15+Math.log(b.base_odds||1)*3)-((a.idm||0)*0.7+(a.jockey_index||0)*0.15+Math.log(a.base_odds||1)*3));
  return sorted[0];
});

console.log("\n=== カザン改善案 ===");
evaluate("現行(IDM3-6位,odds>=3)", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(2, 6).filter(x => (x.base_odds||0) >= 3);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});
evaluate("案1: odds>=5", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(2, 6).filter(x => (x.base_odds||0) >= 5);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});
evaluate("案2: IDM2-5位,odds>=5", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(1, 5).filter(x => (x.base_odds||0) >= 5);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});
evaluate("案3: IDM2-7位,odds>=7", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(1, 7).filter(x => (x.base_odds||0) >= 7);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});

console.log("\n=== ヒバリ改善案 ===");
evaluate("現行(テン*0.3+上がり*0.4+位置*0.3)", e => {
  const scored = e.filter(x => x.idm!=null && (x.ten_index!=null||x.agari_index!=null)).map(x => ({...x, hs: (x.ten_index||0)*0.3+(x.agari_index||0)*0.4+(x.position_index||0)*0.3})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
evaluate("案1: +IDM*0.3", e => {
  const scored = e.filter(x => x.idm!=null).map(x => ({...x, hs: (x.ten_index||0)*0.2+(x.agari_index||0)*0.3+(x.position_index||0)*0.2+(x.idm||0)*0.3})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
evaluate("案2: 上がり重視+odds>=2", e => {
  const scored = e.filter(x => x.idm!=null && (x.base_odds||99)>=2).map(x => ({...x, hs: (x.agari_index||0)*0.5+(x.position_index||0)*0.3+(x.ten_index||0)*0.2})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
evaluate("案3: 上がり*0.4+IDM*0.4+テン*0.2", e => {
  const scored = e.filter(x => x.idm!=null).map(x => ({...x, hs: (x.agari_index||0)*0.4+(x.idm||0)*0.4+(x.ten_index||0)*0.2})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
evaluate("案4: 上がり*0.4+IDM*0.4+テン*0.2,odds>=2.5", e => {
  const scored = e.filter(x => x.idm!=null && (x.base_odds||99)>=2.5).map(x => ({...x, hs: (x.agari_index||0)*0.4+(x.idm||0)*0.4+(x.ten_index||0)*0.2})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
