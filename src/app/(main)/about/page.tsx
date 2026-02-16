import { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumbs from "@/components/seo/Breadcrumbs";

export const metadata: Metadata = {
  title: "運営者情報・ゲートイン！について",
  description:
    "競馬学習プラットフォーム「ゲートイン！」の運営者情報、サイトの目的、コンテンツポリシーについてご紹介します。",
  alternates: {
    canonical: "https://gate-in.jp/about",
  },
};

export default function AboutPage() {
  const breadcrumbItems = [
    { name: "ホーム", href: "/" },
    { name: "運営者情報" },
  ];

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ゲートイン！",
    url: "https://gate-in.jp",
    logo: "https://gate-in.jp/icon.png",
    description:
      "競馬予想SNS & 競馬の知識をクイズで楽しく学べるメディア。血統、コース特性、騎手データなどを体系的に学習できるプラットフォーム。",
  };

  return (
    <>
      <JsonLd data={orgJsonLd} />
      <div className="max-w-2xl mx-auto">
        <Breadcrumbs items={breadcrumbItems} />

        <h1 className="text-2xl font-bold mb-6">ゲートイン！について</h1>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">サイトの目的</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
            「ゲートイン！」は、競馬予想SNSと競馬学習プラットフォームを兼ね備えたサービスです。
            本命・対抗・危険馬の予想でポイントを稼ぎながら、
            血統やコース特性などの知識をクイズで楽しく身につけることができます。
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            競馬初心者の方が「何から学べばいいか分からない」と感じる壁を取り除き、
            経験者の方にも新たな発見がある——そんなプラットフォームを目指しています。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">コンテンツポリシー</h2>
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              <strong>正確性</strong>：JRA公式データ、各種公式発表など信頼性の高い一次情報を根拠としています。
            </p>
            <p>
              <strong>学習重視</strong>：馬券の購入を推奨するサイトではありません。
              競馬の知識を深め、レースをより楽しむための情報提供が目的です。
            </p>
            <p>
              <strong>定期更新</strong>：新しいデータや情報に基づき、記事の見直し・更新を定期的に行っています。
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">運営者情報</h2>
          {/* ★ TODO: 実際の情報に置き換えてください */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-5">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <td className="py-2.5 font-medium text-gray-500 w-28">サイト名</td>
                  <td className="py-2.5">ゲートイン！</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <td className="py-2.5 font-medium text-gray-500">URL</td>
                  <td className="py-2.5">https://gate-in.jp</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <td className="py-2.5 font-medium text-gray-500">運営者</td>
                  <td className="py-2.5">【運営者名を記入】</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <td className="py-2.5 font-medium text-gray-500">お問い合わせ</td>
                  <td className="py-2.5">
                    <Link href="/contact" className="text-green-600 hover:underline">
                      お問い合わせフォーム
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium text-gray-500">開設日</td>
                  <td className="py-2.5">2026年2月</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">免責事項</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            当サイトに掲載されている情報は、競馬に関する知識の提供を目的としたものであり、
            馬券の購入や投資を推奨するものではありません。
            馬券の購入は自己の判断と責任のもとで行ってください。
            当サイトの情報に基づく行動によって生じた損害について、当サイトは一切の責任を負いかねます。
          </p>
        </section>

        <div className="flex gap-3 mt-8">
          <Link
            href="/terms"
            className="text-sm text-green-600 hover:underline"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-green-600 hover:underline"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/contact"
            className="text-sm text-green-600 hover:underline"
          >
            お問い合わせ
          </Link>
        </div>
      </div>
    </>
  );
}
