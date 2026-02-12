#!/bin/bash
# ============================================
# ゲートイン！ Phase 1 セットアップスクリプト
# gate-in フォルダ内で実行してください
# ============================================

echo "🏇 ゲートイン！ Phase 1 セットアップを開始します..."
echo ""

# パッケージインストール
echo "📦 パッケージをインストール中..."
npm install @supabase/ssr
echo ""

# ディレクトリ作成
echo "📁 フォルダを作成中..."
mkdir -p src/lib/supabase
mkdir -p src/components
mkdir -p src/app/login
mkdir -p src/app/auth/callback

# ====== src/lib/supabase/client.ts ======
echo "📝 src/lib/supabase/client.ts"
cat << 'FILEOF' > src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
FILEOF

# ====== src/lib/supabase/server.ts ======
echo "📝 src/lib/supabase/server.ts"
cat << 'FILEOF' > src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出し時は無視
          }
        },
      },
    }
  );
}
FILEOF

# ====== src/lib/supabase/middleware.ts ======
echo "📝 src/lib/supabase/middleware.ts"
cat << 'FILEOF' > src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname === "/";

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
FILEOF

# ====== src/middleware.ts ======
echo "📝 src/middleware.ts"
cat << 'FILEOF' > src/middleware.ts
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
FILEOF

# ====== src/app/auth/callback/route.ts ======
echo "📝 src/app/auth/callback/route.ts"
cat << 'FILEOF' > src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
FILEOF

# ====== src/app/login/page.tsx ======
echo "📝 src/app/login/page.tsx"
cat << 'FILEOF' > src/app/login/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const handleOAuth = async (provider: "google" | "twitter") => {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMessage("エラー: " + error.message);
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMessage("エラー: " + error.message);
      } else {
        setMessage("確認メールを送信しました。メールのリンクをクリックしてください。");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage("エラー: " + error.message);
      } else {
        window.location.href = "/";
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-green-600 mb-2">🏇 ゲートイン！</div>
          <p className="text-gray-500 text-sm">みんなの競馬予想コミュニティ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-center mb-6">
            {isSignUp ? "新規登録" : "ログイン"}
          </h1>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-gray-700">Googleでログイン</span>
            </button>

            <button
              onClick={() => handleOAuth("twitter")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="font-medium">X (Twitter) でログイン</span>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">または</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "処理中..." : isSignUp ? "新規登録" : "ログイン"}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${
              message.includes("エラー")
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage("");
              }}
              className="text-sm text-green-600 hover:underline"
            >
              {isSignUp
                ? "すでにアカウントをお持ちの方はこちら"
                : "アカウントをお持ちでない方はこちら"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ログインすることで利用規約とプライバシーポリシーに同意します
        </p>
      </div>
    </div>
  );
}
FILEOF

# ====== src/components/LogoutButton.tsx ======
echo "📝 src/components/LogoutButton.tsx"
cat << 'FILEOF' > src/components/LogoutButton.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
    >
      ログアウト
    </button>
  );
}
FILEOF

# ====== src/app/page.tsx（上書き）======
echo "📝 src/app/page.tsx（上書き）"
cat << 'FILEOF' > src/app/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-bold text-green-600">🏇 ゲートイン！</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {profile?.display_name ?? user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            ようこそ、{profile?.display_name ?? "ゲスト"}さん！
          </h1>
          <p className="text-gray-500">ゲートイン！へのログインに成功しました 🎉</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">プロフィール情報</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                  🏇
                </div>
              )}
              <div>
                <div className="font-bold text-lg">{profile?.display_name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">ランク</div>
                <div className="font-bold text-green-600">🔰 {profile?.rank_id ?? "beginner_1"}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">累計ポイント</div>
                <div className="font-bold text-green-600">{profile?.cumulative_points ?? 0} P</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">投票数</div>
                <div className="font-bold">{profile?.total_votes ?? 0} レース</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">1着的中</div>
                <div className="font-bold">{profile?.win_hits ?? 0} 回</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📊 データベース接続テスト</h2>
          <DBConnectionTest />
        </div>
      </main>
    </div>
  );
}

async function DBConnectionTest() {
  const supabase = await createClient();

  const { count: raceCount, error: raceError } = await supabase
    .from("races")
    .select("*", { count: "exact", head: true });

  const { count: horseCount, error: horseError } = await supabase
    .from("horses")
    .select("*", { count: "exact", head: true });

  const { data: recentRaces } = await supabase
    .from("races")
    .select("name, grade, race_date, course_name, status")
    .order("race_date", { ascending: false })
    .limit(5);

  const hasError = raceError || horseError;

  return (
    <div className="space-y-4">
      {hasError ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
          ❌ 接続エラー: {raceError?.message || horseError?.message}
          <br />
          <span className="text-xs">→ SQLが正しく実行されているか確認してください</span>
        </div>
      ) : (
        <>
          <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-medium">
            ✅ データベース接続成功！
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">レース数</div>
              <div className="text-2xl font-bold">{raceCount}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">登録馬数</div>
              <div className="text-2xl font-bold">{horseCount}</div>
            </div>
          </div>

          {recentRaces && recentRaces.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">レース一覧（ダミーデータ）</h3>
              <div className="space-y-2">
                {recentRaces.map((race, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    {race.grade && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        race.grade === "G1" ? "bg-yellow-100 text-yellow-700" :
                        race.grade === "G2" ? "bg-red-100 text-red-700" :
                        race.grade === "G3" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {race.grade}
                      </span>
                    )}
                    <span className="font-medium text-sm">{race.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {race.course_name} {race.race_date}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      race.status === "voting_open"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {race.status === "voting_open" ? "受付中" : "終了"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
FILEOF

echo ""
echo "✅ 全ファイルの配置が完了しました！"
echo ""
echo "📂 作成されたファイル:"
echo "  src/lib/supabase/client.ts"
echo "  src/lib/supabase/server.ts"
echo "  src/lib/supabase/middleware.ts"
echo "  src/middleware.ts"
echo "  src/app/auth/callback/route.ts"
echo "  src/app/login/page.tsx"
echo "  src/app/page.tsx (上書き)"
echo "  src/components/LogoutButton.tsx"
echo ""
echo "🚀 次のステップ:"
echo "  npm run dev"
echo "  → http://localhost:3000 を開く"
echo "  → ログイン画面が表示されればOK！"
