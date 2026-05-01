#!/usr/bin/env node
/**
 * pipeline.mjs — TikTok動画制作パイプライン
 *
 * ワークフロー:
 *   1. node pipeline.mjs fetch --date 2026-05-04        → Supabaseからデータ取得 → content/*.json
 *   2. node pipeline.mjs generate                        → JSON → HTML生成
 *   3. node pipeline.mjs preview                         → レビューダッシュボード表示
 *   4. （JSONを手動編集して修正）
 *   5. node pipeline.mjs generate                        → 再生成
 *   6. node pipeline.mjs render                          → MP4レンダリング
 *   7. node pipeline.mjs post                            → 投稿チェックリスト表示
 *
 * オプション:
 *   --date YYYY-MM-DD    対象日（fetchで使用）
 *   --week               今週末の土日を自動検出
 *   --type prediction|results|data|char|monthly  特定タイプのみ
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "content");
const OUTPUT_DIR = path.join(__dirname, "output-pipeline");
const TEMPLATE_DIR = path.join(__dirname, "templates");
const IMG_BASE = "./predictors";

// ── CLI ──
const args = process.argv.slice(2);
const command = args[0];
const getArg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 && i+1 < args.length ? args[i+1] : null; };
const hasFlag = (n) => args.includes(`--${n}`);
const typeFilter = getArg("type");

// ── Supabase ──
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// ── キャラ設定 ──
const CHARS = {
  hayate: { name:"ハヤテ", type:"データ分析型", color:"#1E40AF", light:"#60A5FA", dark:"#0f1f3d", glow:"rgba(30,64,175,0.5)", series:"📊 数字で語る◎", dataTitle:"📊 データが示す本命" },
  kazan:  { name:"カザン", type:"穴馬予測型", color:"#DC2626", light:"#F87171", dark:"#3d0f0f", glow:"rgba(220,38,38,0.5)", series:"🔥 今週の爆弾", dataTitle:"🔥 人気と実力の乖離" },
  hakusen:{ name:"ハクセン", type:"血統分析型", color:"#059669", light:"#34D399", dark:"#0f3d2a", glow:"rgba(5,150,105,0.5)", series:"🧬 血統の法則", dataTitle:"🧬 血統データが語る" },
  hibari: { name:"ヒバリ", type:"当日データ型", color:"#D97706", light:"#FBBF24", dark:"#3d2a0f", glow:"rgba(217,119,6,0.5)", series:"☀️ 朝イチ速報", dataTitle:"☀️ 当日のシグナル" },
  gantetsu:{ name:"ガンテツ", type:"軸馬特化型", color:"#475569", light:"#94A3B8", dark:"#1e293b", glow:"rgba(71,85,105,0.5)", series:"🛡️ 鉄板の1頭", dataTitle:"🛡️ 全指標の総合評価" },
};

const GRADE_COLORS = { G1:"#f59e0b", G2:"#ef4444", G3:"#22c55e" };

function toRaceKey(externalId) {
  if (!externalId || externalId.length < 12) return externalId;
  const course = externalId.slice(4, 6);
  const year = externalId.slice(2, 4);
  const kai = externalId.slice(7, 8);
  const day = externalId.slice(9, 10);
  const race = externalId.slice(10, 12);
  return course + year + kai + day + race;
}function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function saveContent(filename, data) {
  ensureDir(CONTENT_DIR);
  const p = path.join(CONTENT_DIR, filename);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  💾 ${filename}`);
}

function loadContent(filename) {
  const p = path.join(CONTENT_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// ══════════════════════════════════════════════
// FETCH: Supabaseからデータ取得
// ══════════════════════════════════════════════
async function cmdFetch() {
  if (!supabase) {
    console.error("❌ 環境変数を設定してください:");
    console.error("  export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/gate-in/.env.local | xargs)");
    process.exit(1);
  }

  const dateArg = getArg("date");
  if (!dateArg) {
    console.error("❌ --date YYYY-MM-DD を指定してください");
    process.exit(1);
  }

  console.log(`\n📡 Supabaseからデータ取得: ${dateArg}\n`);

  // 1. 対象レースを取得
  const { data: races, error: raceErr } = await supabase
    .from("races")
    .select("*")
    .eq("race_date", dateArg)
    .order("race_number", { ascending: true });

  if (raceErr || !races?.length) {
    console.error(`❌ ${dateArg} のレースが見つかりません`);
    return;
  }
  console.log(`  🏇 ${races.length}レース検出`);

  // 重賞を優先
  const gradeRaces = races.filter(r => r.grade);
  const targetRaces = gradeRaces.length > 0 ? gradeRaces : races.slice(0, 3);
  console.log(`  🎯 対象: ${targetRaces.map(r => `${r.name}(${r.grade || 'OP'})`).join(", ")}`);

  // 2. 各レースのAI予想を取得
  for (const race of targetRaces) {
    const raceKey = toRaceKey(race.external_id);
    const surface = race.track_type === "turf" ? "芝" : race.track_type === "dirt" ? "ダート" : race.track_type || "";

    // AI予想取得
    const { data: predictions } = await supabase
      .from("ai_predictions")
      .select("*")
      .eq("race_id", race.id);

    if (!predictions?.length) {
      console.log(`  ⚠️ ${race.name}: AI予想なし、スキップ`);
      continue;
    }

    // JRDB出馬データ取得
    const { data: entries } = await supabase
      .from("jrdb_race_entries")
      .select("*")
      .eq("race_key", raceKey);

    const entryMap = {};
    (entries || []).forEach(e => { entryMap[e.umaban] = e; });

    // sire_name 補完（jrdb_horses から取得）
    const horseCodes = (entries || []).filter(e => !e.sire_name && e.horse_code).map(e => e.horse_code);
    if (horseCodes.length > 0) {
      const { data: horses } = await supabase.from("jrdb_horses").select("horse_code, sire_name, dam_sire_name").in("horse_code", horseCodes);
      const horseMap = {};
      (horses || []).forEach(h => { horseMap[h.horse_code] = h; });
      for (const e of (entries || [])) {
        if (!e.sire_name && e.horse_code && horseMap[e.horse_code]) {
          e.sire_name = horseMap[e.horse_code].sire_name;
          e.dam_sire_name = horseMap[e.horse_code].dam_sire_name;
          entryMap[e.umaban] = e;
        }
      }
      console.log(`  🧬 sire_name補完: ${horses?.length || 0}頭`);
    }
    // 結果データ取得（あれば）
    const { data: results } = await supabase
      .from("jrdb_race_results")
      .select("*")
      .eq("race_key", raceKey);

    const resultMap = {};
    (results || []).forEach(r => { resultMap[r.umaban] = r; });

    // キャラ別に予想コンテンツJSON生成
    for (const pred of predictions) {
      const charId = pred.predictor_id;
      const char = CHARS[charId];
      if (!char) continue;

      const honmeiEntry = entryMap[pred.umaban] || {};
      const autoOAD = scoreEntriesForChar(charId, entries || [], pred.umaban);
      const honmeiResult = resultMap[pred.umaban];

      // ○▲△の情報取得
      const getPickInfo = (umaban) => {
        if (!umaban) return { number: "-", name: "未定", jockey: "", odds: "" };
        const e = entryMap[umaban] || {};
        return {
          number: umaban,
          name: e.horse_name?.trim() || `${umaban}番`,
          jockey: e.jockey_name?.trim() || "",
          odds: e.base_odds ? `${e.base_odds}倍` : "",
        };
      };

      const dataRows = buildDataRows(charId, honmeiEntry);

      const content = {
        type: "prediction",
        charId,
        charName: char.name,
        charType: char.type,
        series: char.series,
        accent: char.color,
        accentLight: char.light,
        accentDark: char.dark,
        accentGlow: char.glow,
        dataTitle: char.dataTitle,
        race: {
          id: race.id,
          name: race.name,
          grade: race.grade || "OP",
          gradeColor: GRADE_COLORS[race.grade] || "#6366f1",
          venue: race.course_name,
          surface,
          distance: race.distance,
          date: race.race_date,
        },
        honmei: {
          number: pred.umaban,
          name: honmeiEntry.horse_name?.trim() || pred.horse_name || `${pred.umaban}番`,
          jockey: honmeiEntry.jockey_name?.trim() || "",
          odds: honmeiEntry.base_odds ? `${honmeiEntry.base_odds}倍` : "",
        },
        taikou: entryToPickInfo(autoOAD.taikou),
        tanpou: entryToPickInfo(autoOAD.tanpou),
        osae: entryToPickInfo(autoOAD.osae),
        dataRows,
        serif: pred.comment || `${char.name}の分析結果です。`,
        // 結果（あれば）
        result: honmeiResult ? {
          finish: honmeiResult.finish_position,
          hit: honmeiResult.finish_position <= 3,
        } : null,
      };

      const safeName = race.name.replace(/[\/\\:*?"<>|]/g, "_");
      saveContent(`prediction-${charId}-${safeName}.json`, content);
    }

    // 結果速報用コンテンツ（結果データがある場合）
    if (results?.length > 0 && predictions.length >= 3) {
      const resultsContent = {
        type: "results",
        race: {
          name: race.name,
          grade: race.grade || "OP",
          gradeColor: GRADE_COLORS[race.grade] || "#6366f1",
          venue: race.course_name,
          surface,
          distance: race.distance,
        },
        characters: predictions.map(pred => {
          const charId = pred.predictor_id;
          const char = CHARS[charId];
          const res = resultMap[pred.umaban];
          const entry = entryMap[pred.umaban] || {};
          return {
            id: charId,
            name: char?.name || charId,
            type: char?.type || "",
            color: char?.color || "#666",
            light: char?.light || "#999",
            pick: {
              num: pred.umaban,
              name: entry.horse_name?.trim() || `${pred.umaban}番`,
            },
            finish: res?.finish_position || "?",
            hit: res ? res.finish_position <= 3 : false,
            comment: res
              ? (res.finish_position <= 3 ? `${res.finish_position}着的中！` : `${res.finish_position}着 不的中`)
              : "結果未確定",
          };
        }),
        hitCount: 0,
        kaishuu: 0,
      };
      resultsContent.hitCount = resultsContent.characters.filter(c => c.hit).length;
      // 回収率は簡易計算（本来はオッズ×的中を計算）
      resultsContent.kaishuu = resultsContent.hitCount > 0 ? Math.round((resultsContent.hitCount / resultsContent.characters.length) * 150) : 0;

      const safeName = race.name.replace(/[\/\\:*?"<>|]/g, "_");
      saveContent(`results-${safeName}.json`, resultsContent);
    }
  }

  console.log(`\n✅ content/ にJSONファイルを保存しました`);
  console.log(`💡 内容を確認・編集: code content/`);
  console.log(`💡 次: node pipeline.mjs generate`);
}

// ── キャラ別スコアリングで○▲△を自動算出 ──
function scoreEntriesForChar(charId, allEntries, honmeiUmaban) {
  const scored = (allEntries || []).filter(e => e.umaban !== honmeiUmaban).map(e => {
    let score = 0;
    const idm = parseFloat(e.idm) || 0;
    const jockey = parseFloat(e.jockey_index) || 0;
    const training = parseFloat(e.training_index) || 0;
    const composite = parseFloat(e.composite_index) || 0;
    const odds = parseFloat(e.base_odds) || 99;
    const agari = parseFloat(e.agari_index) || 0;
    switch (charId) {
      case "hayate": score = idm * 0.8 + jockey * 0.2; break;
      case "kazan": score = (idm + training * 0.5) * Math.log(Math.max(odds, 1.1)); break;
      case "hakusen": score = idm * 0.7 + agari * 0.3; break;
      case "hibari": score = idm * 0.6 + training * 0.4; break;
      case "gantetsu": score = composite > 0 ? composite : idm; break;
      default: score = idm;
    }
    return { umaban: e.umaban, score, entry: e };
  }).sort((a, b) => b.score - a.score);
  return { taikou: scored[0]?.entry || null, tanpou: scored[1]?.entry || null, osae: scored[2]?.entry || null };
}

function entryToPickInfo(entry) {
  if (!entry) return { number: "-", name: "未定", jockey: "", odds: "" };
  return { number: entry.umaban, name: entry.horse_name?.trim() || entry.umaban+"番", jockey: entry.jockey_name?.trim() || "", odds: entry.base_odds ? entry.base_odds+"倍" : "" };
}
function buildDataRows(charId, entry) {
  const e = entry || {};
  const clamp = (v, max) => v ? `${Math.min(100, Math.max(10, (parseFloat(v)/max)*100)).toFixed(0)}%` : "30%";
  const clampInv = (v, max) => v ? `${Math.min(100, Math.max(10, 100-(parseFloat(v)/max)*100)).toFixed(0)}%` : "30%";

  switch (charId) {
    case "hayate": return [
      { label:"IDM（総合指数）", value: e.idm ? `${e.idm}` : "N/A", pct: clamp(e.idm, 80) },
      { label:"騎手指数", value: e.jockey_index ? `${e.jockey_index}` : "N/A", pct: clamp(e.jockey_index, 80) },
      { label:"テン指数（スタート力）", value: e.ten_index ? `${e.ten_index}` : "N/A", pct: clamp(e.ten_index, 80) },
    ];
    case "kazan": return [
      { label:"基準オッズ", value: e.base_odds ? `${e.base_odds}倍` : "N/A", pct: clampInv(e.base_odds, 50) },
      { label:"IDM（実力値）", value: e.idm ? `${e.idm}` : "N/A", pct: clamp(e.idm, 80) },
      { label:"調教指数（実力の裏付け）", value: e.training_index ? `${e.training_index}` : "N/A", pct: clamp(e.training_index, 80) },
    ];
    case "hakusen": return [
      { label:"父馬", value: e.sire_name?.trim() || "確認中", pct: "70%" },
      { label:"IDM", value: e.idm ? `${e.idm}` : "N/A", pct: clamp(e.idm, 80) },
      { label:"上がり指数", value: e.agari_index ? `${e.agari_index}` : "N/A", pct: clamp(e.agari_index, 80) },
    ];
    case "hibari": return [
      { label:"馬体重変動", value: e.weight_diff != null ? `${e.weight_diff > 0 ? '+' : ''}${e.weight_diff}kg` : "未発表", pct: "50%" },
      { label:"IDM", value: e.idm ? `${e.idm}` : "N/A", pct: clamp(e.idm, 80) },
      { label:"調教指数", value: e.training_index ? `${e.training_index}` : "N/A", pct: clamp(e.training_index, 80) },
    ];
    case "gantetsu": return [
      { label:"総合指数", value: e.composite_index ? `${e.composite_index}` : "N/A", pct: clamp(e.composite_index, 80) },
      { label:"IDM", value: e.idm ? `${e.idm}` : "N/A", pct: clamp(e.idm, 80) },
      { label:"位置指数", value: e.position_index ? `${e.position_index}` : "N/A", pct: clamp(e.position_index, 80) },
    ];
    default: return [
      { label:"IDM", value:"N/A", pct:"30%" },
      { label:"指数", value:"N/A", pct:"30%" },
      { label:"データ", value:"N/A", pct:"30%" },
    ];
  }
}

// ══════════════════════════════════════════════
// GENERATE: JSON → HTML
// ══════════════════════════════════════════════
function cmdGenerate() {
  ensureDir(OUTPUT_DIR);

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith(".json"));
  if (files.length === 0) {
    console.error("❌ content/ にJSONファイルがありません");
    console.error("  先に: node pipeline.mjs fetch --date YYYY-MM-DD");
    return;
  }

  console.log(`\n🎬 HTML生成: ${files.length}ファイル\n`);

  let count = 0;
  for (const file of files) {
    const content = loadContent(file);
    if (!content) continue;

    if (typeFilter && content.type !== typeFilter) continue;

    let html;
    if (content.type === "prediction") {
      html = generatePrediction(content);
    } else if (content.type === "results") {
      html = generateResults(content);
    } else {
      console.log(`  ⚠️ 不明なタイプ: ${content.type} (${file})`);
      continue;
    }

    const outName = file.replace(".json", ".html");
    fs.writeFileSync(path.join(OUTPUT_DIR, outName), html, "utf-8");
    console.log(`  ✅ ${outName}`);
    count++;
  }

  // レビューダッシュボード生成
  generateDashboard();

  console.log(`\n📊 ${count}本のHTMLを生成`);
  console.log(`💡 次: node pipeline.mjs preview`);
}

function generatePrediction(c) {
  let html = fs.readFileSync(path.join(TEMPLATE_DIR, "prediction", "index.html"), "utf-8");
  const reps = {
    "{{ACCENT_COLOR}}": c.accent, "{{ACCENT_LIGHT}}": c.accentLight,
    "{{ACCENT_DARK}}": c.accentDark, "{{ACCENT_GLOW}}": c.accentGlow,
    "{{SERIES_NAME}}": c.series, "{{CHAR_NAME}}": c.charName, "{{CHAR_TYPE}}": c.charType,
    "{{CHAR_IMAGE_SRC}}": `${IMG_BASE}/${c.charId}.png`,
    "{{GRADE}}": c.race.grade, "{{GRADE_COLOR}}": c.race.gradeColor,
    "{{GRADE_CLASS}}": "", "{{RACE_NAME}}": c.race.name,
    "{{VENUE}}": c.race.venue, "{{SURFACE}}": c.race.surface, "{{DISTANCE}}": c.race.distance,
    "{{DATA_TITLE}}": c.dataTitle,
    "{{DATA1_LABEL}}": c.dataRows[0]?.label || "", "{{DATA1_VALUE}}": c.dataRows[0]?.value || "", "{{BAR1_PCT}}": c.dataRows[0]?.pct || "30%",
    "{{DATA2_LABEL}}": c.dataRows[1]?.label || "", "{{DATA2_VALUE}}": c.dataRows[1]?.value || "", "{{BAR2_PCT}}": c.dataRows[1]?.pct || "30%",
    "{{DATA3_LABEL}}": c.dataRows[2]?.label || "", "{{DATA3_VALUE}}": c.dataRows[2]?.value || "", "{{BAR3_PCT}}": c.dataRows[2]?.pct || "30%",
    "{{HONMEI_NUMBER}}": c.honmei.number, "{{HONMEI_NAME}}": c.honmei.name,
    "{{HONMEI_JOCKEY}}": c.honmei.jockey, "{{HONMEI_ODDS}}": c.honmei.odds,
    "{{TAIKOU_NUMBER}}": c.taikou.number, "{{TAIKOU_NAME}}": c.taikou.name,
    "{{TAIKOU_JOCKEY}}": c.taikou.jockey, "{{TAIKOU_ODDS}}": c.taikou.odds,
    "{{TANPOU_NUMBER}}": c.tanpou.number, "{{TANPOU_NAME}}": c.tanpou.name,
    "{{TANPOU_JOCKEY}}": c.tanpou.jockey, "{{TANPOU_ODDS}}": c.tanpou.odds,
    "{{OSAE_NUMBER}}": c.osae.number, "{{OSAE_NAME}}": c.osae.name,
    "{{OSAE_JOCKEY}}": c.osae.jockey, "{{OSAE_ODDS}}": c.osae.odds,
    "{{SERIF}}": c.serif,
  };
  for (const [k, v] of Object.entries(reps)) html = html.split(k).join(String(v));
  return html;
}

function generateResults(c) {
  let html = fs.readFileSync(path.join(TEMPLATE_DIR, "results", "index.html"), "utf-8");

  // Dynamic char HTML
  const charHTML = c.characters.map((ch, i) => `
<div class="cres" id="cr${i}">
  <div class="cimg" id="ci${i}" style="border-color:${ch.color}"><img src="${IMG_BASE}/${ch.id}.png" alt=""></div>
  <div class="cname" id="cn${i}">${ch.name}</div>
  <div class="ctype" id="ct${i}">${ch.type}</div>
  <div class="pickbox" id="pb${i}" style="border-color:${ch.color}">
    <div class="picklbl" style="color:${ch.light}">◎ 本命</div>
    <div class="pickname">${ch.pick.num}番 ${ch.pick.name}</div>
    <div class="pickinfo">結果: ${ch.finish}着</div>
  </div>
  <div class="rmark ${ch.hit?'hit':'miss'}" id="rm${i}">${ch.hit?'✓':'×'}</div>
  <div class="rtxt" id="rt${i}" style="color:${ch.hit?'#22c55e':'#ef4444'}">${ch.comment}</div>
</div>`).join("\n");

  const charAnim = c.characters.map((_, i) => {
    const t = 3 + i * 3;
    const prev = i > 0 ? `t.to("#cr${i-1}",{opacity:0,duration:0.25},${(t-0.3).toFixed(1)});\n` : "";
    return `${prev}t.to("#cr${i}",{opacity:1,duration:0.2},${t.toFixed(1)})
.to("#ci${i}",{opacity:1,duration:0.3},${(t+0.1).toFixed(1)}).from("#ci${i}",{scale:0.5,duration:0.3,ease:"back.out(1.5)"},${(t+0.1).toFixed(1)})
.to("#cn${i}",{opacity:1,duration:0.2},${(t+0.3).toFixed(1)})
.to("#ct${i}",{opacity:1,duration:0.2},${(t+0.4).toFixed(1)})
.to("#pb${i}",{opacity:1,duration:0.3},${(t+0.6).toFixed(1)}).from("#pb${i}",{x:-60,duration:0.3},${(t+0.6).toFixed(1)})
.to("#rm${i}",{opacity:1,scale:1,duration:0.4,ease:"elastic.out(1,0.5)"},${(t+1.2).toFixed(1)}).from("#rm${i}",{scale:3,duration:0.4,ease:"elastic.out(1,0.5)"},${(t+1.2).toFixed(1)})
.to("#rt${i}",{opacity:1,duration:0.3},${(t+1.7).toFixed(1)});`;
  }).join("\n") + `\nt.to("#cr${c.characters.length-1}",{opacity:0,duration:0.25},17.4);`;

  const scoreHTML = c.characters.map((ch, i) => `
<div class="srow" id="sr${i}" style="top:${480+i*154}px">
  <div class="simg" style="border-color:${ch.color}"><img src="${IMG_BASE}/${ch.id}.png" alt=""></div>
  <div class="sname">${ch.name}</div>
  <div class="spick">◎${ch.pick.num}番 ${ch.pick.name} → ${ch.finish}着</div>
  <div class="sbadge ${ch.hit?'hit':'miss'}">${ch.hit?'✓':'×'}</div>
</div>`).join("\n");

  const scoreAnim = c.characters.map((_, i) => {
    const t = 18.5 + i * 0.4;
    return `t.to("#sr${i}",{opacity:1,x:0,duration:0.3},${t.toFixed(1)}).from("#sr${i}",{x:-60,duration:0.3},${t.toFixed(1)});`;
  }).join("\n");

  html = html.replace("{{#CHAR_RESULTS}}", charHTML);
  html = html.replace("{{#SCOREBOARD_ROWS}}", scoreHTML);
  html = html.replace("{{#CHAR_ANIMATIONS}}", charAnim);
  html = html.replace("{{#SCOREBOARD_ANIMATIONS}}", scoreAnim);

  const reps = {
    "{{RACE_NAME}}": c.race.name, "{{GRADE}}": c.race.grade, "{{GRADE_COLOR}}": c.race.gradeColor,
    "{{VENUE}}": c.race.venue, "{{SURFACE}}": c.race.surface, "{{DISTANCE}}": c.race.distance,
    "{{HIT_COUNT}}": c.hitCount, "{{KAISHUU}}": c.kaishuu,
  };
  for (const [k, v] of Object.entries(reps)) html = html.split(k).join(String(v));
  return html;
}

// ══════════════════════════════════════════════
// DASHBOARD: レビュー一覧ページ生成
// ══════════════════════════════════════════════
function generateDashboard() {
  const htmlFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".html") && f !== "dashboard.html");

  const cards = htmlFiles.map(f => {
    const jsonName = f.replace(".html", ".json");
    const content = loadContent(jsonName);
    const label = content
      ? `${content.type === "prediction" ? "予想" : "結果"}: ${content.charName || ""} × ${content.race?.name || ""}`
      : f;
    const status = content?.type || "unknown";
    const color = status === "prediction" ? "#60a5fa" : status === "results" ? "#22c55e" : "#999";

    return `<div class="card" onclick="loadVideo('${f}')">
      <div class="dot" style="background:${color}"></div>
      <div class="info"><div class="label">${label}</div><div class="file">${f}</div></div>
      <div class="actions">
        <button onclick="event.stopPropagation();openJson('${jsonName}')">📝 JSON</button>
        <button class="ok" onclick="event.stopPropagation();markOK('${f}',this)">✅</button>
      </div>
    </div>`;
  }).join("\n");

  const dashboard = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>TikTok動画レビュー</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#111;color:#fff;display:flex;height:100vh}
.sidebar{width:420px;background:#1a1a1a;border-right:1px solid #333;overflow-y:auto;padding:16px}
.sidebar h1{font-size:18px;margin-bottom:12px;color:#999}
.card{display:flex;align-items:center;gap:10px;padding:12px;border-radius:10px;cursor:pointer;margin-bottom:8px;border:1px solid #333;transition:all .15s}
.card:hover{border-color:#666;background:#222}
.card.active{border-color:#60a5fa;background:#1a2a3a}
.card.done{opacity:0.5}
.dot{width:10px;height:10px;border-radius:5px;flex-shrink:0}
.info{flex:1;min-width:0}
.label{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.file{font-size:11px;color:#666;margin-top:2px}
.actions{display:flex;gap:4px}
.actions button{padding:4px 8px;border:1px solid #444;background:#222;color:#fff;border-radius:6px;font-size:11px;cursor:pointer}
.actions button:hover{background:#333}
.actions button.ok.checked{background:#16a34a;border-color:#16a34a}
.main{flex:1;display:flex;flex-direction:column;align-items:center;padding:20px;background:#0a0a0a}
.controls{display:flex;gap:10px;margin-bottom:16px}
.controls button{padding:8px 16px;border:1px solid #444;background:#222;color:#fff;border-radius:8px;cursor:pointer;font-size:13px}
.controls button:hover{background:#333}
.phone{width:270px;height:480px;border:2px solid #333;border-radius:20px;overflow:hidden}
iframe{width:1080px;height:1920px;border:none;transform:scale(0.25);transform-origin:top left}
.status{margin-top:12px;font-size:12px;color:#666}
.checklist{margin-top:20px;padding:16px;background:#1a1a1a;border-radius:12px;width:300px}
.checklist h3{font-size:14px;color:#999;margin-bottom:8px}
.checklist .item{font-size:12px;color:#666;padding:4px 0}
</style></head><body>
<div class="sidebar">
<h1>🎬 TikTok動画レビュー (${htmlFiles.length}本)</h1>
${cards}
<div style="margin-top:20px;padding:12px;background:#222;border-radius:8px">
<div style="font-size:12px;color:#888">ワークフロー</div>
<div style="font-size:11px;color:#555;margin-top:4px;line-height:1.6">
1. 動画クリック → プレビュー再生<br>
2. 📝 JSON → 内容を編集<br>
3. ターミナル: node pipeline.mjs generate<br>
4. ブラウザリロード<br>
5. ✅ ボタンで承認<br>
6. 全部✅ → node pipeline.mjs render
</div></div>
</div>
<div class="main">
<div class="controls">
<button onclick="playVideo()">▶ 再生</button>
<button onclick="pauseVideo()">⏸ 停止</button>
<button onclick="restartVideo()">⏮ 最初から</button>
</div>
<div class="phone"><iframe id="viewer" src=""></iframe></div>
<div class="status" id="status">← 左から動画を選択</div>
<div class="checklist">
<h3>投稿前チェックリスト</h3>
<div class="item">□ テキスト内容に誤りがないか</div>
<div class="item">□ キャラ画像が正しく表示されるか</div>
<div class="item">□ アニメーションのタイミングは適切か</div>
<div class="item">□ ウォーターマークが表示されるか</div>
<div class="item">□ CTAの内容は正しいか</div>
</div>
</div>
<script>
let currentFile='';
function loadVideo(f){
  currentFile=f;
  document.getElementById('viewer').src=f;
  document.getElementById('status').textContent='読込中: '+f;
  document.querySelectorAll('.card').forEach(c=>c.classList.remove('active'));
  event.currentTarget.classList.add('active');
  setTimeout(()=>{document.getElementById('status').textContent='再生待機: '+f;},1000);
}
function getTL(){
  try{
    const w=document.getElementById('viewer').contentWindow;
    return w.__timelines?Object.values(w.__timelines)[0]:null;
  }catch(e){return null;}
}
function playVideo(){const t=getTL();if(t){t.play();document.getElementById('status').textContent='再生中: '+currentFile;}}
function pauseVideo(){const t=getTL();if(t)t.pause();}
function restartVideo(){const t=getTL();if(t){t.restart();document.getElementById('status').textContent='再生中: '+currentFile;}}
function openJson(f){
  alert('JSONを編集してください:\\n\\ncontent/'+f+'\\n\\n編集後: node pipeline.mjs generate');
}
function markOK(f,btn){
  btn.classList.toggle('checked');
  btn.closest('.card').classList.toggle('done');
}
</script></body></html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "dashboard.html"), dashboard, "utf-8");
}

// ══════════════════════════════════════════════
// PREVIEW: ダッシュボードを開く
// ══════════════════════════════════════════════
function cmdPreview() {
  const dashPath = path.join(OUTPUT_DIR, "dashboard.html");
  if (!fs.existsSync(dashPath)) {
    console.error("❌ ダッシュボードがありません。先に: node pipeline.mjs generate");
    return;
  }
  console.log(`\n🖥️  レビューダッシュボードを開きます`);
  try { execSync(`open "${dashPath}"`); } catch { console.log(`  → ${dashPath}`); }
}

// ══════════════════════════════════════════════
// RENDER: MP4レンダリング
// ══════════════════════════════════════════════
function cmdRender() {
  const htmlFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".html") && f !== "dashboard.html");
  if (htmlFiles.length === 0) {
    console.error("❌ HTMLファイルがありません");
    return;
  }

  console.log(`\n🎬 MP4レンダリング: ${htmlFiles.length}本 (Docker)\n`);

  const renderTmp = path.join(__dirname, "render-tmp");
  const predictorsSrc = path.join(__dirname, "..", "..", "public", "images", "predictors");

  for (const file of htmlFiles) {
    const htmlPath = path.join(OUTPUT_DIR, file);
    const mp4Path = htmlPath.replace(".html", ".mp4");
    console.log(`  🎬 ${file}...`);
    try {
      // render-tmp準備
      if (fs.existsSync(renderTmp)) fs.rmSync(renderTmp, { recursive: true });
      fs.mkdirSync(renderTmp, { recursive: true });
      const predDest = path.join(renderTmp, "predictors");
      fs.mkdirSync(predDest, { recursive: true });

      // HTML → index.html
      fs.copyFileSync(htmlPath, path.join(renderTmp, "index.html"));

      // 画像コピー（png + webp）
      for (const img of fs.readdirSync(predictorsSrc)) {
        fs.copyFileSync(path.join(predictorsSrc, img), path.join(predDest, img));
      }

      execSync(`npx hyperframes render --input "${renderTmp}" --output "${mp4Path}" --docker`, {
        stdio: "inherit", timeout: 600000,
      });
      console.log(`  ✅ ${file.replace(".html",".mp4")}`);
    } catch (e) {
      console.error(`  ❌ 失敗: ${e.message}`);
    }
  }

  // クリーンアップ
  if (fs.existsSync(renderTmp)) fs.rmSync(renderTmp, { recursive: true });
  console.log(`\n💡 次: node pipeline.mjs post`);
}


// ══════════════════════════════════════════════
// POST: 投稿チェックリスト
// ══════════════════════════════════════════════
function cmdPost() {
  const mp4Files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".mp4"));
  if (mp4Files.length === 0) {
    console.error("❌ MP4ファイルがありません。先に: node pipeline.mjs render");
    return;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📱 TikTok投稿チェックリスト`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`📁 MP4ファイル (${mp4Files.length}本):`);
  mp4Files.forEach((f, i) => console.log(`  ${i+1}. ${f}`));

  console.log(`\n📋 投稿手順:`);
  console.log(`  1. TikTokアプリで「+」→ 動画をアップロード`);
  console.log(`  2. キャプション例:`);
  console.log(`     ─────────────────────────`);

  // JSONから投稿テキストを生成
  const jsonFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith(".json"));
  for (const jf of jsonFiles) {
    const c = loadContent(jf);
    if (!c) continue;
    const mp4Name = jf.replace(".json", ".mp4");
    if (!mp4Files.includes(mp4Name)) continue;

    if (c.type === "prediction") {
      console.log(`\n  📄 ${mp4Name}:`);
      console.log(`     ${c.charName}の${c.race.name}予想🏇`);
      console.log(`     ◎${c.honmei.number}番 ${c.honmei.name}`);
      console.log(`     #競馬予想 #AI予想 #${c.race.name.replace(/\s/g,'')} #${c.charName}`);
    } else if (c.type === "results") {
      console.log(`\n  📄 ${mp4Name}:`);
      console.log(`     ${c.race.name} 結果速報🏆`);
      console.log(`     的中${c.hitCount}/${c.characters.length}体！`);
      console.log(`     #競馬結果 #AI予想 #${c.race.name.replace(/\s/g,'')}`);
    }
  }

  console.log(`\n  3. ハッシュタグ追加:`);
  console.log(`     #競馬 #競馬予想 #AI予想 #ゲートイン #keiba`);
  console.log(`  4. サウンド: オリジナルサウンド or トレンド音楽`);
  console.log(`  5. 公開設定: 公開`);
  console.log(`  6. 投稿！🚀`);
}

// ══════════════════════════════════════════════
// HELP
// ══════════════════════════════════════════════
function showHelp() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 TikTok動画パイプライン
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

使い方:
  node pipeline.mjs <command> [options]

コマンド:
  fetch     Supabaseからデータ取得 → content/*.json
  generate  JSON → HTML生成 + レビューダッシュボード
  preview   レビューダッシュボードを開く
  publish   Supabaseにアップロード + Slack通知 → admin画面でレビュー
  render    HTML → MP4レンダリング（Hyperframes）
  post      投稿チェックリスト＋キャプション生成

ワークフロー:
  1. node pipeline.mjs fetch --date 2026-05-04
  2. node pipeline.mjs generate
  3. node pipeline.mjs publish        ← Slack通知 + admin画面レビュー
  4. admin画面で内容確認・編集・承認
  5. node pipeline.mjs render
  6. node pipeline.mjs post           ← TikTok投稿
`);
}

// ══════════════════════════════════════════════
// PUBLISH: Supabaseにアップロード + Slack通知
// ══════════════════════════════════════════════
async function cmdPublish() {
  if (!supabase) {
    console.error("❌ Supabase環境変数を設定してください");
    process.exit(1);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith(".json"));
  if (files.length === 0) {
    console.error("❌ content/ にJSONファイルがありません");
    return;
  }

  console.log(`\n📤 ${files.length}本のコンテンツをSupabaseにアップロード\n`);
  const uploaded = [];

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8"));

    // キャプション自動生成
    let caption = "";
    if (content.type === "prediction") {
      caption = `${content.charName}の${content.race.name}予想🏇\n◎${content.honmei.number}番 ${content.honmei.name}\n${content.serif || ""}`;
    } else if (content.type === "results") {
      const hit = content.characters?.filter(c => c.hit).length || 0;
      caption = `${content.race.name} 結果速報🏆\n的中${hit}/${content.characters?.length || 0}体！`;
    }

    const record = {
      type: content.type,
      status: "review",
      race_name: content.race?.name || null,
      race_date: content.race?.date || null,
      character_id: content.charId || null,
      character_name: content.charName || null,
      content: content,
      caption: caption,
    };

    const { data, error } = await supabase
      .from("tiktok_videos")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.log(`  ❌ ${file}: ${error.message}`);
      continue;
    }
    uploaded.push(data);
    console.log(`  ✅ ${file} → status: review`);
  }

  // Slack通知
  const slackWebhook = process.env.SLACK_WEBHOOK_SNS;
  if (slackWebhook && uploaded.length > 0) {
    const adminUrl = "https://gate-in.jp/admin?tab=tiktok";
    const text = `🎬 TikTok動画 ${uploaded.length}本がレビュー待ちです\n\n` +
      uploaded.map(v => {
        const emoji = v.type === "prediction" ? "🎯" : v.type === "results" ? "🏆" : "📊";
        return `${emoji} ${v.character_name || ""} × ${v.race_name || v.type}`;
      }).join("\n") +
      `\n\n📋 レビュー: ${adminUrl}`;
    try {
      await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      console.log(`\n  📢 Slack通知送信完了`);
    } catch (e) {
      console.log(`\n  ⚠️ Slack通知スキップ: ${e.message}`);
    }
  }

  console.log(`\n📊 ${uploaded.length}/${files.length}本アップロード完了`);
  console.log(`💡 admin画面でレビュー: https://gate-in.jp/admin?tab=tiktok`);
}

// ── Main ──
async function main() {
  switch (command) {
    case "fetch": await cmdFetch(); break;
    case "generate": cmdGenerate(); break;
    case "preview": cmdPreview(); break;
    case "render": cmdRender(); break;
    case "publish": await cmdPublish(); break;
    case "post": cmdPost(); break;
    default: showHelp();
  }
}

main().catch(console.error);
