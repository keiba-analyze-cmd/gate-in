import { createAdminClient } from "@/lib/admin";
import { RANKS } from "@/lib/constants/ranks";

/**
 * ランクアップチェック & 通知
 * ポイント加算後に呼び出す
 * @returns 新しい rank_id（変更があった場合）、なければ null
 */
export async function checkRankUp(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("rank_id, cumulative_points")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const currentRankIdx = RANKS.findIndex((r) => r.id === profile.rank_id);
  const points = profile.cumulative_points;

  // 現在のポイントで到達できる最高ランクを検索
  let newRankIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].threshold) {
      newRankIdx = i;
      break;
    }
  }

  // ランクアップしていない場合
  if (newRankIdx <= currentRankIdx) return null;

  const newRank = RANKS[newRankIdx];
  const oldRank = currentRankIdx >= 0 ? RANKS[currentRankIdx] : RANKS[0];

  // ランク更新
  await admin
    .from("profiles")
    .update({ rank_id: newRank.id })
    .eq("id", userId);

  // 通知作成
  await admin.from("notifications").insert({
    user_id: userId,
    type: "rank_up",
    title: "ランクアップ！🎉",
    body: `${oldRank.icon} ${oldRank.name} → ${newRank.icon} ${newRank.name} にランクアップしました！`,
    is_read: false,
  });

  return newRank.id;
}
