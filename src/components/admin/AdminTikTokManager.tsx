// src/components/admin/AdminTikTokManager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";

type TikTokVideo = {
  id: string;
  type: string;
  status: string;
  race_name: string | null;
  race_date: string | null;
  character_id: string | null;
  character_name: string | null;
  content: any;
  caption: string | null;
  hashtags: string | null;
  reviewer_notes: string | null;
  approved_at: string | null;
  posted_at: string | null;
  tiktok_url: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "下書き", color: "text-gray-400", bg: "bg-gray-800" },
  review: { label: "レビュー待ち", color: "text-yellow-400", bg: "bg-yellow-900/30" },
  approved: { label: "承認済み", color: "text-green-400", bg: "bg-green-900/30" },
  rendered: { label: "レンダリング済み", color: "text-blue-400", bg: "bg-blue-900/30" },
  posted: { label: "投稿済み", color: "text-purple-400", bg: "bg-purple-900/30" },
};

const TYPE_EMOJI: Record<string, string> = {
  prediction: "🎯",
  results: "🏆",
  data: "📊",
  char: "🐴",
  monthly: "📅",
};

const CHAR_COLORS: Record<string, string> = {
  hayate: "#1E40AF",
  kazan: "#DC2626",
  hakusen: "#059669",
  hibari: "#D97706",
  gantetsu: "#475569",
};

