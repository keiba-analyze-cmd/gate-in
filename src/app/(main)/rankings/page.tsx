export const revalidate = 120;

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RankingsClient from "./RankingsClient";

export default async function RankingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <RankingsClient currentUserId={user.id} />;
}
