import iconv from "iconv-lite";

const raceId = "202605020311";

// 1. netkeiba API を再チェック（発売開始後）
const apiUrl = `https://race.netkeiba.com/api/api_get_jra_odds.html?race_id=${raceId}&type=1`;
const apiRes = await fetch(apiUrl, {
  headers: { "User-Agent": "Mozilla/5.0" }
});
const apiText = await apiRes.text();
console.log("=== netkeiba API ===");
console.log(apiText.slice(0, 500));

// 2. オッズページのscriptタグからJSON/変数を探す
const oddsUrl = `https://race.netkeiba.com/odds/index.html?race_id=${raceId}&type=b1`;
const oddsRes = await fetch(oddsUrl, {
  headers: { "User-Agent": "Mozilla/5.0" }
});
const oddsBuf = Buffer.from(await oddsRes.arrayBuffer());
const oddsHtml = iconv.decode(oddsBuf, "EUC-JP");

// scriptタグ内のオッズデータを探す
const scriptMatches = oddsHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
console.log(`\n=== ${scriptMatches.length}個のscriptタグ ===`);
for (const s of scriptMatches) {
  if (/odds|tanpuku|data/i.test(s) && s.length > 100) {
    console.log(s.slice(0, 300).replace(/\n/g, " "));
    console.log("...\n");
  }
}

// 3. var xxx = のパターンでデータ変数を探す
const varMatches = oddsHtml.match(/var\s+\w+\s*=\s*[{\[].{10,200}/g) || [];
console.log("=== JavaScript変数 ===");
varMatches.forEach(v => console.log(v.slice(0, 150)));
