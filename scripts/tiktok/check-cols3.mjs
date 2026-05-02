import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const cols = ['honmei_umaban','finish_pos','is_honmei_win','is_honmei_place','honmei_odds','honmei_popularity','result_finish_position','predicted_umaban','actual_finish','confidence_score','is_published','settled','is_settled','result_type','created_at','updated_at'];
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
