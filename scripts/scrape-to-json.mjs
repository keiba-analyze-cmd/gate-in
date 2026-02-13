#!/usr/bin/env node
/**
 * ======================================================
 *  GATE IN! - netkeibaスクレイピング → JSON出力
 * ======================================================
 * 
 * 使い方:
 *   node scripts/scrape-to-json.mjs 20260214
 *   node scripts/scrape-to-json.mjs 20260214 20260215
 *   node scripts/scrape-to-json.mjs           ← 今週末を自動判定
 * 
 * 出力:
 *   scripts/output/races-20260214.json
 *   scripts/output/races-20260215.json
 */

import { load } from "cheerio";
import iconv from "iconv-lite";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "output");

const DELAY_MS = 1200;

const VENUE_MAP = {
  "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
  "05": "東京", "06": "中山", "07": "中京", "08": "京都",
  "09": "阪神", "10": "小倉",
};

function detectGrade(text) {
  if (/G[Ⅰ1I]|GI[^IVX]|\(G1\)|（G1）/.test(text)) return "G1";
  if (/G[Ⅱ2]|GII|\(G2\)|（G2）/.test(text)) return "G2";
  if (/G[Ⅲ3]|GIII|\(G3\)|（G3）/.test(text)) return "G3";
  if (/\(L\)|（L）|リステッド/.test(text)) return "L";
  if (/オープン|OP/.test(text)) return "OP";
  return null;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.9",
    },
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  const eucHtml = iconv.decode(buffer, "EUC-JP");
  if (/[あ-んア-ン一-龥]/.test(eucHtml)) return eucHtml;
  return buffer.toString("utf8");
}

async function getRaceIds(dateStr) {
  // race_list_sub.html はAJAX用エンドポイントでrace_idが直接含まれる
  const url = `https://race.netkeiba.com/top/race_list_sub.html?kaisai_date=${dateStr}`;
  console.log(`  URL: ${url}`);
  const html = await fetchPage(url);
  const $ = load(html);
  const ids = new Set();

  // href内のrace_idパラメータを抽出
  const allMatches = html.match(/race_id=(\d{12})/g);
  if (allMatches) {
    for (const m of allMatches) {
      ids.add(m.replace("race_id=", ""));
    }
  }

  // data-race_id属性からも取得
  $("[data-race_id]").each((_, el) => {
    const id = $(el).attr("data-race_id");
    if (id && /^\d{12}$/.test(id)) ids.add(id);
  });

  return [...ids].sort();
}

