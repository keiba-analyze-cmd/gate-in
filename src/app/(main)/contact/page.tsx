import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "ゲートイン！へのお問い合わせ",
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-sm text-gray-400">
        <Link href="/" className="hover:text-green-600">TOP</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-600">お問い合わせ</span>
      </div>

      <h1 className="text-xl font-bold text-gray-800">📩 お問い合わせ</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          ゲートイン！に関するご質問、ご意見、不具合の報告は下記メールアドレスまでお気軽にご連絡ください。
        </p>

        <div className="bg-green-50 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 mb-1">メールアドレス</p>
          <a
            href="mailto:support@gate-in.jp"
            className="text-lg font-bold text-green-700 hover:underline"
          >
            support@gate-in.jp
          </a>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">お問い合わせの際のお願い</h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex gap-2">
              <span className="text-green-600 shrink-0">✓</span>
              <span>ご利用中のブラウザ・端末をお知らせください</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 shrink-0">✓</span>
              <span>不具合の場合は再現手順をできるだけ詳しくお知らせください</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 shrink-0">✓</span>
              <span>スクリーンショットがあると対応がスムーズです</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">
            通常2〜3営業日以内にご返信いたします。お急ぎの場合はその旨お書き添えください。
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link href="/" className="text-sm text-green-600 hover:underline font-medium">
          ← トップページに戻る
        </Link>
      </div>
    </div>
  );
}
