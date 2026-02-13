import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "プライバシーポリシー" };

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2.5 text-base font-black text-gray-900 mb-3 pb-2.5 border-b-2 border-green-100">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-green-600 text-white text-xs font-bold shrink-0">{num}</span>
        {title}
      </h2>
      <div className="text-sm text-gray-700 leading-relaxed pl-1">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-center text-white mb-6">
        <h1 className="text-xl font-black mb-1">🔒 プライバシーポリシー</h1>
        <p className="text-green-200 text-xs">PRIVACY POLICY</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-gray-50 rounded-lg">
          <span className="text-xs">📅</span>
          <span className="text-xs text-gray-500">最終更新日：2026年2月13日</span>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            ゲートイン！運営（以下「運営者」）は、ウェブサービス「ゲートイン！」（URL: gate-in.jp、以下「本サービス」）におけるユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
          </p>
        </div>

        <Section num="1" title="個人情報の定義">
          <p>本ポリシーにおいて「個人情報」とは、個人情報保護法に規定される個人情報を指し、メールアドレス、ソーシャルアカウントの表示名・プロフィール画像など、特定の個人を識別できる情報をいいます。</p>
        </Section>

        <Section num="2" title="収集する情報">
          <p className="mb-2">本サービスでは以下の情報を収集します。</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li><span className="font-bold text-gray-900">アカウント情報：</span>メールアドレス、表示名、プロフィール画像URL</li>
            <li><span className="font-bold text-gray-900">利用情報：</span>投票履歴、コメント内容、ポイント・ランキング情報</li>
            <li><span className="font-bold text-gray-900">アクセス情報：</span>IPアドレス、ブラウザ種類、アクセス日時</li>
            <li><span className="font-bold text-gray-900">Cookie情報：</span>認証セッション維持に使用するCookie</li>
          </ul>
        </Section>

        <Section num="3" title="情報の利用目的">
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>ユーザー認証およびアカウント管理</li>
            <li>本サービスの提供・運営・改善</li>
            <li>投票・コメント・ランキング等のサービス機能の実現</li>
            <li>予想大会の景品発送（入賞者のみ）</li>
            <li>お問い合わせへの対応</li>
            <li>利用状況の統計分析（個人を特定しない形式）</li>
          </ul>
        </Section>

        <Section num="4" title="第三者提供">
          <p className="mb-2">運営者は、以下の場合を除き個人情報を第三者に提供しません。</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>ユーザー本人の同意がある場合</li>
            <li>法令に基づき開示が必要な場合</li>
            <li>人の生命・身体・財産の保護のために必要な場合</li>
          </ul>
        </Section>

        <Section num="5" title="外部サービスの利用">
          <p className="mb-2">本サービスでは以下の外部サービスを利用しています。</p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-700"><span className="font-bold">Supabase</span>（認証・データベース）</p>
            <p className="text-xs text-gray-700"><span className="font-bold">Vercel</span>（ホスティング）</p>
            <p className="text-xs text-gray-700"><span className="font-bold">Resend</span>（メール配信）</p>
          </div>
        </Section>

        <Section num="6" title="Cookieの使用">
          <p>ログインセッション維持のためにCookieを使用します。Cookieを無効にした場合、ログイン等の一部機能がご利用いただけなくなる場合があります。</p>
        </Section>

        <Section num="7" title="データの安全管理">
          <p>個人情報はSupabase（AWSインフラ上）に暗号化して保管されます。パスワードはハッシュ化して保存され、運営者も閲覧できません。</p>
        </Section>

        <Section num="8" title="ユーザーの権利">
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li><span className="font-bold text-gray-900">情報の確認：</span>個人情報の開示を求めることができます</li>
            <li><span className="font-bold text-gray-900">情報の訂正：</span>プロフィール設定から表示名等を変更できます</li>
            <li><span className="font-bold text-gray-900">アカウント削除：</span>お問い合わせからアカウント削除を依頼できます</li>
          </ul>
        </Section>

        <Section num="9" title="免責事項">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 leading-relaxed">本サービスで提供される情報の正確性・完全性を保証するものではありません。馬券の購入は自己責任でお願いいたします。</p>
          </div>
        </Section>

        <Section num="10" title="本ポリシーの変更">
          <p>必要に応じて本ポリシーを変更することがあります。重要な変更がある場合はサイト上でお知らせします。</p>
        </Section>

        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">制定日：2026年2月13日</p>
        </div>
      </div>
    </div>
  );
}
