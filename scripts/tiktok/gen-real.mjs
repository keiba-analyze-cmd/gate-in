import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// .env.local読み込み
const envFile = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// キャラ定義
const CHARS = {
  kazan:   { name:'カザン', sub:'穴馬予測型AI', color:'#DC2626', rgb:'220,38,38', emoji:'🔥', series:'今週の爆弾', h1:'みんな見逃してるけど…', h2:'こいつ、ヤバい。', sortKey:'base_odds', sortDir:false },
  hayate:  { name:'ハヤテ', sub:'データ分析型AI', color:'#1E40AF', rgb:'30,64,175', emoji:'📊', series:'数字で語る◎', h1:'データは嘘をつかない。', h2:'答えは、ここにある。', sortKey:'idm', sortDir:false },
  hakusen: { name:'ハクセン', sub:'血統分析型AI', color:'#059669', rgb:'5,150,105', emoji:'🧬', series:'血統の法則', h1:'血統は、嘘をつかない。', h2:'この条件、走る血がある。', sortKey:'sogo_index', sortDir:false },
  hibari:  { name:'ヒバリ', sub:'当日データ型AI', color:'#D97706', rgb:'217,119,6', emoji:'⚡', series:'朝イチ速報', h1:'朝イチ速報！', h2:'今日の狙い目、見つけました！', sortKey:'idm', sortDir:false },
  gantetsu:{ name:'ガンテツ', sub:'軸馬特化型AI', color:'#475569', rgb:'71,85,105', emoji:'🪨', series:'鉄板の1頭', h1:'迷うな。', h2:'答えは、一つだ。', sortKey:'sogo_index', sortDir:false },
};
const MARK_COLORS = { '○':'#3B82F6', '▲':'#EAB308', '△':'#94A3B8' };

async function fetchRaceData(charId, raceUuid) {
  const c = CHARS[charId];

  // 1. レース情報
  const { data: race } = await supabase.from('races').select('*').eq('id', raceUuid).single();
  if (!race) throw new Error('Race not found: ' + raceUuid);

  // 2. そのキャラの◎予想
  const { data: pred } = await supabase.from('ai_predictions')
    .select('*').eq('race_id', raceUuid).eq('predictor_id', charId).single();
  if (!pred) throw new Error(`No prediction for ${charId} in ${raceUuid}`);

  // 3. JRDBデータ（全馬）
  const raceKey = race.external_id;
  const { data: entries } = await supabase.from('jrdb_race_entries')
    .select('umaban, horse_name, idm, sogo_index, base_odds, base_popularity, jockey_name, sire_name')
    .eq('race_key', raceKey)
    .order(c.sortKey, { ascending: c.sortDir, nullsFirst: false });

  // 4. ◎馬のJRDBデータ
  const honmeiEntry = entries?.find(e => e.umaban === pred.umaban) || {};

  // 5. ○▲△を選出（◎を除いたスコア上位3頭）
  const others = (entries || [])
    .filter(e => e.umaban !== pred.umaban)
    .slice(0, 3);

  const marks = ['○', '▲', '△'];
  const otherPicks = others.map((e, i) => ({
    mark: marks[i],
    horse: e.horse_name,
    umaban: e.umaban,
    odds: e.base_odds || '?',
    popularity: e.base_popularity || '?',
    idmRank: e.idm || '?',
    jockey: e.jockey_name || '',
    reason: buildReason(charId, e, i),
    mc: MARK_COLORS[marks[i]],
  }));

  return {
    race: {
      name: race.name,
      grade: race.grade,
      course: race.course_name,
      date: race.race_date,
    },
    honmei: {
      horse: pred.horse_name,
      umaban: pred.umaban,
      comment: pred.comment,
      score: pred.score,
      odds: honmeiEntry.base_odds || '?',
      popularity: honmeiEntry.base_popularity || '?',
      idm: honmeiEntry.idm || '?',
      jockey: honmeiEntry.jockey_name || '',
      sire: honmeiEntry.sire_name || '',
    },
    others: otherPicks,
  };
}