export default function AdminTikTokManager() {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TikTokVideo | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSerif, setEditSerif] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    const res = await fetch(`/api/admin/tiktok${params}`);
    const data = await res.json();
    setVideos(data.videos || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const selectVideo = (v: TikTokVideo) => {
    setSelected(v);
    setEditCaption(v.caption || "");
    setEditHashtags(v.hashtags || "");
    setEditNotes(v.reviewer_notes || "");
    setEditSerif(v.content?.serif || "");
  };

  const updateVideo = async (id: string, updates: Partial<TikTokVideo>) => {
    setSaving(true);
    await fetch("/api/admin/tiktok", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    await fetchVideos();
    if (selected?.id === id) {
      const updated = videos.find((v) => v.id === id);
      if (updated) setSelected({ ...updated, ...updates } as TikTokVideo);
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    const contentUpdate = { ...selected.content };
    if (editSerif && selected.type === "prediction") {
      contentUpdate.serif = editSerif;
    }
    await updateVideo(selected.id, {
      caption: editCaption,
      hashtags: editHashtags,
      reviewer_notes: editNotes,
      content: contentUpdate,
    });
  };

  const handleApprove = async () => {
    if (!selected) return;
    await handleSave();
    await updateVideo(selected.id, { status: "approved" });
  };

  const handleReject = async () => {
    if (!selected) return;
    await updateVideo(selected.id, {
      status: "draft",
      reviewer_notes: editNotes || "要修正",
    });
  };

  const handleMarkPosted = async () => {
    if (!selected) return;
    const url = prompt("TikTokのURLを入力（省略可）:");
    await updateVideo(selected.id, {
      status: "posted",
      posted_at: new Date().toISOString(),
      tiktok_url: url || null,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この動画を削除しますか？")) return;
    await fetch(`/api/admin/tiktok?id=${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    await fetchVideos();
  };

  const reviewCount = videos.filter((v) => v.status === "review").length;
  const approvedCount = videos.filter((v) => v.status === "approved").length;

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
      {/* 左: 動画一覧 */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        {/* フィルタ */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {["all", "review", "approved", "rendered", "posted"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filter === f
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f === "all" ? "全て" : STATUS_CONFIG[f]?.label || f}
              {f === "review" && reviewCount > 0 && (
                <span className="ml-1 bg-yellow-500 text-black px-1.5 rounded-full">
                  {reviewCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* リスト */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-gray-500 text-sm text-center py-8">読み込み中...</div>
          ) : videos.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">
              動画がありません
              <br />
              <span className="text-xs">
                pipeline.mjs publish でアップロード
              </span>
            </div>
          ) : (
            videos.map((v) => {
              const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.draft;
              const isSelected = selected?.id === v.id;
              const charColor = CHAR_COLORS[v.character_id || ""] || "#666";
              return (
                <button
                  key={v.id}
                  onClick={() => selectVideo(v)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-green-500 bg-green-950/30"
                      : "border-gray-800 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {TYPE_EMOJI[v.type] || "📄"}
                    </span>
                    <span className="font-bold text-sm text-white truncate flex-1">
                      {v.character_name && `${v.character_name} × `}
                      {v.race_name || v.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}
                    >
                      {cfg.label}
                    </span>
                    {v.character_id && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: charColor }}
                      />
                    )}
                    <span className="text-[10px] text-gray-600 ml-auto">
                      {new Date(v.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 右: 詳細・編集 */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            ← 左から動画を選択してレビュー
          </div>
        ) : (
          <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {TYPE_EMOJI[selected.type]}{" "}
                  {selected.character_name && `${selected.character_name} × `}
                  {selected.race_name || selected.type}
                </h3>
                <p className="text-xs text-gray-500">
                  {selected.race_date} / 作成:{" "}
                  {new Date(selected.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="px-3 py-1.5 bg-gray-800 text-red-400 text-xs rounded-lg hover:bg-red-900/30"
                >
                  🗑 削除
                </button>
              </div>
            </div>

            {/* コンテンツプレビュー */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm font-bold text-gray-400 mb-3">
                📋 コンテンツプレビュー
              </h4>
              {selected.type === "prediction" && (
                <PredictionPreview content={selected.content} />
              )}
              {selected.type === "results" && (
                <ResultsPreview content={selected.content} />
              )}
            </div>

            {/* セリフ編集（prediction） */}
            {selected.type === "prediction" && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-bold text-gray-400 mb-2">
                  💬 セリフ
                </h4>
                <textarea
                  value={editSerif}
                  onChange={(e) => setEditSerif(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 text-white text-sm p-3 rounded-lg border border-gray-700 focus:border-green-500 outline-none resize-none"
                />
              </div>
            )}

            {/* キャプション編集 */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm font-bold text-gray-400 mb-2">
                📝 TikTokキャプション
              </h4>
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 text-white text-sm p-3 rounded-lg border border-gray-700 focus:border-green-500 outline-none resize-none mb-2"
              />
              <input
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                placeholder="ハッシュタグ"
                className="w-full bg-gray-800 text-white text-sm p-3 rounded-lg border border-gray-700 focus:border-green-500 outline-none"
              />
            </div>

            {/* レビューノート */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm font-bold text-gray-400 mb-2">
                📎 レビューノート
              </h4>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder="修正指示やメモ..."
                className="w-full bg-gray-800 text-white text-sm p-3 rounded-lg border border-gray-700 focus:border-green-500 outline-none resize-none"
              />
            </div>

            {/* アクションボタン */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-gray-700 text-white text-sm font-bold rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                {saving ? "保存中..." : "💾 保存"}
              </button>

              {selected.status === "review" && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={saving}
                    className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 disabled:opacity-50"
                  >
                    ✅ 承認
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="px-5 py-2.5 bg-red-900 text-red-300 text-sm font-bold rounded-lg hover:bg-red-800 disabled:opacity-50"
                  >
                    🔄 差し戻し
                  </button>
                </>
              )}

              {(selected.status === "approved" ||
                selected.status === "rendered") && (
                <button
                  onClick={handleMarkPosted}
                  disabled={saving}
                  className="px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-500 disabled:opacity-50"
                >
                  📱 投稿済みにする
                </button>
              )}
            </div>

            {/* 投稿チェックリスト（approved以降） */}
            {["approved", "rendered"].includes(selected.status) && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-bold text-gray-400 mb-3">
                  ✈️ 投稿チェックリスト
                </h4>
                <div className="space-y-2 text-sm text-gray-400">
                  {[
                    "MP4レンダリング完了",
                    "キャプションを確認",
                    "ハッシュタグを確認",
                    "TikTokアプリで動画アップロード",
                    "サウンド設定",
                    "公開設定を確認",
                    "投稿！",
                  ].map((item, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── プレビューコンポーネント ──

function PredictionPreview({ content }: { content: any }) {
  const charColor = CHAR_COLORS[content.charId] || "#666";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-2"
          style={{ borderColor: charColor, background: `${charColor}22` }}
        />
        <div>
          <div className="text-white font-bold">{content.charName}</div>
          <div className="text-xs text-gray-500">{content.charType}</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-1">
          {content.race?.grade} {content.race?.name} / {content.race?.venue}{" "}
          {content.race?.surface} {content.race?.distance}m
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span style={{ color: charColor }} className="font-black">
              ◎
            </span>
            <span className="text-white text-sm font-bold">
              {content.honmei?.number}番 {content.honmei?.name}
            </span>
            <span className="text-gray-500 text-xs">
              {content.honmei?.jockey}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-black">○</span>
            <span className="text-gray-300 text-sm">
              {content.taikou?.number}番 {content.taikou?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-black">▲</span>
            <span className="text-gray-300 text-sm">
              {content.tanpou?.number}番 {content.tanpou?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-black">△</span>
            <span className="text-gray-300 text-sm">
              {content.osae?.number}番 {content.osae?.name}
            </span>
          </div>
        </div>
      </div>

      {content.dataRows && (
        <div className="space-y-1">
          {content.dataRows.map((row: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-32 truncate">{row.label}</span>
              <span className="text-white font-bold">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      <div
        className="text-sm p-3 rounded-lg border-l-4"
        style={{
          borderColor: charColor,
          background: `${charColor}11`,
          color: "#ddd",
        }}
      >
        {content.serif}
      </div>
    </div>
  );
}

function ResultsPreview({ content }: { content: any }) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">
        {content.race?.grade} {content.race?.name} / {content.race?.venue}
      </div>

      <div className="space-y-1">
        {content.characters?.map((ch: any, i: number) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800"
          >
            <div
              className="w-8 h-8 rounded-full border-2"
              style={{
                borderColor: ch.color,
                background: `${ch.color}22`,
              }}
            />
            <span className="text-white text-sm font-bold w-20">
              {ch.name}
            </span>
            <span className="text-gray-400 text-xs flex-1">
              ◎{ch.pick?.num}番 {ch.pick?.name}
            </span>
            <span
              className={`text-sm font-black ${
                ch.hit ? "text-green-400" : "text-red-400"
              }`}
            >
              {ch.hit ? "✓" : "×"} {ch.finish}着
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">
          的中:{" "}
          <span className="text-white font-bold">{content.hitCount}/5</span>
        </span>
        <span className="text-gray-400">
          回収率:{" "}
          <span className="text-white font-bold">{content.kaishuu}%</span>
        </span>
      </div>
    </div>
  );
}
