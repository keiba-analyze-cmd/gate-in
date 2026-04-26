/**
 * JRDB統合パーサー — KYG / SEC / UKC / BAB
 *
 * 使い方:
 *   import { parseKYG, parseSEC, parseUKC, parseBAB } from './parsers.mjs';
 *   const entries = parseKYG('/path/to/KYG260426.txt');
 *
 * 文字コード: CP932 (Shift_JIS系)
 * バイト位置: JRDB仕様書は1始まり → コード内では0始まりに変換済み
 */

import { readFileSync } from 'fs';
import iconv from 'iconv-lite';

// ─── ユーティリティ ─────────────────────────────────────
function readCP932(filePath) {
  const buf = readFileSync(filePath);
  return iconv.decode(buf, 'cp932');
}

function splitRecords(text, recordLen) {
  const lines = [];
  // CRLF区切り or 固定長で分割
  const rawLines = text.split(/\r?\n/).filter(l => l.length > 0);
  for (const line of rawLines) {
    // 固定長レコードが結合されている場合は分割
    if (line.length > recordLen + 5) {
      for (let i = 0; i < line.length; i += recordLen) {
        const rec = line.substring(i, i + recordLen);
        if (rec.trim().length > 0) lines.push(rec);
      }
    } else if (line.length >= recordLen - 5) {
      lines.push(line);
    }
  }
  return lines;
}

// CP932のバイト位置でスライスする (1-indexed → 0-indexed)
function sliceBytes(filePath, startByte1, lengthBytes) {
  // この関数は行ごとではなくバッファ全体に使う
  // 実際にはテキスト変換後の文字位置で取る方が実用的
}

// テキスト行から固定位置で切り出し（JRDB仕様は半角=1byte, 全角=2byte）
// CP932デコード後は全角が1文字になるため、バイトベースで切る必要がある
function sliceBytesFromBuffer(buf, start1, len) {
  // start1: 1-indexed start position
  return iconv.decode(buf.subarray(start1 - 1, start1 - 1 + len), 'cp932').trim();
}

