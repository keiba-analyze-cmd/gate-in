import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RankingTabs from "@/components/rankings/RankingTabs";

export default async function RankingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🏆 ランキング</h1>
      <RankingTabs currentUserId={user.id} />
    </div>
  );
}
