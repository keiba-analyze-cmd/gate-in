import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminTikTokManager from "@/components/admin/AdminTikTokManager";

export default async function TikTokAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">🎬 TikTok動画管理</h1>
      </div>
      <AdminTikTokManager />
    </div>
  );
}
