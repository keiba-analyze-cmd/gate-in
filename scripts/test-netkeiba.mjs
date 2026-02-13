import iconv from "iconv-lite";
const urls = [
  "https://race.netkeiba.com/top/race_list_sub.html?kaisai_date=20260215",
  "https://db.netkeiba.com/race/list/20260215/",
  "https://race.netkeiba.com/top/calendar.html?year=2026&month=2",
];
for (const url of urls) {
  console.log("\n===", url, "===");
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const buf = Buffer.from(await res.arrayBuffer());
    const html = iconv.decode(buf, "EUC-JP");
    const matches = html.match(/race_id[=:"\/]\d+/g);
    console.log("status:", res.status);
    console.log("race_id:", matches ? matches.slice(0, 5) : "なし");
    if (matches === null) console.log(html.substring(0, 500));
  } catch(e) { console.log("ERROR:", e.message); }
}