function buildReason(charId, entry, idx) {
  const idm = entry.idm || '?';
  const pop = entry.base_popularity || '?';
  const sire = entry.sire_name || '';
  if (idx === 0) return `IDM${idm} / 人気${pop}番手 → 対抗の軸`;
  if (idx === 1) return sire ? `${sire}産駒 / オッズ妙味あり` : `IDM${idm} / 穴候補`;
  return `人気${pop}番手 / 3着候補`;
}

function idmRankOf(entries, umaban) {
  const sorted = [...entries].sort((a,b) => (b.idm||0) - (a.idm||0));
  const idx = sorted.findIndex(e => e.umaban === umaban);
  return idx >= 0 ? idx + 1 : '?';
}

// HTML生成（Hyperframes互換）
function generateHTML(charId, data) {
  const c = CHARS[charId];
  const h = data.honmei;
  const r = data.race;
  const gradeLabel = r.grade ? `${r.grade} ` : '';

  const pickCards = data.others.map((p, i) => {
    const lc = lighten(p.mc);
    return `
  <div id="pick-${i}" class="clip" data-start="${19+i*3}" data-duration="${9.5-i*3}" data-track-index="${16+i}"
       style="position:absolute;top:${560+i*180}px;width:1080px;padding:0 80px;">
    <div style="background:rgba(${htr(p.mc)},0.1);border:2px solid ${p.mc};border-radius:20px;padding:24px 36px;display:flex;align-items:center;gap:24px;">
      <div style="font-size:56px;font-weight:900;color:${p.mc};">${p.mark}</div>
      <div style="flex:1;"><div style="font-size:42px;font-weight:900;color:white;">${p.horse}</div>
        <div style="font-size:22px;font-weight:700;color:${lc};margin-top:6px;">${p.reason}</div></div></div></div>`;
  }).join('');

  const sumRows = [
    { m:'◎', horse:h.horse, odds:h.odds, col:c.color },
    ...data.others.map(p => ({ m:p.mark, horse:p.horse, odds:p.odds, col:p.mc }))
  ].map(x => `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <span style="font-size:40px;font-weight:900;color:${x.col};width:60px;">${x.m}</span>
        <span style="font-size:38px;font-weight:900;color:white;">${x.horse}</span>
        <span style="font-size:20px;color:#888;margin-left:auto;">${x.odds}倍</span></div>`).join('');

  const pickAnims = data.others.map((_,i) =>
    `tl.from('#pick-${i}',{x:80,opacity:0,duration:0.5,ease:'power3.out'},${19+i*3});`).join('\n    ');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap" rel="stylesheet"/>
</head><body style="margin:0;padding:0;">
<div id="root" data-composition-id="${charId}-pick" data-start="0" data-duration="40"
     data-width="1080" data-height="1920"
     style="background:#0a0a0a;position:relative;overflow:hidden;font-family:'Noto Sans JP',sans-serif;width:1080px;height:1920px;">

  <div id="glow" class="clip" data-start="0" data-duration="40" data-track-index="0"
       style="position:absolute;top:50%;left:50%;width:900px;height:900px;transform:translate(-50%,-50%);
              background:radial-gradient(circle,rgba(${c.rgb},0.3) 0%,transparent 70%);"></div>
  <div id="flash" class="clip" data-start="13" data-duration="1" data-track-index="1"
       style="position:absolute;top:0;left:0;width:1080px;height:1920px;background:rgba(${c.rgb},0.8);"></div>
  <div id="char-icon" class="clip" data-start="0" data-duration="40" data-track-index="2"
       style="position:absolute;top:120px;left:50%;width:200px;height:200px;margin-left:-100px;border-radius:50%;
              border:5px solid ${c.color};overflow:hidden;background:#1a1a1a;">
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:90px;">${c.emoji}</div></div>
  <div id="char-name" class="clip" data-start="0.3" data-duration="39.7" data-track-index="3"
       style="position:absolute;top:350px;width:1080px;text-align:center;">
    <div style="font-size:40px;font-weight:900;color:${c.color};letter-spacing:6px;">${c.name}</div>
    <div style="font-size:24px;font-weight:700;color:#555;margin-top:8px;">${c.sub}</div></div>
  <div id="series-badge" class="clip" data-start="0.8" data-duration="3" data-track-index="4"
       style="position:absolute;top:460px;width:1080px;text-align:center;">
    <div style="display:inline-block;background:rgba(${c.rgb},0.2);border:2px solid ${c.color};border-radius:40px;padding:10px 40px;">
      <span style="font-size:26px;font-weight:900;color:${c.color};">${c.emoji} ${c.series} ${c.emoji}</span></div></div>
  <div id="hook-1" class="clip" data-start="1.4" data-duration="2.5" data-track-index="5"
       style="position:absolute;top:580px;width:1080px;text-align:center;">
    <div style="font-size:54px;font-weight:900;color:white;line-height:1.5;">${c.h1}</div></div>
  <div id="hook-2" class="clip" data-start="2.2" data-duration="1.7" data-track-index="6"
       style="position:absolute;top:700px;width:1080px;text-align:center;">
    <div style="font-size:58px;font-weight:900;color:${c.color};line-height:1.4;">${c.h2}</div></div>
  <div id="race-label" class="clip" data-start="4" data-duration="3.5" data-track-index="7"
       style="position:absolute;top:540px;width:1080px;text-align:center;">
    <div style="font-size:26px;font-weight:700;color:#666;letter-spacing:4px;">── ${gradeLabel}${r.course} ──</div></div>
  <div id="race-name" class="clip" data-start="4.2" data-duration="7" data-track-index="8"
       style="position:absolute;top:600px;width:1080px;text-align:center;">
    <div style="font-size:64px;font-weight:900;color:white;letter-spacing:3px;">${r.name}</div></div>
  <div id="teaser-comment" class="clip" data-start="5" data-duration="2.5" data-track-index="9"
       style="position:absolute;top:740px;width:1080px;text-align:center;padding:0 80px;">
    <div style="font-size:34px;font-weight:700;color:#ccc;line-height:1.7;font-style:italic;">
      「${h.comment}」</div></div>
  <div id="data-badges" class="clip" data-start="8" data-duration="3.5" data-track-index="10"
       style="position:absolute;top:920px;width:1080px;display:flex;justify-content:center;gap:20px;">
    <div class="badge" style="background:rgba(${c.rgb},0.15);border:2px solid ${c.color};border-radius:16px;padding:18px 32px;text-align:center;">
      <div style="font-size:18px;color:${c.color};font-weight:700;">人気</div>
      <div style="font-size:52px;color:white;font-weight:900;margin-top:4px;">${h.popularity}<span style="font-size:22px;">番手</span></div></div>
    <div class="badge" style="background:rgba(${c.rgb},0.15);border:2px solid ${c.color};border-radius:16px;padding:18px 32px;text-align:center;">
      <div style="font-size:18px;color:${c.color};font-weight:700;">IDM</div>
      <div style="font-size:52px;color:white;font-weight:900;margin-top:4px;">${h.idm}</div></div>
    <div class="badge" style="background:rgba(${c.rgb},0.15);border:2px solid ${c.color};border-radius:16px;padding:18px 32px;text-align:center;">
      <div style="font-size:18px;color:${c.color};font-weight:700;">オッズ</div>
      <div style="font-size:52px;color:white;font-weight:900;margin-top:4px;">${h.odds}<span style="font-size:22px;">倍</span></div></div></div>
  <div id="pre-reveal" class="clip" data-start="11.5" data-duration="1.5" data-track-index="11"
       style="position:absolute;top:800px;width:1080px;text-align:center;">
    <div style="font-size:48px;font-weight:900;color:white;letter-spacing:4px;">その馬は──</div></div>
  <div id="honmei-mark" class="clip" data-start="13.1" data-duration="5.5" data-track-index="12"
       style="position:absolute;top:500px;width:1080px;text-align:center;">
    <div style="font-size:120px;font-weight:900;color:${c.color};">◎</div></div>
  <div id="horse-name-box" class="clip" data-start="13.4" data-duration="5.2" data-track-index="13"
       style="position:absolute;top:650px;width:1080px;text-align:center;">
    <div id="horse-name" style="font-size:${h.horse.length > 7 ? 80 : 110}px;font-weight:900;color:white;letter-spacing:6px;
         text-shadow:0 0 60px rgba(${c.rgb},0.6);">${h.horse}</div></div>
  <div id="horse-sub" class="clip" data-start="14.2" data-duration="4.4" data-track-index="14"
       style="position:absolute;top:790px;width:1080px;text-align:center;">
    <div style="font-size:28px;font-weight:700;color:#888;">${h.umaban}番 ${h.jockey} ｜ ${r.name}</div></div>
  <div id="other-label" class="clip" data-start="18.5" data-duration="10" data-track-index="15"
       style="position:absolute;top:480px;width:1080px;text-align:center;">
    <div style="font-size:30px;font-weight:700;color:#888;letter-spacing:3px;">── その他の注目馬 ──</div></div>
  ${pickCards}
  <div id="summary" class="clip" data-start="28.5" data-duration="6" data-track-index="19"
       style="position:absolute;top:480px;width:1080px;padding:0 60px;">
    <div style="background:rgba(${c.rgb},0.08);border:2px solid rgba(${c.rgb},0.4);border-radius:24px;padding:36px 48px;">
      <div style="font-size:28px;font-weight:900;color:${c.color};text-align:center;margin-bottom:24px;">${c.emoji} ${c.name}の予想 ${c.emoji}</div>
      <div style="font-size:26px;font-weight:700;color:#888;text-align:center;margin-bottom:20px;">${gradeLabel}${r.name}</div>
      ${sumRows}</div></div>
  <div id="closing" class="clip" data-start="30.5" data-duration="4" data-track-index="20"
       style="position:absolute;top:960px;width:1080px;text-align:center;padding:0 80px;">
    <div style="font-size:36px;font-weight:900;color:${c.color};line-height:1.6;">「${h.comment.slice(0, 20)}」</div></div>
  <div id="cta" class="clip" data-start="34.5" data-duration="4.5" data-track-index="21"
       style="position:absolute;top:1100px;width:1080px;text-align:center;">
    <div id="cta-btn" style="display:inline-block;background:${c.color};color:white;font-size:34px;
         font-weight:900;padding:24px 70px;border-radius:60px;letter-spacing:3px;">ゲートイン！で予想する →</div>
    <div style="font-size:24px;color:#666;margin-top:20px;font-weight:700;">🏇 gate-in.jp ｜ 登録無料</div></div>
  <div class="clip" data-start="0" data-duration="40" data-track-index="22"
       style="position:absolute;bottom:50px;width:1080px;text-align:center;">
    <div style="font-size:18px;color:#333;font-weight:700;letter-spacing:2px;">AI競馬予想SNS ゲートイン！</div></div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script>
    var tl = gsap.timeline({ paused: true });
    tl.from('#char-icon',{scale:0,opacity:0,duration:0.6,ease:'back.out(2)'},0);
    tl.from('#char-name',{y:30,opacity:0,duration:0.4,ease:'power2.out'},0.3);
    tl.from('#series-badge',{scale:0.5,opacity:0,duration:0.35,ease:'back.out(1.5)'},0.8);
    tl.from('#hook-1',{x:-40,opacity:0,duration:0.45,ease:'power3.out'},1.4);
    tl.from('#hook-2',{scale:1.5,opacity:0,duration:0.35,ease:'power4.out'},2.2);
    tl.fromTo('#glow',{opacity:0},{opacity:0.5,duration:1.5,ease:'power2.inOut'},2.5);
    tl.from('#race-label',{opacity:0,duration:0.35},4.0);
    tl.from('#race-name',{y:20,opacity:0,duration:0.5,ease:'power2.out'},4.2);
    tl.from('#teaser-comment',{y:20,opacity:0,duration:0.6,ease:'power2.out'},5.0);
    tl.from('.badge:nth-child(1)',{scale:0,opacity:0,duration:0.35,ease:'back.out(1.6)'},8.0);
    tl.from('.badge:nth-child(2)',{scale:0,opacity:0,duration:0.35,ease:'back.out(1.6)'},8.7);
    tl.from('.badge:nth-child(3)',{scale:0,opacity:0,duration:0.35,ease:'back.out(1.6)'},9.4);
    tl.to('#glow',{opacity:0.8,duration:0.8,ease:'power2.inOut'},10.0);
    tl.from('#pre-reveal',{opacity:0,duration:0.4,ease:'power2.out'},11.5);
    tl.to('#flash',{opacity:1,duration:0.08},13.0);
    tl.to('#flash',{opacity:0,duration:0.35,ease:'power2.out'},13.08);
    tl.from('#honmei-mark',{scale:5,opacity:0,duration:0.5,ease:'power4.out'},13.1);
    tl.from('#horse-name-box',{scale:3,opacity:0,duration:0.7,ease:'power4.out'},13.4);
    tl.from('#horse-sub',{y:10,opacity:0,duration:0.4,ease:'power2.out'},14.2);
    tl.to('#horse-name',{textShadow:'0 0 100px rgba(${c.rgb},1)',duration:0.4,yoyo:true,repeat:2,ease:'power2.inOut'},14.8);
    tl.from('#other-label',{opacity:0,duration:0.35},18.5);
    ${pickAnims}
    tl.from('#summary',{scale:0.9,opacity:0,duration:0.6,ease:'power2.out'},28.5);
    tl.from('#closing',{y:15,opacity:0,duration:0.5,ease:'power2.out'},30.5);
    tl.from('#cta',{y:30,opacity:0,duration:0.5,ease:'power2.out'},34.5);
    tl.to('#cta-btn',{scale:1.05,duration:0.35,yoyo:true,repeat:4,ease:'power2.inOut'},35.5);
    tl.to('#root',{opacity:0,duration:1.5,ease:'power2.inOut'},38.5);
    window.__timelines = window.__timelines || {};
    window.__timelines['${charId}-pick'] = tl;
  </script>
</div></body></html>`;
}

function htr(hex) { return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(','); }
function lighten(hex) { return 'rgb('+[1,3,5].map(i=>Math.min(255,parseInt(hex.slice(i,i+2),16)+80)).join(',')+')'; }

// メイン
const args = process.argv.slice(2);
const charId = args.find((_,i,a) => a[i-1]==='--character') || 'kazan';
const raceUuid = args.find((_,i,a) => a[i-1]==='--race');
const doAll = args.includes('--all');

if (!raceUuid) {
  // レースIDが未指定の場合、直近の予想があるレースを自動取得
  const { data } = await supabase.from('ai_predictions')
    .select('race_id').order('created_at',{ascending:false}).limit(1);
  if (!data?.[0]) { console.error('No predictions found'); process.exit(1); }
  var autoRaceId = data[0].race_id;
  console.log('Auto-detected race:', autoRaceId);
}

const targetRace = raceUuid || autoRaceId;
const chars = doAll ? Object.keys(CHARS) : [charId];

const outDir = join(process.cwd(), 'output-real');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const id of chars) {
  try {
    console.log(`\n🎬 ${CHARS[id].name}（${CHARS[id].series}）...`);
    const data = await fetchRaceData(id, targetRace);
    const html = generateHTML(id, data);
    const path = join(outDir, `${id}-${data.race.name}.html`);
    writeFileSync(path, html, 'utf-8');
    console.log(`  ◎ ${data.honmei.horse}（${data.honmei.odds}倍）`);
    data.others.forEach(p => console.log(`  ${p.mark} ${p.horse}（${p.odds}倍）`));
    console.log(`  ✅ → ${path}`);
  } catch (e) {
    console.log(`  ⚠️ スキップ: ${e.message}`);
  }
}
console.log('\n🏁 Complete!');
