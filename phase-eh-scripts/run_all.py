#!/usr/bin/env python3
"""
Phase E残り + Phase H 全スクリプト実行
"""

import importlib, sys, os

SCRIPTS = [
    ("29", "29_skeleton_loading",      "スケルトン表示"),
    ("31", "31_cache_strategy",        "キャッシュ戦略拡充"),
    ("33", "33_image_optimization",    "画像最適化"),
    ("34", "34_error_monitoring",      "エラー監視"),
    ("36", "36_validation",            "バリデーション強化"),
    ("58", "58_account_deletion",      "退会/アカウント削除"),
    ("59", "59_contact_page",          "お問い合わせページ"),
    ("60", "60_cookie_consent",        "Cookie同意バナー"),
    ("61", "61_notification_settings", "通知設定"),
    ("63", "63_vote_history",          "予想履歴"),
    ("99", "99_update_tasklist",       "TASKLIST更新"),
]

def main():
    os.chdir(os.path.expanduser("~/gate-in"))
    print("=" * 60)
    print("🏇 Phase E残り + Phase H 全タスク実行")
    print("=" * 60)

    ok = 0
    fail = 0

    for num, module_name, desc in SCRIPTS:
        print(f"\n{'─'*50}")
        print(f"📦 Task #{num}: {desc}")
        print(f"{'─'*50}")
        try:
            mod = importlib.import_module(module_name)
            mod.run()
            ok += 1
        except Exception as e:
            print(f"  ❌ エラー: {e}")
            import traceback
            traceback.print_exc()
            fail += 1

    print(f"\n{'='*60}")
    print(f"📊 結果: {ok}件成功 / {fail}件失敗")
    print(f"{'='*60}")

    if fail > 0:
        print("\n⚠️  失敗したタスクを確認してください")
    else:
        print("\n✅ 全タスク完了！")
        print("\n📋 次のステップ:")
        print("  1. npx next build でビルド確認")
        print("  2. Supabase SQL Editor で add_notification_settings.sql を実行")
        print("  3. Footer.tsx にお問い合わせリンクを手動追加")
        print("  4. git add -A && git commit -m 'Phase E/H: UX改善+コンプラ 10件完了' && git push")

if __name__ == "__main__":
    # スクリプトディレクトリをパスに追加
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
