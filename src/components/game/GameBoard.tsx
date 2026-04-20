"use client";

import { DominoTile } from "./DominoTile";
import type { Tile } from "@/engine/types";

interface GameBoardProps {
  chain: Tile[];
}

const TILES_PER_ROW = 5;   // horizontal tiles per segment (before corner)
const SEGMENT = TILES_PER_ROW + 1; // includes the corner tile

// sm tile: horizontal → w=56, h=28 | vertical → w=28, h=56
const ROW_H  = 28;  // height of each grid row
const ROW_GAP = 8;  // visual gap between rows
const CORNER_H = ROW_H * 2 + ROW_GAP; // corner spans 2 rows + gap = 64px

// Returns grid position and orientation for each tile in the chain
function getTileProps(idx: number): {
  gridColumn: number;
  gridRow: string;
  orientation: "horizontal" | "vertical";
  isCorner: boolean;
  isRTL: boolean;
} {
  const seg = Math.floor(idx / SEGMENT);
  const pos = idx % SEGMENT;
  const isCorner = pos === TILES_PER_ROW;
  const isLTR = seg % 2 === 0;
  const row = seg + 1; // 1-indexed

  if (isCorner) {
    return {
      gridColumn: isLTR ? TILES_PER_ROW + 2 : 1,
      gridRow: `${row} / ${row + 2}`,
      orientation: "vertical",
      isCorner: true,
      isRTL: false,
    };
  }

  // Regular horizontal tile
  // LTR: cols 2..TILES_PER_ROW+1 (left to right)
  // RTL: cols TILES_PER_ROW+1..2 (right to left, so pos=0 → rightmost)
  const col = isLTR ? pos + 2 : TILES_PER_ROW + 1 - pos;
  return {
    gridColumn: col,
    gridRow: `${row}`,
    orientation: "horizontal",
    isCorner: false,
    isRTL: !isLTR,
  };
}

export function GameBoard({ chain }: GameBoardProps) {
  if (chain.length === 0) {
    return (
      <div
        className="felt-table flex items-center justify-center rounded-2xl"
        style={{ minHeight: 100 }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: 14, opacity: 0.6 }}>
          Jogue a primeira peça
        </p>
      </div>
    );
  }

  // Short chain (≤ TILES_PER_ROW): simple centered row, no snake
  if (chain.length <= TILES_PER_ROW) {
    return (
      <div
        className="felt-table rounded-2xl"
        style={{ minHeight: 72, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {chain.map((tile, i) => (
            <DominoTile key={i} tile={tile} orientation="horizontal" size="sm" />
          ))}
        </div>
      </div>
    );
  }

  // Snake grid layout
  const numRows = Math.ceil(chain.length / SEGMENT);

  return (
    <div
      className="felt-table rounded-2xl"
      style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          display: "grid",
          // col 1: left-corner slot (28px), cols 2-6: tiles (56px), col 7: right-corner slot (28px)
          gridTemplateColumns: `28px repeat(${TILES_PER_ROW}, 56px) 28px`,
          gridTemplateRows: `repeat(${numRows}, ${ROW_H}px)`,
          rowGap: ROW_GAP,
          columnGap: 2,
        }}
      >
        {chain.map((tile, i) => {
          const { gridColumn, gridRow, orientation, isCorner, isRTL } = getTileProps(i);

          // Flip tile values in RTL rows so pips align correctly at touching edges
          const displayTile: Tile = isRTL ? [tile[1], tile[0]] : tile;

          return (
            <div
              key={i}
              style={{
                gridColumn,
                gridRow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DominoTile
                tile={displayTile}
                orientation={orientation}
                size="sm"
                overrideH={isCorner ? CORNER_H : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
