#!/usr/bin/env node
/**
 * 記事一括投入スクリプト
 * 使い方: MICROCMS_API_KEY=xxxxx node import-articles.mjs
 *
 * scripts/data/articles-batch-*.json を自動検出して投入
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.MICROCMS_API_KEY;
const SERVICE = "gatein";
const BASE = `https://${SERVICE}.microcms.io/api/v1`;

if (!API_KEY) {
  console.error("❌ MICROCMS_API_KEY を設定してください");
  process.exit(1);
}

async function apiPost(endpoint, data) {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "X-MICROCMS-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST ${endpoint} failed: ${res.status} ${body}`);
  }
  return res.json();
}

// タグ名からタグIDを取得（既存タグのキャッシュ）
const tagCache = {};
async function getOrCreateTagId(tagName) {
  if (tagCache[tagName]) return tagCache[tagName];

  // 既存タグを検索
  const searchRes = await fetch(
    `${BASE}/tags?filters=name[equals]${encodeURIComponent(tagName)}&limit=1`,
    { headers: { "X-MICROCMS-API-KEY": API_KEY } }
  );
  const searchData = await searchRes.json();

  if (searchData.contents && searchData.contents.length > 0) {
    tagCache[tagName] = searchData.contents[0].id;
    return searchData.contents[0].id;
  }

  // 存在しなければ作成
  try {
    const created = await apiPost("tags", { name: tagName });
    tagCache[tagName] = created.id;
    return created.id;
  } catch (e) {
    console.warn(`  ⚠️  タグ「${tagName}」の作成に失敗: ${e.message}`);
    return null;
  }
}

async function importArticles() {
  // バッチファイルを検出
  const dataDir = path.join(__dirname, "data");
  const batchFiles = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith("articles-batch-") && f.endsWith(".json"))
    .sort();

  if (batchFiles.length === 0) {
    console.error("❌ articles-batch-*.json が見つかりません");
    process.exit(1);
  }

  console.log(`\n📰 記事一括投入 - ${batchFiles.length}個のバッチファイルを検出\n`);

  let totalSuccess = 0;
  let totalFail = 0;

  for (const file of batchFiles) {
    const filePath = path.join(dataDir, file);
    const articles = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`\n📂 ${file} (${articles.length}本)`);
    console.log("─".repeat(50));

    for (const article of articles) {
      try {
        // タグのIDを解決
        const tagIds = [];
        if (article.tags) {
          for (const tagName of article.tags) {
            const tagId = await getOrCreateTagId(tagName);
            if (tagId) tagIds.push(tagId);
          }
        }

        // 投入データを構築
        const postData = {
          title: article.title,
          slug: article.slug,
          category: article.category, // コンテンツID文字列
          emoji: article.emoji || "📖",
          excerpt: article.excerpt || "",
          content: article.content,
          readTime: article.readTime || 5,
          hasQuiz: article.hasQuiz || false,
          isPremium: article.isPremium || false,
          tags: tagIds,
        };

        const result = await apiPost("articles", postData);
        console.log(`  ✅ ${article.title} → ${result.id}`);
        totalSuccess++;

        // レート制限対策
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        console.error(`  ❌ ${article.title}: ${e.message}`);
        totalFail++;
      }
    }
  }

  console.log("\n" + "═".repeat(50));
  console.log(`🏁 完了！ 成功: ${totalSuccess}本 / 失敗: ${totalFail}本`);
  console.log("═".repeat(50));
}

importArticles().catch(console.error);
