import type { Tile } from "./types";

export function allTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push([i, j]);
    }
  }
  return tiles; // 28 tiles
}

export function shuffle(tiles: Tile[]): Tile[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pipCount(tiles: Tile[]): number {
  return tiles.reduce((sum, [a, b]) => sum + a + b, 0);
}

export function tileKey(t: Tile): string {
  return `${t[0]}-${t[1]}`;
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
