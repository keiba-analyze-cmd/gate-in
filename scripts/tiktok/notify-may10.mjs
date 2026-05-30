import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const winners = [
  {uid:'2b3e4002-6a3f-4c1a-8a9b-92ed5fc3eacd', rank:'1', prize:'5,000'},
  {uid:'00d5b326-2120-4fcf-8485-5be7d791c5f0', rank:'3', prize:'2,000'},
];

for (const w of winners) {
  const medal = {1:'🥇',3:'🥉'}[w.rank];
  await s.from('notifications').insert({
    user_id: w.uid,
    type: 'contest_rank',
    title: medal + ' 週間予想大会 ' + w.rank + '位入賞おめでとうございます！',
    body: '週間予想大会 2026/05/10で' + w.rank + '位に入賞しました！Amazonギフト券¥' + w.prize + 'をメールでお送りしました。届かない場合は迷惑メールフォルダをご確認ください。',
    is_read: false
  });
  console.log(w.rank + '位 通知送信OK');
}
