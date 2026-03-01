import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { load } from "cheerio";
import iconv from "iconv-lite";

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

async function scrapeOddsFromResult(externalRaceId: string) {
  const url = `https://race.netkeiba.com/race/result.html?race_id=${externalRaceId}`;
  const html = await fetchPage(url);
  const $ = load(html);

  const entries: { post_number: number; odds: number | null; popularity: number | null }[] = [];

  $("table.RaceTable01 tbody tr, #All_Result_Table tbody tr").each((_, row) => {
    const $r = $(row);
    const tds = $r.find("td");
    if (tds.length < 10) return;

    const postNum = parseInt(tds.eq(2).text().trim());
    if (!postNum || isNaN(postNum)) return;

    // 結果ページではオッズと人気の列位置を確認
    // 通常: 着順(0), 枠(1), 馬番(2), 馬名(3), 性齢(4), 斤量(5), 騎手(6), タイム(7), 着差(8), 人気(9), 単勝オッズ(10)
    const popText = tds.eq(9).text().trim();
    const oddsText = tds.eq(10).text().trim();
    
    const popularity = parseInt(popText) || null;
    const odds = parseFloat(oddsText.replace(/[^0-9.]/g, "")) || null;

    entries.push({ post_number: postNum, odds, popularity });
  });

  return entries;
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  
  // 管理者チェック
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { race_date, race_id } = body;

  // 対象レースを取得
  let query = admin
    .from("races")
    .select("id, name, external_id, race_entries(id, post_number)")
    .eq("status", "finished")
    .not("external_id", "is", null);

  if (race_id) {
    query = query.eq("id", race_id);
  } else if (race_date) {
    query = query.eq("race_date", race_date);
  } else {
    // デフォルト: 直近7日間
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    query = query.gte("race_date", sevenDaysAgo);
  }

  const { data: races, error } = await query;

  if (error || !races) {
    return NextResponse.json({ error: "Failed to fetch races", details: error }, { status: 500 });
  }

  const results: any[] = [];
  let totalUpdated = 0;

  for (const race of races) {
    if (!race.external_id) continue;

    try {
      const scrapedData = await scrapeOddsFromResult(race.external_id);
      
      if (scrapedData.length === 0) {
        results.push({ race_id: race.id, name: race.name, status: "skipped", reason: "データ取得不可" });
        continue;
      }

      const entryMap = new Map(
        ((race.race_entries as any[]) ?? []).map((e: any) => [e.post_number, e.id])
      );

      let updated = 0;
      for (const scraped of scrapedData) {
        const entryId = entryMap.get(scraped.post_number);
        if (entryId && (scraped.odds !== null || scraped.popularity !== null)) {
          const { error: updateError } = await admin
            .from("race_entries")
            .update({ odds: scraped.odds, popularity: scraped.popularity })
            .eq("id", entryId);
          
          if (!updateError) updated++;
        }
      }

      totalUpdated += updated;
      results.push({ race_id: race.id, name: race.name, status: "success", entries_scraped: scrapedData.length, updated });

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err: any) {
      results.push({ race_id: race.id, name: race.name, status: "error", error: err.message });
    }
  }

  return NextResponse.json({
    message: `${races.length}レースを処理、${totalUpdated}件のエントリーを更新`,
    results,
  });
}
