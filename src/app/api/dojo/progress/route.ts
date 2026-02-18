// src/app/api/dojo/progress/route.ts
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

    const { courseId, stageId, score, stars } = await request.json();

    if (!courseId || !stageId || score === undefined || stars === undefined) {
      return NextResponse.json(
        { error: "courseId, stageId, score, stars が必要です" },
        { status: 400 }
      );
    }

    // 既存の進捗を取得
    const { data: existing } = await supabase
      .from("dojo_progress")
      .select("id, stars, best_score, attempts")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("stage_id", stageId)
      .single();

    if (existing) {
      // 更新: ベストスコア・星は最大値を保持
      const newStars = Math.max(existing.stars, stars);
      const newBest = Math.max(existing.best_score, score);
      const newAttempts = existing.attempts + 1;

      const { error } = await supabase
        .from("dojo_progress")
        .update({
          stars: newStars,
          best_score: newBest,
          attempts: newAttempts,
          cleared_at: newStars > 0 && !existing.stars ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("進捗更新エラー:", error);
        return NextResponse.json({ error: "更新失敗" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        stars: newStars,
        bestScore: newBest,
        attempts: newAttempts,
        isNewBest: score > existing.best_score,
      });
    } else {
      // 新規挿入
      const { error } = await supabase.from("dojo_progress").insert({
        user_id: user.id,
        course_id: courseId,
        stage_id: stageId,
        stars,
        best_score: score,
        attempts: 1,
        cleared_at: stars > 0 ? new Date().toISOString() : null,
      });

      if (error) {
        console.error("進捗挿入エラー:", error);
        return NextResponse.json({ error: "保存失敗" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        stars,
        bestScore: score,
        attempts: 1,
        isNewBest: true,
      });
    }
  } catch (error) {
    console.error("progress API error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// GET: ユーザーの全進捗取得
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未ログインです" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("dojo_progress")
      .select("course_id, stage_id, stars, best_score, attempts, cleared_at")
      .eq("user_id", user.id);

    if (error) {
      console.error("進捗取得エラー:", error);
      return NextResponse.json({ error: "取得失敗" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("progress GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
