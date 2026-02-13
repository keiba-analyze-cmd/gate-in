#!/usr/bin/env python3
"""
Task #75: Google/Xログイン設定
- auth/callback/route.ts 改善（エラーハンドリング + 初回ユーザー検出）
- OAUTH_SETUP.md: OAuth設定手順書
"""

import os

AUTH_CALLBACK = '''\
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
        if (profile && !profile.setup_completed) {
          const oauthName =
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            data.user.email?.split("@")[0] ??
            "";

          if (oauthName && (!profile.display_name || profile.display_name.startsWith("ユーザー"))) {
            await supabase
              .from("profiles")
              .update({ display_name: oauthName.substring(0, 20) })
              .eq("id", data.user.id);
          }

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
'''

SETUP_GUIDE = '''\
# OAuth Login Setup

## 1. Google Login

### Google Cloud Console
1. https://console.cloud.google.com/
2. APIs & Services -> Credentials -> Create OAuth 2.0 Client ID
3. Web application, name: gate-in
4. Authorized redirect URI:
   ```
   https://iysrcqfknuofpjpewgfr.supabase.co/auth/v1/callback
   ```
5. Copy Client ID + Client Secret

### Supabase
1. Authentication -> Providers -> Google -> Enable
2. Paste Client ID + Client Secret -> Save

## 2. X (Twitter) Login

### X Developer Portal
1. https://developer.twitter.com/en/portal/dashboard
2. User authentication settings -> Set up
3. Callback URI:
   ```
   https://iysrcqfknuofpjpewgfr.supabase.co/auth/v1/callback
   ```
4. Website URL: https://gate-in.jp

### Supabase
1. Authentication -> Providers -> Twitter -> Enable
2. Paste API Key + API Secret Key -> Save

## 3. Checklist
- [ ] Google OAuth consent screen = Published
- [ ] X App = Production
- [ ] Supabase Site URL = https://gate-in.jp
- [ ] Supabase Redirect URLs includes https://gate-in.jp/auth/callback
'''

def run():
    os.makedirs("src/app/auth/callback", exist_ok=True)
    with open("src/app/auth/callback/route.ts", "w") as f:
        f.write(AUTH_CALLBACK)
    print("  ✅ src/app/auth/callback/route.ts 改善")

    with open("OAUTH_SETUP.md", "w") as f:
        f.write(SETUP_GUIDE)
    print("  ✅ OAUTH_SETUP.md 作成")

    print("\n🏁 Task #75 完了")
    print("📌 OAUTH_SETUP.md の手順に従って Google/X の設定を行ってください")

if __name__ == "__main__":
    run()
