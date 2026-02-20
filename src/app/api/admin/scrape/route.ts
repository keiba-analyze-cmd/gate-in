import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { load } from "cheerio";
import iconv from "iconv-lite";

// ── 管理者チェック ──
async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("id, is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

// ── 競馬場コード → 名前 ──
const VENUE_MAP: Record<string, string> = {
  "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
  "05": "東京", "06": "中山", "07": "中京", "08": "京都",
  "09": "阪神", "10": "小倉",
};

// ── グレード判定 ──
function detectGrade(text: string): string | null {
  if (/G[Ⅰ1I]|GI[^IVX]|\(G1\)|（G1）/.test(text)) return "G1";
  if (/G[Ⅱ2]|GII|\(G2\)|（G2）/.test(text)) return "G2";
  if (/G[Ⅲ3]|GIII|\(G3\)|（G3）/.test(text)) return "G3";
  if (/\(L\)|（L）|リステッド/.test(text)) return "L";
  if (/オープン|OP/.test(text)) return "OP";
  return null;
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

// ── 個別レースの出馬表をパース ──
async function scrapeRace(raceId: string, fallbackDate: string) {
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

  const entries: any[] = [];
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
    const weightStr = $r.find("td").eq(4).text().trim();
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

// ── GET ──
export async function GET(request: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  // ── mode=ids: 指定日のレースID一覧を取得 ──
  if (mode === "ids") {
    const dateStr = searchParams.get("date"); // YYYYMMDD
    if (!dateStr || !/^\d{8}$/.test(dateStr)) {
      return NextResponse.json({ error: "date パラメータが必要です (YYYYMMDD)" }, { status: 400 });
    }
    const url = `https://race.netkeiba.com/top/race_list_sub.html?kaisai_date=${dateStr}`;
    const html = await fetchPage(url);
    const ids = new Set<string>();
    const allMatches = html.match(/race_id=(\d{12})/g);
    if (allMatches) {
      for (const m of allMatches) ids.add(m.replace("race_id=", ""));
    }
    const $ = load(html);
    $("[data-race_id]").each((_, el) => {
      const id = $(el).attr("data-race_id");
      if (id && /^\d{12}$/.test(id)) ids.add(id);
    });
    return NextResponse.json({ race_ids: [...ids].sort() });
  }

  // ── mode=races: 指定IDのレースをスクレイピング（最大4件） ──
  if (mode === "races") {
    const idsParam = searchParams.get("race_ids"); // カンマ区切り
    const fallbackDate = searchParams.get("fallback_date") || "";
    if (!idsParam) {
      return NextResponse.json({ error: "race_ids パラメータが必要です" }, { status: 400 });
    }
    const raceIds = idsParam.split(",").filter(id => /^\d{12}$/.test(id)).slice(0, 4);
    const races = [];
    for (const raceId of raceIds) {
      try {
        const data = await scrapeRace(raceId, fallbackDate);
        races.push(data);
      } catch (err: any) {
        races.push({ race_id_external: raceId, error: err.message });
      }
    }
    return NextResponse.json({ races });
  }

  // ── check_date: 登録済みレース確認（既存機能） ──
  const checkDate = searchParams.get("check_date");
  if (checkDate) {
    const admin = createAdminClient();
    const { data: races } = await admin
      .from("races")
      .select("id, course_name, race_number, name")
      .eq("race_date", checkDate);
    return NextResponse.json({ date: checkDate, registered: races ?? [] });
  }

  return NextResponse.json({ error: "mode または check_date パラメータが必要です" }, { status: 400 });
}

// ── POST: 一括登録（上書き対応） ──
export async function POST(request: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });

  const { races } = await request.json();
  if (!races || !Array.isArray(races) || races.length === 0) {
    return NextResponse.json({ error: "登録するレースがありません" }, { status: 400 });
  }

  const admin = createAdminClient();
  let registered = 0;
  let updated = 0;
  let failed = 0;
  const results: any[] = [];

  for (const raceData of races) {
    try {
      // 既存レースを確認
      const { data: existing } = await admin
        .from("races").select("id")
        .eq("race_date", raceData.race_date)
        .eq("course_name", raceData.course_name)
        .eq("race_number", raceData.race_number)
        .maybeSingle();

      const postTimeValue = raceData.post_time
        ? `${raceData.race_date}T${raceData.post_time}:00+09:00` : null;

      let raceId: string;

      if (existing) {
        // ── 既存レースを上書き更新 ──
        const { error: updateErr } = await admin
          .from("races")
          .update({
            external_id: raceData.race_id_external,
            name: raceData.name, grade: raceData.grade,
            post_time: postTimeValue,
            track_type: raceData.track_type,
            distance: raceData.distance,
            head_count: raceData.entries?.length ?? 0,
          })
          .eq("id", existing.id);

        if (updateErr) {
          failed++;
          results.push({ name: raceData.name, status: "error", error: updateErr.message });
          continue;
        }

        raceId = existing.id;

        // 既存の出走馬を削除（新データで差し替え）
        if (raceData.entries?.length > 0) {
          await admin.from("race_entries").delete().eq("race_id", raceId);
        }

        updated++;
      } else {
        // ── 新規登録 ──
        const { data: race, error: raceErr } = await admin
          .from("races")
          .insert({
            external_id: raceData.race_id_external,
            name: raceData.name, grade: raceData.grade,
            race_date: raceData.race_date, post_time: postTimeValue,
            course_name: raceData.course_name, track_type: raceData.track_type,
            distance: raceData.distance, race_number: raceData.race_number,
            head_count: raceData.entries?.length ?? 0, status: "voting_open",
          })
          .select("id").single();

        if (raceErr || !race) {
          failed++;
          results.push({ name: raceData.name, status: "error", error: raceErr?.message });
          continue;
        }

        raceId = race.id;
        registered++;
      }

      // ── 出走馬登録 ──
      const entryInserts = [];
      for (const entry of raceData.entries ?? []) {
        if (!entry.horse_name) continue;
        let horseId: string;
        const { data: existingHorse } = await admin
          .from("horses").select("id").eq("name", entry.horse_name.trim()).maybeSingle();

        if (existingHorse) {
          horseId = existingHorse.id;
        } else {
          const { data: newHorse, error: hErr } = await admin
            .from("horses")
            .insert({ name: entry.horse_name.trim(), sex: entry.sex || "不" })
            .select("id").single();
          if (hErr || !newHorse) continue;
          horseId = newHorse.id;
        }

        entryInserts.push({
          race_id: raceId, horse_id: horseId,
          post_number: entry.post_number, gate_number: entry.gate_number,
          jockey: entry.jockey?.trim() || "未定", weight: entry.weight,
          odds: entry.odds, popularity: entry.popularity,
        });
      }

      if (entryInserts.length > 0) {
        await admin.from("race_entries").insert(entryInserts);
      }

      const status = existing ? "updated" : "registered";
      results.push({ name: raceData.name, status, race_id: raceId, entries_count: entryInserts.length });
    } catch (err: any) {
      failed++;
      results.push({ name: raceData.name, status: "error", error: err.message });
    }
  }

  return NextResponse.json({ registered, updated, failed, results });
}
