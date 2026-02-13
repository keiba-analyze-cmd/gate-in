/**
 * エラーログ収集ユーティリティ
 * Sentryなど外部サービス導入時はここを差し替え
 */

type ErrorContext = {
  page?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, any>;
};

export function logError(error: unknown, context?: ErrorContext) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // サーバーサイドログ
  console.error("[ERROR]", {
    message,
    stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

export async function reportClientError(error: unknown, context?: ErrorContext) {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    await fetch("/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        stack,
        page: context?.page ?? window.location.pathname,
        userAgent: navigator.userAgent,
        ...context,
      }),
    });
  } catch {
    // エラー送信自体のエラーは無視
  }
}
