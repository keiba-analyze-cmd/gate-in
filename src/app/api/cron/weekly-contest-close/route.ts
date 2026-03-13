import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";

/**
 * 週間予想大会 終了処理
 * 毎週火曜 5:00 JST に実行
 * Vercel Cron: "0 20 * * 1" (UTC 20:00 Mon = JST 05:00 Tue)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // active な週間大会をクローズ
  const { data: activeContests } = await admin
    .from("contests")
    .select("id, name")
    .eq("type", "weekly")
    .eq("status", "active");

  const closed: string[] = [];

  for (const contest of activeContests ?? []) {
    await admin
      .from("contests")
      .update({ status: "finished" })
      .eq("id", contest.id);
    closed.push(contest.name);
  }

  return NextResponse.json({
    message: "週間大会を終了しました",
    closed_contests: closed,
  });
}
