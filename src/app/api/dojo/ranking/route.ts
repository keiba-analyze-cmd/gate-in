// src/app/api/dojo/ranking/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // XPログを集計してランキング作成
    const { data: xpRanking, error } = await supabase
      .rpc("get_dojo_ranking", { limit_count: 50 });

    if (error) {
      // RPC未設定の場合のフォールバック
      console.warn("RPC未設定、フォールバック使用:", error.message);

      // 手動集計
      const { data: xpLogs } = await supabase
        .from("dojo_xp_log")
        .select("user_id, amount");

      if (!xpLogs) {
        return NextResponse.json([]);
      }

      // ユーザー別合計
      const userXp: Record<string, number> = {};
      xpLogs.forEach((log) => {
        userXp[log.user_id] = (userXp[log.user_id] || 0) + log.amount;
      });

      // ソート
      const sorted = Object.entries(userXp)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50);

      // ユーザー情報取得
      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      const ranking = sorted.map(([userId, xp], i) => {
        const profile = profileMap.get(userId);
        return {
          rank: i + 1,
          userId,
          displayName: profile?.display_name || "名無しの競馬ファン",
          handle: profile?.handle || "",
          avatarUrl: profile?.avatar_url || "",
          totalXp: xp,
        };
      });

      return NextResponse.json(ranking);
    }

    return NextResponse.json(xpRanking || []);
  } catch (error) {
    console.error("ranking API error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
