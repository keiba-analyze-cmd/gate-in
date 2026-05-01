import iconv from "iconv-lite";
import { load } from "cheerio";

const raceId = "202605020311";
const url = `https://race.netkeiba.com/odds/index.html?race_id=${raceId}&type=b1&rf=shutuba_submenu`;
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
});
const buffer = Buffer.from(await res.arrayBuffer());
const html = iconv.decode(buffer, "EUC-JP");
const $ = load(html);

// RaceOdds_HorseList_Table の構造を詳しく見る
console.log("=== RaceOdds_HorseList_Table 構造 ===");
$("table.RaceOdds_HorseList_Table").first().find("tr").each((i, row) => {
  if (i > 5) return;
  const $r = $(row);
  $r.find("td").each((j, td) => {
    const text = $(td).text().trim().replace(/\s+/g, " ").slice(0, 40);
    const cls = $(td).attr("class") || "";
    if (text) console.log(`  row[${i}] td[${j}] class="${cls}" : "${text}"`);
  });
  console.log("---");
});

// Odds_Tanの構造
console.log("\n=== Odds_Tan 構造 ===");
$(".Odds_Tan_Num, .OddsTanNum, [class*='Tan']").each((i, el) => {
  if (i > 10) return;
  console.log(`  class="${$(el).attr("class")}" text="${$(el).text().trim()}"`);
});

// 全クラスの中からオッズっぽいものを探す
console.log("\n=== オッズ関連クラス ===");
const classes = new Set();
$("[class]").each((_, el) => {
  const cls = $(el).attr("class");
  if (cls && /odds|tan|fuku|pop|ninki/i.test(cls)) classes.add(cls);
});
[...classes].forEach(c => console.log(`  .${c}`));
