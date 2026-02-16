#!/bin/bash
set -e

echo "========================================="
echo "  ゲートイン！ SEO Phase 1 Setup"
echo "========================================="

# ── バックアップ ──
BACKUP_DIR="backups/seo-phase1-backup-$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp src/app/\(main\)/dojo/articles/\[articleId\]/page.tsx "$BACKUP_DIR/article-detail-page.tsx" 2>/dev/null || true
cp src/app/\(main\)/dojo/articles/page.tsx "$BACKUP_DIR/articles-list-page.tsx" 2>/dev/null || true
cp src/app/\(main\)/dojo/page.tsx "$BACKUP_DIR/dojo-page.tsx" 2>/dev/null || true
cp src/app/sitemap.ts "$BACKUP_DIR/sitemap.ts" 2>/dev/null || true
cp src/app/robots.ts "$BACKUP_DIR/robots.ts" 2>/dev/null || true
cp src/app/layout.tsx "$BACKUP_DIR/layout.tsx" 2>/dev/null || true

echo "✅ バックアップ完了: $BACKUP_DIR"

# ── 新規ディレクトリ作成 ──
mkdir -p src/app/\(main\)/about

echo ""
echo "── Step 1: Breadcrumbs コンポーネント作成 ──"
cat > src/components/seo/Breadcrumbs.tsx << 'BREADCRUMBS_EOF'
import Link from "next/link";
import JsonLd from "./JsonLd";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: `https://gate-in.jp${item.href}` } : {}),
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <nav aria-label="パンくずリスト" className="text-xs text-gray-500 mb-3">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-1">/</span>}
              {item.href ? (
                <Link href={item.href} className="text-blue-600 hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span className="text-gray-700">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
BREADCRUMBS_EOF
echo "✅ Breadcrumbs.tsx 作成完了"

echo ""
echo "── Step 2: 記事詳細ページ（認証解除 + SEO強化）──"
cat > src/app/\(main\)/dojo/articles/\[articleId\]/page.tsx << 'ARTICLE_DETAIL_EOF'
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ArticleDetailClient from "./ArticleDetailClient";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { getArticleById, getQuizCategories } from "@/lib/microcms";

type Props = {
  params: Promise<{ articleId: string }>;
};

// ★ HTMLタグ除去ヘルパー
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// ★ 動的メタデータ生成（SEO最重要）
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { articleId } = await params;
  try {
    const article = await getArticleById(articleId);
    const title = article.title;
    const description =
      article.excerpt || stripHtml(article.content).substring(0, 120) + "…";
    const ogImage = article.thumbnail?.url || "/api/og?title=" + encodeURIComponent(article.title);

    return {
      title,
      description,
      openGraph: {
        title: `${title}｜ゲートイン！`,
        description,
        type: "article",
        url: `https://gate-in.jp/dojo/articles/${articleId}`,
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
        siteName: "ゲートイン！",
        locale: "ja_JP",
      },
      twitter: {
        card: "summary_large_image",
        title: `${title}｜ゲートイン！`,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: `https://gate-in.jp/dojo/articles/${articleId}`,
      },
    };
  } catch {
    return {
      title: "記事",
      description: "競馬の知識を楽しく学べるメディア「ゲートイン！」の記事です。",
    };
  }
}

// ★ 認証チェックを削除 → Googleクローラーが記事を読めるようになる
export default async function ArticleDetailPage({ params }: Props) {
  const { articleId } = await params;

  let article;
  try {
    article = await getArticleById(articleId);
  } catch {
    notFound();
  }
  if (!article) notFound();

  // クイズカテゴリとの照合
  const quizCategories = await getQuizCategories();
  const quizCategoryIds = new Set(quizCategories.map((c) => c.id));
  const categoryId = article.category?.id || "";
  const hasMatchingQuiz = quizCategoryIds.has(categoryId);

  // パンくずリスト
  const breadcrumbItems = [
    { name: "ホーム", href: "/" },
    { name: "道場", href: "/dojo" },
    ...(article.category
      ? [{ name: article.category.name, href: `/dojo/articles?category=${categoryId}` }]
      : []),
    { name: article.title },
  ];

  // Article 構造化データ
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt || stripHtml(article.content).substring(0, 160),
    image: article.thumbnail?.url || "https://gate-in.jp/icon.png",
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: "ゲートイン！",
      url: "https://gate-in.jp",
    },
    publisher: {
      "@type": "Organization",
      name: "ゲートイン！",
      url: "https://gate-in.jp",
      logo: { "@type": "ImageObject", url: "https://gate-in.jp/icon.png" },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://gate-in.jp/dojo/articles/${articleId}`,
    },
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <div className="max-w-2xl mx-auto mb-3">
        <Breadcrumbs items={breadcrumbItems} />
      </div>
      <ArticleDetailClient
          articleId={article.id}
          title={article.title}
          emoji={article.emoji || "📖"}
          categoryId={categoryId}
          categoryName={article.category?.name || ""}
          categoryIcon={article.category?.icon || ""}
          readTime={article.readTime || 5}
          content={article.content}
          hasQuiz={hasMatchingQuiz}
          quizCategoryId={hasMatchingQuiz ? categoryId : undefined}
          tags={article.tags?.map((t) => t.name) || []}
          publishedAt={article.publishedAt || article.createdAt}
        />
    </>
  );
}
ARTICLE_DETAIL_EOF
echo "✅ 記事詳細ページ更新完了（認証解除 + generateMetadata + JSON-LD + パンくず）"

