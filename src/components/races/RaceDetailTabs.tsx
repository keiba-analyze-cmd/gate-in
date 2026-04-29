"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type RaceStatus = "voting_open" | "voting_closed" | "running" | "finished";

type TabConfig = {
  key: string;
  label: string;
  badge?: number | string;
};

type Props = {
  raceStatus: RaceStatus;
  hasVoted: boolean;
  voterCount?: number;
  children: {
    vote?: React.ReactNode;
    myPicks?: React.ReactNode;
    result?: React.ReactNode;
    everyone?: React.ReactNode;
    aiPrediction?: React.ReactNode;
    info?: React.ReactNode;
    finishOrder?: React.ReactNode;
    payout?: React.ReactNode;
  };
};

export default function RaceDetailTabs({
  raceStatus,
  hasVoted,
  voterCount,
  children,
}: Props) {
  const { isDark } = useTheme();
  const isFinished = raceStatus === "finished";
  const isOpen = raceStatus === "voting_open";

  // Tab configs based on status
  const getTabs = (): TabConfig[] => {
    if (isFinished) {
      return [
        { key: "result", label: "結果" },
        { key: "finishOrder", label: "着順" },
        { key: "payout", label: "配当" },
        { key: "everyone", label: "みんな", badge: voterCount },
      ];
    }

    if (hasVoted) {
      return [
        { key: "myPicks", label: "My予想" },
        { key: "everyone", label: "みんな", badge: voterCount },
        { key: "aiPrediction", label: "AI予想" },
        { key: "info", label: "情報" },
      ];
    }

    // Not voted yet
    return [
      { key: "vote", label: "投票" },
      { key: "everyone", label: "みんな", badge: voterCount },
      { key: "aiPrediction", label: "AI予想" },
      { key: "info", label: "情報" },
    ];
  };

  const tabs = getTabs();
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "vote");

  // Ensure activeTab is valid
  const currentTab = tabs.find((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  const getContent = () => {
    switch (currentTab) {
      case "vote":
        return children.vote;
      case "myPicks":
        return children.myPicks;
      case "result":
        return children.result;
      case "everyone":
        return children.everyone;
      case "aiPrediction":
        return children.aiPrediction;
      case "info":
        return children.info;
      case "finishOrder":
        return children.finishOrder;
      case "payout":
        return children.payout;
      default:
        return null;
    }
  };

  const activeColor = isDark ? "text-amber-400" : "text-green-600";
  const activeBorder = isDark ? "border-amber-400" : "border-green-600";
  const inactiveColor = isDark ? "text-slate-500" : "text-gray-400";

  return (
    <div>
      {/* Tab bar */}
      <div
        className={`flex border-b ${
          isDark ? "border-slate-700" : "border-gray-200"
        }`}
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-center py-2.5 text-xs font-medium transition-colors relative ${
                isActive ? activeColor : inactiveColor
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span
                  className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                    isDark
                      ? "bg-slate-700 text-slate-400"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${activeBorder}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-0">{getContent()}</div>
    </div>
  );
}
