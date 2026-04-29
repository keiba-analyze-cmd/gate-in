#!/usr/bin/env node
/**
 * gen-data-short-demo.mjs
 * データ分析ショート動画デモ生成
 *
 * 使い方:
 *   node gen-data-short-demo.mjs                      # デフォルト(脚質バイアス)
 *   node gen-data-short-demo.mjs --topic running      # 脚質バイアス
 *   node gen-data-short-demo.mjs --topic jockey        # 好調騎手
 *   node gen-data-short-demo.mjs --topic sire          # 種牡馬成績
 *   node gen-data-short-demo.mjs --topic post          # 枠順バイアス
 *   node gen-data-short-demo.mjs --topic popularity    # 人気別成績
 *   node gen-data-short-demo.mjs --all                 # 全トピック
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG = "../../../public/images/predictors";
const args = process.argv.slice(2);
const doAll = args.includes("--all");
const topicArg = (() => { const i = args.indexOf("--topic"); return i >= 0 ? args[i+1] : null; })();

// ── トピックデータ ──
const TOPICS = {
  running: {
    slug: "running-style",
    hookIcon: "🏃",
    hookText: "東京芝で勝てる脚質、\n知ってますか？",
    hookSub: "2024-2026年 東京芝コース集計",
    dataTitle: "📊 脚質別 勝率ランキング",
    dataSource: "JRDB 2024-2026年 東京芝 全レース",
    charId: "hayate", charName: "ハヤテ",
    themeColor: "#1E40AF", themeLight: "#60A5FA", themeDark: "#0f1f3d", themeGlow: "rgba(30,64,175,0.5)",
    conclusion: "差し馬が圧倒的に有利！",
    detail: "東京の長い直線が末脚を活かす\n逃げ・先行はスタミナ切れのリスク大",
    bars: [
      { label: "差し", value: "28.4%", pct: "85%", sub: "勝率1位 / 複勝率52%", color: "#22c55e" },
      { label: "追込", value: "22.1%", pct: "66%", sub: "直線一気が決まりやすい", color: "#60a5fa" },
      { label: "先行", value: "18.7%", pct: "56%", sub: "好位から粘り込み", color: "#fbbf24" },
      { label: "逃げ", value: "12.3%", pct: "37%", sub: "東京では苦戦傾向", color: "#f87171" },
    ],
  },
  jockey: {
    slug: "hot-jockey",
    hookIcon: "🏆",
    hookText: "今月絶好調の騎手、\n誰だか分かりますか？",
    hookSub: "2026年4月 全場集計",
    dataTitle: "🔥 4月 騎手別 勝率TOP5",
    dataSource: "JRDB 2026年4月 全レース",
    charId: "hibari", charName: "ヒバリ",
    themeColor: "#D97706", themeLight: "#FBBF24", themeDark: "#3d2a0f", themeGlow: "rgba(217,119,6,0.5)",
    conclusion: "ルメールが勝率32%で独走！",
    detail: "2位以下を10%以上引き離す圧倒的な数字\n重賞では特に信頼度が高い",
    bars: [
      { label: "ルメール", value: "32.1%", pct: "96%", sub: "断トツ！複勝率61%", color: "#22c55e" },
      { label: "川田", value: "21.8%", pct: "65%", sub: "安定の2位", color: "#60a5fa" },
      { label: "武豊", value: "19.2%", pct: "57%", sub: "ベテラン健在", color: "#fbbf24" },
      { label: "横山武", value: "17.6%", pct: "53%", sub: "若手No.1", color: "#a78bfa" },
      { label: "戸崎", value: "16.4%", pct: "49%", sub: "関東リーディング", color: "#f87171" },
    ],
  },
  sire: {
    slug: "sire-stats",
    hookIcon: "🧬",
    hookText: "東京マイルに強い種牡馬、\nTOP3は？",
    hookSub: "東京 芝1600m 過去3年",
    dataTitle: "🧬 東京芝1600m 種牡馬別勝率",
    dataSource: "JRDB 2023-2026 東京芝1600m",
    charId: "hakusen", charName: "ハクセン",
    themeColor: "#059669", themeLight: "#34D399", themeDark: "#0f3d2a", themeGlow: "rgba(5,150,105,0.5)",
    conclusion: "ロードカナロアが\nマイル王の血統！",
    detail: "スピードとキレの黄金バランス\n母系にサンデー系で更に信頼度UP",
    bars: [
      { label: "Rカナロア", value: "18.2%", pct: "91%", sub: "マイル最強血統", color: "#22c55e" },
      { label: "キズナ", value: "15.6%", pct: "78%", sub: "中距離からの適性◎", color: "#60a5fa" },
      { label: "ドゥラメンテ", value: "14.1%", pct: "70%", sub: "パワー型マイラー", color: "#fbbf24" },
      { label: "エピファネイア", value: "12.8%", pct: "64%", sub: "末脚堅実", color: "#a78bfa" },
    ],
  },
  post: {
    slug: "post-position",
    hookIcon: "🎰",
    hookText: "中山芝の内枠有利、\nどれくらい差がある？",
    hookSub: "2024-2026年 中山芝コース集計",
    dataTitle: "📊 枠番別 複勝率（中山芝）",
    dataSource: "JRDB 2024-2026 中山芝 全レース",
    charId: "hayate", charName: "ハヤテ",
    themeColor: "#1E40AF", themeLight: "#60A5FA", themeDark: "#0f1f3d", themeGlow: "rgba(30,64,175,0.5)",
    conclusion: "1〜3枠が圧倒的有利！",
    detail: "中山の小回りコースでは\n内をロスなく回れる枠が有利",
    bars: [
      { label: "1枠", value: "38.2%", pct: "95%", sub: "複勝率トップ", color: "#22c55e" },
      { label: "2枠", value: "35.6%", pct: "89%", sub: "僅差の2位", color: "#60a5fa" },
      { label: "3枠", value: "33.1%", pct: "83%", sub: "ここまでが有利ゾーン", color: "#fbbf24" },
      { label: "4-5枠", value: "29.4%", pct: "73%", sub: "平均的", color: "#a78bfa" },
      { label: "7-8枠", value: "22.8%", pct: "57%", sub: "外枠は不利", color: "#f87171" },
    ],
  },
  popularity: {
    slug: "popularity-hit",
    hookIcon: "💰",
    hookText: "何番人気が一番\n儲かるか知ってますか？",
    hookSub: "2024-2026年 中央競馬 全レース",
    dataTitle: "💰 人気別 単勝回収率",
    dataSource: "JRDB 2024-2026 全レース集計",
    charId: "kazan", charName: "カザン",
    themeColor: "#DC2626", themeLight: "#F87171", themeDark: "#3d0f0f", themeGlow: "rgba(220,38,38,0.5)",
    conclusion: "6〜8番人気が\n回収率100%超え！",
    detail: "1番人気は勝率33%でも回収率78%\n妙味のある中穴ゾーンが狙い目",
    bars: [
      { label: "6番人気", value: "112%", pct: "90%", sub: "回収率トップ！", color: "#22c55e" },
      { label: "7番人気", value: "108%", pct: "86%", sub: "穴馬ゾーン", color: "#60a5fa" },
      { label: "8番人気", value: "103%", pct: "82%", sub: "ギリギリ100%超え", color: "#fbbf24" },
      { label: "1番人気", value: "78%", pct: "62%", sub: "勝率高いが回収率低い", color: "#a78bfa" },
      { label: "10番人気〜", value: "54%", pct: "43%", sub: "大穴は夢があるが…", color: "#f87171" },
    ],
  },
};

function buildBarRowsHTML(bars) {
  // Start at 480px, each row 130px apart
  return bars.map((b, i) => `
<div class="bar-row" id="br${i}" style="top:${480 + i * 130}px">
  <div class="bar-label">${b.label}</div>
  <div class="bar-track"><div class="bar-fill" id="bf${i}" style="background:${b.color}"></div></div>
  <div class="bar-value">${b.value}</div>
  <div class="bar-sub">${b.sub}</div>
</div>`).join("\n");
}

function buildBarAnimJS(bars) {
  const lines = [];
  bars.forEach((b, i) => {
    const t = 4.5 + i * 2.5;
    lines.push(`t.to("#br${i}",{opacity:1,duration:0.3},${t.toFixed(1)}).from("#br${i}",{x:-50,duration:0.3},${t.toFixed(1)})`);
    lines.push(`.to("#bf${i}",{width:"${b.pct}",duration:1.0,ease:"power2.out"},${(t+0.4).toFixed(1)});`);
  });
  return lines.join("\n");
}

function buildBarFadeIDs(bars) {
  return bars.map((_, i) => `,"#br${i}"`).join("");
}

function generate(topicKey) {
  const topic = TOPICS[topicKey];
  let html = fs.readFileSync(path.join(__dirname, "templates", "data-short", "index.html"), "utf-8");

  // Dynamic sections
  html = html.replace("{{#BAR_ROWS}}", buildBarRowsHTML(topic.bars));
  html = html.replace("{{#BAR_ANIMATIONS}}", buildBarAnimJS(topic.bars));
  html = html.replace("{{#BAR_FADE_IDS}}", buildBarFadeIDs(topic.bars));

  // Static replacements
  const reps = {
    "{{HOOK_ICON}}": topic.hookIcon,
    "{{HOOK_TEXT}}": topic.hookText,
    "{{HOOK_SUB}}": topic.hookSub,
    "{{DATA_TITLE}}": topic.dataTitle,
    "{{DATA_SOURCE}}": topic.dataSource,
    "{{CHAR_IMAGE}}": `${IMG}/${topic.charId}.png`,
    "{{CHAR_NAME}}": topic.charName,
    "{{CONCLUSION}}": topic.conclusion,
    "{{DETAIL}}": topic.detail,
    "{{THEME_COLOR}}": topic.themeColor,
    "{{THEME_LIGHT}}": topic.themeLight,
    "{{THEME_DARK}}": topic.themeDark,
    "{{THEME_GLOW}}": topic.themeGlow,
  };
  for (const [k, v] of Object.entries(reps)) html = html.split(k).join(String(v));

  const outDir = path.join(__dirname, "output-data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `data-${topic.slug}-demo.html`);
  fs.writeFileSync(out, html, "utf-8");
  console.log(`  ✅ ${topic.slug}: ${out}`);
}

// ── Main ──
const targets = doAll ? Object.keys(TOPICS) : [topicArg || "running"];
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎬 データ分析ショート デモ生成");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  トピック: ${targets.join(", ")}\n`);
for (const t of targets) {
  if (!TOPICS[t]) { console.warn(`  ⚠️ 不明: ${t}`); continue; }
  generate(t);
}
console.log(`\n📁 出力先: output-data/`);
console.log(`💡 再生: __timelines.datashort.play()`);
