import type { Tile, BoardState, BoardSide } from "./types";
import { tilesEqual } from "./tiles";

export function canPlay(tile: Tile, board: BoardState): boolean {
  if (board.chain.length === 0) return true;
  const [a, b] = tile;
  return a === board.leftEnd || b === board.leftEnd ||
         a === board.rightEnd || b === board.rightEnd;
}

export function validSides(tile: Tile, board: BoardState): BoardSide[] {
  if (board.chain.length === 0) return ["esquerda"];
  const [a, b] = tile;
  const sides: BoardSide[] = [];
  if (a === board.leftEnd || b === board.leftEnd) sides.push("esquerda");
  if (a === board.rightEnd || b === board.rightEnd) sides.push("direita");
  return sides;
}

export function hasPlayableTile(hand: Tile[], board: BoardState): boolean {
  return hand.some((t) => canPlay(t, board));
}

export function tileInHand(tile: Tile, hand: Tile[]): boolean {
  return hand.some((t) => tilesEqual(t, tile));
}
