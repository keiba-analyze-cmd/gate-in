import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: latestJRDB } = await supabase.from("jrdb_race_entries")
    .select("race_date").order("race_date", { ascending: false }).limit(1);
  const { data: latestPred } = await supabase.from("ai_predictions")
    .select("created_at").order("created_at", { ascending: false }).limit(1);

  const today = new Date().toISOString().split("T")[0];
  const shortDate = today.replace(/-/g, "").substring(2);

  return NextResponse.json({
    latest_jrdb_date: latestJRDB?.[0]?.race_date || "none",
    latest_prediction: latestPred?.[0]?.created_at || "none",
    commands: {
      download: "node src/lib/jrdb/weekly-pipeline.js download " + shortDate,
      predict: "node src/lib/jrdb/weekly-pipeline.js predict " + shortDate,
      results: "node src/lib/jrdb/weekly-pipeline.js results " + shortDate,
    }
  });
}
