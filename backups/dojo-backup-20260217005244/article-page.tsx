import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ArticleDetailClient from "./ArticleDetailClient";

const ARTICLES: Record<string, { title: string; category: string; readTime: number; content: string; relatedQuiz?: string }> = {
  "1": {
    title: "初心者必見！競馬の基本ルール",
    category: "入門",
    readTime: 5,
    relatedQuiz: "basics",
    content: `
## 競馬とは

競馬は、騎手が馬に騎乗してレースを行い、その着順を競うスポーツです。日本では主にJRA（日本中央競馬会）と地方競馬で開催されています。

## レースの流れ

1. **パドック** - レース前に馬の状態を確認できる
2. **返し馬** - コースに入って馬を温める
3. **ゲートイン** - スタートゲートに入る
4. **スタート** - ゲートが開いてレース開始
5. **ゴール** - 先頭で決勝線を通過した馬が勝利

## 馬券の基本

馬券は100円から購入可能です。主な種類として：

- **単勝**: 1着を当てる（初心者におすすめ）
- **複勝**: 3着以内を当てる（的中しやすい）
- **馬連**: 1-2着の組み合わせを当てる
- **ワイド**: 3着以内の2頭の組み合わせを当てる

## 競馬場の種類

JRAは全国10場の競馬場を運営しています。それぞれコースの特徴が異なり、予想する上で重要なポイントになります。
    `
  },
  "2": {
    title: "馬券の種類と買い方完全ガイド",
    category: "馬券",
    readTime: 8,
    relatedQuiz: "betting",
    content: `
## 馬券の種類一覧

### 単勝・複勝（シンプル系）

| 種類 | 内容 | 的中率 | 配当 |
|------|------|--------|------|
| 単勝 | 1着を当てる | 低め | 高め |
| 複勝 | 3着以内を当てる | 高め | 低め |

### 連勝系（2頭以上の組み合わせ）

- **馬連**: 1-2着の組み合わせ（順不同）
- **馬単**: 1-2着を順番通りに当てる
- **ワイド**: 3着以内の2頭の組み合わせ

### 三連系（3頭の組み合わせ）

- **三連複**: 1-2-3着を順不同で当てる
- **三連単**: 1-2-3着を順番通りに当てる（高配当）

## 買い方のコツ

初心者は単勝・複勝から始めて、慣れてきたらワイドや馬連に挑戦するのがおすすめです。
    `
  },
};

type Props = {
  params: Promise<{ articleId: string }>;
};

export default async function ArticleDetailPage({ params }: Props) {
  const { articleId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const article = ARTICLES[articleId];
  if (!article) notFound();

  return (
    <ArticleDetailClient
      articleId={articleId}
      title={article.title}
      category={article.category}
      readTime={article.readTime}
      content={article.content}
      relatedQuiz={article.relatedQuiz}
    />
  );
}
