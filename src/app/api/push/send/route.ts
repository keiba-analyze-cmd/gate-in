// src/app/api/push/send/route.ts
import { createAdminClient } from "@/lib/admin";
import { NextResponse } from "next/server";

// Firebase Admin SDK を使用して送信
// 注意: Firebase Admin SDK のセットアップが必要（後述）
async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: data || {},
          webpush: {
            fcm_options: {
              link: data?.url || "https://gate-in.jp",
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FCM送信エラー: ${error}`);
  }

  return response.json();
}

// Google OAuth アクセストークン取得
async function getAccessToken(): Promise<string> {
  // Firebase Admin SDK の認証情報から取得
  // 簡易実装: 環境変数からサービスアカウントキーを使用
  const { GoogleAuth } = await import("google-auth-library");
  
  const auth = new GoogleAuth({
    credentials: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"),
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token || "";
}

// 特定ユーザーに通知送信
export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    
    // 認証チェック（管理者 or 内部APIキー）
    const authHeader = request.headers.get("authorization");
    const internalKey = process.env.INTERNAL_API_KEY;
    
    if (authHeader !== `Bearer ${internalKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, userIds, title, body, data } = await request.json();

    // 対象ユーザーのトークンを取得
    let query = admin.from("push_tokens").select("token, user_id");
    
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (userIds && Array.isArray(userIds)) {
      query = query.in("user_id", userIds);
    } else {
      return NextResponse.json({ error: "userId or userIds required" }, { status: 400 });
    }

    const { data: tokens, error } = await query;

    if (error || !tokens || tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: "No tokens found" });
    }

    // 各トークンに送信
    const results = await Promise.allSettled(
      tokens.map((t) => sendPushNotification(t.token, title, body, data))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // 失敗したトークンは削除（無効なトークン）
    const failedTokens = results
      .map((r, i) => (r.status === "rejected" ? tokens[i].token : null))
      .filter(Boolean);

    if (failedTokens.length > 0) {
      await admin.from("push_tokens").delete().in("token", failedTokens);
    }

    return NextResponse.json({ sent: successful, failed });
  } catch (error) {
    console.error("通知送信エラー:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
