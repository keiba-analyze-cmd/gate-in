"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { key: "create", label: "➕ レース登録", desc: "新しいレースを作成" },
  { key: "results", label: "🏁 結果入力", desc: "着順 → ポイント計算" },
  { key: "list", label: "📋 レース一覧", desc: "登録済みレース" },
];

export default function AdminTabs({ activeTab }: { activeTab: string }) {
  const router = useRouter();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => router.push(`/admin?tab=${tab.key}`)}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === tab.key
              ? "bg-green-600 text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
