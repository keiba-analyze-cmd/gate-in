#!/usr/bin/env python3
"""
Task #36: 入力値バリデーション強化
- validation.ts にバリデーション関数追加
- profile API, follows API, timeline API にバリデーション適用
- レート制限を未適用APIに追加
"""

import os

# ============================================================
# 1. validation.ts に追加関数
# ============================================================
VALIDATION_ADDITIONS = '''

/**
 * ユーザーID (UUID) バリデーション
 */
export function validateUUID(id: string): { ok: boolean; error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return { ok: false, error: "無効なIDです" };
  }
  return { ok: true };
}

/**
 * ページネーション cursor バリデーション
 */
export function validateCursor(cursor: string | null): boolean {
  if (!cursor) return true;
  // ISO date string check
  return !isNaN(Date.parse(cursor));
}

/**
 * 汎用文字列長バリデーション
 */
export function validateStringLength(
  value: string,
  field: string,
  min: number,
  max: number
): { ok: boolean; error?: string } {
  if (value.length < min) {
    return { ok: false, error: `${field}は${min}文字以上で入力してください` };
  }
  if (value.length > max) {
    return { ok: false, error: `${field}は${max}文字以内で入力してください` };
  }
  return { ok: true };
}
'''

def run():
    # 1. validation.ts に追加
    path = "src/lib/validation.ts"
    if os.path.exists(path):
        with open(path, "r") as f:
            content = f.read()

        if "validateUUID" not in content:
            content += VALIDATION_ADDITIONS
            with open(path, "w") as f:
                f.write(content)
            print("  ✅ src/lib/validation.ts にバリデーション関数追加")
        else:
            print("  ⏭️  既に追加済み")
    else:
        print("  ❌ validation.ts が見つかりません")

    # 2. follows API にレート制限追加
    follows_path = "src/app/api/follows/route.ts"
    if os.path.exists(follows_path):
        with open(follows_path, "r") as f:
            content = f.read()

        if "rateLimit" not in content:
            # import追加
            content = 'import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";\nimport { validateUUID } from "@/lib/validation";\n' + content

            # POST関数内の認証チェック後にレート制限追加
            old = '  const { following_id } = await request.json();'
            new = '''  // レート制限
  const rl = rateLimit(`follows:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const { following_id } = await request.json();

  // バリデーション
  const idCheck = validateUUID(following_id);
  if (!idCheck.ok) {
    return NextResponse.json({ error: idCheck.error }, { status: 400 });
  }'''
            if old in content:
                content = content.replace(old, new)

            with open(follows_path, "w") as f:
                f.write(content)
            print("  ✅ follows API にレート制限+バリデーション追加")
        else:
            print("  ⏭️  follows API 既に適用済み")

    # 3. profile API にレート制限追加
    profile_path = "src/app/api/profile/route.ts"
    if os.path.exists(profile_path):
        with open(profile_path, "r") as f:
            content = f.read()

        if "rateLimit" not in content:
            content = 'import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";\n' + content

            old = "  const body = await request.json();"
            new = """  // レート制限
  const rl = rateLimit(`profile:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const body = await request.json();"""

            if old in content:
                content = content.replace(old, new)

            with open(profile_path, "w") as f:
                f.write(content)
            print("  ✅ profile API にレート制限追加")
        else:
            print("  ⏭️  profile API 既に適用済み")

    # 4. timeline API にレート制限追加
    timeline_path = "src/app/api/timeline/route.ts"
    if os.path.exists(timeline_path):
        with open(timeline_path, "r") as f:
            content = f.read()

        if "rateLimit" not in content:
            content = 'import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";\n' + content

            old = '  const { searchParams } = new URL(request.url);'
            new = '''  // レート制限
  const rl = rateLimit(`timeline:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse();

  const { searchParams } = new URL(request.url);'''

            if old in content:
                content = content.replace(old, new)

            with open(timeline_path, "w") as f:
                f.write(content)
            print("  ✅ timeline API にレート制限追加")
        else:
            print("  ⏭️  timeline API 既に適用済み")

    print("\n🏁 Task #36 完了")

if __name__ == "__main__":
    run()
