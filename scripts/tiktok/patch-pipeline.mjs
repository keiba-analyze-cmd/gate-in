// pipeline.mjs に追加するスコアリング関数
// この内容を pipeline.mjs の buildDataRows関数の直前に挿入

// ── キャラ別スコアリングで○▲△を自動算出 ──
function scoreEntriesForChar(charId, entries, honmeiUmaban) {
  const scored = entries
    .filter(e => e.umaban !== honmeiUmaban)
    .map(e => {
      let score = 0;
      const idm = parseFloat(e.idm) || 0;
      const jockey = parseFloat(e.jockey_index) || 0;
      const training = parseFloat(e.training_index) || 0;
      const composite = parseFloat(e.composite_index) || 0;
      const odds = parseFloat(e.base_odds) || 99;
      const agari = parseFloat(e.agari_index) || 0;

      switch (charId) {
        case "hayate":
          score = idm * 0.8 + jockey * 0.2;
          break;
        case "kazan":
          // 実力に対してオッズが高い＝妙味がある馬
          score = (idm + training * 0.5) * Math.log(Math.max(odds, 1.1));
          break;
        case "hakusen":
          score = idm * 0.7 + agari * 0.3;
          break;
        case "hibari":
          score = idm * 0.6 + training * 0.4;
          break;
        case "gantetsu":
          score = composite > 0 ? composite : idm;
          break;
        default:
          score = idm;
      }
      return { umaban: e.umaban, score, entry: e };
    })
    .sort((a, b) => b.score - a.score);

  return {
    taikou: scored[0]?.entry || null,  // ○ 2位
    tanpou: scored[1]?.entry || null,  // ▲ 3位
    osae:   scored[2]?.entry || null,  // △ 4位
  };
}

function entryToPickInfo(entry) {
  if (!entry) return { number: "-", name: "未定", jockey: "", odds: "" };
  return {
    number: entry.umaban,
    name: entry.horse_name?.trim() || entry.umaban + "番",
    jockey: entry.jockey_name?.trim() || "",
    odds: entry.base_odds ? entry.base_odds + "倍" : "",
  };
}

console.log("✅ スコアリング関数定義OK");
console.log("");
console.log("これを pipeline.mjs に統合します...");
