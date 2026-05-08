import { createClient } from "@/lib/supabase/server";
import RankingsClient from "./RankingsClient";

export default async function RankingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <RankingsClient currentUserId={user?.id ?? ""} />;
}
