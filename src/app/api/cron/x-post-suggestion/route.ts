import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_X_POSTS;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: post, error } = await supabase
      .from("x_post_stock")
      .select("*")
      .eq("status", "pending")
      .order("id", { ascending: true })
      .limit(1)
      .single();

    if (error || !post) {
      await sendSlack("⚠️ X投稿ストックが空です。新しい投稿を追加してください。");
      return NextResponse.json({ message: "No pending posts" });
    }

    const today = new Date().toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });

    const { count: remainingCount } = await supabase
      .from("x_post_stock")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const remaining = (remainingCount ?? 1) - 1;

    const message = [
      `📝 *今日のX投稿候補（${today}）*`,
      ``,
      `*#${post.id} ${post.title}*`,
      `カテゴリ: ${post.subcategory || post.category}`,
      `───────────────`,
      post.content,
      `───────────────`,
      `残りストック: ${remaining}本`,
      `💡 20時頃にXに投稿してください`,
    ].join("\n");

    await sendSlack(message);

    await supabase
      .from("x_post_stock")
      .update({
        status: "sent_to_slack",
        slack_sent_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    return NextResponse.json({
      success: true,
      post_id: post.id,
      title: post.title,
      remaining,
    });
  } catch (err) {
    console.error("X post suggestion error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function sendSlack(text: string) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("SLACK_WEBHOOK_X_POSTS not set");
    return;
  }
  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
