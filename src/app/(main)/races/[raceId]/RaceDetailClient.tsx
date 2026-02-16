"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import HorseList from "@/components/races/HorseList";
import VoteForm from "@/components/races/VoteForm";
import VoteEditForm from "@/components/races/VoteEditForm";
import VoteSummary from "@/components/races/VoteSummary";
import VoteDistribution from "@/components/races/VoteDistribution";
import RaceResultTable from "@/components/races/RaceResultTable";
import CommentSection from "@/components/comments/CommentSection";
import ShareButtons from "@/components/social/ShareButtons";
import RaceCountdown from "@/components/races/RaceCountdown";
import MyNewspaperTab from "@/components/races/MyNewspaperTab";

type Props = {
  race: any;
  entries: any[] | null;
  myVote: any;
  results: any[] | null;
  payouts: any[] | null;
  totalVotes: number;
  userId: string;
  isVotable: boolean;
  hasVoted: boolean;
  isFinished: boolean;
  isBeforeDeadline: boolean;
  pointsTransactions: any[] | null;
};

export default function RaceDetailClient({
  race, entries, myVote, results, payouts, totalVotes, userId,
  isVotable, hasVoted, isFinished, isBeforeDeadline, pointsTransactions
}: Props) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"horses" | "newspaper" | "votes" | "comments">("horses");

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const linkColor = isDark ? "hover:text-amber-400" : "hover:text-green-600";

  const gradeColor = getGradeColor(race.grade, isDark);
  const postTime = race.post_time
    ? new Date(race.post_time).toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const statusBadge = isVotable
    ? { text: "🗳 投票受付中", style: isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700" }
    : isFinished
    ? { text: "📊 結果確定", style: isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600" }
    : hasVoted
    ? { text: "✅ 投票済み", style: isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700" }
    : !isBeforeDeadline
    ? { text: "⏰ 締切済み", style: isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700" }
    : { text: "準備中", style: isDark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600" };

  const tabs = [
    { key: "horses", label: "📋 出馬表", show: true },
    { key: "newspaper", label: "📰 My新聞", show: hasVoted || isFinished },
    { key: "votes", label: "👥 みんなの予想", show: hasVoted || isFinished },
    { key: "comments", label: "💬 掲示板", show: hasVoted || isFinished },
  ].filter(t => t.show);

  const tabActive = isDark ? "bg-amber-500 text-slate-900" : "bg-green-600 text-white";
  const tabInactive = isDark
    ? "bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/50"
    : "bg-white text-gray-600 border border-gray-200 hover:border-green-300";

  // シェアテキスト生成
  const generateShareText = () => {
    if (!myVote) return "";
    const picks = myVote.vote_picks ?? [];
    const winPick = picks.find((p: any) => p.pick_type === "win");
    const placePicks = picks.filter((p: any) => p.pick_type === "place");
    const dangerPick = picks.find((p: any) => p.pick_type === "danger");
    const fmt = (p: any) => `${p.race_entries?.post_number ?? "?"}.${ (p.race_entries?.horses as any)?.name ?? "不明"}`;
    const weekday = ["日","月","火","水","木","金","土"][new Date(race.race_date + "T00:00:00+09:00").getDay()];
    return [
      "#ゲートイン競馬予想",
      `${race.race_date}(${weekday}) ${race.course_name}${race.race_number ? ` ${race.race_number}R` : ""} ${race.grade ? `[${race.grade}] ` : ""}${race.name}`,
      winPick ? `◎本命: ${fmt(winPick)}` : "",
      placePicks.length > 0 ? `○相手: ${placePicks.map(fmt).join(" / ")}` : "",
      dangerPick ? `△危険: ${fmt(dangerPick)}` : "",
      "https://gate-in.jp",
    ].filter(Boolean).join("\n");
  };

  return (
    <div className="space-y-4">
      {/* パンくず */}
      <div className={`text-sm ${textMuted}`}>
        <Link href="/races" className={linkColor}>レース一覧</Link>
        <span className="mx-2">›</span>
        <span className={textSecondary}>{race.name}</span>
      </div>

      {/* レースヘッダー */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-center gap-3 mb-3">
          {race.grade && (
            <span className={`text-sm font-bold px-3 py-1 rounded ${gradeColor}`}>{race.grade}</span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge.style}`}>
            {statusBadge.text}
          </span>
        </div>
        <h1 className={`text-2xl font-bold mb-2 ${textPrimary}`}>{race.name}</h1>
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${textSecondary}`}>
          <span>📍 {race.course_name} {race.race_number}R</span>
          <span>🏟 {race.track_type} {race.distance}m</span>
          <span>🐴 {race.head_count ?? entries?.length ?? "?"}頭</span>
          {postTime && <span>🕐 {postTime} 発走</span>}
          {race.track_condition && <span>馬場: {race.track_condition}</span>}
          <span>投票: {totalVotes ?? 0}人</span>
          {race.post_time && <RaceCountdown startTime={race.post_time} raceDate={race.race_date} status={race.status} />}
        </div>
      </div>

      {/* 結果テーブル（結果確定時） */}
      {isFinished && results && (
        <RaceResultTable results={results} payouts={payouts} myVote={myVote} />
      )}

      {/* 投票フォーム（受付中） */}
      {isVotable && entries && (
        <VoteForm raceId={race.id} entries={entries} />
      )}

      {/* タブナビゲーション */}
      {tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key ? tabActive : tabInactive
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* 出馬表タブ */}
          {activeTab === "horses" && entries && (
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
              <h2 className={`font-bold mb-3 ${textPrimary}`}>📋 出馬表</h2>
              <HorseList entries={entries} myVote={myVote} results={results} />
            </div>
          )}

          {/* My新聞タブ */}
          {activeTab === "newspaper" && (
            <MyNewspaperTab raceId={race.id} entries={(entries ?? []).map(e => ({ id: e.id, post_number: e.post_number, horses: e.horses }))} />
          )}

          {/* みんなの予想タブ */}
          {activeTab === "votes" && (
            <VoteDistribution raceId={race.id} />
          )}

          {/* 掲示板タブ */}
          {activeTab === "comments" && (
            <CommentSection raceId={race.id} currentUserId={userId} />
          )}

          {/* 投票編集フォーム */}
          {hasVoted && myVote && race.status === "voting_open" && entries && activeTab === "horses" && (
            <VoteEditForm
              raceId={race.id} entries={entries}
              existingPicks={(myVote.vote_picks ?? []).map((p: any) => ({
                pick_type: p.pick_type, race_entry_id: p.race_entry_id,
              }))}
              postTime={race.post_time}
            />
          )}

          {/* シェアボタン */}
          {hasVoted && myVote && (
            <div className={`rounded-2xl border p-4 flex items-center justify-between ${cardBg}`}>
              <span className={`text-sm font-bold ${textPrimary}`}>📣 予想をシェア</span>
              <ShareButtons text={generateShareText()} />
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-4">
          {hasVoted && myVote && (
            <VoteSummary vote={myVote} isFinished={isFinished} transactions={pointsTransactions} />
          )}
          <PointsGuide isDark={isDark} />
        </div>
      </div>
    </div>
  );
}

function PointsGuide({ isDark }: { isDark: boolean }) {
  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-400";
  const textMuted = isDark ? "text-slate-300" : "text-gray-600";
  const borderColor = isDark ? "border-slate-700" : "border-gray-50";
  const linkColor = isDark ? "text-amber-400" : "text-green-600";

  const items = [
    { label: "🎯 単勝的中（◎1着）", value: "20〜250P", color: "text-red-500" },
    { label: "🎫 複勝的中（◎3着以内）", value: "10〜60P", color: "text-blue-500" },
    { label: "🎫 馬連的中", value: "30〜280P", color: isDark ? "text-green-400" : "text-green-600" },
    { label: "🔥 馬単ボーナス", value: "×2倍", color: "text-red-500" },
    { label: "🎟️ ワイド的中", value: "15〜90P", color: isDark ? "text-green-400" : "text-green-600" },
    { label: "🎰 三連複的中", value: "20〜300P", color: "text-purple-500" },
    { label: "🔥 3連単ボーナス", value: "×3〜5倍", color: "text-red-500" },
    { label: "⚠️ 危険馬的中", value: "10〜50P", color: "text-orange-500" },
    { label: "💎 完全的中ボーナス", value: "+200P", color: isDark ? "text-yellow-400" : "text-yellow-600" },
  ];

  return (
    <div className={`rounded-2xl border p-5 ${cardBg}`}>
      <h3 className={`font-bold mb-3 ${textPrimary}`}>🎯 獲得ポイント目安</h3>
      <p className={`text-xs mb-2 ${textSecondary}`}>※オッズ連動（高配当ほど高ポイント）</p>
      <div className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <div key={i} className={`flex justify-between py-1 border-b ${borderColor} last:border-0`}>
            <span className={textMuted}>{item.label}</span>
            <span className={`font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
      <Link href="/guide/points" className={`block text-center text-xs font-bold mt-3 hover:underline ${linkColor}`}>
        📖 ポイントルール詳細 →
      </Link>
    </div>
  );
}

function getGradeColor(grade: string | null, isDark: boolean): string {
  if (isDark) {
    switch (grade) {
      case "G1": return "bg-yellow-500/20 text-yellow-400";
      case "G2": return "bg-red-500/20 text-red-400";
      case "G3": return "bg-green-500/20 text-green-400";
      case "OP": return "bg-blue-500/20 text-blue-400";
      default:   return "bg-slate-700 text-slate-300";
    }
  }
  switch (grade) {
    case "G1": return "bg-yellow-100 text-yellow-800";
    case "G2": return "bg-red-100 text-red-700";
    case "G3": return "bg-green-100 text-green-700";
    case "OP": return "bg-blue-100 text-blue-700";
    default:   return "bg-gray-100 text-gray-600";
  }
}
