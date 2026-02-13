"use client";
import BackLink from "@/components/ui/BackLink";

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

      <BackLink href="/mypage" label="マイページ" />
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
