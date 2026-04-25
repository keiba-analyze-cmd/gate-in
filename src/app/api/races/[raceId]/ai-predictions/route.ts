import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function runModels(entries, sireDistStats) {
  const predictions = [];

  const hayatePick = [...entries]
    .filter(e => e.idm != null)
    .sort((a, b) => ((b.idm || 0) * 0.8 + (b.jockey_index || 0) * 0.2) - ((a.idm || 0) * 0.8 + (a.jockey_index || 0) * 0.2))[0];
  if (hayatePick) {
    predictions.push({
      predictor_id: 'hayate', umaban: hayatePick.umaban, horse_name: hayatePick.horse_name,
      score: ((hayatePick.idm || 0) * 0.8 + (hayatePick.jockey_index || 0) * 0.2).toFixed(1),
      reason_key: 'idm_jockey',
    });
  }

  const bySogo = [...entries].filter(e => e.sogo_index != null).sort((a, b) => (b.sogo_index || 0) - (a.sogo_index || 0));
  if (bySogo.length >= 2 && ((bySogo[0].sogo_index || 0) - (bySogo[1].sogo_index || 0)) >= 8) {
    const gap = ((bySogo[0].sogo_index || 0) - (bySogo[1].sogo_index || 0)).toFixed(1);
    predictions.push({
      predictor_id: 'gantetsu', umaban: bySogo[0].umaban, horse_name: bySogo[0].horse_name,
      score: (bySogo[0].sogo_index || 0).toFixed(1), reason_key: 'sogo_dominant', gap,
    });
  }

  const byIDM = [...entries].filter(e => e.idm != null).sort((a, b) => (b.idm || 0) - (a.idm || 0));
  const midRange = byIDM.slice(2, 6).filter(e => (e.base_odds || 0) >= 3);
  if (midRange.length > 0) {
    midRange.sort((a, b) => ((b.idm || 0) * Math.log(b.base_odds || 1)) - ((a.idm || 0) * Math.log(a.base_odds || 1)));
    predictions.push({
      predictor_id: 'kazan', umaban: midRange[0].umaban, horse_name: midRange[0].horse_name,
      score: ((midRange[0].idm || 0) * Math.log(midRange[0].base_odds || 1)).toFixed(1),
      reason_key: 'midrange_value',
    });
  }

  if (sireDistStats.size > 0) {
    let bestH = null, bestScore = -1;
    for (const e of entries) {
      if (!e.idm || !e.sire_name) continue;
      const dist = (e.distance || 0) <= 1400 ? 'S' : (e.distance || 0) <= 1800 ? 'M' : (e.distance || 0) <= 2200 ? 'I' : 'L';
      const surf = e.surface_code === 1 ? 'T' : 'D';
      const key = e.sire_name + '_' + surf + '_' + dist;
      const stats = sireDistStats.get(key);
      const boost = stats && stats.r >= 3 ? stats.t3 / stats.r : 0.25;
      const score = e.idm * boost;
      if (score > bestScore) { bestScore = score; bestH = { ...e, sireBoost: boost }; }
    }
    if (bestH) {
      predictions.push({
        predictor_id: 'hakusen', umaban: bestH.umaban, horse_name: bestH.horse_name,
        score: bestScore.toFixed(1), reason_key: 'sire_condition', sire_name: bestH.sire_name,
      });
    }
  }

  const fitH = entries.filter(e => e.idm != null && (e.horse_weight_change == null || e.horse_weight_change <= 10));
  if (fitH.length > 0) {
    fitH.sort((a, b) => (b.idm || 0) - (a.idm || 0));
    predictions.push({
      predictor_id: 'hibari', umaban: fitH[0].umaban, horse_name: fitH[0].horse_name,
      score: (fitH[0].idm || 0).toFixed(1), reason_key: 'weight_stable',
      weight_change: fitH[0].horse_weight_change,
    });
  }

  return predictions;
}

export async function GET(request, { params }) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myVote } = await supabase.from('votes').select('id').eq('race_id', raceId).eq('user_id', user.id).maybeSingle();
  const { data: race } = await supabase.from('races').select('race_date, course_name, race_number, status').eq('id', raceId).single();
  if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 });
  if (!myVote && race.status !== 'finished') return NextResponse.json({ error: 'Vote first', locked: true }, { status: 403 });

  const { data: jrdbEntries } = await supabase.from('jrdb_race_entries').select('*')
    .eq('race_date', race.race_date).eq('course_name', race.course_name).eq('race_number', race.race_number);
  if (!jrdbEntries || jrdbEntries.length === 0) return NextResponse.json({ predictions: [], available: false, message: 'JRDB data not available' });

  const sireDistStats = new Map();
  const { data: allSireData } = await supabase.from('jrdb_race_entries')
    .select('sire_name, surface_code, distance, finish_order, anomaly').not('sire_name', 'is', null).eq('anomaly', 0);
  if (allSireData) {
    for (const row of allSireData) {
      const dist = (row.distance || 0) <= 1400 ? 'S' : (row.distance || 0) <= 1800 ? 'M' : (row.distance || 0) <= 2200 ? 'I' : 'L';
      const surf = row.surface_code === 1 ? 'T' : 'D';
      const key = row.sire_name + '_' + surf + '_' + dist;
      if (!sireDistStats.has(key)) sireDistStats.set(key, { r: 0, w: 0, t3: 0 });
      const s = sireDistStats.get(key);
      s.r++; if (row.finish_order === 1) s.w++; if (row.finish_order <= 3) s.t3++;
    }
  }

  const { data: predictors } = await supabase.from('ai_predictors').select('id, name, type_label, catchphrase, color_main');
  const predictions = runModels(jrdbEntries, sireDistStats);
  const result = predictions.map(p => {
    const pr = (predictors || []).find(x => x.id === p.predictor_id);
    return { ...p, predictor_name: pr?.name || p.predictor_id, predictor_type: pr?.type_label || '',
      predictor_catchphrase: pr?.catchphrase || '', predictor_color: pr?.color_main || '#666' };
  });
  return NextResponse.json({ predictions: result, available: true });
}
