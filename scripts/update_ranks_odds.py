#!/usr/bin/env python3
"""
ranks.ts にオッズ連動ポイントテーブルを追加するスクリプト

使用方法:
  mv ~/Downloads/update_ranks_odds.py ~/gate-in/scripts/
  cd ~/gate-in && python scripts/update_ranks_odds.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "lib" / "constants" / "ranks.ts"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 古いPOINT_RULESセクションを置換
    old_section = '''// ====================================================
// ポイントルール
// ====================================================

// 1着的中: 人気別ポイント（大穴ほど高い）
export const POINT_RULES = {
  win: {
    1: 30, 2: 50, 3: 50,
    4: 80, 5: 80,
    6: 120, 7: 120,
    8: 200, 9: 200,
    default: 300,
  } as Record<number | string, number>,

  // 複勝的中: 固定
  place: 20,

  // 危険馬的中: 人気別ポイント（人気馬を危険視→着外ほど評価高い）
  danger: {
    1: 50, 2: 40, 3: 30,
    4: 20, 5: 15,
    default: 10,
  } as Record<number | string, number>,

  // グレード別ボーナス（各的中に加算）
  grade_bonus: {
    G1: 30,
    G2: 15,
    G3: 10,
    L: 5,
    OP: 5,
  } as Record<string, number>,

  // 完全的中ボーナス（◎○△全的中）
  perfect: 200,

  // 連続的中ボーナス（3の倍数ごと）
  streak3: 50,
} as const;

// 1着的中ポイントを取得
export function getWinPoints(popularity: number): number {
  return POINT_RULES.win[popularity] ?? POINT_RULES.win.default;
}

// 危険馬的中ポイントを取得（人気馬ほど高い）
export function getDangerPoints(popularity: number): number {
  return POINT_RULES.danger[popularity] ?? POINT_RULES.danger.default;
}

// グレードボーナスを取得
export function getGradeBonus(grade: string | null): number {
  if (!grade) return 0;
  return (POINT_RULES.grade_bonus as Record<string, number>)[grade] ?? 0;
}'''

    new_section = '''// ====================================================
// ポイントルール（オッズ連動版）
// ====================================================

export const POINT_RULES = {
  // 単勝（◎が1着）: オッズ別
  win_odds: [
    { max: 1.9, points: 20 },   // 鉄板
    { max: 3.9, points: 40 },   // 本命
    { max: 6.9, points: 60 },   // 中穴
    { max: 14.9, points: 100 }, // 穴
    { max: 29.9, points: 150 }, // 大穴
    { max: Infinity, points: 250 }, // 超大穴
  ],

  // 複勝（○が3着以内）: オッズ別
  place_odds: [
    { max: 1.4, points: 10 },   // 鉄板
    { max: 2.4, points: 15 },   // 本命
    { max: 3.9, points: 25 },   // 中穴
    { max: 6.9, points: 40 },   // 穴
    { max: Infinity, points: 60 }, // 大穴
  ],

  // 馬連（◎○が1-2着）: オッズ別
  quinella_odds: [
    { max: 9.9, points: 30 },
    { max: 29.9, points: 50 },
    { max: 59.9, points: 80 },
    { max: 99.9, points: 120 },
    { max: 299.9, points: 180 },
    { max: Infinity, points: 280 },
  ],

  // ワイド（◎○が3着以内）: オッズ別
  wide_odds: [
    { max: 2.9, points: 15 },
    { max: 5.9, points: 25 },
    { max: 9.9, points: 40 },
    { max: 19.9, points: 60 },
    { max: Infinity, points: 90 },
  ],

  // 三連複（◎○○/◎○△/◎△△が1-2-3着）: オッズ別
  trio_odds: [
    { max: 9.9, points: 20 },
    { max: 49.9, points: 50 },
    { max: 99.9, points: 80 },
    { max: 299.9, points: 120 },
    { max: 999.9, points: 180 },
    { max: Infinity, points: 300 },
  ],

  // △（抑え）の数に応じた倍率
  back_multiplier: [
    { count: 1, multiplier: 1.0 },
    { count: 2, multiplier: 0.8 },
    { count: 3, multiplier: 0.6 },
    { count: 4, multiplier: 0.4 },
    { count: 5, multiplier: 0.2 },
  ],

  // 危険馬的中: 人気別ポイント（人気馬を危険視→着外ほど評価高い）
  danger: {
    1: 50, 2: 40, 3: 30,
    4: 20, 5: 15,
    default: 10,
  } as Record<number | string, number>,

  // グレード別ボーナス（各的中に加算）
  grade_bonus: {
    G1: 30,
    G2: 15,
    G3: 10,
    L: 5,
    OP: 5,
  } as Record<string, number>,

  // 完全的中ボーナス（◎○⚠️全的中）
  perfect: 200,

  // 連続的中ボーナス（3の倍数ごと）
  streak3: 50,
} as const;

// ====================================================
// ポイント取得関数
// ====================================================

// オッズからポイントを取得する汎用関数
function getPointsByOdds(odds: number, table: readonly { max: number; points: number }[]): number {
  for (const tier of table) {
    if (odds <= tier.max) return tier.points;
  }
  return table[table.length - 1].points;
}

// 単勝ポイント（オッズ連動）
export function getWinPointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.win_odds);
}

// 複勝ポイント（オッズ連動）
export function getPlacePointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.place_odds);
}

// 馬連ポイント（オッズ連動）
export function getQuinellaPointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.quinella_odds);
}

// ワイドポイント（オッズ連動）
export function getWidePointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.wide_odds);
}

// 三連複ポイント（オッズ連動）
export function getTrioPointsByOdds(odds: number): number {
  return getPointsByOdds(odds, POINT_RULES.trio_odds);
}

// △の数から倍率を取得
export function getBackMultiplier(backCount: number): number {
  if (backCount <= 0) return 1.0;
  const tier = POINT_RULES.back_multiplier.find(t => t.count === backCount);
  return tier?.multiplier ?? 0.2; // 5頭以上は0.2
}

// 危険馬的中ポイントを取得（人気馬ほど高い）
export function getDangerPoints(popularity: number): number {
  return POINT_RULES.danger[popularity] ?? POINT_RULES.danger.default;
}

// グレードボーナスを取得
export function getGradeBonus(grade: string | null): number {
  if (!grade) return 0;
  return (POINT_RULES.grade_bonus as Record<string, number>)[grade] ?? 0;
}

// ====================================================
// 旧関数（後方互換性のため残す）
// ====================================================

// 1着的中ポイント（人気別 → 非推奨、オッズ連動を使用推奨）
const WIN_POINTS_BY_POPULARITY: Record<number | string, number> = {
  1: 30, 2: 50, 3: 50,
  4: 80, 5: 80,
  6: 120, 7: 120,
  8: 200, 9: 200,
  default: 300,
};

export function getWinPoints(popularity: number): number {
  return WIN_POINTS_BY_POPULARITY[popularity] ?? WIN_POINTS_BY_POPULARITY.default;
}'''

    if old_section in content:
        content = content.replace(old_section, new_section)
        file_path.write_text(content, encoding="utf-8")
        print("✅ ranks.ts を更新しました")
        print("")
        print("📝 追加した関数:")
        print("   - getWinPointsByOdds(odds)")
        print("   - getPlacePointsByOdds(odds)")
        print("   - getQuinellaPointsByOdds(odds)")
        print("   - getWidePointsByOdds(odds)")
        print("   - getTrioPointsByOdds(odds)")
        print("   - getBackMultiplier(backCount)")
        return True
    else:
        print("⚠️  置換対象が見つかりません（既に更新済み？）")
        return False


if __name__ == "__main__":
    main()
