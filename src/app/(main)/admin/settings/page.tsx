import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SiteSettingsClient from "./SiteSettingsClient";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  // 現在の設定を取得
  const { data: settings } = await supabase
    .from("site_settings")
    .select("*");

  const settingsMap: Record<string, any> = {};
  for (const s of settings ?? []) {
    settingsMap[s.key] = s.value;
  }

  return <SiteSettingsClient settings={settingsMap} />;
}
