import iconv from "iconv-lite";
import { load } from "cheerio";

const url = "https://race.netkeiba.com/race/shutuba.html?race_id=202605020311";
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
});
const buffer = Buffer.from(await res.arrayBuffer());
const html = iconv.decode(buffer, "EUC-JP");
const $ = load(html);

console.log("=== 京王杯SC 全馬のオッズ ===");
$("table.Shutuba_Table tr.HorseList").each((i, row) => {
  const $r = $(row);
  const num = $r.find("td").eq(1).text().trim();
  const name = $r.find("td").eq(3).text().trim().slice(0, 20);
  const oddsText = $r.find("td").eq(9).text().trim();
  const popText = $r.find("td").eq(10).text().trim();
  const popSpan = $r.find("td.Popular span").text().trim();
  const oddsSpan = $r.find("span.Odds").text().trim();
  console.log(`#${num} ${name} | td[9]:"${oddsText}" td[10]:"${popText}" | Popular:"${popSpan}" Odds:"${oddsSpan}"`);
});
