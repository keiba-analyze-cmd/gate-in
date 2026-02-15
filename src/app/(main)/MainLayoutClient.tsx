"use client";

import { useTheme } from "@/contexts/ThemeContext";

export default function MainLayoutClient({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  return <div className={`min-h-screen transition-colors ${isDark ? "bg-slate-950" : "bg-gray-50"}`}>{children}</div>;
}
