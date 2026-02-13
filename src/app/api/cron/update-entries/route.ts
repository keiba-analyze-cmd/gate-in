import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { load } from "cheerio";
import iconv from "iconv-lite";

function verifyCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get("x-vercel-cron")) return true;
  return false;
}

async function fetchPage(url: string): Promise<string> {
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

// 出馬表ページからオッズ・人気・除外情報をスクレイプ
async function scrapeEntryUpdates(externalRaceId: string) {
  const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${externalRaceId}`;
  const html = await fetchPage(url);
  const $ = load(html);

  const entries: {
    post_number: number;
    odds: number | null;
    popularity: number | null;
    is_scratched: boolean;
    jockey: string | null;
    weight: number | null;
  }[] = [];

  $("table.Shutuba_Table tr.HorseList, table.RaceTable01 tr.HorseList").each((_, row) => {
    const $r = $(row);
    const tds = $r.find("td");
    if (tds.length < 4) return;

    const postNum = parseInt($r.find("td.Umaban, td:nth-child(2)").text().trim());
    if (!postNum || isNaN(postNum)) return;

    // 除外判定（取消・除外のクラスやテキスト）
    const rowText = $r.text();
    const isCancelled = /取消|除外|出走取消/.test(rowText)
      || $r.hasClass("Cancel")
      || $r.find(".Cancel, .Scratch").length > 0
      || $r.find("td").eq(0).text().trim() === "取";

    // オッズ
    const oddsStr = $r.find("td.Popular span, span.Odds").first().text().trim();
    const odds = parseFloat(oddsStr) || null;

    // 人気
    const popStr = $r.find("span.OddsPeople").text().trim();
    const popularity = parseInt(popStr) || null;

    // 騎手（乗り替わり検出用）
    const jockey = $r.find("td.Jockey a, a[href*='/jockey/']").first().text().trim() || null;

    // 斤量
    const weightStr = $r.find("td.Txt_C").eq(0).text().trim() || $r.find("td").eq(5).text().trim();
    const weight = parseFloat(weightStr) || null;

    entries.push({
      post_number: postNum,
      odds,
      popularity,
      is_scratched: isCancelled,
      jockey,
      weight,
    });
  });

  return entries;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // 今日〜明日のレース日（JST基準）
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = jstNow.toISOString().split("T")[0];
  const tomorrow = new Date(jstNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // 対象: 投票受付中 & external_id有り & 今日or明日のレース
  const { data: races } = await admin
    .from("races")
    .select("id, name, external_id, post_time, race_entries(id, post_number, odds, popularity, is_scratched, jockey, weight)")
    .eq("status", "voting_open")
    .not("external_id", "is", null)
    .gte("race_date", today)
    .lte("race_date", tomorrow)
    .order("post_time");

  if (!races || races.length === 0) {
    return NextResponse.json({
      message: "対象レースなし",
      checked_at: jstNow.toISOString(),
    });
  }

  const results: any[] = [];
  let totalUpdated = 0;

  for (const race of races) {
    if (!race.external_id) continue;

    // 発走済みレースはスキップ
    if (race.post_time) {
      const postTime = new Date(race.post_time).getTime();
      if (now.getTime() > postTime) continue;
    }

    try {
      const scrapedEntries = await scrapeEntryUpdates(race.external_id);
      if (scrapedEntries.length === 0) {
        results.push({ race_id: race.id, name: race.name, status: "skipped", reason: "データ取得不可" });
        continue;
      }

      // 既存エントリーとの差分検出＆更新
      const existingEntries = (race.race_entries as any[]) ?? [];
      const existingMap = new Map(existingEntries.map((e: any) => [e.post_number, e]));

      let raceUpdates = 0;
      let scratchedCount = 0;

      for (const scraped of scrapedEntries) {
        const existing = existingMap.get(scraped.post_number);
        if (!existing) continue;

        const updates: Record<string, any> = {};

        // オッズ更新
        if (scraped.odds !== null && scraped.odds !== existing.odds) {
          updates.odds = scraped.odds;
        }
        // 人気更新
        if (scraped.popularity !== null && scraped.popularity !== existing.popularity) {
          updates.popularity = scraped.popularity;
        }
        // 除外フラグ
        if (scraped.is_scratched && !existing.is_scratched) {
          updates.is_scratched = true;
          scratchedCount++;
        }
        // 騎手変更
        if (scraped.jockey && scraped.jockey !== existing.jockey) {
          updates.jockey = scraped.jockey;
        }
        // 斤量更新
        if (scraped.weight !== null && scraped.weight !== existing.weight) {
          updates.weight = scraped.weight;
        }

        if (Object.keys(updates).length > 0) {
          await admin.from("race_entries").update(updates).eq("id", existing.id);
          raceUpdates++;
        }
      }

      // head_countの更新（除外馬を差し引き）
      if (scratchedCount > 0) {
        const activeCount = scrapedEntries.filter((e) => !e.is_scratched).length;
        await admin.from("races").update({ head_count: activeCount }).eq("id", race.id);
      }

      totalUpdated += raceUpdates;
      results.push({
        race_id: race.id, name: race.name,
        status: raceUpdates > 0 ? "updated" : "no_changes",
        entries_updated: raceUpdates,
        scratched: scratchedCount,
      });

    } catch (err: any) {
      results.push({
        race_id: race.id, name: race.name,
        status: "error", error: err.message,
      });
    }

    // レート制限: 1レースごとに少し待つ
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({
    checked_at: jstNow.toISOString(),
    races_checked: results.length,
    total_entries_updated: totalUpdated,
    results,
  });
}
