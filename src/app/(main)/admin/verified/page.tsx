import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import VerifiedManagementClient from "./VerifiedManagementClient";

export const metadata: Metadata = {
  title: "認証バッジ管理 | 管理画面",
};

export default async function VerifiedManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");

  // 認証済みユーザー一覧を取得
  const { data: verifiedUsers } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url, avatar_emoji, rank_id, is_verified, cumulative_points")
    .eq("is_verified", true)
    .order("display_name", { ascending: true });

  return <VerifiedManagementClient initialVerifiedUsers={verifiedUsers ?? []} />;
}
