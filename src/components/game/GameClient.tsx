"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { PlayerHand } from "./PlayerHand";
import { GameBoard } from "./GameBoard";
import { RoundResultModal, MatchVictoryModal } from "./RoundResultModal";
import { playPiece, drawPiece, passTurn, acceptMatch, abandonMatch } from "@/actions/match";
import { hasPlayableTile } from "@/engine/validate";
import type { Tile, BoardState, BoardSide } from "@/engine/types";
import { getPlayerConfig } from "@/lib/players";

interface Player { id: string; slug: string; display_name: string; }
interface MatchData {
  id: string;
  status: string;
  player1_id: string;
  player2_id: string;
  score_player1: number;
  score_player2: number;
  winner_id: string | null;
  current_round_id: string | null;
}

interface RoundData {
  id: string;
  round_number: number;
  status: string;
  current_turn_id: string | null;
  consecutive_passes: number;
  round_state: { board: BoardState & { stockCount: number }; stock: Tile[] } | null;
  round_winner_id: string | null;
  points_earned: number | null;
}

interface Props {
  match: MatchData;
  round: RoundData | null;
  me: Player;
  opponent: Player;
  initialHand: Tile[];
}

type RoundResult = { type: "round"; winnerId: string; points: number; reason: "batida" | "travada" } | { type: "match"; winnerId: string; score1: number; score2: number };

