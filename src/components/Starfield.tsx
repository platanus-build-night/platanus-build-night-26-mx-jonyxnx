"use client";

import { useMemo } from "react";

const STAR_COLORS = [
  "text-pink-400",
  "text-amber-400",
  "text-violet-400",
  "text-sky-400",
  "text-emerald-400",
  "text-rose-400",
  "text-yellow-500",
  "text-fuchsia-400",
  "text-orange-400",
];

const STAR_GLYPHS = ["✦", "✧", "✦", "✧", "★", "✦", "·"];
const STAR_SIZES = [
  "text-[10px]",
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
];

// Deterministic LCG so SSR and client agree.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

interface Star {
  x: string; // 0..100 (%)
  y: string; // 0..100 (%) - 0 top, 100 bottom
  glyph: string;
  color: string;
  size: string;
  delay: number;
  opacity: string;
}

function stableDecimal(value: number, digits = 3): string {
  return value.toFixed(digits);
}

function generateStars(target: number, seed = 1337): Star[] {
  const rand = makeRng(seed);
  const stars: Star[] = [];

  while (stars.length < target) {
    const angle = Math.PI + rand() * Math.PI;
    const radius = Math.sqrt(rand()) * 46;
    const x = 50 + Math.cos(angle) * radius;
    const y = 106 + Math.sin(angle) * radius;
    const edgeBias = radius / 46;

    stars.push({
      x: stableDecimal(x),
      y: stableDecimal(y),
      glyph: STAR_GLYPHS[Math.floor(rand() * STAR_GLYPHS.length)],
      color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
      size: STAR_SIZES[Math.floor(rand() * STAR_SIZES.length)],
      delay: Math.floor(rand() * 2400),
      opacity: stableDecimal(0.35 + edgeBias * 0.25 + rand() * 0.35, 2),
    });
  }
  return stars;
}

export function Starfield({ count = 180, seed = 1337 }: { count?: number; seed?: number }) {
  const stars = useMemo(() => generateStars(count, seed), [count, seed]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <span
          key={i}
          className={`absolute twinkle font-mono ${s.color} ${s.size}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animationDelay: `${s.delay}ms`,
            opacity: s.opacity,
            transform: "translate(-50%, -50%)",
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}
