/**
 * 入力値サニタイズ（XSS対策）
 */
export function sanitize(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * コメントバリデーション
 */
export function validateComment(body: string): { ok: boolean; error?: string } {
  if (!body || body.trim().length === 0) {
    return { ok: false, error: "コメントを入力してください" };
  }
  if (body.length > 500) {
    return { ok: false, error: "500文字以内で入力してください" };
  }
  // URLスパム検出（3つ以上のURL）
  const urlCount = (body.match(/https?:\/\//g) || []).length;
  if (urlCount >= 3) {
    return { ok: false, error: "URLの過剰な投稿はできません" };
  }
  return { ok: true };
}

/**
 * 表示名バリデーション
 */
export function validateDisplayName(name: string): { ok: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { ok: false, error: "表示名を入力してください" };
  }
  if (name.length > 20) {
    return { ok: false, error: "20文字以内で入力してください" };
  }
  // NGワード等はここに追加可能
  return { ok: true };
}
