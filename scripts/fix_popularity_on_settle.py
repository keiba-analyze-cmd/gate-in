#!/usr/bin/env python3
"""
結果取得時に人気・オッズを更新する修正スクリプト

修正内容:
1. scrapeResults で人気・オッズも取得
2. 精算処理で race_entries を更新してからポイント計算

使用方法:
  mv ~/Downloads/fix_popularity_on_settle.py ~/gate-in/scripts/
  cd ~/gate-in && python scripts/fix_popularity_on_settle.py
  npm run build
  git add -A && git commit -m "fix: 結果取得時に人気・オッズを更新" && git push
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "app" / "api" / "cron" / "auto-settle" / "route.ts"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # ========== 修正1: scrapeResults の results に popularity と odds を追加 ==========
    
    old_results_type = '''  const results: {
    post_number: number; horse_name: string; finish_position: number;
    finish_time: string | null;
  }[] = [];'''
    
    new_results_type = '''  const results: {
    post_number: number; horse_name: string; finish_position: number;
    finish_time: string | null; popularity: number | null; odds: number | null;
  }[] = [];'''
    
    if old_results_type in content:
        content = content.replace(old_results_type, new_results_type)
        print("✅ results型定義を修正（popularity, odds追加）")
    else:
        print("⚠️  results型定義が見つかりません")
    
    # ========== 修正2: scrapeResultsのパース処理で人気・オッズを取得 ==========
    
    old_parse_logic = '''    const timeText = tds.eq(7).text().trim() || null;

    results.push({
      finish_position: pos, post_number: postNum,
      horse_name: horseName.replace(/\\s+/g, ""),
      finish_time: timeText,
    });'''
    
    new_parse_logic = '''    const timeText = tds.eq(7).text().trim() || null;

    // 人気を取得（「X人気」の形式）
    const ninkiText = $r.find("td.Ninki span").first().text().trim();
    const ninkiMatch = ninkiText.match(/(\\d+)人気/);
    const popularity = ninkiMatch ? parseInt(ninkiMatch[1]) : null;

    // オッズを取得
    const oddsText = $r.find("span.Odds_Ninki").text().trim() 
      || $r.find("td.Odds span").first().text().trim();
    const odds = parseFloat(oddsText) || null;

    results.push({
      finish_position: pos, post_number: postNum,
      horse_name: horseName.replace(/\\s+/g, ""),
      finish_time: timeText, popularity, odds,
    });'''
    
    if old_parse_logic in content:
        content = content.replace(old_parse_logic, new_parse_logic)
        print("✅ 人気・オッズ取得ロジックを追加")
    else:
        print("⚠️  パースロジックが見つかりません（既に修正済み？）")
    
    # ========== 修正3: 精算処理でrace_entriesを更新 ==========
    
    old_settle_logic = '''      // 馬番→race_entry_idマッピング
      const entryMap = new Map(
        ((race.race_entries as any[]) ?? []).map((e: any) => [
          e.post_number, e.id
        ])
      );

      const resultInserts = raceResults
        .filter((r) => entryMap.has(r.post_number))
        .map((r) => ({
          race_id: race.id,
          race_entry_id: entryMap.get(r.post_number)!,
          finish_position: r.finish_position,
          finish_time: r.finish_time ?? null,
        }));'''
    
    new_settle_logic = '''      // 馬番→race_entry_idマッピング
      const entryMap = new Map(
        ((race.race_entries as any[]) ?? []).map((e: any) => [
          e.post_number, e.id
        ])
      );

      // race_entriesの人気・オッズを更新（結果確定時の値で上書き）
      for (const r of raceResults) {
        const entryId = entryMap.get(r.post_number);
        if (entryId && (r.popularity != null || r.odds != null)) {
          const updates: Record<string, any> = {};
          if (r.popularity != null) updates.popularity = r.popularity;
          if (r.odds != null) updates.odds = r.odds;
          await admin.from("race_entries").update(updates).eq("id", entryId);
        }
      }

      const resultInserts = raceResults
        .filter((r) => entryMap.has(r.post_number))
        .map((r) => ({
          race_id: race.id,
          race_entry_id: entryMap.get(r.post_number)!,
          finish_position: r.finish_position,
          finish_time: r.finish_time ?? null,
        }));'''
    
    if old_settle_logic in content:
        content = content.replace(old_settle_logic, new_settle_logic)
        print("✅ race_entries更新ロジックを追加")
    else:
        print("⚠️  精算ロジックが見つかりません（既に修正済み？）")
    
    # ファイル書き込み
    file_path.write_text(content, encoding="utf-8")
    
    print("")
    print("📁 対象ファイル:")
    print(f"   {file_path}")
    print("")
    print("📝 変更内容:")
    print("   - scrapeResultsで人気・オッズを取得")
    print("   - 精算時にrace_entriesのpopularity/oddsを更新")
    print("   - その後でポイント計算を実行")
    print("")
    print("🚀 次のステップ:")
    print("   1. npm run build")
    print("   2. git add -A && git commit -m 'fix: 結果取得時に人気・オッズを更新' && git push")
    
    return True


if __name__ == "__main__":
    main()
