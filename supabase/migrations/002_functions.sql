-- ============================================================
-- NOSSO DOMIMINO — Migration 002: Funções e Triggers
-- ============================================================

-- Função: retorna o player_id do usuário autenticado
CREATE OR REPLACE FUNCTION auth_player_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM players WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Função: verifica se é um dos dois jogadores autorizados
CREATE OR REPLACE FUNCTION is_authorized_player()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM players WHERE auth_user_id = auth.uid());
$$;

-- Função: retorna ou cria temporada do mês
CREATE OR REPLACE FUNCTION get_or_create_season(p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year  INT := EXTRACT(YEAR FROM p_date);
  v_month INT := EXTRACT(MONTH FROM p_date);
  v_id    UUID;
BEGIN
  SELECT id INTO v_id FROM seasons WHERE year = v_year AND month = v_month;
  IF NOT FOUND THEN
    INSERT INTO seasons (year, month, starts_at, ends_at)
    VALUES (
      v_year, v_month,
      DATE_TRUNC('month', p_date)::DATE,
      (DATE_TRUNC('month', p_date) + INTERVAL '1 month - 1 day')::DATE
    )
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- Função: busca partida ativa de um jogador
CREATE OR REPLACE FUNCTION get_active_match(p_player_id UUID)
RETURNS TABLE(match_id UUID, status match_status)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, status FROM matches
  WHERE (player1_id = p_player_id OR player2_id = p_player_id)
    AND status IN ('aguardando', 'em_andamento', 'pausada')
  ORDER BY started_at DESC
  LIMIT 1;
$$;

-- ============================================================
-- Trigger: ao finalizar partida, atualiza rankings + temporada
-- ============================================================
CREATE OR REPLACE FUNCTION on_match_finished()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_winner_id   UUID := NEW.winner_id;
  v_loser_id    UUID;
  v_season_id   UUID;
  v_points      INT;
  v_new_streak  INT;
  v_best        INT;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'finalizada' THEN
    RETURN NEW;
  END IF;

  IF v_winner_id IS NULL THEN RETURN NEW; END IF;

  v_loser_id := CASE
    WHEN v_winner_id = NEW.player1_id THEN NEW.player2_id
    ELSE NEW.player1_id
  END;

  v_points := CASE
    WHEN v_winner_id = NEW.player1_id THEN NEW.score_player1
    ELSE NEW.score_player2
  END;

  -- Ranking do vencedor
  INSERT INTO rankings (player_id, wins, losses, total_points, matches_played, current_streak, best_streak)
  VALUES (v_winner_id, 1, 0, v_points, 1, 1, 1)
  ON CONFLICT (player_id) DO UPDATE SET
    wins           = rankings.wins + 1,
    total_points   = rankings.total_points + v_points,
    matches_played = rankings.matches_played + 1,
    current_streak = GREATEST(rankings.current_streak + 1, 1),
    best_streak    = GREATEST(rankings.best_streak, GREATEST(rankings.current_streak + 1, 1)),
    updated_at     = now();

  -- Ranking do perdedor
  INSERT INTO rankings (player_id, wins, losses, total_points, matches_played, current_streak, best_streak)
  VALUES (v_loser_id, 0, 1, 0, 1, -1, 0)
  ON CONFLICT (player_id) DO UPDATE SET
    losses         = rankings.losses + 1,
    matches_played = rankings.matches_played + 1,
    current_streak = LEAST(rankings.current_streak - 1, -1),
    updated_at     = now();

  -- Temporada
  v_season_id := get_or_create_season(NOW()::DATE);
  NEW.season_id   := v_season_id;
  NEW.finished_at := now();

  INSERT INTO season_stats (season_id, player_id, wins, losses, points)
  VALUES (v_season_id, v_winner_id, 1, 0, v_points)
  ON CONFLICT (season_id, player_id) DO UPDATE SET
    wins   = season_stats.wins + 1,
    points = season_stats.points + v_points;

  INSERT INTO season_stats (season_id, player_id, wins, losses, points)
  VALUES (v_season_id, v_loser_id, 0, 1, 0)
  ON CONFLICT (season_id, player_id) DO UPDATE SET
    losses = season_stats.losses + 1;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_finished
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION on_match_finished();

-- ============================================================
-- Trigger: atualizar updated_at em hands
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_hands_updated_at
  BEFORE UPDATE ON hands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
