import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { getArticles } from "@/lib/microcms";
import { TwitterApi } from "twitter-api-v2";
import { sendSlackNotification } from "@/lib/slack";

const SITE_URL = "https://gate-in.jp";

/**
 * 記事シェア自動投稿
 * 毎日 12:00 / 18:00 JST
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // 1. microCMSから記事を取得（最大500件）
    const articlesData = await getArticles({ limit: 100 });
    let allArticles = articlesData.contents;

    // 100件以上ある場合は追加取得
    if (articlesData.totalCount > 100) {
      const remaining = Math.min(articlesData.totalCount - 100, 400);
      const batches = Math.ceil(remaining / 100);
      for (let i = 0; i < batches; i++) {
        const moreData = await getArticles({ limit: 100, offset: 100 + i * 100 });
        allArticles = [...allArticles, ...moreData.contents];
      }
    }

    // 2. 投稿済み記事を取得
    const { data: posted } = await admin
      .from("article_posts")
      .select("article_id");
    const postedIds = new Set((posted ?? []).map((p) => p.article_id));

    // 3. 未投稿の記事をフィルタ
    const unposted = allArticles.filter((a) => !postedIds.has(a.id));

    if (unposted.length === 0) {
      // 全記事投稿済み → リセットして最初から
      await admin.from("article_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      return NextResponse.json({ 
        message: "All articles posted. Reset for next cycle.", 
        total: allArticles.length 
      });
    }

    // 4. ランダムに1件選択
    const article = unposted[Math.floor(Math.random() * unposted.length)];

    // 5. 投稿文を生成
    const emoji = article.emoji || "📚";
    const title = article.title;
    const categoryName = article.category?.name || "競馬知識";
    
    // 概要を生成（excerptがなければcontentから抽出）
    let summary = article.excerpt || "";
    if (!summary && article.content) {
      const plainText = article.content.replace(/<[^>]*>/g, "").trim();
      summary = plainText.slice(0, 80);
      if (plainText.length > 80) summary += "...";
    }

    const articleUrl = `${SITE_URL}/dojo/articles/${article.id}`;
    
    // ハッシュタグ（カテゴリ名をハッシュタグ化）
    const categoryTag = categoryName.replace(/\s+/g, "");
    
    const tweetText = `${emoji} ${title}

${summary}

📚 記事を読む👇
${articleUrl}

#競馬 #${categoryTag} #ゲートイン`;

    // 6. X APIで投稿
    const twitter = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_SECRET!,
    });

    const { data: tweet } = await twitter.v2.tweet(tweetText);

    // 7. 投稿済みとして記録
    await admin.from("article_posts").insert({
      article_id: article.id,
      tweet_id: tweet.id,
    });

    // 8. Slack通知
    await sendSlackNotification(
      "sns",
      `📚 記事シェア投稿完了\n` +
      `タイトル: ${title}\n` +
      `URL: https://twitter.com/i/web/status/${tweet.id}`
    );

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
      },
      tweet_id: tweet.id,
      remaining: unposted.length - 1,
    });

  } catch (error: any) {
    console.error("Article post error:", error);
    
    await sendSlackNotification(
      "alerts",
      `❌ 記事シェア投稿エラー\n${error.message}`
    );

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
