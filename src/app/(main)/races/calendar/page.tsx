import RaceCalendar from "@/components/races/RaceCalendar";
import Link from "next/link";

export const metadata = { title: "レースカレンダー | ゲートイン！", description: "月間のレーススケジュールを一覧表示" };

export default function RaceCalendarPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📅 レースカレンダー</h1>
        <Link href="/races" className="text-sm text-green-600 hover:text-green-700 font-bold">一覧に戻る →</Link>
      </div>
      <RaceCalendar />
    </div>
  );
}
