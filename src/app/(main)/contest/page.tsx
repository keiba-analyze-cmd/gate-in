import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ContestClient from "./ContestClient";

export default async function ContestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ContestClient />;
}
