'use client';

import type { EngineEval } from '@/lib/types';

interface EvalBarProps {
  /** Latest analyzer eval (from side-to-move POV). Null if unknown. */
  evalInfo: EngineEval | null;
  /** Who is to move in the position the eval corresponds to. */
  sideToMove: 'w' | 'b';
  /** Color on the BOTTOM of the bar (matches board orientation = user's side). */
  bottomColor: 'w' | 'b';
}

function whiteCp(e: EngineEval, stm: 'w' | 'b'): number {
  if (e.mate !== null) {
    const signed = e.mate > 0 ? 10000 : -10000;
    return stm === 'w' ? signed : -signed;
  }
  if (e.cp === null) return 0;
  return stm === 'w' ? e.cp : -e.cp;
}

function formatEval(e: EngineEval, stm: 'w' | 'b'): string {
  if (e.mate !== null) {
    const fromWhite = stm === 'w' ? e.mate : -e.mate;
    return `${fromWhite >= 0 ? '' : '-'}M${Math.abs(fromWhite)}`;
  }
  if (e.cp === null) return '0.0';
  const w = stm === 'w' ? e.cp : -e.cp;
  return `${w >= 0 ? '+' : ''}${(w / 100).toFixed(1)}`;
}

export function EvalBar({ evalInfo, sideToMove, bottomColor }: EvalBarProps) {
  const white = evalInfo ? whiteCp(evalInfo, sideToMove) : 0;
  const clamped = Math.max(-1000, Math.min(1000, white));
  const whitePct = 50 + (clamped / 1000) * 50;
  const topPct = bottomColor === 'w' ? 100 - whitePct : whitePct;
  const label = evalInfo ? formatEval(evalInfo, sideToMove) : '0.0';

  return (
    <div className="relative flex h-full w-6 flex-col overflow-hidden rounded-md border border-white/10 bg-neutral-900">
      <div
        className="bg-neutral-800 transition-all duration-300"
        style={{ height: `${topPct}%` }}
      />
      <div
        className="bg-neutral-100 transition-all duration-300"
        style={{ height: `${100 - topPct}%` }}
      />
      <div className="absolute inset-x-0 bottom-1 text-center text-[10px] font-mono text-neutral-400">
        {label}
      </div>
    </div>
  );
}
