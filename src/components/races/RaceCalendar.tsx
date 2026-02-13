"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Race = { id: string; name: string; race_date: string; course_name: string; grade: string | null; race_number: number; status: string; };
const WD = ["日","月","火","水","木","金","土"];
const GS: Record<string, string> = { G1: "bg-yellow-100 text-yellow-800 border-yellow-300", G2: "bg-red-100 text-red-700 border-red-300", G3: "bg-green-100 text-green-700 border-green-300" };

export default function RaceCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rbd, setRbd] = useState<Record<string, Race[]>>({});
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { (async () => { setLoading(true); const r = await fetch(`/api/races/calendar?year=${year}&month=${month}`); if(r.ok) setRbd((await r.json()).races); setLoading(false); })(); }, [year, month]);

  const prev = () => { if(month===1){setYear(year-1);setMonth(12);}else setMonth(month-1); setSel(null); };
  const next = () => { if(month===12){setYear(year+1);setMonth(1);}else setMonth(month+1); setSel(null); };
  const fd = new Date(year, month-1, 1).getDay();
  const dim = new Date(year, month, 0).getDate();
  const cells: (number|null)[] = []; for(let i=0;i<fd;i++) cells.push(null); for(let i=1;i<=dim;i++) cells.push(i);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
        <button onClick={prev} className="text-gray-500 hover:text-green-600 font-bold text-lg px-2">←</button>
        <h2 className="text-lg font-black text-gray-800">{year}年{month}月</h2>
        <button onClick={next} className="text-gray-500 hover:text-green-600 font-bold text-lg px-2">→</button>
      </div>
      {loading?<div className="text-center py-12 text-gray-400">読み込み中...</div>:<>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">{WD.map((w,i)=>(<div key={w} className={`py-2 text-center text-xs font-bold ${i===0?"text-red-500":i===6?"text-blue-500":"text-gray-500"}`}>{w}</div>))}</div>
          <div className="grid grid-cols-7">{cells.map((day,i)=>{
            if(day===null) return <div key={`e-${i}`} className="min-h-[72px] border-b border-r border-gray-50"/>;
            const ds=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const dr=rbd[ds]??[];const isT=ds===today;const isS=ds===sel;const dow=new Date(year,month-1,day).getDay();
            return(<button key={day} onClick={()=>setSel(isS?null:ds)} className={`min-h-[72px] p-1 border-b border-r border-gray-50 text-left transition-colors ${isS?"bg-green-50 ring-2 ring-green-400 ring-inset":isT?"bg-blue-50":"hover:bg-gray-50"}`}>
              <div className={`text-xs font-bold mb-1 ${dow===0?"text-red-500":dow===6?"text-blue-500":"text-gray-600"} ${isT?"bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center":""}`}>{day}</div>
              {dr.length>0&&<div className="space-y-0.5">
                {dr.filter(r=>r.grade).map(r=>(<div key={r.id} className={`text-[9px] font-bold px-1 py-0.5 rounded truncate border ${GS[r.grade!]??"bg-gray-100 text-gray-600 border-gray-200"}`}>{r.grade} {r.name}</div>))}
                <div className="text-[9px] text-gray-400">{[...new Set(dr.map(r=>r.course_name))].join("・")}（{dr.length}R）</div>
              </div>}
            </button>);
          })}</div>
        </div>
        {sel&&<div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-3">📅 {new Date(sel+"T00:00:00+09:00").toLocaleDateString("ja-JP",{month:"long",day:"numeric",weekday:"short"})}</h3>
          {(rbd[sel]??[]).length===0?<p className="text-sm text-gray-400">この日のレースはありません</p>:
          <div className="space-y-2">{(rbd[sel]??[]).map(r=>(
            <Link key={r.id} href={`/races/${r.id}`} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors border border-gray-100">
              <span className="text-xs text-gray-500 w-8 shrink-0">{r.race_number}R</span>
              {r.grade&&<span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${r.grade==="G1"?"bg-yellow-100 text-yellow-800":r.grade==="G2"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{r.grade}</span>}
              <span className="text-sm font-bold text-gray-800 flex-1 truncate">{r.name}</span>
              <span className="text-xs text-gray-500 shrink-0">{r.course_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${r.status==="voting_open"?"bg-green-100 text-green-700":r.status==="finished"?"bg-gray-100 text-gray-500":"bg-yellow-100 text-yellow-700"}`}>{r.status==="voting_open"?"投票受付中":r.status==="finished"?"確定":r.status}</span>
            </Link>))}</div>}
        </div>}
      </>}
    </div>
  );
}
