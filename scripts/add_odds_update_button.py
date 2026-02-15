#!/usr/bin/env python3
"""
管理画面にオッズ更新ボタンを追加するスクリプト

使用方法:
  mv ~/Downloads/add_odds_update_button.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/add_odds_update_button.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "components" / "admin" / "AdminScrapeForm.tsx"
    
    if not file_path.exists():
        print(f"❌ AdminScrapeForm.tsx が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. オッズ更新用のstateを追加
    old_state = '''const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0, message: "" });'''
    
    new_state = '''const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0, message: "" });

  // ── オッズ更新用 ──
  const [updatingOdds, setUpdatingOdds] = useState(false);
  const [oddsResult, setOddsResult] = useState<{ message: string; results: any[] } | null>(null);'''
    
    if old_state in content:
        content = content.replace(old_state, new_state)
        print("✅ オッズ更新用のstateを追加")
    
    # 2. オッズ更新関数を追加（handleScrapeAndPreviewの前に）
    old_handle = '''// ── GUI上でスクレイピング → プレビュー表示 ──
  const handleScrapeAndPreview'''
    
    new_handle = '''// ── オッズ更新 ──
  const handleUpdateOdds = async () => {
    setUpdatingOdds(true);
    setOddsResult(null);
    setError("");

    try {
      const res = await fetch("/api/admin/scrape-odds", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "オッズ更新に失敗しました");
      }
      
      setOddsResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "オッズ更新に失敗しました");
    } finally {
      setUpdatingOdds(false);
    }
  };

  // ── GUI上でスクレイピング → プレビュー表示 ──
  const handleScrapeAndPreview'''
    
    if old_handle in content:
        content = content.replace(old_handle, new_handle)
        print("✅ オッズ更新関数を追加")
    
    # 3. UIにオッズ更新ボタンを追加（スクレイピングボタンの近くに）
    # まずreturn文内のスクレイピングセクションを探す
    old_scrape_section = '''<h3 className="font-bold text-gray-700 mb-2">📡 ライブスクレイピング</h3>'''
    
    new_scrape_section = '''<div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="font-bold text-blue-700 mb-2">🔄 オッズ更新</h3>
          <p className="text-xs text-blue-600 mb-3">投票受付中のレースのオッズ・人気を最新に更新します</p>
          <button
            onClick={handleUpdateOdds}
            disabled={updatingOdds}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {updatingOdds ? "更新中..." : "オッズを更新"}
          </button>
          {oddsResult && (
            <div className="mt-3 p-3 bg-white rounded-lg text-sm">
              <p className="font-bold text-green-600 mb-2">{oddsResult.message}</p>
              {oddsResult.results.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1">
                  {oddsResult.results.map((r: any, i: number) => (
                    <li key={i}>
                      {r.name}: {r.updated}頭更新 {r.error && <span className="text-red-500">({r.error})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <h3 className="font-bold text-gray-700 mb-2">📡 ライブスクレイピング</h3>'''
    
    if old_scrape_section in content:
        content = content.replace(old_scrape_section, new_scrape_section)
        print("✅ オッズ更新UIを追加")
    else:
        print("⚠️  スクレイピングセクションが見つかりません（手動確認が必要）")
    
    file_path.write_text(content, encoding="utf-8")
    print("")
    print("🎉 AdminScrapeForm.tsx を更新しました")
    return True


if __name__ == "__main__":
    main()
