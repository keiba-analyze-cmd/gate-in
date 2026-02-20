import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { TwitterApi } from "twitter-api-v2";

function verifyCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get("x-vercel-cron")) return true;
  return false;
}

// X API クライアント初期化
function getTwitterClient() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error("X API credentials not configured");
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });
}

// 動的コンテンツの置換（MVP名、的中率など）
async function replaceDynamicContent(content: string, admin: ReturnType<typeof createAdminClient>): Promise<string> {
  let result = content;

  // {{weekly_mvp}} → 週間MVPのユーザー名
  if (result.includes("{{weekly_mvp}}")) {
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const day = jstNow.getUTCDay();
    const diffToLastSun = day === 0 ? 7 : day;
    const lastSunday = new Date(jstNow);
    lastSunday.setUTCDate(lastSunday.getUTCDate() - diffToLastSun);
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setUTCDate(lastSaturday.getUTCDate() - 1);
    
    const startDate = lastSaturday.toISOString().split("T")[0];
    const endDate = lastSunday.toISOString().split("T")[0];

    const { data: topUser } = await admin
      .from("votes")
      .select("user_id, earned_points, profiles(display_name)")
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59")
      .order("earned_points", { ascending: false })
      .limit(1)
      .single();

    const mvpName = (topUser?.profiles as any)?.display_name ?? "---";
    result = result.replace(/\{\{weekly_mvp\}\}/g, mvpName);
  }

  // {{today_date}} → 今日の日付
  if (result.includes("{{today_date}}")) {
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const month = jstNow.getUTCMonth() + 1;
    const day = jstNow.getUTCDate();
    result = result.replace(/\{\{today_date\}\}/g, `${month}/${day}`);
  }

  return result;
}

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  
  // 現在時刻から5分以内に予定されている未投稿のポストを取得
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const { data: pendingPosts, error: fetchError } = await admin
    .from("x_scheduled_posts")
    .select("*")
    .eq("status", "pending")
    .gte("scheduled_at", fiveMinAgo)
    .lte("scheduled_at", fiveMinLater)
    .order("scheduled_at", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch scheduled posts:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pendingPosts || pendingPosts.length === 0) {
    return NextResponse.json({ message: "No posts to send", count: 0 });
  }

  const results: { id: string; status: string; tweet_id?: string; error?: string }[] = [];

  for (const post of pendingPosts) {
    try {
      // 動的コンテンツを置換
      const content = await replaceDynamicContent(post.content, admin);
      const fullContent = post.hashtags ? `${content}\n\n${post.hashtags}` : content;

      // X APIで投稿
      const client = getTwitterClient();
      const tweet = await client.v2.tweet(fullContent);

      // 成功時: DBを更新
      await admin
        .from("x_scheduled_posts")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
          tweet_id: tweet.data.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      results.push({ id: post.id, status: "posted", tweet_id: tweet.data.id });
    } catch (err: any) {
      console.error(`Failed to post ${post.id}:`, err);

      // 失敗時: エラーを記録
      await admin
        .from("x_scheduled_posts")
        .update({
          status: "failed",
          error_message: err.message || "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      results.push({ id: post.id, status: "failed", error: err.message });
    }
  }

  return NextResponse.json({
    message: "Processed scheduled posts",
    count: results.length,
    results,
  });
}
