#!/bin/bash
# ゲートイン！ JRDB パイプライン自動実行ラッパー
# crontabから呼び出される
#
# Usage:
#   cron-wrapper.sh predict-tomorrow   # 明日のレース分DL+予想生成
#   cron-wrapper.sh results-lastweek   # 先週土日の結果取込

set -e
cd ~/gate-in

# ログファイル
LOG="data/jrdb/pipeline.log"
mkdir -p data/jrdb

NODE=$(which node)
PIPELINE="src/lib/jrdb/weekly-pipeline.js"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
  echo "$1"
}

# 明日の日付を YYMMDD で取得
tomorrow_date() {
  date -v+1d '+%y%m%d'
}

# 先週土曜の日付
last_saturday() {
  # 今日が何曜日かに応じて計算
  DOW=$(date '+%u')  # 1=Mon ... 7=Sun
  case $DOW in
    1) DAYS=2 ;;  # Mon → 2日前=Sat
    2) DAYS=3 ;;  # Tue → 3日前=Sat
    3) DAYS=4 ;;
    4) DAYS=5 ;;
    5) DAYS=6 ;;
    6) DAYS=0 ;;  # Sat → 今日
    7) DAYS=1 ;;  # Sun → 昨日
  esac
  date -v-${DAYS}d '+%y%m%d'
}

# 先週日曜の日付
last_sunday() {
  DOW=$(date '+%u')
  case $DOW in
    1) DAYS=1 ;;
    2) DAYS=2 ;;
    3) DAYS=3 ;;
    4) DAYS=4 ;;
    5) DAYS=5 ;;
    6) DAYS=6 ;;
    7) DAYS=0 ;;
  esac
  date -v-${DAYS}d '+%y%m%d'
}

CMD=$1

case "$CMD" in
  predict-tomorrow)
    DATE=$(tomorrow_date)
    log "=== predict-tomorrow: $DATE ==="
    log "Step 1: Download JRDB data"
    $NODE $PIPELINE download "$DATE" >> "$LOG" 2>&1
    log "Step 2: Generate AI predictions"
    $NODE $PIPELINE predict "$DATE" >> "$LOG" 2>&1
    log "=== Done ==="
    ;;

  results-lastweek)
    SAT=$(last_saturday)
    SUN=$(last_sunday)
    log "=== results-lastweek: Sat=$SAT Sun=$SUN ==="
    log "Step 1: Download SEC (Sat)"
    $NODE $PIPELINE download "$SAT" >> "$LOG" 2>&1
    log "Step 2: Import results (Sat)"
    $NODE $PIPELINE results "$SAT" >> "$LOG" 2>&1
    log "Step 3: Download SEC (Sun)"
    $NODE $PIPELINE download "$SUN" >> "$LOG" 2>&1
    log "Step 4: Import results (Sun)"
    $NODE $PIPELINE results "$SUN" >> "$LOG" 2>&1
    log "=== Done ==="
    ;;

  *)
    echo "Usage: cron-wrapper.sh <predict-tomorrow|results-lastweek>"
    exit 1
    ;;
esac
