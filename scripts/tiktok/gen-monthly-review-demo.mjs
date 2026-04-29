#!/usr/bin/env node
/**
 * gen-monthly-review-demo.mjs
 * 月間まとめ動画デモ生成
 *
 * 使い方:
 *   node gen-monthly-review-demo.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG = "../../../public/images/predictors";

const MONTH = "2026年4月";

// Ranked by 3着内率 (descending)
const RANKING = [
  { id:"gantetsu", name:"ガンテツ", color:"#475569", rate:"77.4%", wins:"41.3%", recovery:"95%", score:"77.4", unit:"3着内率" },
  { id:"hayate", name:"ハヤテ", color:"#1E40AF", rate:"59.5%", wins:"27.0%", recovery:"86%", score:"59.5", unit:"3着内率" },
  { id:"hibari", name:"ヒバリ", color:"#D97706", rate:"58.2%", wins:"22.1%", recovery:"91%", score:"58.2", unit:"3着内率" },
  { id:"hakusen", name:"ハクセン", color:"#059669", rate:"56.2%", wins:"18.4%", recovery:"102%", score:"56.2", unit:"3着内率" },
  { id:"kazan", name:"カザン", color:"#DC2626", rate:"16.0%", wins:"8.2%", recovery:"80%", score:"16.0", unit:"3着内率" },
];

const MVP = RANKING[0]; // ガンテツ

const medals = ["🥇","🥈","🥉","4","5"];
const rowBgs = [
  "background:linear-gradient(90deg,rgba(251,191,36,0.12),rgba(251,191,36,0.02))",
  "background:linear-gradient(90deg,rgba(192,192,192,0.1),transparent)",
  "background:linear-gradient(90deg,rgba(205,127,50,0.1),transparent)",
  "background:rgba(255,255,255,0.03)",
  "background:rgba(255,255,255,0.03)",
];

function rankingHTML() {
  return RANKING.map((c, i) => `
<div class="mrow" id="mr${i}" style="top:${440 + i * 162}px;${rowBgs[i]}">
  <div class="rank" style="color:${i < 3 ? '#fbbf24' : 'rgba(255,255,255,0.3)'}">${medals[i]}</div>
  <div class="mimg" style="border-color:${c.color}"><img src="${IMG}/${c.id}.png" alt=""></div>
  <div class="mname">${c.name}</div>
  <div class="mstats">勝率${c.wins} / 回収率${c.recovery}</div>
  <div class="mscore">${c.score}%</div>
  <div class="munit">3着内率</div>
</div>`).join("\n");
}

function rankingAnim() {
  return RANKING.map((_, i) => {
    const t = 4.5 + i * 2.2;
    return `t.to("#mr${i}",{opacity:1,x:0,duration:0.4},${t.toFixed(1)}).from("#mr${i}",{x:-80,duration:0.4},${t.toFixed(1)});`;
  }).join("\n");
}

function rankFadeIDs() {
  return RANKING.map((_, i) => `,"#mr${i}"`).join("");
}

let html = fs.readFileSync(path.join(__dirname, "templates", "monthly-review", "index.html"), "utf-8");

html = html.replace("{{#RANKING_ROWS}}", rankingHTML());
html = html.replace("{{#RANKING_ANIMATIONS}}", rankingAnim());
html = html.replace("{{#RANK_FADE_IDS}}", rankFadeIDs());

const reps = {
  "{{MONTH}}": MONTH,
  "{{MVP_IMAGE}}": `${IMG}/${MVP.id}.png`,
  "{{MVP_NAME}}": MVP.name,
  "{{MVP_STAT}}": `3着内率 ${MVP.rate} / 1着率 ${MVP.wins}`,
};
for (const [k, v] of Object.entries(reps)) html = html.split(k).join(String(v));

const outDir = path.join(__dirname, "output-monthly");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `monthly-2026-04-demo.html`);
fs.writeFileSync(out, html, "utf-8");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎬 月間まとめ動画 デモ生成");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  月: ${MONTH}`);
console.log(`  MVP: ${MVP.name} (${MVP.rate})`);
console.log(`\n✅ ${out}`);
console.log(`💡 再生: __timelines.monthly.play()`);
