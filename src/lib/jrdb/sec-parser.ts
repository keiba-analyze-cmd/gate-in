/**
 * JRDB SEC (成績データ) パーサー
 * レコード長: 344バイト + CRLF
 * 文字コード: CP932
 * 仕様書: sec_doc.txt 第4版 (2007.10.22)
 */
import { readFileSync } from "fs";
import * as iconv from "iconv-lite";

export const SEC_RECORD_LENGTH = 344;

export interface SECRecord {
  raceKey: string;
  場コード: string; 年: string; 回: string; 日: string; R: string;
  馬番: number;
  血統登録番号: string;
  成績年月日: string;
  馬名: string;
  距離: number | null;
  芝ダ障害コード: number | null;
  右左: number | null;
  内外: number | null;
  馬場状態: number | null;
  種別: number | null;
  条件: string;
  重量: number | null;
  グレード: number | null;
  レース名: string;
  頭数: number | null;
  レース名略称: string;
  着順: number | null;
  異常区分: number | null;
  タイム: number | null;
  斤量: number | null;
  騎手名: string;
  調教師名: string;
  確定単勝オッズ: number | null;
  確定単勝人気順位: number | null;
  IDM: number | null;
  素点: number | null;
  馬場差: number | null;
  ペース: number | null;
  出遅: number | null;
  位置取: number | null;
  不利: number | null;
  レースP: number | null;
  コース取り: number | null;
  上昇度コード: number | null;
  レースペース: string;
  馬ペース: string;
  テン指数: number | null;
  上がり指数: number | null;
  ペース指数: number | null;
  レースP指数: number | null;
  前3Fタイム: number | null;
  後3Fタイム: number | null;
  確定複勝オッズ下: number | null;
  十時単勝オッズ: number | null;
  十時複勝オッズ: number | null;
  コーナー順位1: number | null;
  コーナー順位2: number | null;
  コーナー順位3: number | null;
  コーナー順位4: number | null;
  騎手コード: string;
  調教師コード: string;
  馬体重: number | null;
  馬体重増減: number | null;
  天候コード: number | null;
  コース: string;
  レース脚質: string;
  raw: Record<string, string | number | null>;
}

function ext(buf: Buffer, s: number, l: number): string {
  return iconv.decode(buf.subarray(s - 1, s - 1 + l), "cp932").trim();
}
function num(buf: Buffer, s: number, l: number): number | null {
  const v = parseFloat(ext(buf, s, l));
  return isNaN(v) ? null : v;
}

function parseSECLine(buf: Buffer): SECRecord {
  const raw: Record<string, string | number | null> = {};
  const raceKey = ext(buf,1,8);
  return {
    raceKey,
    場コード: ext(buf,1,2), 年: ext(buf,3,2), 回: ext(buf,5,1),
    日: ext(buf,6,1), R: ext(buf,7,2),
    馬番: num(buf,9,2) ?? 0,
    血統登録番号: ext(buf,11,8),
    成績年月日: ext(buf,19,8),
    馬名: ext(buf,27,36),
    距離: num(buf,63,4),
    芝ダ障害コード: num(buf,67,1),
    右左: num(buf,68,1),
    内外: num(buf,69,1),
    馬場状態: num(buf,70,2),
    種別: num(buf,72,2),
    条件: ext(buf,74,2),
    重量: num(buf,79,1),
    グレード: num(buf,80,1),
    レース名: ext(buf,81,50),
    頭数: num(buf,131,2),
    レース名略称: ext(buf,133,8),
    着順: num(buf,141,2),
    異常区分: num(buf,143,1),
    タイム: num(buf,144,4),
    斤量: num(buf,148,3),
    騎手名: ext(buf,151,12),
    調教師名: ext(buf,163,12),
    確定単勝オッズ: num(buf,175,6),
    確定単勝人気順位: num(buf,181,2),
    IDM: num(buf,183,3),
    素点: num(buf,186,3),
    馬場差: num(buf,189,3),
    ペース: num(buf,192,3),
    出遅: num(buf,195,3),
    位置取: num(buf,198,3),
    不利: num(buf,201,3),
    レースP: num(buf,213,3),
    コース取り: num(buf,216,1),
    上昇度コード: num(buf,217,1),
    レースペース: ext(buf,222,1),
    馬ペース: ext(buf,223,1),
    テン指数: num(buf,224,5),
    上がり指数: num(buf,229,5),
    ペース指数: num(buf,234,5),
    レースP指数: num(buf,239,5),
    前3Fタイム: num(buf,259,3),
    後3Fタイム: num(buf,262,3),
    確定複勝オッズ下: num(buf,291,6),
    十時単勝オッズ: num(buf,297,6),
    十時複勝オッズ: num(buf,303,6),
    コーナー順位1: num(buf,309,2),
    コーナー順位2: num(buf,311,2),
    コーナー順位3: num(buf,313,2),
    コーナー順位4: num(buf,315,2),
    騎手コード: ext(buf,323,5),
    調教師コード: ext(buf,328,5),
    馬体重: num(buf,333,3),
    馬体重増減: num(buf,336,3),
    天候コード: num(buf,339,1),
    コース: ext(buf,340,1),
    レース脚質: ext(buf,341,1),
    raw,
  };
}

export function parseSECFile(filePath: string): SECRecord[] {
  const buf = readFileSync(filePath);
  const records: SECRecord[] = [];
  let offset = 0;
  while (offset + SEC_RECORD_LENGTH <= buf.length) {
    records.push(parseSECLine(buf.subarray(offset, offset + SEC_RECORD_LENGTH)));
    offset += SEC_RECORD_LENGTH;
    if (offset < buf.length && buf[offset] === 0x0d) offset++;
    if (offset < buf.length && buf[offset] === 0x0a) offset++;
  }
  return records;
}

export function groupSECByRace(records: SECRecord[]): Map<string, SECRecord[]> {
  const map = new Map<string, SECRecord[]>();
  for (const rec of records) {
    const arr = map.get(rec.raceKey) ?? [];
    arr.push(rec);
    map.set(rec.raceKey, arr);
  }
  return map;
}

export function formatTime(time: number | null): string {
  if (time === null) return "-";
  const m = Math.floor(time / 600), s = Math.floor((time % 600) / 10), d = time % 10;
  return m > 0 ? `${m}:${String(s).padStart(2,"0")}.${d}` : `${s}.${d}`;
}

export function getFinishLabel(order: number | null, anomaly: number | null): string {
  if (anomaly && anomaly > 0) return `除外(${anomaly})`;
  if (order === null) return "不明";
  return `${order}着`;
}
