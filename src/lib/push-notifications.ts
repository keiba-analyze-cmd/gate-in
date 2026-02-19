// src/lib/push-notifications.ts
// プッシュ通知送信ヘルパー

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://gate-in.jp";

type NotificationPayload = {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

async function sendNotification(payload: NotificationPayload) {
  try {
    const res = await fetch(`${BASE_URL}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_KEY}`,
      },
      body: JSON.stringify({
        userId: payload.userId,
        userIds: payload.userIds,
        title: payload.title,
        body: payload.body,
        data: {
          url: payload.url || "/",
          tag: payload.tag || "default",
        },
      }),
    });

    if (!res.ok) {
      console.error("通知送信失敗:", await res.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("通知送信エラー:", error);
    return false;
  }
}

// ========== 通知タイプ別関数 ==========

// 🏇 レース開始前通知
export async function notifyRaceStarting(userIds: string[], raceName: string, raceId: string, minutesBefore: number) {
  return sendNotification({
    userIds,
    title: "🏇 まもなく発走",
    body: `${raceName}が${minutesBefore}分後にスタートします`,
    url: `/races/${raceId}`,
    tag: `race-${raceId}`,
  });
}

// ✅ 的中通知
export async function notifyHit(userId: string, raceName: string, raceId: string, points: number) {
  return sendNotification({
    userId,
    title: "🎉 的中おめでとう！",
    body: `${raceName}で的中！ +${points}pt獲得`,
    url: `/races/${raceId}`,
    tag: `hit-${raceId}`,
  });
}

// 👤 新しいフォロワー通知
export async function notifyNewFollower(userId: string, followerName: string, followerId: string) {
  return sendNotification({
    userId,
    title: "👤 新しいフォロワー",
    body: `${followerName}さんにフォローされました`,
    url: `/users/${followerId}`,
    tag: `follower-${followerId}`,
  });
}

// ❤️ リアクション通知
export async function notifyReaction(userId: string, reactorName: string, commentId: string, emoji: string) {
  return sendNotification({
    userId,
    title: `${emoji} リアクション`,
    body: `${reactorName}さんがあなたのコメントにリアクションしました`,
    url: `/notifications`,
    tag: `reaction-${commentId}`,
  });
}

// 📋 予想コピー通知
export async function notifyVoteCopied(userId: string, copierName: string, raceName: string, raceId: string) {
  return sendNotification({
    userId,
    title: "📋 予想がコピーされました",
    body: `${copierName}さんがあなたの${raceName}の予想を参考にしました`,
    url: `/races/${raceId}`,
    tag: `copy-${raceId}`,
  });
}

// 💬 コメント返信通知
export async function notifyCommentReply(userId: string, replierName: string, raceId: string) {
  return sendNotification({
    userId,
    title: "💬 コメントに返信がありました",
    body: `${replierName}さんが返信しました`,
    url: `/races/${raceId}`,
    tag: `reply-${raceId}`,
  });
}

// 🏆 ランクアップ通知
export async function notifyRankUp(userId: string, newRankName: string) {
  return sendNotification({
    userId,
    title: "🏆 ランクアップ！",
    body: `${newRankName}に昇格しました！`,
    url: `/mypage`,
    tag: "rankup",
  });
}

// 🎖️ バッジ獲得通知
export async function notifyBadgeEarned(userId: string, badgeName: string) {
  return sendNotification({
    userId,
    title: "🎖️ バッジ獲得！",
    body: `「${badgeName}」バッジを獲得しました`,
    url: `/mypage/badges`,
    tag: "badge",
  });
}
