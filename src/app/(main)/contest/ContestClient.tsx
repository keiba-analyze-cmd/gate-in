"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";

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

type MyVote = {
  race_id: string;
  status: string;
  earned_points: number;
  created_at: string;
};

export default function ContestClient() {
  const [contest, setContest] = useState<any>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [contestRaces, setContestRaces] = useState<ContestRace[]>([]);
  const [myVotes, setMyVotes] = useState<MyVote[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "races" | "ranking">("overview");

  useEffect(() => {
    fetch("/api/contests?type=weekly")
      .then((r) => r.json())
      .then((data) => {
        setContest(data.contest);
        setEntries(data.entries ?? []);
        setMyEntry(data.my_entry);
        setContestRaces(data.contest_races ?? []);
        setMyVotes(data.my_votes ?? []);
        setTotalParticipants(data.total_participants ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="animate-spin text-5xl mb-4">🏇</div>
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400">← トップ</Link>
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-8 text-center text-white">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-black mb-2">近日開催予定！</h2>
          <p className="text-sm opacity-90">毎週日曜開催の予想大会を準備中です。</p>
          <p className="text-sm opacity-90 mt-2">上位入賞者にはAmazonギフト券をプレゼント！</p>
        </div>
      </div>
    );
  }

  // 投票状況の計算
  const votedRaceIds = new Set(myVotes.map((v) => v.race_id));
  const votedCount = contestRaces.filter((cr) => votedRaceIds.has(cr.races?.id)).length;
  const isEligible = votedCount >= 3;
  const remainingToQualify = Math.max(0, 3 - votedCount);

  const isActive = contest.status === "active";
  const isFinished = contest.status === "finished";

  // 1位のポイント
  const topPoints = entries[0]?.total_points ?? 0;
  const myPoints = myEntry?.total_points ?? 0;
  const pointsToFirst = Math.max(0, topPoints - myPoints);
  const thirdPlacePoints = entries[2]?.total_points ?? 0;
  const pointsToThird = Math.max(0, thirdPlacePoints - myPoints);

  // レースのステータス判定
  const getRaceStatus = (race: any) => {
    if (!race) return "unknown";
    if (race.status === "finished") return "finished";
    if (race.status === "voting_closed") return "live";
    return "open";
  };

  // 各レースの投票情報取得
  const getVoteForRace = (raceId: string) => {
    return myVotes.find((v) => v.race_id === raceId);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* 戻るリンク */}
      <Link href="/" className="text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 mb-4 inline-block">← トップ</Link>

      {/* ヘッダー */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-500/50 rounded-full px-4 py-1 mb-3">
          {isActive ? (
            <>
              <span className="animate-pulse text-red-500">●</span>
              <span className="text-yellow-700 dark:text-yellow-300 text-sm font-bold">LIVE 開催中</span>
            </>
          ) : (
            <>
              <span className="text-gray-500 dark:text-gray-400">📊</span>
              <span className="text-gray-700 dark:text-gray-300 text-sm font-bold">結果発表</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{contest.name}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">WIN5対象 5レースで競おう！</p>
      </div>

      {/* 参加ステータスカード */}
      <div className={`rounded-2xl p-5 mb-6 border-2 ${
        isEligible 
          ? "bg-green-50 dark:bg-green-900/30 border-green-500" 
          : "bg-orange-50 dark:bg-orange-900/30 border-orange-500"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
              isEligible ? "bg-green-500" : "bg-orange-500"
            }`}>
              {isEligible ? "✓" : "🎫"}
            </div>
            <div>
              <div className={`text-lg font-black ${isEligible ? "text-green-600 dark:text-green-300" : "text-orange-600 dark:text-orange-300"}`}>
                {isEligible ? "🎉 参加確定！" : "参加券を獲得しよう"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {isEligible 
                  ? `${votedCount}レース予想済み` 
                  : `あと${remainingToQualify}レース予想で参加確定`}
              </div>
            </div>
          </div>
          {isEligible && myEntry && (
            <div className="text-right">
              <div className="text-3xl font-black text-gray-900 dark:text-white">{myEntry.ranking}位</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">/ {totalParticipants}人中</div>
            </div>
          )}
        </div>

        {/* 参加プログレスバー */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>予想進捗</span>
            <span>{votedCount}/5レース</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isEligible 
                  ? "bg-gradient-to-r from-green-500 to-emerald-400" 
                  : "bg-gradient-to-r from-orange-500 to-amber-400"
              }`}
              style={{ width: `${(votedCount / 5) * 100}%` }}
            />
            {/* 3レースの基準線 */}
            <div className="absolute left-[60%] top-0 w-0.5 h-full bg-gray-400 dark:bg-white/50" />
          </div>
          <div className="text-right mt-1">
            <span className="text-[10px] text-gray-500 dark:text-gray-500">↑ 参加ライン(3レース)</span>
          </div>
        </div>

        {/* ポイント表示（参加確定時のみ） */}
        {isEligible && myEntry && (
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
            <div className="text-center">
              <div className="text-3xl font-black text-yellow-500">{myPoints}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">獲得ポイント</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-white/20" />
            <div className="text-center">
              <div className="text-lg font-bold text-gray-500 dark:text-gray-300">🥇まで</div>
              <div className="text-xl font-black text-gray-900 dark:text-white">{pointsToFirst}pt</div>
            </div>
          </div>
        )}
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-2 mb-4">
        {(["overview", "races", "ranking"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${
              activeTab === tab 
                ? "bg-purple-600 text-white" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {tab === "overview" && "📊 概要"}
            {tab === "races" && "🏇 レース"}
            {tab === "ranking" && "🏆 順位"}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* 賞金情報 */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">🎁 賞金</h3>
            <div className="flex justify-around">
              {[
                { rank: 1, emoji: "🥇", amount: contest.prize_1st ?? 5000 },
                { rank: 2, emoji: "🥈", amount: contest.prize_2nd ?? 3000 },
                { rank: 3, emoji: "🥉", amount: contest.prize_3rd ?? 2000 },
              ].map((prize) => (
                <div key={prize.rank} className="text-center">
                  <div className="text-2xl mb-1">{prize.emoji}</div>
                  <div className="text-lg font-black text-yellow-500">¥{prize.amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Amazonギフト</div>
                </div>
              ))}
            </div>
          </div>

          {/* ミニランキング */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-700 dark:text-gray-300">🔥 リアルタイム順位</h3>
              <span className="text-xs text-gray-500">{totalParticipants}人参加中</span>
            </div>
            <div className="space-y-2">
              {entries.slice(0, 3).map((user) => (
                <div key={user.user_id} className={`flex items-center gap-3 p-2 rounded-lg ${
                  user.ranking === 1 ? "bg-yellow-50 dark:bg-yellow-500/10" : "bg-gray-50 dark:bg-gray-700/30"
                }`}>
                  <UserAvatar avatarEmoji={user.profiles.avatar_emoji} size="sm" />
                  <span className="flex-1 font-medium text-gray-900 dark:text-white truncate">{user.profiles.display_name}</span>
                  <span className="font-bold text-yellow-500">{user.total_points}pt</span>
                </div>
              ))}
              {/* 自分の順位 */}
              {myEntry && isEligible && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/50">
                    <span className="text-lg">👤</span>
                    <span className="flex-1 font-medium text-gray-900 dark:text-white">あなた</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">{myEntry.ranking}位</span>
                    <span className="font-bold text-purple-600 dark:text-purple-300">{myPoints}pt</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ルール */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3">📋 ルール</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>3レース以上予想で自動エントリー</span>
              </div>
              <div className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>的中ポイントはオッズに連動</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500">🔥</span>
                <span>連続的中でボーナスポイント</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* レースタブ */}
      {activeTab === "races" && (
        <div className="space-y-3">
          {contestRaces.map((cr) => {
            const race = cr.races;
            if (!race) return null;
            const status = getRaceStatus(race);
            const vote = getVoteForRace(race.id);
            const hasVoted = !!vote;
            const earnedPoints = vote?.earned_points ?? 0;
            const isHit = vote?.status === "settled_hit";

            return (
              <div 
                key={race.id} 
                className={`rounded-xl p-4 border transition-all ${
                  status === "live" 
                    ? "bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-500" 
                    : status === "finished"
                      ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                      : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {status === "live" && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse">LIVE</span>
                    )}
                    {status === "finished" && (
                      <span className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded">終了</span>
                    )}
                    {status === "open" && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">受付中</span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {race.post_time ? new Date(race.post_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm text-white ${
                    hasVoted ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
                  }`}>
                    {hasVoted ? "✓" : "−"}
                  </div>
                </div>
                
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  {race.course_name}{race.race_number}R {race.name}
                </h4>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{race.grade || ""}</span>
                  {hasVoted && status === "finished" && (
                    <span className={`text-lg font-bold ${isHit ? "text-yellow-500" : "text-gray-400 dark:text-gray-500"}`}>
                      {isHit ? `+${earnedPoints}pt` : "ハズレ"}
                    </span>
                  )}
                  {hasVoted && status === "live" && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">集計中...</span>
                  )}
                  {!hasVoted && status === "open" && (
                    <Link 
                      href={`/races/${race.id}`}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-4 py-1.5 rounded-full transition-colors"
                    >
                      予想する →
                    </Link>
                  )}
                  {!hasVoted && status !== "open" && (
                    <span className="text-sm text-gray-400 dark:text-gray-500">未予想</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 順位タブ */}
      {activeTab === "ranking" && (
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p>まだエントリーがありません</p>
              <p className="text-sm mt-1"><span className="font-bold text-green-500">3レース以上</span>予想すると自動でランキングに参加！</p>
            </div>
          ) : (
            <>
              {entries.map((user) => {
                const isMe = myEntry && user.user_id === myEntry.user_id;
                return (
                  <Link
                    key={user.user_id}
                    href={`/users/${user.profiles.user_handle || user.user_id}`}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      user.ranking <= 3 
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600/30" 
                        : isMe
                          ? "bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-500/50"
                          : "bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      user.ranking === 1 ? "bg-yellow-500 text-black" :
                      user.ranking === 2 ? "bg-gray-300 text-black" :
                      user.ranking === 3 ? "bg-amber-600 text-white" :
                      "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}>
                      {user.ranking}
                    </div>
                    <UserAvatar avatarEmoji={user.profiles.avatar_emoji} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {user.profiles.display_name}
                        {isMe && <span className="text-purple-500 dark:text-purple-400 text-xs ml-1">（あなた）</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.vote_count}レース ・ {user.hit_race_count ?? 0}的中
                      </div>
                    </div>
                    <span className="font-bold text-yellow-500">{user.total_points}pt</span>
                  </Link>
                );
              })}

              {/* 自分が入賞圏外の場合 */}
              {myEntry && isEligible && myEntry.ranking > 5 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="text-center text-gray-400 dark:text-gray-500 text-sm mb-2">・・・</div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-500/50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-purple-600 text-white">
                      {myEntry.ranking}
                    </div>
                    <span className="text-xl">👤</span>
                    <span className="flex-1 font-medium text-gray-900 dark:text-white">あなた</span>
                    <span className="font-bold text-purple-600 dark:text-purple-300">{myPoints}pt</span>
                  </div>
                  <div className="text-center text-sm text-gray-500 dark:text-gray-500 mt-3">
                    🥉 3位まで あと <span className="text-yellow-500 font-bold">{pointsToThird}pt</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* フローティングCTA（未参加時） */}
      {!isEligible && isActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white dark:from-gray-900 via-white dark:via-gray-900 to-transparent p-4 pt-8">
          <Link 
            href={contestRaces[0]?.races?.id ? `/races/${contestRaces[0].races.id}` : "/races"}
            className="block w-full max-w-lg mx-auto bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all text-center"
          >
            🎫 あと{remainingToQualify}レース予想で参加確定！
          </Link>
        </div>
      )}
    </div>
  );
}
