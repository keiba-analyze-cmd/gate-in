import iconv from "iconv-lite";
import { load } from "cheerio";

const raceId = "202605020311";
const url = `https://db.netkeiba.com/race/${raceId}/`;
const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
});
const buffer = Buffer.from(await res.arrayBuffer());
const html = iconv.decode(buffer, "EUC-JP");
const $ = load(html);

// テーブル構造
$("table").each((i, t) => {
  const cls = $(t).attr("class") || $(t).attr("id") || "";
  const rows = $(t).find("tr").length;
  if (rows > 3) console.log(`table[${i}] class/id="${cls}" rows=${rows}`);
});

// 結果テーブルの中身
console.log("\n=== 出馬表/結果テーブル ===");
$("table.race_table_01 tr, table.nk_tb_common tr").each((i, row) => {
  if (i > 5) return;
  const $r = $(row);
  const tds = [];
  $r.find("td, th").each((j, td) => {
    tds.push($(td).text().trim().replace(/\s+/g, " ").slice(0, 30));
  });
  console.log(`row[${i}]: ${tds.join(" | ")}`);
});
