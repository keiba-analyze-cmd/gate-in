// src/app/(main)/dojo/ranking/page.tsx
import { Metadata } from "next";
import RankingClient from "./RankingClient";

export const metadata: Metadata = {
  title: "道場ランキング | 競馬道場",
  description: "競馬道場のXPランキング。クイズ・記事・デイリーチャレンジで獲得したXPで競い合おう。",
};

export default function RankingPage() {
  return <RankingClient />;
}
