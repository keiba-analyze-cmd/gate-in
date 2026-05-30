"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Contest = {
  id: string;
  name: string;
  status: string;
  week_start: string;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
};

type ContestRace = {
  race_order: number;
  races: {
    id: string;
    name: string;
    course_name: string;
    race_number: number;
    post_time: string;
    status: string;
    grade: string | null;
  };
};

type Props = {
  contest: Contest | null;
  contestRaces: ContestRace[];
  totalParticipants: number;
  myVoteCount: number;
  isEligible: boolean;
};

export default function ContestBanner({
  contest,
  contestRaces,
  totalParticipants,
  myVoteCount,
  isEligible,
}: Props) {
  const { isDark } = useTheme();
  const [timeLeft, setTimeLeft] = useState("");

  // 金トーン（ダークは暗い金面に切替）
  const goldBg = isDark
    ? "linear-gradient(135deg,#3a2f17,#2a2210)"
    : "linear-gradient(135deg,#fbe6ad,#f2cf78)";
  const goldText = isDark ? "#f3ece1" : "#3a2c00";
  const goldMuted = isDark ? "rgba(243,236,225,.72)" : "rgba(58,44,0,.66)";
  const onGoldSoft = isDark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.07)";
  const barTrack = isDark ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.65)";
  const divider = isDark ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.12)";

  useEffect(() => {
    if (!contestRaces.length) return;

    const lastRace = contestRaces[contestRaces.length - 1];
    if (!lastRace?.races?.post_time) return;

    const updateTime = () => {
      const now = new Date();
      const raceTime = new Date(lastRace.races.post_time);
      const diff = raceTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("終了間近");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`残り ${hours}時間${minutes}分`);
      } else {
        setTimeLeft(`残り ${minutes}分`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [contestRaces]);

  if (!contest) {
    return (
      <Link href="/contest" className="block">
        <div
          className="rounded-2xl overflow-hidden px-5 py-4 relative"
          style={{ background: goldBg, color: goldText, border: "1px solid var(--line)" }}
        >
          <div
            className="absolute top-0 right-0 text-[10px] font-black px-2 py-0.5 rounded-bl-lg"
            style={{ background: "var(--gate-gold-strong)", color: "#fff" }}
          >
            毎週開催
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-sm font-black">週間予想大会</div>
                <div className="text-xs font-medium" style={{ color: goldMuted }}>
                  3レース以上予想で参加！WIN5対象レースでバトル
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs" style={{ color: goldMuted }}>🥇🥈🥉</div>
              <div className="text-sm font-black">Amazonギフト券</div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const votingRaces = contestRaces.filter((cr) => cr.races?.status === "voting_open");
  const finishedRaces = contestRaces.filter((cr) => cr.races?.status === "settled");
  const isLive = votingRaces.length > 0;

  return (
    <Link href="/contest" className="block group">
      <div
        className="rounded-2xl overflow-hidden p-4 relative"
        style={{
          background: goldBg,
          color: goldText,
          border: "1px solid var(--line)",
          boxShadow: "0 12px 24px -16px rgba(202,162,74,.5)",
        }}
      >
        {/* ヘッダー：タイトルとLIVEバッジ */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">🏆</span>
            <div className="min-w-0">
              <div className="text-sm font-black truncate">{contest.name}</div>
              {timeLeft && isLive && (
                <div className="text-xs font-bold" style={{ color: "var(--danger)" }}>{timeLeft}</div>
              )}
            </div>
          </div>
          {isLive && (
            <div
              className="text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shrink-0"
              style={{ background: "var(--brand)" }}
            >
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
          {!isLive && contest.status === "active" && (
            <div
              className="text-[10px] font-black px-2 py-1 rounded-full shrink-0"
              style={{ background: "var(--gate-gold-strong)", color: "#fff" }}
            >
              開催中
            </div>
          )}
        </div>

        {/* 参加状況 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {isEligible ? (
            <div
              className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
            >
              <span>✓</span> 参加中
            </div>
          ) : (
            <div
              className="text-xs font-bold px-2 py-1 rounded-full"
              style={{ background: onGoldSoft, color: goldText }}
            >
              あと{3 - myVoteCount}レースで参加
            </div>
          )}
          <div className="text-xs" style={{ color: goldMuted }}>
            👥 {totalParticipants}人参加中
          </div>
        </div>

        {/* レース進行状況 */}
        <div className="flex items-center gap-1 mb-3">
          {contestRaces.map((cr, i) => {
            const status = cr.races?.status;
            const isVoting = status === "voting_open";
            const isFinished = status === "settled";
            return (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${isVoting ? "animate-pulse" : ""}`}
                style={{
                  background: isFinished
                    ? "var(--brand)"
                    : isVoting
                      ? "var(--gate-gold-strong)"
                      : barTrack,
                }}
              />
            );
          })}
          <span className="text-[10px] ml-1 shrink-0" style={{ color: goldMuted }}>
            {finishedRaces.length}/{contestRaces.length}
          </span>
        </div>

        {/* 賞金とCTA */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${divider}` }}>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black" style={{ fontFamily: "var(--font-mononum)" }}>
              🥇 ¥{contest.prize_1st?.toLocaleString()}
            </span>
            <span className="text-[10px]" style={{ color: goldMuted, fontFamily: "var(--font-mononum)" }}>
              🥈¥{contest.prize_2nd?.toLocaleString()} 🥉¥{contest.prize_3rd?.toLocaleString()}
            </span>
          </div>
          <div
            className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
            style={{ background: onGoldSoft, color: goldText }}
          >
            {isLive ? "予想 →" : "詳細 →"}
          </div>
        </div>
      </div>
    </Link>
  );
}
