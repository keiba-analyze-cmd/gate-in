import iconv from "iconv-lite";
import { load } from "cheerio";

// 京王杯SC のexternal_idを取得
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: race } = await s.from("races").select("external_id, name").eq("name", "京王杯SC").eq("race_date", "2026-05-02").single();
console.log("Race:", race?.name, "external_id:", race?.external_id);

const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${race.external_id}`;
console.log("URL:", url);

const res = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
});
const buffer = Buffer.from(await res.arrayBuffer());
const html = iconv.decode(buffer, "EUC-JP");
const $ = load(html);

// セレクターテスト
const rows1 = $("table.Shutuba_Table tr.HorseList").length;
const rows2 = $("table.RaceTable01 tr.HorseList").length;
console.log("\nSelector matches: Shutuba_Table:", rows1, "RaceTable01:", rows2);

// 実際のオッズ要素を探す
$("table.Shutuba_Table tr.HorseList, table.RaceTable01 tr.HorseList").first().each((_, row) => {
  const $r = $(row);
  console.log("\n=== 1行目のHTML構造 ===");
  console.log("td.Popular span:", $r.find("td.Popular span").text());
  console.log("span.Odds:", $r.find("span.Odds").text());
  console.log("span.OddsPeople:", $r.find("span.OddsPeople").text());
  console.log("td.Umaban:", $r.find("td.Umaban").text().trim());
  // 全tdの中身を出力
  $r.find("td").each((i, td) => {
    const text = $(td).text().trim().replace(/\s+/g, " ").slice(0, 50);
    if (text) console.log(`  td[${i}]: "${text}"`);
  });
});
