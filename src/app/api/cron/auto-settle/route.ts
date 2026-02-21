import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";

import { load } from "cheerio";
import iconv from "iconv-lite";
import { settleRace } from "@/lib/services/settle-race";

// Vercel Cron認証
function verifyCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Vercel Cronからの呼び出し
  const cronSecret = request.headers.get("x-vercel-cron");
  if (cronSecret) return true;
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

async function scrapeResults(externalRaceId: string) {
  const url = `https://race.netkeiba.com/race/result.html?race_id=${externalRaceId}`;
  const html = await fetchPage(url);
  const $ = load(html);

  const results: {
    post_number: number; horse_name: string; finish_position: number;
    finish_time: string | null;
  }[] = [];

  $("table.RaceTable01 tbody tr, table.Shutuba_Table tbody tr, #All_Result_Table tbody tr").each((_, row) => {
    const $r = $(row);
    const tds = $r.find("td");
    if (tds.length < 4) return;

    const pos = parseInt(tds.eq(0).text().trim());
    if (!pos || isNaN(pos)) return;

    const postNum = parseInt(tds.eq(2).text().trim());
    if (!postNum || isNaN(postNum)) return;

    const horseName = $r.find("span.Horse_Name a, a[href*='/horse/']").first().text().trim()
      || tds.eq(3).text().trim();
    if (!horseName) return;

    const timeText = tds.eq(7).text().trim() || null;

    results.push({
      finish_position: pos, post_number: postNum,
      horse_name: horseName.replace(/\s+/g, ""),
      finish_time: timeText,
    });
  });

  // 払戻情報
  const payouts: { bet_type: string; combination: string; payout_amount: number; popularity: number | null }[] = [];

  $(".Payout_Detail_Table tr, .Result_Pay_Back table tr, table.Pay_Table_01 tr").each((_, row) => {
    const $r = $(row);
    const th = $r.find("th").first().text().trim();
    const tds = $r.find("td");
    if (tds.length < 2) return;

    let betType = "";
    if (/単勝/.test(th)) betType = "win";
    else if (/複勝/.test(th)) betType = "place";
    else if (/枠連/.test(th)) betType = "bracket_quinella";
    else if (/馬連/.test(th)) betType = "quinella";
    else if (/ワイド/.test(th)) betType = "wide";
    else if (/馬単/.test(th)) betType = "exacta";
    else if (/三連複/.test(th)) betType = "trio";
    else if (/三連単/.test(th)) betType = "trifecta";
    else return;

    const combos = tds.eq(0).html()?.split(/<br\s*\/?>/) ?? [tds.eq(0).text()];
    const amounts = tds.eq(1).html()?.split(/<br\s*\/?>/) ?? [tds.eq(1).text()];
    const pops = tds.length > 2 ? (tds.eq(2).html()?.split(/<br\s*\/?>/) ?? []) : [];

    for (let i = 0; i < combos.length; i++) {
      const combo = combos[i].replace(/<[^>]*>/g, "").trim();
      const payStr = (amounts[i] ?? "").replace(/<[^>]*>/g, "").replace(/[,、円\s]/g, "").trim();
      const amount = parseInt(payStr);
      if (!combo || !amount || isNaN(amount)) continue;
      const popStr = (pops[i] ?? "").replace(/<[^>]*>/g, "").trim();
      payouts.push({ bet_type: betType, combination: combo, payout_amount: amount, popularity: parseInt(popStr) || null });
    }
  });

  results.sort((a, b) => a.finish_position - b.finish_position);
  return { results, payouts };
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC→JST

  // 発走15分後〜45分後のレースを対象（最大3回リトライ = 30分間）
  const tenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const fortyMinAgo = new Date(now.getTime() - 45 * 60 * 1000).toISOString();

  // 対象: post_timeが15〜45分前 & status=voting_open & external_id有り
  const { data: races } = await admin
    .from("races")
    .select("id, name, external_id, post_time, race_entries(id, post_number, horses(name))")
    .eq("status", "voting_open")
    .not("external_id", "is", null)
    .not("post_time", "is", null)
    .lte("post_time", tenMinAgo)
    .gte("post_time", fortyMinAgo)
    .order("post_time");

  if (!races || races.length === 0) {
    return NextResponse.json({
      message: "対象レースなし",
      checked_at: jstNow.toISOString(),
    });
  }

  const results: any[] = [];

  for (const race of races) {
    if (!race.external_id) continue;

    try {
      // 結果をスクレイプ
      const { results: raceResults, payouts } = await scrapeResults(race.external_id);

      if (raceResults.length === 0) {
        results.push({
          race_id: race.id, name: race.name,
          status: "skipped", reason: "結果未公開（次回リトライ）",
        });
        continue;
      }

      // 払戻の検証: 最低限 win と place が必要
      const hasWin = payouts.some(p => p.bet_type === "win");
      const hasPlace = payouts.some(p => p.bet_type === "place");
      
      if (!hasWin || !hasPlace) {
        results.push({
          race_id: race.id, name: race.name,
          status: "skipped", reason: "払戻未確定（次回リトライ）",
          payouts_found: payouts.map(p => p.bet_type),
        });
        continue;
      }

      // 馬番→race_entry_idマッピング
      const entryMap = new Map(
        ((race.race_entries as any[]) ?? []).map((e: any) => [
          e.post_number, e.id
        ])
      );

      const resultInserts = raceResults
        .filter((r) => entryMap.has(r.post_number))
        .map((r) => ({
          race_id: race.id,
          race_entry_id: entryMap.get(r.post_number)!,
          finish_position: r.finish_position,
          finish_time: r.finish_time ?? null,
        }));

      if (resultInserts.length === 0) {
        results.push({
          race_id: race.id, name: race.name,
          status: "skipped", reason: "エントリー不一致",
        });
        continue;
      }

      // 既存結果をクリア → 登録
      await admin.from("race_results").delete().eq("race_id", race.id);
      await admin.from("payouts").delete().eq("race_id", race.id);
      await admin.from("race_results").insert(resultInserts);

      if (payouts.length > 0) {
        const { error: payoutError } = await admin.from("payouts").insert(
          payouts.map((p) => ({ race_id: race.id, ...p }))
        );
        
        if (payoutError) {
          console.error(`[auto-settle] payouts insert error for race ${race.id}:`, payoutError);
        }
      }

      // 清算（ポイント計算）
      const settleResult = await settleRace(admin, race.id);

      results.push({
        race_id: race.id, name: race.name,
        status: "settled",
        results_count: resultInserts.length,
        payouts_count: payouts.length,
        settled_votes: settleResult.settled_votes ?? 0,
        total_points: settleResult.total_points_awarded ?? 0,
        errors: settleResult.errors?.length > 0 ? settleResult.errors : undefined,
      });

    } catch (err: any) {
      results.push({
        race_id: race.id, name: race.name,
        status: "error", error: err.message,
      });
    }
  }

  return NextResponse.json({
    checked_at: jstNow.toISOString(),
    processed: results.length,
    results,
  });
}
