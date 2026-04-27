#!/usr/bin/env node
/**
 * gen-prediction.mjs
 * キャラ予想動画生成スクリプト
 *
 * 使い方:
 *   # 環境変数セット
 *   export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/gate-in/.env.local | xargs)
 *
 *   # 特定キャラ × 特定レース
 *   node gen-prediction.mjs --character kazan --race-id <race_id>
 *
 *   # 特定キャラ × 日付（その日の全重賞）
 *   node gen-prediction.mjs --character kazan --date 2026-05-04
 *
 *   # 全キャラ × 日付
 *   node gen-prediction.mjs --all --date 2026-05-04
 *
 *   # レンダリングも実行
 *   node gen-prediction.mjs --character kazan --race-id <id> --render
 *
 *   # HTMLのみ（ブラウザプレビュー用）
 *   node gen-prediction.mjs --character kazan --race-id <id>
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Supabase ──
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 環境変数を設定してください:");
  console.error("  export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/gate-in/.env.local | xargs)");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ── CLI args ──
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const charFilter = getArg("character");
const raceIdFilter = getArg("race-id");
const dateFilter = getArg("date");
const doAll = args.includes("--all");
const doRender = args.includes("--render");

// ── キャラクター設定 ──
const CHARACTERS = {
  hayate: {
    id: "hayate",
    name: "ハヤテ",
    type: "データ分析型",
    series: "📊 数字で語る◎",
    accent: "#1E40AF",
    accentLight: "#60A5FA",
    accentDark: "#1e3a5f",
    accentGlow: "rgba(30,64,175,0.6)",
    dataTitle: "📊 データが示す本命",
    getDataRows: (entry) => [
      { label: "IDM（総合指数）", value: entry.idm ? `${entry.idm}` : "N/A", pct: clampPct(entry.idm, 80) },
      { label: "騎手指数", value: entry.jockey_index ? `${entry.jockey_index}` : "N/A", pct: clampPct(entry.jockey_index, 80) },
      { label: "テン指数（スタート力）", value: entry.ten_index ? `${entry.ten_index}` : "N/A", pct: clampPct(entry.ten_index, 80) },
    ],
    imagePath: "predictors/hayate.png",
  },
  kazan: {
    id: "kazan",
    name: "カザン",
    type: "穴馬予測型",
    series: "🔥 今週の爆弾",
    accent: "#DC2626",
    accentLight: "#F87171",
    accentDark: "#5f1e1e",
    accentGlow: "rgba(220,38,38,0.6)",
    dataTitle: "🔥 人気と実力の乖離",
    getDataRows: (entry) => {
      const oddsGap = entry.base_odds && entry.popularity
        ? `人気${entry.popularity}番 → オッズ${entry.base_odds}`
        : "N/A";
      return [
        { label: "基準オッズ", value: entry.base_odds ? `${entry.base_odds}倍` : "N/A", pct: clampPctInverse(entry.base_odds, 50) },
        { label: "IDM（実力値）", value: entry.idm ? `${entry.idm}` : "N/A", pct: clampPct(entry.idm, 80) },
        { label: "人気 vs 実力", value: oddsGap, pct: "60%" },
      ];
    },
    imagePath: "predictors/kazan.png",
  },
  hakusen: {
    id: "hakusen",
    name: "ハクセン",
    type: "血統分析型",
    series: "🧬 血統の法則",
    accent: "#059669",
    accentLight: "#34D399",
    accentDark: "#1e5f3a",
    accentGlow: "rgba(5,150,105,0.6)",
    dataTitle: "🧬 血統データが語る",
    getDataRows: (entry) => [
      { label: "父馬", value: entry.sire_name || "確認中", pct: "70%" },
      { label: "IDM", value: entry.idm ? `${entry.idm}` : "N/A", pct: clampPct(entry.idm, 80) },
      { label: "上がり指数", value: entry.agari_index ? `${entry.agari_index}` : "N/A", pct: clampPct(entry.agari_index, 80) },
    ],
    imagePath: "predictors/hakusen.png",
  },
  hibari: {
    id: "hibari",
    name: "ヒバリ",
    type: "当日データ型",
    series: "☀️ 朝イチ速報",
    accent: "#D97706",
    accentLight: "#FBBF24",
    accentDark: "#5f3a1e",
    accentGlow: "rgba(217,119,6,0.6)",
    dataTitle: "☀️ 当日のシグナル",
    getDataRows: (entry) => [
      { label: "馬体重変動", value: entry.weight_diff != null ? `${entry.weight_diff > 0 ? '+' : ''}${entry.weight_diff}kg` : "未発表", pct: "50%" },
      { label: "IDM", value: entry.idm ? `${entry.idm}` : "N/A", pct: clampPct(entry.idm, 80) },
      { label: "調教指数", value: entry.training_index ? `${entry.training_index}` : "N/A", pct: clampPct(entry.training_index, 80) },
    ],
    imagePath: "predictors/hibari.png",
  },
  gantetsu: {
    id: "gantetsu",
    name: "ガンテツ",
    type: "軸馬特化型",
    series: "🛡️ 鉄板の1頭",
    accent: "#475569",
    accentLight: "#94A3B8",
    accentDark: "#1e293b",
    accentGlow: "rgba(71,85,105,0.6)",
    dataTitle: "🛡️ 全指標の総合評価",
    getDataRows: (entry) => [
      { label: "総合指数", value: entry.composite_index ? `${entry.composite_index}` : "N/A", pct: clampPct(entry.composite_index, 80) },
      { label: "IDM", value: entry.idm ? `${entry.idm}` : "N/A", pct: clampPct(entry.idm, 80) },
      { label: "位置指数", value: entry.position_index ? `${entry.position_index}` : "N/A", pct: clampPct(entry.position_index, 80) },
    ],
    imagePath: "predictors/gantetsu.png",
  },
};

function clampPct(val, max) {
  if (!val || isNaN(val)) return "30%";
  return Math.min(100, Math.max(10, (parseFloat(val) / max) * 100)).toFixed(0) + "%";
}
function clampPctInverse(val, max) {
  if (!val || isNaN(val)) return "30%";
  return Math.min(100, Math.max(10, 100 - (parseFloat(val) / max) * 100)).toFixed(0) + "%";
}

// ── external_id → race_key 変換 ──
function toRaceKey(externalId) {
  // external_id: 12桁 (YYYYJJRRNN形式) → race_key: 8桁
  if (!externalId || externalId.length < 8) return externalId;
  // 先頭2桁の年を取り、残り6桁
  return externalId.slice(2, 10);
}

// ── グレード → CSSクラス ──
function gradeClass(grade) {
  if (!grade) return "grade-op";
  if (grade === "G1") return "grade-g1";
  if (grade === "G2") return "grade-g2";
  if (grade === "G3") return "grade-g3";
  return "grade-op";
}

// ── Supabaseからデータ取得 ──
async function fetchPredictionData(characterId, raceId) {
  // 1. AI予想を取得
  const { data: prediction, error: predErr } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("predictor_id", characterId)
    .eq("race_id", raceId)
    .single();

  if (predErr || !prediction) {
    console.warn(`⚠️ ${characterId} の予想が見つかりません (race_id: ${raceId})`);
    return null;
  }

  // 2. レース情報を取得
  const { data: race, error: raceErr } = await supabase
    .from("races")
    .select("*")
    .eq("id", raceId)
    .single();

  if (raceErr || !race) {
    console.warn(`⚠️ レースが見つかりません (race_id: ${raceId})`);
    return null;
  }

  // 3. race_keyに変換してJRDBエントリーを取得
  const raceKey = toRaceKey(race.external_id);

  // ◎の馬番
  const honmeiUmaban = prediction.umaban?.toString();

  // JRDB出馬データ取得（◎の馬）
  let honmeiEntry = null;
  if (honmeiUmaban && raceKey) {
    const { data } = await supabase
      .from("jrdb_race_entries")
      .select("*")
      .eq("race_key", raceKey)
      .eq("umaban", parseInt(honmeiUmaban))
      .single();
    honmeiEntry = data;
  }

  // ○▲△の馬情報もJRDBから取得
  const otherPicks = [];
  const pickTypes = [
    { mark: "○", umaban: prediction.taikou_umaban, color: "#60a5fa" },
    { mark: "▲", umaban: prediction.tanpou_umaban, color: "#fbbf24" },
    { mark: "△", umaban: prediction.osae_umaban, color: "#a3a3a3" },
  ];
  for (const pick of pickTypes) {
    if (pick.umaban && raceKey) {
      const { data } = await supabase
        .from("jrdb_race_entries")
        .select("horse_name, jockey_name, umaban, base_odds")
        .eq("race_key", raceKey)
        .eq("umaban", parseInt(pick.umaban))
        .single();
      otherPicks.push({
        mark: pick.mark,
        number: pick.umaban,
        name: data?.horse_name?.trim() || `${pick.umaban}番`,
        jockey: data?.jockey_name?.trim() || "",
        odds: data?.base_odds ? `${data.base_odds}倍` : "",
        color: pick.color,
      });
    } else {
      otherPicks.push({ mark: pick.mark, number: "-", name: "未定", jockey: "", odds: "", color: pick.color });
    }
  }

  return {
    prediction,
    race,
    raceKey,
    honmeiEntry,
    honmeiName: honmeiEntry?.horse_name?.trim() || prediction.horse_name || `${honmeiUmaban}番`,
    honmeiJockey: honmeiEntry?.jockey_name?.trim() || "",
    honmeiOdds: honmeiEntry?.base_odds ? `${honmeiEntry.base_odds}倍` : "",
    otherPicks,
  };
}

// ── テンプレートにデータを注入 ──
function buildHTML(char, data) {
  const templatePath = path.join(__dirname, "templates", "prediction", "index.html");
  let html = fs.readFileSync(templatePath, "utf-8");

  const entry = data.honmeiEntry || {};
  const dataRows = char.getDataRows(entry);

  // 画像パスはローカルのassetsフォルダを参照
  const imgSrc = path.join(__dirname, "assets", char.imagePath);
  const imgExists = fs.existsSync(imgSrc);
  const charImageSrc = imgExists ? char.imagePath : "";

  const surface = data.race.track_type === "turf" ? "芝" : data.race.track_type === "dirt" ? "ダート" : data.race.track_type || "";

  const replacements = {
    "{{ACCENT_COLOR}}": char.accent,
    "{{ACCENT_LIGHT}}": char.accentLight,
    "{{ACCENT_DARK}}": char.accentDark,
    "{{ACCENT_GLOW}}": char.accentGlow,
    "{{SERIES_NAME}}": char.series,
    "{{CHAR_NAME}}": char.name,
    "{{CHAR_TYPE}}": char.type,
    "{{CHAR_IMAGE_SRC}}": charImageSrc,
    "{{GRADE}}": data.race.grade || "OP",
    "{{GRADE_CLASS}}": gradeClass(data.race.grade),
    "{{RACE_NAME}}": data.race.name || "レース名",
    "{{VENUE}}": data.race.course_name || "",
    "{{SURFACE}}": surface,
    "{{DISTANCE}}": data.race.distance || "",
    "{{DATA_TITLE}}": char.dataTitle,
    "{{DATA1_LABEL}}": dataRows[0]?.label || "",
    "{{DATA1_VALUE}}": dataRows[0]?.value || "",
    "{{BAR1_PCT}}": dataRows[0]?.pct || "30%",
    "{{DATA2_LABEL}}": dataRows[1]?.label || "",
    "{{DATA2_VALUE}}": dataRows[1]?.value || "",
    "{{BAR2_PCT}}": dataRows[1]?.pct || "30%",
    "{{DATA3_LABEL}}": dataRows[2]?.label || "",
    "{{DATA3_VALUE}}": dataRows[2]?.value || "",
    "{{BAR3_PCT}}": dataRows[2]?.pct || "30%",
    "{{HONMEI_NUMBER}}": data.prediction.umaban || "?",
    "{{HONMEI_NAME}}": data.honmeiName,
    "{{HONMEI_JOCKEY}}": data.honmeiJockey,
    "{{HONMEI_ODDS}}": data.honmeiOdds,
    "{{TAIKOU_NUMBER}}": data.otherPicks[0]?.number || "-",
    "{{TAIKOU_NAME}}": data.otherPicks[0]?.name || "",
    "{{TAIKOU_JOCKEY}}": data.otherPicks[0]?.jockey || "",
    "{{TAIKOU_ODDS}}": data.otherPicks[0]?.odds || "",
    "{{TANPOU_NUMBER}}": data.otherPicks[1]?.number || "-",
    "{{TANPOU_NAME}}": data.otherPicks[1]?.name || "",
    "{{TANPOU_JOCKEY}}": data.otherPicks[1]?.jockey || "",
    "{{TANPOU_ODDS}}": data.otherPicks[1]?.odds || "",
    "{{OSAE_NUMBER}}": data.otherPicks[2]?.number || "-",
    "{{OSAE_NAME}}": data.otherPicks[2]?.name || "",
    "{{OSAE_JOCKEY}}": data.otherPicks[2]?.jockey || "",
    "{{OSAE_ODDS}}": data.otherPicks[2]?.odds || "",
    "{{SERIF}}": data.prediction.comment || `${char.name}の分析結果です。`,
  };

  for (const [key, val] of Object.entries(replacements)) {
    // Use global replace to handle multiple occurrences
    html = html.split(key).join(String(val));
  }

  return html;
}

// ── レンダリング ──
function renderVideo(htmlPath, mp4Path) {
  console.log(`🎬 レンダリング: ${mp4Path}`);
  try {
    execSync(`npx hyperframes render --input "${htmlPath}" --output "${mp4Path}"`, {
      stdio: "inherit",
      cwd: path.dirname(htmlPath),
      timeout: 120000,
    });
    console.log(`✅ 完了: ${mp4Path}`);
  } catch (e) {
    console.error(`❌ レンダリング失敗: ${e.message}`);
  }
}

// ── 対象レース取得 ──
async function getTargetRaces(date) {
  const query = supabase
    .from("races")
    .select("id, name, grade, course_name, race_date, external_id, distance, track_type")
    .order("race_date", { ascending: true });

  if (date) {
    query.eq("race_date", date);
  }

  // 重賞のみ（grade != null）
  query.not("grade", "is", null);

  const { data, error } = await query.limit(20);
  if (error) {
    console.error("❌ レース取得エラー:", error.message);
    return [];
  }
  return data || [];
}

// ── メイン ──
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎬 キャラ予想動画 生成スクリプト");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const outputDir = path.join(__dirname, "output-prediction");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // 対象キャラを決定
  const targetChars = doAll
    ? Object.keys(CHARACTERS)
    : charFilter
      ? [charFilter]
      : ["kazan"]; // デフォルト

  // 対象レースを決定
  let targetRaceIds = [];
  if (raceIdFilter) {
    targetRaceIds = [raceIdFilter];
  } else if (dateFilter) {
    const races = await getTargetRaces(dateFilter);
    if (races.length === 0) {
      console.log(`⚠️ ${dateFilter} の重賞レースが見つかりません`);
      // 重賞がなければ全レースから
      const { data: allRaces } = await supabase
        .from("races")
        .select("id, name")
        .eq("race_date", dateFilter)
        .limit(5);
      if (allRaces?.length) {
        targetRaceIds = allRaces.map(r => r.id);
        console.log(`  → ${allRaces.length}件のレースを使用`);
      }
    } else {
      targetRaceIds = races.map(r => r.id);
      console.log(`📋 ${races.length}件の重賞を検出:`);
      races.forEach(r => console.log(`  - ${r.name} (${r.grade}) @ ${r.course_name}`));
    }
  } else {
    // デフォルト: ai_predictionsにある直近のレースを使用
    const { data: recentPreds } = await supabase
      .from("ai_predictions")
      .select("race_id")
      .order("created_at", { ascending: false })
      .limit(5);
    if (recentPreds?.length) {
      targetRaceIds = [...new Set(recentPreds.map(p => p.race_id))];
    }
  }

  if (targetRaceIds.length === 0) {
    console.error("❌ 対象レースが見つかりません。--race-id or --date を指定してください。");
    process.exit(1);
  }

  console.log(`\n🎯 キャラ: ${targetChars.join(", ")}`);
  console.log(`🏇 レース: ${targetRaceIds.length}件`);
  console.log(`🎬 レンダリング: ${doRender ? "ON" : "OFF"}\n`);

  let generated = 0;
  let skipped = 0;

  for (const raceId of targetRaceIds) {
    for (const charId of targetChars) {
      const char = CHARACTERS[charId];
      if (!char) {
        console.warn(`⚠️ 不明なキャラ: ${charId}`);
        skipped++;
        continue;
      }

      console.log(`\n━━━ ${char.name} × レース ${raceId} ━━━`);

      // データ取得
      const data = await fetchPredictionData(charId, raceId);
      if (!data) {
        skipped++;
        continue;
      }

      console.log(`  ◎ ${data.honmeiName} (${data.prediction.umaban}番)`);
      console.log(`  レース: ${data.race.name} @ ${data.race.course_name}`);

      // HTML生成
      const safeName = data.race.name.replace(/[\/\\:*?"<>|]/g, "_");
      const htmlFileName = `${charId}-${safeName}.html`;
      const htmlPath = path.join(outputDir, htmlFileName);
      const html = buildHTML(char, data);
      fs.writeFileSync(htmlPath, html, "utf-8");
      console.log(`  📄 HTML: ${htmlFileName}`);

      // レンダリング
      if (doRender) {
        const mp4Path = htmlPath.replace(".html", ".mp4");
        renderVideo(htmlPath, mp4Path);
      }

      generated++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 結果: ${generated}件生成, ${skipped}件スキップ`);
  console.log(`📁 出力先: ${outputDir}`);
  if (!doRender) {
    console.log(`💡 MP4にするには --render を追加してください`);
    console.log(`💡 ブラウザでプレビュー: open ${outputDir}/<file>.html`);
  }
}

main().catch(console.error);
