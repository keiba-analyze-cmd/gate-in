import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { contestReminderEmail } from "@/lib/email/templates";

/**
 * 大会リマインダーメール（日曜朝）
 * 毎週日曜 8:00 JST = "0 23 * * 6" UTC (土曜23:00 UTC)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 現在開催中の大会を取得
  const { data: contest } = await admin
    .from("contests")
    .select("id, name")
    .eq("type", "weekly")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!contest) {
    return NextResponse.json({ message: "No active contest", sent: 0 });
  }

  // 大会エントリー情報を取得
  const { data: entries } = await admin
    .from("contest_entries")
    .select("user_id, vote_count, total_points, is_eligible");

  const entryMap = new Map(
    (entries ?? []).map((e) => [e.user_id, e])
  );

  // ランキング計算（eligible のみ）
  const eligibleEntries = (entries ?? [])
    .filter((e) => e.is_eligible)
    .sort((a, b) => b.total_points - a.total_points);
  
  const rankMap = new Map<string, number>();
  eligibleEntries.forEach((e, i) => {
    rankMap.set(e.user_id, i + 1);
  });

  // メール配信対象ユーザー取得
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
    const entry = entryMap.get(user.id);
    const currentRank = rankMap.get(user.id);

    const { subject, html } = contestReminderEmail(
      displayName,
      contest.name,
      currentRank,
      entry?.total_points,
      entry?.vote_count
    );

    await sendEmail(user.email, subject, html);
    sent++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({ 
    sent, 
    skipped, 
    contest: contest.name,
    participants: eligibleEntries.length 
  });
}
