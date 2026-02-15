#!/usr/bin/env python3
"""
vercel.jsonにオッズ更新cronを追加するスクリプト

使用方法:
  mv ~/Downloads/add_odds_cron.py ~/gate-in/scripts/
  cd ~/gate-in && python3 scripts/add_odds_cron.py
"""

import json
from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    if script_dir.name == "scripts":
        project_root = script_dir.parent
    else:
        project_root = Path.cwd()
    
    file_path = project_root / "vercel.json"
    
    if not file_path.exists():
        print(f"❌ vercel.json が見つかりません")
        return False
    
    content = file_path.read_text(encoding="utf-8")
    config = json.loads(content)
    
    # オッズ更新cronを追加
    new_cron = {
        "path": "/api/admin/scrape-odds",
        "schedule": "*/15 0-8 * * 0,6"  # 土日の0-8時台、15分毎
    }
    
    # 既に存在するかチェック
    existing_paths = [c["path"] for c in config.get("crons", [])]
    if new_cron["path"] in existing_paths:
        print("⚠️  オッズ更新cronは既に存在します")
        return True
    
    config["crons"].append(new_cron)
    
    file_path.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")
    print("✅ vercel.jsonにオッズ更新cronを追加")
    print("")
    print("追加したcron:")
    print(f"  path: {new_cron['path']}")
    print(f"  schedule: {new_cron['schedule']} (土日の0-8時台、15分毎)")
    return True


if __name__ == "__main__":
    main()
