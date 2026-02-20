"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";

type ContestRace = {
  race_order: number;
  races: {
    id: string;
    race_name: string;
    venue: string;
    race_number: number;
    post_time: string;
    status: string;
    grade: string | null;
  };
};

type Entry = {
  ranking: number;
  user_id: string;
  total_points: number;
  vote_count: number;
  hit_race_count: number;
  streak_bonus: number;
  profiles: {
    display_name: string;
    avatar_emoji: string | null;
    rank_id: string | null;
    user_handle: string | null;
  };
};

export default function ContestClient() {
  const [contest, setContest] = useState<any>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [contestRaces, setContestRaces] = useState<ContestRace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contests?type=weekly")
      .then((r) => r.json())
      .then((data) => {
        setContest(data.contest);
        setEntries(data.entries ?? []);
        setMyEntry(data.my_entry);
        setContestRaces(data.contest_races ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="animate-spin text-4xl mb-4">🏇</div>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-green-600">← トップ</Link>
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-8 text-center text-white">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-black mb-2">近日開催予定！</h2>
          <p className="text-sm opacity-90">毎週日曜開催の予想大会を準備中です。</p>
          <p className="text-sm opacity-90">上位入賞者にはAmazonギフト券をプレゼント！</p>
        </div>
      </div>
    );
  }

  const isActive = contest.status === "active";
  const isFinished = contest.status === "finished";

  const raceStatusIcon = (status: string) => {
    if (status === "finished") return "✅";
    if (status === "open") return "🔴";
    return "⏳";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/" className="text-sm text-gray-400 hover:text-green-600">← トップ</Link>

      {/* ヘッダーバナー */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white relative overflow-hidden">
        <div className="absolute top-[-20px] right-[-20px] text-[80px] opacity-10">🏆</div>
        <div className="text-xs opacity-80 mb-1">
          {isFinished ? "📊 先週の結果" : "🔥 開催中"}
        </div>
        <h1 className="text-xl font-black mb-1">{contest.name}</h1>
        <p className="text-sm opacity-90 mb-4">WIN5対象 5レースの予想ポイントで競おう！</p>

        <div className="flex gap-3">
          {[
            { rank: "🥇", amount: `¥${(contest.prize_1st ?? 5000).toLocaleString()}`, label: "1位" },
            { rank: "🥈", amount: `¥${(contest.prize_2nd ?? 3000).toLocaleString()}`, label: "2位" },
            { rank: "🥉", amount: `¥${(contest.prize_3rd ?? 2000).toLocaleString()}`, label: "3位" },
          ].map((p) => (
            <div key={p.label} className="bg-white/15 rounded-xl px-4 py-2 text-center flex-1">
              <div className="text-lg font-bold">{p.rank} {p.amount}</div>
              <div className="text-xs opacity-80">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 自分の順位 */}
      {myEntry && (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-green-700">あなたの順位</div>
              <div className="text-2xl font-black text-green-600">{myEntry.ranking}位</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">{myEntry.total_points}<span className="text-sm text-gray-500">pt</span></div>
              <div className="text-xs text-gray-500">
                {myEntry.vote_count}/5レース参加 ・ {myEntry.hit_race_count ?? 0}的中
                {(myEntry.streak_bonus ?? 0) > 0 && (
                  <span className="text-amber-500"> 🔥+{myEntry.streak_bonus}P</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 対象レース */}
      {contestRaces.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-2">🎯 対象レース</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {contestRaces.map((cr) => (
              <Link
                key={cr.races.id}
                href={`/races/${cr.races.id}`}
                className="flex-shrink-0 rounded-lg border bg-white px-3 py-2 text-center min-w-[100px] hover:border-green-500 transition-colors"
              >
                <div className="text-lg mb-1">{raceStatusIcon(cr.races.status)}</div>
                <div className="text-xs font-bold text-gray-800">{cr.races.venue}{cr.races.race_number}R</div>
                <div className="text-[10px] text-gray-500 truncate max-w-[90px]">{cr.races.race_name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ランキング */}
      <div>
        <h2 className="font-bold text-gray-900 mb-2">🏆 ランキング</h2>
        {entries.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p>まだエントリーがありません</p>
            <p className="text-sm mt-1"><span class="font-bold text-green-600">3レース以上</span>予想すると自動でランキングに参加！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => {
              const isMe = myEntry && e.user_id === myEntry.user_id;
              const isTop3 = e.ranking <= 3;
              const rankColors: Record<number, string> = {
                1: "bg-amber-400 text-white",
                2: "bg-gray-400 text-white",
                3: "bg-orange-500 text-white",
              };
              return (
                <Link
                  key={e.user_id}
                  href={`/users/${e.profiles.user_handle || e.user_id}`}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-green-400 ${
                    isMe ? "border-green-500 bg-green-50" : isTop3 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    rankColors[e.ranking] || "bg-gray-100 text-gray-600"
                  }`}>
                    {e.ranking}
                  </div>
                  <UserAvatar avatarEmoji={e.profiles.avatar_emoji} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">
                      {e.profiles.display_name}
                      {isMe && <span className="text-green-500 text-xs ml-1">（あなた）</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {e.vote_count}レース参加 ・ {e.hit_race_count ?? 0}的中
                      {(e.streak_bonus ?? 0) > 0 && <span className="text-amber-500"> 🔥+{e.streak_bonus}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-base">{e.total_points}<span className="text-xs text-gray-400">pt</span></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ルール */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="font-bold text-gray-900 mb-3">📋 ルール</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex gap-2">
            <span className="text-green-500">✓</span>
            <span>毎週日曜のWIN5対象5レースが対象</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">✓</span>
            <span>3レース以上予想で自動エントリー（参加ボタン不要）</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">✓</span>
            <span>的中ポイントはオッズに連動（単勝・複勝・馬連・ワイド・三連複）</span>
          </div>
          <div className="flex gap-2">
            <span className="text-amber-500">🔥</span>
            <span>連続的中ボーナス: 2連続+20P / 3連続+50P / 4連続+100P / 5連続+200P</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">✓</span>
            <span>同点の場合: ①的中レース数 → ②投票が早い方が上位</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">✓</span>
            <span>参加は完全無料！上位3名にAmazonギフト券🎁</span>
          </div>
        </div>
      </div>
    </div>
  );
}
