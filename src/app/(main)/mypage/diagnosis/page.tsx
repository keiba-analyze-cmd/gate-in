import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import StyleDiagnosisClient from "./StyleDiagnosisClient";

export const metadata: Metadata = {
  title: "予想スタイル診断",
};

export default async function DiagnosisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">予想スタイル診断</span>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">🎯 予想スタイル診断</h1>
      </div>

      <StyleDiagnosisClient />
    </div>
  );
}
