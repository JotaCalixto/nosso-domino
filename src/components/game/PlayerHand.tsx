"use client";

import { useState } from "react";
import { DominoTile } from "./DominoTile";
import type { Tile, BoardSide } from "@/engine/types";
import { canPlay, validSides } from "@/engine/validate";
import type { BoardState } from "@/engine/types";

interface PlayerHandProps {
  hand: Tile[];
  board: BoardState;
  myTurn: boolean;
  onPlay: (tile: Tile, side: BoardSide) => void;
}

export function PlayerHand({ hand, board, myTurn, onPlay }: PlayerHandProps) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleTileClick(idx: number) {
    if (!myTurn) return;
    const tile = hand[idx];
    if (!canPlay(tile, board)) return;

    if (selected === idx) {
      setSelected(null);
      return;
    }
    setSelected(idx);

    const sides = validSides(tile, board);
    if (sides.length === 1) {
      onPlay(tile, sides[0]);
      setSelected(null);
    }
    // if 2 sides: show side picker — handled via SidePicker below
  }

  const selectedTile = selected !== null ? hand[selected] : null;
  const sides = selectedTile ? validSides(selectedTile, board) : [];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Side picker */}
      {selectedTile && sides.length === 2 && (
        <div className="flex gap-3 animate-fade-in">
          <button
            onClick={() => { onPlay(selectedTile, "esquerda"); setSelected(null); }}
            className="btn-secondary text-xs px-3 py-1.5 rounded-lg"
          >
            ← Esquerda
          </button>
          <button
            onClick={() => { onPlay(selectedTile, "direita"); setSelected(null); }}
            className="btn-secondary text-xs px-3 py-1.5 rounded-lg"
          >
            Direita →
          </button>
        </div>
      )}

      {/* Hand tiles */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-2 snap-x">
        {hand.map((tile, i) => {
          const playable = myTurn && canPlay(tile, board);
          return (
            <DominoTile
              key={`${tile[0]}-${tile[1]}-${i}`}
              tile={tile}
              orientation="vertical"
              size="lg"
              selected={selected === i}
              playable={playable}
              onClick={() => handleTileClick(i)}
              className="snap-center"
            />
          );
        })}
      </div>

      {!myTurn && (
        <p className="text-text-muted text-xs">Aguardando o adversário…</p>
      )}
    </div>
  );
}
