import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // OAuthプロバイダーからのエラー
  if (error) {
    console.error("[Auth Error]", error, errorDescription);
    const message = encodeURIComponent(errorDescription ?? "認証に失敗しました");
    return NextResponse.redirect(`${origin}/login?error=${message}`);
  }

  if (code) {
    const supabase = await createClient();

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("[Auth Exchange Error]", exchangeError);
        return NextResponse.redirect(`${origin}/login?error=auth_failed`);
      }

      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("setup_completed, display_name")
          .eq("id", data.user.id)
          .single();

        // OAuth初回ログイン: 表示名をデフォルトセット
        if (!profile || !profile.setup_completed) {
          const oauthName =
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            data.user.email?.split("@")[0] ??
            "";

          if (oauthName && (!profile?.display_name || profile?.display_name.startsWith("ユーザー"))) {
            await supabase
              .from("profiles")
              .update({ display_name: oauthName.substring(0, 20) })
              .eq("id", data.user.id);
          }

          // ウェルカムメール送信（バックグラウンド）
          fetch(`${origin}/api/webhooks/welcome-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: data.user.id }),
          }).catch((e) => console.error("[Welcome Email Error]", e));

          return NextResponse.redirect(`${origin}/mypage/setup`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
      console.error("[Auth Unexpected Error]", err);
      return NextResponse.redirect(`${origin}/login?error=unexpected`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
