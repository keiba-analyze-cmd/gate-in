import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { load } from "cheerio";
import iconv from "iconv-lite";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id, is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
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
    finish_time: string | null; jockey: string;
  }[] = [];

  $("table.RaceTable01 tbody tr, table.Shutuba_Table tbody tr, #All_Result_Table tbody tr").each((_, row) => {
    const $r = $(row);
    const tds = $r.find("td");
    if (tds.length < 4) return;

    const posText = tds.eq(0).text().trim();
    const pos = parseInt(posText);
    if (!pos || isNaN(pos)) return;

    const postNum = parseInt(tds.eq(2).text().trim());
    if (!postNum || isNaN(postNum)) return;

    const horseName = $r.find("span.Horse_Name a, a[href*='/horse/']").first().text().trim()
      || tds.eq(3).text().trim();
    if (!horseName) return;

    const timeText = tds.eq(7).text().trim() || null;
    const jockey = $r.find("a[href*='/jockey/']").first().text().trim() || "";

    results.push({
      finish_position: pos, post_number: postNum,
      horse_name: horseName.replace(/\s+/g, ""),
      finish_time: timeText, jockey,
    });
  });

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
  return { results, payouts, source_url: url };
}

export async function GET(request: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });

  const raceId = new URL(request.url).searchParams.get("race_id");
  if (!raceId) return NextResponse.json({ error: "race_id が必要です" }, { status: 400 });

  const admin = createAdminClient();
  const { data: race } = await admin
    .from("races")
    .select("id, name, external_id, race_entries(id, post_number, horses(name))")
    .eq("id", raceId).single();

  if (!race) return NextResponse.json({ error: "レースが見つかりません" }, { status: 404 });
  if (!race.external_id) return NextResponse.json({ error: "external_idが未設定です（手動登録レースは自動取得不可）" }, { status: 400 });

  try {
    const { results, payouts, source_url } = await scrapeResults(race.external_id);

    if (results.length === 0) {
      return NextResponse.json({
        error: "結果が取得できませんでした。レースがまだ終了していない可能性があります。",
        source_url,
      }, { status: 404 });
    }

    const entryMap = new Map(
      ((race.race_entries as any[]) ?? []).map((e: any) => [
        e.post_number, { id: e.id, horse_name: (e.horses as any)?.name }
      ])
    );

    const mappedResults = results.map((r) => {
      const entry = entryMap.get(r.post_number);
      return { ...r, race_entry_id: entry?.id ?? null, db_horse_name: entry?.horse_name ?? null, matched: !!entry };
    });

    return NextResponse.json({
      race_id: race.id, race_name: race.name,
      results: mappedResults, payouts, source_url,
      all_matched: mappedResults.every((r) => r.matched),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "スクレイプエラー: " + err.message }, { status: 500 });
  }
}
