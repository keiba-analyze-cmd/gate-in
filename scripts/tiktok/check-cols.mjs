import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const cols = ['race_id','finish_position','honmei_finish','is_win','is_place','earned_points','odds_at_finish','result_comment','honmei_post_number','actual_position','is_hit','hit_type','points'];
for (const col of cols) {
  const obj = {prediction_id:'00000000-0000-0000-0000-000000000000',predictor_id:'hayate'};
  obj[col] = 'test';
  const r = await s.from('ai_prediction_results').insert(obj);
  if (r.error?.message?.includes('Could not find')) {
    console.log('NOT FOUND:', col);
  } else {
    console.log('EXISTS:', col, '|', r.error?.message?.slice(0,60));
  }
}
// cleanup
await s.from('ai_prediction_results').delete().eq('predictor_id','hayate');
