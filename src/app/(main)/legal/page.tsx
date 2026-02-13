import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "特定商取引法に基づく表記" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="px-4 py-3 text-xs font-bold text-gray-900 text-left align-top whitespace-nowrap border-b border-gray-100 bg-gray-50 w-1/4">{label}</th>
      <td className="px-4 py-3 text-sm text-gray-700 leading-relaxed border-b border-gray-100">{children}</td>
    </tr>
  );
}

export default function LegalPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-center text-white mb-6">
        <h1 className="text-lg font-black mb-1">📑 特定商取引法に基づく表記</h1>
        <p className="text-green-200 text-[10px]">NOTATION BASED ON SPECIFIED COMMERCIAL TRANSACTIONS ACT</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-gray-50 rounded-lg">
          <span className="text-xs">📅</span>
          <span className="text-xs text-gray-500">最終更新日：2026年2月13日</span>
        </div>

        <div className="rounded-xl overflow-hidden border border-gray-200">
          <table className="w-full border-collapse">
            <tbody>
              {/* ※ ●●●● を実際の情報に変更してください */}
              <Row label="事業者名">●●●●（個人名またはサービス運営者名）</Row>
              <Row label="運営統括責任者">●●●●（代表者名）</Row>
              <Row label="所在地">
                <span className="text-xs text-gray-500">請求があった場合には遅滞なく開示いたします。</span>
              </Row>
              <Row label="電話番号">
                <span className="text-xs text-gray-500">請求があった場合には遅滞なく開示いたします。</span>
              </Row>
              <Row label="メールアドレス">noreply@gate-in.jp</Row>
              <Row label="販売価格">
                本サービスの基本利用は無料です。<br />
                有料サービスを提供する場合は該当ページに価格を明示します。
              </Row>
              <Row label="商品代金以外の必要料金">
                インターネット接続に必要な通信費はユーザー負担となります。
              </Row>
              <Row label="支払方法">現時点では有料サービスの提供はありません。</Row>
              <Row label="商品の引渡時期">予想大会の景品は大会終了後30日以内に発送いたします。</Row>
              <Row label="返品・キャンセル">デジタルコンテンツの性質上、購入後の返品・キャンセルはお受けできません。</Row>
              <Row label="動作環境">
                Chrome / Safari / Firefox / Edge の最新版<br />
                <span className="text-[11px] text-gray-500">JavaScript・Cookie有効が必要</span>
              </Row>
            </tbody>
          </table>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-5">
          <p className="text-xs text-gray-600 leading-relaxed">
            ⚠️ 本サービスは競馬の予想を楽しむためのエンターテインメントサービスです。馬券の購入を代行・推奨するものではありません。
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">制定日：2026年2月13日</p>
        </div>
      </div>
    </div>
  );
}
