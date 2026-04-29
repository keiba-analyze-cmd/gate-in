#!/usr/bin/env node
/**
 * gen-char-spotlight-demo.mjs
 * キャラ深掘り動画デモ生成
 *
 * 使い方:
 *   node gen-char-spotlight-demo.mjs                      # ハヤテ
 *   node gen-char-spotlight-demo.mjs --character kazan
 *   node gen-char-spotlight-demo.mjs --all
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG = "../../../public/images/predictors";
const args = process.argv.slice(2);
const doAll = args.includes("--all");
const charArg = (() => { const i = args.indexOf("--character"); return i >= 0 ? args[i+1] : null; })();

const CHARS = {
  hayate: {
    id: "hayate", name: "ハヤテ", type: "データ分析型",
    color: "#1E40AF", light: "#60A5FA", dark: "#0f1f3d", glow: "rgba(30,64,175,0.5)",
    catchcopy: "数字は嘘をつかない。\nIDMが示す本命を、迷わず推す。",
    profile: [
      { label: "得意分野", value: "指数分析", desc: "IDM・騎手指数・テン指数を総合判断" },
      { label: "予想スタイル", value: "堅実本命型", desc: "的中率を最優先、データの裏付けがある馬のみ" },
      { label: "信条", value: "データファースト", desc: "感情を排して数字だけで判断する" },
    ],
    stats: [
      { value: "27%", label: "1着的中率", sub: "安定の高打率" },
      { value: "59%", label: "3着内率", sub: "複勝圏内6割" },
      { value: "86%", label: "回収率", sub: "堅実に回収" },
      { value: "109", label: "分析レース", sub: "開催日" },
    ],
    bestLabel: "得意コース", bestValue: "東京芝 中距離",
    quote: "データの前に、\n思い込みは無力だ。\n数字だけが真実を語る。",
  },
  kazan: {
    id: "kazan", name: "カザン", type: "穴馬予測型",
    color: "#DC2626", light: "#F87171", dark: "#3d0f0f", glow: "rgba(220,38,38,0.5)",
    catchcopy: "人気と実力の乖離を見逃さない。\n配当妙味のある1頭を狙い撃つ。",
    profile: [
      { label: "得意分野", value: "穴馬発掘", desc: "人気薄の中から実力馬を見つけ出す" },
      { label: "予想スタイル", value: "一撃回収型", desc: "的中率は低いが当たれば大きい" },
      { label: "信条", value: "逆張りの美学", desc: "皆が買う馬より、皆が見落とす馬を" },
    ],
    stats: [
      { value: "16%", label: "3着内率", sub: "穴狙いの宿命" },
      { value: "102%", label: "単勝回収率", sub: "100%超えが強み" },
      { value: "80%", label: "複勝回収率", sub: "穴馬でも複勝圏" },
      { value: "429", label: "厳選レース", sub: "狙えるレースのみ" },
    ],
    bestLabel: "得意条件", bestValue: "ハンデ戦・牝馬限定戦",
    quote: "大衆の逆を行け。\n人気に惑わされるな。\nオッズの歪みに\n真実がある。🔥",
  },
  hakusen: {
    id: "hakusen", name: "ハクセン", type: "血統分析型",
    color: "#059669", light: "#34D399", dark: "#0f3d2a", glow: "rgba(5,150,105,0.5)",
    catchcopy: "血統は嘘をつかない。\n父の力、母の系統が勝敗を分ける。",
    profile: [
      { label: "得意分野", value: "血統分析", desc: "種牡馬×コース×距離の相性を解析" },
      { label: "予想スタイル", value: "血統理論型", desc: "血統背景から走れる馬を見抜く" },
      { label: "信条", value: "血は争えない", desc: "能力の根源は血統にあると信じる" },
    ],
    stats: [
      { value: "56%", label: "3着内率", sub: "血統の裏付け" },
      { value: "102%", label: "単勝回収率", sub: "100%超え！" },
      { value: "18%", label: "新馬戦勝率", sub: "初出走に強い" },
      { value: "41K", label: "血統DB", sub: "頭分のデータ" },
    ],
    bestLabel: "得意条件", bestValue: "新馬戦・東京芝マイル",
    quote: "血統表を読め。\nそこには何世代もの\n淘汰の歴史が刻まれている。",
  },
  hibari: {
    id: "hibari", name: "ヒバリ", type: "当日データ型",
    color: "#D97706", light: "#FBBF24", dark: "#3d2a0f", glow: "rgba(217,119,6,0.5)",
    catchcopy: "当日の馬体重、オッズ変動、馬場状態。\nリアルタイムの変化を見逃さない。",
    profile: [
      { label: "得意分野", value: "当日シグナル", desc: "馬体重変動・調教指数・馬場を読む" },
      { label: "予想スタイル", value: "直前判断型", desc: "発走30分前のデータで最終決定" },
      { label: "信条", value: "現場主義", desc: "前日までのデータより当日の状態が全て" },
    ],
    stats: [
      { value: "58%", label: "3着内率", sub: "当日データの力" },
      { value: "91%", label: "回収率", sub: "堅実に積み上げ" },
      { value: "+10kg", label: "除外基準", sub: "大幅増は切る" },
      { value: "30分", label: "公開タイミング", sub: "発走前に速報" },
    ],
    bestLabel: "得意シーン", bestValue: "雨の日・馬場悪化時",
    quote: "朝の空気を読め。\n馬場の湿り気、\nパドックの気配。\n答えは現場にある。☀️",
  },
  gantetsu: {
    id: "gantetsu", name: "ガンテツ", type: "軸馬特化型",
    color: "#475569", light: "#94A3B8", dark: "#1e293b", glow: "rgba(71,85,105,0.5)",
    catchcopy: "◎の1頭に全てを賭ける。\n全指標を統合した最強の軸馬を選出。",
    profile: [
      { label: "得意分野", value: "軸馬選定", desc: "IDM+総合+位置+調教を全統合" },
      { label: "予想スタイル", value: "1頭特化型", desc: "◎の複勝的中率90%を目指す" },
      { label: "信条", value: "質より精度", desc: "数を打つより1頭の精度を極める" },
    ],
    stats: [
      { value: "41%", label: "1着的中率", sub: "厳選の精度" },
      { value: "77%", label: "3着内率", sub: "驚異の的中率" },
      { value: "90%", label: "5着内率", sub: "ほぼ崩れない" },
      { value: "429", label: "厳選レース", sub: "条件合致のみ" },
    ],
    bestLabel: "得意条件", bestValue: "重賞・総合指数差8+",
    quote: "軸は1頭でいい。\nその1頭に\n全ての分析を集約する。\nそれが鉄の掟だ。",
  },
};

function generate(charId) {
  const c = CHARS[charId];
  let html = fs.readFileSync(path.join(__dirname, "templates", "char-spotlight", "index.html"), "utf-8");

  const reps = {
    "{{CHAR_IMAGE}}": `${IMG}/${c.id}.png`,
    "{{CHAR_NAME}}": c.name, "{{CHAR_TYPE}}": c.type,
    "{{CATCHCOPY}}": c.catchcopy,
    "{{THEME_COLOR}}": c.color, "{{THEME_LIGHT}}": c.light,
    "{{THEME_DARK}}": c.dark, "{{THEME_GLOW}}": c.glow,
    "{{PROF1_LABEL}}": c.profile[0].label, "{{PROF1_VALUE}}": c.profile[0].value, "{{PROF1_DESC}}": c.profile[0].desc,
    "{{PROF2_LABEL}}": c.profile[1].label, "{{PROF2_VALUE}}": c.profile[1].value, "{{PROF2_DESC}}": c.profile[1].desc,
    "{{PROF3_LABEL}}": c.profile[2].label, "{{PROF3_VALUE}}": c.profile[2].value, "{{PROF3_DESC}}": c.profile[2].desc,
    "{{STAT1_VALUE}}": c.stats[0].value, "{{STAT1_LABEL}}": c.stats[0].label, "{{STAT1_SUB}}": c.stats[0].sub,
    "{{STAT2_VALUE}}": c.stats[1].value, "{{STAT2_LABEL}}": c.stats[1].label, "{{STAT2_SUB}}": c.stats[1].sub,
    "{{STAT3_VALUE}}": c.stats[2].value, "{{STAT3_LABEL}}": c.stats[2].label, "{{STAT3_SUB}}": c.stats[2].sub,
    "{{STAT4_VALUE}}": c.stats[3].value, "{{STAT4_LABEL}}": c.stats[3].label, "{{STAT4_SUB}}": c.stats[3].sub,
    "{{BEST_LABEL}}": c.bestLabel, "{{BEST_VALUE}}": c.bestValue,
    "{{QUOTE}}": c.quote,
  };
  for (const [k, v] of Object.entries(reps)) html = html.split(k).join(String(v));

  const outDir = path.join(__dirname, "output-char");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `char-${c.id}-demo.html`);
  fs.writeFileSync(out, html, "utf-8");
  console.log(`  ✅ ${c.name}: ${out}`);
}

const targets = doAll ? Object.keys(CHARS) : [charArg || "hayate"];
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎬 キャラ深掘り動画 デモ生成");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  キャラ: ${targets.join(", ")}\n`);
for (const t of targets) {
  if (!CHARS[t]) { console.warn(`  ⚠️ 不明: ${t}`); continue; }
  generate(t);
}
console.log(`\n📁 出力先: output-char/`);
console.log(`💡 再生: __timelines.charspot.play()`);
