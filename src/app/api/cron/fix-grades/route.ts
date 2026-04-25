import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";

const GRADE_MAP: Record<number, string | null> = { 1: "G1", 2: "G2", 3: "G3", 4: null };

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const today = new Date();
  const from = new Date(today); from.setDate(from.getDate() - 7);
  const to = new Date(today); to.setDate(to.getDate() + 7);
  const fromD = from.toISOString().split("T")[0];
  const toD = to.toISOString().split("T")[0];

  const { data: races } = await db.from("races")
    .select("id, name, grade, race_date, course_name, race_number")
    .gte("race_date", fromD).lte("race_date", toD);
  if (!races?.length) return NextResponse.json({ fixed: 0 });

  let fixed = 0;
  const changes: string[] = [];
  for (const race of races) {
    const { data: jrdb } = await db.from("jrdb_race_entries")
      .select("grade").eq("race_date", race.race_date)
      .eq("course_name", race.course_name).eq("race_number", race.race_number).limit(1);
    if (!jrdb?.length) continue;
    const jrdbGrade = GRADE_MAP[jrdb[0].grade as number] ?? null;
    if (jrdbGrade !== (race.grade || null)) {
      const { error } = await db.from("races").update({ grade: jrdbGrade }).eq("id", race.id);
      if (!error) {
        fixed++;
        changes.push(race.race_date+" "+race.course_name+race.race_number+"R: "+(race.grade||"null")+" -> "+(jrdbGrade||"null"));
      }
    }
  }
  if (fixed > 0) {
    try {
      const { sendSlackNotification } = await import("@/lib/slack");
      await sendSlackNotification("kpi", "Grade fix: "+fixed+"\n"+changes.join("\n"));
    } catch(e) {}
  }
  return NextResponse.json({ fixed, changes });
}
