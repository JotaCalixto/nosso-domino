"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deal, whoStartsFirst } from "@/engine/deal";
import { scoreBlocked, scoreWin, isMatchOver, MATCH_WIN_SCORE } from "@/engine/score";
import type { Tile, BoardSide } from "@/engine/types";
import { canPlay, hasPlayableTile, tileInHand, validSides } from "@/engine/validate";
import { applyDraw, applyPlay } from "@/engine/apply";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getAuthPlayer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: player } = await supabase
    .from("players")
    .select("id, slug")
    .eq("auth_user_id", user.id)
    .single();
  if (!player) throw new Error("Perfil não encontrado");
  return player;
}

function err(msg: string) {
  return { error: msg };
}

// ─── create match ─────────────────────────────────────────────────────────────

export async function createMatch() {
  const me = await getAuthPlayer();
  const admin = createAdminClient();

  // Only reuse matches that are truly running (em_andamento)
  // "aguardando" matches are stuck/incomplete — ignore them
  const { data: active } = await admin
    .from("matches")
    .select("id")
    .eq("status", "em_andamento")
    .limit(1)
    .maybeSingle();

  if (active) {
    revalidatePath("/");
    return { matchId: active.id };
  }

  // Delete any leftover stuck matches before creating a fresh one
  await admin.from("matches").delete().eq("status", "aguardando");

  // find opponent
  const { data: opponent } = await admin
    .from("players")
    .select("id")
    .neq("id", me.id)
    .single();
  if (!opponent) return err("Oponente não encontrado");

  const { data: match, error } = await admin
    .from("matches")
    .insert({
      player1_id: me.id,
      player2_id: opponent.id,
      status: "aguardando",
    })
    .select()
    .single();

  if (error) return err(error.message);

  // Auto-start immediately
  const roundResult = await startRound(match.id, me.id, opponent.id, 1, null);
  if ("error" in roundResult) {
    // Clean up the match if round failed
    await admin.from("matches").delete().eq("id", match.id);
    return err("Erro ao iniciar rodada: " + roundResult.error);
  }

  revalidatePath("/");
  return { matchId: match.id };
}

// ─── accept match ──────────────────────────────────────────────────────────────

export async function acceptMatch(matchId: string) {
  const me = await getAuthPlayer();
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match) return err("Partida não encontrada");
  if (match.status !== "aguardando") return err("Partida já iniciada");
  if (match.player2_id !== me.id) return err("Você não é o convidado");

  return startRound(matchId, match.player1_id, match.player2_id, 1, null);
}

// ─── start round ──────────────────────────────────────────────────────────────

