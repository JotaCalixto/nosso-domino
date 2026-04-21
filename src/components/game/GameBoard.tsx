"use client";

import { DominoTile } from "./DominoTile";
import type { Tile } from "@/engine/types";

interface GameBoardProps {
  chain: Tile[];
}

const TILES_PER_ROW = 5;
const SEGMENT = TILES_PER_ROW + 1;

const ROW_H   = 28;
const ROW_GAP = 32;
const CORNER_H = ROW_H * 2 + ROW_GAP;

function getTileProps(idx: number) {
  const seg = Math.floor(idx / SEGMENT);
  const pos = idx % SEGMENT;
  const isCorner = pos === TILES_PER_ROW;
  const isLTR = seg % 2 === 0;
  const row = seg + 1;

  if (isCorner) {
    return {
      gridColumn: isLTR ? TILES_PER_ROW + 2 : 1,
      gridRow: `${row} / ${row + 2}`,
      isCorner: true,
      isLTR,
    };
  }

  const col = isLTR ? pos + 2 : TILES_PER_ROW + 1 - pos;
  return { gridColumn: col, gridRow: `${row}`, isCorner: false, isLTR };
}

export function GameBoard({ chain }: GameBoardProps) {
  if (chain.length === 0) {
    return (
      <div className="felt-table flex items-center justify-center rounded-2xl" style={{ minHeight: 100 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14, opacity: 0.6 }}>Jogue a primeira peça</p>
      </div>
    );
  }

  if (chain.length <= TILES_PER_ROW) {
    return (
      <div className="felt-table rounded-2xl" style={{ minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {chain.map((tile, i) => {
            const isDouble = tile[0] === tile[1];
            return (
              <DominoTile key={i} tile={tile} orientation={isDouble ? "vertical" : "horizontal"} size="sm" />
            );
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
          gridTemplateColumns: `28px repeat(${TILES_PER_ROW}, 56px) 28px`,
          gridTemplateRows: `repeat(${numRows}, ${ROW_H}px)`,
          rowGap: ROW_GAP,
          columnGap: 2,
          overflow: "visible",
        }}
      >
        {chain.map((tile, i) => {
          const { gridColumn, gridRow, isCorner } = getTileProps(i);
          const isDouble = tile[0] === tile[1];

          // Doubles shown crosswise (vertical) in horizontal segments
          const orientation: "horizontal" | "vertical" =
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
