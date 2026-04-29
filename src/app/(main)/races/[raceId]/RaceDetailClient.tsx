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
import AIPredictorTab from "@/components/races/AIPredictorTab";

type Props = {
  race: any;
  entries: any[] | null;
  myVote: any;
  results: any[] | null;
  payouts: any[] | null;
  totalVotes: number;
  userId: string;
  userName: string;
  userHandle?: string | null;
  isVotable: boolean;
  hasVoted: boolean;
  isFinished: boolean;
  isBeforeDeadline: boolean;
  pointsTransactions: any[] | null;
};

type TabConfig = {
  key: string;
  label: string;
  badge?: number | string;
};

export default function RaceDetailClient({
  race, entries, myVote, results, payouts, totalVotes, userId, userName, userHandle,
  isVotable, hasVoted, isFinished, isBeforeDeadline, pointsTransactions
}: Props) {
  const { isDark } = useTheme();

  // ── Tab config based on race state ──
  const getTabs = (): TabConfig[] => {
    if (isFinished) {
      return [
        { key: "result", label: "結果" },
        { key: "finishOrder", label: "着順" },
        { key: "payout", label: "配当" },
        { key: "everyone", label: "みんな", badge: totalVotes },
      ];
    }
    if (hasVoted) {
      return [
        { key: "myPicks", label: "My予想" },
        { key: "everyone", label: "みんな", badge: totalVotes },
        { key: "ai", label: "AI予想" },
        { key: "info", label: "情報" },
      ];
    }
    // Not voted
    return [
      { key: "vote", label: "投票" },
      { key: "everyone", label: "みんな", badge: totalVotes },
      { key: "ai", label: "AI予想" },
      { key: "info", label: "情報" },
    ];
  };

  const tabs = getTabs();
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "vote");
  const currentTab = tabs.find((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  // ── Styles ──
  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-500";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const linkColor = isDark ? "hover:text-amber-400" : "hover:text-green-600";
  const activeColor = isDark ? "text-amber-400" : "text-green-600";
  const activeBorder = isDark ? "border-amber-400" : "border-green-600";
  const borderColor = isDark ? "border-slate-700" : "border-gray-200";

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

  // ── Share text ──
  const generateShareText = () => {
    if (!myVote) return "";
    const picks = myVote.vote_picks ?? [];
    const winPick = picks.find((p: any) => p.pick_type === "win");
    const placePicks = picks.filter((p: any) => p.pick_type === "place");
    const fmt = (p: any) => `${p.race_entries?.post_number ?? "?"} ${(p.race_entries?.horses as any)?.name ?? "不明"}`;
    const profileUrl = userHandle ? `https://www.gate-in.jp/users/${userHandle}` : "";
    const profileLine = profileUrl ? `\n\n📊 フォロー&他の予想もチェック👇\n${profileUrl}` : "\n\n🏇 みんなも予想しよう👇\nhttps://gate-in.jp";
    return [
      `【${race.name}】予想🏇`,
      "",
      winPick ? `◎ ${fmt(winPick)}` : "",
      placePicks.length > 0 ? `○ ${placePicks.map(fmt).join("、")}` : "",
      profileLine,
      "",
      `#競馬予想 ${race.grade ? `#${race.grade} ` : ""}#ゲートイン`,
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

      {/* ── タブバー ── */}
      <div className={`flex border-b ${borderColor}`}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-center py-2.5 text-xs font-medium transition-colors relative ${
                isActive ? activeColor : textMuted
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                  isDark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"
                }`}>
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${activeBorder}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── タブコンテンツ ── */}

      {/* 投票タブ（受付中・未投票） */}
      {currentTab === "vote" && isVotable && entries && (
        <VoteForm
          raceId={race.id}
          entries={entries}
          raceInfo={{
            name: race.name,
            date: race.race_date,
            courseName: race.course_name,
            grade: race.grade,
          }}
          userName={userName}
          userHandle={userHandle}
        />
      )}

      {/* My予想タブ（投票済み・結果待ち） */}
      {currentTab === "myPicks" && hasVoted && myVote && (
        <div className="space-y-4">
          <VoteSummary
            vote={myVote}
            isFinished={isFinished}
            transactions={pointsTransactions}
            raceInfo={{
              name: race.name,
              date: race.race_date,
              courseName: race.course_name,
              grade: race.grade,
            }}
            userName={userName}
          />

          {/* 予想変更（発走前のみ） */}
          {race.status === "voting_open" && entries && (
            <VoteEditForm
              raceId={race.id}
              entries={entries}
              existingPicks={(myVote.vote_picks ?? []).map((p: any) => ({
                pick_type: p.pick_type,
                race_entry_id: p.race_entry_id,
              }))}
              postTime={race.post_time}
            />
          )}

          {/* AI予想家と一致 */}
          <AIPredictorTab raceId={race.id} hasVoted={hasVoted} isFinished={isFinished} />

          {/* シェア */}
          <div className={`rounded-2xl border p-4 flex items-center justify-between ${cardBg}`}>
            <span className={`text-sm font-bold ${textPrimary}`}>📣 予想をシェア</span>
            <ShareButtons text={generateShareText()} />
          </div>
        </div>
      )}

      {/* 結果タブ（結果確定後） */}
      {currentTab === "result" && isFinished && (
        <div className="space-y-4">
          {hasVoted && myVote && (
            <VoteSummary
              vote={myVote}
              isFinished={isFinished}
              transactions={pointsTransactions}
              raceInfo={{
                name: race.name,
                date: race.race_date,
                courseName: race.course_name,
                grade: race.grade,
              }}
              userName={userName}
            />
          )}

          {!hasVoted && (
            <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
              <div className="text-3xl mb-2">🏇</div>
              <div className={`text-sm ${textMuted}`}>このレースは予想していません</div>
            </div>
          )}

          {/* AI予想家の結果 */}
          <AIPredictorTab raceId={race.id} hasVoted={hasVoted} isFinished={isFinished} />

          {/* シェア（的中時） */}
          {hasVoted && myVote && (
            <div className={`rounded-2xl border p-4 flex items-center justify-between ${cardBg}`}>
              <span className={`text-sm font-bold ${textPrimary}`}>📣 結果をシェア</span>
              <ShareButtons text={generateShareText()} />
            </div>
          )}
        </div>
      )}

      {/* 着順タブ（結果確定後） */}
      {currentTab === "finishOrder" && isFinished && results && (
        <RaceResultTable results={results} payouts={null} myVote={myVote} />
      )}

      {/* 配当タブ（結果確定後） */}
      {currentTab === "payout" && isFinished && (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h2 className={`font-bold mb-3 ${textPrimary}`}>💰 払戻金</h2>
          {payouts && payouts.length > 0 ? (
            <div className="space-y-2">
              {payouts.map((p: any, i: number) => (
                <div key={i} className={`flex items-center justify-between py-2 border-b last:border-0 ${
                  isDark ? "border-slate-700" : "border-gray-100"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium min-w-[48px] ${textPrimary}`}>{p.bet_type}</span>
                    <span className={`text-xs ${textMuted}`}>{p.combination}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${textPrimary}`}>¥{(p.payout ?? 0).toLocaleString()}</span>
                    {p.popularity && (
                      <span className={`text-xs ml-2 ${textMuted}`}>{p.popularity}番人気</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-sm text-center py-4 ${textMuted}`}>
              払戻金データがありません
            </div>
          )}
        </div>
      )}

      {/* みんなの予想タブ */}
      {currentTab === "everyone" && (
        <div className="space-y-4">
          <VoteDistribution raceId={race.id} />
          <CommentSection raceId={race.id} currentUserId={userId} />
        </div>
      )}

      {/* AI予想タブ */}
      {currentTab === "ai" && (
        <AIPredictorTab raceId={race.id} hasVoted={hasVoted} isFinished={isFinished} />
      )}

      {/* 情報タブ（出馬表 + My新聞） */}
      {currentTab === "info" && (
        <div className="space-y-4">
          {entries && (
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
              <h2 className={`font-bold mb-3 ${textPrimary}`}>📋 出馬表</h2>
              <HorseList entries={entries} myVote={myVote} results={results} />
            </div>
          )}
          {(hasVoted || isFinished) && (
            <MyNewspaperTab
              raceId={race.id}
              entries={(entries ?? []).map(e => ({ id: e.id, post_number: e.post_number, horses: e.horses }))}
            />
          )}
          <PointsGuide isDark={isDark} />
        </div>
      )}
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
