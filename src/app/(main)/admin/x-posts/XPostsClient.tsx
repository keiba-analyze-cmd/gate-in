"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Post = {
  id: string;
  scheduled_at: string;
  content: string;
  post_type: string;
  hashtags: string | null;
  status: string;
  posted_at: string | null;
  tweet_id: string | null;
  error_message: string | null;
  created_at: string;
};

type Props = {
  posts: Post[];
};

export default function XPostsClient({ posts }: Props) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newPost, setNewPost] = useState({
    scheduled_at: "",
    content: "",
    post_type: "general",
    hashtags: "#ゲートイン #競馬",
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newPost.scheduled_at || !newPost.content) {
      alert("日時と内容を入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/x-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });

      if (!res.ok) throw new Error("作成に失敗しました");

      setNewPost({
        scheduled_at: "",
        content: "",
        post_type: "general",
        hashtags: "#ゲートイン #競馬",
      });
      setIsCreating(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この投稿を削除しますか？")) return;

    try {
      const res = await fetch(`/api/admin/x-posts?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("削除に失敗しました");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("この投稿をキャンセルしますか？")) return;

    try {
      const res = await fetch("/api/admin/x-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" }),
      });

      if (!res.ok) throw new Error("キャンセルに失敗しました");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      posted: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    const labels: Record<string, string> = {
      pending: "予約中",
      posted: "投稿済",
      failed: "失敗",
      cancelled: "キャンセル",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] ?? "bg-gray-100"}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">←</Link>
          <h1 className="text-xl font-black text-gray-900">𝕏 投稿管理</h1>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
        >
          ＋ 新規作成
        </button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-2xl font-black text-yellow-600">
            {posts.filter((p) => p.status === "pending").length}
          </div>
          <div className="text-xs text-gray-500">予約中</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-2xl font-black text-green-600">
            {posts.filter((p) => p.status === "posted").length}
          </div>
          <div className="text-xs text-gray-500">投稿済</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-2xl font-black text-red-600">
            {posts.filter((p) => p.status === "failed").length}
          </div>
          <div className="text-xs text-gray-500">失敗</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-2xl font-black text-gray-600">
            {posts.filter((p) => p.status === "cancelled").length}
          </div>
          <div className="text-xs text-gray-500">キャンセル</div>
        </div>
      </div>

      {/* 新規作成モーダル */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">新規投稿を作成</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  投稿日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={newPost.scheduled_at}
                  onChange={(e) => setNewPost({ ...newPost, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  投稿タイプ
                </label>
                <select
                  value={newPost.post_type}
                  onChange={(e) => setNewPost({ ...newPost, post_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="general">一般</option>
                  <option value="mvp">週間MVP</option>
                  <option value="race_preview">レース告知</option>
                  <option value="result">結果速報</option>
                  <option value="tips">競馬豆知識</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder={"投稿内容を入力...\n\n動的変数:\n{{weekly_mvp}} → 週間MVP名\n{{today_date}} → 今日の日付"}
                />
                <div className="text-xs text-gray-400 mt-1">
                  {newPost.content.length} / 280文字
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  ハッシュタグ
                </label>
                <input
                  type="text"
                  value={newPost.hashtags}
                  onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="#ゲートイン #競馬"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2 border rounded-lg font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投稿一覧 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">日時</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">内容</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">タイプ</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">ステータス</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {formatDate(post.scheduled_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 line-clamp-2 max-w-xs">
                    {post.content}
                  </div>
                  {post.hashtags && (
                    <div className="text-xs text-blue-500 mt-1">{post.hashtags}</div>
                  )}
                  {post.error_message && (
                    <div className="text-xs text-red-500 mt-1">⚠️ {post.error_message}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{post.post_type}</td>
                <td className="px-4 py-3">{statusBadge(post.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {post.status === "pending" && (
                      <button
                        onClick={() => handleCancel(post.id)}
                        className="text-xs text-yellow-600 hover:underline"
                      >
                        キャンセル
                      </button>
                    )}
                    {post.tweet_id && (
                      
                        href={`https://twitter.com/i/status/${post.tweet_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        確認
                      </a>
                    )}
                    {(post.status === "cancelled" || post.status === "failed") && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  投稿がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
