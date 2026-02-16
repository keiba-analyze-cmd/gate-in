import { createClient } from "microcms-js-sdk";

if (!process.env.MICROCMS_SERVICE_DOMAIN) {
  throw new Error("MICROCMS_SERVICE_DOMAIN is required");
}

if (!process.env.MICROCMS_API_KEY) {
  throw new Error("MICROCMS_API_KEY is required");
}

export const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: process.env.MICROCMS_API_KEY,
});

// ============================================
// 型定義
// ============================================

export type ArticleCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  gradient?: string;
  order?: number;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type QuizCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  color?: string;
  order?: number;
};

export type QuizQuestion = {
  id: string;
  question: string;
  choice1: string;
  choice2: string;
  choice3?: string;
  choice4?: string;
  correctIndex: number;
  explanation?: string;
  category?: QuizCategory;
  level?: string;
  order?: number;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  thumbnail?: { url: string; width: number; height: number };
  emoji?: string;
  excerpt?: string;
  content: string;
  readTime?: number;
  hasQuiz?: boolean;
  isPremium?: boolean;
  publishedAt?: string;
  category?: ArticleCategory;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
};

export type MicroCMSListResponse<T> = {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
};

// ============================================
// 記事カテゴリ
// ============================================

export async function getArticleCategories() {
  const data = await client.get<MicroCMSListResponse<ArticleCategory>>({
    endpoint: "article-categories",
    queries: { orders: "order" },
  });
  return data.contents;
}

export async function getArticleCategoryBySlug(slug: string) {
  const data = await client.get<MicroCMSListResponse<ArticleCategory>>({
    endpoint: "article-categories",
    queries: { filters: `slug[equals]${slug}` },
  });
  return data.contents[0] ?? null;
}

// ============================================
// タグ
// ============================================

export async function getTags() {
  const data = await client.get<MicroCMSListResponse<Tag>>({
    endpoint: "tags",
  });
  return data.contents;
}

// ============================================
// クイズカテゴリ
// ============================================

export async function getQuizCategories() {
  const data = await client.get<MicroCMSListResponse<QuizCategory>>({
    endpoint: "quiz-categories",
    queries: { orders: "order" },
  });
  return data.contents;
}

export async function getQuizCategoryBySlug(slug: string) {
  const data = await client.get<MicroCMSListResponse<QuizCategory>>({
    endpoint: "quiz-categories",
    queries: { filters: `slug[equals]${slug}` },
  });
  return data.contents[0] ?? null;
}

// ============================================
// クイズ問題
// ============================================

export async function getQuizQuestions(options?: {
  categoryId?: string;
  level?: string;
  limit?: number;
  offset?: number;
}) {
  const filters: string[] = [];
  if (options?.categoryId) {
    filters.push(`category[equals]${options.categoryId}`);
  }
  if (options?.level) {
    filters.push(`level[equals]${options.level}`);
  }

  const data = await client.get<MicroCMSListResponse<QuizQuestion>>({
    endpoint: "quiz-questions",
    queries: {
      filters: filters.length > 0 ? filters.join("[and]") : undefined,
      orders: "order",
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
    },
  });
  return data;
}

export async function getQuizQuestionById(id: string) {
  const data = await client.get<QuizQuestion>({
    endpoint: "quiz-questions",
    contentId: id,
  });
  return data;
}

export async function getRandomQuizQuestions(limit: number = 5) {
  const allData = await client.get<MicroCMSListResponse<QuizQuestion>>({
    endpoint: "quiz-questions",
    queries: { limit: 100 },
  });
  
  const shuffled = allData.contents.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

// ============================================
// 記事
// ============================================

export async function getArticles(options?: {
  categoryId?: string;
  tagId?: string;
  hasQuiz?: boolean;
  limit?: number;
  offset?: number;
}) {
  const filters: string[] = [];
  if (options?.categoryId) {
    filters.push(`category[equals]${options.categoryId}`);
  }
  if (options?.tagId) {
    filters.push(`tags[contains]${options.tagId}`);
  }
  if (options?.hasQuiz !== undefined) {
    filters.push(`hasQuiz[equals]${options.hasQuiz}`);
  }

  const data = await client.get<MicroCMSListResponse<Article>>({
    endpoint: "articles",
    queries: {
      filters: filters.length > 0 ? filters.join("[and]") : undefined,
      orders: "-publishedAt",
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
    },
  });
  return data;
}

export async function getArticleBySlug(slug: string) {
  const data = await client.get<MicroCMSListResponse<Article>>({
    endpoint: "articles",
    queries: { filters: `slug[equals]${slug}` },
  });
  return data.contents[0] ?? null;
}

export async function getArticleById(id: string) {
  const data = await client.get<Article>({
    endpoint: "articles",
    contentId: id,
  });
  return data;
}
