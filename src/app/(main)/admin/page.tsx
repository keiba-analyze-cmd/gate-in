import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminRaceList from "@/components/admin/AdminRaceList";
import AdminRaceCreateForm from "@/components/admin/AdminRaceCreateForm";
import AdminTabs from "@/components/admin/AdminTabs";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 管理者チェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const activeTab = params.tab ?? "create";

  // 投票受付中 + 投票締切のレース（結果確定待ち）
  const { data: pendingRaces } = await supabase
    .from("races")
    .select("*, race_entries(id, post_number, horses(name))")
    .in("status", ["voting_open", "voting_closed"])
    .order("race_date", { ascending: false });

  // 結果確定済みのレース（直近10件）
  const { data: finishedRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(10);

  // 全レース（直近20件）
  const { data: allRaces } = await supabase
    .from("races")
    .select("id, name, grade, race_date, course_name, race_number, status, head_count")
    .order("race_date", { ascending: false })
    .order("race_number", { ascending: true })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">⚙️ 管理画面</h1>
      </div>

      {/* タブ切り替え */}
      <AdminTabs activeTab={activeTab} />

      {/* ====== レース新規登録 ====== */}
      {activeTab === "create" && (
        <AdminRaceCreateForm />
      )}

      {/* ====== 結果入力 ====== */}
      {activeTab === "results" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            💡 レースの結果を入力して、ポイントを自動計算します。
          </div>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">📋 結果入力待ち</h2>
            {pendingRaces && pendingRaces.length > 0 ? (
              <AdminRaceList races={pendingRaces} type="pending" />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                結果入力待ちのレースはありません
              </div>
            )}
          </section>

          {finishedRaces && finishedRaces.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-3">✅ 確定済み</h2>
              <div className="space-y-2">
                {finishedRaces.map((race) => (
                  <div key={race.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-gray-800">{race.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{race.course_name} {race.race_date}</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">確定済み</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ====== レース一覧 ====== */}
      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">レース</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">日付</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">競馬場</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">頭数</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allRaces?.map((race) => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    upcoming: { label: "準備中", color: "bg-gray-100 text-gray-600" },
                    voting_open: { label: "受付中", color: "bg-green-100 text-green-700" },
                    voting_closed: { label: "締切", color: "bg-yellow-100 text-yellow-700" },
                    finished: { label: "確定", color: "bg-blue-100 text-blue-700" },
                  };
                  const st = statusMap[race.status] ?? { label: race.status, color: "bg-gray-100" };
                  return (
                    <tr key={race.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {race.grade && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                              {race.grade}
                            </span>
                          )}
                          <span className="font-medium text-gray-800">{race.name}</span>
                          <span className="text-xs text-gray-400">{race.race_number}R</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{race.race_date}</td>
                      <td className="px-4 py-3 text-gray-600">{race.course_name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{race.head_count ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!allRaces || allRaces.length === 0) && (
              <div className="p-8 text-center text-gray-400">登録済みレースはありません</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
