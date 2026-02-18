// scripts/fix-internal-links.ts
// 使い方: npx ts-node scripts/fix-internal-links.ts [--dry]
//
// 記事内の <!-- 内部リンク: {タイトル} --> や <!-- ピラーリンク: {タイトル} -->
// を <a href="/dojo/articles/{id}">タイトル</a> に変換し、microCMSを更新する

import { createClient } from "microcms-js-sdk";

const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN || "gatein",
  apiKey: process.env.MICROCMS_API_KEY || "",
});

const DRY_RUN = process.argv.includes("--dry");

interface Article {
  id: string;
  title: string;
  content: string;
}

async function fetchAllArticles(): Promise<Article[]> {
  const all: Article[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await client.getList({
      endpoint: "articles",
      queries: { limit, offset, fields: ["id", "title", "content"] },
    });
    all.push(...res.contents);
    if (all.length >= res.totalCount) break;
    offset += limit;
  }

  return all;
}

function buildTitleIndex(articles: Article[]): Map<string, { id: string; title: string }> {
  const index = new Map<string, { id: string; title: string }>();

  for (const a of articles) {
    // 完全一致
    index.set(a.title, { id: a.id, title: a.title });

    // ｜以前の部分でも検索可能に
    const parts = a.title.split(/[｜|]/);
    if (parts.length > 1) {
      index.set(parts[0].trim(), { id: a.id, title: a.title });
    }
  }

  return index;
}

function findBestMatch(
  targetTitle: string,
  titleIndex: Map<string, { id: string; title: string }>,
  articles: Article[]
): { id: string; title: string } | null {
  // 1. 完全一致
  if (titleIndex.has(targetTitle)) {
    return titleIndex.get(targetTitle)!;
  }

  // 2. ｜前半一致
  const parts = targetTitle.split(/[｜|]/);
  if (titleIndex.has(parts[0].trim())) {
    return titleIndex.get(parts[0].trim())!;
  }

  // 3. 部分一致（タイトルの50%以上が一致）
  const target = targetTitle.replace(/\s+/g, "");
  for (const a of articles) {
    const aTitle = a.title.replace(/\s+/g, "");
    if (
      aTitle.includes(target) ||
      target.includes(aTitle) ||
      (target.length > 5 && aTitle.includes(target.substring(0, Math.floor(target.length * 0.6))))
    ) {
      return { id: a.id, title: a.title };
    }
  }

  return null;
}

function replaceInternalLinks(
  content: string,
  titleIndex: Map<string, { id: string; title: string }>,
  articles: Article[]
): { content: string; replacements: number; unresolved: string[] } {
  let replacements = 0;
  const unresolved: string[] = [];

  // <!-- 内部リンク: タイトル --> パターン
  const patterns = [
    /<!--\s*内部リンク:\s*(.+?)\s*-->/g,
    /<!--\s*ピラーリンク:\s*(.+?)\s*-->/g,
  ];

  let result = content;

  for (const pattern of patterns) {
    result = result.replace(pattern, (_match, title) => {
      const trimmedTitle = title.trim();
      const found = findBestMatch(trimmedTitle, titleIndex, articles);

      if (found) {
        replacements++;
        return `<a href="/dojo/articles/${found.id}">${found.title}</a>`;
      } else {
        unresolved.push(trimmedTitle);
        return _match; // そのまま残す
      }
    });
  }

  return { content: result, replacements, unresolved };
}

async function main() {
  console.log(`\n📖 全記事を取得中...`);
  const articles = await fetchAllArticles();
  console.log(`  ${articles.length}件を取得`);

  const titleIndex = buildTitleIndex(articles);
  console.log(`  タイトルインデックス: ${titleIndex.size}件`);

  let totalReplacements = 0;
  let totalUnresolved = 0;
  let articlesUpdated = 0;
  const allUnresolved: { articleId: string; titles: string[] }[] = [];

  console.log(`\n🔗 内部リンク変換${DRY_RUN ? "（ドライラン）" : ""}...\n`);

  for (const article of articles) {
    const { content, replacements, unresolved } = replaceInternalLinks(
      article.content,
      titleIndex,
      articles
    );

    if (replacements === 0 && unresolved.length === 0) continue;

    totalReplacements += replacements;
    totalUnresolved += unresolved.length;

    if (unresolved.length > 0) {
      allUnresolved.push({ articleId: article.id, titles: unresolved });
    }

    if (replacements > 0) {
      articlesUpdated++;
      console.log(
        `  ✅ ${article.id}: ${replacements}件変換` +
          (unresolved.length > 0 ? ` (未解決: ${unresolved.length})` : "")
      );

      if (!DRY_RUN) {
        try {
          await client.update({
            endpoint: "articles",
            contentId: article.id,
            content: { content },
          });
          // レート制限回避
          await new Promise((r) => setTimeout(r, 300));
        } catch (error) {
          console.error(`  ❌ ${article.id} 更新失敗:`, error);
        }
      }
    } else if (unresolved.length > 0) {
      console.log(`  ⚠️ ${article.id}: 未解決 ${unresolved.join(", ")}`);
    }
  }

  console.log(`\n━━━ サマリー ━━━`);
  console.log(`  記事更新: ${articlesUpdated}件`);
  console.log(`  リンク変換: ${totalReplacements}件`);
  console.log(`  未解決: ${totalUnresolved}件`);

  if (allUnresolved.length > 0) {
    console.log(`\n⚠️ 未解決リンク:`);
    for (const { articleId, titles } of allUnresolved.slice(0, 20)) {
      console.log(`  ${articleId}: ${titles.join(", ")}`);
    }
    if (allUnresolved.length > 20) {
      console.log(`  ... 他${allUnresolved.length - 20}件`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n💡 実行するには: npx ts-node scripts/fix-internal-links.ts`);
  }
}

main().catch(console.error);
