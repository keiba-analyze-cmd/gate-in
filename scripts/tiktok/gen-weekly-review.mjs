import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 場コード→名前
const COURSE_NAMES = {
  '01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京',
  '06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'
};
const STYLE_NAMES = { 1:'逃げ', 2:'先行', 3:'差し', 4:'追込' };

async function fetchWeekendData() {
  // 確定済み全エントリーを取得
  const { data: entries } = await supabase.from('jrdb_race_entries')
    .select('race_key, umaban, horse_name, finish_order, idm, base_odds, base_popularity, final_tansho_odds, final_tansho_popularity, jockey_name, sire_name, running_style, training_index, horse_weight_change')
    .not('finish_order', 'is', null)
    .order('race_key');

  if (!entries?.length) throw new Error('No finished race data');

  const raceKeys = [...new Set(entries.map(e => e.race_key))];
  const courseCode = raceKeys[0]?.slice(0,2) || '05';
  const courseName = COURSE_NAMES[courseCode] || courseCode;

  // コース別に分ける
  const courseGroups = {};
  entries.forEach(e => {
    const cc = e.race_key.slice(0,2);
    const cn = COURSE_NAMES[cc] || cc;
    if (!courseGroups[cn]) courseGroups[cn] = [];
    courseGroups[cn].push(e);
  });

  return { entries, raceKeys, courseGroups };
}

function analyze(entries, raceKeys) {
  // 1. 好調騎手 TOP5
  const jockeyStats = {};
  entries.forEach(e => {
    if (!e.jockey_name) return;
    if (!jockeyStats[e.jockey_name]) jockeyStats[e.jockey_name] = { wins:0, top3:0, rides:0 };
    jockeyStats[e.jockey_name].rides++;
    if (e.finish_order === 1) jockeyStats[e.jockey_name].wins++;
    if (e.finish_order <= 3) jockeyStats[e.jockey_name].top3++;
  });
  const hotJockeys = Object.entries(jockeyStats)
    .filter(([_,s]) => s.rides >= 2)
    .map(([name, s]) => ({ name, ...s, winRate: Math.round(s.wins/s.rides*100), top3Rate: Math.round(s.top3/s.rides*100) }))
    .sort((a,b) => b.winRate - a.winRate || b.top3Rate - a.top3Rate)
    .slice(0, 5);

  // 2. 脚質バイアス
  const styleStats = {};
  entries.forEach(e => {
    const s = e.running_style;
    if (!s) return;
    const name = STYLE_NAMES[s] || String(s);
    if (!styleStats[name]) styleStats[name] = { wins:0, top3:0, total:0 };
    styleStats[name].total++;
    if (e.finish_order === 1) styleStats[name].wins++;
    if (e.finish_order <= 3) styleStats[name].top3++;
  });
  const trackBias = Object.entries(styleStats)
    .map(([name, s]) => ({ name, ...s, winRate: Math.round(s.wins/s.total*100), top3Rate: Math.round(s.top3/s.total*100) }))
    .sort((a,b) => b.winRate - a.winRate);

  // 3. 好走種牡馬 TOP5
  const sireStats = {};
  entries.forEach(e => {
    if (!e.sire_name) return;
    if (!sireStats[e.sire_name]) sireStats[e.sire_name] = { wins:0, top3:0, total:0 };
    sireStats[e.sire_name].total++;
    if (e.finish_order === 1) sireStats[e.sire_name].wins++;
    if (e.finish_order <= 3) sireStats[e.sire_name].top3++;
  });
  const hotSires = Object.entries(sireStats)
    .filter(([_,s]) => s.top3 >= 1)
    .map(([name, s]) => ({ name, ...s, top3Rate: Math.round(s.top3/s.total*100) }))
    .sort((a,b) => b.top3 - a.top3 || b.top3Rate - a.top3Rate)
    .slice(0, 5);

  // 4. IDM精度
  let idmTop1Win = 0, idmTop3In3 = 0;
  raceKeys.forEach(rk => {
    const raceEntries = entries.filter(e => e.race_key === rk).sort((a,b) => (b.idm||0)-(a.idm||0));
    if (raceEntries.length === 0) return;
    if (raceEntries[0]?.finish_order === 1) idmTop1Win++;
    const top3idm = raceEntries.slice(0,3).map(e => e.finish_order);
    if (top3idm.some(fo => fo <= 3)) idmTop3In3++;
  });

  // 5. 穴馬ハイライト（人気薄で好走）
  const upsets = entries
    .filter(e => e.finish_order <= 3 && e.base_popularity >= 6)
    .sort((a,b) => (b.final_tansho_odds||0) - (a.final_tansho_odds||0))
    .slice(0, 3);

  return {
    totalRaces: raceKeys.length,
    totalEntries: entries.length,
    hotJockeys,
    trackBias,
    hotSires,
    idmAccuracy: { top1Win: idmTop1Win, top3In3: idmTop3In3, total: raceKeys.length },
    upsets,
  };
}