echo ""
echo "── Step 3: 記事一覧ページ（認証解除 + メタデータ）──"
cat > src/app/\(main\)/dojo/articles/page.tsx << 'ARTICLES_LIST_EOF'
import { Metadata } from "next";
import ArticlesListClient from "./ArticlesListClient";

export const metadata: Metadata = {
  title: "記事一覧 | 競馬道場",
  description:
    "競馬の血統入門、コース攻略、騎手データ分析など、競馬の知識を深める記事を一覧で紹介。初心者から上級者まで役立つ情報が見つかります。",
  alternates: {
    canonical: "https://gate-in.jp/dojo/articles",
  },
};

// ★ 認証チェックを削除 → 記事一覧もクローラーがアクセス可能に
export default function ArticlesPage() {
  return <ArticlesListClient />;
}
ARTICLES_LIST_EOF
echo "✅ 記事一覧ページ更新完了（認証解除 + メタデータ）"

echo ""
echo "── Step 4: 道場トップページ（認証解除 + メタデータ）──"
cat > src/app/\(main\)/dojo/page.tsx << 'DOJO_PAGE_EOF'
import { Metadata } from "next";
import DojoClient from "./DojoClient";
import {
  getQuizCategories,
  getArticles,
  getArticleCategories,
  getQuizQuestions,
} from "@/lib/microcms";

export const metadata: Metadata = {
  title: "競馬道場 | クイズで学ぶ競馬知識",
  description:
    "競馬の血統・コース攻略・騎手・調教の知識をカテゴリ別に学べる競馬道場。クイズで理解度をチェックしながら、競馬の実力を磨きましょう。",
  alternates: {
    canonical: "https://gate-in.jp/dojo",
  },
};

// ★ 認証チェックを削除 → 道場コンテンツもクローラーがアクセス可能に
// ★ ユーザーIDはオプショナルに（未ログインでも閲覧可能）
export default async function DojoPage() {
  // MicroCMSからデータ取得（並列実行、個別にエラーハンドリング）
  const [quizCategories, articlesData, articleCategories] = await Promise.all([
    getQuizCategories().catch(() => []),
    getArticles({ limit: 100 }).catch(() => ({
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    })),
    getArticleCategories().catch(() => []),
  ]);

  // 各クイズカテゴリの問題数を取得
  const safeQuizCategories = Array.isArray(quizCategories)
    ? quizCategories
    : [];
  const categoriesWithCount = await Promise.all(
    safeQuizCategories.map(async (cat) => {
      const questions = await getQuizQuestions({
        categoryId: cat.id,
        limit: 0,
      });
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description || "",
        color: cat.color || "",
        order: cat.order || 0,
        questionCount: questions.totalCount,
      };
    })
  );

  // クイズカテゴリのIDセット
  const quizCategoryIds = new Set(safeQuizCategories.map((c) => c.id));

  // 記事データをシリアライズ
  const articles = articlesData.contents.map((article) => {
    const categoryId = article.category?.id || "";
    const hasMatchingQuiz = quizCategoryIds.has(categoryId);
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      emoji: article.emoji || "📖",
      excerpt: article.excerpt || "",
      readTime: article.readTime || 5,
      categoryId,
      categoryName: article.category?.name || "",
      categoryIcon: article.category?.icon || "",
      hasQuiz: hasMatchingQuiz,
    };
  });

  // 記事カテゴリをシリアライズ
  const artCategories = (
    Array.isArray(articleCategories) ? articleCategories : []
  ).map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon || "",
    order: cat.order || 0,
  }));

  return (
    <DojoClient
      userId=""
      quizCategories={categoriesWithCount}
      articles={articles}
      articleCategories={artCategories}
    />
  );
}
DOJO_PAGE_EOF
echo "✅ 道場トップページ更新完了（認証解除 + メタデータ）"

