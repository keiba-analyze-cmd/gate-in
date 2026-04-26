#!/usr/bin/env node

/**
 * ロゴ画像最適化スクリプト
 * 
 * 使い方:
 *   npm install sharp
 *   node scripts/optimize-images.mjs
 * 
 * 実行結果:
 *   public/images/logo.webp    — WebP版ロゴ（~200KB）
 *   public/images/logo-sm.webp — 小サイズ版（ヘッダー用、~30KB）
 *   public/images/hero-ai.webp — ヒーローWebP版
 *   public/images/cta-gate.webp — CTA背景WebP版
 *   public/images/og-image.jpg — OGP用リサイズ版（1200x630）
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public", "images");

async function optimizeImage(input, outputs) {
  const inputPath = path.join(PUBLIC, input);
  if (!fs.existsSync(inputPath)) {
    console.log(`⏭️  スキップ: ${input} が見つかりません`);
    return;
  }

  const originalSize = fs.statSync(inputPath).size;
  console.log(`\n📦 ${input} (${(originalSize / 1024).toFixed(0)}KB)`);

  for (const out of outputs) {
    const outputPath = path.join(PUBLIC, out.name);
    let pipeline = sharp(inputPath);

    if (out.width || out.height) {
      pipeline = pipeline.resize(out.width, out.height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    if (out.name.endsWith(".webp")) {
      pipeline = pipeline.webp({ quality: out.quality || 80 });
    } else if (out.name.endsWith(".jpg") || out.name.endsWith(".jpeg")) {
      pipeline = pipeline.jpeg({ quality: out.quality || 85, mozjpeg: true });
    } else if (out.name.endsWith(".png")) {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    await pipeline.toFile(outputPath);
    const newSize = fs.statSync(outputPath).size;
    const ratio = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(
      `   ✅ ${out.name} → ${(newSize / 1024).toFixed(0)}KB (${ratio}% 削減)`
    );
  }
}

async function main() {
  console.log("🖼️  画像最適化を開始...\n");

  // ロゴ（1.1MB → WebP ~200KB + ヘッダー用小サイズ）
  await optimizeImage("logo.png", [
    { name: "logo.webp", quality: 85 },
    { name: "logo-sm.webp", width: 200, quality: 80 },
  ]);

  // ヒーロー画像（713KB → WebP）
  await optimizeImage("hero-ai.jpg", [
    { name: "hero-ai.webp", quality: 80 },
    { name: "og-image.jpg", width: 1200, height: 630, quality: 85 },
  ]);

  // CTA背景（507KB → WebP）
  await optimizeImage("cta-gate.jpg", [
    { name: "cta-gate.webp", quality: 75 },
  ]);

  // 集合画像（502KB → WebP）
  await optimizeImage("ai-group.jpg", [
    { name: "ai-group.webp", quality: 80 },
  ]);

  // 個別キャラアイコン → WebP
  const predictors = ["hayate", "kazan", "hakusen", "hibari", "gantetsu"];
  for (const name of predictors) {
    await optimizeImage(`predictors/${name}.png`, [
      { name: `predictors/${name}.webp`, width: 400, quality: 80 },
    ]);
  }

  console.log("\n🎉 完了！");
  console.log("\n📝 次のステップ:");
  console.log("   1. コンポーネント内の画像パスを .webp に変更");
  console.log("   2. <picture> タグでフォールバック対応（任意）");
  console.log("   3. next.config の images.formats に 'image/webp' を追加");
}

main().catch(console.error);
