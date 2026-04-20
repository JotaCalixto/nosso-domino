-- ============================================================
-- NOSSO DOMIMINO — Migration 005: Seed inicial
-- ATENÇÃO: Substituir as senhas pelo hash correto ou usar
-- o Supabase Dashboard para criar os usuários
-- ============================================================

-- Conquistas (catálogo)
INSERT INTO achievements (code, title, description, icon, sort_order, rule) VALUES
  ('primeira_vitoria',    'Primeira Vitória',    'Vença sua primeira partida completa',           '🏆', 10, '{"type":"wins_total","threshold":1}'),
  ('tres_seguidas',       'Três Seguidas',        'Vença 3 partidas consecutivas',                  '🔥', 20, '{"type":"streak","threshold":3}'),
  ('cinco_seguidas',      'Invicto por 5',        'Vença 5 partidas consecutivas',                  '⚡', 30, '{"type":"streak","threshold":5}'),
  ('dez_vitorias',        'Dominador',            'Alcance 10 vitórias no total',                   '👑', 40, '{"type":"wins_total","threshold":10}'),
  ('cinquenta_vitorias',  'Lenda do Dominó',      'Alcance 50 vitórias no total',                   '💎', 50, '{"type":"wins_total","threshold":50}'),
  ('batida_perfeita',     'Batida Perfeita',      'Vença uma rodada com mais de 50 pontos de uma vez', '✨', 60, '{"type":"round_points","threshold":50}'),
  ('campea_do_mes',       'Campeã do Mês',        'Vença uma temporada mensal',                     '📅', 70, '{"type":"season_win"}'),
  ('zerou_limpo',         'Zerou Limpo',          'Vença uma partida sem nenhum jogo travado',      '🎯', 80, '{"type":"clean_match"}'),
  ('virada_epica',        'Virada Épica',         'Vença estando perdendo por 40+ pontos',          '🚀', 90, '{"type":"comeback","deficit":40}'),
  ('cem_partidas',        'Centenário',           'Jogue 100 partidas juntos',                      '💯', 100, '{"type":"matches_played","threshold":100}')
ON CONFLICT (code) DO NOTHING;

-- Temporada atual
SELECT get_or_create_season(CURRENT_DATE);

-- ============================================================
-- USUÁRIOS: criar via Supabase Dashboard → Authentication → Users
-- Email: jota@nossodomimino.app / Senha: jota123
-- Email: iza@nossodomimino.app  / Senha: iza123
--
-- Depois rodar o SQL abaixo para criar os perfis:
-- (substituir os UUIDs pelos IDs gerados pelo Supabase Auth)
-- ============================================================

-- Exemplo (substituir UUIDs reais após criar no Dashboard):
-- INSERT INTO players (auth_user_id, slug, display_name, color_primary, avatar_path, tagline)
-- VALUES
--   ('UUID-DO-JOTA', 'jota', 'Jota', '#2563eb', '/images/Jota.png', 'Azul de coração'),
--   ('UUID-DA-IZA',  'iza',  'Iza',  '#f1f5f9', '/images/Iza.png',  'Branca e imbatível');
--
-- INSERT INTO rankings (player_id)
-- SELECT id FROM players WHERE slug IN ('jota', 'iza');