async function scrapeRace(raceId, fallbackDate) {
  const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;
  const html = await fetchPage(url);
  const $ = load(html);

  const raceNameRaw = $(".RaceName").text().trim() ||
    $("title").text().split("|")[0].replace(/出馬表/g, "").trim();
  const raceName = raceNameRaw
    .replace(/\(G[123]\)/g, "").replace(/（G[123]）/g, "")
    .replace(/\s+/g, "").trim() || `${parseInt(raceId.slice(-2))}R`;

  const rd01 = $(".RaceData01").text().trim();
  const rd02 = $(".RaceData02").text().trim();
  const fullInfo = rd01 + " " + rd02;

  const tm = rd01.match(/(\d{1,2}):(\d{2})/) || fullInfo.match(/(\d{1,2}):(\d{2})/);
  const postTime = tm ? `${tm[1].padStart(2, "0")}:${tm[2]}` : null;

  const cm = rd01.match(/(芝|ダート|ダ|障).*?(\d{3,4})m/) || fullInfo.match(/(芝|ダート|ダ|障).*?(\d{3,4})m/);
  let trackType = "芝";
  let distance = 0;
  if (cm) {
    trackType = cm[1] === "ダ" ? "ダート" : cm[1] === "障" ? "障害" : cm[1];
    distance = parseInt(cm[2]);
  }

  const venueCode = raceId.slice(4, 6);
  const courseName = VENUE_MAP[venueCode] || "不明";
  const raceNumber = parseInt(raceId.slice(-2));

  const dm = rd01.match(/(\d+)月(\d+)日/);
  const raceDate = dm
    ? `${raceId.slice(0, 4)}-${dm[1].padStart(2, "0")}-${dm[2].padStart(2, "0")}`
    : fallbackDate;

  const gradeText = $(".Icon_GradeType").text().trim();
  const grade = detectGrade(raceNameRaw + " " + gradeText + " " + fullInfo);

  // 出走馬パース
  const entries = [];
  $("table.Shutuba_Table tr.HorseList, table.RaceTable01 tr.HorseList").each((_, row) => {
    const $r = $(row);
    const tds = $r.find("td");
    if (tds.length < 4) return;

    const postNum = parseInt($r.find("td.Umaban, td:nth-child(2)").text().trim());
    if (!postNum || isNaN(postNum)) return;

    const gate = parseInt($r.find("td.Waku, td:nth-child(1)").text().trim()) || null;
    const horseName = ($r.find("span.HorseName a").first().text().trim() ||
      $r.find("a[href*='/horse/']").first().text().trim());
    if (!horseName) return;

    const sexAge = $r.find("td.Barei, span.Barei").text().trim();
    const sex = sexAge ? sexAge.charAt(0) : "不";
    const weightStr = $r.find("td.Txt_C").eq(0).text().trim() || $r.find("td").eq(5).text().trim();
    const weight = parseFloat(weightStr) || null;
    const jockey = $r.find("td.Jockey a, a[href*='/jockey/']").first().text().trim() || "未定";
    const oddsStr = $r.find("td.Popular span, span.Odds").first().text().trim();
    const odds = parseFloat(oddsStr) || null;
    const popStr = $r.find("span.OddsPeople").text().trim();
    const popularity = parseInt(popStr) || null;

    entries.push({
      post_number: postNum, gate_number: gate,
      horse_name: horseName, sex, jockey, weight, odds, popularity,
    });
  });

  return {
    race_id_external: raceId, name: raceName, grade, race_date: raceDate,
    post_time: postTime, course_name: courseName, track_type: trackType,
    distance, race_number: raceNumber, entries,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 今週末の日付を自動計算 ──
function getThisWeekend() {
  const today = new Date();
  const day = today.getDay();
  const dates = [];
  
  // 次の土曜日
  const satDiff = (6 - day + 7) % 7 || (today.getHours() >= 16 ? 7 : 0);
  const sat = new Date(today);
  sat.setDate(today.getDate() + satDiff);
  dates.push(formatYMD(sat));

  // 翌日の日曜日
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  dates.push(formatYMD(sun));

  return dates;
}

function formatYMD(d) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

// ── メイン ──
async function main() {
  let targetDates = process.argv.slice(2).filter(d => /^\d{8}$/.test(d));
  if (targetDates.length === 0) {
    targetDates = getThisWeekend();
    console.log(`📅 今週末を自動検出: ${targetDates.join(", ")}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const dateStr of targetDates) {
    const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📅 ${formattedDate} のレースを取得中...`);
    console.log("=".repeat(50));

    const raceIds = await getRaceIds(dateStr);
    console.log(`   → ${raceIds.length} レース発見`);

    if (raceIds.length === 0) {
      console.log("   ⚠️ レースが見つかりませんでした");
      continue;
    }

    await sleep(DELAY_MS);

    const races = [];
    for (const raceId of raceIds) {
      try {
        process.stdout.write(`  🔍 ${raceId} ... `);
        const data = await scrapeRace(raceId, formattedDate);
        console.log(`${data.course_name}${data.race_number}R ${data.name} (${data.entries.length}頭)`);
        races.push(data);
        await sleep(DELAY_MS);
      } catch (err) {
        console.log(`❌ ${err.message}`);
      }
    }

    // 競馬場 → レース番号順でソート
    races.sort((a, b) => {
      if (a.course_name !== b.course_name) return a.course_name.localeCompare(b.course_name);
      return a.race_number - b.race_number;
    });

    // JSON出力
    const outPath = resolve(OUTPUT_DIR, `races-${dateStr}.json`);
    const output = {
      date: formattedDate,
      scraped_at: new Date().toISOString(),
      total: races.length,
      total_entries: races.reduce((s, r) => s + r.entries.length, 0),
      races,
    };
    writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

    console.log(`\n✅ ${races.length}レース（${output.total_entries}頭）→ ${outPath}`);
  }

  console.log("\n🏁 完了！管理画面の「📥 レース取得」でJSONを読み込んでください");
  console.log(`   → https://gate-in.jp/admin`);
}

main().catch((err) => {
  console.error("💥 エラー:", err);
  process.exit(1);
});
