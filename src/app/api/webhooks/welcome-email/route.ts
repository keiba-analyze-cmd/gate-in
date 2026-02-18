import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", user_id)
    .maybeSingle();

  const { data: { user } } = await admin.auth.admin.getUserById(user_id);

  if (!user?.email) {
    return NextResponse.json({ error: "no email" }, { status: 400 });
  }

  const displayName = profile?.display_name || "ユーザー";
  const { subject, html } = welcomeEmail(displayName);
  const result = await sendEmail(user.email, subject, html);

  return NextResponse.json(result);
}
