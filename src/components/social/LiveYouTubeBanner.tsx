"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LiveYouTubeBanner() {
  const [url, setUrl] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "live_youtube_url")
        .single();
      if (data?.value) setUrl(data.value);
    })();
  }, []);

  useEffect(() => {
    if (url && !dismissed) {
      document.body.style.paddingTop = "32px";
      return () => { document.body.style.paddingTop = "0px"; };
    }
  }, [url, dismissed]);

  if (!url || dismissed) return null;

  const now = new Date();
  const jstDay = new Date(now.getTime() + 9 * 60 * 60 * 1000).getDay();
  if (jstDay !== 0 && jstDay !== 6) return null;

  return (
    <div className="fixed top-[56px] left-0 right-0 z-40 bg-red-600 overflow-hidden h-8 flex items-center">
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-scroll {
          animation: ticker 15s linear infinite;
          white-space: nowrap;
        }
      `}</style>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="ticker-scroll flex items-center gap-3"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="text-white text-xs font-bold">LIVE配信中</span>
        <span className="text-white/70 text-xs">JRA公式レース映像をYouTubeで視聴 ▸</span>
        <span className="text-white/70 text-xs mx-8">|</span>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="text-white text-xs font-bold">LIVE配信中</span>
        <span className="text-white/70 text-xs">JRA公式レース映像をYouTubeで視聴 ▸</span>
      </a>
      <button
        onClick={(e) => { e.preventDefault(); setDismissed(true); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs z-50"
      >
        ×
      </button>
    </div>
  );
}
