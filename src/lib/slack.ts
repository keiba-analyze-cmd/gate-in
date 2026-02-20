type SlackChannel = "kpi" | "sns" | "support" | "alerts";

const WEBHOOK_URLS: Record<SlackChannel, string | undefined> = {
  kpi: process.env.SLACK_WEBHOOK_KPI,
  sns: process.env.SLACK_WEBHOOK_SNS,
  support: process.env.SLACK_WEBHOOK_SUPPORT,
  alerts: process.env.SLACK_WEBHOOK_ALERTS,
};

export async function sendSlackNotification(
  channel: SlackChannel,
  text: string
): Promise<boolean> {
  const webhookUrl = WEBHOOK_URLS[channel];
  
  if (!webhookUrl) {
    console.error(`Slack webhook URL not configured for channel: ${channel}`);
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error(`Slack notification failed: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Slack notification error:", error);
    return false;
  }
}

// KPIレポート用
export async function sendKPIReport(data: {
  date: string;
  dau: number;
  newUsers: number;
  totalUsers: number;
  votes: number;
  hitRate: number;
  races: number;
  xPosts: number;
}) {
  const text = `📊 デイリーレポート（${data.date}）

👥 *ユーザー*
・DAU: ${data.dau}人
・新規登録: ${data.newUsers}人
・累計ユーザー: ${data.totalUsers}人

🗳 *投票*
・本日の投票数: ${data.votes}件
・的中率: ${data.hitRate}%

🏇 *レース*
・開催レース: ${data.races}R

📱 *SNS*
・X投稿: ${data.xPosts}件`;

  return sendSlackNotification("kpi", text);
}

// X投稿完了通知用
export async function sendXPostNotification(content: string, tweetUrl: string) {
  const text = `✅ X投稿完了

📝 *内容:*
${content.substring(0, 200)}${content.length > 200 ? "..." : ""}

🔗 ${tweetUrl}`;

  return sendSlackNotification("sns", text);
}

// お問い合わせ通知用
export async function sendInquiryNotification(data: {
  email: string;
  category: string;
  content: string;
}) {
  const text = `📩 新しいお問い合わせ

👤 *ユーザー:* ${data.email}
📋 *カテゴリ:* ${data.category}
💬 *内容:*
${data.content.substring(0, 300)}${data.content.length > 300 ? "..." : ""}

🔗 管理画面で確認
https://gate-in.jp/admin?tab=inquiries`;

  return sendSlackNotification("support", text);
}

// コメント通報通知用
export async function sendCommentReportNotification(data: {
  reporterName: string;
  commentContent: string;
  commenterName: string;
}) {
  const text = `🚨 コメント通報

👤 *通報者:* ${data.reporterName}
💬 *対象コメント:*
「${data.commentContent.substring(0, 200)}${data.commentContent.length > 200 ? "..." : ""}」

👤 *投稿者:* ${data.commenterName}

🔗 管理画面で確認
https://gate-in.jp/admin?tab=comments`;

  return sendSlackNotification("support", text);
}

// 新規ユーザー登録通知用
export async function sendNewUserNotification(data: {
  displayName: string;
  email: string;
  createdAt: string;
}) {
  const text = `🎉 新規ユーザー登録

👤 *表示名:* ${data.displayName}
📧 ${data.email}
🕐 ${data.createdAt}`;

  return sendSlackNotification("alerts", text);
}

// レース結果確定通知用
export async function sendRaceResultNotification(data: {
  raceName: string;
  grade: string | null;
  first: string;
  second: string;
  third: string;
}) {
  const gradeText = data.grade ? `（${data.grade}）` : "";
  const text = `🏁 レース結果確定

🏇 *${data.raceName}${gradeText}*
🥇 ${data.first}
🥈 ${data.second}
🥉 ${data.third}

→ 結果速報をXに投稿してください`;

  return sendSlackNotification("alerts", text);
}

// エラー通知用
export async function sendErrorNotification(data: {
  type: string;
  message: string;
  timestamp: string;
}) {
  const text = `❌ エラー発生

🔴 *${data.type}*
📝 エラー: ${data.message}
🕐 ${data.timestamp}`;

  return sendSlackNotification("alerts", text);
}
