import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myVote } = await supabase.from('votes').select('id').eq('race_id', raceId).eq('user_id', user.id).maybeSingle();
  const { data: race } = await supabase.from('races').select('status').eq('id', raceId).single();
  if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 });
  if (!myVote && race.status !== 'finished') return NextResponse.json({ error: 'Vote first', locked: true }, { status: 403 });

  // DBから事前生成済みの予想を取得
  const { data: predictions } = await supabase
    .from('ai_predictions')
    .select('predictor_id, umaban, horse_name, score, reason_key, comment, sire_name, gap, weight_change, confidence')
    .eq('race_id', raceId);

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ predictions: [], available: false, message: 'AI prediction not available' });
  }

  // AI予想家のキャラ情報をマージ
  const { data: predictors } = await supabase
    .from('ai_predictors')
    .select('id, name, type_label, catchphrase, color_main');

  const result = predictions.map(p => {
    const pr = (predictors || []).find(x => x.id === p.predictor_id);
    return {
      ...p,
      predictor_name: pr?.name || p.predictor_id,
      predictor_type: pr?.type_label || '',
      predictor_catchphrase: pr?.catchphrase || '',
      predictor_color: pr?.color_main || '#666',
    };
  });

  return NextResponse.json({ predictions: result, available: true });
}
