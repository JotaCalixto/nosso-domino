import { create } from "zustand";
import type { Tile, BoardState } from "@/engine/types";

interface GameStore {
  matchId: string | null;
  roundId: string | null;
  myHand: Tile[];
  board: BoardState | null;
  myTurn: boolean;
  stockCount: number;
  setMatch: (matchId: string, roundId: string) => void;
  setHand: (tiles: Tile[]) => void;
  setBoard: (board: BoardState) => void;
  setMyTurn: (v: boolean) => void;
  setStockCount: (n: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  matchId: null,
  roundId: null,
  myHand: [],
  board: null,
  myTurn: false,
  stockCount: 14,
  setMatch: (matchId, roundId) => set({ matchId, roundId }),
  setHand: (tiles) => set({ myHand: tiles }),
  setBoard: (board) => set({ board }),
  setMyTurn: (v) => set({ myTurn: v }),
  setStockCount: (n) => set({ stockCount: n }),
  reset: () => set({ matchId: null, roundId: null, myHand: [], board: null, myTurn: false, stockCount: 14 }),
}));
