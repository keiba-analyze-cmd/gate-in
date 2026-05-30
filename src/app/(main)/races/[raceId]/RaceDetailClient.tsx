"use client";

import { useState } from "react";
import Link from "next/link";
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
import AnswerCheckCard from "@/components/races/AnswerCheckCard";

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

  // ── 答え合わせ用の導出値 ──
  const winPickEntry = (myVote?.vote_picks ?? []).find((p: any) => p.pick_type === "win")?.race_entries ?? null;
  const myWin = winPickEntry
    ? { umaban: winPickEntry.post_number, name: (winPickEntry.horses as any)?.name ?? "" }
    : null;
  const myOdds = myWin
    ? (entries ?? []).find((e: any) => e.post_number === myWin.umaban)?.odds ?? null
    : null;
  const firstResult = (results ?? []).find((r: any) => r.finish_position === 1)?.race_entries ?? null;
  const result1st = firstResult
    ? { umaban: firstResult.post_number, name: (firstResult.horses as any)?.name ?? "" }
    : null;
  const myScore = myVote?.rating_score ?? null;

  const gradeStyle = getGradeStyle(race.grade);
  const postTime = race.post_time
    ? new Date(race.post_time).toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const softGreen = { background: "var(--brand-soft)", color: "var(--brand-strong)" };
  const softNeutral = { background: "var(--surface-2)", color: "var(--ink-3)" };
  const softInfo = { background: "var(--info-soft)", color: "var(--info)" };
  const softGold = { background: "var(--gate-gold-soft)", color: "var(--gate-gold-strong)" };

  const statusBadge = isVotable
    ? { text: "🗳 投票受付中", style: softGreen }
    : isFinished
    ? { text: "📊 結果確定", style: softNeutral }
    : hasVoted
    ? { text: "✅ 投票済み", style: softInfo }
    : !isBeforeDeadline
    ? { text: "⏰ 締切済み", style: softGold }
    : { text: "準備中", style: softNeutral };

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

  const cardCls = "rounded-2xl border bg-surface border-line";

  return (
    <div className="space-y-4 font-display">
      {/* パンくず */}
      <div className="text-sm text-ink-3">
        <Link href="/races" className="hover:text-brand-strong transition-colors">レース一覧</Link>
        <span className="mx-2">›</span>
        <span className="text-ink-2">{race.name}</span>
      </div>

      {/* レースヘッダー */}
      <div className={`${cardCls} p-5`}>
        <div className="flex items-center gap-3 mb-3">
          {race.grade && (
            <span className="text-sm font-bold px-3 py-1 rounded" style={gradeStyle}>{race.grade}</span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={statusBadge.style}>
            {statusBadge.text}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-ink">{race.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>📍 {race.course_name} {race.race_number}R</span>
          <span>🏟 {race.track_type} {race.distance}m</span>
          <span>🐴 {race.head_count ?? entries?.length ?? "?"}頭</span>
          {postTime && <span>🕐 <span className="font-data">{postTime}</span> 発走</span>}
          {race.track_condition && <span>馬場: {race.track_condition}</span>}
          <span>投票: <span className="font-data">{totalVotes ?? 0}</span>人</span>
          {race.post_time && <RaceCountdown startTime={race.post_time} raceDate={race.race_date} status={race.status} />}
        </div>
      </div>

      {/* ── タブバー ── */}
      <div className="flex border-b border-line">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-center py-2.5 text-xs font-medium transition-colors relative ${
                isActive ? "text-brand-strong" : "text-ink-3"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-surface-2 text-ink-3 font-data">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
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

          {/* 答え合わせ（あなた vs AI） */}
          <AnswerCheckCard
            raceId={race.id}
            myWin={myWin}
            myOdds={myOdds}
            result1st={result1st}
            myScore={myScore}
            isFinished={isFinished}
          />

          {/* AI予想家 */}
          <AIPredictorTab raceId={race.id} hasVoted={hasVoted} isFinished={isFinished} />

          {/* シェア */}
          <div className={`${cardCls} p-4 flex items-center justify-between`}>
            <span className="text-sm font-bold text-ink">📣 予想をシェア</span>
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
            <div className={`${cardCls} p-6 text-center`}>
              <div className="text-3xl mb-2">🏇</div>
              <div className="text-sm text-ink-3">このレースは予想していません</div>
            </div>
          )}

          {/* 答え合わせ（あなた vs AI） */}
          <AnswerCheckCard
            raceId={race.id}
            myWin={myWin}
            myOdds={myOdds}
            result1st={result1st}
            myScore={myScore}
            isFinished={isFinished}
          />

          {/* AI予想家の結果 */}
          <AIPredictorTab raceId={race.id} hasVoted={hasVoted} isFinished={isFinished} />

          {/* シェア（的中時） */}
          {hasVoted && myVote && (
            <div className={`${cardCls} p-4 flex items-center justify-between`}>
              <span className="text-sm font-bold text-ink">📣 結果をシェア</span>
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
        <div className={`${cardCls} p-5`}>
          <h2 className="font-bold mb-3 text-ink">💰 払戻金</h2>
          {payouts && payouts.length > 0 ? (
            <div className="space-y-2">
              {payouts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium min-w-[48px] text-ink">{p.bet_type}</span>
                    <span className="text-xs text-ink-3 font-data">{p.combination}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-ink font-data">¥{(p.payout ?? 0).toLocaleString()}</span>
                    {p.popularity && (
                      <span className="text-xs ml-2 text-ink-3">{p.popularity}番人気</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-center py-4 text-ink-3">
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
            <div className={`${cardCls} p-5`}>
              <h2 className="font-bold mb-3 text-ink">📋 出馬表</h2>
              <HorseList entries={entries} myVote={myVote} results={results} />
            </div>
          )}
          {(hasVoted || isFinished) && (
            <MyNewspaperTab
              raceId={race.id}
              entries={(entries ?? []).map(e => ({ id: e.id, post_number: e.post_number, horses: e.horses }))}
            />
          )}
          <PointsGuide />
        </div>
      )}
    </div>
  );
}

function PointsGuide() {
  const items = [
    { label: "🎯 単勝的中（◎1着）", value: "20〜250P", color: "text-danger" },
    { label: "🎫 複勝的中（◎3着以内）", value: "10〜60P", color: "text-info" },
    { label: "🎫 馬連的中", value: "30〜280P", color: "text-brand-strong" },
    { label: "🔥 馬単ボーナス", value: "×2倍", color: "text-danger" },
    { label: "🎟️ ワイド的中", value: "15〜90P", color: "text-brand-strong" },
    { label: "🎰 三連複的中", value: "20〜300P", color: "text-info" },
    { label: "🔥 3連単ボーナス", value: "×3〜5倍", color: "text-danger" },
    { label: "⚠️ 危険馬的中", value: "10〜50P", color: "text-gate-gold-strong" },
    { label: "💎 完全的中ボーナス", value: "+200P", color: "text-gate-gold-strong" },
  ];

  return (
    <div className="rounded-2xl border bg-surface border-line p-5">
      <h3 className="font-bold mb-3 text-ink">🎯 獲得ポイント目安</h3>
      <p className="text-xs mb-2 text-ink-3">※オッズ連動（高配当ほど高ポイント）</p>
      <div className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between py-1 border-b border-line last:border-0">
            <span className="text-ink-2">{item.label}</span>
            <span className={`font-bold font-data ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
      <Link href="/guide/points" className="block text-center text-xs font-bold mt-3 hover:underline text-brand-strong">
        📖 ポイントルール詳細 →
      </Link>
    </div>
  );
}

function getGradeStyle(grade: string | null): React.CSSProperties {
  switch (grade) {
    case "G1": return { background: "var(--gate-gold-soft)", color: "var(--gate-gold-strong)" };
    case "G2": return { background: "var(--danger-soft)", color: "var(--danger)" };
    case "G3": return { background: "var(--brand-soft)", color: "var(--brand-strong)" };
    case "OP": return { background: "var(--info-soft)", color: "var(--info)" };
    default:   return { background: "var(--surface-2)", color: "var(--ink-3)" };
  }
}
