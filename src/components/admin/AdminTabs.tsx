"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type TabGroup = {
  name: string;
  icon: string;
  tabs: { key: string; label: string; description: string }[];
};

const TAB_GROUPS: TabGroup[] = [
  {
    name: "レース",
    icon: "🏇",
    tabs: [
      { key: "scrape", label: "📥 取得", description: "netkeiba一括取得" },
      { key: "create", label: "➕ 登録", description: "手動登録" },
      { key: "results", label: "🏁 結果", description: "結果入力" },
      { key: "list", label: "📋 一覧", description: "登録済み" },
    ],
  },
  {
    name: "運用",
    icon: "📊",
    tabs: [
      { key: "dashboard", label: "📊 KPI", description: "ダッシュボード" },
      { key: "inquiries", label: "📩 問合せ", description: "問い合わせ" },
      { key: "comments", label: "💬 コメント", description: "通報対応" },
      { key: "contest", label: "🏆 大会", description: "週間大会" },
    ],
  },
];

const EXTRA_LINKS = [
  { href: "/admin/x-posts", label: "𝕏 投稿", description: "X自動投稿" },
  { href: "/admin/verified", label: "✅ 認証", description: "認証バッジ" },
  { href: "/admin/settings", label: "⚙️ 設定", description: "サイト設定" },
  { href: "/admin/tiktok", label: "🎬 TikTok", description: "動画管理" },
];

export default function AdminTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "scrape";

  return (
    <div className="bg-white rounded-t-xl border border-b-0 border-gray-200">
      {/* メインタブ - グループ化 */}
      <div className="flex flex-wrap">
        {TAB_GROUPS.map((group, groupIndex) => (
          <div key={group.name} className="flex items-stretch">
            {/* グループ区切り */}
            {groupIndex > 0 && (
              <div className="w-px bg-gray-200 my-2" />
            )}
            
            {/* グループ内のタブ */}
            {group.tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => router.push(`/admin?tab=${tab.key}`)}
                className={`py-3 px-4 text-sm font-bold transition-colors relative ${
                  currentTab === tab.key
                    ? "text-green-600 bg-green-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="whitespace-nowrap">{tab.label}</div>
                <div className="text-[10px] font-normal text-gray-400 mt-0.5 whitespace-nowrap">
                  {tab.description}
                </div>
                {currentTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                )}
              </button>
            ))}
          </div>
        ))}

        {/* 区切り */}
        <div className="w-px bg-gray-200 my-2" />

        {/* 外部リンク */}
        {EXTRA_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="py-3 px-4 text-sm font-bold transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            <div className="whitespace-nowrap">{link.label}</div>
            <div className="text-[10px] font-normal text-gray-400 mt-0.5 whitespace-nowrap">
              {link.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
