#!/usr/bin/env python3
"""
Task #33: 画像最適化
- <img> を next/image の <Image> に置換
- 対象: CommentItem, FollowList, TimelineItem, RankingList
"""

import os, re

TARGETS = [
    "src/components/comments/CommentItem.tsx",
    "src/components/social/FollowList.tsx",
    "src/components/social/TimelineItem.tsx",
    "src/components/rankings/RankingList.tsx",
]

def run():
    for path in TARGETS:
        if not os.path.exists(path):
            print(f"  ⏭️  {path} なし")
            continue

        with open(path, "r") as f:
            content = f.read()

        if "next/image" in content:
            print(f"  ⏭️  {path} 既にnext/image使用中")
            continue

        original = content

        # import Link があればその横に追加、なければ先頭に追加
        if 'import Link from "next/link"' in content:
            content = content.replace(
                'import Link from "next/link"',
                'import Link from "next/link";\nimport Image from "next/image"'
            )
        elif "import " in content:
            # 最初のimportの前に追加
            content = 'import Image from "next/image";\n' + content
        else:
            content = 'import Image from "next/image";\n' + content

        # <img src={...avatar_url} alt="" className="w-8 h-8 rounded-full" />
        # → <Image src={...avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full" />
        def replace_img(match):
            full = match.group(0)
            # サイズを推定
            if "w-10" in full:
                w, h = 40, 40
            elif "w-8" in full:
                w, h = 32, 32
            elif "w-7" in full:
                w, h = 28, 28
            elif "w-12" in full:
                w, h = 48, 48
            else:
                w, h = 32, 32

            # <img を <Image に
            result = full.replace("<img ", f"<Image width={{{w}}} height={{{h}}} ")
            # /> の前に unoptimized がなければ追加（外部URLの場合用）
            if "unoptimized" not in result:
                result = result.replace(" />", " unoptimized />")
            return result

        content = re.sub(r'<img\s+src=\{[^}]+\}\s+alt="[^"]*"\s+className="[^"]*"\s*/>', replace_img, content)

        if content != original:
            with open(path, "w") as f:
                f.write(content)
            print(f"  ✅ {path} → next/image に変換")
        else:
            print(f"  ⏭️  {path} 変更なし")

    print("\n🏁 Task #33 完了")

if __name__ == "__main__":
    run()
