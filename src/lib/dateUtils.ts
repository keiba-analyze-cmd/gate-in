export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getSaturdayOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -1 : 6 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getDefaultRaceDate(now: Date = new Date()): Date {
  const day = now.getDay();
  const hour = now.getHours();
  const thisSat = getSaturdayOfWeek(now);
  const thisSun = addDays(thisSat, 1);
  const lastSun = addDays(thisSun, -7);
  
  if ((day === 5 && hour >= 18) || day === 6) return thisSat;
  if (day === 0) return thisSun;
  return lastSun;
}

export function getWeekRaceDates(baseDate: Date): Date[] {
  const sat = getSaturdayOfWeek(baseDate);
  return [sat, addDays(sat, 1)];
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateWithDay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return `${month}/${day}(${dayNames[date.getDay()]})`;
}

export function formatWeekRange(baseDate: Date): string {
  const [sat, sun] = getWeekRaceDates(baseDate);
  return `${formatDateWithDay(sat)} - ${formatDateWithDay(sun)}`;
}
