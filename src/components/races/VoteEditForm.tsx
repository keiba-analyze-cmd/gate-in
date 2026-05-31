"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Entry = {
  id: string;
  post_number: number;
  gate_number: number | null;
  jockey: string;
  odds: number | null;
  popularity: number | null;
  horses: {
    id: string;
    name: string;
    sex: string;
    sire: string | null;
  } | null;
};

type VotePick = {
  pick_type: string;
  race_entry_id: string;
};

type Props = {
  raceId: string;
  entries: Entry[];
  existingPicks: VotePick[];
  postTime: string | null;
};

type MarkKey = "win" | "place" | "back" | "danger";

const MARK_SYM: Record<MarkKey, string> = { win: "◎", place: "○", back: "△", danger: "⚠️" };
const MARK_INK: Record<MarkKey, string> = {
  win: "text-brand-strong",
  place: "text-info",
  back: "text-osae",
  danger: "text-ink-3",
};
const MARK_SEL: Record<MarkKey, React.CSSProperties> = {
  win: { background: "var(--brand-soft)", border: "2px solid var(--brand)" },
  place: { background: "var(--info-soft)", border: "2px solid var(--info)" },
  back: { background: "var(--osae-soft)", border: "2px solid var(--osae)" },
  danger: { background: "var(--danger-soft)", border: "2px solid var(--danger)" },
};
const MARK_CHIP: Record<MarkKey, React.CSSProperties> = {
  win: { background: "var(--brand-soft)", color: "var(--brand-strong)" },
  place: { background: "var(--info-soft)", color: "var(--info)" },
  back: { background: "var(--osae-soft)", color: "var(--osae)" },
  danger: { background: "var(--danger-soft)", color: "var(--danger)" },
};

