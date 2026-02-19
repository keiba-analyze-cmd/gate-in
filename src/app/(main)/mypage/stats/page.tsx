// src/app/(main)/mypage/stats/page.tsx
// 統計ダッシュボードページ

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatsClient } from "./StatsClient";

export const metadata = {
  title: "統計ダッシュボード | ゲートイン！",
  description: "あなたの予想成績を分析",
};

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <StatsClient />;
}
