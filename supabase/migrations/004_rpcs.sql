-- ============================================================
-- NOSSO DOMIMINO — Migration 004: RPCs do Jogo
-- ============================================================

-- ── create_match ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_match()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id   UUID := auth_player_id();
  v_opponent_id UUID;
  v_match_id    UUID;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;

  IF EXISTS (
    SELECT 1 FROM matches
    WHERE (player1_id = v_caller_id OR player2_id = v_caller_id)
      AND status IN ('aguardando', 'em_andamento', 'pausada')
  ) THEN
    RAISE EXCEPTION 'Já existe uma partida em andamento';
  END IF;

  SELECT id INTO v_opponent_id FROM players WHERE id <> v_caller_id LIMIT 1;

  INSERT INTO matches (player1_id, player2_id, status)
  VALUES (v_caller_id, v_opponent_id, 'aguardando')
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

-- ── accept_match ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_match(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id UUID := auth_player_id();
  v_match     matches%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida não encontrada'; END IF;
  IF v_match.status <> 'aguardando' THEN RAISE EXCEPTION 'Partida não está aguardando'; END IF;
  IF v_caller_id NOT IN (v_match.player1_id, v_match.player2_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF v_caller_id = v_match.player1_id THEN
    RAISE EXCEPTION 'Você não pode aceitar sua própria partida';
  END IF;

  UPDATE matches SET status = 'em_andamento', last_activity_at = now()
  WHERE id = p_match_id;

  PERFORM start_round(p_match_id);
END;
$$;

-- ── start_round ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_round(p_match_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match        matches%ROWTYPE;
  v_round_number INT;
  v_round_id     UUID;
  v_tiles        JSONB;
  v_hand1        JSONB;
  v_hand2        JSONB;
  v_stock        JSONB;
  v_starter_id   UUID;
  v_p1           UUID;
  v_p2           UUID;
  -- Geração das 28 peças e embaralhamento
  v_all_tiles    JSONB;
  v_shuffled     JSONB;
  v_i            INT;
  v_j            INT;
  v_temp         JSONB;
  v_max_bucha    INT := -1;
  v_max_sum      INT := -1;
  v_max_side     INT := -1;
  v_starter_tile JSONB;
  v_t            JSONB;
  v_val          INT;
  v_sum          INT;
  v_side         INT;
  v_tiebreak_id  UUID;
  v_last_round   rounds%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  v_p1 := v_match.player1_id;
  v_p2 := v_match.player2_id;

  -- Número da rodada
  SELECT COALESCE(MAX(round_number), 0) + 1 INTO v_round_number
  FROM rounds WHERE match_id = p_match_id;

  -- Gerar 28 peças
  v_all_tiles := '[]'::JSONB;
  FOR l_left IN 0..6 LOOP
    FOR l_right IN l_left..6 LOOP
      v_all_tiles := v_all_tiles || jsonb_build_array(jsonb_build_object('left', l_left, 'right', l_right));
    END LOOP;
  END LOOP;

  -- Fisher-Yates shuffle usando srand do Postgres
  v_shuffled := v_all_tiles;
  FOR v_i IN REVERSE 27..1 LOOP
    v_j := floor(random() * (v_i + 1))::INT;
    v_temp := v_shuffled -> v_i;
    v_shuffled := jsonb_set(v_shuffled, ARRAY[v_i::TEXT], v_shuffled -> v_j);
    v_shuffled := jsonb_set(v_shuffled, ARRAY[v_j::TEXT], v_temp);
  END LOOP;

  -- Distribuir: 0-6 para p1, 7-13 para p2, 14-27 monte
  v_hand1 := '[]'::JSONB;
  FOR v_i IN 0..6 LOOP
    v_hand1 := v_hand1 || jsonb_build_array(v_shuffled -> v_i);
  END LOOP;

  v_hand2 := '[]'::JSONB;
  FOR v_i IN 7..13 LOOP
    v_hand2 := v_hand2 || jsonb_build_array(v_shuffled -> v_i);
  END LOOP;

  v_stock := '[]'::JSONB;
  FOR v_i IN 14..27 LOOP
    v_stock := v_stock || jsonb_build_array(v_shuffled -> v_i);
  END LOOP;

  -- Determinar quem começa (maior bucha)
  v_starter_id := NULL;
  v_starter_tile := NULL;

  -- Checar buchas na mão de p1
  FOR v_i IN 0..6 LOOP
    v_t := v_hand1 -> v_i;
    IF (v_t->>'left')::INT = (v_t->>'right')::INT THEN
      v_val := (v_t->>'left')::INT;
      IF v_val > v_max_bucha THEN
        v_max_bucha := v_val;
        v_starter_id := v_p1;
        v_starter_tile := v_t;
      END IF;
    END IF;
  END LOOP;

  -- Checar buchas na mão de p2
  FOR v_i IN 0..6 LOOP
    v_t := v_hand2 -> v_i;
    IF (v_t->>'left')::INT = (v_t->>'right')::INT THEN
      v_val := (v_t->>'left')::INT;
      IF v_val > v_max_bucha THEN
        v_max_bucha := v_val;
        v_starter_id := v_p2;
        v_starter_tile := v_t;
      END IF;
    END IF;
  END LOOP;

  -- Se nenhum tem bucha, maior soma
  IF v_starter_id IS NULL THEN
    -- Melhor peça de p1
    FOR v_i IN 0..6 LOOP
      v_t := v_hand1 -> v_i;
      v_sum := (v_t->>'left')::INT + (v_t->>'right')::INT;
      v_side := GREATEST((v_t->>'left')::INT, (v_t->>'right')::INT);
      IF v_sum > v_max_sum OR (v_sum = v_max_sum AND v_side > v_max_side) THEN
        v_max_sum := v_sum; v_max_side := v_side;
        v_starter_id := v_p1; v_starter_tile := v_t;
      END IF;
    END LOOP;
    -- Melhor peça de p2
    FOR v_i IN 0..6 LOOP
      v_t := v_hand2 -> v_i;
      v_sum := (v_t->>'left')::INT + (v_t->>'right')::INT;
      v_side := GREATEST((v_t->>'left')::INT, (v_t->>'right')::INT);
      IF v_sum > v_max_sum OR (v_sum = v_max_sum AND v_side > v_max_side) THEN
        v_max_sum := v_sum; v_max_side := v_side;
        v_starter_id := v_p2; v_starter_tile := v_t;
      END IF;
    END LOOP;
  END IF;

  -- Tiebreak: na primeira rodada Jota (player1), nas demais quem perdeu a anterior
  IF v_starter_id IS NULL THEN
    IF v_round_number = 1 THEN
      v_starter_id := v_p1;
    ELSE
      SELECT * INTO v_last_round FROM rounds
      WHERE match_id = p_match_id AND round_number = v_round_number - 1;
      v_starter_id := CASE
        WHEN v_last_round.round_winner_id = v_p1 THEN v_p2
        ELSE v_p1
      END;
    END IF;
  END IF;

  -- Estado inicial da rodada
  v_tiles := jsonb_build_object(
    'board', '[]'::JSONB,
    'leftEnd', -1,
    'rightEnd', -1,
    'stock', v_stock,
    'stockCount', 14,
    'consecutivePasses', 0,
    'lastMoveId', NULL
  );

  -- Inserir rodada
  INSERT INTO rounds (match_id, round_number, status, starter_id, current_turn_id, round_state)
  VALUES (p_match_id, v_round_number, 'em_andamento', v_starter_id, v_starter_id, v_tiles)
  RETURNING id INTO v_round_id;

  -- Inserir mãos
  INSERT INTO hands (round_id, player_id, tiles) VALUES (v_round_id, v_p1, v_hand1);
  INSERT INTO hands (round_id, player_id, tiles) VALUES (v_round_id, v_p2, v_hand2);

  -- Atualizar current_round_id na partida
  UPDATE matches SET current_round_id = v_round_id, last_activity_at = now()
  WHERE id = p_match_id;

  RETURN v_round_id;
END;
$$;

-- ── play_piece ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION play_piece(
  p_round_id  UUID,
  p_tile_left  INT,
  p_tile_right INT,
  p_side       board_side
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id  UUID := auth_player_id();
  v_round      rounds%ROWTYPE;
  v_match      matches%ROWTYPE;
  v_hand       JSONB;
  v_state      JSONB;
  v_board      JSONB;
  v_tile       JSONB := jsonb_build_object('left', p_tile_left, 'right', p_tile_right);
  v_target_end INT;
  v_left_end   INT;
  v_right_end  INT;
  v_new_left   INT;
  v_new_right  INT;
  v_flipped    BOOLEAN := FALSE;
  v_board_tile JSONB;
  v_new_board  JSONB;
  v_tile_idx   INT := -1;
  v_new_hand   JSONB;
  v_i          INT;
  v_t          JSONB;
  v_opponent_id UUID;
  v_move_num   INT;
  v_opp_hand   JSONB;
  v_opp_sum    INT := 0;
  v_my_sum     INT := 0;
  v_round_ended BOOLEAN := FALSE;
  v_result     JSONB;
BEGIN
  SELECT * INTO v_round FROM rounds WHERE id = p_round_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rodada não encontrada'; END IF;
  IF v_round.status <> 'em_andamento' THEN RAISE EXCEPTION 'Rodada já encerrada'; END IF;
  IF v_round.current_turn_id <> v_caller_id THEN RAISE EXCEPTION 'Não é seu turno'; END IF;

  SELECT * INTO v_match FROM matches WHERE id = v_round.match_id;
  IF v_caller_id NOT IN (v_match.player1_id, v_match.player2_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  v_state := v_round.round_state;
  v_board := v_state -> 'board';
  v_left_end := (v_state->>'leftEnd')::INT;
  v_right_end := (v_state->>'rightEnd')::INT;

  -- Validar: jogador tem a peça?
  SELECT tiles INTO v_hand FROM hands WHERE round_id = p_round_id AND player_id = v_caller_id;
  FOR v_i IN 0..(jsonb_array_length(v_hand)-1) LOOP
    v_t := v_hand -> v_i;
    IF (v_t->>'left')::INT = p_tile_left AND (v_t->>'right')::INT = p_tile_right THEN
      v_tile_idx := v_i; EXIT;
    END IF;
  END LOOP;
  IF v_tile_idx = -1 THEN RAISE EXCEPTION 'Peça não está na sua mão'; END IF;

  -- Validar encaixe
  IF jsonb_array_length(v_board) = 0 THEN
    -- Primeira peça: qualquer uma
    v_new_left := p_tile_left;
    v_new_right := p_tile_right;
  ELSE
    v_target_end := CASE p_side WHEN 'esquerda' THEN v_left_end ELSE v_right_end END;
    IF p_tile_left = v_target_end THEN
      IF p_side = 'esquerda' THEN v_new_left := p_tile_right; v_new_right := p_tile_left; v_flipped := TRUE;
      ELSE v_new_left := p_tile_left; v_new_right := p_tile_right; END IF;
    ELSIF p_tile_right = v_target_end THEN
      IF p_side = 'esquerda' THEN v_new_left := p_tile_left; v_new_right := p_tile_right;
      ELSE v_new_left := p_tile_right; v_new_right := p_tile_left; v_flipped := TRUE; END IF;
    ELSE
      RAISE EXCEPTION 'Essa peça não encaixa nessa ponta';
    END IF;
  END IF;

  v_board_tile := jsonb_build_object(
    'left', v_new_left, 'right', v_new_right,
    'flipped', v_flipped,
    'side', CASE WHEN jsonb_array_length(v_board) = 0 THEN 'inicio' ELSE p_side::TEXT END
  );

  -- Atualizar board e pontas
  IF jsonb_array_length(v_board) = 0 THEN
    v_new_board := jsonb_build_array(v_board_tile);
    v_left_end := v_new_left; v_right_end := v_new_right;
  ELSIF p_side = 'esquerda' THEN
    v_new_board := jsonb_build_array(v_board_tile) || v_board;
    v_left_end := v_new_left;
  ELSE
    v_new_board := v_board || jsonb_build_array(v_board_tile);
    v_right_end := v_new_right;
  END IF;

  -- Remover peça da mão
  v_new_hand := '[]'::JSONB;
  FOR v_i IN 0..(jsonb_array_length(v_hand)-1) LOOP
    IF v_i <> v_tile_idx THEN
      v_new_hand := v_new_hand || jsonb_build_array(v_hand -> v_i);
    END IF;
  END LOOP;

  -- Número do próximo move
  SELECT COALESCE(MAX(move_number), 0) + 1 INTO v_move_num FROM moves WHERE round_id = p_round_id;

  -- Oponente
  v_opponent_id := CASE WHEN v_caller_id = v_match.player1_id THEN v_match.player2_id ELSE v_match.player1_id END;

  -- Atualizar estado
  v_state := jsonb_set(v_state, '{board}', v_new_board);
  v_state := jsonb_set(v_state, '{leftEnd}', to_jsonb(v_left_end));
  v_state := jsonb_set(v_state, '{rightEnd}', to_jsonb(v_right_end));
  v_state := jsonb_set(v_state, '{consecutivePasses}', '0'::JSONB);

  -- Inserir move
  INSERT INTO moves (round_id, match_id, player_id, move_type, move_number, tile_left, tile_right, board_side)
  VALUES (p_round_id, v_round.match_id, v_caller_id, 'jogada', v_move_num, p_tile_left, p_tile_right, p_side)
  RETURNING id INTO v_t;

  v_state := jsonb_set(v_state, '{lastMoveId}', to_jsonb(v_t::TEXT));

  -- Verificar batida (mão vazia)
  IF jsonb_array_length(v_new_hand) = 0 THEN
    -- Calcular pontos: soma da mão do oponente
    SELECT tiles INTO v_opp_hand FROM hands WHERE round_id = p_round_id AND player_id = v_opponent_id;
    FOR v_i IN 0..(jsonb_array_length(v_opp_hand)-1) LOOP
      v_t := v_opp_hand -> v_i;
      v_opp_sum := v_opp_sum + (v_t->>'left')::INT + (v_t->>'right')::INT;
    END LOOP;

    -- Encerrar rodada
    UPDATE rounds SET
      status = 'encerrada_batida',
      round_state = v_state,
      current_turn_id = NULL,
      points_earned = v_opp_sum,
      round_winner_id = v_caller_id,
      finished_at = now()
    WHERE id = p_round_id;

    UPDATE hands SET tiles = v_new_hand WHERE round_id = p_round_id AND player_id = v_caller_id;

    -- Atualizar placar da partida
    PERFORM update_match_score(v_round.match_id, v_caller_id, v_opp_sum);
    v_round_ended := TRUE;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'roundEnded', TRUE,
      'type', 'batida',
      'winnerId', v_caller_id,
      'pointsEarned', v_opp_sum
    );
  END IF;

  -- Atualizar round e hand
  UPDATE rounds SET
    round_state = v_state,
    current_turn_id = v_opponent_id,
    consecutive_passes = 0
  WHERE id = p_round_id;

  UPDATE hands SET tiles = v_new_hand WHERE round_id = p_round_id AND player_id = v_caller_id;
  UPDATE matches SET last_activity_at = now() WHERE id = v_round.match_id;

  RETURN jsonb_build_object('ok', TRUE, 'roundEnded', FALSE);
END;
$$;

-- ── draw_piece ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION draw_piece(p_round_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id  UUID := auth_player_id();
  v_round      rounds%ROWTYPE;
  v_match      matches%ROWTYPE;
  v_hand       JSONB;
  v_state      JSONB;
  v_stock      JSONB;
  v_drawn      JSONB;
  v_new_hand   JSONB;
  v_new_stock  JSONB;
  v_move_num   INT;
  v_can_play   BOOLEAN := FALSE;
  v_i          INT;
  v_t          JSONB;
  v_left_end   INT;
  v_right_end  INT;
BEGIN
  SELECT * INTO v_round FROM rounds WHERE id = p_round_id;
  IF v_round.status <> 'em_andamento' THEN RAISE EXCEPTION 'Rodada já encerrada'; END IF;
  IF v_round.current_turn_id <> v_caller_id THEN RAISE EXCEPTION 'Não é seu turno'; END IF;

  SELECT * INTO v_match FROM matches WHERE id = v_round.match_id;
  v_state := v_round.round_state;
  v_stock := v_state -> 'stock';
  v_left_end := (v_state->>'leftEnd')::INT;
  v_right_end := (v_state->>'rightEnd')::INT;

  SELECT tiles INTO v_hand FROM hands WHERE round_id = p_round_id AND player_id = v_caller_id;

  -- Verificar se já tem jogada (não deveria comprar)
  FOR v_i IN 0..(jsonb_array_length(v_hand)-1) LOOP
    v_t := v_hand -> v_i;
    IF jsonb_array_length(v_state->'board') = 0 OR
       (v_t->>'left')::INT = v_left_end OR (v_t->>'right')::INT = v_left_end OR
       (v_t->>'left')::INT = v_right_end OR (v_t->>'right')::INT = v_right_end THEN
      v_can_play := TRUE; EXIT;
    END IF;
  END LOOP;
  IF v_can_play THEN RAISE EXCEPTION 'Você tem jogada disponível'; END IF;

  IF jsonb_array_length(v_stock) = 0 THEN
    RAISE EXCEPTION 'Monte vazio — use passar vez';
  END IF;

  -- Pegar primeira peça do monte
  v_drawn := v_stock -> 0;
  v_new_hand := v_hand || jsonb_build_array(v_drawn);
  v_new_stock := '[]'::JSONB;
  FOR v_i IN 1..(jsonb_array_length(v_stock)-1) LOOP
    v_new_stock := v_new_stock || jsonb_build_array(v_stock -> v_i);
  END LOOP;

  v_state := jsonb_set(v_state, '{stock}', v_new_stock);
  v_state := jsonb_set(v_state, '{stockCount}', to_jsonb(jsonb_array_length(v_new_stock)));

  SELECT COALESCE(MAX(move_number), 0) + 1 INTO v_move_num FROM moves WHERE round_id = p_round_id;

  INSERT INTO moves (round_id, match_id, player_id, move_type, move_number, drawn_tile_left, drawn_tile_right)
  VALUES (p_round_id, v_round.match_id, v_caller_id, 'compra', v_move_num,
          (v_drawn->>'left')::INT, (v_drawn->>'right')::INT);

  UPDATE hands SET tiles = v_new_hand WHERE round_id = p_round_id AND player_id = v_caller_id;
  UPDATE rounds SET round_state = v_state WHERE id = p_round_id;
  UPDATE matches SET last_activity_at = now() WHERE id = v_round.match_id;

  -- Retorna peça comprada APENAS para quem comprou (RLS garante privacidade no SELECT)
  RETURN jsonb_build_object(
    'ok', TRUE,
    'drawnTile', v_drawn,
    'stockCount', jsonb_array_length(v_new_stock)
  );
END;
$$;

-- ── pass_turn ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pass_turn(p_round_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id   UUID := auth_player_id();
  v_round       rounds%ROWTYPE;
  v_match       matches%ROWTYPE;
  v_state       JSONB;
  v_hand        JSONB;
  v_opp_hand    JSONB;
  v_opp_id      UUID;
  v_new_passes  INT;
  v_move_num    INT;
  v_my_sum      INT := 0;
  v_opp_sum     INT := 0;
  v_total_sum   INT;
  v_winner_id   UUID;
  v_points      INT;
  v_i           INT;
  v_t           JSONB;
  v_left_end    INT;
  v_right_end   INT;
  v_can_play    BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_round FROM rounds WHERE id = p_round_id;
  IF v_round.status <> 'em_andamento' THEN RAISE EXCEPTION 'Rodada já encerrada'; END IF;
  IF v_round.current_turn_id <> v_caller_id THEN RAISE EXCEPTION 'Não é seu turno'; END IF;

  SELECT * INTO v_match FROM matches WHERE id = v_round.match_id;
  v_state := v_round.round_state;
  v_left_end := (v_state->>'leftEnd')::INT;
  v_right_end := (v_state->>'rightEnd')::INT;
  v_opp_id := CASE WHEN v_caller_id = v_match.player1_id THEN v_match.player2_id ELSE v_match.player1_id END;

  SELECT tiles INTO v_hand FROM hands WHERE round_id = p_round_id AND player_id = v_caller_id;

  -- Verificar se realmente não tem jogada e monte vazio
  IF jsonb_array_length(v_state->'stock') > 0 THEN
    RAISE EXCEPTION 'Monte não está vazio — compre do monte';
  END IF;
  FOR v_i IN 0..(jsonb_array_length(v_hand)-1) LOOP
    v_t := v_hand -> v_i;
    IF jsonb_array_length(v_state->'board') = 0 OR
       (v_t->>'left')::INT = v_left_end OR (v_t->>'right')::INT = v_left_end OR
       (v_t->>'left')::INT = v_right_end OR (v_t->>'right')::INT = v_right_end THEN
      v_can_play := TRUE; EXIT;
    END IF;
  END LOOP;
  IF v_can_play THEN RAISE EXCEPTION 'Você tem jogada disponível'; END IF;

  v_new_passes := v_round.consecutive_passes + 1;
  v_state := jsonb_set(v_state, '{consecutivePasses}', to_jsonb(v_new_passes));

  SELECT COALESCE(MAX(move_number), 0) + 1 INTO v_move_num FROM moves WHERE round_id = p_round_id;
  INSERT INTO moves (round_id, match_id, player_id, move_type, move_number)
  VALUES (p_round_id, v_round.match_id, v_caller_id, 'passa', v_move_num);

  -- Detectar travamento (ambos passaram)
  IF v_new_passes >= 2 THEN
    SELECT tiles INTO v_opp_hand FROM hands WHERE round_id = p_round_id AND player_id = v_opp_id;

    FOR v_i IN 0..(jsonb_array_length(v_hand)-1) LOOP
      v_t := v_hand -> v_i;
      v_my_sum := v_my_sum + (v_t->>'left')::INT + (v_t->>'right')::INT;
    END LOOP;
    FOR v_i IN 0..(jsonb_array_length(v_opp_hand)-1) LOOP
      v_t := v_opp_hand -> v_i;
      v_opp_sum := v_opp_sum + (v_t->>'left')::INT + (v_t->>'right')::INT;
    END LOOP;

    v_total_sum := v_my_sum + v_opp_sum;

    IF v_my_sum < v_opp_sum THEN
      v_winner_id := v_caller_id; v_points := v_total_sum;
    ELSIF v_opp_sum < v_my_sum THEN
      v_winner_id := v_opp_id; v_points := v_total_sum;
    ELSE
      v_winner_id := NULL; v_points := 0;
    END IF;

    UPDATE rounds SET
      status = 'encerrada_travada',
      round_state = v_state,
      current_turn_id = NULL,
      consecutive_passes = v_new_passes,
      points_earned = v_points,
      round_winner_id = v_winner_id,
      finished_at = now()
    WHERE id = p_round_id;

    IF v_winner_id IS NOT NULL THEN
      PERFORM update_match_score(v_round.match_id, v_winner_id, v_points);
    END IF;

    RETURN jsonb_build_object(
      'ok', TRUE, 'gameLocked', TRUE,
      'winnerId', v_winner_id,
      'pointsEarned', v_points,
      'mySum', v_my_sum, 'oppSum', v_opp_sum
    );
  END IF;

  -- Passa o turno
  UPDATE rounds SET
    round_state = v_state,
    current_turn_id = v_opp_id,
    consecutive_passes = v_new_passes
  WHERE id = p_round_id;

  UPDATE matches SET last_activity_at = now() WHERE id = v_round.match_id;

  RETURN jsonb_build_object('ok', TRUE, 'gameLocked', FALSE);
END;
$$;

-- ── update_match_score (helper) ───────────────────────────
CREATE OR REPLACE FUNCTION update_match_score(p_match_id UUID, p_winner_id UUID, p_points INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match     matches%ROWTYPE;
  v_new_s1    INT;
  v_new_s2    INT;
  v_match_won BOOLEAN := FALSE;
  v_match_winner UUID;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  v_new_s1 := v_match.score_player1 + CASE WHEN p_winner_id = v_match.player1_id THEN p_points ELSE 0 END;
  v_new_s2 := v_match.score_player2 + CASE WHEN p_winner_id = v_match.player2_id THEN p_points ELSE 0 END;

  IF v_new_s1 >= 100 OR v_new_s2 >= 100 THEN
    v_match_won := TRUE;
    v_match_winner := CASE WHEN v_new_s1 >= v_new_s2 THEN v_match.player1_id ELSE v_match.player2_id END;
  END IF;

  IF v_match_won THEN
    UPDATE matches SET
      score_player1 = v_new_s1,
      score_player2 = v_new_s2,
      status = 'finalizada',
      winner_id = v_match_winner,
      finished_at = now()
    WHERE id = p_match_id;

    PERFORM evaluate_achievements(p_match_id, v_match_winner);
  ELSE
    UPDATE matches SET
      score_player1 = v_new_s1,
      score_player2 = v_new_s2,
      last_activity_at = now()
    WHERE id = p_match_id;

    -- Iniciar próxima rodada automaticamente
    PERFORM start_round(p_match_id);
  END IF;
END;
$$;

-- ── abandon_match ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION abandon_match(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id UUID := auth_player_id();
  v_match     matches%ROWTYPE;
  v_opponent  UUID;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF v_caller_id NOT IN (v_match.player1_id, v_match.player2_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  v_opponent := CASE WHEN v_caller_id = v_match.player1_id THEN v_match.player2_id ELSE v_match.player1_id END;

  UPDATE matches SET
    status = 'finalizada',
    winner_id = v_opponent,
    finished_at = now()
  WHERE id = p_match_id AND status NOT IN ('finalizada', 'abandonada');
END;
$$;

-- ── evaluate_achievements ─────────────────────────────────
CREATE OR REPLACE FUNCTION evaluate_achievements(p_match_id UUID, p_winner_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rank rankings%ROWTYPE;
BEGIN
  SELECT * INTO v_rank FROM rankings WHERE player_id = p_winner_id;

  -- Primeira vitória
  IF v_rank.wins >= 1 THEN
    INSERT INTO player_achievements (player_id, achievement_code, match_id)
    VALUES (p_winner_id, 'primeira_vitoria', p_match_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Sequências
  IF v_rank.current_streak >= 3 THEN
    INSERT INTO player_achievements (player_id, achievement_code, match_id)
    VALUES (p_winner_id, 'tres_seguidas', p_match_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_rank.current_streak >= 5 THEN
    INSERT INTO player_achievements (player_id, achievement_code, match_id)
    VALUES (p_winner_id, 'cinco_seguidas', p_match_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Vitórias totais
  IF v_rank.wins >= 10 THEN
    INSERT INTO player_achievements (player_id, achievement_code, match_id)
    VALUES (p_winner_id, 'dez_vitorias', p_match_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_rank.wins >= 50 THEN
    INSERT INTO player_achievements (player_id, achievement_code, match_id)
    VALUES (p_winner_id, 'cinquenta_vitorias', p_match_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_rank.matches_played >= 100 THEN
    INSERT INTO player_achievements (player_id, achievement_code, match_id)
    VALUES (p_winner_id, 'cem_partidas', p_match_id) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