export async function startRound(
  matchId: string,
  player1Id: string,
  player2Id: string,
  roundNumber: number,
  previousLoserId: string | null,
) {
  const admin = createAdminClient();
  const { hand1, hand2, stock } = deal();

  // who goes first
  let starterIndex: 0 | 1;
  if (roundNumber === 1 || previousLoserId === null) {
    starterIndex = whoStartsFirst(hand1, hand2, true);
  } else {
    starterIndex = previousLoserId === player1Id ? 0 : 1;
  }
  const starterId = starterIndex === 0 ? player1Id : player2Id;

  const boardState = { chain: [], leftEnd: -1, rightEnd: -1, stockCount: stock.length };

  const { data: round, error: rErr } = await admin
    .from("rounds")
    .insert({
      match_id: matchId,
      round_number: roundNumber,
      status: "em_andamento",
      starter_id: starterId,
      current_turn_id: starterId,
      round_state: { board: boardState, stock } as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (rErr) return err(rErr.message);

  // save hands
  await admin.from("hands").insert([
    { round_id: round.id, player_id: player1Id, tiles: hand1 as unknown as Record<string, unknown>[] },
    { round_id: round.id, player_id: player2Id, tiles: hand2 as unknown as Record<string, unknown>[] },
  ]);

  // update match
  await admin
    .from("matches")
    .update({ status: "em_andamento", current_round_id: round.id, last_activity_at: new Date().toISOString() })
    .eq("id", matchId);

  revalidatePath("/jogar/" + matchId);
  return { roundId: round.id };
}

// ─── play piece ───────────────────────────────────────────────────────────────

export async function playPiece(
  roundId: string,
  tile: Tile,
  side: BoardSide,
) {
  const me = await getAuthPlayer();
  const admin = createAdminClient();

  const { data: round, error: roundErr } = await admin
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) return err("Rodada não encontrada: " + (roundErr?.message ?? "null"));
  if (round.current_turn_id !== me.id) return err("Não é sua vez");
  if (round.status !== "em_andamento") return err("Rodada encerrada");

  const { data: matchRow, error: matchErr } = await admin
    .from("matches")
    .select("id, player1_id, player2_id, score_player1, score_player2")
    .eq("id", round.match_id)
    .single();

  if (matchErr || !matchRow) return err("Partida não encontrada: " + (matchErr?.message ?? "null"));

  const state = round.round_state as { board: ReturnType<typeof applyPlay>["board"] & { stockCount: number }; stock: Tile[] };
  const board = state.board;

  const { data: myHand } = await admin
    .from("hands")
    .select("tiles")
    .eq("round_id", roundId)
    .eq("player_id", me.id)
    .single();

  const hand = myHand!.tiles as unknown as Tile[];

  if (!tileInHand(tile, hand)) return err("Peça não está na sua mão");
  const sides = validSides(tile, board);
  if (!sides.includes(side) && board.chain.length > 0) return err("Jogada inválida");

  const { board: newBoard, hand: newHand } = applyPlay(tile, side, board, hand);

  const match = matchRow;
  const opponentId = me.id === match.player1_id ? match.player2_id : match.player1_id;

  const { data: moveCountResult } = await admin
    .from("moves")
    .select("move_number")
    .eq("round_id", roundId)
    .order("move_number", { ascending: false })
    .limit(1)
    .single();

  const moveNumber = (moveCountResult?.move_number ?? 0) + 1;

  await admin.from("moves").insert({
    round_id: roundId,
    match_id: match.id,
    player_id: me.id,
    move_type: "jogada",
    move_number: moveNumber,
    tile_left: tile[0],
    tile_right: tile[1],
    board_side: side,
  });

  await admin.from("hands").update({ tiles: newHand as unknown as Record<string, unknown>[], updated_at: new Date().toISOString() })
    .eq("round_id", roundId).eq("player_id", me.id);

  // Check win
  if (newHand.length === 0) {
    const { data: oppHand } = await admin.from("hands").select("tiles").eq("round_id", roundId).eq("player_id", opponentId).single();
    const oppTiles = oppHand!.tiles as unknown as Tile[];
    const points = scoreWin(newHand, oppTiles);
    return finalizeRound(round, match, me.id, points, "encerrada_batida", opponentId);
  }

  await admin.from("rounds").update({
    current_turn_id: opponentId,
    consecutive_passes: 0,
    round_state: { board: newBoard, stock: state.stock } as unknown as Record<string, unknown>,
  }).eq("id", roundId);

  revalidatePath("/jogar/" + match.id);
  return { ok: true };
}

// ─── draw piece ───────────────────────────────────────────────────────────────

export async function drawPiece(roundId: string) {
  const me = await getAuthPlayer();
  const admin = createAdminClient();

  const { data: round, error: roundErr } = await admin
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) return err("Rodada não encontrada");
  if (round.current_turn_id !== me.id) return err("Não é sua vez");

  const { data: matchRow } = await admin
    .from("matches")
    .select("id, player1_id, player2_id, score_player1, score_player2")
    .eq("id", round.match_id)
    .single();

  if (!matchRow) return err("Partida não encontrada");

  const state = round.round_state as { board: { chain: Tile[]; leftEnd: number; rightEnd: number; stockCount: number }; stock: Tile[] };

  const { data: myHand } = await admin.from("hands").select("tiles").eq("round_id", roundId).eq("player_id", me.id).single();
  const hand = myHand!.tiles as unknown as Tile[];

  if (hasPlayableTile(hand, state.board)) return err("Você tem peças jogáveis — não pode comprar");
  if (state.stock.length === 0) return err("Estoque vazio");

  const { drawn, remaining, newBoard } = applyDraw(state.stock, state.board);
  const newHand = [...hand, drawn];

  const match = matchRow;

  const { data: moveCountResult } = await admin
    .from("moves").select("move_number").eq("round_id", roundId)
    .order("move_number", { ascending: false }).limit(1).single();
  const moveNumber = (moveCountResult?.move_number ?? 0) + 1;

  await admin.from("moves").insert({
    round_id: roundId,
    match_id: match.id,
    player_id: me.id,
    move_type: "compra",
    move_number: moveNumber,
    drawn_tile_left: drawn[0],
    drawn_tile_right: drawn[1],
  });

  await admin.from("hands").update({ tiles: newHand as unknown as Record<string, unknown>[], updated_at: new Date().toISOString() })
    .eq("round_id", roundId).eq("player_id", me.id);

  await admin.from("rounds").update({
    round_state: { board: newBoard, stock: remaining } as unknown as Record<string, unknown>,
  }).eq("id", roundId);

  revalidatePath("/jogar/" + match.id);
  return { drawn, ok: true };
}

// ─── pass turn ────────────────────────────────────────────────────────────────

