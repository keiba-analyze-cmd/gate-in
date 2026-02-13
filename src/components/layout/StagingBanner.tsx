"use client";
export default function StagingBanner() {
  const env = process.env.NEXT_PUBLIC_ENV;
  if (env === "production" || !env) return null;
  return (<div className="bg-orange-500 text-white text-center text-xs font-bold py-1 px-4 z-[100] relative">⚠️ ステージング環境 — 本番ではありません</div>);
}
