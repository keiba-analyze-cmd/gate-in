import { createAdminClient } from "@/lib/admin";

type NotifyParams = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
};

/**
 * 通知を作成（通知設定を尊重）
 */
export async function createNotification({ userId, type, title, body, link }: NotifyParams) {
  const admin = createAdminClient();

  // 通知設定を確認
  const { data: settings } = await admin
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // 設定が存在する場合、該当タイプがOFFなら通知しない
  if (settings) {
    const settingMap: Record<string, string> = {
      follow: "follow_notify",
      reaction: "reaction_notify",
      reply: "reply_notify",
      vote_result: "vote_result_notify",
      rank_up: "rank_up_notify",
      contest: "contest_notify",
      comment_reported: "system_notify",
      system: "system_notify",
    };
    const col = settingMap[type];
    if (col && settings[col] === false) return;
  }

  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
    is_read: false,
  });
}
