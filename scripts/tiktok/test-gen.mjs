const character = {
  name: 'カザン', subtitle: '穴馬予測型AI',
  color: '#DC2626', colorRgb: '220,38,38',
  emoji: '🔥', seriesName: '今週の爆弾',
  hookLine1: 'みんな見逃してるけど…',
  hookLine2: 'こいつ、ヤバい。',
};
const race = { name: '天皇賞・春' };
const picks = [
  { mark:'◎', horse:'ドウデュース', odds:'12.5', pop:'8', idm:'3', jockey:'武豊', reason:'人気と実力の乖離が最大' },
  { mark:'○', horse:'リバティアイランド', odds:'3.2', pop:'2', idm:'1', jockey:'ルメール', reason:'IDM1位 / 順当だが軸として信頼' },
  { mark:'▲', horse:'タスティエーラ', odds:'18.0', pop:'6', idm:'5', jockey:'松山', reason:'前走度外視 / 長距離適性◎' },
  { mark:'△', horse:'スターズオンアース', odds:'8.5', pop:'4', idm:'4', jockey:'川田', reason:'距離不安も地力上位 / 3着候補' },
];
console.log('✅ Setup OK!');
console.log(`キャラ: ${character.name}（${character.seriesName}）`);
console.log(`レース: ${race.name}`);
picks.forEach(p => console.log(`  ${p.mark} ${p.horse} ${p.odds}倍 人気${p.pop} IDM${p.idm}`));
console.log('\n→ 環境構築完了。フルスクリプトを配置すれば動画生成できます。');
