import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminRaceList from "@/components/admin/AdminRaceList";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 投票受付中 + 投票締切のレース（結果確定待ち）
  const { data: pendingRaces } = await supabase
    .from("races")
    .select("*, race_entries(id, post_number, horses(name))")
    .in("status", ["voting_open", "voting_closed"])
    .order("race_date", { ascending: false });

  // 結果確定済みのレース（直近5件）
  const { data: finishedRaces } = await supabase
    .from("races")
    .select("*")
    .eq("status", "finished")
    .order("race_date", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">⚙️ 管理画面</h1>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
          開発用・テスト用
        </span>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        💡 ここではレース結果を入力して、ポイント自動計算をテストできます。
        本番ではJRA-VAN等の外部APIから自動で結果を取得する予定です。
      </div>

      {/* 結果待ちレース */}
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

      {/* 確定済みレース */}
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
  );
}
