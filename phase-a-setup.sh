#!/bin/bash
# ============================================================
# ゲートイン！ Phase A セットアップスクリプト
# gate-in フォルダのルートで実行:
#   bash phase-a-setup.sh
# ============================================================

set -e
echo "🔒 Phase A: セキュリティ & 法務基盤セットアップ開始..."

# =====================
# 1. ルートの不要ファイル削除（前回誤配置分）
# =====================
echo ""
echo "🧹 ルートの不要ファイルを削除..."
rm -f ./admin.js ./Footer.jsx ./Header.jsx ./layout.jsx ./page.jsx
rm -rf ./mnt
echo "  ✅ 完了"

# =====================
# 2. 管理者ヘルパー (src/lib/admin.ts)
# =====================
echo ""
echo "🔑 管理者ヘルパー作成..."

cat > src/lib/admin.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Service Role クライアント（RLSバイパス）
 * サーバーサイド専用
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * 管理者チェック — 非管理者は403
 */
export async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Response(JSON.stringify({ error: "認証が必要です" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, display_name, is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new Response(JSON.stringify({ error: "管理者権限が必要です" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { user, profile, isAdmin: true };
}

/**
 * ログインユーザー取得（管理者でなくてもOK）
 */
export async function requireAuth() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response(JSON.stringify({ error: "ログインが必要です" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { user, supabase };
}
EOF
echo "  ✅ src/lib/admin.ts"

# =====================
# 3. 利用規約ページ
# =====================
echo ""
echo "📄 法務ページ作成..."

mkdir -p "src/app/(main)/terms"
cat > "src/app/(main)/terms/page.tsx" << 'EOF'
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "利用規約" };

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

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-center text-white mb-6">
        <h1 className="text-xl font-black mb-1">📋 利用規約</h1>
        <p className="text-green-200 text-xs">TERMS OF SERVICE</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-gray-50 rounded-lg">
          <span className="text-xs">📅</span>
          <span className="text-xs text-gray-500">最終更新日：2026年2月13日</span>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            本利用規約（以下「本規約」）は、ゲートイン！運営（以下「運営者」）が提供するウェブサービス「ゲートイン！」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に同意いただいた上で本サービスをご利用いただきます。
          </p>
        </div>

        <Section num="1" title="適用">
          <p>本規約は、ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されます。</p>
        </Section>

        <Section num="2" title="サービスの内容">
          <p>本サービスは、競馬レースの結果を予想し、その的中率をポイントとして記録・ランキング化するエンターテインメントサービスです。本サービスで扱う「ゲートP（ポイント）」は仮想的なものであり、金銭的価値を有するものではありません。</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
            <p className="text-xs text-red-800">⚠️ 本サービスは馬券の購入を代行・推奨するものではありません。実際の馬券購入は、ご自身の判断と責任において行ってください。</p>
          </div>
        </Section>

        <Section num="3" title="アカウント登録">
          <p>本サービスの一部機能を利用するためには、アカウント登録が必要です。登録時にはメールアドレスまたはGoogleアカウント等のソーシャルアカウントを使用します。ユーザーは正確な情報を登録するものとし、アカウントの管理はご本人の責任において行ってください。</p>
        </Section>

        <Section num="4" title="禁止事項">
          <p className="mb-2">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>運営者のサーバーまたはネットワークの機能を破壊・妨害する行為</li>
            <li>他のユーザーに対する嫌がらせ、誹謗中傷、差別的発言</li>
            <li>不正なアクセスまたは不正なアカウント操作</li>
            <li>複数アカウントの作成によるランキング操作</li>
            <li>自動化ツール（BOT等）を使用した操作</li>
            <li>スクレイピングなど本サービスのデータを無断で収集する行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </Section>

        <Section num="5" title="コメント・投稿に関するルール">
          <p>ユーザーが投稿したコメントの著作権はユーザーに帰属しますが、運営者は本サービスの運営・改善・宣伝等の目的で投稿内容を無償で使用できるものとします。禁止事項に該当する投稿は事前の通知なく削除できるものとします。</p>
        </Section>

        <Section num="6" title="ポイント・ランキングについて">
          <p>ゲートPおよびランキングはエンターテインメント目的で提供されるものです。ポイントの換金・譲渡・売買はできません。ポイント計算方法やランキングルールは予告なく変更できるものとします。システム障害等によりデータが消失した場合、復旧義務を負いません。</p>
        </Section>

        <Section num="7" title="予想大会・景品について">
          <p>予想大会の景品は運営者の裁量により内容・数量が決定されます。景品の発送は日本国内に限ります。不正な手段によりランキングを操作した場合、入賞を取り消すことがあります。</p>
        </Section>

        <Section num="8" title="サービスの変更・停止">
          <p className="mb-2">運営者は以下の場合にはユーザーに事前通知なく、本サービスの全部または一部の提供を停止・中断・変更できるものとします。</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>サーバー等のメンテナンスを行う場合</li>
            <li>天災、事変等の不可抗力による場合</li>
            <li>その他、運営者が停止・中断を必要と判断した場合</li>
          </ul>
        </Section>

        <Section num="9" title="免責事項">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              本サービスで提供される予想情報・レースデータ等は情報提供を目的としたものであり、馬券購入を推奨するものではありません。馬券の購入はご自身の判断と責任で行ってください。本サービスの利用によりユーザーに生じた損害について、運営者は一切の責任を負いません。
            </p>
          </div>
        </Section>

        <Section num="10" title="アカウントの停止・削除">
          <p>運営者は、ユーザーが本規約に違反した場合、事前の通知なくアカウントの停止または削除を行うことができます。削除後のデータの復旧には対応できません。</p>
        </Section>

        <Section num="11" title="本規約の変更">
          <p>運営者は必要と判断した場合には本規約を変更することがあります。変更後は本ページに掲載した時点から効力を生じ、利用を継続した場合は変更後の規約に同意したものとみなします。</p>
        </Section>

        <Section num="12" title="準拠法・管轄裁判所">
          <p>本規約の解釈にあたっては日本法を準拠法とします。紛争が生じた場合には東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
        </Section>

        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">制定日：2026年2月13日</p>
        </div>
      </div>
    </div>
  );
}
EOF
echo "  ✅ src/app/(main)/terms/page.tsx"

# =====================
# 4. プライバシーポリシー
# =====================
mkdir -p "src/app/(main)/privacy"
cat > "src/app/(main)/privacy/page.tsx" << 'EOF'
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
EOF
echo "  ✅ src/app/(main)/privacy/page.tsx"

# =====================
# 5. 特定商取引法に基づく表記
# =====================
mkdir -p "src/app/(main)/legal"
cat > "src/app/(main)/legal/page.tsx" << 'EOF'
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
EOF
echo "  ✅ src/app/(main)/legal/page.tsx"

# =====================
# 6. フッターコンポーネント（新規）
# =====================
echo ""
echo "🔗 フッター作成..."

cat > src/components/layout/Footer.tsx << 'EOF'
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-8 pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          <Link href="/terms" className="text-[11px] text-gray-400 hover:text-green-600 transition-colors">
            利用規約
          </Link>
          <Link href="/privacy" className="text-[11px] text-gray-400 hover:text-green-600 transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/legal" className="text-[11px] text-gray-400 hover:text-green-600 transition-colors">
            特定商取引法に基づく表記
          </Link>
        </div>
        <p className="text-center text-[10px] text-gray-300">
          © 2026 ゲートイン！ All rights reserved.
        </p>
      </div>
    </footer>
  );
}
EOF
echo "  ✅ src/components/layout/Footer.tsx"

# =====================
# 完了
# =====================
echo ""
echo "============================================"
echo "✅ Phase A セットアップ完了！"
echo "============================================"
echo ""
echo "📌 残りの手順:"
echo ""
echo "  1. Supabase SQL Editor で phase-a-security.sql を実行"
echo "     (別途ダウンロードしたSQLファイル)"
echo ""
echo "  2. Supabase で自分を管理者に設定:"
echo "     UPDATE profiles SET is_admin = true WHERE id = 'あなたのUUID';"
echo ""
echo "  3. src/app/(main)/legal/page.tsx の ●●●● を実際の情報に変更"
echo ""
echo "  4. (main) のレイアウトに Footer を追加:"
echo "     以下のコマンドで確認:"
echo "     cat 'src/app/(main)/layout.tsx'"
echo "     → import Footer from '@/components/layout/Footer';"
echo "     → {children} の後に <Footer /> を追加"
echo ""
echo "  5. デプロイ:"
echo "     git add . && git commit -m 'Phase A: セキュリティ+法務' && git push"
echo ""
