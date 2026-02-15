"use client";

import { useRouter } from "next/navigation";

type Props = {
  voteId: string;
  raceId: string;
  disabled?: boolean;
};

export default function CopyVoteButton({ voteId, raceId, disabled }: Props) {
  const router = useRouter();

  const handleCopy = () => {
    router.push(`/races/${raceId}?copy_from=${voteId}`);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={disabled}
      className="text-xs text-blue-500 hover:text-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      🚀 乗っかる
    </button>
  );
}
