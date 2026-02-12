"use client";

import { useRouter } from "next/navigation";

type Props = {
  courses: string[];
  selected: string;
  date: string;
};

export default function CourseFilter({ courses, selected, date }: Props) {
  const router = useRouter();

  const handleSelect = (course: string) => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (course) params.set("course", course);
    router.push(`/races?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => {
          const params = new URLSearchParams();
          params.set("date", date);
          router.push(`/races?${params.toString()}`);
        }}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
          !selected
            ? "bg-green-600 text-white"
            : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
        }`}
      >
        全て
      </button>
      {courses.map((course) => (
        <button
          key={course}
          onClick={() => handleSelect(course)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            selected === course
              ? "bg-green-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
          }`}
        >
          {course}
        </button>
      ))}
    </div>
  );
}
