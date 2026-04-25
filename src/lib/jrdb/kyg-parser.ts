/**
 * JRDB KYG (競走馬データ) パーサー
 * レコード長: 543バイト + CRLF = 545バイト
 * 文字コード: CP932 (Shift_JIS)
 */

import { readFileSync } from "fs";
import * as iconv from "iconv-lite";

export interface KYGField {
  name: string;
  start: number;
  length: number;
  type: "string" | "number" | "decimal" | "hex";
  decimalPlaces?: number;
  description?: string;
}

export const KYG_RECORD_LENGTH = 543;
export const KYG_LINE_LENGTH = 545;

export const KYG_FIELDS: KYGField[] = [
  { name: "場コード", start: 1, length: 2, type: "string", description: "01:札幌 02:函館 03:福島 04:新潟 05:東京 06:中山 07:中京 08:京都 09:阪神 10:小倉" },
  { name: "年", start: 3, length: 2, type: "string" },
  { name: "回", start: 5, length: 1, type: "string" },
  { name: "日", start: 6, length: 1, type: "hex" },
  { name: "R", start: 7, length: 2, type: "string" },
  { name: "馬番", start: 9, length: 2, type: "number" },
  { name: "血統登録番号", start: 11, length: 8, type: "string" },
  { name: "馬名", start: 19, length: 36, type: "string", description: "全角18文字" },
  { name: "IDM", start: 55, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "騎手指数", start: 60, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "情報指数", start: 65, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "予備1", start: 70, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "予備2", start: 75, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "予備3", start: 80, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "総合指数", start: 85, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "脚質", start: 90, length: 1, type: "number", description: "1:逃げ 2:先行 3:差し 4:追込" },
  { name: "距離適性", start: 91, length: 1, type: "number" },
  { name: "上昇度", start: 92, length: 1, type: "number" },
  { name: "ローテーション", start: 93, length: 3, type: "number" },
  { name: "基準オッズ", start: 96, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "基準人気順位", start: 101, length: 2, type: "number" },
  { name: "基準複勝オッズ", start: 103, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "基準複勝人気順位", start: 108, length: 2, type: "number" },
  { name: "tokutei_honmei", start: 110, length: 3, type: "number" },
  { name: "tokutei_taikou", start: 113, length: 3, type: "number" },
  { name: "tokutei_tanana", start: 116, length: 3, type: "number" },
  { name: "tokutei_renka", start: 119, length: 3, type: "number" },
  { name: "tokutei_batsu", start: 122, length: 3, type: "number" },
  { name: "sogo_honmei", start: 125, length: 3, type: "number" },
  { name: "sogo_taikou", start: 128, length: 3, type: "number" },
  { name: "sogo_tanana", start: 131, length: 3, type: "number" },
  { name: "sogo_renka", start: 134, length: 3, type: "number" },
  { name: "sogo_batsu", start: 137, length: 3, type: "number" },
  { name: "人気指数", start: 140, length: 5, type: "number" },
  { name: "調教指数", start: 145, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "厩舎指数", start: 150, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "調教矢印コード", start: 155, length: 1, type: "number" },
  { name: "厩舎評価コード", start: 156, length: 1, type: "number" },
  { name: "騎手期待連対率", start: 157, length: 4, type: "decimal", decimalPlaces: 1 },
  { name: "激走指数", start: 161, length: 3, type: "number" },
  { name: "蹄コード", start: 164, length: 2, type: "string" },
  { name: "重適性コード", start: 166, length: 1, type: "number" },
  { name: "クラスコード", start: 167, length: 2, type: "string" },
  { name: "予備4", start: 169, length: 2, type: "string" },
  { name: "ブリンカー", start: 171, length: 1, type: "number" },
  { name: "騎手名", start: 172, length: 12, type: "string" },
  { name: "負担重量", start: 184, length: 3, type: "decimal", decimalPlaces: 1 },
  { name: "見習い区分", start: 187, length: 1, type: "number" },
  { name: "調教師名", start: 188, length: 12, type: "string" },
  { name: "調教師所属", start: 200, length: 4, type: "string" },
  { name: "前走1_レースキー", start: 204, length: 8, type: "string" },
  { name: "前走1_着順", start: 212, length: 2, type: "number" },
  { name: "前走2_レースキー", start: 214, length: 8, type: "string" },
  { name: "前走2_着順", start: 222, length: 2, type: "number" },
  { name: "前走3_レースキー", start: 224, length: 8, type: "string" },
  { name: "前走3_着順", start: 232, length: 2, type: "number" },
  { name: "前走4_レースキー", start: 234, length: 8, type: "string" },
  { name: "前走4_着順", start: 242, length: 2, type: "number" },
  { name: "前走5_レースキー", start: 244, length: 8, type: "string" },
  { name: "前走5_着順", start: 252, length: 2, type: "number" },
  { name: "枠番", start: 254, length: 1, type: "number" },
  { name: "予備5", start: 255, length: 2, type: "string" },
  { name: "総合印", start: 257, length: 1, type: "number" },
  { name: "IDM印", start: 258, length: 1, type: "number" },
  { name: "情報印", start: 259, length: 1, type: "number" },
  { name: "騎手印", start: 260, length: 1, type: "number" },
  { name: "厩舎印", start: 261, length: 1, type: "number" },
  { name: "調教印", start: 262, length: 1, type: "number" },
  { name: "激走印", start: 263, length: 1, type: "number" },
  { name: "芝適性コード", start: 264, length: 1, type: "number" },
  { name: "ダ適性コード", start: 265, length: 1, type: "number" },
  { name: "騎手コード", start: 266, length: 5, type: "string" },
  { name: "調教師コード", start: 271, length: 5, type: "string" },
  { name: "獲得賞金", start: 276, length: 6, type: "number" },
  { name: "収得賞金", start: 282, length: 5, type: "number" },
  { name: "条件クラス", start: 287, length: 1, type: "string" },
  { name: "テン指数", start: 359, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "ペース指数", start: 364, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "上がり指数", start: 369, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "位置指数", start: 374, length: 5, type: "decimal", decimalPlaces: 1 },
  { name: "ペース予想", start: 379, length: 1, type: "string" },
  { name: "道中順位", start: 309, length: 2, type: "number" },
  { name: "道中差", start: 311, length: 2, type: "number" },
  { name: "道中内外", start: 313, length: 1, type: "number" },
  { name: "後3F順位", start: 314, length: 2, type: "number" },
  { name: "後3F差", start: 316, length: 2, type: "number" },
  { name: "後3F内外", start: 318, length: 1, type: "number" },
  { name: "ゴール順位", start: 319, length: 2, type: "number" },
  { name: "ゴール差", start: 321, length: 2, type: "number" },
  { name: "ゴール内外", start: 323, length: 1, type: "number" },
  { name: "展開記号", start: 324, length: 1, type: "string" },
  { name: "距離適性2", start: 325, length: 1, type: "number" },
  { name: "枠確定馬体重", start: 326, length: 3, type: "number" },
  { name: "枠確定馬体重増減", start: 329, length: 3, type: "number" },
  { name: "取消フラグ", start: 332, length: 1, type: "number" },
  { name: "性別コード", start: 333, length: 1, type: "number" },
  { name: "馬主名", start: 334, length: 20, type: "string" },
  { name: "馬主会コード", start: 354, length: 2, type: "string" },
  { name: "馬記号コード", start: 356, length: 2, type: "string" },
  { name: "激走順位", start: 358, length: 2, type: "number" },
  { name: "LS指数順位", start: 360, length: 2, type: "number" },
  { name: "テン指数順位", start: 362, length: 2, type: "number" },
  { name: "ペース指数順位", start: 364, length: 2, type: "number" },
  { name: "上がり指数順位", start: 366, length: 2, type: "number" },
  { name: "位置指数順位", start: 368, length: 2, type: "number" },
  { name: "騎手期待単勝率", start: 370, length: 4, type: "decimal", decimalPlaces: 1 },
  { name: "騎手期待3着内率", start: 374, length: 4, type: "decimal", decimalPlaces: 1 },
  { name: "輸送区分", start: 378, length: 1, type: "number" },
  { name: "走法", start: 379, length: 8, type: "string" },
  { name: "体型1", start: 387, length: 1, type: "number" },
  { name: "体型2", start: 388, length: 1, type: "number" },
  { name: "体型3", start: 389, length: 1, type: "number" },
  { name: "体型総合1", start: 390, length: 3, type: "string" },
  { name: "体型総合2", start: 393, length: 3, type: "string" },
  { name: "体型総合3", start: 396, length: 3, type: "string" },
  { name: "馬特記1", start: 399, length: 3, type: "string" },
  { name: "馬特記2", start: 402, length: 3, type: "string" },
  { name: "馬特記3", start: 405, length: 3, type: "string" },
  { name: "馬スタート指数", start: 408, length: 4, type: "decimal", decimalPlaces: 1 },
  { name: "馬出遅率", start: 412, length: 4, type: "decimal", decimalPlaces: 1 },
  { name: "参考前走1", start: 416, length: 2, type: "number" },
  { name: "参考前走2", start: 418, length: 2, type: "number" },
  { name: "参考前走3", start: 420, length: 2, type: "number" },
  { name: "万券指数", start: 422, length: 3, type: "number" },
  { name: "万券印", start: 425, length: 1, type: "number" },
  { name: "降級フラグ", start: 426, length: 1, type: "number" },
  { name: "激走タイプ", start: 427, length: 2, type: "string" },
  { name: "休養理由分類コード", start: 429, length: 2, type: "string" },
  { name: "芝ダ障害フラグ", start: 431, length: 1, type: "number" },
  { name: "距離フラグ", start: 432, length: 1, type: "number" },
  { name: "クラスフラグ", start: 433, length: 1, type: "number" },
  { name: "転厩フラグ", start: 434, length: 1, type: "number" },
  { name: "去勢フラグ", start: 435, length: 1, type: "number" },
  { name: "乗替フラグ", start: 436, length: 1, type: "number" },
  { name: "入厩何走目", start: 437, length: 2, type: "number" },
  { name: "入厩年月日", start: 439, length: 8, type: "string" },
  { name: "入厩何日前", start: 447, length: 3, type: "number" },
  { name: "放牧先ランク", start: 450, length: 1, type: "number" },
  { name: "厩舎ランク", start: 451, length: 1, type: "string" },
  { name: "予備6", start: 452, length: 92, type: "string" },
];

