// src/hooks/useDojoXp.ts
"use client";

import { useState, useCallback } from "react";
import type { BadgeDefinition } from "@/lib/constants/gamification";

type Achievement = {
  type: "badge" | "title" | "xp";
  badge?: BadgeDefinition;
  titleName?: string;
  titleEmoji?: string;
  xpAmount?: number;
};

type XpResult = {
  xp: number;
  totalXp: number;
  newBadges: BadgeDefinition[];
};

export function useDojoXp() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showPopup, setShowPopup] = useState(false);

  const awardXp = useCallback(
    async (
      action: string,
      meta?: Record<string, any>
    ): Promise<XpResult | null> => {
      try {
        const res = await fetch("/api/dojo/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, meta }),
        });
        if (!res.ok) return null;

        const result: XpResult = await res.json();

        // 通知を構築
        const newAchievements: Achievement[] = [];

        // XP通知（常に表示）
        if (result.xp > 0) {
          newAchievements.push({
            type: "xp",
            xpAmount: result.xp,
          });
        }

        // 新バッジ通知
        if (result.newBadges && result.newBadges.length > 0) {
          for (const badge of result.newBadges) {
            newAchievements.push({
              type: "badge",
              badge,
            });
          }
        }

        if (newAchievements.length > 0) {
          setAchievements(newAchievements);
          setShowPopup(true);
        }

        return result;
      } catch (error) {
        console.error("XP付与エラー:", error);
        return null;
      }
    },
    []
  );

  const closePopup = useCallback(() => {
    setShowPopup(false);
    setAchievements([]);
  }, []);

  return {
    awardXp,
    achievements,
    showPopup,
    closePopup,
  };
}
