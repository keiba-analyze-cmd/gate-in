// src/app/api/dojo/xp/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  XP_RULES,
  checkEarnedBadges,
  BADGE_MAP,
  type BadgeCheckContext,
} from "@/lib/constants/gamification";

// POST: XP加算 + バッジチェック
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    }

    const { action, amount, meta } = await request.json();
    // action: "quiz_correct" | "stage_clear" | "boss_clear" | "daily_complete" | "daily_streak" | "article_read"
    // amount: XP量（省略時はルールから自動計算）
    // meta: { courseId, stageId, stars, streak, ... }

    let xpAmount = amount || 0;
    if (!amount) {
      switch (action) {
        case "quiz_correct":
          xpAmount = XP_RULES.QUIZ_CORRECT;
          break;
        case "stage_clear":
          xpAmount =
            meta?.stars === 3
              ? XP_RULES.STAGE_CLEAR_3STAR
              : meta?.stars === 2
                ? XP_RULES.STAGE_CLEAR_2STAR
                : XP_RULES.STAGE_CLEAR_1STAR;
          break;
        case "boss_clear":
          xpAmount = XP_RULES.BOSS_CLEAR;
          break;
        case "daily_complete":
          xpAmount = XP_RULES.DAILY_COMPLETE;
          break;
        case "daily_streak":
          xpAmount =
            meta?.streak >= 30
              ? XP_RULES.DAILY_STREAK_30
              : meta?.streak >= 7
                ? XP_RULES.DAILY_STREAK_7
                : meta?.streak >= 3
                  ? XP_RULES.DAILY_STREAK_3
                  : 0;
          break;
        case "article_read":
          xpAmount = XP_RULES.ARTICLE_READ;
          break;
      }
    }

    if (xpAmount <= 0) {
      return NextResponse.json({ xp: 0, newBadges: [] });
    }

    // XPログ挿入
    await supabase.from("dojo_xp_log").insert({
      user_id: user.id,
      action,
      amount: xpAmount,
      meta: meta || {},
    });

    // 合計XP取得
    const { data: xpData } = await supabase
      .from("dojo_xp_log")
      .select("amount")
      .eq("user_id", user.id);
    const totalXp = (xpData || []).reduce((a, r) => a + r.amount, 0);

    // バッジチェック用コンテキスト構築
    const [progressRes, bossRes, dailyRes, articleRes, badgesRes] =
      await Promise.all([
        supabase
          .from("dojo_progress")
          .select("course_id, stage_id, stars, attempts")
          .eq("user_id", user.id),
        supabase
          .from("dojo_boss")
          .select("course_id, cleared")
          .eq("user_id", user.id),
        supabase
          .from("dojo_daily")
          .select("challenge_date, completed")
          .eq("user_id", user.id)
          .eq("completed", true),
        supabase
          .from("dojo_article_reads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("dojo_badges")
          .select("badge_id")
          .eq("user_id", user.id),
      ]);

    const progressRows = progressRes.data || [];
    const clearedStages = progressRows.filter((r) => r.stars > 0).length;
    const totalStars = progressRows.reduce((a, r) => a + r.stars, 0);
    const perfectStages = progressRows.filter((r) => r.stars >= 3).length;
    const maxAttempts = Math.max(
      0,
      ...progressRows.map((r) => r.attempts)
    );

    // コース完了数の計算（10ステージ全クリアで1コース完了）
    const courseStageCounts: Record<string, number> = {};
    progressRows
      .filter((r) => r.stars > 0)
      .forEach((r) => {
        courseStageCounts[r.course_id] =
          (courseStageCounts[r.course_id] || 0) + 1;
      });
    const clearedCourses = Object.values(courseStageCounts).filter(
      (c) => c >= 10
    ).length;

    const bossCleared = (bossRes.data || []).filter(
      (r) => r.cleared
    ).length;
    const dailyTotal = (dailyRes.data || []).length;
    const articleReads = (articleRes as any)?.count || 0;

    // ストリーク計算
    let dailyStreak = 0;
    const dailyDates = new Set(
      (dailyRes.data || []).map((d) => d.challenge_date)
    );
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      if (dailyDates.has(d.toISOString().split("T")[0])) {
        dailyStreak++;
        d.setDate(d.getDate() - 1);
      } else if (i === 0) {
        d.setDate(d.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    const ctx: BadgeCheckContext = {
      totalStars,
      totalXp,
      clearedStages,
      clearedCourses,
      bossCleared,
      perfectStages,
      dailyStreak,
      dailyTotal,
      articleReads,
      maxAttempts,
    };

    const alreadyEarned = new Set(
      (badgesRes.data || []).map((b) => b.badge_id)
    );
    const newBadgeIds = checkEarnedBadges(ctx, alreadyEarned);

    // 新バッジを保存
    if (newBadgeIds.length > 0) {
      await supabase.from("dojo_badges").insert(
        newBadgeIds.map((badgeId) => ({
          user_id: user.id,
          badge_id: badgeId,
        }))
      );
    }

    const newBadges = newBadgeIds.map((id) => BADGE_MAP[id]).filter(Boolean);

    return NextResponse.json({
      xp: xpAmount,
      totalXp,
      newBadges,
    });
  } catch (error) {
    console.error("xp API error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// GET: ユーザーのXP合計 + バッジ一覧
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未ログイン" }, { status: 401 });
    }

    const [xpRes, badgesRes] = await Promise.all([
      supabase
        .from("dojo_xp_log")
        .select("amount")
        .eq("user_id", user.id),
      supabase
        .from("dojo_badges")
        .select("badge_id, earned_at")
        .eq("user_id", user.id),
    ]);

    const totalXp = (xpRes.data || []).reduce((a, r) => a + r.amount, 0);
    const badges = (badgesRes.data || []).map((b) => ({
      ...BADGE_MAP[b.badge_id],
      earnedAt: b.earned_at,
    }));

    return NextResponse.json({ totalXp, badges });
  } catch (error) {
    console.error("xp GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