export interface KYGRecord {
  raceKey: string;
  場コード: string;
  年: string;
  回: string;
  日: string;
  R: string;
  馬番: number;
  血統登録番号: string;
  馬名: string;
  IDM: number | null;
  騎手指数: number | null;
  情報指数: number | null;
  総合指数: number | null;
  脚質: number | null;
  距離適性: number | null;
  上昇度: number | null;
  ローテーション: number | null;
  基準オッズ: number | null;
  基準人気順位: number | null;
  基準複勝オッズ: number | null;
  基準複勝人気順位: number | null;
  sogo_honmei: number | null;
  sogo_taikou: number | null;
  sogo_tanana: number | null;
  sogo_renka: number | null;
  人気指数: number | null;
  調教指数: number | null;
  厩舎指数: number | null;
  騎手名: string;
  調教師名: string;
  騎手コード: string;
  調教師コード: string;
  負担重量: number | null;
  テン指数: number | null;
  ペース指数: number | null;
  上がり指数: number | null;
  位置指数: number | null;
  ペース予想: string;
  枠番: number | null;
  枠確定馬体重: number | null;
  枠確定馬体重増減: number | null;
  性別コード: number | null;
  取消フラグ: number | null;
  獲得賞金: number | null;
  収得賞金: number | null;
  raw: Record<string, string | number | null>;
}

