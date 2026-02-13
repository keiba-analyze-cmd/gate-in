"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  selected: string;
  date: string;
  course: string;
};

const GRADES = [
  { value: "", label: "全て" },
  { value: "G1", label: "G1" },
  { value: "G2", label: "G2" },
  { value: "G3", label: "G3" },
  { value: "OP", label: "OP" },
  { value: "listed", label: "Listed" },
];

export default function GradeFilter({ selected, date, course }: Props) {
  const router = useRouter();

  const handleChange = (grade: string) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (course) params.set("course", course);
    if (grade) params.set("grade", grade);
    router.push(`/races?${params.toString()}`);
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {GRADES.map((g) => (
        <button
          key={g.value}
          onClick={() => handleChange(g.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            selected === g.value
              ? g.value === "G1" ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
              : g.value === "G2" ? "bg-red-100 text-red-700 border border-red-300"
              : g.value === "G3" ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-green-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
