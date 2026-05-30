import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const winners = [
  {uid:'52cbeb68-3580-44a6-823a-5122bb900aa4', rank:'1', prize:'5,000', date:'05/17'},
  {uid:'49ac020a-a14e-4819-9d35-3695cef656c8', rank:'2', prize:'3,000', date:'05/17'},
  {uid:'2b3e4002-6a3f-4c1a-8a9b-92ed5fc3eacd', rank:'3', prize:'2,000', date:'05/17'},
  {uid:'29a1e125-8690-418a-a275-6df8d4bf3068', rank:'1', prize:'5,000', date:'05/24'},
  {uid:'52cbeb68-3580-44a6-823a-5122bb900aa4', rank:'2', prize:'3,000', date:'05/24'},
  {uid:'49ac020a-a14e-4819-9d35-3695cef656c8', rank:'3', prize:'2,000', date:'05/24'},
];

for (const w of winners) {
  const medal = {'1':'🥇','2':'🥈','3':'🥉'}[w.rank];
  await s.from('notifications').insert({
    user_id: w.uid,
    type: 'contest_rank',
    title: `${medal} 週間予想大会 ${w.rank}位入賞おめでとうございます！`,
    body: `週間予想大会 2026/${w.date}で${w.rank}位に入賞しました！Amazonギフト券¥${w.prize}をメールでお送りしました。届かない場合は迷惑メールフォルダをご確認ください。`,
    is_read: false
  });
  console.log(`${w.date} ${w.rank}位 通知送信OK`);
}
