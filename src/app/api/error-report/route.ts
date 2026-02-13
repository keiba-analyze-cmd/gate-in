import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // サーバーログに出力（Vercel Logsで閲覧可能）
    console.error("[CLIENT_ERROR]", {
      message: body.message,
      stack: body.stack,
      page: body.page,
      userAgent: body.userAgent,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
