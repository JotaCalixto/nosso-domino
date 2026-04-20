-- ============================================================
-- NOSSO DOMIMINO — Migration 003: Row Level Security
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

-- players: leitura pública entre os dois
CREATE POLICY "players_select" ON players
  FOR SELECT USING (is_authorized_player());

-- matches: participantes leem
CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (
    is_authorized_player() AND
    auth_player_id() IN (player1_id, player2_id)
  );

-- rounds: participantes leem
CREATE POLICY "rounds_select" ON rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = rounds.match_id
        AND auth_player_id() IN (m.player1_id, m.player2_id)
    )
  );

-- hands: APENAS o dono lê a própria mão
CREATE POLICY "hands_select_own" ON hands
  FOR SELECT USING (player_id = auth_player_id());

-- moves: participantes leem
CREATE POLICY "moves_select" ON moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = moves.match_id
        AND auth_player_id() IN (m.player1_id, m.player2_id)
    )
  );

-- tabelas públicas entre os dois jogadores
CREATE POLICY "seasons_select" ON seasons
  FOR SELECT USING (is_authorized_player());

CREATE POLICY "season_stats_select" ON season_stats
  FOR SELECT USING (is_authorized_player());

CREATE POLICY "rankings_select" ON rankings
  FOR SELECT USING (is_authorized_player());

CREATE POLICY "achievements_select" ON achievements
  FOR SELECT USING (is_authorized_player());

CREATE POLICY "player_achievements_select" ON player_achievements
  FOR SELECT USING (is_authorized_player());
