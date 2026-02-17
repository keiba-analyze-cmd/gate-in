// アバター選択肢（競馬テーマ）
export type AvatarOption = {
  emoji: string;
  label: string;
  category: "horse" | "symbol" | "animal" | "item";
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  // 馬系
  { emoji: "🏇", label: "競走馬", category: "horse" },
  { emoji: "🐴", label: "馬", category: "horse" },
  { emoji: "🐎", label: "サラブレッド", category: "horse" },
  { emoji: "🦄", label: "ユニコーン", category: "horse" },
  // シンボル系
  { emoji: "🏆", label: "トロフィー", category: "symbol" },
  { emoji: "👑", label: "王冠", category: "symbol" },
  { emoji: "⭐", label: "スター", category: "symbol" },
  { emoji: "🔥", label: "炎", category: "symbol" },
  { emoji: "💎", label: "ダイヤ", category: "symbol" },
  { emoji: "🌟", label: "キラキラ", category: "symbol" },
  { emoji: "🎯", label: "的中", category: "symbol" },
  { emoji: "🍀", label: "四つ葉", category: "symbol" },
  // 動物系
  { emoji: "🐺", label: "オオカミ", category: "animal" },
  { emoji: "🦅", label: "イーグル", category: "animal" },
  { emoji: "🐻", label: "クマ", category: "animal" },
  { emoji: "🐲", label: "ドラゴン", category: "animal" },
  // アイテム系
  { emoji: "🎩", label: "シルクハット", category: "item" },
  { emoji: "🎪", label: "サーカス", category: "item" },
  { emoji: "🎭", label: "仮面", category: "item" },
  { emoji: "🌈", label: "レインボー", category: "item" },
];

export const DEFAULT_AVATAR = "🏇";

export function isValidAvatar(emoji: string): boolean {
  return AVATAR_OPTIONS.some((a) => a.emoji === emoji);
}