export function GameClient({ match: initialMatch, round: initialRound, me, opponent, initialHand }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [match, setMatch] = useState(initialMatch);
  const [round, setRound] = useState(initialRound);
  const [hand, setHand] = useState<Tile[]>(initialHand);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  const supabase = createClient();

  const board: BoardState = round?.round_state?.board ?? { chain: [], leftEnd: -1, rightEnd: -1, stockCount: 14 };
  const myTurn = round?.current_turn_id === me.id && round?.status === "em_andamento" && match.status === "em_andamento";
  const stockCount = round?.round_state?.board?.stockCount ?? round?.round_state?.stock?.length ?? 14;
  const canDraw = myTurn && !hasPlayableTile(hand, board) && stockCount > 0;
  const canPass = myTurn && !hasPlayableTile(hand, board) && stockCount === 0;

  // Realtime subscription
  useEffect(() => {
    const sub = supabase.channel(`match-${match.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${match.id}` }, async (payload) => {
        const updated = payload.new as Partial<MatchData>;
        setMatch((prev) => ({ ...prev, ...updated }));
        // New round started — reload round + hand
        if (updated.current_round_id) {
          await refreshState(updated.current_round_id);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `match_id=eq.${match.id}` }, (payload) => {
        const updated = payload.new as RoundData;
        setRound((prev) => {
          if (!prev || updated.id !== prev.id) return updated;
          return { ...prev, ...updated };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "hands", filter: `round_id=eq.${round?.id}` }, async () => {
        if (!round) return;
        const { data } = await supabase.from("hands").select("tiles").eq("round_id", round.id).eq("player_id", me.id).single();
        if (data) setHand(data.tiles as unknown as Tile[]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [match.id, round?.id]);

  // Watch for round completion
  useEffect(() => {
    if (!round || round.status === "em_andamento") return;
    if (result) return;
    const isMatchOver = match.status === "finalizada";
    if (isMatchOver) {
      setResult({
        type: "match",
        winnerId: match.winner_id!,
        score1: match.score_player1,
        score2: match.score_player2,
      });
    } else {
      setResult({
        type: "round",
        winnerId: round.round_winner_id!,
        points: round.points_earned ?? 0,
        reason: round.status === "encerrada_batida" ? "batida" : "travada",
      });
    }
  }, [round?.status, match.status]);

  async function refreshState(roundId: string) {
    const [{ data: roundData, error: e1 }, { data: handData, error: e2 }, { data: matchData, error: e3 }] = await Promise.all([
      supabase.from("rounds").select("*").eq("id", roundId).single(),
      supabase.from("hands").select("tiles").eq("round_id", roundId).eq("player_id", me.id).single(),
      supabase.from("matches").select("*").eq("id", match.id).single(),
    ]);
    if (e1 || e2 || e3) {
      setDebugMsg(`refreshState erros: round=${e1?.message} hand=${e2?.message} match=${e3?.message}`);
      return;
    }
    if (roundData) setRound(roundData as RoundData);
    if (handData) setHand(handData.tiles as unknown as Tile[]);
    if (matchData) setMatch(matchData as MatchData);
  }

  function handlePlay(tile: Tile, side: BoardSide) {
    if (!round) return;
    const roundId = round.id;
    setDebugMsg("roundId=" + roundId);
    startTransition(async () => {
      try {
        const res = await playPiece(roundId, tile, side);
        if ("error" in res) {
          setDebugMsg("roundId=" + roundId + " | Erro: " + res.error);
          return;
        }
        await refreshState(roundId);
        setDebugMsg(null);
      } catch (e) {
        setDebugMsg("Exceção: " + String(e));
      }
    });
  }

  function handleDraw() {
    if (!round) return;
    const roundId = round.id;
    startTransition(async () => {
      const res = await drawPiece(roundId);
      if (!("error" in res)) await refreshState(roundId);
    });
  }

  function handlePass() {
    if (!round) return;
    const roundId = round.id;
    startTransition(async () => {
      const res = await passTurn(roundId);
      if (!("error" in res)) await refreshState(roundId);
    });
  }

  function handleAccept() {
    startTransition(async () => {
      const res = await acceptMatch(match.id);
      if (!("error" in res)) {
        const { data: matchData } = await supabase.from("matches").select("*").eq("id", match.id).single();
        if (matchData) {
          setMatch(matchData as MatchData);
          if (matchData.current_round_id) await refreshState(matchData.current_round_id);
        }
      }
    });
  }

  function handleAbandon() {
    if (!confirm("Tem certeza que quer abandonar a partida?")) return;
    startTransition(async () => {
      await abandonMatch(match.id);
      router.push("/");
    });
  }

  const myScore   = me.id === match.player1_id ? match.score_player1 : match.score_player2;
  const oppScore  = me.id === match.player1_id ? match.score_player2 : match.score_player1;
  const myConfig  = getPlayerConfig(me.slug);
  const oppConfig = getPlayerConfig(opponent.slug);

  return (
    <div className="flex flex-col max-w-md mx-auto px-3 pt-4 gap-4" style={{ minHeight: "calc(100dvh - 80px)", paddingBottom: "24px" }}>

      {/* Error feedback */}
      {debugMsg && (
        <div onClick={() => setDebugMsg(null)} style={{ background: "#ef4444", color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", wordBreak: "break-all" }}>
          🔴 {debugMsg}
        </div>
      )}

      {/* Score bar */}
      <div className="flex items-center justify-between px-2">
        <PlayerBadge player={me} config={myConfig} score={myScore} isMe />
        <div className="flex flex-col items-center gap-1">
          <span className="text-text-muted text-[10px] uppercase tracking-widest">Rodada {round?.round_number ?? 1}</span>
          {pending && <span className="text-text-muted text-[10px]">…</span>}
          {match.status === "em_andamento" && (
            <button
              onClick={handleAbandon}
              title="Abandonar partida"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6, color: "var(--text-muted)", fontSize: 16, lineHeight: 1, opacity: 0.5 }}
            >
              🚪
            </button>
          )}
        </div>
        <PlayerBadge player={opponent} config={oppConfig} score={oppScore} isMe={false} />
      </div>

      {/* Turn indicator */}
      {match.status === "em_andamento" && (
        <div
          className="text-center text-sm font-medium py-2 rounded-xl transition-colors"
          style={myTurn
            ? { backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa" }
            : { backgroundColor: "var(--bg-surface)", color: "var(--text-muted)" }
          }
        >
          {myTurn ? "✦ Sua vez de jogar!" : `Vez de ${opponent.display_name}…`}
        </div>
      )}

      {/* Awaiting accept */}
      {match.status === "aguardando" && (
        <div className="card-premium rounded-2xl p-5 text-center">
          {me.id === match.player2_id ? (
            <>
              <p className="text-text-secondary mb-4">{opponent.display_name} te desafiou para uma partida!</p>
              <button onClick={handleAccept} disabled={pending} className="btn-primary w-full py-3 rounded-xl font-semibold">
                Aceitar desafio ✦
              </button>
            </>
          ) : (
            <p className="text-text-muted">Aguardando {opponent.display_name} aceitar o desafio…</p>
          )}
        </div>
      )}

      {/* Board + stock — ocupa o espaço restante e centraliza */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        {round && <GameBoard chain={board.chain} />}
        {round && match.status === "em_andamento" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 999, backgroundColor: "var(--bg-surface)" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Estoque:</span>
            <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}>{stockCount}</span>
          </div>
        )}
      </div>

      {/* Player hand + actions */}
      {match.status === "em_andamento" && (
        <div className="mt-auto flex flex-col gap-3">
          <PlayerHand
            hand={hand}
            board={board}
            myTurn={myTurn}
            onPlay={handlePlay}
          />

          {myTurn && (
            <div className="flex gap-3 justify-center">
              {canDraw && (
                <button
                  onClick={handleDraw}
                  disabled={pending}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    padding: "10px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 3px 0 #047857, 0 4px 12px rgba(16,185,129,0.4)",
                    letterSpacing: "0.02em",
                  }}
                >
                  + Comprar
                </button>
              )}
              {canPass && (
                <button
                  onClick={handlePass}
                  disabled={pending}
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    padding: "10px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 3px 0 #c2410c, 0 4px 12px rgba(249,115,22,0.4)",
                    letterSpacing: "0.02em",
                  }}
                >
                  ↷ Passar
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* Modals */}
      {result?.type === "round" && (
        <RoundResultModal
          winnerId={result.winnerId}
          meId={me.id}
          points={result.points}
          reason={result.reason}
          onContinue={() => setResult(null)}
        />
      )}

      {result?.type === "match" && (
        <MatchVictoryModal
          winnerId={result.winnerId}
          meId={me.id}
          score1={result.score1}
          score2={result.score2}
          onHome={() => router.push("/")}
        />
      )}
    </div>
  );
}

function PlayerBadge({ player, config, score, isMe }: {
  player: Player; config: ReturnType<typeof getPlayerConfig>; score: number; isMe: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${isMe ? "" : "flex-row-reverse"}`}>
      <div className={`w-10 h-10 rounded-full border-2 overflow-hidden flex-shrink-0 ${
        player.slug === "jota" ? "border-jota-500" : "border-iza-400"
      }`}>
        <Image src={config.avatarPath} alt={player.display_name} width={40} height={40} className="object-cover" />
      </div>
      <div className={`flex flex-col ${isMe ? "" : "items-end"}`}>
        <span className="text-text-primary text-sm font-semibold">{player.display_name}</span>
        <span className="text-gold-400 text-xs font-bold">{score} pts</span>
      </div>
    </div>
  );
}
