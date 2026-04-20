export type Tile = [number, number]; // [left, right] pips

export type BoardSide = "esquerda" | "direita";
export type MoveType = "jogada" | "compra" | "passa";
export type RoundStatus = "em_andamento" | "encerrada_batida" | "encerrada_travada";

export interface BoardState {
  chain: Tile[];      // ordered sequence on the table
  leftEnd: number;    // open end on the left
  rightEnd: number;   // open end on the right
  stockCount: number;
}

export interface MoveResult {
  board: BoardState;
  hand: Tile[];
  drawnTile?: Tile;
  roundOver: boolean;
  roundStatus?: RoundStatus;
  roundWinnerId?: string; // player id
  pointsEarned?: number;
  consecutivePasses: number;
}