export default function VoteEditForm({ raceId, entries, existingPicks, postTime }: Props) {
  const existingWin = existingPicks.find((p) => p.pick_type === "win")?.race_entry_id ?? null;
  const existingPlace = existingPicks.filter((p) => p.pick_type === "place").map((p) => p.race_entry_id);
  const existingBack = existingPicks.filter((p) => p.pick_type === "back").map((p) => p.race_entry_id);
  const existingDanger = existingPicks.find((p) => p.pick_type === "danger")?.race_entry_id ?? null;

  const [winPick, setWinPick] = useState<string | null>(existingWin);
  const [placePicks, setPlacePicks] = useState<string[]>(existingPlace);
  const [backPicks, setBackPicks] = useState<string[]>(existingBack);
  const [dangerPick, setDangerPick] = useState<string | null>(existingDanger);
  const [activeTab, setActiveTab] = useState<MarkKey>("win");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const router = useRouter();
  const { showToast } = useToast();

  // 締切チェック（発走2分前）
  const isBeforeDeadline = postTime
    ? Date.now() < new Date(postTime).getTime() + 30 * 1000
    : false;

  // 他タブで選択済みかチェック
  const isUsedInOtherTab = (entryId: string): string | null => {
    if (activeTab !== "win" && winPick === entryId) return "◎";
    if (activeTab !== "place" && placePicks.includes(entryId)) return "○";
    if (activeTab !== "back" && backPicks.includes(entryId)) return "△";
    if (activeTab !== "danger" && dangerPick === entryId) return "⚠️";
    return null;
  };

  const togglePlace = (id: string) => {
    if (placePicks.includes(id)) {
      setPlacePicks(placePicks.filter((p) => p !== id));
    } else if (placePicks.length < 2) {
      setPlacePicks([...placePicks, id]);
    }
  };

  const toggleBack = (id: string) => {
    if (backPicks.includes(id)) {
      setBackPicks(backPicks.filter((p) => p !== id));
    } else if (backPicks.length < 5) {
      setBackPicks([...backPicks, id]);
    }
  };

  const handleUpdate = async () => {
    if (!winPick) {
      setError("1着予想を選択してください");
      return;
    }
    setShowConfirm(false);
    setLoading(true);
    setError("");

    const res = await fetch(`/api/races/${raceId}/votes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winPick, placePicks, backPicks, dangerPick }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "変更に失敗しました");
      setLoading(false);
      return;
    }

    showToast("投票を変更しました！✏️");
    setMode("view");
    router.refresh();
  };

  const handleCancel = async () => {
    if (!confirm("投票を取り消しますか？この操作は元に戻せません。")) return;
    setLoading(true);

    const res = await fetch(`/api/races/${raceId}/votes`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "取り消しに失敗しました");
      setLoading(false);
      return;
    }

    showToast("投票を取り消しました 🗑");
    router.refresh();
  };

  if (!isBeforeDeadline) return null;

  if (mode === "view") {
    return (
      <div className="rounded-2xl border bg-surface border-line p-4 font-display">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink-2">✏️ 投票の変更・取消</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("edit")}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors hover:opacity-80"
              style={{ background: "var(--info-soft)", color: "var(--info)" }}
            >
              変更する
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              取り消す
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-3 mt-1">発走2分前まで変更できます</p>
      </div>
    );
  }

  const tabs = [
    { key: "win" as const, label: "◎ 1着予想", desc: "1頭選択" },
    { key: "place" as const, label: "○ 対抗", desc: "0〜2頭" },
    { key: "back" as const, label: "△ 抑え", desc: "0〜5頭" },
    { key: "danger" as const, label: "⚠️ 危険馬", desc: "0〜1頭" },
  ];

  return (
    <div className="rounded-2xl border-2 overflow-hidden bg-surface font-display" style={{ borderColor: "var(--brand)" }}>
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: "var(--brand-soft)" }}>
        <span className="text-sm font-bold text-brand-strong">✏️ 投票変更モード</span>
        <button
          onClick={() => setMode("view")}
          className="text-xs text-brand-strong font-bold hover:underline"
        >
          キャンセル
        </button>
      </div>

      {/* タブ */}
      <div className="flex border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key ? "text-brand-strong bg-brand-soft" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {tab.label}
            <span className="block text-xs font-normal text-ink-3">{tab.desc}</span>
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
          </button>
        ))}
      </div>

      {/* 馬リスト */}
      <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
        {entries.map((entry) => {
          const isSelected =
            activeTab === "win" ? winPick === entry.id
            : activeTab === "place" ? placePicks.includes(entry.id)
            : activeTab === "back" ? backPicks.includes(entry.id)
            : dangerPick === entry.id;

          const usedIn = isUsedInOtherTab(entry.id);
          const isMaxPlace = activeTab === "place" && placePicks.length >= 2 && !isSelected;
          const isMaxBack = activeTab === "back" && backPicks.length >= 5 && !isSelected;
          const isDisabled = !!usedIn || isMaxPlace || isMaxBack;

          return (
            <button
              key={entry.id}
              onClick={() => {
                if (isDisabled) return;
                if (activeTab === "win") setWinPick(isSelected ? null : entry.id);
                else if (activeTab === "place") togglePlace(entry.id);
                else if (activeTab === "back") toggleBack(entry.id);
                else setDangerPick(isSelected ? null : entry.id);
              }}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left border-2 ${
                isSelected
                  ? ""
                  : usedIn
                  ? "bg-surface-2 border-transparent opacity-30"
                  : "bg-surface-2 border-transparent hover:border-line"
              } ${(isMaxPlace || isMaxBack) ? "opacity-40" : ""}`}
              style={isSelected ? MARK_SEL[activeTab] : undefined}
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 font-data" style={{ background: "var(--ink)", color: "var(--bg)" }}>
                {entry.post_number}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink truncate">
                  {entry.horses?.name}
                  {usedIn && <span className="text-[10px] text-ink-3 font-normal ml-1">（{usedIn}で選択中）</span>}
                </div>
                <div className="text-xs text-ink-3">{entry.jockey}</div>
              </div>
              <div className="text-right shrink-0">
                {entry.odds && <span className="font-bold text-ink-2 font-data">{entry.odds}</span>}
                {entry.popularity && <div className="text-xs text-ink-3 font-data">{entry.popularity}人気</div>}
              </div>
              <div className="w-6 shrink-0 text-center">
                {isSelected && (
                  <span className={`text-lg ${MARK_INK[activeTab]}`}>
                    {MARK_SYM[activeTab]}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* フッター */}
      <div className="border-t border-line p-4 bg-surface-2">
        <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
          {winPick && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={MARK_CHIP.win}>
              ◎ {entries.find((e) => e.id === winPick)?.horses?.name}
            </span>
          )}
          {placePicks.map((id) => (
            <span key={id} className="text-xs px-2.5 py-1 rounded-full font-medium" style={MARK_CHIP.place}>
              ○ {entries.find((e) => e.id === id)?.horses?.name}
            </span>
          ))}
          {backPicks.map((id) => (
            <span key={id} className="text-xs px-2.5 py-1 rounded-full font-medium" style={MARK_CHIP.back}>
              △ {entries.find((e) => e.id === id)?.horses?.name}
            </span>
          ))}
          {dangerPick && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={MARK_CHIP.danger}>
              ⚠️ {entries.find((e) => e.id === dangerPick)?.horses?.name}
            </span>
          )}
          {!winPick && !placePicks.length && !backPicks.length && !dangerPick && (
            <span className="text-xs text-ink-3">馬を選択してください</span>
          )}
        </div>
        {error && (
          <div className="text-sm p-2 rounded-lg mb-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
        <button
          onClick={() => { if (winPick) setShowConfirm(true); else setError("1着予想を選択してください"); }}
          disabled={!winPick || loading}
          className="w-full py-3 bg-brand hover:bg-brand-strong text-white font-bold rounded-xl transition-colors disabled:opacity-40"
        >
          {loading ? "変更中..." : "✏️ この内容で変更する"}
        </button>
      </div>

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-xl bg-surface font-display" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink mb-4 text-center">✏️ 変更内容の確認</h3>
            <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
              {(["win", "place", "back", "danger"] as MarkKey[]).flatMap((mk) => {
                const ids = mk === "win" ? (winPick ? [winPick] : [])
                  : mk === "danger" ? (dangerPick ? [dangerPick] : [])
                  : mk === "place" ? placePicks : backPicks;
                const labelText = mk === "win" ? "1着" : mk === "place" ? "対抗" : mk === "back" ? "抑え" : "危険";
                return ids.map((id) => {
                  const e = entries.find((x) => x.id === id);
                  if (!e) return null;
                  return (
                    <div key={`${mk}-${id}`} className="flex items-center gap-2 rounded-lg p-3" style={{ background: MARK_CHIP[mk].background }}>
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: MARK_CHIP[mk].color }}>
                        {MARK_SYM[mk]} {labelText}
                      </span>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-data" style={{ background: "var(--ink)", color: "var(--bg)" }}>{e.post_number}</span>
                      <span className="font-bold text-ink">{e.horses?.name}</span>
                    </div>
                  );
                });
              })}
              {!dangerPick && placePicks.length === 0 && backPicks.length === 0 && (
                <p className="text-xs text-ink-3 text-center">※ 対抗・抑え・危険馬は未選択です（任意）</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border border-line rounded-xl text-sm font-bold text-ink-2 hover:bg-surface-2 transition-colors">戻る</button>
              <button onClick={handleUpdate} className="flex-1 py-3 bg-brand hover:bg-brand-strong text-white rounded-xl text-sm font-bold transition-colors">変更する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
