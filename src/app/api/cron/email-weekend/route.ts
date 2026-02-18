import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { weekendRaceEmail } from "@/lib/email/templates";

/**
 * 週末レース案内メール
 * 毎週金曜 16:30 JST = "30 7 * * 5" UTC
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 今週末（土日）のレースを取得
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const sat = new Date(jst);
  sat.setDate(jst.getDate() + (6 - jst.getDay()));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const satStr = sat.toISOString().split("T")[0];
  const sunStr = sun.toISOString().split("T")[0];

  const { data: races } = await admin
    .from("races")
    .select("id, name, grade, course_name")
    .in("race_date", [satStr, sunStr])
    .eq("status", "voting_open")
    .order("race_date")
    .order("post_time");

  // 今週の大会名
  const { data: contest } = await admin
    .from("contests")
    .select("name")
    .eq("type", "weekly")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // メール配信対象ユーザー取得（メール通知OFFのユーザーを除外）
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, email_notifications");

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  let sent = 0;
  let skipped = 0;

  for (const user of users?.users ?? []) {
    if (!user.email) { skipped++; continue; }
    
    const profile = profileMap.get(user.id);
    if (profile?.email_notifications === false) { skipped++; continue; }

    const displayName = profile?.display_name || "ユーザー";
    const { subject, html } = weekendRaceEmail(
      displayName,
      (races ?? []).map((r) => ({ name: r.name, grade: r.grade, venue: r.course_name, id: r.id })),
      contest?.name
    );

    await sendEmail(user.email, subject, html);
    sent++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({ sent, skipped, races: races?.length ?? 0 });
}
