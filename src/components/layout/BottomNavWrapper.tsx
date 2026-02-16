import { createClient } from "@/lib/supabase/server";
import BottomNav from "./BottomNav";

export default async function BottomNavWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 未ログイン時は表示しない
  if (!user) return null;

  return <BottomNav />;
}
