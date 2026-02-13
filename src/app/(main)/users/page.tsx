"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRank } from "@/lib/constants/ranks";

type User = { id: string; display_name: string; avatar_url: string | null; rank_id: string; cumulative_points: number; total_votes: number; };

export default function UserSearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setUsers([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try { const r = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`); if(r.ok){setUsers((await r.json()).users);} } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => search(query), 300); return () => clearTimeout(t); }, [query, search]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🔍 ユーザー検索</h1>
      <div className="relative">
        <input type="text" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="ユーザー名で検索..." autoFocus
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      </div>
      {loading?<div className="text-center py-8 text-gray-400 text-sm">検索中...</div>
      :users.length>0?(
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {users.map(u=>{const rank=getRank(u.rank_id);return(
            <Link key={u.id} href={`/users/${u.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              {u.avatar_url?<Image width={40} height={40} src={u.avatar_url} alt="" className="w-10 h-10 rounded-full" unoptimized/>:<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🏇</div>}
              <div className="flex-1 min-w-0"><div className="text-sm font-bold text-gray-800 truncate">{u.display_name}</div><div className="flex items-center gap-2 text-xs text-gray-500"><span>{rank.icon} {rank.name}</span><span className="font-bold text-green-600">{u.cumulative_points.toLocaleString()} P</span></div></div>
              <span className="text-gray-300 text-sm">›</span>
            </Link>);})}
        </div>
      ):searched&&!loading?<div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">🔍</div>該当するユーザーが見つかりません</div>
      :<div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">👥</div>ユーザー名を入力して検索してください</div>}
    </div>
  );
}
