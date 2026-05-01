import iconv from "iconv-lite";
import { load } from "cheerio";

const raceId = "202605020311";
const url = `https://race.netkeiba.com/odds/index.html?race_id=${raceId}&type=b1`;
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
});
const buffer = Buffer.from(await res.arrayBuffer());
const html = iconv.decode(buffer, "EUC-JP");
const $ = load(html);

// オッズテーブルの構造を調査
console.log("=== テーブル一覧 ===");
$("table").each((i, t) => {
  const cls = $(t).attr("class") || "";
  const rows = $(t).find("tr").length;
  if (rows > 3) console.log(`table[${i}] class="${cls}" rows=${rows}`);
});

// 単勝オッズを探す
console.log("\n=== 単勝オッズ候補 ===");
$("tr").each((i, row) => {
  const $r = $(row);
  const text = $r.text().trim().replace(/\s+/g, " ").slice(0, 100);
  if (/^\d+\s+\S+.*\d+\.\d/.test(text)) {
    console.log(text);
  }
});
