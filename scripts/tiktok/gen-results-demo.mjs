#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG = "../../../public/images/predictors";
const RACE = { name:"NHKマイルC", grade:"G1", gradeColor:"#f59e0b", venue:"東京", surface:"芝", distance:1600 };
const CHARS = [
  { id:"hayate",name:"ハヤテ",type:"データ分析型",color:"#1E40AF",light:"#60A5FA",pick:{num:7,name:"アルテミシア"},finish:1,hit:true,comment:"1着的中！" },
  { id:"kazan",name:"カザン",type:"穴馬予測型",color:"#DC2626",light:"#F87171",pick:{num:12,name:"ライジングフォース"},finish:8,hit:false,comment:"8着 不的中" },
  { id:"hakusen",name:"ハクセン",type:"血統分析型",color:"#059669",light:"#34D399",pick:{num:3,name:"ステラノーヴァ"},finish:3,hit:true,comment:"3着的中！" },
  { id:"hibari",name:"ヒバリ",type:"当日データ型",color:"#D97706",light:"#FBBF24",pick:{num:5,name:"ブレイブハート"},finish:2,hit:true,comment:"2着的中！" },
  { id:"gantetsu",name:"ガンテツ",type:"軸馬特化型",color:"#475569",light:"#94A3B8",pick:{num:7,name:"アルテミシア"},finish:1,hit:true,comment:"1着的中！" },
];
const hitCount = CHARS.filter(c=>c.hit).length;

function charHTML(){
  return CHARS.map((c,i)=>`
<div class="cres" id="cr${i}">
  <div class="cimg" id="ci${i}" style="border-color:${c.color}"><img src="${IMG}/${c.id}.png" alt=""></div>
  <div class="cname" id="cn${i}">${c.name}</div>
  <div class="ctype" id="ct${i}">${c.type}</div>
  <div class="pickbox" id="pb${i}" style="border-color:${c.color}">
    <div class="picklbl" style="color:${c.light}">◎ 本命</div>
    <div class="pickname">${c.pick.num}番 ${c.pick.name}</div>
    <div class="pickinfo">結果: ${c.finish}着</div>
  </div>
  <div class="rmark ${c.hit?'hit':'miss'}" id="rm${i}">${c.hit?'✓':'×'}</div>
  <div class="rtxt" id="rt${i}" style="color:${c.hit?'#22c55e':'#ef4444'}">${c.comment}</div>
</div>`).join("\n");
}

function charAnim(){
  const l=[];
  CHARS.forEach((_,i)=>{
    const t=3+i*3;
    if(i>0) l.push(`t.to("#cr${i-1}",{opacity:0,duration:0.25},${(t-0.3).toFixed(1)});`);
    l.push(`t.to("#cr${i}",{opacity:1,duration:0.2},${t.toFixed(1)})
.to("#ci${i}",{opacity:1,duration:0.3},${(t+0.1).toFixed(1)}).from("#ci${i}",{scale:0.5,duration:0.3,ease:"back.out(1.5)"},${(t+0.1).toFixed(1)})
.to("#cn${i}",{opacity:1,duration:0.2},${(t+0.3).toFixed(1)})
.to("#ct${i}",{opacity:1,duration:0.2},${(t+0.4).toFixed(1)})
.to("#pb${i}",{opacity:1,duration:0.3},${(t+0.6).toFixed(1)}).from("#pb${i}",{x:-60,duration:0.3},${(t+0.6).toFixed(1)})
.to("#rm${i}",{opacity:1,scale:1,duration:0.4,ease:"elastic.out(1,0.5)"},${(t+1.2).toFixed(1)}).from("#rm${i}",{scale:3,duration:0.4,ease:"elastic.out(1,0.5)"},${(t+1.2).toFixed(1)})
.to("#rt${i}",{opacity:1,duration:0.3},${(t+1.7).toFixed(1)});`);
  });
  l.push(`t.to("#cr4",{opacity:0,duration:0.25},17.4);`);
  return l.join("\n");
}

function scoreHTML(){
  return CHARS.map((c,i)=>`
<div class="srow" id="sr${i}" style="top:${480+i*154}px">
  <div class="simg" style="border-color:${c.color}"><img src="${IMG}/${c.id}.png" alt=""></div>
  <div class="sname">${c.name}</div>
  <div class="spick">◎${c.pick.num}番 ${c.pick.name} → ${c.finish}着</div>
  <div class="sbadge ${c.hit?'hit':'miss'}">${c.hit?'✓':'×'}</div>
</div>`).join("\n");
}

function scoreAnim(){
  return CHARS.map((_,i)=>{const t=18.5+i*0.4;return `t.to("#sr${i}",{opacity:1,x:0,duration:0.3},${t.toFixed(1)}).from("#sr${i}",{x:-60,duration:0.3},${t.toFixed(1)});`;}).join("\n");
}

let html=fs.readFileSync(path.join(__dirname,"templates","results","index.html"),"utf-8");
html=html.replace("{{#CHAR_RESULTS}}",charHTML()).replace("{{#SCOREBOARD_ROWS}}",scoreHTML()).replace("{{#CHAR_ANIMATIONS}}",charAnim()).replace("{{#SCOREBOARD_ANIMATIONS}}",scoreAnim());
for(const[k,v]of Object.entries({"{{RACE_NAME}}":RACE.name,"{{GRADE}}":RACE.grade,"{{GRADE_COLOR}}":RACE.gradeColor,"{{VENUE}}":RACE.venue,"{{SURFACE}}":RACE.surface,"{{DISTANCE}}":RACE.distance,"{{HIT_COUNT}}":hitCount,"{{KAISHUU}}":142}))html=html.split(k).join(String(v));
const outDir=path.join(__dirname,"output-results");
if(!fs.existsSync(outDir))fs.mkdirSync(outDir,{recursive:true});
const out=path.join(outDir,`results-${RACE.name}-demo.html`);
fs.writeFileSync(out,html,"utf-8");
console.log(`🎬 結果速報 v4\n✅ ${out}\n💡 再生: __timelines.results.play()`);
