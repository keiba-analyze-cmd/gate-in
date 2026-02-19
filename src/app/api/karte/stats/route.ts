// src/app/api/karte/stats/route.ts
// ユーザーの予想成績統計を取得するAPI

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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    let startDate: string | null = null;
    const now = new Date();
    
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
    } else if (period === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      startDate = monthAgo.toISOString().split("T")[0];
    }

    let query = supabase
      .from("vote_picks")
      .select(`
        id,
        pick_type,
        vote:votes!inner(
          id,
          user_id,
          race_id,
          race:races!inner(
            id,
            name,
            race_date,
            course_name,
            distance,
            track_type
          )
        ),
        entry:race_entries!inner(
          id,
          popularity,
          odds,
          jockey
        )
      `)
      .eq("vote.user_id", user.id);

    if (startDate) {
      query = query.gte("vote.race.race_date", startDate);
    }

    const { data: picks, error } = await query;

    if (error) {
      console.error("Stats fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    const stats = {
      totalVotes: 0,
      totalHits: 0,
      hitRate: 0,
      honmeiTotal: 0,
      honmeiHits: 0,
      honmeiHitRate: 0,
      byCourse: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      bySurface: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      byDistance: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      byJockey: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      byMark: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      trackingCount: 0,
    };

    picks?.forEach((pick: any) => {
      const race = pick.vote?.race;
      const entry = pick.entry;
      const result = resultsMap.get(entry?.id);
      
      if (!result) return;
      
      const finishPosition = result.finish_position;
      const isHit = finishPosition <= 3;
      const markJp = MARK_MAP[pick.pick_type] || pick.pick_type;

      stats.totalVotes++;
      if (isHit) stats.totalHits++;

      if (pick.pick_type === "win") {
        stats.honmeiTotal++;
        if (finishPosition === 1) stats.honmeiHits++;
      }

      const course = race?.course_name || "不明";
      if (!stats.byCourse[course]) {
        stats.byCourse[course] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.byCourse[course].total++;
      if (isHit) stats.byCourse[course].hits++;

      const surface = race?.track_type || "芝";
      if (!stats.bySurface[surface]) {
        stats.bySurface[surface] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.bySurface[surface].total++;
      if (isHit) stats.bySurface[surface].hits++;

      const distance = race?.distance || 1600;
      const distanceCategory = distance < 1400 ? "短距離" :
                               distance < 1800 ? "マイル" :
                               distance < 2200 ? "中距離" : "長距離";
      if (!stats.byDistance[distanceCategory]) {
        stats.byDistance[distanceCategory] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.byDistance[distanceCategory].total++;
      if (isHit) stats.byDistance[distanceCategory].hits++;

      const jockey = entry?.jockey;
      if (jockey) {
        if (!stats.byJockey[jockey]) {
          stats.byJockey[jockey] = { total: 0, hits: 0, hitRate: 0 };
        }
        stats.byJockey[jockey].total++;
        if (isHit) stats.byJockey[jockey].hits++;
      }

      // 印別（日本語に変換して表示）
      if (!stats.byMark[markJp]) {
        stats.byMark[markJp] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.byMark[markJp].total++;
      if (isHit) stats.byMark[markJp].hits++;
    });

    stats.hitRate = stats.totalVotes > 0 
      ? Math.round((stats.totalHits / stats.totalVotes) * 1000) / 10 
      : 0;
    
    stats.honmeiHitRate = stats.honmeiTotal > 0 
      ? Math.round((stats.honmeiHits / stats.honmeiTotal) * 1000) / 10 
      : 0;

    const calcHitRate = (obj: Record<string, { total: number; hits: number; hitRate: number }>) => {
      Object.values(obj).forEach(v => {
        v.hitRate = v.total > 0 ? Math.round((v.hits / v.total) * 1000) / 10 : 0;
      });
    };
    
    calcHitRate(stats.byCourse);
    calcHitRate(stats.bySurface);
    calcHitRate(stats.byDistance);
    calcHitRate(stats.byJockey);
    calcHitRate(stats.byMark);

    const topJockeys = Object.entries(stats.byJockey)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, { total: number; hits: number; hitRate: number }>);
    stats.byJockey = topJockeys;

    const { count: trackingCount } = await supabase
      .from("horse_karte")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "tracking");
    
    stats.trackingCount = trackingCount || 0;

    return NextResponse.json({ data: stats, period });

  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
