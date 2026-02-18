import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { load } from "cheerio";
import iconv from "iconv-lite";

// ── 管理者チェック（Cronの場合はスキップ）──
async function checkAdminOrCron(request: Request) {
  // Vercel Cronからの呼び出しかチェック
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return { isCron: true };
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("id, is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return { isCron: false, user };
}

// ── HTMLフェッチ（EUC-JP対応）──
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

// ── 個別レースのオッズを取得 ──
async function scrapeOdds(raceIdExternal: string): Promise<Map<number, { odds: number | null; popularity: number | null }>> {
  const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${raceIdExternal}`;
  const html = await fetchPage(url);
  const $ = load(html);

  const oddsMap = new Map<number, { odds: number | null; popularity: number | null }>();

  $("table.Shutuba_Table tr.HorseList, table.RaceTable01 tr.HorseList").each((_, row) => {
    const $r = $(row);
    const tds = $r.find("td");
    if (tds.length < 4) return;

    const postNum = parseInt($r.find("td.Umaban, td:nth-child(2)").text().trim());
    if (!postNum || isNaN(postNum)) return;

    // オッズ取得（複数のセレクタを試す）
    let oddsStr = $r.find("td.Popular span.Odds").first().text().trim();
    if (!oddsStr) oddsStr = $r.find("span.Odds").first().text().trim();
    if (!oddsStr) oddsStr = $r.find("td.Odds").first().text().trim();
    const odds = parseFloat(oddsStr) || null;

    // 人気取得
    let popStr = $r.find("span.OddsPeople").text().trim();
    if (!popStr) popStr = $r.find("td.Popular span:last-child").text().trim();
    const popularity = parseInt(popStr) || null;

    oddsMap.set(postNum, { odds, popularity });
  });

  return oddsMap;
}

// ── POST: オッズ更新実行 ──
export async function POST(request: Request) {
  const auth = await checkAdminOrCron(request);
  if (!auth) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const admin = createAdminClient();
  const results: { raceId: string; name: string; updated: number; error?: string }[] = [];

  try {
    // 投票受付中のレースを取得
    const { data: races } = await admin
      .from("races")
      .select("id, name, external_id")
      .eq("status", "voting_open");

    if (!races || races.length === 0) {
      return NextResponse.json({ message: "更新対象のレースがありません", results: [] });
    }

    for (const race of races) {
      if (!race.external_id) {
        results.push({ raceId: race.id, name: race.name, updated: 0, error: "外部IDなし" });
        continue;
      }

      try {
        // オッズをスクレイピング
        const oddsMap = await scrapeOdds(race.external_id);

        if (oddsMap.size === 0) {
          results.push({ raceId: race.id, name: race.name, updated: 0, error: "オッズ取得失敗" });
          continue;
        }

        // エントリーを取得
        const { data: entries } = await admin
          .from("race_entries")
          .select("id, post_number")
          .eq("race_id", race.id);

        let updatedCount = 0;

        // 各エントリーのオッズを更新
        for (const entry of entries ?? []) {
          const oddsData = oddsMap.get(entry.post_number);
          if (oddsData && (oddsData.odds !== null || oddsData.popularity !== null)) {
            const updateData: { odds?: number; popularity?: number } = {};
            if (oddsData.odds !== null) updateData.odds = oddsData.odds;
            if (oddsData.popularity !== null) updateData.popularity = oddsData.popularity;

            const { error } = await admin
              .from("race_entries")
              .update(updateData)
              .eq("id", entry.id);

            if (!error) updatedCount++;
          }
        }

        results.push({ raceId: race.id, name: race.name, updated: updatedCount });

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        results.push({ 
          raceId: race.id, 
          name: race.name, 
          updated: 0, 
          error: err instanceof Error ? err.message : "不明なエラー" 
        });
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

    return NextResponse.json({
      message: `${races.length}レースのオッズを更新しました（${totalUpdated}頭）`,
      results,
    });

  } catch (err) {
    return NextResponse.json({ 
      error: "オッズ更新に失敗しました", 
      details: err instanceof Error ? err.message : "不明なエラー" 
    }, { status: 500 });
  }
}

// ── GET: 更新対象のレース数を確認 ──
export async function GET(request: Request) {
  const auth = await checkAdminOrCron(request);
  if (!auth) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: races, count } = await admin
    .from("races")
    .select("id, name, external_id, post_time", { count: "exact" })
    .eq("status", "voting_open")
    .order("post_time", { ascending: true });

  return NextResponse.json({
    count: count ?? 0,
    races: races?.map(r => ({
      id: r.id,
      name: r.name,
      post_time: r.post_time,
      has_external_id: !!r.external_id,
    })) ?? [],
  });
}
