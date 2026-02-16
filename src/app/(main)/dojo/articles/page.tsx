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
