import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") ?? (new Date().getMonth() + 1).toString());
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data: races, error } = await createAdminClient().from("races")
    .select("id, name, race_date, post_time, course_name, grade, race_number, status, head_count")
    .gte("race_date", startDate).lt("race_date", endDate).order("race_date").order("race_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const grouped: Record<string, any[]> = {};
  (races ?? []).forEach((r) => { if (!grouped[r.race_date]) grouped[r.race_date] = []; grouped[r.race_date].push(r); });
  return NextResponse.json({ races: grouped, year, month });
}
