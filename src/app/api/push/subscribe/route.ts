// src/app/api/push/subscribe/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // 既存のトークンを確認（同じトークンがあれば更新、なければ挿入）
    const { error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: user.id,
          token,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,token",
        }
      );

    if (error) {
      console.error("トークン保存エラー:", error);
      return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("購読エラー:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// トークン削除（購読解除）
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();

    const { error } = await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", token);

    if (error) {
      console.error("トークン削除エラー:", error);
      return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("購読解除エラー:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
