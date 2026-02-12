import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotificationList from "@/components/mypage/NotificationList";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🔔 通知</h1>
      <NotificationList />
    </div>
  );
}
