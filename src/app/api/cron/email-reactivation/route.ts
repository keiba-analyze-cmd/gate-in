import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { reactivationEmail } from "@/lib/email/templates";

/**
 * 復帰促進メール
 * 毎週水曜 12:00 JST = "0 3 * * 3" UTC
 * 2週間以上ログインしていないユーザーに送信
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 2週間前
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const cutoff = twoWeeksAgo.toISOString();

  // 最終投票が2週間以上前のユーザー
  const { data: inactiveUsers } = await admin
    .from("profiles")
    .select("id, display_name, email_notifications, last_vote_at")
    .or(`last_vote_at.lt.${cutoff},last_vote_at.is.null`)
    .limit(200);

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (users?.users ?? []).map((u) => [u.id, u.email])
  );

  let sent = 0;
  let skipped = 0;

  for (const profile of inactiveUsers ?? []) {
    if (profile.email_notifications === false) { skipped++; continue; }

    const email = emailMap.get(profile.id);
    if (!email) { skipped++; continue; }

    const { subject, html } = reactivationEmail(profile.display_name || "ユーザー");
    await sendEmail(email, subject, html);
    sent++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return NextResponse.json({ sent, skipped });
}
