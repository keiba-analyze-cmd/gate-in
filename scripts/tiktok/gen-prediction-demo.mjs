#!/usr/bin/env node
/**
 * gen-prediction-demo.mjs v2
 * デモデータでキャラ予想動画HTMLを生成（Supabase不要）
 *
 * 使い方:
 *   node gen-prediction-demo.mjs                 # カザン1本
 *   node gen-prediction-demo.mjs --all           # 全5キャラ
 *   node gen-prediction-demo.mjs --character hayate
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const doAll = args.includes("--all");
const charFilter = (() => { const i = args.indexOf("--character"); return i >= 0 ? args[i + 1] : null; })();

// キャラ画像のパス（scripts/tiktok/ → public/images/predictors/ への相対パス）
const IMG_BASE = "../../../public/images/predictors";

const DEMO_RACE = {
  name: "NHKマイルC", grade: "G1", gradeColor: "#f59e0b",
  course_name: "東京", track_type: "turf", distance: 1600,
};

const CHARS = {
  hayate: { name: "ハヤテ", type: "データ分析型", series: "📊 数字で語る◎",
    ac: "#1E40AF", al: "#60A5FA", ad: "#1e3a5f", ag: "rgba(30,64,175,0.6)",
    dataTitle: "📊 データが示す本命",
    rows: [["IDM（総合指数）","72","90%"],["騎手指数","68","85%"],["テン指数（スタート力）","65","81%"]],
    pick: { num: 7, name: "アルテミシア", jockey: "C.ルメール", odds: "3.2倍" },
    taikou: { num: 3, name: "ステラノーヴァ", jockey: "武豊", odds: "5.8倍" },
    tanpou: { num: 12, name: "ライジングフォース", jockey: "横山武史", odds: "12.4倍" },
    osae: { num: 5, name: "ブレイブハート", jockey: "戸崎圭太", odds: "8.6倍" },
    serif: "IDM72は今回メンバー中トップ。東京マイルのスピード適性も◎。データ的にここは逆らえない。",
  },
  kazan: { name: "カザン", type: "穴馬予測型", series: "🔥 今週の爆弾",
    ac: "#DC2626", al: "#F87171", ad: "#5f1e1e", ag: "rgba(220,38,38,0.6)",
    dataTitle: "🔥 人気と実力の乖離",
    rows: [["基準オッズ","12.4倍","75%"],["IDM（実力値）","65","81%"],["調教指数（実力の裏付け）","70（出走馬中2位）","87%"]],
    pick: { num: 12, name: "ライジングフォース", jockey: "横山武史", odds: "12.4倍" },
    taikou: { num: 14, name: "ダークフレイム", jockey: "岩田望来", odds: "22.6倍" },
    tanpou: { num: 7, name: "アルテミシア", jockey: "C.ルメール", odds: "3.2倍" },
    osae: { num: 9, name: "サンダーボルト", jockey: "松山弘平", odds: "15.2倍" },
    serif: "人気6番手だが調教指数は上位。内枠有利のマイル戦で外枠は嫌われてオッズ妙味あり。狙い撃ちだ！🔥",
  },
  hakusen: { name: "ハクセン", type: "血統分析型", series: "🧬 血統の法則",
    ac: "#059669", al: "#34D399", ad: "#1e5f3a", ag: "rgba(5,150,105,0.6)",
    dataTitle: "🧬 血統データが語る",
    rows: [["父ロードカナロア","東京マイル勝率18%","70%"],["IDM","68","85%"],["上がり指数","72","90%"]],
    pick: { num: 3, name: "ステラノーヴァ", jockey: "武豊", odds: "5.8倍" },
    taikou: { num: 7, name: "アルテミシア", jockey: "C.ルメール", odds: "3.2倍" },
    tanpou: { num: 5, name: "ブレイブハート", jockey: "戸崎圭太", odds: "8.6倍" },
    osae: { num: 10, name: "フローラルキス", jockey: "川田将雅", odds: "6.4倍" },
    serif: "父ロードカナロアは東京マイルで勝率18%と高水準。母系のStorm Cat血統もスピード裏付け。",
  },
  hibari: { name: "ヒバリ", type: "当日データ型", series: "☀️ 朝イチ速報",
    ac: "#D97706", al: "#FBBF24", ad: "#5f3a1e", ag: "rgba(217,119,6,0.6)",
    dataTitle: "☀️ 当日のシグナル",
    rows: [["馬体重変動","-4kg（絞れて好調）","65%"],["IDM","66","82%"],["調教指数","72","90%"]],
    pick: { num: 5, name: "ブレイブハート", jockey: "戸崎圭太", odds: "8.6倍" },
    taikou: { num: 7, name: "アルテミシア", jockey: "C.ルメール", odds: "3.2倍" },
    tanpou: { num: 3, name: "ステラノーヴァ", jockey: "武豊", odds: "5.8倍" },
    osae: { num: 14, name: "ダークフレイム", jockey: "岩田望来", odds: "22.6倍" },
    serif: "馬体重-4kgは許容範囲、むしろ絞れて好調のサイン！調教指数72は出走馬中1位☀️",
  },
  gantetsu: { name: "ガンテツ", type: "軸馬特化型", series: "🛡️ 鉄板の1頭",
    ac: "#475569", al: "#94A3B8", ad: "#1e293b", ag: "rgba(71,85,105,0.6)",
    dataTitle: "🛡️ 全指標の総合評価",
    rows: [["総合指数","70","87%"],["IDM","72","90%"],["位置指数","69","86%"]],
    pick: { num: 7, name: "アルテミシア", jockey: "C.ルメール", odds: "3.2倍" },
    taikou: { num: 3, name: "ステラノーヴァ", jockey: "武豊", odds: "5.8倍" },
    tanpou: { num: 5, name: "ブレイブハート", jockey: "戸崎圭太", odds: "8.6倍" },
    osae: { num: 10, name: "フローラルキス", jockey: "川田将雅", odds: "6.4倍" },
    serif: "IDM・総合指数・位置指数すべてトップ。複勝圏外は考えにくい。迷わず軸に据えるべき。",
  },
};

function generate(charId) {
  const c = CHARS[charId];
  const tplPath = path.join(__dirname, "templates", "prediction", "index.html");
  let html = fs.readFileSync(tplPath, "utf-8");

  const surface = DEMO_RACE.track_type === "turf" ? "芝" : "ダート";
  const imgSrc = `${IMG_BASE}/${charId}.png`;

  const reps = {
    "{{ACCENT_COLOR}}": c.ac, "{{ACCENT_LIGHT}}": c.al,
    "{{ACCENT_DARK}}": c.ad, "{{ACCENT_GLOW}}": c.ag,
    "{{SERIES_NAME}}": c.series, "{{CHAR_NAME}}": c.name, "{{CHAR_TYPE}}": c.type,
    "{{CHAR_IMAGE_SRC}}": imgSrc,
    "{{GRADE}}": DEMO_RACE.grade, "{{GRADE_COLOR}}": DEMO_RACE.gradeColor,
    "{{GRADE_CLASS}}": "", "{{RACE_NAME}}": DEMO_RACE.name,
    "{{VENUE}}": DEMO_RACE.course_name, "{{SURFACE}}": surface, "{{DISTANCE}}": DEMO_RACE.distance,
    "{{DATA_TITLE}}": c.dataTitle,
    "{{DATA1_LABEL}}": c.rows[0][0], "{{DATA1_VALUE}}": c.rows[0][1], "{{BAR1_PCT}}": c.rows[0][2],
    "{{DATA2_LABEL}}": c.rows[1][0], "{{DATA2_VALUE}}": c.rows[1][1], "{{BAR2_PCT}}": c.rows[1][2],
    "{{DATA3_LABEL}}": c.rows[2][0], "{{DATA3_VALUE}}": c.rows[2][1], "{{BAR3_PCT}}": c.rows[2][2],
    "{{HONMEI_NUMBER}}": c.pick.num, "{{HONMEI_NAME}}": c.pick.name,
    "{{HONMEI_JOCKEY}}": c.pick.jockey, "{{HONMEI_ODDS}}": c.pick.odds,
    "{{TAIKOU_NUMBER}}": c.taikou.num, "{{TAIKOU_NAME}}": c.taikou.name,
    "{{TAIKOU_JOCKEY}}": c.taikou.jockey, "{{TAIKOU_ODDS}}": c.taikou.odds,
    "{{TANPOU_NUMBER}}": c.tanpou.num, "{{TANPOU_NAME}}": c.tanpou.name,
    "{{TANPOU_JOCKEY}}": c.tanpou.jockey, "{{TANPOU_ODDS}}": c.tanpou.odds,
    "{{OSAE_NUMBER}}": c.osae.num, "{{OSAE_NAME}}": c.osae.name,
    "{{OSAE_JOCKEY}}": c.osae.jockey, "{{OSAE_ODDS}}": c.osae.odds,
    "{{SERIF}}": c.serif,
  };

  for (const [k, v] of Object.entries(reps)) {
    html = html.split(k).join(String(v));
  }

  const outDir = path.join(__dirname, "output-prediction");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${charId}-${DEMO_RACE.name}-demo.html`);
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`✅ ${c.name}: ${outPath}`);
}

const targets = doAll ? Object.keys(CHARS) : [charFilter || "kazan"];
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎬 キャラ予想動画デモ生成 v2");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  レース: ${DEMO_RACE.name} (${DEMO_RACE.grade}) @ ${DEMO_RACE.course_name}`);
console.log(`  キャラ: ${targets.join(", ")}`);
console.log(`  画像パス: ${IMG_BASE}/\n`);
for (const t of targets) {
  if (!CHARS[t]) { console.warn(`⚠️ 不明: ${t}`); continue; }
  generate(t);
}
console.log(`\n📁 出力先: output-prediction/`);
console.log(`💡 プレビュー: open output-prediction/<file>.html`);
console.log(`💡 アニメ再生: コンソールで __timelines.prediction.play()`);
