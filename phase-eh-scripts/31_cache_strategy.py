#!/usr/bin/env python3
"""
Task #31: ページキャッシュ戦略拡充
- 主要ページにrevalidateを追加
"""

import os

# 既にrevalidateがあるページ: races/page.tsx(60), rankings/page.tsx(120)
# 追加対象:
PAGES_TO_ADD = {
    "src/app/(main)/contest/page.tsx": 120,
    "src/app/(main)/horses/[horseId]/page.tsx": 300,
    "src/app/(main)/guide/points/page.tsx": 3600,
    "src/app/(main)/legal/page.tsx": 86400,
    "src/app/(main)/privacy/page.tsx": 86400,
    "src/app/(main)/terms/page.tsx": 86400,
}

def run():
    for path, seconds in PAGES_TO_ADD.items():
        if not os.path.exists(path):
            print(f"  ⏭️  {path} なし（スキップ）")
            continue

        with open(path, "r") as f:
            content = f.read()

        if "revalidate" in content:
            print(f"  ⏭️  {path} 既にrevalidateあり")
            continue

        # import文やexportの前に追加
        line = f"export const revalidate = {seconds};\n\n"
        content = line + content

        with open(path, "w") as f:
            f.write(content)
        print(f"  ✅ {path} → revalidate={seconds}s")

    print("\n🏁 Task #31 完了")

if __name__ == "__main__":
    run()
