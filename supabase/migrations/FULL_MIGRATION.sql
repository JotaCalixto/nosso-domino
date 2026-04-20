-- ============================================================
-- NOSSO DOMIMINO — Migration Completa (versão simplificada)
-- Cole tudo no Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ENUMs
CREATE TYPE match_status AS ENUM (
  'aguardando', 'em_andamento', 'pausada', 'finalizada', 'abandonada'
);
CREATE TYPE round_status AS ENUM (
  'em_andamento', 'encerrada_batida', 'encerrada_travada'
);
CREATE TYPE move_type AS ENUM ('jogada', 'compra', 'passa');
CREATE TYPE board_side AS ENUM ('esquerda', 'direita');

-- ============================================================
-- SEASONS
-- ============================================================
CREATE TABLE seasons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year       INT NOT NULL CHECK (year >= 2025),
  month      INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  starts_at  DATE NOT NULL,
  ends_at    DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_season UNIQUE (year, month),
  CONSTRAINT valid_date_range CHECK (ends_at > starts_at)
);
CREATE INDEX idx_seasons_year_month ON seasons(year, month);

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          TEXT UNIQUE NOT NULL CHECK (slug IN ('jota', 'iza')),
  display_name  TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  avatar_path   TEXT NOT NULL,
  tagline       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id       UUID NOT NULL REFERENCES players(id),
  player2_id       UUID NOT NULL REFERENCES players(id),
  status           match_status NOT NULL DEFAULT 'aguardando',
  score_player1    INT NOT NULL DEFAULT 0 CHECK (score_player1 >= 0),
  score_player2    INT NOT NULL DEFAULT 0 CHECK (score_player2 >= 0),
  winner_id        UUID REFERENCES players(id),
  current_round_id UUID,
  season_id        UUID REFERENCES seasons(id),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ,
  CONSTRAINT different_players CHECK (player1_id <> player2_id),
  CONSTRAINT winner_is_participant CHECK (
    winner_id IS NULL OR winner_id IN (player1_id, player2_id)
  )
);
CREATE INDEX idx_matches_p1 ON matches(player1_id, status);
CREATE INDEX idx_matches_p2 ON matches(player2_id, status);

-- ============================================================
-- ROUNDS
-- ============================================================
CREATE TABLE rounds (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id           UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number       INT NOT NULL CHECK (round_number >= 1),
  status             round_status NOT NULL DEFAULT 'em_andamento',
  starter_id         UUID NOT NULL REFERENCES players(id),
  current_turn_id    UUID REFERENCES players(id),
  points_earned      INT CHECK (points_earned >= 0),
  round_winner_id    UUID REFERENCES players(id),
  round_state        JSONB NOT NULL DEFAULT '{}',
  consecutive_passes INT NOT NULL DEFAULT 0,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at        TIMESTAMPTZ,
  CONSTRAINT unique_round_per_match UNIQUE (match_id, round_number)
);
CREATE INDEX idx_rounds_match ON rounds(match_id);
CREATE INDEX idx_rounds_active ON rounds(match_id, status) WHERE status = 'em_andamento';

-- FK circular resolvida após criar rounds
ALTER TABLE matches
  ADD CONSTRAINT fk_current_round
  FOREIGN KEY (current_round_id) REFERENCES rounds(id)
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- HANDS
-- ============================================================
CREATE TABLE hands (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id   UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES players(id),
  tiles      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_hand UNIQUE (round_id, player_id)
);
CREATE INDEX idx_hands ON hands(round_id, player_id);

-- ============================================================
-- MOVES
-- ============================================================
CREATE TABLE moves (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id         UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL REFERENCES players(id),
  move_type        move_type NOT NULL,
  move_number      INT NOT NULL,
  tile_left        INT CHECK (tile_left BETWEEN 0 AND 6),
  tile_right       INT CHECK (tile_right BETWEEN 0 AND 6),
  board_side       board_side,
  drawn_tile_left  INT CHECK (drawn_tile_left BETWEEN 0 AND 6),
  drawn_tile_right INT CHECK (drawn_tile_right BETWEEN 0 AND 6),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_move UNIQUE (round_id, move_number)
);
CREATE INDEX idx_moves_round ON moves(round_id, move_number);
CREATE INDEX idx_moves_match ON moves(match_id);

-- ============================================================
-- RANKINGS
-- ============================================================
CREATE TABLE rankings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID UNIQUE NOT NULL REFERENCES players(id),
  wins           INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses         INT NOT NULL DEFAULT 0 CHECK (losses >= 0),
  total_points   INT NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  matches_played INT NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  current_streak INT NOT NULL DEFAULT 0,
  best_streak    INT NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SEASON STATS
-- ============================================================
CREATE TABLE season_stats (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  wins      INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses    INT NOT NULL DEFAULT 0 CHECK (losses >= 0),
  points    INT NOT NULL DEFAULT 0 CHECK (points >= 0),
  CONSTRAINT unique_season_player UNIQUE (season_id, player_id)
);
CREATE INDEX idx_ss_season ON season_stats(season_id);
CREATE INDEX idx_ss_player ON season_stats(player_id);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE achievements (
  code        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  rule        JSONB NOT NULL DEFAULT '{}',
  sort_order  INT NOT NULL DEFAULT 0
);

-- ============================================================
-- PLAYER ACHIEVEMENTS
-- ============================================================
CREATE TABLE player_achievements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID NOT NULL REFERENCES players(id),
  achievement_code TEXT NOT NULL REFERENCES achievements(code),
  unlocked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  match_id         UUID REFERENCES matches(id),
  CONSTRAINT unique_player_ach UNIQUE (player_id, achievement_code)
);
CREATE INDEX idx_pa_player ON player_achievements(player_id);

-- ============================================================
-- FUNÇÕES HELPER (sintaxe simplificada sem PL/pgSQL)
-- ============================================================

CREATE OR REPLACE FUNCTION auth_player_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
RETURN (SELECT id FROM players WHERE auth_user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE FUNCTION is_authorized_player()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
RETURN (SELECT EXISTS (SELECT 1 FROM players WHERE auth_user_id = auth.uid()));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands               ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves               ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select" ON players
  FOR SELECT USING (is_authorized_player());

CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (
    is_authorized_player() AND
    auth_player_id() IN (player1_id, player2_id)
  );

CREATE POLICY "rounds_select" ON rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = rounds.match_id
        AND auth_player_id() IN (m.player1_id, m.player2_id)
    )
  );

CREATE POLICY "hands_select_own" ON hands
  FOR SELECT USING (player_id = auth_player_id());

CREATE POLICY "moves_select" ON moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = moves.match_id
        AND auth_player_id() IN (m.player1_id, m.player2_id)
    )
  );

CREATE POLICY "seasons_select"             ON seasons             FOR SELECT USING (is_authorized_player());
CREATE POLICY "season_stats_select"        ON season_stats        FOR SELECT USING (is_authorized_player());
CREATE POLICY "rankings_select"            ON rankings            FOR SELECT USING (is_authorized_player());
CREATE POLICY "achievements_select"        ON achievements        FOR SELECT USING (is_authorized_player());
CREATE POLICY "player_achievements_select" ON player_achievements FOR SELECT USING (is_authorized_player());

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE moves;
