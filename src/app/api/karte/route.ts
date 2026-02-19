// src/app/api/karte/route.ts
// 馬カルテ一覧を取得するAPI

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// 印の変換マップ
const MARK_MAP: Record<string, string> = {
  win: "◎",
  place: "○",
  danger: "▲",
  back: "△",
};

// GET: 振り返り待ち・カルテ一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'pending', 'tracking', 'dismissed', 'all'
    const mark = searchParams.get("mark"); // '◎', '○', '▲', '△', 'all'
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // vote_picks を取得
    const { data: picks, error } = await supabase
      .from("vote_picks")
      .select(`
        id,
        pick_type,
        is_hit,
        vote:votes!inner(
          id,
          user_id,
          race_id,
          race:races!inner(
            id,
            name,
            race_date,
            course_name,
            grade
          )
        ),
        entry:race_entries!inner(
          id,
          horse_id,
          post_number,
          popularity,
          odds,
          horse:horses!inner(
            id,
            name
          )
        )
      `)
      .eq("vote.user_id", user.id)
      .order("vote(race(race_date))", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Karte fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // race_results を取得
    const entryIds = picks?.map((p: any) => p.entry?.id).filter(Boolean) || [];
    let resultsMap = new Map();
    
    if (entryIds.length > 0) {
      const { data: results } = await supabase
        .from("race_results")
        .select("race_entry_id, finish_position, margin")
        .in("race_entry_id", entryIds);
      
      results?.forEach((r: any) => {
        resultsMap.set(r.race_entry_id, r);
      });
    }

    // horse_karte を取得
    const { data: karteData } = await supabase
      .from("horse_karte")
      .select("*")
      .eq("user_id", user.id);
    
    const karteMap = new Map();
    karteData?.forEach((k: any) => {
      const key = `${k.horse_id}-${k.race_id}`;
      karteMap.set(key, k);
    });

    // データ整形
    const karteList = picks?.map((pick: any) => {
      const entry = pick.entry;
      const race = pick.vote?.race;
      const result = resultsMap.get(entry?.id);
      const karteKey = `${entry?.horse_id}-${race?.id}`;
      const karte = karteMap.get(karteKey);
      
      // 結果がない場合はスキップ
      if (!result) return null;
      
      const markJp = MARK_MAP[pick.pick_type] || pick.pick_type;
      const isHit = result.finish_position <= 3;

      return {
        id: karte?.id || null,
        votePickId: pick.id,
        horseId: entry?.horse_id,
        horseName: entry?.horse?.name,
        raceId: race?.id,
        raceName: race?.name,
        raceDate: race?.race_date,
        course: race?.course_name,
        grade: race?.grade,
        mark: markJp,
        markEn: pick.pick_type,
        popularity: entry?.popularity,
        odds: entry?.odds,
        resultPosition: result.finish_position,
        timeDiff: result.margin || "-",
        status: karte?.status || "pending",
        memo: karte?.memo || "",
        isHit,
        decidedAt: karte?.decided_at,
      };
    }).filter(Boolean) || [];

    // フィルター適用
    let filteredList = karteList;
    
    // 印フィルター
    if (mark && mark !== "all") {
      filteredList = filteredList.filter((k: any) => k.mark === mark);
    }
    
    // ステータスフィルター
    if (status && status !== "all") {
      filteredList = filteredList.filter((k: any) => k.status === status);
    }

    return NextResponse.json({
      data: filteredList,
      total: filteredList.length,
    });

  } catch (error) {
    console.error("Karte API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 新しいカルテを作成（振り返り結果を保存）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      votePickId,
      horseId,
      raceId,
      mark,
      markEn,
      popularity,
      odds,
      resultPosition,
      timeDiff,
      status,
      memo,
      isHit,
    } = body;

    if (!horseId || !raceId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["tracking", "dismissed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("horse_karte")
      .upsert({
        user_id: user.id,
        horse_id: horseId,
        race_id: raceId,
        vote_pick_id: votePickId,
        mark: markEn || mark,
        popularity,
        odds,
        result_position: resultPosition,
        time_diff: timeDiff,
        status,
        memo,
        is_hit: isHit,
        decided_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,horse_id,race_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Karte create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error("Karte POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
