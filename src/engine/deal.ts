import type { Tile } from "./types";
import { allTiles, shuffle } from "./tiles";

export interface DealResult {
  hand1: Tile[];
  hand2: Tile[];
  stock: Tile[];
}

export function deal(): DealResult {
  const shuffled = shuffle(allTiles());
  return {
    hand1: shuffled.slice(0, 7),
    hand2: shuffled.slice(7, 14),
    stock: shuffled.slice(14),
  };
}

export function whoStartsFirst(hand1: Tile[], hand2: Tile[], isFirstRound: boolean): 0 | 1 {
  if (isFirstRound) {
    // Player with highest double goes first; if no doubles, highest pip sum
    const best1 = bestDouble(hand1);
    const best2 = bestDouble(hand2);
    if (best1 !== null && best2 !== null) return best1 >= best2 ? 0 : 1;
    if (best1 !== null) return 0;
    if (best2 !== null) return 1;
    return pipTotal(hand1) >= pipTotal(hand2) ? 0 : 1;
  }
  // Subsequent rounds: loser of previous round starts (handled externally)
  return 0;
}

function bestDouble(hand: Tile[]): number | null {
  let best: number | null = null;
  for (const [a, b] of hand) {
    if (a === b && (best === null || a > best)) best = a;
  }
  return best;
}

function pipTotal(hand: Tile[]): number {
  return hand.reduce((s, [a, b]) => s + a + b, 0);
}
