"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import NewspaperMemberSettings from "./NewspaperMemberSettings";

type Member = {
  id: string;
  user_id: string;
  display_order: number;
  display_name: string;
  avatar_url: string | null; avatar_emoji: string | null;
  rank_id: string;
};

type FollowingUser = {
  user_id: string;
  display_name: string;
  avatar_url: string | null; avatar_emoji: string | null;
  rank_id: string;
};

type Props = {
  initialMembers: Member[];
  followingUsers: FollowingUser[];
};

export default function NewspaperSettingsClient({ initialMembers, followingUsers }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();

  const textPrimary = isDark ? "text-slate-100" : "text-gray-800";
  const textMuted = isDark ? "text-slate-400" : "text-gray-400";
  const textSecondary = isDark ? "text-slate-300" : "text-gray-600";
  const linkColor = isDark ? "hover:text-amber-400" : "hover:text-green-600";
  const tipBg = isDark ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-700";
  const btnPrimary = isDark ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-green-600 text-white hover:bg-green-700";
  const btnSecondary = isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200";

  const handleSaveAndBack = () => {
    router.back();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className={`text-sm ${textMuted}`}>
        <Link href="/mypage" className={linkColor}>マイページ</Link>
        <span className="mx-2">›</span>
        <span className={textSecondary}>My競馬新聞設定</span>
      </div>

      <h1 className={`text-xl font-bold ${textPrimary}`}>📰 My競馬新聞設定</h1>

      <div className={`border rounded-xl p-4 text-sm ${tipBg}`}>
        <p className="font-bold mb-1">💡 My競馬新聞とは？</p>
        <p>選んだ5人の予想を競馬新聞のように一覧表示できます。レース詳細ページの「📰 My新聞」タブで確認できます。</p>
      </div>

      <NewspaperMemberSettings initialMembers={initialMembers} followingUsers={followingUsers} />

      {/* 保存・戻るボタン */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.push("/mypage")}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${btnSecondary}`}
        >
          マイページへ
        </button>
        <button
          onClick={handleSaveAndBack}
          className={`flex-1 py-3 rounded-xl font-bold transition-colors ${btnPrimary}`}
        >
          ✓ 保存して戻る
        </button>
      </div>

      <p className={`text-xs text-center ${textMuted}`}>
        ※ 変更は自動で保存されます
      </p>
    </div>
  );
}
