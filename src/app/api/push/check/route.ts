// src/app/api/push/check/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ subscribed: false });
    }

    const { data, error } = await supabase
      .from("push_tokens")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (error) {
      console.error("購読確認エラー:", error);
      return NextResponse.json({ subscribed: false });
    }

    return NextResponse.json({ subscribed: data && data.length > 0 });
  } catch (error) {
    console.error("購読確認エラー:", error);
    return NextResponse.json({ subscribed: false });
  }
}
