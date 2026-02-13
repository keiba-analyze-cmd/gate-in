"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  total_users: number; new_users_week: number;
  total_votes: number; monthly_votes: number; today_votes: number;
  active_today: number;
  total_comments: number; monthly_comments: number;
  active_races: number; total_races: number;
  pending_reports: number; pending_inquiries: number;
  total_follows: number;
  daily_votes: Record<string, number>;
};

function KPICard({ label, value, sub, icon, color }: {
  label: string; value: number | string; sub?: string; icon: string; color: string;
}) {
  return (
    <div className={`${color} rounded-xl p-4 border`}>
      <div className="text-xs text-gray-500 mb-1">{icon} {label}</div>
      <div className="text-2xl font-black text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  if (!data) return <div className="text-center py-12 text-red-400">データ取得に失敗しました</div>;

  const maxDaily = Math.max(...Object.values(data.daily_votes), 1);

  return (
    <div className="space-y-6">
      {/* アラート */}
      {(data.pending_reports > 0 || data.pending_inquiries > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <div className="text-sm">
            {data.pending_reports > 0 && <span className="font-bold text-red-700">未対応通報 {data.pending_reports}件</span>}
            {data.pending_reports > 0 && data.pending_inquiries > 0 && <span className="text-gray-400 mx-2">|</span>}
            {data.pending_inquiries > 0 && <span className="font-bold text-red-700">未対応お問い合わせ {data.pending_inquiries}件</span>}
          </div>
        </div>
      )}

      {/* KPIグリッド */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">📊 主要KPI</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon="👥" label="総ユーザー" value={data.total_users} sub={`今週 +${data.new_users_week}`} color="bg-blue-50 border-blue-200" />
          <KPICard icon="📱" label="今日のDAU" value={data.active_today} color="bg-green-50 border-green-200" />
          <KPICard icon="🗳" label="今日の投票" value={data.today_votes} sub={`今月 ${data.monthly_votes}`} color="bg-purple-50 border-purple-200" />
          <KPICard icon="💬" label="今月コメント" value={data.monthly_comments} sub={`累計 ${data.total_comments.toLocaleString()}`} color="bg-orange-50 border-orange-200" />
        </div>
      </div>

      <div>
        <h3 className="font-bold text-gray-800 mb-3">📈 運用指標</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon="🏇" label="受付中レース" value={data.active_races} sub={`全${data.total_races}レース`} color="bg-yellow-50 border-yellow-200" />
          <KPICard icon="🗳" label="累計投票" value={data.total_votes} color="bg-gray-50 border-gray-200" />
          <KPICard icon="🤝" label="フォロー総数" value={data.total_follows} color="bg-pink-50 border-pink-200" />
          <KPICard icon="⚠️" label="未対応タスク" value={data.pending_reports + data.pending_inquiries} color={data.pending_reports + data.pending_inquiries > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"} />
        </div>
      </div>

      {/* 直近7日の投票推移 */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">📅 直近7日間の投票数</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-end gap-2 h-32">
            {Object.entries(data.daily_votes).map(([date, count]) => {
              const height = Math.max((count / maxDaily) * 100, 4);
              const label = new Date(date + "T00:00:00+09:00").toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
              const isToday = date === new Date().toISOString().split("T")[0];
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-700">{count}</span>
                  <div className={`w-full rounded-t-lg transition-all ${isToday ? "bg-green-500" : "bg-green-200"}`} style={{ height: `${height}%` }} />
                  <span className={`text-[10px] ${isToday ? "font-bold text-green-600" : "text-gray-400"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
