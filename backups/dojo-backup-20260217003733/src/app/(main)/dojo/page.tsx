import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DojoClient from "./DojoClient";

export default async function DojoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ユーザーのクイズ成績を取得（将来用）
  // const { data: quizResults } = await supabase
  //   .from("quiz_results")
  //   .select("*")
  //   .eq("user_id", user.id);

  return <DojoClient userId={user.id} />;
}
