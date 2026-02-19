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

// ── POST: 過去レースのオッズを一括取得（scrape-resultsを内部呼び出し） ──
export async function POST(request: Request) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const admin = createAdminClient();
  const results: { raceId: string; name: string; date: string; updated: number; error?: string }[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    const { limit = 10 } = body;

    // オッズがnullのエントリーを持つ確定済みレースを取得
    const { data: races, error: fetchError } = await admin
      .from("races")
      .select(`
        id, name, external_id, race_date,
        race_entries(id, post_number, odds, popularity)
      `)
      .eq("status", "finished")
      .not("external_id", "is", null)
      .order("race_date", { ascending: false })
      .limit(100);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // オッズがnullのエントリーがあるレースのみ対象
    const targetRaces = (races ?? [])
      .filter(race => 
        race.race_entries.some((e: any) => e.odds === null || e.popularity === null)
      )
      .slice(0, limit);

    if (targetRaces.length === 0) {
      return NextResponse.json({ 
        message: "更新対象のレースがありません", 
        results: [] 
      });
    }

    // 各レースに対してscrape-resultsを呼び出す
    const baseUrl = request.headers.get("origin") || "http://localhost:3000";
    const cookies = request.headers.get("cookie") || "";

    for (const race of targetRaces) {
      try {
        const res = await fetch(`${baseUrl}/api/admin/scrape-results?race_id=${race.id}`, {
          headers: {
            "Cookie": cookies,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          results.push({
            raceId: race.id,
            name: race.name,
            date: race.race_date,
            updated: 0,
            error: data.error || "取得失敗",
          });
        } else {
          results.push({
            raceId: race.id,
            name: race.name,
            date: race.race_date,
            updated: data.odds_updated || 0,
          });
        }

        // レート制限対策（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        results.push({
          raceId: race.id,
          name: race.name,
          date: race.race_date,
          updated: 0,
          error: err instanceof Error ? err.message : "不明なエラー",
        });
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const successCount = results.filter(r => r.updated > 0).length;

    return NextResponse.json({
      message: `${successCount}/${targetRaces.length}レースのオッズを更新しました（${totalUpdated}頭）`,
      results,
    });

  } catch (err) {
    return NextResponse.json({
      error: "オッズ取得に失敗しました",
      details: err instanceof Error ? err.message : "不明なエラー",
    }, { status: 500 });
  }
}

// ── GET: 更新が必要なレース数を確認 ──
export async function GET(request: Request) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const admin = createAdminClient();

  // オッズがnullのエントリーがあるレースを取得
  const { data: races } = await admin
    .from("races")
    .select(`
      id, name, external_id, race_date, course_name,
      race_entries(id, odds, popularity)
    `)
    .eq("status", "finished")
    .not("external_id", "is", null)
    .order("race_date", { ascending: false })
    .limit(200);

  const needsUpdate = (races ?? []).filter(race =>
    race.race_entries.some((e: any) => e.odds === null || e.popularity === null)
  );

  const totalMissingEntries = needsUpdate.reduce((sum, race) =>
    sum + race.race_entries.filter((e: any) => e.odds === null || e.popularity === null).length
    , 0);

  return NextResponse.json({
    total_races: needsUpdate.length,
    total_missing_entries: totalMissingEntries,
    races: needsUpdate.map(r => ({
      id: r.id,
      name: r.name,
      date: r.race_date,
      course: r.course_name,
      missing: r.race_entries.filter((e: any) => e.odds === null || e.popularity === null).length,
      total: r.race_entries.length,
      has_external_id: !!r.external_id,
    })),
  });
}
