'use client';

import type { WhiteEval } from '@/lib/types';

interface EvalBarProps {
  /** Eval in white's perspective. Null until first analysis arrives. */
  whiteEval: WhiteEval | null;
  /** Color on the BOTTOM of the bar (matches board orientation = user's side). */
  bottomColor: 'w' | 'b';
  /** When true renders horizontally (for mobile layouts). */
  horizontal?: boolean;
}

/** Smoothly map centipawns → 0..1 white-share using a sigmoid so small swings are visible and huge ones saturate. */
function whiteShare(whiteCp: number): number {
  const k = 0.004;
  return 1 / (1 + Math.exp(-k * whiteCp));
}

function whiteShareFromEval(e: WhiteEval): number {
  if (e.mate !== null) return e.mate > 0 ? 1 : 0;
  if (e.cp === null) return 0.5;
  return whiteShare(e.cp);
}

function formatEval(e: WhiteEval): string {
  if (e.mate !== null) {
    return `${e.mate >= 0 ? '' : '-'}M${Math.abs(e.mate)}`;
  }
  if (e.cp === null) return '0.0';
  const v = e.cp / 100;
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
}

export function EvalBar({ whiteEval, bottomColor, horizontal = false }: EvalBarProps) {
  const e = whiteEval ?? { cp: 0, mate: null };
  const white = whiteShareFromEval(e);
  const label = formatEval(e);
  const favouringWhite = white >= 0.5;

  if (horizontal) {
    // Horizontal: left = black, right = white. If bottomColor is black, flip so
    // user's side is on the right.
    const leftIsUser = bottomColor === 'b';
    const userShare = bottomColor === 'w' ? white : 1 - white;
    const leftPct = leftIsUser ? userShare * 100 : (1 - userShare) * 100;
    return (
      <div className="flex h-5 w-full items-center gap-2 text-xs">
        <div className="relative flex h-full flex-1 overflow-hidden rounded border border-white/10 bg-neutral-900">
          <div
            className="bg-neutral-800 transition-all duration-500 ease-out"
            style={{ width: `${leftPct}%` }}
          />
          <div
            className="bg-neutral-100 transition-all duration-500 ease-out"
            style={{ width: `${100 - leftPct}%` }}
          />
        </div>
        <span
          className={`w-12 flex-shrink-0 rounded-sm px-1 py-0.5 text-center font-mono font-semibold tabular-nums ${
            favouringWhite ? 'bg-white text-black' : 'bg-neutral-900 text-white'
          }`}
        >
          {label}
        </span>
      </div>
    );
  }

  const topPct = bottomColor === 'w' ? (1 - white) * 100 : white * 100;

  return (
    <div className="relative flex h-full w-8 flex-col overflow-hidden rounded-md border border-white/10 bg-neutral-900 shadow-inner">
      <div
        className="bg-neutral-800 transition-all duration-500 ease-out"
        style={{ height: `${topPct}%` }}
      />
      <div
        className="bg-neutral-100 transition-all duration-500 ease-out"
        style={{ height: `${100 - topPct}%` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-px bg-black/30" />
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-sm px-1 py-0.5 text-center font-mono text-[11px] font-semibold leading-none tabular-nums shadow ${
          favouringWhite
            ? 'bottom-1 bg-white/95 text-black'
            : 'top-1 bg-black/85 text-white'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
