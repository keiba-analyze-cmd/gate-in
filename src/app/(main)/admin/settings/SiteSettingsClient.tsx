"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Props = {
  settings: Record<string, any>;
};

export default function SiteSettingsClient({ settings }: Props) {
  const router = useRouter();
  const supabase = createClient();
  
  const [heroUrl, setHeroUrl] = useState(settings.hero_image?.url ?? "");
  const [heroAlt, setHeroAlt] = useState(settings.hero_image?.alt ?? "ヒーロー画像");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("site_settings")
      .upsert({
        key: "hero_image",
        value: { url: heroUrl || null, alt: heroAlt },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setMessage("❌ 保存に失敗しました: " + error.message);
    } else {
      setMessage("✅ 保存しました");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">←</Link>
        <h1 className="text-xl font-black text-gray-900">⚙️ サイト設定</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
        {/* HERO画像設定 */}
        <div>
          <h2 className="font-bold text-gray-800 mb-4">🖼️ LPヒーロー画像</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                画像URL
              </label>
              <input
                type="url"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
                placeholder="https://example.com/hero.jpg"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                空欄の場合はデフォルトのグラデーション背景が使用されます
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt テキスト
              </label>
              <input
                type="text"
                value={heroAlt}
                onChange={(e) => setHeroAlt(e.target.value)}
                placeholder="ヒーロー画像"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            {/* プレビュー */}
            {heroUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  プレビュー
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={heroUrl}
                    alt={heroAlt}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "保存中..." : "設定を保存"}
          </button>
          {message && (
            <p className={`text-sm text-center mt-2 ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </div>
      </div>

      {/* 使い方 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-bold text-blue-800 mb-2">💡 画像のアップロード方法</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Supabase Storage や 外部サービス（Cloudinary等）に画像をアップロード</li>
          <li>公開URLをコピーして上記の「画像URL」に貼り付け</li>
          <li>「設定を保存」をクリック</li>
        </ol>
      </div>
    </div>
  );
}
