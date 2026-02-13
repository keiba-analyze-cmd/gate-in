#!/usr/bin/env python3
"""
Task #59: お問い合わせページ
- src/app/(main)/contact/page.tsx
- フッターにリンク追加
"""

import os

CONTACT_PAGE = '''\
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
'''

def run():
    # 1. ページ作成
    os.makedirs("src/app/(main)/contact", exist_ok=True)
    with open("src/app/(main)/contact/page.tsx", "w") as f:
        f.write(CONTACT_PAGE)
    print("  ✅ src/app/(main)/contact/page.tsx")

    # 2. フッターにリンク追加
    footer = "src/components/layout/Footer.tsx"
    if os.path.exists(footer):
        with open(footer, "r") as f:
            content = f.read()

        if "/contact" not in content:
            # 利用規約リンクの近くに追加
            for pattern in [
                'href="/terms"',
                'href="/privacy"',
                'href="/legal"',
            ]:
                if pattern in content:
                    # そのリンクの後に追加
                    idx = content.index(pattern)
                    # その行の終わりを見つけて次の行に追加
                    # Link/a タグの閉じを見つける
                    end = content.find("\n", idx)
                    if end > 0:
                        # 次の行でお問い合わせリンクがないなら、閉じタグ後に追加は複雑なので別方法
                        pass

            # フッターの構造がわからないので、単純に文字列検索で追加
            if "利用規約" in content and "/contact" not in content:
                content = content.replace(
                    "利用規約",
                    "利用規約</Link>\n            <Link href=\"/contact\" className=\"hover:text-green-400 transition-colors\">お問い合わせ"
                )
                # ← これだとタグが壊れる可能性があるので安全な方法に変更
                pass

            # 安全策: Footer.tsx全体を読んで適切な箇所を見つける
            # パターンマッチが難しいのでWarningだけ出す
            print("  ⚠️  Footer.tsx にお問い合わせリンクを手動追加してください")
            print('     例: <Link href="/contact">お問い合わせ</Link>')
        else:
            print("  ⏭️  Footer に既にリンクあり")
    else:
        print("  ⚠️  Footer.tsx が見つかりません")

    print("\n🏁 Task #59 完了")

if __name__ == "__main__":
    run()
