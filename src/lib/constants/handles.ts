// ユーザーハンドル（@user_id）バリデーション

/** 許可パターン: 英小文字、数字、アンダースコア、3〜20文字 */
const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

/** 予約語（システムで使うパスなど） */
const RESERVED_HANDLES = new Set([
  "admin", "api", "login", "logout", "signup", "register",
  "settings", "mypage", "races", "rankings", "ranking",
  "timeline", "contest", "dojo", "users", "user",
  "notifications", "search", "about", "help", "support",
  "terms", "privacy", "inquiry", "gate_in", "gatein",
  "official", "system", "null", "undefined", "delete",
]);

export function validateHandle(handle: string): { ok: boolean; error?: string } {
  if (!handle) {
    return { ok: false, error: "ユーザーIDを入力してください" };
  }

  if (handle.length < 3) {
    return { ok: false, error: "3文字以上で入力してください" };
  }

  if (handle.length > 20) {
    return { ok: false, error: "20文字以内で入力してください" };
  }

  if (!HANDLE_REGEX.test(handle)) {
    return { ok: false, error: "英小文字・数字・アンダースコアのみ使用できます" };
  }

  if (handle.startsWith("_") || handle.endsWith("_")) {
    return { ok: false, error: "先頭・末尾にアンダースコアは使えません" };
  }

  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "このIDは使用できません" };
  }

  return { ok: true };
}

export function normalizeHandle(handle: string): string {
  return handle.toLowerCase().trim();
}
