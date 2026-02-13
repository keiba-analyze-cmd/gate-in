-- Badge master data + auto-grant function
-- Run in Supabase SQL Editor

-- Ensure badges table has required columns
ALTER TABLE badges ADD COLUMN IF NOT EXISTS condition_type TEXT;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS condition_value INT DEFAULT 0;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'achievement';

-- Upsert badge master data
INSERT INTO badges (id, name, icon, description, condition_type, condition_value, category) VALUES
  ('first_vote',      '初投票',         '🎫', '初めての投票を行った',           'total_votes',    1,   'milestone'),
  ('vote_10',         '常連予想家',      '📋', '10回投票した',                  'total_votes',    10,  'milestone'),
  ('vote_50',         'ベテラン予想家',   '📚', '50回投票した',                  'total_votes',    50,  'milestone'),
  ('vote_100',        '百戦錬磨',        '💯', '100回投票した',                 'total_votes',    100, 'milestone'),
  ('first_win',       '初的中',         '🎯', '初めて1着を的中させた',          'win_hits',       1,   'achievement'),
  ('win_10',          'スナイパー',      '🔫', '1着を10回的中させた',            'win_hits',       10,  'achievement'),
  ('win_50',          '神の目',         '👁', '1着を50回的中させた',            'win_hits',       50,  'achievement'),
  ('perfect_1',       '完全的中',        '💎', '初めてパーフェクトを達成した',     'perfect_count',  1,   'achievement'),
  ('perfect_5',       'パーフェクトマスター','✨', 'パーフェクト5回達成',           'perfect_count',  5,   'achievement'),
  ('streak_3',        '3連続的中',       '🔥', '3連続で的中した',               'current_streak', 3,   'streak'),
  ('streak_5',        '5連続的中',       '🔥🔥', '5連続で的中した',             'best_streak',    5,   'streak'),
  ('streak_10',       '10連続的中',      '🔥🔥🔥', '10連続で的中した',          'best_streak',    10,  'streak'),
  ('rank_forecaster', '予想士昇格',      '⭐', '予想士ランクに到達した',          'rank_tier',      0,   'rank'),
  ('rank_advanced',   '上級予想士昇格',   '⭐⭐', '上級予想士ランクに到達した',    'rank_tier',      0,   'rank'),
  ('rank_master',     'マスター昇格',    '👑', '予想マスターランクに到達した',     'rank_tier',      0,   'rank'),
  ('rank_legend',     'レジェンド',      '🏆', 'レジェンドランクに到達した',       'rank_tier',      0,   'rank'),
  ('big_upset',       '大穴ハンター',    '🦄', '10番人気以下の馬の1着を的中',     'special',        0,   'special'),
  ('g1_winner',       'G1ハンター',     '🏅', 'G1レースで1着を的中した',         'special',        0,   'special'),
  ('monthly_top3',    '月間TOP3',       '🥇', '月間ランキングTOP3に入った',      'special',        0,   'special')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  condition_type = EXCLUDED.condition_type,
  condition_value = EXCLUDED.condition_value,
  category = EXCLUDED.category;
