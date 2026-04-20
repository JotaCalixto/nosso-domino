"use client";

import { motion } from "framer-motion";
import type { Tile } from "@/engine/types";

const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 20], [72, 20], [28, 50], [72, 50], [28, 80], [72, 80]],
};

interface DominoTileProps {
  tile: Tile;
  orientation?: "horizontal" | "vertical";
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  overrideH?: number;
}

const SIZES = {
  sm:  { w: 28, h: 56,  pip: 4,  radius: 5,  depth: 2, divider: 1 },
  md:  { w: 40, h: 78,  pip: 6,  radius: 7,  depth: 3, divider: 1.5 },
  lg:  { w: 52, h: 100, pip: 8,  radius: 9,  depth: 4, divider: 2 },
};

export function DominoTile({
  tile,
  orientation = "vertical",
  selected = false,
  playable = false,
  onClick,
  size = "md",
  className = "",
  overrideH,
}: DominoTileProps) {
  const [a, b] = tile;
  const { w, pip, radius, depth, divider } = SIZES[size];
  const h = overrideH ?? SIZES[size].h;
  const isH = orientation === "horizontal";
  const tileW = isH ? h : w;
  const tileH = isH ? w : h;

  // Outer glow for selected / playable state
  const glowShadow = selected
    ? `0 0 0 2.5px #f59e0b, 0 0 12px rgba(245,158,11,0.5)`
    : playable
    ? `0 0 0 2px #3b82f6, 0 0 8px rgba(59,130,246,0.4)`
    : "";

  // 3D depth shadow: bottom edge simulates tile thickness
  const depthColor = "#9a8060";
  const depthShadow = `0 ${depth}px 0 ${depthColor}, 0 ${depth + 2}px 6px rgba(0,0,0,0.45)`;

  const boxShadow = [glowShadow, depthShadow].filter(Boolean).join(", ");

  // Tile face: warm ivory gradient (lighter center → slightly darker edges)
  const faceGradient = "radial-gradient(ellipse at 35% 30%, #fffef5 0%, #f5edd8 55%, #ecdfc6 100%)";

  return (
    <motion.button
      onClick={onClick}
      whileTap={onClick ? { scale: 0.95, y: depth } : undefined}
      animate={selected ? { y: -8 } : { y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 320 }}
      className={`relative flex-shrink-0 ${onClick ? "cursor-pointer" : "cursor-default"} ${className}`}
      style={{
        width: tileW,
        height: tileH,
        background: faceGradient,
        border: "1px solid #c4a870",
        borderRadius: radius,
        boxShadow,
        padding: 0,
        // Inset highlight on top-left edge for 3D "raised" look
        outline: "none",
      }}
    >
      {/* Inner inset shadow for depth on face */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius - 1,
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.85), inset 0 -1px 2px rgba(0,0,0,0.12)",
          pointerEvents: "none",
        }}
      />

      {/* First half */}
      <HalfFace pips={a} pipSize={pip} isH={isH} second={false} />

      {/* Divider line */}
      <div
        style={{
          position: "absolute",
          backgroundColor: "#5a4020",
          opacity: 0.7,
          ...(isH
            ? { left: "50%", top: "12%", bottom: "12%", width: divider, transform: "translateX(-50%)" }
            : { top: "50%", left: "12%", right: "12%", height: divider, transform: "translateY(-50%)" }),
        }}
      />

      {/* Second half */}
      <HalfFace pips={b} pipSize={pip} isH={isH} second />
    </motion.button>
  );
}

function HalfFace({
  pips, pipSize, isH, second,
}: {
  pips: number; pipSize: number; isH: boolean; second: boolean;
}) {
  const positions = PIP_POSITIONS[pips] ?? [];
  return (
    <div
      style={{
        position: "absolute",
        ...(isH
          ? { left: second ? "50%" : 0, right: second ? 0 : "50%", top: 0, bottom: 0 }
          : { top: second ? "50%" : 0, bottom: second ? 0 : "50%", left: 0, right: 0 }),
      }}
    >
      {positions.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: pipSize,
            height: pipSize,
            borderRadius: "50%",
            // Pip: dark center with radial gradient for concave look
            background: "radial-gradient(circle at 35% 30%, #4a3520 0%, #1a0e05 70%)",
            boxShadow: `inset 0 1px 2px rgba(0,0,0,0.6), 0 0.5px 0 rgba(255,255,255,0.15)`,
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
