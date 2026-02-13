import { load } from "cheerio";
import iconv from "iconv-lite";

const raceId = "202605010601"; // 東京1R
const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;
const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
const buf = Buffer.from(await res.arrayBuffer());
const html = iconv.decode(buf, "EUC-JP");
const $ = load(html);

// テーブル構造を調査
console.log("=== テーブルクラス ===");
$("table").each((i, el) => {
  console.log(`table[${i}]: class="${$(el).attr("class")}", rows=${$(el).find("tr").length}`);
});

console.log("\n=== tr クラス一覧 ===");
const trClasses = new Set();
$("tr").each((_, el) => { if ($(el).attr("class")) trClasses.add($(el).attr("class")); });
console.log([...trClasses]);

console.log("\n=== HorseList行 ===");
$("tr.HorseList").each((i, row) => {
  if (i < 2) console.log($(row).html().substring(0, 500));
});

// HorseListがない場合、別のセレクタを試す
if ($("tr.HorseList").length === 0) {
  console.log("\n=== HorseList なし - 別パターン探索 ===");
  console.log("tbody tr count:", $("tbody tr").length);
  $("tbody tr").each((i, row) => {
    if (i < 2) console.log("ROW:", $(row).text().trim().substring(0, 200));
  });
}
