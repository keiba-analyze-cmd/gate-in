import BackLink from "@/components/ui/BackLink";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "月間大会 | ゲートイン！",
  description: "毎月開催の予想バトル！上位入賞者にはAmazonギフト券をプレゼント",
};

export default async function ContestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackLink href="/" label="トップ" />
      <h1 className="text-xl font-bold text-gray-800">🎪 月間大会</h1>

      {/* メインビジュアル */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl p-8 text-white text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-black mb-2">近日開催予定！</h2>
        <p className="text-purple-100 text-sm leading-relaxed">
          毎月開催の予想バトル大会を準備中です。<br />
          上位入賞者にはAmazonギフト券をプレゼント！
        </p>
      </div>

      {/* 大会概要 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-black text-gray-900">📋 大会概要（予定）</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="text-sm font-bold text-purple-700 mb-1">🗓 開催期間</div>
            <div className="text-sm text-gray-700">毎月1日 〜 月末</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="text-sm font-bold text-purple-700 mb-1">📊 ルール</div>
            <div className="text-sm text-gray-700">月間の獲得ポイントで順位を競います。一定投票数以上で参加資格を獲得。</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <div className="text-sm font-bold text-yellow-700 mb-1">🎁 賞品（予定）</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>🥇 1位：Amazonギフト券 ¥10,000</div>
              <div>🥈 2位：Amazonギフト券 ¥5,000</div>
              <div>🥉 3位：Amazonギフト券 ¥3,000</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center">
        <p className="text-sm text-gray-700 mb-3">
          大会開催まで、レースの予想で腕を磨いておきましょう！🏇
        </p>
        <Link href="/races"
          className="inline-block bg-green-600 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
          🗳 レース一覧へ
        </Link>
      </div>
    </div>
  );
}
