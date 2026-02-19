// src/app/api/karte/route.ts
// 馬カルテ一覧を取得するAPI

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    // 基本クエリ: vote_picksから印をつけた馬を取得し、horse_karteと結合
    // horse_karteにない場合は pending として扱う
    let query = supabase
      .from("vote_picks")
      .select(`
        id,
        mark,
        vote:votes!inner(
          id,
          user_id,
          race_id,
          memo,
          race:races!inner(
            id,
            name,
            race_date,
            course,
            race_number,
            grade
          )
        ),
        entry:race_entries!inner(
          id,
          horse_id,
          horse_number,
          popularity,
          odds,
          result_position,
          result_time,
          result_margin,
          horse:horses!inner(
            id,
            name
          )
        ),
        karte:horse_karte(
          id,
          status,
          memo,
          is_hit,
          decided_at
        )
      `)
      .eq("vote.user_id", user.id)
      .not("entry.result_position", "is", null) // 結果が出ているレースのみ
      .order("vote(race(race_date))", { ascending: false })
      .range(offset, offset + limit - 1);

    // 印フィルター
    if (mark && mark !== "all") {
      query = query.eq("mark", mark);
    }

    const { data: picks, error } = await query;

    if (error) {
      console.error("Karte fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // データ整形
    const karteList = picks?.map((pick: any) => {
      const karte = pick.karte?.[0];
      const entry = pick.entry;
      const race = pick.vote?.race;
      
      // 的中判定（1着〜3着を的中とする場合）
      const isHit = entry.result_position <= 3;

      return {
        id: karte?.id || null,
        votePickId: pick.id,
        horseId: entry.horse_id,
        horseName: entry.horse?.name,
        raceId: race?.id,
        raceName: race?.name,
        raceDate: race?.race_date,
        course: race?.course,
        grade: race?.grade,
        mark: pick.mark,
        popularity: entry.popularity,
        odds: entry.odds,
        resultPosition: entry.result_position,
        timeDiff: entry.result_margin || "-",
        status: karte?.status || "pending",
        memo: karte?.memo || "",
        isHit,
        decidedAt: karte?.decided_at,
      };
    }) || [];

    // ステータスフィルター（pending の場合は karte が null のものも含む）
    let filteredList = karteList;
    if (status && status !== "all") {
      filteredList = karteList.filter((k: any) => k.status === status);
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
      popularity,
      odds,
      resultPosition,
      timeDiff,
      status, // 'tracking' or 'dismissed'
      memo,
      isHit,
    } = body;

    // バリデーション
    if (!horseId || !raceId || !mark || !status) {
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

    // upsert（既存があれば更新、なければ挿入）
    const { data, error } = await supabase
      .from("horse_karte")
      .upsert({
        user_id: user.id,
        horse_id: horseId,
        race_id: raceId,
        vote_pick_id: votePickId,
        mark,
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
