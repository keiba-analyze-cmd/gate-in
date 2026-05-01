import { load } from "cheerio";

const raceId = "202605020311"; // 京王杯SC
const year = raceId.slice(0, 4);
const place = raceId.slice(4, 6);
const kai = raceId.slice(6, 8);
const day = raceId.slice(8, 10);
const rnum = raceId.slice(10, 12);

const urls = [
  `https://race.yahoo.co.jp/race/odds/tanpuku/${raceId}/`,
  `https://race.yahoo.co.jp/race/odds/${raceId}/`,
  `https://nar.netkeiba.com/odds/index.html?race_id=${raceId}&type=b1`,
  `https://race.netkeiba.com/odds/index.html?race_id=${raceId}&type=b1&rf=shutuba_submenu`,
];

for (const url of urls) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      redirect: "follow",
    });
    const text = await res.text();
    const $ = load(text);

    // オッズらしい数値を探す（例: 3.0, 10.5 等）
    const oddsMatches = text.match(/\b\d{1,3}\.\d\b/g) || [];
    const uniqueOdds = [...new Set(oddsMatches)].slice(0, 10);

    console.log(`\n=== ${url.slice(0, 70)} ===`);
    console.log(`Status: ${res.status} | Length: ${text.length}`);
    console.log(`Odds-like numbers found: ${uniqueOdds.join(", ") || "none"}`);

    // テーブル内のオッズを探す
    $("td").each((i, td) => {
      const t = $(td).text().trim();
      if (/^\d{1,3}\.\d$/.test(t) && i < 50) {
        const row = $(td).parent();
        const rowText = row.text().trim().replace(/\s+/g, " ").slice(0, 80);
        console.log(`  Found: "${t}" in row: "${rowText}"`);
      }
    });
  } catch (e) {
    console.log(`FAIL: ${url.slice(0, 60)} - ${e.message}`);
  }
}
