// src/app/(main)/dojo/daily/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRandomQuizQuestions } from "@/lib/microcms";
import DailyQuizClient from "./DailyQuizClient";

const DAILY_QUESTION_COUNT = 5;

export default async function DailyQuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // 今日すでに完了済みかチェック
  const { data: todayRecord } = await supabase
    .from("dojo_daily")
    .select("score, completed")
    .eq("user_id", user.id)
    .eq("challenge_date", today)
    .single();

  // ストリーク計算（過去30日分取得）
  const { data: dailyHistory } = await supabase
    .from("dojo_daily")
    .select("challenge_date, completed")
    .eq("user_id", user.id)
    .order("challenge_date", { ascending: false })
    .limit(30);

  let streak = 0;
  if (dailyHistory && dailyHistory.length > 0) {
    const date = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = date.toISOString().split("T")[0];
      const found = dailyHistory.find(
        (d) => d.challenge_date === dateStr && d.completed
      );
      if (found) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        // 今日未完了なら昨日からカウント開始
        if (i === 0 && !todayRecord?.completed) {
          date.setDate(date.getDate() - 1);
          continue;
        }
        break;
      }
    }
  }

  // microCMSからランダム5問取得
  const questions = await getRandomQuizQuestions(DAILY_QUESTION_COUNT);
  const formattedQuestions = questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: [q.choice1, q.choice2, q.choice3, q.choice4].filter(
      Boolean
    ) as string[],
    correctIndex: q.correctIndex - 1,
    explanation: q.explanation || "",
    category: q.category?.name || "競馬",
  }));

  return (
    <DailyQuizClient
      userId={user.id}
      questions={formattedQuestions}
      alreadyCompleted={todayRecord?.completed ?? false}
      previousScore={todayRecord?.score ?? 0}
      streak={streak}
    />
  );
}
