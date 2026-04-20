import type { Tile, BoardState, BoardSide } from "./types";
import { tilesEqual } from "./tiles";

export function applyPlay(
  tile: Tile,
  side: BoardSide,
  board: BoardState,
  hand: Tile[],
): { board: BoardState; hand: Tile[] } {
  const newHand = hand.filter((t) => !tilesEqual(t, tile));
  let [a, b] = tile;

  if (board.chain.length === 0) {
    return {
      board: { chain: [tile], leftEnd: a, rightEnd: b, stockCount: board.stockCount },
      hand: newHand,
    };
  }

  let newChain: Tile[];
  let leftEnd: number;
  let rightEnd: number;

  if (side === "esquerda") {
    // orient tile so b matches leftEnd
    if (b !== board.leftEnd) [a, b] = [b, a];
    newChain = [[a, b], ...board.chain];
    leftEnd = a;
    rightEnd = board.rightEnd;
  } else {
    // orient tile so a matches rightEnd
    if (a !== board.rightEnd) [a, b] = [b, a];
    newChain = [...board.chain, [a, b]];
    leftEnd = board.leftEnd;
    rightEnd = b;
  }

  return {
    board: { chain: newChain as Tile[], leftEnd, rightEnd, stockCount: board.stockCount },
    hand: newHand,
  };
}

export function applyDraw(
  stock: Tile[],
  board: BoardState,
): { drawn: Tile; remaining: Tile[]; newBoard: BoardState } {
  const [drawn, ...remaining] = stock;
  return {
    drawn,
    remaining,
    newBoard: { ...board, stockCount: remaining.length },
  };
}
