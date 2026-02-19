// src/app/api/karte/tracking/route.ts
// 追跡中の馬一覧を取得するAPI

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const MARK_MAP: Record<string, string> = {
  win: "◎",
  place: "○",
  danger: "▲",
  back: "△",
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 追跡中の馬を取得
    const { data: karteList, error: karteError } = await supabase
      .from("horse_karte")
      .select(`
        id,
        horse_id,
        race_id,
        mark,
        memo,
        popularity,
        odds,
        result_position,
        time_diff,
        is_hit,
        updated_at,
        horse:horses!inner(
          id,
          name
        ),
        race:races(
          id,
          name,
          race_date,
          course_name
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "tracking")
      .order("updated_at", { ascending: false });

    if (karteError) {
      console.error("Tracking fetch error:", karteError);
      return NextResponse.json({ error: karteError.message }, { status: 500 });
    }

    // 各馬の次走情報を取得
    const horseIds = karteList?.map((k: any) => k.horse_id) || [];
    
    let nextRaces: any[] = [];
    if (horseIds.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      
      const { data: entries } = await supabase
        .from("race_entries")
        .select(`
          horse_id,
          race:races!inner(
            id,
            name,
            race_date,
            post_time,
            course_name,
            grade
          )
        `)
        .in("horse_id", horseIds)
        .gte("race.race_date", today)
        .order("race(race_date)", { ascending: true });

      if (entries) {
        const nextRaceMap = new Map();
        entries.forEach((entry: any) => {
          if (!nextRaceMap.has(entry.horse_id)) {
            nextRaceMap.set(entry.horse_id, entry.race);
          }
        });
        nextRaces = Array.from(nextRaceMap.entries()).map(([horseId, race]) => ({
          horseId,
          ...race,
        }));
      }
    }

    // ユーザーの馬別成績を集計
    const statsMap = new Map();
    karteList?.forEach((k: any) => {
      if (!statsMap.has(k.horse_id)) {
        statsMap.set(k.horse_id, { total: 0, hits: 0 });
      }
      const stat = statsMap.get(k.horse_id);
      stat.total++;
      if (k.is_hit) stat.hits++;
    });

    // データ整形
    const trackingList = karteList?.map((karte: any) => {
      const nextRace = nextRaces.find((r: any) => r.horseId === karte.horse_id);
      const stat = statsMap.get(karte.horse_id) || { total: 0, hits: 0 };
      const markJp = MARK_MAP[karte.mark] || karte.mark;

      return {
        karteId: karte.id,
        horseId: karte.horse_id,
        horseName: karte.horse?.name,
        mark: markJp,
        memo: karte.memo,
        lastRace: {
          id: karte.race?.id,
          name: karte.race?.name,
          date: karte.race?.race_date,
          course: karte.race?.course_name,
          popularity: karte.popularity,
          odds: karte.odds,
          result: karte.result_position,
          timeDiff: karte.time_diff,
        },
        nextRace: nextRace ? {
          id: nextRace.id,
          name: nextRace.name,
          date: nextRace.race_date,
          time: nextRace.post_time,
          course: nextRace.course_name,
          grade: nextRace.grade,
        } : null,
        stats: {
          total: stat.total,
          hits: stat.hits,
          hitRate: stat.total > 0 ? Math.round((stat.hits / stat.total) * 100) : 0,
        },
        updatedAt: karte.updated_at,
      };
    }) || [];

    // 今週出走予定と次走待ちに分類
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const thisWeek = trackingList.filter((t: any) => {
      if (!t.nextRace?.date) return false;
      const raceDate = new Date(t.nextRace.date);
      return raceDate >= today && raceDate <= weekEnd;
    });

    const waiting = trackingList.filter((t: any) => {
      if (!t.nextRace?.date) return true;
      const raceDate = new Date(t.nextRace.date);
      return raceDate > weekEnd;
    });

    return NextResponse.json({
      thisWeek,
      waiting,
      total: trackingList.length,
    });

  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
