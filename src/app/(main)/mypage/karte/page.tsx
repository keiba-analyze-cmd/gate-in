// src/app/(main)/mypage/karte/page.tsx
// 馬カルテページ

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KarteClient } from "./KarteClient";

export const metadata = {
  title: "馬カルテ | ゲートイン！",
  description: "あなたの予想の振り返りと追跡馬の管理",
};

export default async function KartePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <KarteClient />;
}
