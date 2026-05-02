import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const cols = ['honmei_finish_position','settled_at','odds','final_odds','payout','refund','honmei_name','honmei_number','actual_odds','race_date','year_month','updated_at_jst','modified_at'];
for (const col of cols) {
  const obj = {prediction_id:'00000000-0000-0000-0000-000000000000',predictor_id:'hayate',race_id:'00000000-0000-0000-0000-000000000000'};
  obj[col] = 'test';
  const r = await s.from('ai_prediction_results').insert(obj);
  if (r.error?.message?.includes('Could not find')) {
    console.log('NOT:', col);
  } else {
    console.log('YES:', col, '|', r.error?.message?.slice(0,60));
  }
}
await s.from('ai_prediction_results').delete().eq('predictor_id','hayate');
