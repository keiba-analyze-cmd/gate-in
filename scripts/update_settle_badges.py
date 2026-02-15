#!/usr/bin/env python3
"""
settle-race.ts に馬券バッジ情報を追加するスクリプト

変更内容:
- 馬券的中時のオッズを変数に保存
- checkAndGrantBadgesに馬券情報を渡す

使用方法:
  mv ~/Downloads/update_settle_badges.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/update_settle_badges.py
"""

from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "lib" / "services" / "settle-race.ts"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 1. 馬券オッズ変数を追加（dangerHit定義の後に追加）
    old_vars = '''let dangerHit = false;

      const picks = vote.vote_picks ?? [];'''
    
    new_vars = '''let dangerHit = false;

      // 馬券バッジ用のオッズ記録
      let hitWinOdds: number | undefined;
      let hitQuinellaOdds: number | undefined;
      let hitWideCount = 0;
      let hitTrioOdds: number | undefined;

      const picks = vote.vote_picks ?? [];'''
    
    if old_vars in content:
        content = content.replace(old_vars, new_vars)
        print("✅ 馬券オッズ変数を追加")
    else:
        print("⚠️  馬券オッズ変数の挿入位置が見つかりません")
    
    # 2. 単勝的中時にオッズを記録
    old_win_hit = '''votePoints += pts;
          winHit = true;
          anyHit = true;

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          transactions.push({
            reason: "win_hit",'''
    
    new_win_hit = '''votePoints += pts;
          winHit = true;
          anyHit = true;
          hitWinOdds = winnerOdds; // バッジ用に記録

          const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
          transactions.push({
            reason: "win_hit",'''
    
    if old_win_hit in content:
        content = content.replace(old_win_hit, new_win_hit)
        print("✅ 単勝オッズ記録を追加")
    
    # 3. 馬連的中時にオッズを記録
    old_quinella_hit = '''const basePts = getQuinellaPointsByOdds(quinellaOdds);
            const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            transactions.push({
              reason: "quinella_hit",'''
    
    new_quinella_hit = '''const basePts = getQuinellaPointsByOdds(quinellaOdds);
            const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;
            hitQuinellaOdds = quinellaOdds; // バッジ用に記録

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            transactions.push({
              reason: "quinella_hit",'''
    
    if old_quinella_hit in content:
        content = content.replace(old_quinella_hit, new_quinella_hit)
        print("✅ 馬連オッズ記録を追加")
    
    # 4. ワイド的中時にカウントを記録
    old_wide_hit = '''const basePts = getWidePointsByOdds(wideOdds);
            const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            transactions.push({
              reason: "wide_hit",'''
    
    new_wide_hit = '''const basePts = getWidePointsByOdds(wideOdds);
            const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;
            hitWideCount++; // バッジ用にカウント

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            transactions.push({
              reason: "wide_hit",'''
    
    if old_wide_hit in content:
        content = content.replace(old_wide_hit, new_wide_hit)
        print("✅ ワイド的中カウントを追加")
    
    # 5. 三連複的中時にオッズを記録
    old_trio_hit = '''const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            const backLabel = backHitsInTop3.length > 0 ? `（△${backCount}頭×${getBackMultiplier(backCount)}）` : "";
            transactions.push({
              reason: "trio_hit",'''
    
    new_trio_hit = '''const pts = basePts + gradeBonus;
            votePoints += pts;
            anyHit = true;
            hitTrioOdds = trioOdds; // バッジ用に記録

            const gradeLabel = gradeBonus > 0 ? `（${race.grade}+${gradeBonus}）` : "";
            const backLabel = backHitsInTop3.length > 0 ? `（△${backCount}頭×${getBackMultiplier(backCount)}）` : "";
            transactions.push({
              reason: "trio_hit",'''
    
    if old_trio_hit in content:
        content = content.replace(old_trio_hit, new_trio_hit)
        print("✅ 三連複オッズ記録を追加")
    
    # 6. checkAndGrantBadgesの呼び出しを更新
    old_badge_call = '''await checkAndGrantBadges(vote.user_id, { isPerfect, isUpset, isG1Win });'''
    
    new_badge_call = '''await checkAndGrantBadges(vote.user_id, {
        isPerfect,
        isUpset,
        isG1Win,
        winOdds: hitWinOdds,
        quinellaOdds: hitQuinellaOdds,
        wideCount: hitWideCount,
        trioOdds: hitTrioOdds,
      });'''
    
    if old_badge_call in content:
        content = content.replace(old_badge_call, new_badge_call)
        print("✅ checkAndGrantBadges呼び出しを更新")
    else:
        print("⚠️  checkAndGrantBadges呼び出しが見つかりません")
    
    file_path.write_text(content, encoding="utf-8")
    print("")
    print("🎉 settle-race.ts を更新しました")
    return True


if __name__ == "__main__":
    main()
