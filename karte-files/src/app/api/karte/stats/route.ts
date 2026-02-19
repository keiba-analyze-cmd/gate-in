// src/app/api/karte/stats/route.ts
// ユーザーの予想成績統計を取得するAPI

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: ユーザーの成績統計を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // 'week', 'month', 'all'

    // 期間の計算
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

    // 基本クエリ: vote_picks から集計
    let query = supabase
      .from("vote_picks")
      .select(`
        id,
        mark,
        vote:votes!inner(
          id,
          user_id,
          race:races!inner(
            id,
            name,
            race_date,
            course,
            distance,
            surface
          )
        ),
        entry:race_entries!inner(
          id,
          horse_number,
          popularity,
          odds,
          result_position,
          jockey_name
        )
      `)
      .eq("vote.user_id", user.id)
      .not("entry.result_position", "is", null);

    if (startDate) {
      query = query.gte("vote.race.race_date", startDate);
    }

    const { data: picks, error } = await query;

    if (error) {
      console.error("Stats fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 集計処理
    const stats = {
      // 全体
      totalVotes: 0,
      totalHits: 0,
      hitRate: 0,
      // 本命（◎）
      honmeiTotal: 0,
      honmeiHits: 0,
      honmeiHitRate: 0,
      // コース別
      byCourse: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      // 馬場別
      bySurface: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      // 距離別
      byDistance: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      // 騎手別
      byJockey: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      // 印別
      byMark: {} as Record<string, { total: number; hits: number; hitRate: number }>,
      // 追跡馬数
      trackingCount: 0,
    };

    // ピックを集計
    picks?.forEach((pick: any) => {
      const race = pick.vote?.race;
      const entry = pick.entry;
      const isHit = entry.result_position <= 3; // 3着以内を的中とする

      // 全体
      stats.totalVotes++;
      if (isHit) stats.totalHits++;

      // 本命
      if (pick.mark === "◎") {
        stats.honmeiTotal++;
        if (entry.result_position === 1) stats.honmeiHits++; // 本命は1着のみ
      }

      // コース別
      const course = race.course;
      if (!stats.byCourse[course]) {
        stats.byCourse[course] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.byCourse[course].total++;
      if (isHit) stats.byCourse[course].hits++;

      // 馬場別
      const surface = race.surface || "芝"; // デフォルト芝
      if (!stats.bySurface[surface]) {
        stats.bySurface[surface] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.bySurface[surface].total++;
      if (isHit) stats.bySurface[surface].hits++;

      // 距離別
      const distance = race.distance;
      const distanceCategory = distance < 1400 ? "短距離" :
                               distance < 1800 ? "マイル" :
                               distance < 2200 ? "中距離" : "長距離";
      if (!stats.byDistance[distanceCategory]) {
        stats.byDistance[distanceCategory] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.byDistance[distanceCategory].total++;
      if (isHit) stats.byDistance[distanceCategory].hits++;

      // 騎手別
      const jockey = entry.jockey_name;
      if (jockey) {
        if (!stats.byJockey[jockey]) {
          stats.byJockey[jockey] = { total: 0, hits: 0, hitRate: 0 };
        }
        stats.byJockey[jockey].total++;
        if (isHit) stats.byJockey[jockey].hits++;
      }

      // 印別
      const mark = pick.mark;
      if (!stats.byMark[mark]) {
        stats.byMark[mark] = { total: 0, hits: 0, hitRate: 0 };
      }
      stats.byMark[mark].total++;
      if (isHit) stats.byMark[mark].hits++;
    });

    // 的中率を計算
    stats.hitRate = stats.totalVotes > 0 
      ? Math.round((stats.totalHits / stats.totalVotes) * 1000) / 10 
      : 0;
    
    stats.honmeiHitRate = stats.honmeiTotal > 0 
      ? Math.round((stats.honmeiHits / stats.honmeiTotal) * 1000) / 10 
      : 0;

    // 各カテゴリの的中率を計算
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

    // 騎手別は上位5名のみ
    const topJockeys = Object.entries(stats.byJockey)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, { total: number; hits: number; hitRate: number }>);
    stats.byJockey = topJockeys;

    // 追跡馬数を取得
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
