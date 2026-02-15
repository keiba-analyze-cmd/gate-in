import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const admin = createAdminClient();

  // ユーザーの投票履歴を取得
  const { data: votes } = await admin
    .from("votes")
    .select(`
      id,
      status,
      earned_points,
      is_perfect,
      vote_picks(pick_type, race_entries(odds, popularity))
    `)
    .eq("user_id", user.id)
    .neq("status", "pending");

  if (!votes || votes.length < 10) {
    return NextResponse.json({
      error: "診断には10回以上の投票が必要です",
      required: 10,
      current: votes?.length ?? 0,
    }, { status: 400 });
  }

  // 統計を計算
  let totalOdds = 0;
  let oddsCount = 0;
  let hitCount = 0;
  let perfectCount = 0;
  let totalPoints = 0;
  let biggestHit = 0;
  let longOddsCount = 0; // オッズ10倍以上
  let shortOddsCount = 0; // オッズ3倍以下
  let dangerHitCount = 0;
  let backHitCount = 0;

  for (const vote of votes) {
    const isHit = vote.status === "settled_hit";
    if (isHit) hitCount++;
    if (vote.is_perfect) perfectCount++;
    totalPoints += vote.earned_points ?? 0;
    if ((vote.earned_points ?? 0) > biggestHit) biggestHit = vote.earned_points ?? 0;

    // ピックの分析
    for (const pick of vote.vote_picks ?? []) {
      if (pick.pick_type === "win") {
        const odds = (pick.race_entries as any)?.odds;
        if (odds) {
          totalOdds += odds;
          oddsCount++;
          if (odds >= 10) longOddsCount++;
          if (odds <= 3) shortOddsCount++;
        }
      }
      if (pick.pick_type === "danger" && isHit) dangerHitCount++;
      if (pick.pick_type === "back" && isHit) backHitCount++;
    }
  }

  const totalVotes = votes.length;
  const avgOdds = oddsCount > 0 ? Math.round(totalOdds / oddsCount * 10) / 10 : 0;
  const hitRate = Math.round((hitCount / totalVotes) * 100);
  const avgPoints = Math.round(totalPoints / totalVotes);

  // スタイルタイプを判定
  let styleType: string;
  let styleIcon: string;
  let styleDescription: string;

  const longOddsRate = oddsCount > 0 ? longOddsCount / oddsCount : 0;
  const shortOddsRate = oddsCount > 0 ? shortOddsCount / oddsCount : 0;

  if (avgOdds >= 10 || longOddsRate >= 0.5) {
    styleType = "穴党タイプ";
    styleIcon = "🎯";
    styleDescription = "高配当を狙う冒険派！的中率は低めでも一発の破壊力が魅力。大穴を当てた時の快感がたまらない。";
  } else if (avgOdds <= 3 || shortOddsRate >= 0.5) {
    styleType = "本命党タイプ";
    styleIcon = "👑";
    styleDescription = "堅実な予想で着実にポイントを積み重ねる王道派。安定感抜群で、コツコツ型の予想スタイル。";
  } else if (hitRate >= 40) {
    styleType = "堅実派タイプ";
    styleIcon = "📊";
    styleDescription = "バランスの取れた予想で高い的中率を誇る。リスクとリターンのバランスを重視する賢いスタイル。";
  } else if (perfectCount >= 3) {
    styleType = "完璧主義タイプ";
    styleIcon = "💎";
    styleDescription = "完全的中を狙う精密派。◎○△まで全てを読み切る分析力が武器。";
  } else if (dangerHitCount >= 3) {
    styleType = "逆張りタイプ";
    styleIcon = "⚡";
    styleDescription = "人気馬の凡走を見抜く眼力の持ち主。危険馬指定の的中率が高く、独自の視点を持つ。";
  } else {
    styleType = "バランス型タイプ";
    styleIcon = "⚖️";
    styleDescription = "本命も穴も狙える万能派。状況に応じて戦略を変えられる柔軟なスタイル。";
  }

  // 傾向グラフ用データ
  const traits = [
    { label: "本命派", value: Math.min(Math.round((1 - longOddsRate) * 100), 100) },
    { label: "穴党", value: Math.min(Math.round(longOddsRate * 100 + avgOdds * 3), 100) },
    { label: "堅実派", value: Math.min(hitRate + 10, 100) },
    { label: "冒険派", value: Math.min(Math.round((avgOdds / 20) * 100), 100) },
  ];

  return NextResponse.json({
    style_type: styleType,
    style_icon: styleIcon,
    style_description: styleDescription,
    stats: {
      total_votes: totalVotes,
      hit_count: hitCount,
      hit_rate: hitRate,
      avg_odds: avgOdds,
      avg_points: avgPoints,
      perfect_count: perfectCount,
      biggest_hit: biggestHit,
    },
    traits,
  });
}
