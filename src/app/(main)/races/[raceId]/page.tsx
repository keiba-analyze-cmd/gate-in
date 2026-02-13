import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import HorseList from "@/components/races/HorseList";
import VoteForm from "@/components/races/VoteForm";
import VoteSummary from "@/components/races/VoteSummary";
import VoteDistribution from "@/components/races/VoteDistribution";
import RaceResultTable from "@/components/races/RaceResultTable";
import CommentSection from "@/components/comments/CommentSection";
import ShareButtons from "@/components/social/ShareButtons";

type Props = {
  params: Promise<{ raceId: string }>;
};

export default async function RaceDetailPage({ params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // レース情報
  const { data: race, error } = await supabase
    .from("races")
    .select("*")
    .eq("id", raceId)
    .single();

  if (!race || error) notFound();

  // 出馬表
  const { data: entries } = await supabase
    .from("race_entries")
    .select("*, horses(id, name, sex, sire, trainer, stable_area, career_record)")
    .eq("race_id", raceId)
    .eq("is_scratched", false)
    .order("post_number", { ascending: true });

  // 自分の投票
  const { data: myVote } = await supabase
    .from("votes")
    .select("*, vote_picks(*, race_entries(post_number, horses(name)))")
    .eq("race_id", raceId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 投票集計（全ユーザー分をカウント）
  const { createAdminClient } = await import("@/lib/admin");
  const adminDb = createAdminClient();
  const { count: totalVotes } = await adminDb
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("race_id", raceId);

  // レース結果（finished の場合）
  let results = null;
  let payouts = null;
  if (race.status === "finished") {
    const { data: r } = await supabase
      .from("race_results")
      .select("*, race_entries(post_number, jockey, odds, popularity, horses(name))")
      .eq("race_id", raceId)
      .order("finish_position", { ascending: true });
    results = r;

    const { data: p } = await supabase
      .from("payouts")
      .select("*")
      .eq("race_id", raceId);
    payouts = p;
  }

  const gradeColor = getGradeColor(race.grade);
  const postTime = race.post_time
    ? new Date(race.post_time).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isVotable = race.status === "voting_open" && !myVote;
  const hasVoted = !!myVote;
  const isFinished = race.status === "finished";

  return (
    <div className="space-y-4">
      {/* パンくずリスト */}
      <div className="text-sm text-gray-400">
        <Link href="/races" className="hover:text-green-600">レース一覧</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">{race.name}</span>
      </div>

      {/* レースヘッダー */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-3">
          {race.grade && (
            <span className={`text-sm font-bold px-3 py-1 rounded ${gradeColor}`}>
              {race.grade}
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isVotable ? "bg-green-100 text-green-700"
              : isFinished ? "bg-gray-100 text-gray-600"
              : hasVoted ? "bg-blue-100 text-blue-700"
              : "bg-yellow-100 text-yellow-700"
          }`}>
            {isVotable ? "🗳 投票受付中"
              : isFinished ? "📊 結果確定"
              : hasVoted ? "✅ 投票済み"
              : "準備中"}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{race.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>📍 {race.course_name} {race.race_number}R</span>
          <span>🏟 {race.track_type} {race.distance}m</span>
          <span>🐴 {race.head_count ?? entries?.length ?? "?"}頭</span>
          {postTime && <span>🕐 {postTime} 発走</span>}
          {race.track_condition && <span>馬場: {race.track_condition}</span>}
          <span>投票: {totalVotes ?? 0}人</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ====== メインエリア ====== */}
        <div className="lg:col-span-2 space-y-4">
          {/* レース結果（finished の場合） */}
          {isFinished && results && (
            <RaceResultTable results={results} payouts={payouts} myVote={myVote} />
          )}

          {/* 投票フォーム（投票可能な場合） */}
          {isVotable && entries && (
            <VoteForm raceId={race.id} entries={entries} />
          )}

          {/* みんなの予想分布（投票済み or 結果確定の場合） */}
          {(hasVoted || isFinished) && (
            <VoteDistribution raceId={race.id} />
          )}

          {/* 出馬表（投票済み or 結果確定） */}
          {!isVotable && entries && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-800 mb-3">📋 出馬表</h2>
              <HorseList entries={entries} myVote={myVote} results={results} />
            </div>
          )}

          {/* SNSシェア */}
          {hasVoted && myVote && (() => {
            const picks = myVote.vote_picks ?? [];
            const winPick = picks.find((p: any) => p.pick_type === "win");
            const placePicks = picks.filter((p: any) => p.pick_type === "place");
            const dangerPick = picks.find((p: any) => p.pick_type === "danger");
            const fmt = (p: any) => `${p.race_entries?.post_number ?? "?"}.${ (p.race_entries?.horses as any)?.name ?? "不明"}`;
            const weekday = ["日","月","火","水","木","金","土"][new Date(race.race_date + "T00:00:00+09:00").getDay()];
            const lines = [
              "#ゲートイン競馬予想",
              `${race.race_date}(${weekday}) ${race.course_name}${race.race_number ? ` ${race.race_number}R` : ""} ${race.grade ? `[${race.grade}] ` : ""}${race.name}`,
              winPick ? `◎本命: ${fmt(winPick)}` : "",
              placePicks.length > 0 ? `○相手: ${placePicks.map(fmt).join(" / ")}` : "",
              dangerPick ? `△危険: ${fmt(dangerPick)}` : "",
              "https://gate-in.jp",
            ].filter(Boolean).join("\n");
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">📣 予想をシェア</span>
                <ShareButtons text={lines} />
              </div>
            );
          })()}

          {/* コメント掲示板 */}
          <CommentSection raceId={race.id} currentUserId={user.id} />
        </div>

        {/* ====== サイドバー ====== */}
        <div className="space-y-4">
          {/* 投票済みの場合：自分の予想 */}
          {hasVoted && myVote && (
            <VoteSummary vote={myVote} isFinished={isFinished} />
          )}

          {/* 投票状況サマリー（投票済みの場合） */}
          {(hasVoted || isFinished) && (
            <VoteStats raceId={race.id} totalVotes={totalVotes ?? 0} />
          )}

          {/* ポイントルール */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">🎯 獲得ポイント目安</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（1番人気）</span>
                <span className="font-bold text-green-600">+50P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（2〜3番人気）</span>
                <span className="font-bold text-green-600">+100P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（4〜6番人気）</span>
                <span className="font-bold text-green-600">+200P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">1着的中（10番人気〜）</span>
                <span className="font-bold text-green-600">+500P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">複勝的中（1頭あたり）</span>
                <span className="font-bold text-blue-600">+30P</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-600">危険馬的中</span>
                <span className="font-bold text-orange-600">+10P</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-600">完全的中ボーナス</span>
                <span className="font-bold text-yellow-600">+300P</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 投票状況サマリーカード（サーバーコンポーネント）
async function VoteStats({ raceId, totalVotes }: { raceId: string; totalVotes: number }) {
  const { createAdminClient: createAdmin } = await import("@/lib/admin");
  const adminStats = createAdmin();

  // 投票者のランク分布を取得
  const { data: voterProfiles } = await adminStats
    .from("votes")
    .select("user_id, profiles(rank_id)")
    .eq("race_id", raceId);

  // ランク帯ごとの集計
  const tierCounts: Record<string, number> = {};
  for (const v of voterProfiles ?? []) {
    const rankId = (v.profiles as any)?.rank_id ?? "beginner_1";
    const tier = rankId.startsWith("master") || rankId === "legend"
      ? "マスター以上"
      : rankId.startsWith("advanced")
      ? "上級予想士"
      : rankId.startsWith("forecaster")
      ? "予想士"
      : "ビギナー";
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }

  const tiers = [
    { name: "マスター以上", icon: "👑", color: "text-yellow-600" },
    { name: "上級予想士", icon: "⭐⭐", color: "text-purple-600" },
    { name: "予想士", icon: "⭐", color: "text-blue-600" },
    { name: "ビギナー", icon: "🔰", color: "text-green-600" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 mb-3">👥 投票者の内訳</h3>
      <div className="text-center mb-3">
        <span className="text-3xl font-bold text-green-600">{totalVotes}</span>
        <span className="text-sm text-gray-500 ml-1">人が投票</span>
      </div>
      <div className="space-y-2">
        {tiers.map((tier) => {
          const count = tierCounts[tier.name] ?? 0;
          if (count === 0 && totalVotes === 0) return null;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <div key={tier.name} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                <span className="mr-1">{tier.icon}</span>
                {tier.name}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-14 text-right">
                  {count}人 ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getGradeColor(grade: string | null): string {
  switch (grade) {
    case "G1": return "bg-yellow-100 text-yellow-800";
    case "G2": return "bg-red-100 text-red-700";
    case "G3": return "bg-green-100 text-green-700";
    case "OP": return "bg-blue-100 text-blue-700";
    default:   return "bg-gray-100 text-gray-600";
  }
}
