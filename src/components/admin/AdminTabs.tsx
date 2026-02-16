"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const TABS = [
  { key: "dashboard", label: "📊 ダッシュボード", description: "KPI・運用状況" },
  { key: "scrape", label: "📥 レース取得", description: "netkeibaから一括取得" },
  { key: "create", label: "➕ レース登録", description: "手動で登録" },
  { key: "results", label: "🏁 結果入力", description: "レース結果を入力" },
  { key: "list", label: "📋 レース一覧", description: "登録済みレース" },
  { key: "inquiries", label: "📩 お問い合わせ", description: "問い合わせ管理" },
  { key: "comments", label: "💬 コメント管理", description: "通報・非表示対応" },
];

const EXTRA_LINKS = [
  { href: "/admin/verified", label: "✅ 認証バッジ", description: "公式予想家の認証" },
];

export default function AdminTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";
  
  return (
    <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => router.push(`/admin?tab=${tab.key}`)}
          className={`flex-1 min-w-[100px] py-3 px-3 text-sm font-bold transition-colors relative whitespace-nowrap ${
            currentTab === tab.key
              ? "text-green-600 bg-green-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <div>{tab.label}</div>
          <div className="text-[10px] font-normal text-gray-400 mt-0.5">{tab.description}</div>
          {currentTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
        </button>
      ))}
      {EXTRA_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex-1 min-w-[100px] py-3 px-3 text-sm font-bold transition-colors relative whitespace-nowrap text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        >
          <div>{link.label}</div>
          <div className="text-[10px] font-normal text-gray-400 mt-0.5">{link.description}</div>
        </Link>
      ))}
    </div>
  );
}
