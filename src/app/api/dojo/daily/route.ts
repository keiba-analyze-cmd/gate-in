// src/app/api/dojo/daily/route.ts
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

    const { score } = await request.json();

    if (score === undefined) {
      return NextResponse.json(
        { error: "score が必要です" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // 今日のレコードがあるかチェック
    const { data: existing } = await supabase
      .from("dojo_daily")
      .select("id, completed")
      .eq("user_id", user.id)
      .eq("challenge_date", today)
      .single();

    if (existing?.completed) {
      return NextResponse.json(
        { error: "今日のチャレンジは既に完了しています" },
        { status: 409 }
      );
    }

    if (existing) {
      // 既存レコードを更新（未完了→完了）
      const { error } = await supabase
        .from("dojo_daily")
        .update({
          score,
          completed: true,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("デイリー更新エラー:", error);
        return NextResponse.json({ error: "更新失敗" }, { status: 500 });
      }
    } else {
      // 新規挿入
      const { error } = await supabase.from("dojo_daily").insert({
        user_id: user.id,
        challenge_date: today,
        score,
        completed: true,
      });

      if (error) {
        console.error("デイリー挿入エラー:", error);
        return NextResponse.json({ error: "保存失敗" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, score });
  } catch (error) {
    console.error("daily API error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// GET: 今日のデイリー状態 + ストリーク
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未ログインです" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: todayRecord } = await supabase
      .from("dojo_daily")
      .select("score, completed")
      .eq("user_id", user.id)
      .eq("challenge_date", today)
      .single();

    // ストリーク計算
    const { data: history } = await supabase
      .from("dojo_daily")
      .select("challenge_date, completed")
      .eq("user_id", user.id)
      .order("challenge_date", { ascending: false })
      .limit(30);

    let streak = 0;
    if (history && history.length > 0) {
      const date = new Date();
      for (let i = 0; i < 30; i++) {
        const dateStr = date.toISOString().split("T")[0];
        const found = history.find(
          (d) => d.challenge_date === dateStr && d.completed
        );
        if (found) {
          streak++;
          date.setDate(date.getDate() - 1);
        } else {
          if (i === 0 && !todayRecord?.completed) {
            date.setDate(date.getDate() - 1);
            continue;
          }
          break;
        }
      }
    }

    return NextResponse.json({
      completed: todayRecord?.completed ?? false,
      score: todayRecord?.score ?? 0,
      streak,
    });
  } catch (error) {
    console.error("daily GET error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
