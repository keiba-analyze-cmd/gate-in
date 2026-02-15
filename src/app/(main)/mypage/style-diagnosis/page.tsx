import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StyleDiagnosisClient from "./StyleDiagnosisClient";

export default async function StyleDiagnosisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  
  const { data: votes } = await supabase
    .from("votes")
    .select("id, status, earned_points, is_perfect, vote_picks(pick_type, race_entries(odds, popularity))")
    .eq("user_id", user.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  return <StyleDiagnosisClient profile={profile} votes={votes ?? []} />;
}
