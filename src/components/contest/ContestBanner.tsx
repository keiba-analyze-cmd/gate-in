"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [timeLeft, setTimeLeft] = useState("");

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
        <div className="rounded-2xl overflow-hidden border-2 border-purple-300 bg-gradient-to-br from-purple-600 to-indigo-700 px-5 py-4 text-white relative">
          <div className="absolute top-0 right-0 bg-amber-400 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-bl-lg">
            毎週開催
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-sm font-black">週間予想大会</div>
                <div className="text-xs text-purple-200 font-medium">
                  3レース以上予想で参加！WIN5対象レースでバトル
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-purple-200">🥇🥈🥉</div>
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
      <div className="rounded-2xl overflow-hidden border-2 border-purple-400 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 p-4 text-white relative shadow-lg">
        {/* ヘッダー：タイトルとLIVEバッジを横並び */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="text-base font-black">{contest.name}</div>
              {timeLeft && isLive && (
                <div className="text-xs text-amber-300 font-bold">{timeLeft}</div>
              )}
            </div>
          </div>
          {isLive && (
            <div className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
          {!isLive && contest.status === "active" && (
            <div className="bg-amber-400 text-purple-900 text-[10px] font-black px-2.5 py-1 rounded-full shrink-0">
              開催中
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        <div className="flex items-center justify-between gap-4">
          {/* 左：参加状況 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {isEligible ? (
                <div className="bg-green-500/30 border border-green-400 text-green-100 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span>✓</span> 参加中
                </div>
              ) : (
                <div className="bg-white/20 text-white/90 text-xs font-bold px-2.5 py-1 rounded-full">
                  あと{3 - myVoteCount}レースで参加
                </div>
              )}
              <div className="text-xs text-purple-200">
                👥 {totalParticipants}人参加中
              </div>
            </div>

            {/* レース進行状況 */}
            <div className="flex items-center gap-1.5">
              {contestRaces.map((cr, i) => {
                const status = cr.races?.status;
                const isVoting = status === "voting_open";
                const isFinished = status === "settled";
                return (
                  <div
                    key={i}
                    className={`w-8 h-1.5 rounded-full ${
                      isFinished
                        ? "bg-green-400"
                        : isVoting
                          ? "bg-amber-400 animate-pulse"
                          : "bg-white/30"
                    }`}
                    title={`${cr.race_order}R: ${cr.races?.name || ""}`}
                  />
                );
              })}
              <span className="text-[10px] text-purple-200 ml-1">
                {finishedRaces.length}/{contestRaces.length}
              </span>
            </div>
          </div>

          {/* 右：賞金（1位を大きく） */}
          <div className="text-center shrink-0 bg-white/10 rounded-xl px-4 py-2">
            <div className="text-[10px] text-purple-200 mb-1">1位賞金</div>
            <div className="text-xl font-black text-amber-300">
              🥇 ¥{contest.prize_1st?.toLocaleString()}
            </div>
            <div className="text-[10px] text-purple-200 mt-0.5">
              🥈¥{(contest.prize_2nd / 1000).toFixed(0)}k 🥉¥{(contest.prize_3rd / 1000).toFixed(0)}k
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
          <div className="text-xs text-purple-200">
            {isLive ? "今すぐ予想して参加しよう！" : "詳細を見る"}
          </div>
          <div className="bg-white/20 group-hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
            {isLive ? "予想する →" : "結果を見る →"}
          </div>
        </div>
      </div>
    </Link>
  );
}
