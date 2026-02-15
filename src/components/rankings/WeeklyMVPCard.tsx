"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type WeeklyData = {
  period: string;
  start_date: string;
  end_date: string;
  mvp: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    rank_id: string;
    weekly_points: number;
    hit_rate: number;
    perfect_count: number;
    total_votes: number;
  } | null;
  rankings: {
    rank: number;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    rank_id: string;
    weekly_points: number;
  }[];
};

export default function WeeklyMVPCard() {
  const [viewWeek, setViewWeek] = useState<"this" | "last">("this");
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings/weekly?week=${viewWeek}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [viewWeek]);

  return (
    <div>
      {/* 週の切り替え */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewWeek("this")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            viewWeek === "this"
              ? "bg-yellow-500 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-yellow-300"
          }`}
        >
          今週
        </button>
        <button
          onClick={() => setViewWeek("last")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            viewWeek === "last"
              ? "bg-yellow-500 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-yellow-300"
          }`}
        >
          先週
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      ) : !data ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm">
          データの取得に失敗しました
        </div>
      ) : (
        <div className="space-y-4">
          {/* 期間表示 */}
          <div className="text-xs text-gray-500 text-center">
            {data.start_date} 〜 {data.end_date}
          </div>

          {/* MVPカード */}
          {data.mvp ? (
            <MVPCard mvp={data.mvp} isThisWeek={viewWeek === "this"} />
          ) : (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-gray-500 text-sm">
                {viewWeek === "this" ? "今週はまだ投票がありません" : "先週のMVPはいませんでした"}
              </p>
            </div>
          )}

          {/* TOP5ランキング */}
          {data.rankings.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">📊 週間TOP5</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {data.rankings.map((user) => (
                  <RankingRow key={user.user_id} user={user} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MVPCard({ mvp, isThisWeek }: { mvp: WeeklyData["mvp"]; isThisWeek: boolean }) {
  if (!mvp) return null;
  const rank = getRank(mvp.rank_id);

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400"></div>

      <div className="text-center">
        <div className="text-xs text-orange-600 font-bold mb-1">
          {isThisWeek ? "🔥 暫定MVP" : "🎉 週間MVP"}
        </div>

        <Link href={`/users/${mvp.user_id}`} className="inline-block group">
          {mvp.avatar_url ? (
            <Image
              src={mvp.avatar_url}
              alt=""
              width={64}
              height={64}
              className="w-16 h-16 rounded-full mx-auto mb-2 border-4 border-yellow-300"
              unoptimized
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-yellow-200 flex items-center justify-center text-2xl mx-auto mb-2 border-4 border-yellow-300">
              👑
            </div>
          )}
          <div className="text-xl font-black text-gray-800 group-hover:text-green-600">
            {mvp.display_name}
          </div>
        </Link>

        {rank && (
          <div className="text-xs text-gray-500 mb-3">
            {rank.icon} {rank.name}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500">獲得ポイント</div>
            <div className="font-bold text-green-600">+{mvp.weekly_points}P</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500">的中率</div>
            <div className="font-bold text-blue-600">{mvp.hit_rate}%</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500">完全的中</div>
            <div className="font-bold text-purple-600">{mvp.perfect_count}回</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500">投票数</div>
            <div className="font-bold text-gray-600">{mvp.total_votes}回</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingRow({ user }: { user: WeeklyData["rankings"][0] }) {
  const rank = getRank(user.rank_id);
  const badge = user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : `${user.rank}`;

  return (
    <Link
      href={`/users/${user.user_id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <span className="text-lg w-6 text-center">{badge}</span>
      {user.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt=""
          width={28}
          height={28}
          className="w-7 h-7 rounded-full"
          unoptimized
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs">🏇</div>
      )}
      <span className="font-bold text-sm text-gray-800 flex-1">{user.display_name}</span>
      {rank && <span className="text-xs text-gray-400">{rank.icon}</span>}
      <span className="text-green-600 font-bold text-sm">+{user.weekly_points}P</span>
    </Link>
  );
}
