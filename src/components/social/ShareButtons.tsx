"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  text: string;
  url?: string;
  hashtags?: string[];
  size?: "small" | "large";
};

export default function ShareButtons({ text, url, hashtags = [], size = "small" }: Props) {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "https://www.gate-in.jp");
  
  const defaultHashtags = ["ゲートイン", "競馬予想"];
  const allHashtags = [...new Set([...defaultHashtags, ...hashtags])];
  const hashtagText = allHashtags.map(t => "#" + t).join(" ");
  const fullText = text + "\n\n" + hashtagText;
  
  const encodedText = encodeURIComponent(fullText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const xUrl = "https://x.com/intent/tweet?text=" + encodedText + "&url=" + encodedUrl;
  const lineUrl = "https://social-plugins.line.me/lineit/share?url=" + encodedUrl + "&text=" + encodedText;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("コピー失敗:", err);
    }
  };

  const isLarge = size === "large";
  const buttonBaseSmall = "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors";
  const buttonBaseLarge = "flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl transition-all";
  const buttonBase = isLarge ? buttonBaseLarge : buttonBaseSmall;

  const iconSize = isLarge ? "w-5 h-5" : "w-3.5 h-3.5";
  const flexClass = isLarge ? "flex-1 sm:flex-none" : "";
  const containerClass = isLarge ? "flex flex-wrap items-center gap-2 flex-col sm:flex-row" : "flex flex-wrap items-center gap-2";

  const xBtnClass = buttonBase + " bg-black text-white hover:bg-gray-800 hover:scale-105 " + flexClass;
  const lineBtnClass = buttonBase + " bg-[#06C755] text-white hover:bg-[#05b04d] hover:scale-105 " + flexClass;
  const copyBtnClass = buttonBase + " " + (isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300") + " hover:scale-105 " + flexClass;

  return (
    <div className={containerClass}>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" className={xBtnClass}>
        <XIcon className={iconSize} />
        <span>{isLarge ? "Xでシェア" : "X"}</span>
      </a>

      <a href={lineUrl} target="_blank" rel="noopener noreferrer" className={lineBtnClass}>
        <LineIcon className={iconSize} />
        <span>LINE</span>
      </a>

      <button onClick={copyUrl} className={copyBtnClass}>
        {copied ? (
          <span>✓ コピー済み</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <CopyIcon className={iconSize} />
            <span>{isLarge ? "URLをコピー" : "コピー"}</span>
          </span>
        )}
      </button>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