export async function passTurn(roundId: string) {
  const me = await getAuthPlayer();
  const admin = createAdminClient();

  const { data: round, error: roundErr } = await admin
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) return err("Rodada não encontrada");
  if (round.current_turn_id !== me.id) return err("Não é sua vez");

  const { data: matchRow } = await admin
    .from("matches")
    .select("id, player1_id, player2_id, score_player1, score_player2")
    .eq("id", round.match_id)
    .single();

  if (!matchRow) return err("Partida não encontrada");

  const state = round.round_state as { board: { chain: Tile[]; leftEnd: number; rightEnd: number; stockCount: number }; stock: Tile[] };
  const { data: myHand } = await admin.from("hands").select("tiles").eq("round_id", roundId).eq("player_id", me.id).single();
  const hand = myHand!.tiles as unknown as Tile[];

  if (state.stock.length > 0 || hasPlayableTile(hand, state.board)) return err("Você não pode passar ainda");

  const match = matchRow;
  const opponentId = me.id === match.player1_id ? match.player2_id : match.player1_id;

  const { data: moveCountResult } = await admin
    .from("moves").select("move_number").eq("round_id", roundId)
    .order("move_number", { ascending: false }).limit(1).single();
  const moveNumber = (moveCountResult?.move_number ?? 0) + 1;

  await admin.from("moves").insert({
    round_id: roundId,
    match_id: match.id,
    player_id: me.id,
    move_type: "passa",
    move_number: moveNumber,
  });

  const newPasses = (round.consecutive_passes ?? 0) + 1;

  if (newPasses >= 2) {
    // blocked game
    const { data: oppHand } = await admin.from("hands").select("tiles").eq("round_id", roundId).eq("player_id", opponentId).single();
    const oppTiles = oppHand!.tiles as unknown as Tile[];
    const result = scoreBlocked(me.id, hand, opponentId, oppTiles);
    return finalizeRound(round, match, result.winnerId, result.points, "encerrada_travada", result.winnerId === me.id ? opponentId : me.id);
  }

  await admin.from("rounds").update({ current_turn_id: opponentId, consecutive_passes: newPasses }).eq("id", roundId);

  revalidatePath("/jogar/" + match.id);
  return { ok: true };
}

// ─── abandon match ────────────────────────────────────────────────────────────

export async function abandonMatch(matchId: string) {
  const me = await getAuthPlayer();
  const admin = createAdminClient();

  const { data: match } = await admin.from("matches").select("*").eq("id", matchId).single();
  if (!match) return err("Partida não encontrada");

  const opponentId = me.id === match.player1_id ? match.player2_id : match.player1_id;

  await admin.from("matches").update({
    status: "abandonada",
    winner_id: opponentId,
    finished_at: new Date().toISOString(),
  }).eq("id", matchId);

  await updateRankings(opponentId, me.id);
  revalidatePath("/");
  return { ok: true };
}

// ─── internal helpers ─────────────────────────────────────────────────────────

async function finalizeRound(
  round: { id: string; round_number: number; match_id: string },
  match: { id: string; player1_id: string; player2_id: string; score_player1: number; score_player2: number },
  winnerId: string,
  points: number,
  status: "encerrada_batida" | "encerrada_travada",
  loserId: string,
) {
  const admin = createAdminClient();

  await admin.from("rounds").update({
    status,
    round_winner_id: winnerId,
    points_earned: points,
    finished_at: new Date().toISOString(),
  }).eq("id", round.id);

  const isP1Winner = winnerId === match.player1_id;
  const newScore1 = match.score_player1 + (isP1Winner ? points : 0);
  const newScore2 = match.score_player2 + (isP1Winner ? 0 : points);

  if (isMatchOver(newScore1, newScore2)) {
    const matchWinnerId = newScore1 >= MATCH_WIN_SCORE ? match.player1_id : match.player2_id;
    const matchLoserId = matchWinnerId === match.player1_id ? match.player2_id : match.player1_id;

    await admin.from("matches").update({
      score_player1: newScore1,
      score_player2: newScore2,
      status: "finalizada",
      winner_id: matchWinnerId,
      finished_at: new Date().toISOString(),
    }).eq("id", match.id);

    await updateRankings(matchWinnerId, matchLoserId);
    revalidatePath("/jogar/" + match.id);
    return { roundOver: true, matchOver: true, winnerId, matchWinnerId };
  }

  // start next round
  await admin.from("matches").update({
    score_player1: newScore1,
    score_player2: newScore2,
    last_activity_at: new Date().toISOString(),
  }).eq("id", match.id);

  const nextRound = await startRound(
    match.id, match.player1_id, match.player2_id,
    round.round_number + 1, loserId,
  );

  revalidatePath("/jogar/" + match.id);
  return { roundOver: true, matchOver: false, winnerId, nextRoundId: (nextRound as { roundId: string }).roundId };
}

async function updateRankings(winnerId: string, loserId: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: winnerRank } = await admin.from("rankings").select("*").eq("player_id", winnerId).single();
  const { data: loserRank } = await admin.from("rankings").select("*").eq("player_id", loserId).single();

  if (winnerRank) {
    const streak = (winnerRank.current_streak ?? 0) + 1;
    await admin.from("rankings").update({
      wins: (winnerRank.wins ?? 0) + 1,
      matches_played: (winnerRank.matches_played ?? 0) + 1,
      current_streak: streak,
      best_streak: Math.max(streak, winnerRank.best_streak ?? 0),
      updated_at: now,
    }).eq("player_id", winnerId);
  }

  if (loserRank) {
    await admin.from("rankings").update({
      losses: (loserRank.losses ?? 0) + 1,
      matches_played: (loserRank.matches_played ?? 0) + 1,
      current_streak: 0,
      updated_at: now,
    }).eq("player_id", loserId);
  }
}
