#!/bin/bash
FILE=~/gate-in/scripts/tiktok/pipeline.mjs

# バックアップ
cp "$FILE" "${FILE}.bak"

# 1. scoreEntriesForChar関数をbuildDataRowsの直前に挿入
sed -i '' '/^function buildDataRows/i\
// ── キャラ別スコアリングで○▲△を自動算出 ──\
function scoreEntriesForChar(charId, allEntries, honmeiUmaban) {\
  const scored = (allEntries || []).filter(e => e.umaban !== honmeiUmaban).map(e => {\
    let score = 0;\
    const idm = parseFloat(e.idm) || 0;\
    const jockey = parseFloat(e.jockey_index) || 0;\
    const training = parseFloat(e.training_index) || 0;\
    const composite = parseFloat(e.composite_index) || 0;\
    const odds = parseFloat(e.base_odds) || 99;\
    const agari = parseFloat(e.agari_index) || 0;\
    switch (charId) {\
      case "hayate": score = idm * 0.8 + jockey * 0.2; break;\
      case "kazan": score = (idm + training * 0.5) * Math.log(Math.max(odds, 1.1)); break;\
      case "hakusen": score = idm * 0.7 + agari * 0.3; break;\
      case "hibari": score = idm * 0.6 + training * 0.4; break;\
      case "gantetsu": score = composite > 0 ? composite : idm; break;\
      default: score = idm;\
    }\
    return { umaban: e.umaban, score, entry: e };\
  }).sort((a, b) => b.score - a.score);\
  return { taikou: scored[0]?.entry || null, tanpou: scored[1]?.entry || null, osae: scored[2]?.entry || null };\
}\
\
function entryToPickInfo(entry) {\
  if (!entry) return { number: "-", name: "未定", jockey: "", odds: "" };\
  return { number: entry.umaban, name: entry.horse_name?.trim() || entry.umaban+"番", jockey: entry.jockey_name?.trim() || "", odds: entry.base_odds ? entry.base_odds+"倍" : "" };\
}\
' "$FILE"

# 2. taikou/tanpou/osaeの参照を修正
# "taikou: getPickInfo(pred.taikou_umaban)," を自動算出に変更
sed -i '' 's/taikou: getPickInfo(pred.taikou_umaban),/taikou: entryToPickInfo(autoOAD.taikou),/' "$FILE"
sed -i '' 's/tanpou: getPickInfo(pred.tanpou_umaban),/tanpou: entryToPickInfo(autoOAD.tanpou),/' "$FILE"
sed -i '' 's/osae: getPickInfo(pred.osae_umaban),/osae: entryToPickInfo(autoOAD.osae),/' "$FILE"

# 3. autoOADの算出行を honmeiEntry行の直後に挿入
sed -i '' '/const honmeiEntry = entryMap\[pred.umaban\]/a\
      const autoOAD = scoreEntriesForChar(charId, entries || [], pred.umaban);' "$FILE"

echo "✅ パッチ適用完了"
echo ""
echo "確認: grep -n 'scoreEntriesForChar\|autoOAD\|entryToPickInfo' $FILE"
