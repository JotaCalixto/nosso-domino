"use client";

import { DominoTile } from "./DominoTile";
import type { Tile } from "@/engine/types";

interface GameBoardProps {
  chain: Tile[];
}

const TILES_PER_ROW = 5;
const TILE_GAP = 3;
// sm horizontal tile: 56×28 | sm vertical tile: 28×56
const TILE_W = 56;
const CORNER_W = 28;
// Full board width = 5 tiles + 1 corner slot + 5 gaps
const BOARD_W = TILES_PER_ROW * TILE_W + CORNER_W + TILES_PER_ROW * TILE_GAP;
const ROW_GAP = 0;

interface SegmentData {
  tiles: Tile[];
  corner: Tile | null;
  isLTR: boolean;
}

function buildSegments(chain: Tile[]): SegmentData[] {
  const segments: SegmentData[] = [];
  let isLTR = true;
  let posInSeg = 0;
  let tiles: Tile[] = [];

  for (const tile of chain) {
    if (posInSeg < TILES_PER_ROW) {
      tiles.push(tile);
      posInSeg++;
    } else {
      segments.push({ tiles, corner: tile, isLTR });
      tiles = [];
      isLTR = !isLTR;
      posInSeg = 0;
    }
  }

  if (tiles.length > 0) {
    segments.push({ tiles, corner: null, isLTR });
  }

  return segments;
}

export function GameBoard({ chain }: GameBoardProps) {
  if (chain.length === 0) {
    return (
      <div className="felt-table flex items-center justify-center rounded-2xl" style={{ minHeight: 100 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14, opacity: 0.6 }}>Jogue a primeira peça</p>
      </div>
    );
  }

  // Short chain: flat row
  if (chain.length <= TILES_PER_ROW) {
    return (
      <div className="felt-table rounded-2xl" style={{ minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: TILE_GAP }}>
          {chain.map((tile, i) => (
            <DominoTile key={i} tile={tile} orientation="horizontal" size="sm" />
          ))}
        </div>
      </div>
    );
  }

  const segments = buildSegments(chain);

  return (
    <div className="felt-table rounded-2xl" style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: BOARD_W, display: "flex", flexDirection: "column", gap: ROW_GAP }}>
        {segments.map((seg, si) => (
          <div
            key={si}
            style={{
              display: "flex",
              // LTR: tiles go left→right, corner at right end
              // RTL (row-reverse): first chain tile appears on RIGHT (adjacent to corner above), corner at left end
              flexDirection: seg.isLTR ? "row" : "row-reverse",
              alignItems: "flex-start",
              gap: TILE_GAP,
            }}
          >
            {seg.tiles.map((tile, i) => (
              // All chain tiles lie flat (horizontal) — including doubles.
              // Only the corner/turn tile is vertical (perpendicular).
              <DominoTile key={i} tile={tile} orientation="horizontal" size="sm" />
            ))}
            {seg.corner && (
              <DominoTile tile={seg.corner} orientation="vertical" size="sm" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
