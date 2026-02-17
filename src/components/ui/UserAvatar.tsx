"use client";

import Image from "next/image";
import { DEFAULT_AVATAR } from "@/lib/constants/avatars";

type Props = {
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  xs: { container: "w-6 h-6", text: "text-xs", imgW: 24, imgH: 24 },
  sm: { container: "w-8 h-8", text: "text-sm", imgW: 32, imgH: 32 },
  md: { container: "w-10 h-10", text: "text-lg", imgW: 40, imgH: 40 },
  lg: { container: "w-14 h-14", text: "text-2xl", imgW: 56, imgH: 56 },
  xl: { container: "w-16 h-16", text: "text-3xl", imgW: 64, imgH: 64 },
};

export default function UserAvatar({ avatarUrl, avatarEmoji, size = "sm", className = "" }: Props) {
  const s = SIZES[size];
  const emoji = avatarEmoji || DEFAULT_AVATAR;

  // avatar_emoji を優先、なければ avatar_url、どちらもなければデフォルト絵文字
  if (avatarEmoji) {
    return (
      <div className={`${s.container} rounded-full bg-green-100 flex items-center justify-center ${s.text} shrink-0 ${className}`}>
        {emoji}
      </div>
    );
  }

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={s.imgW}
        height={s.imgH}
        className={`${s.container} rounded-full shrink-0 ${className}`}
        unoptimized
      />
    );
  }

  return (
    <div className={`${s.container} rounded-full bg-green-100 flex items-center justify-center ${s.text} shrink-0 ${className}`}>
      {DEFAULT_AVATAR}
    </div>
  );
}
