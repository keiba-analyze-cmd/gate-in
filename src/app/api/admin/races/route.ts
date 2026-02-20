import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user;
}

export async function POST(request: Request) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name, grade, race_date, post_time, course_name,
    track_type, distance, race_number, status, entries,
  } = body;

  if (!name || !race_date || !course_name || !track_type || !distance || !race_number) {
    return NextResponse.json(
      { error: "必須項目が不足しています（レース名, 日付, 競馬場, 馬場, 距離, レース番号）" },
      { status: 400 }
    );
  }

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json(
      { error: "出走馬を1頭以上登録してください" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: race, error: raceErr } = await admin
    .from("races")
    .insert({
      name,
      grade: grade || null,
      race_date,
      post_time: post_time || null,
      course_name,
      track_type,
      distance: parseInt(distance),
      race_number: parseInt(race_number),
      head_count: entries.length,
      status: status || "upcoming",
    })
    .select()
    .single();

  if (raceErr || !race) {
    return NextResponse.json(
      { error: "レース作成エラー: " + (raceErr?.message ?? "") },
      { status: 500 }
    );
  }

  const entryInserts = [];
  for (const entry of entries) {
    if (!entry.horse_name || !entry.jockey) continue;

    let horseId: string;
    const { data: existingHorse } = await admin
      .from("horses")
      .select("id")
      .eq("name", entry.horse_name.trim())
      .maybeSingle();

    if (existingHorse) {
      horseId = existingHorse.id;
    } else {
      const { data: newHorse, error: horseErr } = await admin
        .from("horses")
        .insert({
          name: entry.horse_name.trim(),
          sex: entry.sex || "牡",
        })
        .select("id")
        .single();

      if (horseErr || !newHorse) {
        console.error("馬作成エラー:", entry.horse_name, horseErr?.message);
        continue;
      }

      horseId = newHorse.id;
    }

    entryInserts.push({
      race_id: race.id,
      horse_id: horseId,
      post_number: parseInt(entry.post_number),
      gate_number: entry.gate_number ? parseInt(entry.gate_number) : null,
      jockey: entry.jockey.trim(),
      weight: entry.weight ? parseFloat(entry.weight) : null,
      odds: entry.odds ? parseFloat(entry.odds) : null,
      popularity: entry.popularity ? parseInt(entry.popularity) : null,
    });
  }

  if (entryInserts.length > 0) {
    const { error: entryErr } = await admin.from("race_entries").insert(entryInserts);
    if (entryErr) {
      return NextResponse.json(
        { error: "出走馬登録エラー: " + entryErr.message, race_id: race.id },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    race_id: race.id,
    race_name: race.name,
    entries_count: entryInserts.length,
  });
}

export async function GET(request: Request) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const admin = createAdminClient();
  let query = admin
    .from("races")
    .select("id, name, grade, race_date, venue, course_name, race_number, post_time, status, head_count, is_win5")
    .order("race_date", { ascending: false })
    .order("post_time", { ascending: true });

  if (date) {
    query = query.eq("race_date", date);
  } else {
    query = query.limit(50);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ races: data });
}
