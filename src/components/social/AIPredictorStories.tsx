"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import Image from "next/image";
import Link from "next/link";

type AiPredictor = {
  id: string;
  name: string;
  type_label: string;
  theme_color: string;
  image_url?: string;
};

type StoryContent = {
  id: string;
  predictor_id: string;
  type: "prediction" | "result" | "column" | "monthly";
  title: string;
  subtitle?: string;
  race_name?: string;
  race_grade?: string;
  pick_number?: number;
  pick_name?: string;
  hit?: boolean;
  comment?: string;
  created_at: string;
};

type Props = {
  predictors: AiPredictor[];
  stories: StoryContent[];
  readStoryIds?: string[];
  userId?: string;
};

const BADGE_CONFIG: Record<string, { label: string; bg: string }> = {
  prediction: { label: "予想", bg: "bg-red-500" },
  result: { label: "的中", bg: "bg-green-500" },
  column: { label: "コラム", bg: "bg-indigo-500" },
  monthly: { label: "成績", bg: "bg-amber-500" },
};

export default function AIPredictorStories({
  predictors,
  stories,
  readStoryIds = [],
  userId,
}: Props) {
  const { isDark } = useTheme();
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(readStoryIds)
  );
  const [activePredictor, setActivePredictor] = useState<string | null>(
    null
  );
  const [storyIndex, setStoryIndex] = useState(0);
  const supabase = createClient();

  // Group stories by predictor
  const storyMap: Record<string, StoryContent[]> = {};
  for (const s of stories) {
    if (!storyMap[s.predictor_id]) storyMap[s.predictor_id] = [];
    storyMap[s.predictor_id].push(s);
  }

  // Sort: unread first, then by latest story
  const sortedPredictors = [...predictors].sort((a, b) => {
    const aStories = storyMap[a.id] || [];
    const bStories = storyMap[b.id] || [];
    const aHasUnread = aStories.some((s) => !readIds.has(s.id));
    const bHasUnread = bStories.some((s) => !readIds.has(s.id));
    if (aHasUnread && !bHasUnread) return -1;
    if (!aHasUnread && bHasUnread) return 1;
    const aLatest = aStories[0]?.created_at || "";
    const bLatest = bStories[0]?.created_at || "";
    return bLatest.localeCompare(aLatest);
  });

  const openStory = (predictorId: string) => {
    setActivePredictor(predictorId);
    setStoryIndex(0);
  };

  const closeStory = () => {
    setActivePredictor(null);
    setStoryIndex(0);
  };

  const markAsRead = async (storyId: string) => {
    if (readIds.has(storyId) || !userId) return;
    setReadIds((prev) => new Set([...prev, storyId]));
    try {
      await supabase.from("user_story_reads").upsert(
        {
          user_id: userId,
          story_id: storyId,
          read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,story_id" }
      );
    } catch {}
  };

  const currentStories = activePredictor
    ? storyMap[activePredictor] || []
    : [];
  const currentStory = currentStories[storyIndex] || null;
  const currentPredictor = predictors.find(
    (p) => p.id === activePredictor
  );

  useEffect(() => {
    if (currentStory) {
      markAsRead(currentStory.id);
    }
  }, [currentStory?.id]);

  const nextStory = () => {
    if (storyIndex < currentStories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else {
      // Move to next predictor
      const currentIdx = sortedPredictors.findIndex(
        (p) => p.id === activePredictor
      );
      const next = sortedPredictors[currentIdx + 1];
      if (next && storyMap[next.id]?.length) {
        setActivePredictor(next.id);
        setStoryIndex(0);
      } else {
        closeStory();
      }
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else {
      const currentIdx = sortedPredictors.findIndex(
        (p) => p.id === activePredictor
      );
      const prev = sortedPredictors[currentIdx - 1];
      if (prev && storyMap[prev.id]?.length) {
        setActivePredictor(prev.id);
        setStoryIndex((storyMap[prev.id]?.length || 1) - 1);
      }
    }
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case "G1": return "#f59e0b";
      case "G2": return "#ef4444";
      case "G3": return "#22c55e";
      default: return "#6366f1";
    }
  };

  return (
    <>
      {/* Stories row */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {sortedPredictors.map((predictor) => {
          const pStories = storyMap[predictor.id] || [];
          const hasUnread = pStories.some((s) => !readIds.has(s.id));
          const hasStories = pStories.length > 0;
          const latestType = pStories[0]?.type;
          const badge = latestType ? BADGE_CONFIG[latestType] : null;

          return (
            <button
              key={predictor.id}
              onClick={() => hasStories && openStory(predictor.id)}
              className="text-center min-w-[60px] shrink-0"
              disabled={!hasStories}
            >
              <div
                className="w-[56px] h-[56px] rounded-full p-[3px] mx-auto mb-1"
                style={{
                  background: hasUnread
                    ? `linear-gradient(135deg, ${predictor.theme_color}, #f59e0b)`
                    : hasStories
                    ? isDark
                      ? "#374151"
                      : "#d1d5db"
                    : "transparent",
                  border: !hasStories
                    ? `2px dashed ${isDark ? "#374151" : "#e5e7eb"}`
                    : "none",
                }}
              >
                <div
                  className="w-full h-full rounded-full border-[2.5px] overflow-hidden"
                  style={{
                    borderColor: isDark ? "#0f172a" : "#fff",
                    backgroundColor: `${predictor.theme_color}22`,
                  }}
                >
                  {predictor.image_url && (
                    <Image
                      src={predictor.image_url}
                      alt={predictor.name}
                      width={50}
                      height={50}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
              <div
                className={`text-[10px] font-medium ${
                  hasUnread
                    ? isDark
                      ? "text-white"
                      : "text-gray-900"
                    : isDark
                    ? "text-slate-500"
                    : "text-gray-400"
                }`}
                style={hasUnread ? { color: predictor.theme_color } : {}}
              >
                {predictor.name}
              </div>
              {badge && hasUnread && (
                <span
                  className={`inline-block text-[8px] text-white font-bold px-1.5 rounded-full mt-0.5 ${badge.bg}`}
                >
                  {badge.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Story overlay */}
      {activePredictor && currentStory && currentPredictor && (
        <div
          className="fixed inset-0 z-50 bg-black"
          onClick={closeStory}
        >
          <div
            className="h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bars */}
            <div className="flex gap-1 px-4 pt-3">
              {currentStories.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-[3px] rounded-full overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: i < storyIndex ? "100%" : i === storyIndex ? "100%" : "0%",
                      backgroundColor: "#fff",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-9 h-9 rounded-full border-2 overflow-hidden"
                style={{
                  borderColor: currentPredictor.theme_color,
                  backgroundColor: `${currentPredictor.theme_color}22`,
                }}
              >
                {currentPredictor.image_url && (
                  <Image
                    src={currentPredictor.image_url}
                    alt={currentPredictor.name}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">
                  {currentPredictor.name}
                </div>
                <div className="text-[10px] text-white/50">
                  {currentPredictor.type_label}
                </div>
              </div>
              <div className="text-[10px] text-white/40">
                {new Date(currentStory.created_at).toLocaleDateString(
                  "ja-JP",
                  { month: "short", day: "numeric" }
                )}
              </div>
              <button
                onClick={closeStory}
                className="text-white/60 text-lg ml-2"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-6">
              <div
                className="w-full max-w-sm rounded-2xl p-6 text-center"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {currentStory.type === "prediction" && (
                  <>
                    <div className="text-[10px] text-white/40 mb-1">
                      {currentStory.subtitle || "今日の注目レース"}
                    </div>
                    {currentStory.race_grade && (
                      <span
                        className="inline-block text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full mb-2"
                        style={{
                          backgroundColor: `${getGradeColor(currentStory.race_grade)}66`,
                        }}
                      >
                        {currentStory.race_grade}
                      </span>
                    )}
                    <div className="text-xl font-bold text-white mb-1">
                      {currentStory.race_name}
                    </div>
                    <div
                      className="border-t my-4 pt-4"
                      style={{ borderColor: "rgba(255,255,255,0.1)" }}
                    >
                      <div
                        className="text-[10px] mb-2"
                        style={{ color: currentPredictor.theme_color }}
                      >
                        {currentPredictor.name}の本命
                      </div>
                      <div className="text-4xl text-white mb-1">◎</div>
                      <div className="text-2xl font-bold text-white mb-0.5">
                        {currentStory.pick_number}番{" "}
                        {currentStory.pick_name}
                      </div>
                    </div>
                    {currentStory.comment && (
                      <div
                        className="rounded-xl p-3 mt-3 text-left text-xs text-white/80 leading-relaxed"
                        style={{
                          backgroundColor: `${currentPredictor.theme_color}22`,
                          borderLeft: `3px solid ${currentPredictor.theme_color}`,
                        }}
                      >
                        {currentStory.comment}
                      </div>
                    )}
                    <Link
                      href={`/races/${currentStory.id}`}
                      className="block mt-4 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{
                        backgroundColor: currentPredictor.theme_color,
                      }}
                    >
                      この予想で乗っかる
                    </Link>
                  </>
                )}

                {currentStory.type === "result" && (
                  <>
                    <div className="text-[10px] text-white/40 mb-1">
                      結果速報
                    </div>
                    <div className="text-lg font-bold text-white mb-3">
                      {currentStory.race_name}
                    </div>
                    <div
                      className={`text-5xl mb-2 ${
                        currentStory.hit
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {currentStory.hit ? "✓" : "×"}
                    </div>
                    <div
                      className={`text-xl font-bold mb-1 ${
                        currentStory.hit
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {currentStory.hit ? "的中！" : "不的中"}
                    </div>
                    <div className="text-sm text-white/60">
                      ◎{currentStory.pick_number}番{" "}
                      {currentStory.pick_name}
                    </div>
                    {currentStory.comment && (
                      <div className="text-xs text-white/50 mt-3">
                        {currentStory.comment}
                      </div>
                    )}
                  </>
                )}

                {currentStory.type === "column" && (
                  <>
                    <div className="text-[10px] text-white/40 mb-1">
                      コラム
                    </div>
                    <div className="text-lg font-bold text-white mb-3">
                      {currentStory.title}
                    </div>
                    {currentStory.comment && (
                      <div className="text-sm text-white/70 leading-relaxed text-left">
                        {currentStory.comment}
                      </div>
                    )}
                    <Link
                      href={`/predictors/${currentPredictor.id}`}
                      className="inline-block mt-4 text-xs text-white/50 underline"
                    >
                      もっと読む →
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Tap zones */}
            <div className="absolute inset-0 flex pointer-events-none">
              <button
                className="w-1/3 h-full pointer-events-auto"
                onClick={prevStory}
              />
              <div className="w-1/3" />
              <button
                className="w-1/3 h-full pointer-events-auto"
                onClick={nextStory}
              />
            </div>

            {/* Bottom */}
            <div className="px-4 pb-6 flex items-center gap-3">
              <Link
                href={`/predictors/${currentPredictor.id}`}
                className="text-xs text-white/40 underline"
              >
                {currentPredictor.name}のプロフィール →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
