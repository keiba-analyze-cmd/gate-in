import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TimelineClient from "./TimelineClient";

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  return <TimelineClient followingCount={followingCount ?? 0} />;
}
