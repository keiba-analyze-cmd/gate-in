import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { settleRace } from "@/lib/services/settle-race";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const body = await request.json().catch(() => ({}));
  const { race_date, race_id } = body;

  let query = admin
    .from("races")
    .select("id, name")
    .eq("status", "voting_open")
    .not("external_id", "is", null);

  if (race_id) {
    query = query.eq("id", race_id);
  } else if (race_date) {
    query = query.eq("race_date", race_date);
  }

  const { data: races, error } = await query.limit(50);

  if (error || !races) {
    return NextResponse.json({ error: "Failed to fetch races" }, { status: 500 });
  }

  const results = [];
  for (const race of races) {
    try {
      const result = await settleRace(admin, race.id);
      results.push({ race_id: race.id, name: race.name, ...result });
    } catch (err: any) {
      results.push({ race_id: race.id, name: race.name, error: err.message });
    }
  }

  return NextResponse.json({
    message: `${results.length}レースを精算`,
    results,
  });
}
