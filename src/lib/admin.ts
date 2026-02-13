import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Service Role クライアント（RLSバイパス）
 * サーバーサイド専用
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * 管理者チェック — 非管理者は403
 */
export async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Response(JSON.stringify({ error: "認証が必要です" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, display_name, is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new Response(JSON.stringify({ error: "管理者権限が必要です" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { user, profile, isAdmin: true };
}

/**
 * ログインユーザー取得（管理者でなくてもOK）
 */
export async function requireAuth() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response(JSON.stringify({ error: "ログインが必要です" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { user, supabase };
}
