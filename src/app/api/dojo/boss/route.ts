// src/app/api/dojo/boss/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未ログインです" }, { status: 401 });
    }

    const { courseId, score, cleared } = await request.json();

    if (!courseId || score === undefined || cleared === undefined) {
      return NextResponse.json(
        { error: "courseId, score, cleared が必要です" },
        { status: 400 }
      );
    }

    // 既存の進捗を取得
    const { data: existing } = await supabase
      .from("dojo_boss")
      .select("id, best_score, cleared, attempts")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .single();

    if (existing) {
      const newBest = Math.max(existing.best_score, score);
      const newCleared = existing.cleared || cleared;
      const newAttempts = existing.attempts + 1;

      const { error } = await supabase
        .from("dojo_boss")
        .update({
          best_score: newBest,
          cleared: newCleared,
          attempts: newAttempts,
          cleared_at:
            cleared && !existing.cleared
              ? new Date().toISOString()
              : undefined,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("BOSS更新エラー:", error);
        return NextResponse.json({ error: "更新失敗" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        bestScore: newBest,
        cleared: newCleared,
        attempts: newAttempts,
        isNewBest: score > existing.best_score,
      });
    } else {
      const { error } = await supabase.from("dojo_boss").insert({
        user_id: user.id,
        course_id: courseId,
        best_score: score,
        cleared,
        attempts: 1,
        cleared_at: cleared ? new Date().toISOString() : null,
      });

      if (error) {
        console.error("BOSS挿入エラー:", error);
        return NextResponse.json({ error: "保存失敗" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        bestScore: score,
        cleared,
        attempts: 1,
        isNewBest: true,
      });
    }
  } catch (error) {
    console.error("boss API error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
