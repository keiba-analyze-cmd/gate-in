import { parseKYGFile, groupByRace, getCourseName } from "./kyg-parser";

const filePath = process.argv[2];
if (!filePath) { console.log("Usage: npx tsx src/lib/jrdb/cli-kyg.ts <KYGファイル>"); process.exit(1); }

const records = parseKYGFile(filePath);
console.log(`パース完了: ${records.length}レコード`);

const races = groupByRace(records);
console.log(`レース数: ${races.size}\n`);

for (const [raceKey, horses] of races) {
  const course = getCourseName(horses[0].場コード);
  console.log(`━━━ ${course} ${horses[0].回}回${horses[0].日}日目 ${horses[0].R}R (${raceKey}) ━━━`);
  console.log(`${"#".padEnd(3)} ${"馬名".padEnd(20)} ${"IDM".padStart(6)} ${"総合".padStart(6)} ${"テン".padStart(6)} ${"上り".padStart(6)} ${"odds".padStart(7)} ${"人気".padStart(4)} ${"騎手"}`);
  console.log("─".repeat(80));
  const sorted = [...horses].sort((a, b) => (a.馬番 ?? 0) - (b.馬番 ?? 0));
  for (const h of sorted) {
    const c = h.取消フラグ === 1 ? " [取消]" : "";
    console.log(
      `${(h.馬番?.toString() ?? "-").padStart(2)}  ` +
      `${h.馬名.padEnd(18)} ` +
      `${(h.IDM?.toFixed(1) ?? "-").padStart(6)} ` +
      `${(h.総合指数?.toFixed(1) ?? "-").padStart(6)} ` +
      `${(h.テン指数?.toFixed(1) ?? "-").padStart(6)} ` +
      `${(h.上がり指数?.toFixed(1) ?? "-").padStart(6)} ` +
      `${(h.基準オッズ?.toFixed(1) ?? "-").padStart(7)} ` +
      `${(h.基準人気順位?.toString() ?? "-").padStart(4)} ` +
      `${h.騎手名}${c}`
    );
  }
  console.log();
}
