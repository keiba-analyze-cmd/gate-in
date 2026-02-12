"use client";

import { useRouter } from "next/navigation";

type Props = {
  dates: string[];
  selected: string;
  course?: string;
};

export default function DateFilter({ dates, selected, course }: Props) {
  const router = useRouter();

  const handleSelect = (date: string) => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (course) params.set("course", course);
    router.push(`/races?${params.toString()}`);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return {
      month: d.getMonth() + 1,
      day: d.getDate(),
      dow: days[d.getDay()],
      isSat: d.getDay() === 6,
      isSun: d.getDay() === 0,
    };
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {dates.slice(0, 10).map((date) => {
        const f = formatDate(date);
        const isActive = date === selected;
        return (
          <button
            key={date}
            onClick={() => handleSelect(date)}
            className={`shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border transition-all ${
              isActive
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            }`}
          >
            <span className="text-xs">
              {f.month}/{f.day}
            </span>
            <span
              className={`text-xs font-bold ${
                isActive
                  ? "text-white"
                  : f.isSun
                  ? "text-red-500"
                  : f.isSat
                  ? "text-blue-500"
                  : ""
              }`}
            >
              {f.dow}
            </span>
          </button>
        );
      })}
    </div>
  );
}
