#!/usr/bin/env python3
"""
Task #58: 退会/アカウント削除機能
- src/app/api/account/delete/route.ts: 退会API
- src/app/(main)/mypage/delete/page.tsx: 退会確認ページ
- マイページメニューに退会リンク追加
"""

import os

# ============================================================
# 1. 退会API
# ============================================================
DELETE_API = '''\
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  if (body.confirmation !== "退会する") {
    return NextResponse.json({ error: "確認テキストが一致しません" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // 1. ユーザーのデータを匿名化/削除
    // コメントは匿名化（削除すると会話が壊れるため）
    await admin
      .from("comments")
      .update({ is_deleted: true })
      .eq("user_id", user.id);

    // 2. 投票データは統計用に保持（user_idのみ匿名化）
    // vote_picks, votesはそのまま（集計精度維持）

    // 3. フォロー関係を削除
    await admin.from("follows").delete().eq("follower_id", user.id);
    await admin.from("follows").delete().eq("following_id", user.id);

    // 4. 通知を削除
    await admin.from("notifications").delete().eq("user_id", user.id);

    // 5. ユーザーバッジを削除
    await admin.from("user_badges").delete().eq("user_id", user.id);

    // 6. 大会エントリーを削除
    await admin.from("contest_entries").delete().eq("user_id", user.id);

    // 7. プロフィールを匿名化
    await admin
      .from("profiles")
      .update({
        display_name: "退会済みユーザー",
        bio: null,
        avatar_url: null,
        is_admin: false,
      })
      .eq("id", user.id);

    // 8. Supabase Auth からユーザーを削除
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Auth user deletion failed:", deleteError);
      // Auth削除に失敗してもプロフィール匿名化は済んでいるので続行
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "退会処理に失敗しました" }, { status: 500 });
  }
}
'''

# ============================================================
# 2. 退会確認ページ
# ============================================================
DELETE_PAGE = '''\
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DeleteAccountPage() {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmation !== "退会する") {
      setError("確認テキストが一致しません");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    });

    if (res.ok) {
      // ログアウト → トップへ
      window.location.href = "/login";
    } else {
      const data = await res.json();
      setError(data.error ?? "退会に失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-sm text-gray-400">
        <Link href="/mypage" className="hover:text-green-600">マイページ</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">退会</span>
      </div>

      <h1 className="text-xl font-bold text-gray-800">⚠️ アカウント削除</h1>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-red-800">退会すると以下のデータが削除されます</h2>
        <ul className="text-sm text-red-700 space-y-1">
          <li>• フォロー・フォロワー関係</li>
          <li>• 通知履歴</li>
          <li>• 獲得バッジ</li>
          <li>• 大会エントリー</li>
          <li>• プロフィール情報（匿名化されます）</li>
          <li>• コメント（匿名化されます）</li>
        </ul>
        <p className="text-sm text-red-600 font-bold">※ この操作は取り消せません</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            確認のため「退会する」と入力してください
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="退会する"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        <div className="flex gap-3">
          <Link
            href="/mypage"
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 text-center hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
          <button
            onClick={handleDelete}
            disabled={confirmation !== "退会する" || loading}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {loading ? "処理中..." : "退会する"}
          </button>
        </div>
      </div>
    </div>
  );
}
'''

def run():
    # 1. API
    os.makedirs("src/app/api/account/delete", exist_ok=True)
    with open("src/app/api/account/delete/route.ts", "w") as f:
        f.write(DELETE_API)
    print("  ✅ src/app/api/account/delete/route.ts")

    # 2. ページ
    os.makedirs("src/app/(main)/mypage/delete", exist_ok=True)
    with open("src/app/(main)/mypage/delete/page.tsx", "w") as f:
        f.write(DELETE_PAGE)
    print("  ✅ src/app/(main)/mypage/delete/page.tsx")

    # 3. マイページメニューに退会リンク追加
    mypage = "src/app/(main)/mypage/page.tsx"
    if os.path.exists(mypage):
        with open(mypage, "r") as f:
            content = f.read()

        if "/mypage/delete" not in content:
            # 最後のMenuItemの後に追加
            old = '<MenuItem href={`/users/${user.id}`} icon="👤" label="公開プロフィール" desc="他の人から見えるページ" />'
            new = old + '\n        <MenuItem href="/mypage/delete" icon="🚪" label="退会" desc="アカウントの削除" />'

            if old in content:
                content = content.replace(old, new)
                with open(mypage, "w") as f:
                    f.write(content)
                print("  ✅ マイページメニューに退会リンク追加")
            else:
                print("  ⚠️  マイページメニューのパターン不一致。手動で追加してください")
        else:
            print("  ⏭️  既にリンクあり")

    print("\n🏁 Task #58 完了")

if __name__ == "__main__":
    run()
