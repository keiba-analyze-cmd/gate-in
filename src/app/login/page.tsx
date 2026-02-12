"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleOAuth = async (provider: "google" | "twitter") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  const handleEmail = async () => {
    setLoading(true);
    setError("");
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setError("確認メールを送信しました。メールのリンクをクリックしてください。");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏇</div>
          <h1 className="text-2xl font-black text-gray-800">
            ゲートイン<span className="text-orange-600">！</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">みんなの予想で腕試し</p>
        </div>

        <div className="card p-6 space-y-4">
          {/* OAuth */}
          <button
            onClick={() => handleOAuth("google")}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Googleでログイン
          </button>

          <button
            onClick={() => handleOAuth("twitter")}
            className="w-full flex items-center justify-center gap-3 bg-black text-white rounded-xl py-3 text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Xでログイン
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">または</span></div>
          </div>

          {/* Email */}
          <div className="space-y-3">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {error && (
              <p className={`text-xs p-2 rounded-lg ${error.includes("確認メール") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {error}
              </p>
            )}
            <button
              onClick={handleEmail}
              disabled={loading || !email || !password}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {loading ? "..." : isSignUp ? "アカウント作成" : "ログイン"}
            </button>
          </div>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-xs text-gray-500 hover:text-green-600 transition-colors"
          >
            {isSignUp ? "すでにアカウントをお持ちの方" : "新規アカウント作成"}
          </button>
        </div>
      </div>
    </div>
  );
}
