import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 4/26大会のみ確認
const contestId = '740e2678-b444-43ee-ad0a-799a02fdb138';

const { data } = await s.from('contest_entries')
  .select('user_id, total_points, is_eligible, hit_race_count, earliest_vote_at, profiles(display_name)')
  .eq('contest_id', contestId)
  .eq('is_eligible', true)
  .order('total_points', { ascending: false })
  .limit(5);

console.log('=== 4/26 大会 TOP5 ===');
for (let i = 0; i < (data?.length || 0); i++) {
  const e = data[i];
  const medal = ['🥇1位','🥈2位','🥉3位','4位','5位'][i];
  console.log(`${medal}: ${e.profiles?.display_name || 'unknown'} | ${e.total_points}P | user_id: ${e.user_id}`);
}

// TOP3のメール確認
console.log('\n=== メール確認 ===');
for (const e of (data || []).slice(0, 3)) {
  const { data: auth } = await s.auth.admin.getUserById(e.user_id);
  console.log(`${e.profiles?.display_name}: ${auth?.user?.email || 'メール未登録'}`);
}
