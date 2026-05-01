const raceId = "202605020311";

// 1. odds_get_form.html（出馬表ページ内のスクリプトから発見）
const formUrl = `https://race.netkeiba.com/odds/odds_get_form.html?type=b1&race_id=${raceId}&rf=shutuba_submenu`;
const formRes = await fetch(formUrl, {
  headers: { "User-Agent": "Mozilla/5.0", "Referer": `https://race.netkeiba.com/odds/index.html?race_id=${raceId}` }
});
const formText = await formRes.text();
console.log("=== odds_get_form.html (type=b1) ===");
console.log("Status:", formRes.status, "Length:", formText.length);
// オッズ数値を探す
const oddsNums = formText.match(/\b\d{1,3}\.\d\b/g) || [];
console.log("Odds found:", [...new Set(oddsNums)].slice(0, 20).join(", "));
console.log("Sample:", formText.slice(0, 500).replace(/\n/g, " "));

// 2. 単勝タイプで
const tanUrl = `https://race.netkeiba.com/odds/odds_get_form.html?type=b1&race_id=${raceId}&housiki=c0`;
const tanRes = await fetch(tanUrl, {
  headers: { "User-Agent": "Mozilla/5.0", "Referer": `https://race.netkeiba.com/odds/index.html?race_id=${raceId}` }
});
const tanText = await tanRes.text();
console.log("\n=== odds_get_form (housiki=c0) ===");
console.log("Status:", tanRes.status, "Length:", tanText.length);
const tanNums = tanText.match(/\b\d{1,3}\.\d\b/g) || [];
console.log("Odds found:", [...new Set(tanNums)].slice(0, 20).join(", "));
