"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type Props = {
  raceId: string;
  entries: {
    id: string;
    post_number: number;
    horses: { name: string } | null;
  }[];
};

type Member = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rank_id: string;
};

type MemberPick = {
  user_id: string;
  picks: { pick_type: string; race_entry_id: string }[];
};

const PICK_MARKS: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-500", text: "text-white" },
  place: { mark: "○", bg: "bg-blue-500", text: "text-white" },
  back: { mark: "△", bg: "bg-yellow-400", text: "text-gray-800" },
  danger: { mark: "⚠️", bg: "bg-gray-400", text: "text-white" },
};

export default function MyNewspaperTab({ raceId, entries }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberPicks, setMemberPicks] = useState<MemberPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // メンバーとピックを取得
        const res = await fetch(`/api/newspaper/${raceId}`);
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const data = await res.json();
        setMembers(data.members ?? []);
        setMemberPicks(data.picks ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
      setLoading(false);
    };

    fetchData();
  }, [raceId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-3">📰</div>
        <p className="text-gray-600 text-sm mb-3">My競馬新聞メンバーが設定されていません</p>
        <Link
          href="/mypage/newspaper"
          className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700"
        >
          メンバーを設定する
        </Link>
      </div>
    );
  }

  // 各メンバーのピックをマップ化
  const picksByUser = new Map<string, Map<string, string>>();
  for (const mp of memberPicks) {
    const entryMap = new Map<string, string>();
    for (const pick of mp.picks) {
      entryMap.set(pick.race_entry_id, pick.pick_type);
    }
    picksByUser.set(mp.user_id, entryMap);
  }

  // 印の集計
  const pickCounts: Record<string, Record<string, number>> = {};
  for (const entry of entries) {
    pickCounts[entry.id] = { win: 0, place: 0, back: 0, danger: 0 };
    for (const mp of memberPicks) {
      for (const pick of mp.picks) {
        if (pick.race_entry_id === entry.id) {
          pickCounts[entry.id][pick.pick_type]++;
        }
      }
    }
  }

  // 最も◎が多い馬、最も○が多い馬を抽出
  let topWin = { entryId: "", count: 0 };
  let topPlace = { entryId: "", count: 0 };
  for (const [entryId, counts] of Object.entries(pickCounts)) {
    if (counts.win > topWin.count) {
      topWin = { entryId, count: counts.win };
    }
    if (counts.place > topPlace.count) {
      topPlace = { entryId, count: counts.place };
    }
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">📰 My競馬新聞</h3>
        <Link
          href="/mypage/newspaper"
          className="text-xs text-gray-500 hover:text-green-600"
        >
          ⚙️ 設定
        </Link>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-2 px-3 text-left text-xs font-bold text-gray-600">馬</th>
                {members.map((member) => {
                  const rank = getRank(member.rank_id);
                  return (
                    <th key={member.user_id} className="py-2 px-2 text-center min-w-[50px]">
                      <Link href={`/users/${member.user_id}`} className="block group">
                        {member.avatar_url ? (
                          <Image
                            src={member.avatar_url}
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full mx-auto mb-0.5"
                            unoptimized
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs mx-auto mb-0.5">
                            🏇
                          </div>
                        )}
                        <div className="text-[10px] text-gray-500 truncate max-w-[50px] group-hover:text-green-600">
                          {member.display_name.slice(0, 4)}
                        </div>
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const counts = pickCounts[entry.id];
                const hasAnyPick = Object.values(counts).some(c => c > 0);
                
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-50 ${hasAnyPick ? "bg-yellow-50/30" : ""}`}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {entry.post_number}
                        </span>
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[80px]">
                          {entry.horses?.name}
                        </span>
                      </div>
                    </td>
                    {members.map((member) => {
                      const userPicks = picksByUser.get(member.user_id);
                      const pickType = userPicks?.get(entry.id);
                      const style = pickType ? PICK_MARKS[pickType] : null;

                      return (
                        <td key={member.user_id} className="py-2 px-2 text-center">
                          {style ? (
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${style.bg} ${style.text}`}
                            >
                              {style.mark}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 集計 */}
      {(topWin.count > 0 || topPlace.count > 0) && (
        <div className="bg-emerald-50 rounded-xl p-3 text-sm">
          <div className="text-xs font-bold text-emerald-700 mb-1">📊 印の集計</div>
          <div className="text-xs text-gray-600 space-y-0.5">
            {topWin.count > 0 && (
              <div>
                ◎最多: {entries.find(e => e.id === topWin.entryId)?.post_number}{" "}
                {entries.find(e => e.id === topWin.entryId)?.horses?.name}
                （{topWin.count}票）
              </div>
            )}
            {topPlace.count > 0 && (
              <div>
                ○最多: {entries.find(e => e.id === topPlace.entryId)?.post_number}{" "}
                {entries.find(e => e.id === topPlace.entryId)?.horses?.name}
                （{topPlace.count}票）
              </div>
            )}
          </div>
        </div>
      )}

      {/* メンバーの投票状況 */}
      <div className="text-xs text-gray-400 text-center">
        {memberPicks.length}/{members.length}人が投票済み
      </div>
    </div>
  );
}
