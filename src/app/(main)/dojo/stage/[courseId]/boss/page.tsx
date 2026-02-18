// src/app/(main)/dojo/stage/[courseId]/boss/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuizQuestions } from "@/lib/microcms";
import { COURSE_MAP, STAGE_COUNT, BOSS_QUESTIONS } from "@/lib/constants/dojo";
import BossQuizClient from "./BossQuizClient";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function BossQuizPage({ params }: Props) {
  const { courseId } = await params;

  // バリデーション
  const course = COURSE_MAP[courseId];
  if (!course) notFound();

  // 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 全ステージクリア済みかチェック
  const { data: progressRows } = await supabase
    .from("dojo_progress")
    .select("stage_id, stars")
    .eq("user_id", user.id)
    .eq("course_id", courseId);

  const clearedStages = (progressRows ?? []).filter((r) => r.stars > 0).length;
  if (clearedStages < STAGE_COUNT) {
    redirect("/dojo");
  }

  // 既存のBOSS進捗を取得
  const { data: bossProgress } = await supabase
    .from("dojo_boss")
    .select("best_score, cleared, attempts")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single();

  // microCMSからコースのクイズを取得 → ランダム20問
  const questionsData = await getQuizQuestions({ courseId, limit: 100 });

  let allQuestions = questionsData.contents.map((q) => ({
    id: q.id,
    question: q.question,
    options: [q.choice1, q.choice2, q.choice3, q.choice4].filter(
      Boolean
    ) as string[],
    correctIndex: q.correctIndex - 1,
    explanation: q.explanation || "",
  }));

  // フォールバック
  if (allQuestions.length === 0) {
    const fallback = await getQuizQuestions({ limit: 100 });
    allQuestions = fallback.contents.map((q) => ({
      id: q.id,
      question: q.question,
      options: [q.choice1, q.choice2, q.choice3, q.choice4].filter(
        Boolean
      ) as string[],
      correctIndex: q.correctIndex - 1,
      explanation: q.explanation || "",
    }));
  }

  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  const questions = shuffled.slice(0, BOSS_QUESTIONS);

  return (
    <BossQuizClient
      userId={user.id}
      courseId={courseId}
      courseName={course.name}
      courseEmoji={course.emoji}
      questions={questions}
      totalQuestions={BOSS_QUESTIONS}
      bestScore={bossProgress?.best_score ?? 0}
      cleared={bossProgress?.cleared ?? false}
      attempts={bossProgress?.attempts ?? 0}
    />
  );
}
