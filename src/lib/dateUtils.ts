// JST固定で日付を扱うためのユーティリティ

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// JSTの日付文字列からDateを作成（タイムゾーン問題を回避）
export function parseJSTDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00+09:00");
}

export function getSaturdayOfWeek(date: Date): Date {
  // JSTでの曜日を計算
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const day = jstDate.getUTCDay();
  const diff = day === 0 ? -1 : 6 - day;
  
  const result = new Date(date);
  result.setDate(result.getDate() + diff);
  return result;
}

export function getDefaultRaceDate(now: Date = new Date()): Date {
  // JSTでの現在時刻
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = jstNow.getUTCDay();
  const hour = jstNow.getUTCHours();
  
  const thisSat = getSaturdayOfWeek(now);
  const thisSun = addDays(thisSat, 1);
  const lastSun = addDays(thisSun, -7);
  
  // 土曜 → 今週土曜
  if (day === 6) return thisSat;
  // 日曜 → 今週日曜
  if (day === 0) return thisSun;
  // 月〜金 → 次の日曜
  return thisSun;
}

export function getWeekRaceDates(baseDate: Date): Date[] {
  const sat = getSaturdayOfWeek(baseDate);
  return [sat, addDays(sat, 1)];
}

export function formatDateString(date: Date): string {
  // JSTでの日付文字列を生成
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateWithDay(date: Date): string {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const month = jstDate.getUTCMonth() + 1;
  const day = jstDate.getUTCDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return `${month}/${day}(${dayNames[jstDate.getUTCDay()]})`;
}

export function formatWeekRange(baseDate: Date): string {
  const [sat, sun] = getWeekRaceDates(baseDate);
  return `${formatDateWithDay(sat)} - ${formatDateWithDay(sun)}`;
}
