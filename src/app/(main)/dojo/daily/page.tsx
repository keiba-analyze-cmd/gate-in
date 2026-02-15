import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DailyQuizClient from "./DailyQuizClient";

export default async function DailyQuizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <DailyQuizClient userId={user.id} />;
}
