import type { Tile } from "./types";
import { pipCount } from "./tiles";

export interface RoundResult {
  winnerId: string;
  points: number;
  reason: "batida" | "travada";
}

export function scoreWin(winnerHand: Tile[], loserHand: Tile[]): number {
  // winner has empty hand — gets sum of loser's pips
  return pipCount(loserHand);
}

export function scoreBlocked(
  player1Id: string,
  hand1: Tile[],
  player2Id: string,
  hand2: Tile[],
): RoundResult {
  const p1 = pipCount(hand1);
  const p2 = pipCount(hand2);
  if (p1 < p2) return { winnerId: player1Id, points: p2 - p1, reason: "travada" };
  if (p2 < p1) return { winnerId: player2Id, points: p1 - p2, reason: "travada" };
  // tie — no points
  return { winnerId: player1Id, points: 0, reason: "travada" };
}

export const MATCH_WIN_SCORE = 100;

export function isMatchOver(score1: number, score2: number): boolean {
  return score1 >= MATCH_WIN_SCORE || score2 >= MATCH_WIN_SCORE;
}