function extractString(buf: Buffer, start1indexed: number, length: number): string {
  const s = start1indexed - 1;
  return iconv.decode(buf.subarray(s, s + length), "cp932").trim();
}

function extractNumber(buf: Buffer, start1indexed: number, length: number): number | null {
  const raw = extractString(buf, start1indexed, length);
  if (!raw || raw === "" || raw === " ".repeat(length)) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

function extractDecimal(buf: Buffer, start1indexed: number, length: number, _dp: number): number | null {
  const raw = extractString(buf, start1indexed, length);
  if (!raw || raw === "" || raw === " ".repeat(length)) return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function parseKYGLine(buf: Buffer): KYGRecord {
  const raw: Record<string, string | number | null> = {};
  for (const field of KYG_FIELDS) {
    let value: string | number | null;
    switch (field.type) {
      case "number": value = extractNumber(buf, field.start, field.length); break;
      case "decimal": value = extractDecimal(buf, field.start, field.length, field.decimalPlaces ?? 1); break;
      default: value = extractString(buf, field.start, field.length); break;
    }
    raw[field.name] = value;
  }
  const raceKey = `${raw["場コード"]}${raw["年"]}${raw["回"]}${raw["日"]}${raw["R"]}`;
  return {
    raceKey,
    場コード: raw["場コード"] as string, 年: raw["年"] as string, 回: raw["回"] as string,
    日: raw["日"] as string, R: raw["R"] as string,
    馬番: (raw["馬番"] as number) ?? 0, 血統登録番号: raw["血統登録番号"] as string,
    馬名: raw["馬名"] as string,
    IDM: raw["IDM"] as number | null, 騎手指数: raw["騎手指数"] as number | null,
    情報指数: raw["情報指数"] as number | null, 総合指数: raw["総合指数"] as number | null,
    脚質: raw["脚質"] as number | null, 距離適性: raw["距離適性"] as number | null,
    上昇度: raw["上昇度"] as number | null, ローテーション: raw["ローテーション"] as number | null,
    基準オッズ: raw["基準オッズ"] as number | null, 基準人気順位: raw["基準人気順位"] as number | null,
    基準複勝オッズ: raw["基準複勝オッズ"] as number | null, 基準複勝人気順位: raw["基準複勝人気順位"] as number | null,
    sogo_honmei: raw["sogo_honmei"] as number | null, sogo_taikou: raw["sogo_taikou"] as number | null,
    sogo_tanana: raw["sogo_tanana"] as number | null, sogo_renka: raw["sogo_renka"] as number | null,
    人気指数: raw["人気指数"] as number | null, 調教指数: raw["調教指数"] as number | null,
    厩舎指数: raw["厩舎指数"] as number | null,
    騎手名: raw["騎手名"] as string, 調教師名: raw["調教師名"] as string,
    騎手コード: raw["騎手コード"] as string, 調教師コード: raw["調教師コード"] as string,
    負担重量: raw["負担重量"] as number | null,
    テン指数: raw["テン指数"] as number | null, ペース指数: raw["ペース指数"] as number | null,
    上がり指数: raw["上がり指数"] as number | null, 位置指数: raw["位置指数"] as number | null,
    ペース予想: raw["ペース予想"] as string,
    枠番: raw["枠番"] as number | null, 枠確定馬体重: raw["枠確定馬体重"] as number | null,
    枠確定馬体重増減: raw["枠確定馬体重増減"] as number | null,
    性別コード: raw["性別コード"] as number | null, 取消フラグ: raw["取消フラグ"] as number | null,
    獲得賞金: raw["獲得賞金"] as number | null, 収得賞金: raw["収得賞金"] as number | null,
    raw,
  };
}

export function parseKYGFile(filePath: string): KYGRecord[] {
  const buf = readFileSync(filePath);
  const records: KYGRecord[] = [];
  let offset = 0;
  while (offset < buf.length) {
    if (offset + KYG_RECORD_LENGTH > buf.length) break;
    const lineBuf = buf.subarray(offset, offset + KYG_RECORD_LENGTH);
    records.push(parseKYGLine(lineBuf));
    offset += KYG_RECORD_LENGTH;
    if (offset < buf.length && buf[offset] === 0x0d) offset++;
    if (offset < buf.length && buf[offset] === 0x0a) offset++;
  }
  return records;
}

export function groupByRace(records: KYGRecord[]): Map<string, KYGRecord[]> {
  const map = new Map<string, KYGRecord[]>();
  for (const rec of records) {
    const existing = map.get(rec.raceKey) ?? [];
    existing.push(rec);
    map.set(rec.raceKey, existing);
  }
  return map;
}

export function getCourseName(code: string): string {
  const courses: Record<string, string> = {
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟", "05": "東京",
    "06": "中山", "07": "中京", "08": "京都", "09": "阪神", "10": "小倉",
  };
  return courses[code] ?? code;
}
