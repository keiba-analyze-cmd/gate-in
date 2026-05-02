/**
 * 週次AI予想パイプライン
 *
 * Usage:
 *   node src/lib/jrdb/weekly-pipeline.js download 260426  # JRDBデータDL
 *   node src/lib/jrdb/weekly-pipeline.js predict 260426   # AI予想生成
 *   node src/lib/jrdb/weekly-pipeline.js results 260426   # 結果データ取込
 *   node src/lib/jrdb/weekly-pipeline.js all 260426       # 全部実行
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const iconv = require('iconv-lite');

// ─── 設定読み込み ───
const ROOT = path.resolve(__dirname, '../../..');
const envFile = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
const getEnv = (key) => { const m = envFile.match(new RegExp(key + '=(.+)')); return m ? m[1].trim() : null; };

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const ANTHROPIC_KEY = getEnv('ANTHROPIC_API_KEY');
const RAW = path.join(ROOT, 'data/jrdb/raw');

const credsPath = path.join(RAW, '.jrdb_creds');
let JRDB_ID, JRDB_PW;
if (fs.existsSync(credsPath)) {
  const creds = fs.readFileSync(credsPath, 'utf8');
  JRDB_ID = creds.match(/JRDB_ID='(.+)'/)?.[1];
  JRDB_PW = creds.match(/JRDB_PW='(.+)'/)?.[1];
}

// ─── ユーティリティ ───
const ext = (b, s, l) => iconv.decode(b.subarray(s - 1, s - 1 + l), 'cp932').trim();
const num = (b, s, l) => { const v = parseFloat(ext(b, s, l)); return isNaN(v) ? null : v; };
const numS = (b, s, l) => { const r = ext(b, s, l).replace(/\s+/g, ''); const v = parseFloat(r); return isNaN(v) ? null : v; };
const COURSES = { '01': '札幌', '02': '函館', '03': '福島', '04': '新潟', '05': '東京', '06': '中山', '07': '中京', '08': '京都', '09': '阪神', '10': '小倉' };

async function supabaseQuery(path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  return r.json();
}
async function supabaseUpsert(table, rows, conflict) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?on_conflict=' + conflict, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify(rows)
  });
  return { ok: r.ok, status: r.status };
}
async function callClaude(prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, messages: [{ role: 'user', content: prompt }] })
  });
  const data = await r.json();
  return data.content?.[0]?.text || null;
}

// ─── パーサー ───
function loadKYG(date) {
  const fp = path.join(RAW, 'JRDB' + date, 'KYG' + date + '.txt');
  if (!fs.existsSync(fp)) return [];
  const buf = fs.readFileSync(fp); const RL = 543, recs = []; let o = 0;
  while (o + RL <= buf.length) { const l = buf.subarray(o, o + RL);
    recs.push({ rk: ext(l,1,8), umaban: num(l,9,2), horse_name: ext(l,19,36), blood: ext(l,11,8),
      idm: num(l,55,5), jockey_index: num(l,60,5), info_index: num(l,65,5), sogo_index: num(l,85,5),
      running_style: num(l,90,1), distance_aptitude: num(l,91,1),
      base_odds: num(l,96,5), base_popularity: num(l,101,2),
      training_index: num(l,145,5), stable_index: num(l,150,5),
      jockey_name: ext(l,172,12), jockey_code: ext(l,266,5),
      trainer_name: ext(l,188,12), trainer_code: ext(l,271,5),
      ten_index: num(l,359,5), agari_index: num(l,369,5), position_index: num(l,374,5),
      pace_prediction: ext(l,379,1), waku: num(l,254,1), sogo_mark: num(l,257,1), idm_mark: num(l,258,1) });
    o += RL; if (o < buf.length && buf[o] === 0x0d) o++; if (o < buf.length && buf[o] === 0x0a) o++;
  }
  return recs;
}
function loadSEC(date) {
  const fp = path.join(RAW, 'SEC' + date, 'SEC' + date + '.txt');
  if (!fs.existsSync(fp)) return [];
  const buf = fs.readFileSync(fp); const RL = 344, recs = []; let o = 0;
  while (o + RL <= buf.length) { const l = buf.subarray(o, o + RL);
    recs.push({ rk: ext(l,1,8), umaban: num(l,9,2), blood: ext(l,11,8), race_date: ext(l,19,8),
      horse_name: ext(l,27,36), distance: num(l,63,4), surface_code: num(l,67,1),
      baba: num(l,70,2), grade: num(l,80,1), race_name: ext(l,81,50), head_count: num(l,131,2),
      finish_order: num(l,141,2), anomaly: num(l,143,1), finish_time: num(l,144,4),
      jockey_name: ext(l,151,12), trainer_name: ext(l,163,12),
      final_odds: num(l,175,6), final_pop: num(l,181,2), result_idm: num(l,183,3),
      race_pace: ext(l,222,1), result_ten: num(l,224,5), result_agari: num(l,229,5),
      horse_weight: num(l,333,3), horse_weight_change: numS(l,336,3) });
    o += RL; if (o < buf.length && buf[o] === 0x0d) o++; if (o < buf.length && buf[o] === 0x0a) o++;
  }
  return recs;
}
function loadUKC(date) {
  const fp = path.join(RAW, 'JRDB' + date, 'UKC' + date + '.txt');
  if (!fs.existsSync(fp)) return new Map();
  const buf = fs.readFileSync(fp); const RL = 290, m = new Map(); let o = 0;
  while (o + RL <= buf.length) { const l = buf.subarray(o, o + RL);
    m.set(ext(l,1,8), { sire: ext(l,50,36), dam: ext(l,86,36), bms: ext(l,122,36) });
    o += RL; if (o < buf.length && buf[o] === 0x0d) o++; if (o < buf.length && buf[o] === 0x0a) o++;
  }
  return m;
}

// ─── Step 1: ダウンロード ───
function download(date) {
  console.log('📥 Step 1: ダウンロード (' + date + ')');
  if (!JRDB_ID) { console.log('  ❌ JRDB認証情報なし'); return false; }

  for (const [type, urlBase] of [['JRDB', 'http://www.jrdb.com/member/data/Jrdb/JRDB'], ['SEC', 'http://www.jrdb.com/member/data/Sec/SEC']]) {
    const dir = path.join(RAW, type + date);
    const checkFile = type === 'JRDB' ? 'KYG' + date + '.txt' : type + date + '.txt';
    if (fs.existsSync(path.join(dir, checkFile))) { console.log('  ⏭️  ' + type + date + ' (既存)'); continue; }

    const lzh = path.join(RAW, type + date + '.lzh');
    try {
      execSync('curl -s -o "' + lzh + '" -u "' + JRDB_ID + ':' + JRDB_PW + '" "' + urlBase + date + '.lzh"', { timeout: 30000 });
      if (!fs.existsSync(lzh) || fs.statSync(lzh).size < 100) { console.log('  ❌ ' + type + date + ' (DL失敗)'); continue; }
      fs.mkdirSync(dir, { recursive: true });
      execSync('cd "' + dir + '" && lha x "../' + type + date + '.lzh"', { timeout: 30000 });
      fs.unlinkSync(lzh);
      console.log('  ✅ ' + type + date);
    } catch (e) {
      console.log('  ❌ ' + type + date + ' (' + e.message.substring(0, 50) + ')');
      try { fs.unlinkSync(lzh); } catch (_) {}
    }
  }
  return true;
}

// ─── Step 2: AI予想生成 ───
const CHARACTERS = {
  hayate: { name: 'ハヤテ', pronoun: '私', style: '冷静沈着で論理的。やや皮肉屋。' },
  gantetsu: { name: 'ガンテツ', pronoun: 'ワシ', style: '寡黙で頑固。自信がある時だけ発言。' },
  kazan: { name: 'カザン', pronoun: '俺', style: '大胆不敵。挑発的だが計算高い。' },
  hakusen: { name: 'ハクセン', pronoun: 'わたくし', style: '温厚で博学。血統マニア。' },
  hibari: { name: 'ヒバリ', pronoun: 'あたし', style: '明るく直感的。せっかちで好奇心旺盛。' },
};

function runModels(entries, sireDistStats) {
  const preds = [];

  const h = [...entries].filter(e => e.idm != null).sort((a, b) => ((b.idm||0)*0.8+(b.jockey_index||0)*0.2)-((a.idm||0)*0.8+(a.jockey_index||0)*0.2))[0];
  if (h) preds.push({ pid: 'hayate', umaban: h.umaban, horse_name: h.horse_name, score: ((h.idm||0)*0.8+(h.jockey_index||0)*0.2).toFixed(1), rk: 'idm_jockey' });

  const bs = [...entries].filter(e => e.sogo_index != null).sort((a, b) => (b.sogo_index||0)-(a.sogo_index||0));
  if (bs.length >= 2 && ((bs[0].sogo_index||0)-(bs[1].sogo_index||0)) >= 8) {
    const gap = ((bs[0].sogo_index||0)-(bs[1].sogo_index||0)).toFixed(1);
    preds.push({ pid: 'gantetsu', umaban: bs[0].umaban, horse_name: bs[0].horse_name, score: (bs[0].sogo_index||0).toFixed(1), rk: 'sogo_dominant', gap: parseFloat(gap) });
  }

  const bi = [...entries].filter(e => e.idm != null).sort((a, b) => (b.idm||0)-(a.idm||0));
  const mid = bi.slice(2, 6).filter(e => (e.base_odds||0) >= 5);
  if (mid.length > 0) { mid.sort((a, b) => ((b.idm||0)*Math.log(b.base_odds||1))-((a.idm||0)*Math.log(a.base_odds||1)));
    preds.push({ pid: 'kazan', umaban: mid[0].umaban, horse_name: mid[0].horse_name, score: ((mid[0].idm||0)*Math.log(mid[0].base_odds||1)).toFixed(1), rk: 'midrange_value' }); }

  if (sireDistStats.size > 0) {
    let best = null, bsc = -1;
    for (const e of entries) { if (!e.idm || !e.sire_name) continue;
      const d = (e.distance||0)<=1400?'S':(e.distance||0)<=1800?'M':(e.distance||0)<=2200?'I':'L';
      const sf = e.surface_code===1?'T':'D'; const k = e.sire_name+'_'+sf+'_'+d;
      const st = sireDistStats.get(k); const bo = st&&st.r>=3?st.t3/st.r:0.25;
      const sc = e.idm*bo; if (sc > bsc) { bsc = sc; best = { ...e, sireBoost: bo }; } }
    if (best) preds.push({ pid: 'hakusen', umaban: best.umaban, horse_name: best.horse_name, score: bsc.toFixed(1), rk: 'sire_condition', sire_name: best.sire_name });
  }

  // ヒバリ: テン指数+上がり指数+位置指数の総合力（当日パフォーマンス予測型）
  const hibariScored = entries.filter(e => e.idm != null).map(e => ({
    ...e,
    hibariScore: (e.ten_index||0)*0.2 + (e.agari_index||0)*0.3 + (e.position_index||0)*0.2 + (e.idm||0)*0.3
  })).sort((a, b) => b.hibariScore - a.hibariScore);
  if (hibariScored.length > 0 && (hibariScored[0].ten_index != null || hibariScored[0].agari_index != null)) {
    preds.push({ pid: 'hibari', umaban: hibariScored[0].umaban, horse_name: hibariScored[0].horse_name, score: hibariScored[0].hibariScore.toFixed(1), rk: 'ten_agari_position' });
  } else {
    // フォールバック: IDMベースだが騎手指数を逆に重視（ハヤテと差別化）
    const fh = entries.filter(e => e.idm != null).sort((a, b) => ((b.jockey_index||0)*0.6+(b.idm||0)*0.4)-((a.jockey_index||0)*0.6+(a.idm||0)*0.4));
    if (fh.length > 0) preds.push({ pid: 'hibari', umaban: fh[0].umaban, horse_name: fh[0].horse_name, score: ((fh[0].jockey_index||0)*0.6+(fh[0].idm||0)*0.4).toFixed(1), rk: 'jockey_first' });
  }

  return preds;
}

async function predict(date) {
  console.log('🤖 Step 2: AI予想生成 (' + date + ')');
  const kygs = loadKYG(date);
  if (!kygs.length) { console.log('  ❌ KYGデータなし'); return; }

  // 日付を YYYY-MM-DD に変換
  const yy = date.substring(0, 2), mm = date.substring(2, 4), dd = date.substring(4, 6);
  const raceDate = '20' + yy + '-' + mm + '-' + dd;

  // racesテーブルからマッチするレースを取得
  const races = await supabaseQuery('races?select=id,race_date,course_name,race_number,name,status&race_date=eq.' + raceDate);
  if (!races.length) { console.log('  ❌ racesテーブルにマッチなし (' + raceDate + ')'); return; }
  console.log('  レース数: ' + races.length);

  // 既存予想を取得
  const existing = await supabaseQuery('ai_predictions?select=predictor_id,race_id');
  const existSet = new Set((existing || []).map(e => e.predictor_id + '_' + e.race_id));

  // 種牡馬集計
  const allSire = await supabaseQuery('jrdb_race_entries?select=sire_name,surface_code,distance,finish_order,anomaly&anomaly=eq.0&sire_name=not.is.null&limit=50000');
  const sireDistStats = new Map();
  for (const row of (allSire || [])) {
    const d = (row.distance||0)<=1400?'S':(row.distance||0)<=1800?'M':(row.distance||0)<=2200?'I':'L';
    const sf = row.surface_code===1?'T':'D'; const k = row.sire_name+'_'+sf+'_'+d;
    if (!sireDistStats.has(k)) sireDistStats.set(k, { r:0, w:0, t3:0 });
    const s = sireDistStats.get(k); s.r++; if (row.finish_order===1) s.w++; if (row.finish_order<=3) s.t3++;
  }

  // KYGをレースキー別にグループ
  const kygByRK = new Map();
  for (const k of kygs) { const a = kygByRK.get(k.rk) || []; a.push(k); kygByRK.set(k.rk, a); }

  // UKCで血統情報付与
  const ukc = loadUKC(date);

  let generated = 0, skipped = 0;
  for (const race of races) {
    // race_keyをマッチ: course_name + race_number
    let matchedRK = null;
    for (const [rk, horses] of kygByRK) {
      const courseCode = rk.substring(0, 2);
      const raceNum = parseInt(rk.substring(6, 8));
      if (COURSES[courseCode] === race.course_name && raceNum === race.race_number) { matchedRK = rk; break; }
    }
    if (!matchedRK) continue;

    const entries = kygByRK.get(matchedRK) || [];
    // 血統と距離情報を付与
    for (const e of entries) {
      const u = ukc.get(e.blood); if (u) e.sire_name = u.sire;
      // 距離はracesテーブルにないのでjrdbから推測（KYGに距離がない場合はSECから）
    }

    const preds = runModels(entries, sireDistStats);
    for (const pred of preds) {
      if (existSet.has(pred.pid + '_' + race.id)) { skipped++; continue; }

      // Claude APIでセリフ生成
      const char = CHARACTERS[pred.pid];
      let comment = null;
      if (ANTHROPIC_KEY && char) {
        try {
          comment = await callClaude(
            'あなたは競馬予想AI「' + char.name + '」。一人称:' + char.pronoun + '、性格:' + char.style +
            '\nレース:' + race.name + '(' + race.course_name + ')で◎に' + pred.horse_name + '(' + pred.umaban + '番)を選出。' +
            (pred.sire_name ? '父' + pred.sire_name + '。' : '') + (pred.gap ? '2位との差' + pred.gap + 'pt。' : '') +
            '\nキャラの口調で1-2文(50字以内)の短いコメントを。コメント本文だけ出力。'
          );
        } catch (e) { /* Claude APIエラーは無視してテンプレートにフォールバック */ }
      }

      const row = {
        predictor_id: pred.pid, race_id: race.id,
        umaban: pred.umaban, horse_name: pred.horse_name,
        score: parseFloat(pred.score), reason_key: pred.rk,
        sire_name: pred.sire_name || null, gap: pred.gap || null,
        weight_change: pred.weight_change ?? null,
        comment: comment ? comment.trim() : null,
        confidence: pred.pid === 'gantetsu' ? 0.9 : pred.pid === 'kazan' ? 0.3 : 0.6,
        reasoning: pred.rk, model_version: 'v1',
      };

      const result = await supabaseUpsert('ai_predictions', [row], 'predictor_id,race_id');
      if (result.ok) generated++;
      else console.log('  ❌ DB Error for ' + pred.pid + ' ' + race.name);
    }
  }
  console.log('  ✅ 生成: ' + generated + ', スキップ: ' + skipped);
}

