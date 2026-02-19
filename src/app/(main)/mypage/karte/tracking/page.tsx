// src/app/(main)/mypage/karte/tracking/page.tsx
// 追跡リストページ

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrackingClient } from "./TrackingClient";

export const metadata = {
  title: "追跡リスト | ゲートイン！",
  description: "追跡中の馬と次走情報",
};

export default async function TrackingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <TrackingClient />;
}
