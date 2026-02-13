"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialQuery: string;
  date: string;
  course: string;
  grade: string;
};

export default function RaceSearchBar({ initialQuery, date, course, grade }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (course) params.set("course", course);
    if (grade) params.set("grade", grade);
    if (query.trim()) params.set("q", query.trim());
    router.push(`/races?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (course) params.set("course", course);
    if (grade) params.set("grade", grade);
    router.push(`/races?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
          placeholder="レース名で検索..."
          className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
