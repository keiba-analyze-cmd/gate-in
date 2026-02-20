import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { sendInquiryNotification } from "@/lib/slack";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // レート制限（未ログインはIP、ログイン済みはuser_id）
  const key = user ? `contact:${user.id}` : `contact:anon`;
  const rl = rateLimit(key, { limit: 5, windowMs: 3600_000 }); // 1時間5件
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();

  // バリデーション
  if (!body.name?.trim() || body.name.length > 50) {
    return NextResponse.json({ error: "お名前は50文字以内で入力してください" }, { status: 400 });
  }
  if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
  }
  if (!body.subject?.trim() || body.subject.length > 100) {
    return NextResponse.json({ error: "件名は100文字以内で入力してください" }, { status: 400 });
  }
  if (!body.body?.trim() || body.body.length > 2000) {
    return NextResponse.json({ error: "内容は2000文字以内で入力してください" }, { status: 400 });
  }

  const { error } = await supabase.from("contact_inquiries").insert({
    user_id: user?.id ?? null,
    name: body.name.trim(),
    email: body.email.trim(),
    category: body.category ?? "general",
    subject: body.subject.trim(),
    body: body.body.trim(),
  });

  if (error) {
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }

  // Slack通知
  await sendInquiryNotification({
    email: body.email.trim(),
    category: body.category ?? "general",
    content: `【${body.subject.trim()}】\n${body.body.trim()}`,
  });

  return NextResponse.json({ success: true });
}
