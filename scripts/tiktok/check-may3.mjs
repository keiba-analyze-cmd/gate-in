import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const contestId = '264b6c05-fa34-4e27-8500-1bd608d584cc';
const { data: entries } = await s.from('contest_entries')
  .select('user_id, total_points, is_eligible, profiles(display_name)')
  .eq('contest_id', contestId)
  .eq('is_eligible', true)
  .order('total_points', { ascending: false })
  .limit(5);

console.log('=== 5/3 大会 ===');
console.log('参加者:', entries?.length || 0, '人');
if (entries?.length) {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    console.log(`  ${i+1}位: ${e.profiles?.display_name} | ${e.total_points}P`);
  }
}

// 大会にレースが紐づいているか
const { data: cRaces } = await s.from('contest_races')
  .select('race_id, races(name)')
  .eq('contest_id', contestId);
console.log('\n紐づけレース:', cRaces?.length || 0, '件');
cRaces?.forEach(r => console.log('  ', r.races?.name));
