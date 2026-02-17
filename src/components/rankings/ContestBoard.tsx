"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRank } from "@/lib/constants/ranks";

type Contest = {
  id: string;
  name: string;
  year_month: string;
  status: string;
  min_votes: number;
  prize_description: string | null;
};

type Entry = {
  ranking: number;
  user_id: string;
  total_points: number;
  vote_count: number;
  is_eligible: boolean;
  profiles: {
    display_name: string;
    avatar_url: string | null; avatar_emoji: string | null;
    rank_id: string;
  } | null;
};

type MyEntry = {
  total_points: number;
  vote_count: number;
  is_eligible: boolean;
  ranking: number;
};

type Props = {
  currentUserId: string;
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function ContestBoard({ currentUserId }: Props) {
  const [contest, setContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myEntry, setMyEntry] = useState<MyEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contests")
      .then((res) => res.json())
      .then((data) => {
        setContest(data.contest);
        setEntries(data.entries ?? []);
        setMyEntry(data.my_entry);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>;
  }

  if (!contest) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🎪</div>
        <p className="text-gray-500">現在開催中の大会はありません</p>
        <p className="text-xs text-gray-400 mt-1">大会は毎月自動的に開始されます</p>
      </div>
    );
  }

  const monthLabel = (() => {
    const [y, m] = contest.year_month.split("-");
    return `${y}年${parseInt(m)}月`;
  })();

  return (
    <div className="space-y-4">
      {/* 大会ヘッダー */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl p-6 text-white">
        <div className="text-xs text-purple-200 mb-1">🎪 月間大会</div>
        <h2 className="text-xl font-bold mb-1">{contest.name || `${monthLabel} 予想バトル`}</h2>
        <p className="text-sm text-purple-100 mb-4">
          {contest.prize_description || `月間ポイントランキング上位者にAmazonギフト券！\n1位: ¥10,000 / 2位: ¥5,000 / 3位: ¥3,000`}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-xs text-purple-200">参加条件</div>
            <div className="font-bold">{contest.min_votes}投票以上</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-xs text-purple-200">参加者数</div>
            <div className="font-bold">{entries.length}人</div>
          </div>
        </div>
      </div>

      {/* 自分の順位 */}
      {myEntry && (
        <div className={`rounded-2xl border-2 p-4 ${
          myEntry.is_eligible
            ? "border-green-300 bg-green-50"
            : "border-yellow-300 bg-yellow-50"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-gray-800">
                あなたの順位: {myEntry.ranking <= 3 ? MEDAL[myEntry.ranking - 1] : ""} {myEntry.ranking}位
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {myEntry.total_points} P / {myEntry.vote_count}投票
              </div>
            </div>
            {myEntry.is_eligible ? (
              <span className="text-xs bg-green-200 text-green-800 px-3 py-1 rounded-full font-bold">
                ✅ 参加資格あり
              </span>
            ) : (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-bold">
                あと{contest.min_votes - myEntry.vote_count}投票で参加資格
              </span>
            )}
          </div>
        </div>
      )}

      {!myEntry && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">レースに投票すると自動的に大会に参加できます</p>
          <Link href="/races" className="text-sm text-green-600 hover:underline mt-1 inline-block">
            レース一覧へ →
          </Link>
        </div>
      )}

      {/* ランキング */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <h3 className="font-bold text-gray-800">📊 大会ランキング</h3>
          </div>
          {entries.map((entry) => {
            const userRank = entry.profiles ? getRank(entry.profiles.rank_id) : null;
            const isMe = entry.user_id === currentUserId;
            return (
              <Link
                key={entry.user_id}
                href={`/users/${entry.user_id}`}
                className={`flex items-center gap-3 px-5 py-3 border-t border-gray-50 hover:bg-gray-50 transition-colors ${
                  isMe ? "bg-green-50/50" : ""
                }`}
              >
                <span className="w-8 text-center">
                  {entry.ranking <= 3 ? (
                    <span className="text-lg">{MEDAL[entry.ranking - 1]}</span>
                  ) : (
                    <span className={`text-sm font-bold ${entry.ranking <= 10 ? "text-green-600" : "text-gray-400"}`}>
                      {entry.ranking}
                    </span>
                  )}
                </span>
                {entry.profiles?.avatar_url ? (
                  <img src={entry.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm">🏇</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">
                    {entry.profiles?.display_name ?? "匿名"}
                    {isMe && <span className="text-xs text-green-600 ml-1">（あなた）</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {userRank && `${userRank.icon} `}{entry.vote_count}投票
                    {!entry.is_eligible && " ⚠️未資格"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-purple-600">{entry.total_points.toLocaleString()} P</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
