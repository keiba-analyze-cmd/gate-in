"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  raceId: string;
  entries: { id: string; post_number: number; horses: { name: string } | null }[];
};

type Member = { user_id: string; display_name: string; avatar_url: string | null; avatar_emoji: string | null; rank_id: string };
type MemberPick = { user_id: string; picks: { pick_type: string; race_entry_id: string }[] };

const PICK_MARKS: Record<string, { mark: string; bg: string; text: string }> = {
  win: { mark: "◎", bg: "bg-red-500", text: "text-white" },
  place: { mark: "○", bg: "bg-blue-500", text: "text-white" },
  back: { mark: "△", bg: "bg-yellow-500", text: "text-white" },
  danger: { mark: "⚠️", bg: "bg-gray-500", text: "text-white" },
};

export default function MyNewspaperTab({ raceId, entries }: Props) {
  const { isDark } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [picks, setPicks] = useState<MemberPick[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-gray-600";
  const textMuted = isDark ? "text-slate-500" : "text-gray-400";
  const headerBg = isDark ? "bg-slate-800" : "bg-gray-50";
  const borderColor = isDark ? "border-slate-700" : "border-gray-200";
  const btnPrimary = isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const membersRes = await fetch("/api/newspaper-members");
        const picksRes = await fetch(`/api/newspaper?race_id=${raceId}`);
        if (membersRes.ok) setMembers((await membersRes.json()).members ?? []);
        if (picksRes.ok) setPicks((await picksRes.json()).picks ?? []);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, [raceId]);

  if (loading) return <div className={`rounded-2xl border p-8 text-center ${cardBg} ${textMuted}`}>読み込み中...</div>;

  if (members.length === 0) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
        <div className="text-4xl mb-3">🗞️</div>
        <p className={`mb-4 ${textSecondary}`}>My競馬新聞メンバーが設定されていません</p>
        <Link href="/mypage/newspaper" className={`inline-block px-6 py-3 rounded-xl font-bold ${btnPrimary}`}>
          メンバーを設定する
        </Link>
      </div>
    );
  }

  const getPickMark = (userId: string, entryId: string) => {
    const userPicks = picks.find(p => p.user_id === userId);
    const pick = userPicks?.picks.find(p => p.race_entry_id === entryId);
    return pick ? PICK_MARKS[pick.pick_type] : null;
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      <div className={`px-4 py-3 ${headerBg} border-b ${borderColor}`}>
        <h2 className={`font-bold ${textPrimary}`}>📰 My競馬新聞</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={headerBg}>
            <tr className={`border-b ${borderColor}`}>
              <th className={`px-3 py-2 text-left font-bold sticky left-0 ${headerBg} ${textSecondary}`}>馬</th>
              {members.map(m => (
                <th key={m.user_id} className={`px-2 py-2 text-center min-w-[60px] ${textSecondary}`}>
                  <Link href={`/users/${m.user_id}`} className="flex flex-col items-center gap-1">
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt="" width={24} height={24} className="w-6 h-6 rounded-full" unoptimized />
                    ) : (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>🏇</div>
                    )}
                    <span className="text-[10px] truncate max-w-[50px]">{m.display_name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className={`border-b ${borderColor} ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-50"}`}>
                <td className={`px-3 py-2 sticky left-0 ${isDark ? "bg-slate-900" : "bg-white"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-slate-700 text-slate-100" : "bg-gray-800 text-white"}`}>
                      {entry.post_number}
                    </span>
                    <span className={`font-medium truncate max-w-[100px] ${textPrimary}`}>{entry.horses?.name ?? "不明"}</span>
                  </div>
                </td>
                {members.map(m => {
                  const mark = getPickMark(m.user_id, entry.id);
                  return (
                    <td key={m.user_id} className="px-2 py-2 text-center">
                      {mark && (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${mark.bg} ${mark.text}`}>
                          {mark.mark}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
