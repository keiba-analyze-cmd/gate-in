import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 全レースのJRDBデータ + 結果を取得
const { data: results } = await s.from("race_results")
  .select("race_id, finish_position, race_entries(post_number, odds, horse_id)")
  .order("race_id");

// レースごとにグループ化
const raceResults = new Map();
for (const r of results || []) {
  if (!raceResults.has(r.race_id)) raceResults.set(r.race_id, []);
  raceResults.get(r.race_id).push({
    post_number: r.race_entries?.post_number,
    odds: r.race_entries?.odds,
    finish: r.finish_position,
  });
}

// JRDBエントリーをレースごとに取得
const { data: jrdbEntries } = await s.from("jrdb_race_entries")
  .select("race_key, umaban, horse_name, idm, jockey_index, sogo_index, base_odds, base_popularity, ten_index, agari_index, position_index, sire_name")
  .order("race_key");

const jrdbByRace = new Map();
for (const e of jrdbEntries || []) {
  if (!jrdbByRace.has(e.race_key)) jrdbByRace.set(e.race_key, []);
  jrdbByRace.get(e.race_key).push(e);
}

// race_key → race_id マッピング
const { data: races } = await s.from("races")
  .select("id, external_id")
  .not("external_id", "is", null);

const raceKeyToId = new Map();
for (const race of races || []) {
  const eid = race.external_id;
  if (eid?.length >= 12) {
    const rk = eid.slice(4,6) + eid.slice(2,4) + eid.slice(7,8) + eid.slice(9,10) + eid.slice(10,12);
    raceKeyToId.set(rk, race.id);
  }
}

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
  const roi = total > 0 ? (totalReturn / total * 100).toFixed(1) : 0;
  console.log(`  ${name}: ${total}R | 勝率${(wins/total*100||0).toFixed(1)}% | 複勝${(places/total*100||0).toFixed(1)}% | 回収率${roi}% | ${wins}勝 avgOdds${wins>0?(totalReturn/wins).toFixed(1):'-'}`);
  return { total, wins, places, roi: parseFloat(roi) };
}

console.log("=== ハヤテ改善案 ===");
// 現行
evaluate("現行(IDM*0.8+騎手*0.2)", e => {
  const sorted = e.filter(x => x.idm!=null).sort((a,b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2));
  return sorted[0];
});
// 案1: 最低オッズ2倍フィルタ
evaluate("案1: +odds>=2.0", e => {
  const sorted = e.filter(x => x.idm!=null && (x.base_odds||99)>=2.0).sort((a,b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2));
  return sorted[0];
});
// 案2: IDM1位と2位の差が3以上のみ
evaluate("案2: IDM差>=3のみ", e => {
  const sorted = e.filter(x => x.idm!=null).sort((a,b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2));
  if (sorted.length < 2) return sorted[0];
  const s1 = (sorted[0].idm||0)*0.8+(sorted[0].jockey_index||0)*0.2;
  const s2 = (sorted[1].idm||0)*0.8+(sorted[1].jockey_index||0)*0.2;
  return (s1 - s2) >= 3 ? sorted[0] : null;
});
// 案3: IDM*0.6+騎手*0.2+調教*0.2
evaluate("案3: +調教指数", e => {
  const sorted = e.filter(x => x.idm!=null).sort((a,b) => ((b.idm||0)*0.6+(b.jockey_index||0)*0.2+(b.training_index||0)*0.2)-((a.idm||0)*0.6+(a.jockey_index||0)*0.2+(a.training_index||0)*0.2));
  return sorted[0];
});
// 案4: odds加味 IDM*0.7+騎手*0.15+log(odds)*0.15
evaluate("案4: +log(odds)", e => {
  const sorted = e.filter(x => x.idm!=null && (x.base_odds||0)>0).sort((a,b) => ((b.idm||0)*0.7+(b.jockey_index||0)*0.15+Math.log(b.base_odds||1)*5*0.15)-((a.idm||0)*0.7+(a.jockey_index||0)*0.15+Math.log(a.base_odds||1)*5*0.15));
  return sorted[0];
});

console.log("\n=== カザン改善案 ===");
// 現行
evaluate("現行(IDM3-6位*ln(odds),odds>=3)", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(2, 6).filter(x => (x.base_odds||0) >= 3);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});
// 案1: odds>=5に引き上げ
evaluate("案1: odds>=5", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(2, 6).filter(x => (x.base_odds||0) >= 5);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});
// 案2: IDM2-5位, odds>=5
evaluate("案2: IDM2-5位,odds>=5", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(1, 5).filter(x => (x.base_odds||0) >= 5);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});
// 案3: IDM3-8位, odds>=5, 複勝圏狙い
evaluate("案3: IDM3-8位,odds>=5", e => {
  const bi = e.filter(x => x.idm!=null).sort((a,b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(2, 8).filter(x => (x.base_odds||0) >= 5);
  if (!mid.length) return null;
  mid.sort((a,b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
  return mid[0];
});

console.log("\n=== ヒバリ改善案 ===");
// 現行
evaluate("現行(テン*0.3+上がり*0.4+位置*0.3)", e => {
  const scored = e.filter(x => x.idm!=null).map(x => ({...x, hs: (x.ten_index||0)*0.3+(x.agari_index||0)*0.4+(x.position_index||0)*0.3})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
// 案1: +IDM*0.2で安定化
evaluate("案1: テン*0.2+上がり*0.3+位置*0.2+IDM*0.3", e => {
  const scored = e.filter(x => x.idm!=null).map(x => ({...x, hs: (x.ten_index||0)*0.2+(x.agari_index||0)*0.3+(x.position_index||0)*0.2+(x.idm||0)*0.3})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
// 案2: 上がり重視+odds>=2
evaluate("案2: 上がり*0.5+位置*0.3+テン*0.2,odds>=2", e => {
  const scored = e.filter(x => x.idm!=null && (x.base_odds||99)>=2).map(x => ({...x, hs: (x.ten_index||0)*0.2+(x.agari_index||0)*0.5+(x.position_index||0)*0.3})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
// 案3: 上がり*0.4+IDM*0.3+テン*0.3, odds>=2.5
evaluate("案3: 上がり*0.4+IDM*0.3+テン*0.3,odds>=2.5", e => {
  const scored = e.filter(x => x.idm!=null && (x.base_odds||99)>=2.5).map(x => ({...x, hs: (x.ten_index||0)*0.3+(x.agari_index||0)*0.4+(x.idm||0)*0.3})).sort((a,b) => b.hs-a.hs);
  return scored[0];
});
