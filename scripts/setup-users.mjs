/**
 * Script de setup: cria usuários Jota e Iza no Supabase Auth
 * e os perfis correspondentes na tabela players.
 *
 * Rodar APÓS aplicar as migrations SQL no Dashboard.
 * Comando: node scripts/setup-users.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://prpjpgnctcfwlvjqfjeb.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycGpwZ25jdGNmd2x2anFmamViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyMzc2NCwiZXhwIjoyMDkyMTk5NzY0fQ.JFACIp7NmPihnQlBWdnEaz_3majLilQ4z9_8p6tj2YA";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createUser(email, password, slug) {
  console.log(`\nCriando usuário ${slug}...`);

  // Verifica se já existe
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    console.log(`  ✓ Usuário ${slug} já existe (${found.id})`);
    return found.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { slug },
  });

  if (error) {
    console.error(`  ✗ Erro ao criar ${slug}:`, error.message);
    return null;
  }

  console.log(`  ✓ Usuário ${slug} criado: ${data.user.id}`);
  return data.user.id;
}

async function createPlayerProfile(authUserId, slug, displayName, color, avatarPath, tagline) {
  console.log(`Criando perfil de ${displayName}...`);

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    console.log(`  ✓ Perfil de ${displayName} já existe`);
    return existing.id;
  }

  const { data, error } = await supabase.from("players").insert({
    auth_user_id: authUserId,
    slug,
    display_name: displayName,
    color_primary: color,
    avatar_path: avatarPath,
    tagline,
  }).select("id").single();

  if (error) {
    console.error(`  ✗ Erro ao criar perfil de ${displayName}:`, error.message);
    return null;
  }

  console.log(`  ✓ Perfil criado: ${data.id}`);
  return data.id;
}

async function createRanking(playerId, displayName) {
  const { data: existing } = await supabase
    .from("rankings")
    .select("id")
    .eq("player_id", playerId)
    .single();

  if (existing) {
    console.log(`  ✓ Ranking de ${displayName} já existe`);
    return;
  }

  const { error } = await supabase.from("rankings").insert({ player_id: playerId });
  if (error) console.error(`  ✗ Erro no ranking de ${displayName}:`, error.message);
  else console.log(`  ✓ Ranking de ${displayName} criado`);
}

async function seedAchievements() {
  console.log("\nSemeando conquistas...");
  const achievements = [
    { code: "primeira_vitoria", title: "Primeira Vitória", description: "Vença sua primeira partida completa", icon: "🏆", sort_order: 10, rule: { type: "wins_total", threshold: 1 } },
    { code: "tres_seguidas", title: "Três Seguidas", description: "Vença 3 partidas consecutivas", icon: "🔥", sort_order: 20, rule: { type: "streak", threshold: 3 } },
    { code: "cinco_seguidas", title: "Invicto por 5", description: "Vença 5 partidas consecutivas", icon: "⚡", sort_order: 30, rule: { type: "streak", threshold: 5 } },
    { code: "dez_vitorias", title: "Dominador", description: "Alcance 10 vitórias no total", icon: "👑", sort_order: 40, rule: { type: "wins_total", threshold: 10 } },
    { code: "cinquenta_vitorias", title: "Lenda do Dominó", description: "Alcance 50 vitórias no total", icon: "💎", sort_order: 50, rule: { type: "wins_total", threshold: 50 } },
    { code: "batida_perfeita", title: "Batida Perfeita", description: "Vença uma rodada com mais de 50 pontos de uma vez", icon: "✨", sort_order: 60, rule: { type: "round_points", threshold: 50 } },
    { code: "campea_do_mes", title: "Campeã do Mês", description: "Vença uma temporada mensal", icon: "📅", sort_order: 70, rule: { type: "season_win" } },
    { code: "zerou_limpo", title: "Zerou Limpo", description: "Vença uma partida sem nenhum jogo travado", icon: "🎯", sort_order: 80, rule: { type: "clean_match" } },
    { code: "virada_epica", title: "Virada Épica", description: "Vença estando perdendo por 40+ pontos", icon: "🚀", sort_order: 90, rule: { type: "comeback", deficit: 40 } },
    { code: "cem_partidas", title: "Centenário", description: "Jogue 100 partidas juntos", icon: "💯", sort_order: 100, rule: { type: "matches_played", threshold: 100 } },
  ];

  const { error } = await supabase.from("achievements").upsert(achievements, { onConflict: "code" });
  if (error) console.error("  ✗ Erro nas conquistas:", error.message);
  else console.log(`  ✓ ${achievements.length} conquistas semeadas`);
}

async function main() {
  console.log("=== NOSSO DOMIMINO — Setup ===\n");

  // Seed conquistas
  await seedAchievements();

  // Criar usuários
  const jotaId = await createUser("jota@nossodomimino.app", "jota123", "jota");
  const izaId = await createUser("iza@nossodomimino.app", "iza123", "iza");

  if (!jotaId || !izaId) {
    console.error("\n✗ Falha ao criar usuários. Verifique se as migrations SQL foram aplicadas.");
    process.exit(1);
  }

  // Criar perfis
  const jotaPlayerId = await createPlayerProfile(jotaId, "jota", "Jota", "#2563eb", "/images/Jota.png", "Azul de coração");
  const izaPlayerId = await createPlayerProfile(izaId, "iza", "Iza", "#f1f5f9", "/images/Iza.png", "Branca e imbatível");

  if (jotaPlayerId) await createRanking(jotaPlayerId, "Jota");
  if (izaPlayerId) await createRanking(izaPlayerId, "Iza");

  // Criar temporada atual
  console.log("\nCriando temporada atual...");
  const { error: seasonError } = await supabase.rpc("get_or_create_season");
  if (seasonError) console.error("  ✗", seasonError.message);
  else console.log("  ✓ Temporada criada");

  console.log("\n✅ Setup concluído! O jogo está pronto para uso.\n");
}

main().catch(console.error);
