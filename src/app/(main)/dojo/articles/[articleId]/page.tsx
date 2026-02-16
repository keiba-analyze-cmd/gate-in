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
