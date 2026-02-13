import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";

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

// ── GET: 登録済みレース確認（重複チェック用） ──
export async function GET(request: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const checkDate = searchParams.get("check_date"); // YYYY-MM-DD

  if (!checkDate) {
    return NextResponse.json({ error: "check_date パラメータが必要です" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: races } = await admin
    .from("races")
    .select("id, course_name, race_number, name")
    .eq("race_date", checkDate);

  return NextResponse.json({
    date: checkDate,
    registered: races ?? [],
  });
}

// ── POST: 一括登録 ──
export async function POST(request: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });

  const { races } = await request.json();
  if (!races || !Array.isArray(races) || races.length === 0) {
    return NextResponse.json({ error: "登録するレースがありません" }, { status: 400 });
  }

  const admin = createAdminClient();
  let registered = 0;
  let skipped = 0;
  let failed = 0;
  const results: any[] = [];

  for (const raceData of races) {
    try {
      // 重複チェック
      const { data: existing } = await admin
        .from("races")
        .select("id")
        .eq("race_date", raceData.race_date)
        .eq("course_name", raceData.course_name)
        .eq("race_number", raceData.race_number)
        .maybeSingle();

      if (existing) {
        skipped++;
        results.push({ name: raceData.name, status: "skipped" });
        continue;
      }

      // レース作成
      const postTimeValue = raceData.post_time
        ? `${raceData.race_date}T${raceData.post_time}:00+09:00`
        : null;

      const { data: race, error: raceErr } = await admin
        .from("races")
        .insert({
          external_id: raceData.race_id_external,
          name: raceData.name,
          grade: raceData.grade,
          race_date: raceData.race_date,
          post_time: postTimeValue,
          course_name: raceData.course_name,
          track_type: raceData.track_type,
          distance: raceData.distance,
          race_number: raceData.race_number,
          head_count: raceData.entries?.length ?? 0,
          status: "voting_open",
        })
        .select("id")
        .single();

      if (raceErr || !race) {
        failed++;
        results.push({ name: raceData.name, status: "error", error: raceErr?.message });
        continue;
      }

      // 出走馬登録
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
          race_id: race.id,
          horse_id: horseId,
          post_number: entry.post_number,
          gate_number: entry.gate_number,
          jockey: entry.jockey?.trim() || "未定",
          weight: entry.weight,
          odds: entry.odds,
          popularity: entry.popularity,
        });
      }

      if (entryInserts.length > 0) {
        await admin.from("race_entries").insert(entryInserts);
      }

      registered++;
      results.push({
        name: raceData.name,
        status: "registered",
        race_id: race.id,
        entries_count: entryInserts.length,
      });
    } catch (err: any) {
      failed++;
      results.push({ name: raceData.name, status: "error", error: err.message });
    }
  }

  return NextResponse.json({ registered, skipped, failed, results });
}
