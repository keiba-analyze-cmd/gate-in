#!/bin/bash
set -e

echo "=================================================="
echo "🔙 戻るナビゲーション 一括追加"
echo "=================================================="
echo ""

# ============================================================
# 1. BackLink共通コンポーネント
# ============================================================
echo "━━━ 1. BackLinkコンポーネント作成 ━━━"

cat > src/components/ui/BackLink.tsx << 'EOF'
import Link from "next/link";

type Props = {
  href: string;
  label?: string;
};

export default function BackLink({ href, label = "戻る" }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-green-600 transition-colors mb-4"
    >
      <span className="text-xs">←</span>
      <span>{label}</span>
    </Link>
  );
}
EOF
echo "  ✅ src/components/ui/BackLink.tsx"

# ============================================================
# 2. 各ページに追加
# ============================================================
echo "━━━ 2. 各ページに追加 ━━━"

# --- mypage/edit ---
sed -i '' '/export default async function/,/<h1/ {
  /<h1/i\
\      <BackLink href="/mypage" label="マイページ" />
}' 'src/app/(main)/mypage/edit/page.tsx'
# import追加
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/mypage/edit/page.tsx'
echo "  ✅ mypage/edit"

# --- mypage/badges ---
sed -i '' '/<h1.*バッジ/i\
\        <BackLink href="/mypage" label="マイページ" />
' 'src/app/(main)/mypage/badges/page.tsx'
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/mypage/badges/page.tsx'
echo "  ✅ mypage/badges"

# --- mypage/votes ---
sed -i '' '/<h1.*予想履歴/i\
\        <BackLink href="/mypage" label="マイページ" />
' 'src/app/(main)/mypage/votes/page.tsx'
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/mypage/votes/page.tsx'
echo "  ✅ mypage/votes"

# --- mypage/notification-settings ---
sed -i '' '/<h1.*通知設定/i\
\      <BackLink href="/mypage" label="マイページ" />
' 'src/app/(main)/mypage/notification-settings/page.tsx'
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/mypage/notification-settings/page.tsx'
echo "  ✅ mypage/notification-settings"

# --- mypage/delete ---
sed -i '' '/<h1.*アカウント削除/i\
\      <BackLink href="/mypage" label="マイページ" />
' 'src/app/(main)/mypage/delete/page.tsx'
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/mypage/delete/page.tsx'
echo "  ✅ mypage/delete"

# --- mypage/follows ---
sed -i '' '/<h1.*フォロー/i\
\        <BackLink href="/mypage" label="マイページ" />
' 'src/app/(main)/mypage/follows/page.tsx'
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/mypage/follows/page.tsx'
echo "  ✅ mypage/follows"

# --- mypage/points は既に「← 戻る」あるのでBackLinkに置換 ---
sed -i '' 's|<Link href="/mypage" className="text-gray-400 hover:text-green-600">← 戻る</Link>|<BackLink href="/mypage" label="マイページ" />|' 'src/app/(main)/mypage/points/page.tsx'
# Linkがもう不要かチェック（他で使ってるかも）
if ! grep -q 'Link href' 'src/app/(main)/mypage/points/page.tsx' 2>/dev/null; then
  sed -i '' '/^import Link/d' 'src/app/(main)/mypage/points/page.tsx'
fi
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/mypage/points/page.tsx'
echo "  ✅ mypage/points (既存を置換)"

# --- contest ---
sed -i '' '/<h1.*月間大会/i\
\      <BackLink href="/" label="トップ" />
' 'src/app/(main)/contest/page.tsx'
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/contest/page.tsx'
echo "  ✅ contest"

# --- contact ---
sed -i '' '/<h1.*お問い合わせ$/i\
\      <BackLink href="/" label="トップ" />
' 'src/app/(main)/contact/page.tsx'
# 既存のパンくずを削除
sed -i '' '/Link href="\/" className="hover:text-green-600">TOP/d' 'src/app/(main)/contact/page.tsx'
sed -i '' '/class.*text-sm text-gray-400/,/ポイントシステム\|お問い合わせ.*<\/span>/{ /text-gray-400\|mx-2\|text-gray-600.*お問い合わせ/d; }' 'src/app/(main)/contact/page.tsx'
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/contact/page.tsx'
echo "  ✅ contact"

# --- guide/points: 既存パンくずをBackLinkに置換 ---
sed -i '' '/<div className="text-sm text-gray-400">/,/<\/div>/{
  /<div className="text-sm text-gray-400">/c\
\      <BackLink href="/" label="トップ" />
  /<\/div>/d
  /Link href/d
  /mx-2/d
  /text-gray-600/d
}' 'src/app/(main)/guide/points/page.tsx'
# 古いLink importを削除してBackLinkに
sed -i '' 's|import Link from "next/link";|import Link from "next/link";\nimport BackLink from "@/components/ui/BackLink";|' 'src/app/(main)/guide/points/page.tsx'
echo "  ✅ guide/points (パンくず→BackLink)"

# --- users/[userId] ---
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/users/[userId]/page.tsx'
# return文の直後のdivの中に追加
sed -i '' '/<div className="max-w/a\
\      <BackLink href="/users" label="ユーザー検索" />
' 'src/app/(main)/users/[userId]/page.tsx'
echo "  ✅ users/[userId]"

# --- users/[userId]/follows ---
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/users/[userId]/follows/page.tsx'
sed -i '' '/<h1.*フォロー/i\
\        <BackLink href={`/users/${userId}`} label="プロフィール" />
' 'src/app/(main)/users/[userId]/follows/page.tsx'
echo "  ✅ users/[userId]/follows"

# --- horses/[horseId] ---
sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' 'src/app/(main)/horses/[horseId]/page.tsx'
sed -i '' '/<h1.*{horse.name}/i\
\            <BackLink href="/races" label="レース一覧" />
' 'src/app/(main)/horses/[horseId]/page.tsx'
echo "  ✅ horses/[horseId]"

# --- legal pages ---
for page in legal terms privacy; do
  sed -i '' '1i\
import BackLink from "@/components/ui/BackLink";
' "src/app/(main)/${page}/page.tsx"
  # h1の前に追加
  sed -i '' '/<h1/i\
\        <BackLink href="/" label="トップ" />
' "src/app/(main)/${page}/page.tsx"
  echo "  ✅ ${page}"
done

echo ""
echo "=================================================="
echo "🏁 戻るナビゲーション追加完了!"
echo "=================================================="
echo ""
echo "📋 追加先:"
echo "  マイページ系: edit, badges, votes, points, follows, notification-settings, delete"
echo "  レース系:     horses/[horseId] (races/[raceId]は既存パンくず有)"
echo "  ユーザー系:   users/[userId], users/[userId]/follows"
echo "  その他:       contest, contact, guide/points, legal, terms, privacy"
echo ""
echo "📋 次のステップ:"
echo "  1. npm run build"
echo "  2. ビルド成功後:"
echo "     git add -A && git commit -m 'feat: 戻るナビゲーション追加' && git push"
