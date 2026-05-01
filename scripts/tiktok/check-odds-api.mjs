// netkeibaのオッズAPIを試す
const raceId = "202605020311"; // 京王杯SC

// 方法1: オッズページ
const urls = [
  `https://race.netkeiba.com/api/api_get_jra_odds.html?race_id=${raceId}&type=1`,
  `https://race.netkeiba.com/odds/index.html?race_id=${raceId}&type=b1`,
  `https://db.netkeiba.com/race/${raceId}/`,
];

for (const url of urls) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
    });
    const text = await res.text();
    const hasOdds = /\d+\.\d/.test(text) && !/---\.-/.test(text.slice(0, 500));
    console.log(`\n=== ${url.slice(0, 80)} ===`);
    console.log(`Status: ${res.status} | Length: ${text.length} | Has real odds: ${hasOdds}`);
    console.log(`First 300 chars: ${text.slice(0, 300).replace(/\n/g, " ")}`);
  } catch (e) {
    console.log(`FAIL: ${url} - ${e.message}`);
  }
}
