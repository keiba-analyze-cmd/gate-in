import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ArticlesListClient from "./ArticlesListClient";

export default async function ArticlesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ArticlesListClient />;
}
