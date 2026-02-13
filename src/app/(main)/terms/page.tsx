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
