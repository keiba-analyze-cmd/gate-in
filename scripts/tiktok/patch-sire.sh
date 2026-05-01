#!/bin/bash
FILE=~/gate-in/scripts/tiktok/pipeline.mjs

# entryMap作成の直後に sire_name 補完コードを挿入
# 対象行: "(entries || []).forEach(e => { entryMap[e.umaban] = e; });"
sed -i '' '/entryMap\[e.umaban\] = e;/a\
\
    // sire_name 補完（jrdb_horses から取得）\
    const horseCodes = (entries || []).filter(e => !e.sire_name && e.horse_code).map(e => e.horse_code);\
    if (horseCodes.length > 0) {\
      const { data: horses } = await supabase.from("jrdb_horses").select("horse_code, sire_name, dam_sire_name").in("horse_code", horseCodes);\
      const horseMap = {};\
      (horses || []).forEach(h => { horseMap[h.horse_code] = h; });\
      for (const e of (entries || [])) {\
        if (!e.sire_name && e.horse_code && horseMap[e.horse_code]) {\
          e.sire_name = horseMap[e.horse_code].sire_name;\
          e.dam_sire_name = horseMap[e.horse_code].dam_sire_name;\
          entryMap[e.umaban] = e;\
        }\
      }\
      console.log(\`  🧬 sire_name補完: \${horses?.length || 0}頭\`);\
    }' "$FILE"

echo "✅ sire_name補完パッチ適用完了"