function parseNum(s) {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseIntSafe(s) {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

// バイナリベースでレコードを分割
function splitRecordsBinary(buf, recordLen) {
  const records = [];
  let pos = 0;
  while (pos + recordLen <= buf.length) {
    const rec = buf.subarray(pos, pos + recordLen);
    // CRLFスキップ
    pos += recordLen;
    // CRLF (0x0D 0x0A) をスキップ
    if (pos < buf.length && buf[pos] === 0x0d) pos++;
    if (pos < buf.length && buf[pos] === 0x0a) pos++;
    records.push(rec);
  }
  return records;
}

// ─── KYGパーサー（競走馬データ）──────────────────────────
// レコード長: 543バイト (CRLF除く)
// 最重要ファイル: IDM, 各種指数, 騎手, オッズ等
export function parseKYG(filePath) {
  const buf = readFileSync(filePath);
  const RECORD_LEN = 543;
  const records = splitRecordsBinary(buf, RECORD_LEN);

  return records.map(rec => {
    const s = (start1, len) => sliceBytesFromBuffer(rec, start1, len);
    const n = (start1, len) => parseNum(s(start1, len));
    const i = (start1, len) => parseIntSafe(s(start1, len));

    const raceKey = s(1, 8);
    // raceKey = 場コード(2) + 年(2) + 回(1) + 日(1) + R番号(2)
    const courseCode = raceKey.substring(0, 2);
    const year = raceKey.substring(2, 4);
    const kai = raceKey.substring(4, 5);
    const day = raceKey.substring(5, 6);
    const raceNum = raceKey.substring(6, 8);

    return {
      race_key: raceKey,
      course_code: courseCode,
      umaban: i(9, 2),
      horse_code: s(11, 8),
      horse_name: s(19, 36),
      idm: n(55, 5),
      jockey_index: n(60, 5),
      info_index: n(65, 5),
      pace_index: n(75, 5),
      composite_index: n(85, 5),
      running_style: i(90, 1),        // 1逃げ 2先行 3差し 4追込
      distance_aptitude: s(91, 1),     // 1短距離 2中距離 3長距離
      base_odds: n(96, 5),
      base_popularity: i(101, 2),
      specific_odds: n(103, 5),
      specific_popularity: i(108, 2),
      training_index: n(145, 5),
      stable_index: n(150, 5),
      jockey_name: s(172, 12),
      ten_index: n(359, 5),           // テンの速さ
      agari_index: n(369, 5),         // 上がり
      position_index: n(374, 5),      // 位置取り
      pace_prediction: s(379, 1),     // H/M/S
      condition_code: s(155, 1),      // 馬場適性
      weight: i(160, 3),              // 斤量×10
    };
  });
}

// ─── SECパーサー（成績データ）──────────────────────────
// レコード長: 342バイト (CRLF除く)
export function parseSEC(filePath) {
  const buf = readFileSync(filePath);
  const RECORD_LEN = 344;
  const records = splitRecordsBinary(buf, RECORD_LEN);

  return records.map(rec => {
    const s = (start1, len) => sliceBytesFromBuffer(rec, start1, len);
    const n = (start1, len) => parseNum(s(start1, len));
    const i = (start1, len) => parseIntSafe(s(start1, len));

    return {
      race_key: s(1, 8),
      umaban: i(9, 2),
      horse_code: s(11, 8),
      finish_position: i(141, 2),
      abnormal_code: s(143, 1),
      time: s(144, 4),                 // 走破タイム(0.1秒単位)
      carry_weight: i(148, 3),         // 斤量(0.1kg単位)
      odds: n(175, 6),                 // 確定単勝オッズ ★修正
      popularity: i(181, 2),           // 確定単勝人気 ★修正
      idm: n(183, 3),                  // IDM ★修正
      ten_index: n(224, 5),            // テン指数
      agari_index: n(229, 5),          // 上がり指数
      mae_3f: n(259, 3),              // 前3Fタイム
      agari_3f: n(262, 3),            // 後3Fタイム ★修正
      corner1: i(309, 2),
      corner2: i(311, 2),
      corner3: i(313, 2),
      corner4: i(315, 2),
      weight: i(333, 3),              // 馬体重 ★修正
      weight_diff: i(336, 3),         // 馬体重増減 ★修正
    };
  });
}

// ─── UKCパーサー（馬基本データ＝血統情報）──────────────
// レコード長: 290バイト (CRLF除く)
export function parseUKC(filePath) {
  const buf = readFileSync(filePath);
  const RECORD_LEN = 290;
  const records = splitRecordsBinary(buf, RECORD_LEN);

  return records.map(rec => {
    const s = (start1, len) => sliceBytesFromBuffer(rec, start1, len);
    const i = (start1, len) => parseIntSafe(s(start1, len));

    return {
      horse_code: s(1, 8),             // 血統登録番号
      horse_name: s(9, 36),           // 馬名 (pos13, 36byte)
      sex_code: s(45, 1),               // 性別(1牡 2牝 3セ)
      hair_color: s(46, 2),            // 毛色
      sire_name: s(50, 36),            // 父馬名 ★ハクセン重要
      dam_sire_name: s(122, 36),       // 母父馬名 ★ハクセン重要
      sire_lineage_code: s(277, 4),    // 父系統コード
      dam_lineage_code: s(281, 4),     // 母系統コード
      trainer_name: s(210, 12),        // 調教師名
      birth_year: i(285, 4),           // 生年
    };
  });
}

// ─── BABパーサー（番組データ＝レース情報）──────────────
// レコード長: 各行可変だが概ね180-200バイト
export function parseBAB(filePath) {
  const buf = readFileSync(filePath);
  // BABはレコード長が仕様により異なる場合あり
  // 基本フィールドのみ抽出
  const text = iconv.decode(buf, 'cp932');
  const lines = text.split(/\r?\n/).filter(l => l.length > 30);

  return lines.map(line => {
    const s = (start1, len) => line.substring(start1 - 1, start1 - 1 + len).trim();
    const i = (start1, len) => parseIntSafe(s(start1, len));

    return {
      race_key: s(1, 8),
      race_date: s(9, 8),             // YYYYMMDD
      distance: i(17, 4),
      track_type: s(21, 1),           // 1芝 2ダート 3障害
      num_horses: i(26, 2),           // 出走頭数
      race_name: s(35, 50),
      grade: s(85, 1),                // グレード(1:G1 2:G2 3:G3)
      race_condition: s(28, 2),       // 条件
    };
  });
}

// ─── エクスポート: ファイル種別自動判定 ─────────────────
export function parseFile(filePath) {
  const filename = filePath.split('/').pop().toUpperCase();
  if (filename.startsWith('KYG')) return { type: 'KYG', data: parseKYG(filePath) };
  if (filename.startsWith('SEC')) return { type: 'SEC', data: parseSEC(filePath) };
  if (filename.startsWith('UKC')) return { type: 'UKC', data: parseUKC(filePath) };
  if (filename.startsWith('BAB')) return { type: 'BAB', data: parseBAB(filePath) };
  throw new Error(`Unknown file type: ${filename}`);
}
