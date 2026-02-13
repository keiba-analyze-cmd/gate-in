#!/usr/bin/env python3
"""
Task #76: ログイン画面の最適化
- パスワードリセット機能
- エラーメッセージ改善
- UIデザイン改善
- パスワード表示/非表示トグル
"""

import os

LOGIN_PAGE = '''\
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLパラメータからエラーメッセージを取得（OAuth失敗時）
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      if (err === "auth_failed") setError("認証に失敗しました。もう一度お試しください。");
      else if (err === "no_code") setError("認証コードが取得できませんでした。");
      else setError(decodeURIComponent(err));
    }
  }, [searchParams]);

  const handleOAuth = async (provider: "google" | "twitter") => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError("ログインの開始に失敗しました");
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "reset") {
      if (!email) {
        setError("メールアドレスを入力してください");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/mypage/edit`,
      });
      if (error) {
        setError(translateError(error.message));
      } else {
        setSuccess("パスワードリセット用のメールを送信しました。メールをご確認ください。");
      }
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/mypage/setup` },
      });
      if (error) {
        setError(translateError(error.message));
      } else {
        setSuccess("確認メールを送信しました。メールのリンクをクリックして登録を完了してください。");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(error.message));
      } else {
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  };

  const translateError = (msg: string): string => {
    if (msg.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません";
    if (msg.includes("Email not confirmed")) return "メールアドレスが確認されていません。確認メールをご確認ください";
    if (msg.includes("User already registered")) return "このメールアドレスは既に登録されています";
    if (msg.includes("Password should be")) return "パスワードは6文字以上で入力してください";
    if (msg.includes("rate limit")) return "しばらく時間をおいてから再度お試しください";
    if (msg.includes("Unable to validate email")) return "有効なメールアドレスを入力してください";
    return msg;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 drop-shadow-sm">🏇</div>
          <h1 className="text-2xl font-black text-gray-800">
            ゲートイン<span className="text-orange-600">！</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">みんなの予想で腕試し</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          {mode === "reset" ? (
            <>
              <h2 className="text-center font-bold text-gray-800">パスワードをリセット</h2>
              <p className="text-xs text-gray-500 text-center">
                登録済みのメールアドレスにリセット用リンクを送信します
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
            </>
          ) : (
            <>
              {/* OAuth */}
              <button
                onClick={() => handleOAuth("google")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Googleで{mode === "signup" ? "登録" : "ログイン"}
              </button>

              <button
                onClick={() => handleOAuth("twitter")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-black text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Xで{mode === "signup" ? "登録" : "ログイン"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">または</span></div>
              </div>

              {/* Email */}
              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード（6文字以上）"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === "Enter" && handleEmail()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* メッセージ表示 */}
          {error && (
            <div className="text-xs p-3 rounded-xl bg-red-50 text-red-600 border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs p-3 rounded-xl bg-green-50 text-green-700 border border-green-100">
              {success}
            </div>
          )}

          {/* メインボタン */}
          <button
            onClick={handleEmail}
            disabled={loading || !email || (mode !== "reset" && !password)}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                処理中...
              </span>
            ) : mode === "signup" ? "アカウント作成" : mode === "reset" ? "リセットメールを送信" : "ログイン"}
          </button>

          {/* モード切替 */}
          <div className="flex flex-col items-center gap-1.5">
            {mode === "reset" ? (
              <button
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="text-xs text-gray-500 hover:text-green-600 transition-colors"
              >
                ログインに戻る
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
                  className="text-xs text-gray-500 hover:text-green-600 transition-colors"
                >
                  {mode === "login" ? "新規アカウント作成" : "すでにアカウントをお持ちの方"}
                </button>
                {mode === "login" && (
                  <button
                    onClick={() => { setMode("reset"); setError(""); setSuccess(""); }}
                    className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                  >
                    パスワードをお忘れですか？
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* フッターリンク */}
        <div className="mt-6 text-center">
          <div className="flex justify-center gap-4 text-[10px] text-gray-400">
            <Link href="/terms" className="hover:text-green-600 transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-green-600 transition-colors">プライバシーポリシー</Link>
          </div>
          <p className="text-[10px] text-gray-300 mt-2">
            アカウント作成で<Link href="/terms" className="underline hover:text-green-600">利用規約</Link>に同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  );
}
'''

def run():
    with open("src/app/login/page.tsx", "w") as f:
        f.write(LOGIN_PAGE)
    print("  ✅ src/app/login/page.tsx 最適化")

    print("\n🏁 Task #76 完了")
    print("  改善内容:")
    print("  - パスワードリセット機能追加")
    print("  - パスワード表示/非表示トグル")
    print("  - エラーメッセージ日本語化")
    print("  - OAuth エラー表示対応")
    print("  - Enterキーでログイン")
    print("  - ローディングスピナー")
    print("  - グラデーション背景")
    print("  - 利用規約リンク追加")

if __name__ == "__main__":
    run()
