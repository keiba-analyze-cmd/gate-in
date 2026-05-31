"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  raceId: string;
  entries: { id: string; post_number: number; horses: { name: string } | null }[];
};

type Member = { user_id: string; display_name: string; avatar_url: string | null; avatar_emoji: string | null; rank_id: string };
type MemberPick = { user_id: string; picks: { pick_type: string; race_entry_id: string }[] };

const PICK_MARKS: Record<string, { mark: string; color: string }> = {
  win: { mark: "◎", color: "var(--brand)" },
  place: { mark: "○", color: "var(--info)" },
  back: { mark: "△", color: "var(--osae)" },
  danger: { mark: "⚠️", color: "var(--ink-3)" },
};

export default function MyNewspaperTab({ raceId, entries }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [picks, setPicks] = useState<MemberPick[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="rounded-2xl border bg-surface border-line p-8 text-center text-ink-3 font-display">読み込み中...</div>;

  if (members.length === 0) {
    return (
      <div className="rounded-2xl border bg-surface border-line p-8 text-center font-display">
        <div className="text-4xl mb-3">🗞️</div>
        <p className="mb-4 text-ink-2">My競馬新聞メンバーが設定されていません</p>
        <Link href="/mypage/newspaper" className="inline-block px-6 py-3 rounded-xl font-bold bg-brand hover:bg-brand-strong text-white">
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
    <div className="rounded-2xl border bg-surface border-line overflow-hidden font-display">
      <div className="px-4 py-3 bg-surface-2 border-b border-line">
        <h2 className="font-bold text-ink">📰 My競馬新聞</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2">
            <tr className="border-b border-line">
              <th className="px-3 py-2 text-left font-bold sticky left-0 bg-surface-2 text-ink-2">馬</th>
              {members.map(m => (
                <th key={m.user_id} className="px-2 py-2 text-center min-w-[60px] text-ink-2">
                  <Link href={`/users/${m.user_id}`} className="flex flex-col items-center gap-1">
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt="" width={24} height={24} className="w-6 h-6 rounded-full" unoptimized />
                    ) : (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-surface">🏇</div>
                    )}
                    <span className="text-[10px] truncate max-w-[50px]">{m.display_name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className="border-b border-line">
                <td className="px-3 py-2 sticky left-0 bg-surface">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-data" style={{ background: "var(--ink)", color: "var(--bg)" }}>
                      {entry.post_number}
                    </span>
                    <span className="font-medium truncate max-w-[100px] text-ink">{entry.horses?.name ?? "不明"}</span>
                  </div>
                </td>
                {members.map(m => {
                  const mark = getPickMark(m.user_id, entry.id);
                  return (
                    <td key={m.user_id} className="px-2 py-2 text-center">
                      {mark && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ background: mark.color }}>
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
