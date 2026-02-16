import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CategoryQuizClient from "./CategoryQuizClient";

const CATEGORIES: Record<string, { name: string; icon: string; description: string }> = {
  basics: { name: "競馬の基礎", icon: "📚", description: "初心者向け基本知識" },
  jockeys: { name: "騎手", icon: "🏇", description: "騎手に関する問題" },
  trainers: { name: "調教師", icon: "👨‍🏫", description: "調教師に関する問題" },
  courses: { name: "競馬場", icon: "🏟️", description: "コースの特徴など" },
  history: { name: "競馬の歴史", icon: "📜", description: "名馬・名レースの歴史" },
  betting: { name: "馬券の種類", icon: "🎫", description: "馬券の買い方と配当" },
};

type Props = {
  params: Promise<{ categoryId: string }>;
};

export default async function CategoryQuizPage({ params }: Props) {
  const { categoryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const category = CATEGORIES[categoryId];
  if (!category) notFound();

  return (
    <CategoryQuizClient
      userId={user.id}
      categoryId={categoryId}
      categoryName={category.name}
      categoryIcon={category.icon}
    />
  );
}