echo ""
echo "── Step 5: サイトマップ更新（道場コンテンツ追加）──"
cat > src/app/sitemap.ts << 'SITEMAP_EOF'
import { createAdminClient } from "@/lib/admin";
import { getArticles, getQuizCategories } from "@/lib/microcms";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://gate-in.jp";
  const admin = createAdminClient();

  // ── レースページ ──
  const { data: races } = await admin
    .from("races")
    .select("id, race_date")
    .order("race_date", { ascending: false })
    .limit(200);

  const raceEntries = (races ?? []).map((race) => ({
    url: `${baseUrl}/races/${race.id}`,
    lastModified: new Date(race.race_date),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // ── 道場：記事ページ ──
  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await getArticles({ limit: 100 });
    articleEntries = articles.contents.map((article) => ({
      url: `${baseUrl}/dojo/articles/${article.id}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error("Sitemap: 記事取得エラー", e);
  }

  // ── 道場：クイズカテゴリページ ──
  let quizEntries: MetadataRoute.Sitemap = [];
  try {
    const categories = await getQuizCategories();
    quizEntries = categories.map((cat) => ({
      url: `${baseUrl}/dojo/quiz/${cat.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error("Sitemap: クイズカテゴリ取得エラー", e);
  }

  return [
    // 固定ページ
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/races`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/dojo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/dojo/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/contest`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/legal`, changeFrequency: "monthly", priority: 0.3 },
    // 動的ページ
    ...raceEntries,
    ...articleEntries,
    ...quizEntries,
  ];
}
SITEMAP_EOF
echo "✅ サイトマップ更新完了（道場記事 + クイズカテゴリ追加）"

echo ""
echo "── Step 6: robots.ts 更新 ──"
cat > src/app/robots.ts << 'ROBOTS_EOF'
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/mypage/",
          "/auth/",
          "/login",
          "/settings",
          "/onboarding",
        ],
      },
    ],
    sitemap: "https://gate-in.jp/sitemap.xml",
  };
}
ROBOTS_EOF
echo "✅ robots.ts 更新完了（disallow追加）"

echo ""
echo "── Step 7: 運営者情報ページ作成 ──"
cat > src/app/\(main\)/about/page.tsx << 'ABOUT_EOF'
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
ABOUT_EOF
echo "✅ 運営者情報ページ作成完了"

echo ""
echo "── Step 8: ルートレイアウトのメタデータ微修正 ──"
# descriptionに道場の要素を追加し、SEO的に強化
sed -i '' 's|description: "みんなの予想で腕試し！本命・対抗・危険馬を予想してポイントを稼ごう。月間ランキング上位者にはAmazonギフト券をプレゼント！"|description: "競馬予想SNS\&競馬学習プラットフォーム。本命・対抗・危険馬を予想してポイントを稼ごう！血統やコース攻略などの知識もクイズで楽しく学べる。"|' src/app/layout.tsx
echo "✅ ルートレイアウト description 更新完了"

echo ""
echo "========================================="
echo "  ✅ SEO Phase 1 Setup 完了！"
echo "========================================="
echo ""
echo "変更内容:"
echo "  📝 修正: 記事詳細ページ（認証解除 + generateMetadata + JSON-LD + パンくず）"
echo "  📝 修正: 記事一覧ページ（認証解除 + メタデータ）"
echo "  📝 修正: 道場トップ（認証解除 + メタデータ）"
echo "  📝 修正: sitemap.ts（道場記事 + クイズカテゴリ追加）"
echo "  📝 修正: robots.ts（disallow追加）"
echo "  📝 修正: layout.tsx（description更新）"
echo "  🆕 作成: Breadcrumbs.tsx（パンくず + 構造化データ）"
echo "  🆕 作成: about/page.tsx（運営者情報ページ）"
echo ""
echo "⚠️  TODO:"
echo "  1. about/page.tsx の【運営者名を記入】を実際の情報に変更"
echo "  2. DojoClientコンポーネントがuserId=''を受け入れるか確認"
echo "     （受け入れない場合はuserIdプロップをオプショナルに変更）"
echo "  3. npm run build でビルドエラーがないか確認"
echo "  4. Google Search Console にサイトマップを送信"
echo ""
echo "バックアップ先: $BACKUP_DIR"
