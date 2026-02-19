import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminRaceCreateForm from "@/components/admin/AdminRaceCreateForm";
import AdminScrapeForm from "@/components/admin/AdminScrapeForm";
import AdminInquiries from "@/components/admin/AdminInquiries";
import AdminComments from "@/components/admin/AdminComments";
import AdminRaceList from "@/components/admin/AdminRaceList";
import AdminDashboard from "@/components/admin/AdminDashboard";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { tab } = await searchParams;
  const currentTab = tab || "scrape";

  // レース一覧（list タブ用）
  let races: any[] = [];
  let resultsRaces: any[] = [];
  if (currentTab === "list") {
    const { data } = await supabase
      .from("races")
      .select("id, name, external_id, grade, race_date, course_name, race_number, status, head_count")
      .order("race_date", { ascending: false })
      .order("race_number")
      .limit(100);
    races = data ?? [];
  }

  // 結果入力タブ用（投票受付中のレースを取得）
  if (currentTab === "results") {
    const { data } = await supabase
      .from("races")
      .select("id, name, external_id, grade, race_date, course_name, race_number, status, head_count, race_entries(id, post_number, horses(name))")
      .in("status", ["voting_open", "voting_closed"])
      .order("race_date", { ascending: false })
      .order("race_number")
      .limit(50);
    resultsRaces = data ?? [];
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-6">🔧 管理画面</h1>
      <AdminTabs />
      <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-6">
        {/* 📊 ダッシュボードタブ */}
        {currentTab === "dashboard" && <AdminDashboard />}

        {/* 📥 レース取得タブ */}
        {currentTab === "scrape" && <AdminScrapeForm />}

        {/* ➕ レース登録タブ */}
        {currentTab === "create" && <AdminRaceCreateForm />}

        {/* 🏁 結果入力タブ */}
        {currentTab === "results" && (
          resultsRaces.length > 0 ? (
            <AdminRaceList races={resultsRaces} type="pending" />
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🏁</p>
              <p>結果入力待ちのレースはありません</p>
              <p className="text-xs mt-1">ステータスが「投票受付中」のレースがここに表示されます</p>
            </div>
          )
        )}

        {/* 📩 お問い合わせタブ */}
        {currentTab === "inquiries" && <AdminInquiries />}

        {/* 💬 コメント管理タブ */}
        {currentTab === "comments" && <AdminComments />}

        {/* 📋 レース一覧タブ */}
        {currentTab === "list" && (
          <div className="space-y-2">
            {races.length === 0 ? (
              <p className="text-gray-400 text-center py-8">登録済みレースがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 px-3">日付</th>
                      <th className="py-2 px-3">競馬場</th>
                      <th className="py-2 px-3">R</th>
                      <th className="py-2 px-3">レース名</th>
                      <th className="py-2 px-3">グレード</th>
                      <th className="py-2 px-3 text-right">頭数</th>
                      <th className="py-2 px-3">ステータス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {races.map((race) => (
                      <tr key={race.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-600">{race.race_date}</td>
                        <td className="py-2 px-3 font-bold">{race.course_name}</td>
                        <td className="py-2 px-3">{race.race_number}R</td>
                        <td className="py-2 px-3 font-bold text-gray-800">{race.name}</td>
                        <td className="py-2 px-3">
                          {race.grade && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {race.grade}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">{race.head_count}頭</td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            race.status === "voting_open"
                              ? "bg-green-100 text-green-700"
                              : race.status === "finished"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {race.status === "voting_open" ? "投票受付中" :
                             race.status === "finished" ? "確定" : race.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