// ─── Step 3: 結果取込 ───
async function importResults(date) {
  console.log('📊 Step 3: 結果データ取込 (' + date + ')');
  const secs = loadSEC(date);
  if (!secs.length) { console.log('  ❌ SECデータなし'); return; }

  const kygs = loadKYG(date);
  const ukc = loadUKC(date);
  const kygMap = new Map();
  for (const k of kygs) kygMap.set(k.rk + '_' + k.umaban, k);

  const rows = [];
  for (const sec of secs) {
    const kyg = kygMap.get(sec.rk + '_' + sec.umaban);
    const blood = sec.blood || kyg?.blood;
    const u = blood ? ukc.get(blood) : null;
    const cc = sec.rk.substring(0, 2);
    const rd = sec.race_date;
    const rdate = rd ? rd.substring(0,4)+'-'+rd.substring(4,6)+'-'+rd.substring(6,8) : null;
    rows.push({
      race_key: sec.rk, race_date: rdate, course_code: cc, course_name: COURSES[cc]||cc,
      race_number: parseInt(sec.rk.substring(6,8)), umaban: sec.umaban,
      horse_name: sec.horse_name || kyg?.horse_name || '', blood_registration_no: blood,
      idm: kyg?.idm||null, jockey_index: kyg?.jockey_index||null, sogo_index: kyg?.sogo_index||null,
      base_odds: kyg?.base_odds||null, base_popularity: kyg?.base_popularity||null,
      training_index: kyg?.training_index||null, stable_index: kyg?.stable_index||null,
      ten_index: kyg?.ten_index||null, agari_index: kyg?.agari_index||null,
      position_index: kyg?.position_index||null, pace_prediction: kyg?.pace_prediction||null,
      jockey_name: kyg?.jockey_name||sec.jockey_name, jockey_code: kyg?.jockey_code||null,
      trainer_name: kyg?.trainer_name||sec.trainer_name, trainer_code: kyg?.trainer_code||null,
      waku: kyg?.waku||null, sogo_mark: kyg?.sogo_mark||null, idm_mark: kyg?.idm_mark||null,
      distance: sec.distance, surface_code: sec.surface_code, grade: sec.grade,
      race_name: sec.race_name, head_count: sec.head_count,
      finish_order: sec.finish_order, anomaly: sec.anomaly||0, finish_time: sec.finish_time,
      final_tansho_odds: sec.final_odds, final_tansho_popularity: sec.final_pop,
      result_idm: sec.result_idm, race_pace: sec.race_pace,
      result_ten_index: sec.result_ten, result_agari_index: sec.result_agari,
      horse_weight: sec.horse_weight, horse_weight_change: sec.horse_weight_change,
      sire_name: u?.sire||null, dam_name: u?.dam||null, broodmare_sire_name: u?.bms||null,
    });
  }

  // バッチINSERT
  const BATCH = 100;
  let ok = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await supabaseUpsert('jrdb_race_entries', batch, 'race_key,umaban');
    if (result.ok) ok += batch.length;
  }
  console.log('  ✅ ' + ok + '/' + rows.length + '件取込');
}

// ─── メイン ───
async function main() {
  const [cmd, date] = process.argv.slice(2);
  if (!cmd || !date) {
    console.log('Usage: node weekly-pipeline.js <download|predict|results|all> <YYMMDD>');
    console.log('Example: node weekly-pipeline.js all 260426');
    process.exit(1);
  }

  console.log('━'.repeat(50));
  console.log('🐴 ゲートイン！ AI予想パイプライン');
  console.log('  日付: ' + date + '  コマンド: ' + cmd);
  console.log('━'.repeat(50));

  if (cmd === 'download' || cmd === 'all') download(date);
  if (cmd === 'predict' || cmd === 'all') await predict(date);
  if (cmd === 'results' || cmd === 'all') await importResults(date);

  console.log('\n✅ 完了');
}

main().catch(e => console.error('Fatal:', e));
