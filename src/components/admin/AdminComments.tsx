"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Comment = { id: string; user_id: string; race_id: string; body: string; is_deleted: boolean; is_hidden: boolean; edited_at: string | null; created_at: string; profiles: { display_name: string } | null; races: { name: string; grade: string | null } | null; };
type Report = { reason: string; detail: string | null; status: string; };
const RL: Record<string, string> = { spam: "🚫スパム", harassment: "😠誹謗中傷", inappropriate: "⚠️不適切", misinformation: "❌誤情報", other: "📝その他" };

export default function AdminComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Record<string, Report[]>>({});
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("reported");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => { setLoading(true); const r = await fetch(`/api/admin/comments?filter=${filter}&page=${page}`); if(r.ok){const d=await r.json();setComments(d.comments);setReports(d.reports);setTotal(d.total);} setLoading(false); };
  useEffect(() => { load(); }, [filter, page]);

  const act = async (id: string, action: string) => { setBusy(id); await fetch("/api/admin/comments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment_id: id, action }) }); await load(); setBusy(null); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{k:"all",l:"全て"},{k:"reported",l:"🚨 通報あり"},{k:"hidden",l:"👁 非表示"},{k:"deleted",l:"🗑 削除済み"}].map(f=>(
          <button key={f.k} onClick={()=>{setFilter(f.k);setPage(1);}} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${filter===f.k?"bg-green-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{f.l}</button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-2">{total}件</span>
      </div>
      {loading?<div className="text-center py-8 text-gray-400">読み込み中...</div>:comments.length===0?<div className="text-center py-8 text-gray-400">該当なし</div>:(
        <div className="space-y-3">{comments.map(c=>{const cr=reports[c.id]??[];const isL=busy===c.id;return(
          <div key={c.id} className={`border rounded-xl p-4 ${c.is_deleted?"bg-red-50 border-red-200":c.is_hidden?"bg-yellow-50 border-yellow-200":cr.length>0?"bg-orange-50 border-orange-200":"bg-white border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
              <Link href={`/users/${c.user_id}`} className="font-bold text-gray-800 hover:text-green-600">{c.profiles?.display_name??"匿名"}</Link>
              <span>→</span>
              <Link href={`/races/${c.race_id}`} className="hover:text-green-600">{c.races?.name??"不明"}</Link>
              <span className="ml-auto">{new Date(c.created_at).toLocaleString("ja-JP")}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{c.body}</p>
            <div className="flex items-center gap-2 mb-2">
              {c.is_deleted&&<span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded">削除済</span>}
              {c.is_hidden&&<span className="text-xs bg-yellow-200 text-yellow-700 px-2 py-0.5 rounded">非表示</span>}
              {cr.length>0&&<span className="text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded">通報{cr.length}件</span>}
            </div>
            {cr.length>0&&<div className="bg-white/50 rounded-lg p-3 mb-3 space-y-1">{cr.map((r,i)=>(<div key={i} className="flex gap-2 text-xs"><span>{RL[r.reason]??r.reason}</span>{r.detail&&<span className="text-gray-400 truncate">「{r.detail}」</span>}<span className={`ml-auto ${r.status==="pending"?"text-orange-600":"text-gray-400"}`}>{r.status==="pending"?"未対応":"済"}</span></div>))}</div>}
            <div className="flex gap-2 flex-wrap">
              {!c.is_hidden&&!c.is_deleted&&<button onClick={()=>act(c.id,"hide")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50">👁非表示</button>}
              {c.is_hidden&&<button onClick={()=>act(c.id,"unhide")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">✅復元</button>}
              {!c.is_deleted&&<button onClick={()=>{if(confirm("削除しますか？"))act(c.id,"delete")}} disabled={isL} className="px-3 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">🗑削除</button>}
              {cr.some(r=>r.status==="pending")&&<><button onClick={()=>act(c.id,"resolve_reports")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg disabled:opacity-50">✅対応済</button><button onClick={()=>act(c.id,"dismiss_reports")} disabled={isL} className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg disabled:opacity-50">❌却下</button></>}
            </div>
          </div>);})}</div>
      )}
      {total>30&&<div className="flex justify-center gap-2"><button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg disabled:opacity-50">←前</button><span className="text-xs text-gray-500 self-center">{page}/{Math.ceil(total/30)}</span><button onClick={()=>setPage(page+1)} disabled={page*30>=total} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg disabled:opacity-50">次→</button></div>}
    </div>
  );
}
