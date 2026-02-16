import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CategoryQuizClient from "./CategoryQuizClient";
import { getQuizQuestions } from "@/lib/microcms";

async function getQuizCategoryById(categoryId: string) {
  try {
    const res = await fetch(
      `https://${process.env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/quiz-categories/${categoryId}`,
      {
        headers: { "X-MICROCMS-API-KEY": process.env.MICROCMS_API_KEY! },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

type Props = {
  params: Promise<{ categoryId: string }>;
};

export default async function CategoryQuizPage({ params }: Props) {
  const { categoryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [category, questionsData] = await Promise.all([
    getQuizCategoryById(categoryId),
    getQuizQuestions({ categoryId, limit: 100 }),
  ]);

  if (!category) notFound();

  // クライアントに渡す形式に変換
  const questions = questionsData.contents.map((q) => ({
    id: q.id,
    question: q.question,
    options: [q.choice1, q.choice2, q.choice3, q.choice4].filter(
      Boolean
    ) as string[],
    correctIndex: q.correctIndex - 1, // MicroCMSは1始まり → 0始まりに変換
    explanation: q.explanation || "",
  }));

  return (
    <CategoryQuizClient
      userId={user.id}
      categoryId={categoryId}
      categoryName={category.name}
      categoryIcon={category.icon}
      questions={questions}
    />
  );
}
