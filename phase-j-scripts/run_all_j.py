#!/usr/bin/env python3
"""
Phase J: 追加タスク4件 全スクリプト実行
"""

import importlib, sys, os

SCRIPTS = [
    ("73", "73_admin_contact",       "管理画面 お問い合わせ対応"),
    ("74", "74_profile_enrichment",  "会員登録プロフィール拡充"),
    ("75", "75_oauth_setup",         "Google/X OAuth設定ドキュメント"),
    ("76", "76_login_optimization",  "ログインページ最適化"),
]

def main():
    os.chdir(os.path.expanduser("~/gate-in"))
    print("=" * 60)
    print("🏇 Phase J: 追加タスク 4件実行")
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
        print("  2. Supabase SQL Editor で2つのSQLを実行:")
        print("     - add_contact_inquiries.sql（お問い合わせテーブル）")
        print("     - add_profile_demographics.sql（プロフィール拡充）")
        print("  3. docs/OAUTH_SETUP.md に従って Google/X OAuth を設定")
        print("  4. git add -A && git commit -m 'Phase J: 問い合わせ管理+プロフィール+OAuth+ログイン改善' && git push")

if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
