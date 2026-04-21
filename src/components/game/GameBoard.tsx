"use client";

import { DominoTile } from "./DominoTile";
import type { Tile } from "@/engine/types";

interface GameBoardProps {
  chain: Tile[];
}

const TILES_PER_ROW = 5;
const SEGMENT = TILES_PER_ROW + 1; // 5 horizontal + 1 corner

// sm sizes: horizontal tile = 56×28, vertical tile = 28×56
const ROW_H   = 28;
const ROW_GAP = 40; // gap between rows — large enough for crosswise double overflow
// Corner tile natural height = 56px (no stretching)
// Corner cell height = ROW_H + ROW_GAP + ROW_H = 28+40+28 = 96px → tile centered with 20px padding

function getTileProps(idx: number) {
  const seg = Math.floor(idx / SEGMENT);
  const pos = idx % SEGMENT;
  const isCorner = pos === TILES_PER_ROW;
  const isLTR = seg % 2 === 0;
  const row = seg + 1; // 1-indexed grid row

  if (isCorner) {
    return {
      gridColumn: isLTR ? TILES_PER_ROW + 2 : 1,
      gridRow: `${row} / ${row + 2}`,
      orientation: "vertical" as const,
      isCorner: true,
    };
  }

  const col = isLTR ? pos + 2 : TILES_PER_ROW + 1 - pos;
  return {
    gridColumn: col,
    gridRow: `${row}`,
    orientation: "horizontal" as const,
    isCorner: false,
  };
}

export function GameBoard({ chain }: GameBoardProps) {
  if (chain.length === 0) {
    return (
      <div className="felt-table flex items-center justify-center rounded-2xl" style={{ minHeight: 100 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14, opacity: 0.6 }}>Jogue a primeira peça</p>
      </div>
    );
  }

  // Short chain: simple centered row
  if (chain.length <= TILES_PER_ROW) {
    return (
      <div className="felt-table rounded-2xl" style={{ minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {chain.map((tile, i) => {
            const isDouble = tile[0] === tile[1];
            return <DominoTile key={i} tile={tile} orientation={isDouble ? "vertical" : "horizontal"} size="sm" />;
          })}
        </div>
      </div>
    );
  }

  const numRows = Math.ceil(chain.length / SEGMENT);

  return (
    <div className="felt-table rounded-2xl" style={{ padding: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "grid",
          // col 1: left-corner (28px) | cols 2-6: tiles (56px each) | col 7: right-corner (28px)
          gridTemplateColumns: `28px repeat(${TILES_PER_ROW}, 56px) 28px`,
          gridTemplateRows: `repeat(${numRows}, ${ROW_H}px)`,
          rowGap: ROW_GAP,
          columnGap: 2,
          overflow: "visible",
        }}
      >
        {chain.map((tile, i) => {
          const { gridColumn, gridRow, orientation, isCorner } = getTileProps(i);
          const isDouble = tile[0] === tile[1];

          // Doubles in horizontal runs go crosswise (vertical), corners stay vertical
          const actualOrientation: "horizontal" | "vertical" =
            isCorner ? "vertical" : isDouble ? "vertical" : "horizontal";

          return (
            <div
              key={i}
              style={{
                gridColumn,
                gridRow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
              }}
            >
              <DominoTile
                tile={tile}
                orientation={actualOrientation}
                size="sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
