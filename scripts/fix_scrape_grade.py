#!/usr/bin/env python3
"""
スクレイプのグレード判定ロジックを修正するスクリプト

問題: netkeibaのIcon_GradeTypeはテキストが空で、クラス名にグレード情報が含まれている
解決: titleタグとIcon_GradeTypeのクラス名からグレードを抽出する

使用方法:
  # 1. ダウンロードフォルダからscriptsに移動
  mv ~/Downloads/fix_scrape_grade.py ~/gate-in/scripts/

  # 2. scriptsフォルダで実行
  cd ~/gate-in && python scripts/fix_scrape_grade.py

  # 3. ビルド確認 & コミット
  npm run build
  git add -A && git commit -m "fix: スクレイプのグレード判定ロジック改善（G2/G3対応）" && git push

対象ファイル: src/app/api/admin/scrape/route.ts
"""

import re
from pathlib import Path
import os

def main():
    # プロジェクトルートを探す（scriptsフォルダから実行される想定）
    script_dir = Path(__file__).parent
    
    # gate-in/scripts から実行された場合
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        # カレントディレクトリがプロジェクトルートと仮定
        project_root = Path.cwd()
    
    file_path = project_root / "src" / "app" / "api" / "admin" / "scrape" / "route.ts"
    
    if not file_path.exists():
        print(f"❌ ファイルが見つかりません: {file_path}")
        print(f"   現在のディレクトリ: {Path.cwd()}")
        print(f"   スクリプトの場所: {script_dir}")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    
    # 修正1: scrapeRace関数内のグレード判定ロジックを改善
    # 現在のコード:
    #   const gradeText = $(".Icon_GradeType").text().trim();
    #   const grade = detectGrade(raceNameRaw + " " + gradeText + " " + fullInfo);
    
    old_grade_logic = '''  const gradeText = $(".Icon_GradeType").text().trim();
  const grade = detectGrade(raceNameRaw + " " + gradeText + " " + fullInfo);'''
    
    new_grade_logic = '''  // グレード判定: titleタグ → Icon_GradeTypeクラス名 → テキスト解析 の優先順
  const titleText = $("title").text();
  const titleGrade = detectGrade(titleText);
  
  // Icon_GradeTypeのクラス名からグレードを判定
  const gradeIconClass = $(".Icon_GradeType").attr("class") || "";
  let iconGrade: string | null = null;
  if (gradeIconClass.includes("Icon_GradeType1")) iconGrade = "G1";
  else if (gradeIconClass.includes("Icon_GradeType2")) iconGrade = "G2";
  else if (gradeIconClass.includes("Icon_GradeType3")) iconGrade = "G3";
  
  // 優先順位: titleタグ > アイコンクラス > テキスト解析
  const grade = titleGrade || iconGrade || detectGrade(raceNameRaw + " " + fullInfo);'''
    
    if old_grade_logic not in content:
        print("⚠️  既存のグレード判定コードが見つかりません。")
        
        # 修正済みかどうか確認
        if "titleGrade" in content and "iconGrade" in content:
            print("✅ 既に修正済みです。")
            return True
        
        # 別のパターンを探す
        alt_pattern = r'const gradeText = \$\("\.Icon_GradeType"\)\.text\(\)\.trim\(\);'
        if re.search(alt_pattern, content):
            print("📝 コードパターンが若干異なります。手動での確認をお勧めします。")
        else:
            print("❌ グレード判定コードが見つかりませんでした。")
        return False
    
    # 置換実行
    new_content = content.replace(old_grade_logic, new_grade_logic)
    
    # ファイル書き込み
    file_path.write_text(new_content, encoding="utf-8")
    
    print("✅ スクレイプのグレード判定ロジックを修正しました！")
    print("")
    print("📁 対象ファイル:")
    print(f"   {file_path}")
    print("")
    print("📝 変更内容:")
    print("   - titleタグからグレードを最優先で抽出")
    print("   - Icon_GradeTypeのクラス名（Icon_GradeType1/2/3）から判定")
    print("   - フォールバックとしてテキスト解析を維持")
    print("")
    print("🚀 次のステップ:")
    print("   1. git diff src/app/api/admin/scrape/route.ts")
    print("   2. npm run build")
    print("   3. git add -A && git commit -m 'fix: スクレイプのグレード判定ロジック改善' && git push")
    
    return True

if __name__ == "__main__":
    main()