function generateHTML(stats, courseGroups) {
  const courses = Object.keys(courseGroups).join('・');
  const j = stats.hotJockeys;
  const tb = stats.trackBias;
  const s = stats.hotSires;
  const u = stats.upsets;
  const idm = stats.idmAccuracy;

  // 騎手ランキング行
  const jockeyRows = j.map((jk, i) => {
    const medals = ['#EAB308','#94A3B8','#CD7F32','var(--s)','var(--s)'];
    const w = Math.min(jk.winRate * 4, 400);
    return `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;">
      <div style="font-size:32px;font-weight:900;color:${medals[i]};width:50px;text-align:center;">${i+1}</div>
      <div style="flex:1;">
        <div style="font-size:34px;font-weight:900;color:white;">${jk.name}</div>
        <div style="margin-top:6px;height:20px;background:rgba(234,179,8,0.15);border-radius:10px;overflow:hidden;">
          <div style="height:100%;width:${w}px;max-width:100%;background:linear-gradient(90deg,#EAB308,#F59E0B);border-radius:10px;"></div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:36px;font-weight:900;color:#EAB308;">${jk.winRate}%</div>
        <div style="font-size:18px;color:#888;">${jk.wins}勝/${jk.rides}騎乗</div>
      </div>
    </div>`;
  }).join('');

  // 脚質バイアス行
  const biasRows = tb.map(b => {
    const colors = { '逃げ':'#DC2626', '先行':'#EAB308', '差し':'#3B82F6', '追込':'#8B5CF6' };
    const col = colors[b.name] || '#888';
    const w = Math.min(b.top3Rate * 5, 500);
    return `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;">
      <div style="font-size:30px;font-weight:900;color:${col};width:80px;">${b.name}</div>
      <div style="flex:1;height:24px;background:rgba(255,255,255,0.05);border-radius:12px;overflow:hidden;">
        <div style="height:100%;width:${w}px;max-width:100%;background:${col};border-radius:12px;opacity:0.7;"></div>
      </div>
      <div style="font-size:28px;font-weight:900;color:white;width:100px;text-align:right;">${b.top3Rate}%</div>
      <div style="font-size:18px;color:#888;width:80px;">${b.top3}/${b.total}</div>
    </div>`;
  }).join('');

  // 種牡馬ランキング行
  const sireRows = s.map((sr, i) => `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;">
      <div style="font-size:28px;font-weight:900;color:#059669;width:50px;text-align:center;">${i+1}</div>
      <div style="flex:1;font-size:32px;font-weight:900;color:white;">${sr.name}</div>
      <div style="font-size:28px;font-weight:700;color:#34D399;">${sr.top3}回</div>
      <div style="font-size:18px;color:#888;width:60px;">(${sr.total}走)</div>
    </div>`).join('');

  // 穴馬行
  const upsetRows = u.map(up => `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;">
      <div style="font-size:36px;font-weight:900;color:#DC2626;">🔥</div>
      <div style="flex:1;">
        <div style="font-size:32px;font-weight:900;color:white;">${up.horse_name}</div>
        <div style="font-size:20px;color:#888;margin-top:2px;">${up.jockey_name} / 父:${up.sire_name || '?'}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:30px;font-weight:900;color:#DC2626;">${up.finish_order}着</div>
        <div style="font-size:22px;color:#F87171;">${up.final_tansho_odds || up.base_odds}倍</div>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap" rel="stylesheet"/>
</head><body style="margin:0;padding:0;">
<div id="root" data-composition-id="weekly-review" data-start="0" data-duration="45" data-width="1080" data-height="1920"
     style="background:#0a0a0a;position:relative;overflow:hidden;font-family:'Noto Sans JP',sans-serif;width:1080px;height:1920px;">

  <!-- Header -->
  <div id="header" class="clip" data-start="0" data-duration="45" data-track-index="0"
       style="position:absolute;top:60px;width:1080px;text-align:center;">
    <div style="font-size:28px;font-weight:700;color:#888;letter-spacing:4px;">WEEKLY DATA REVIEW</div>
    <div style="font-size:52px;font-weight:900;color:white;margin-top:8px;">先週の振り返り</div>
    <div style="font-size:26px;font-weight:700;color:#666;margin-top:8px;">${courses} ｜ ${stats.totalRaces}レース</div>
  </div>

  <!-- Section 1: 好調騎手 TOP5 -->
  <div id="sec1-label" class="clip" data-start="2" data-duration="10" data-track-index="1"
       style="position:absolute;top:250px;width:1080px;padding:0 60px;">
    <div style="display:inline-block;background:rgba(234,179,8,0.15);border:2px solid #EAB308;border-radius:40px;padding:8px 32px;">
      <span style="font-size:26px;font-weight:900;color:#EAB308;letter-spacing:2px;">🏇 好調騎手 TOP5</span>
    </div>
  </div>
  <div id="sec1-data" class="clip" data-start="2.5" data-duration="9.5" data-track-index="2"
       style="position:absolute;top:320px;width:1080px;padding:0 60px;">
    ${jockeyRows}
  </div>

  <!-- Section 2: 脚質バイアス -->
  <div id="sec2-label" class="clip" data-start="12" data-duration="10" data-track-index="3"
       style="position:absolute;top:250px;width:1080px;padding:0 60px;">
    <div style="display:inline-block;background:rgba(59,130,246,0.15);border:2px solid #3B82F6;border-radius:40px;padding:8px 32px;">
      <span style="font-size:26px;font-weight:900;color:#3B82F6;letter-spacing:2px;">📊 脚質バイアス（3着内率）</span>
    </div>
  </div>
  <div id="sec2-data" class="clip" data-start="12.5" data-duration="9.5" data-track-index="4"
       style="position:absolute;top:330px;width:1080px;padding:0 60px;">
    ${biasRows}
  </div>

  <!-- Section 3: 好走種牡馬 TOP5 -->
  <div id="sec3-label" class="clip" data-start="22" data-duration="10" data-track-index="5"
       style="position:absolute;top:250px;width:1080px;padding:0 60px;">
    <div style="display:inline-block;background:rgba(5,150,105,0.15);border:2px solid #059669;border-radius:40px;padding:8px 32px;">
      <span style="font-size:26px;font-weight:900;color:#059669;letter-spacing:2px;">🧬 好走種牡馬 TOP5</span>
    </div>
  </div>
  <div id="sec3-data" class="clip" data-start="22.5" data-duration="9.5" data-track-index="6"
       style="position:absolute;top:330px;width:1080px;padding:0 60px;">
    ${sireRows}
  </div>

  <!-- Section 4: 穴馬ハイライト -->
  <div id="sec4-label" class="clip" data-start="32" data-duration="6" data-track-index="7"
       style="position:absolute;top:250px;width:1080px;padding:0 60px;">
    <div style="display:inline-block;background:rgba(220,38,38,0.15);border:2px solid #DC2626;border-radius:40px;padding:8px 32px;">
      <span style="font-size:26px;font-weight:900;color:#DC2626;letter-spacing:2px;">🔥 穴馬ハイライト</span>
    </div>
  </div>
  <div id="sec4-data" class="clip" data-start="32.5" data-duration="5.5" data-track-index="8"
       style="position:absolute;top:330px;width:1080px;padding:0 60px;">
    ${upsetRows}
  </div>

  <!-- IDM精度バッジ -->
  <div id="idm-badge" class="clip" data-start="3" data-duration="9" data-track-index="9"
       style="position:absolute;top:800px;width:1080px;text-align:center;">
    <div style="display:inline-block;background:rgba(30,64,175,0.1);border:1px solid rgba(30,64,175,0.3);border-radius:16px;padding:16px 40px;">
      <span style="font-size:22px;color:#60A5FA;">IDM1位の勝率: <span style="font-weight:900;font-size:28px;">${Math.round(idm.top1Win/idm.total*100)}%</span> (${idm.top1Win}/${idm.total}R)</span>
    </div>
  </div>

  <!-- CTA -->
  <div id="cta" class="clip" data-start="38" data-duration="7" data-track-index="10"
       style="position:absolute;top:800px;width:1080px;text-align:center;">
    <div style="display:inline-block;background:#059669;color:white;font-size:34px;font-weight:900;
         padding:24px 70px;border-radius:60px;letter-spacing:3px;">ゲートイン！で予想する →</div>
    <div style="font-size:24px;color:#666;margin-top:20px;font-weight:700;">🏇 gate-in.jp ｜ AI予想を無料で見る</div>
  </div>

  <!-- Watermark -->
  <div class="clip" data-start="0" data-duration="45" data-track-index="11"
       style="position:absolute;bottom:50px;width:1080px;text-align:center;">
    <div style="font-size:18px;color:#333;font-weight:700;letter-spacing:2px;">AI競馬予想SNS ゲートイン！</div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script>
    var tl = gsap.timeline({ paused: true });

    // Header
    tl.from('#header', { y:-30, opacity:0, duration:0.6, ease:'power2.out' }, 0);

    // Sec1: Jockeys
    tl.from('#sec1-label', { x:-40, opacity:0, duration:0.4, ease:'power3.out' }, 2);
    tl.from('#sec1-data', { y:20, opacity:0, duration:0.6, ease:'power2.out' }, 2.5);
    tl.from('#idm-badge', { scale:0.8, opacity:0, duration:0.4, ease:'back.out(1.3)' }, 3);

    // Sec2: Track bias (sec1 exits)
    tl.to('#sec1-label', { opacity:0, duration:0.3 }, 11.5);
    tl.to('#sec1-data', { opacity:0, duration:0.3 }, 11.5);
    tl.to('#idm-badge', { opacity:0, duration:0.3 }, 11.5);
    tl.from('#sec2-label', { x:-40, opacity:0, duration:0.4, ease:'power3.out' }, 12);
    tl.from('#sec2-data', { y:20, opacity:0, duration:0.6, ease:'power2.out' }, 12.5);

    // Sec3: Sires
    tl.to('#sec2-label', { opacity:0, duration:0.3 }, 21.5);
    tl.to('#sec2-data', { opacity:0, duration:0.3 }, 21.5);
    tl.from('#sec3-label', { x:-40, opacity:0, duration:0.4, ease:'power3.out' }, 22);
    tl.from('#sec3-data', { y:20, opacity:0, duration:0.6, ease:'power2.out' }, 22.5);

    // Sec4: Upsets
    tl.to('#sec3-label', { opacity:0, duration:0.3 }, 31.5);
    tl.to('#sec3-data', { opacity:0, duration:0.3 }, 31.5);
    tl.from('#sec4-label', { x:-40, opacity:0, duration:0.4, ease:'power3.out' }, 32);
    tl.from('#sec4-data', { y:20, opacity:0, duration:0.6, ease:'power2.out' }, 32.5);

    // CTA
    tl.to('#sec4-label', { opacity:0, duration:0.3 }, 37.5);
    tl.to('#sec4-data', { opacity:0, duration:0.3 }, 37.5);
    tl.from('#cta', { y:30, opacity:0, duration:0.5, ease:'power2.out' }, 38);

    // Fade out
    tl.to('#root', { opacity:0, duration:1.5, ease:'power2.inOut' }, 43.5);

    window.__timelines = window.__timelines || {};
    window.__timelines['weekly-review'] = tl;
  </script>
</div></body></html>`;
}

// メイン
const doRender = process.argv.includes('--render');
const outDir = join(process.cwd(), 'output-data');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

console.log('📊 週間データレビュー動画を生成中...\n');

const { entries, raceKeys, courseGroups } = await fetchWeekendData();
const stats = analyze(entries, raceKeys);

console.log(`対象: ${Object.keys(courseGroups).join('・')} / ${stats.totalRaces}レース / ${stats.totalEntries}エントリー\n`);
console.log('🏇 好調騎手:');
stats.hotJockeys.forEach((j,i) => console.log(`  ${i+1}. ${j.name} ${j.winRate}% (${j.wins}/${j.rides})`));
console.log('\n📊 脚質バイアス:');
stats.trackBias.forEach(b => console.log(`  ${b.name}: 3着内${b.top3Rate}% (${b.top3}/${b.total})`));
console.log('\n🧬 好走種牡馬:');
stats.hotSires.forEach((s,i) => console.log(`  ${i+1}. ${s.name} 3着内${s.top3}回 (${s.total}走)`));
console.log(`\n📈 IDM精度: 1位勝率${Math.round(stats.idmAccuracy.top1Win/stats.idmAccuracy.total*100)}%`);
console.log('\n🔥 穴馬ハイライト:');
stats.upsets.forEach(u => console.log(`  ${u.finish_order}着 ${u.horse_name} (${u.final_tansho_odds||u.base_odds}倍) ${u.jockey_name}`));

const html = generateHTML(stats, courseGroups);
const htmlPath = join(outDir, 'weekly-review.html');
writeFileSync(htmlPath, html, 'utf-8');
console.log(`\n✅ HTML: ${htmlPath}`);

if (doRender) {
  const hfDir = join(outDir, 'hf-review');
  if (!existsSync(hfDir)) mkdirSync(hfDir, { recursive: true });
  writeFileSync(join(hfDir, 'index.html'), html, 'utf-8');
  const mp4 = join(outDir, 'weekly-review.mp4');
  console.log('🎥 Rendering...');
  execSync(`cd "${hfDir}" && npx hyperframes render --output "${mp4}"`, { stdio: 'inherit' });
  console.log(`🎬 ${mp4}`);
}

console.log('\n🏁 Complete!');
