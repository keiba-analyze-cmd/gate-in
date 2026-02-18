// src/app/(main)/dojo/stage/[courseId]/[stageId]/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuizQuestions } from "@/lib/microcms";
import { COURSE_DB, STAGE_DEFINITIONS } from "@/lib/constants/dojo";
import StageQuizClient from "./StageQuizClient";

type Props = {
  params: Promise<{ courseId: string; stageId: string }>;
};

export default async function StageQuizPage({ params }: Props) {
  const { courseId, stageId: stageIdStr } = await params;
  const stageId = parseInt(stageIdStr, 10);

  // バリデーション
  const course = COURSE_DB[courseId];
  if (!course) notFound();

  const stageDef = STAGE_DEFINITIONS.find((s) => s.id === stageId);
  if (!stageDef) notFound();

  // 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ステージ解放チェック：前のステージがクリア済みか
  if (stageId > 1) {
    const { data: prevProgress } = await supabase
      .from("dojo_progress")
      .select("stars")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("stage_id", stageId - 1)
      .single();

    if (!prevProgress || prevProgress.stars === 0) {
      // 未解放 → 道場TOPに戻す
      redirect("/dojo");
    }
  }

  // 既存の進捗を取得
  const { data: existingProgress } = await supabase
    .from("dojo_progress")
    .select("stars, best_score, attempts")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("stage_id", stageId)
    .single();

  // microCMSからクイズ問題を取得
  // ステージごとに問題数分をランダム取得
  const questionsData = await getQuizQuestions({ limit: 100 });
  const allQuestions = questionsData.contents.map((q) => ({
    id: q.id,
    question: q.question,
    options: [q.choice1, q.choice2, q.choice3, q.choice4].filter(
      Boolean
    ) as string[],
    correctIndex: q.correctIndex - 1, // microCMSは1始まり→0始まりに変換
    explanation: q.explanation || "",
  }));

  // ランダムにステージの問題数分を抽出
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  const questions = shuffled.slice(0, stageDef.questions);

  return (
    <StageQuizClient
      userId={user.id}
      courseId={courseId}
      courseName={course.name}
      courseEmoji={course.emoji}
      stageId={stageId}
      stageTopic={stageDef.topic}
      totalQuestions={stageDef.questions}
      questions={questions}
      bestScore={existingProgress?.best_score ?? 0}
      bestStars={existingProgress?.stars ?? 0}
      attempts={existingProgress?.attempts ?? 0}
    />
  );
}
