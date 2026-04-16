import {
  MOVE_CLASSES,
  type EngineEval,
  type HintQuality,
  type MoveClass,
  type RevertThreshold,
} from './types';

// Chess.com-style centipawn-loss thresholds.
const THRESHOLDS: Array<{ cls: MoveClass; maxLoss: number }> = [
  { cls: 'best', maxLoss: 0 },
  { cls: 'excellent', maxLoss: 10 },
  { cls: 'good', maxLoss: 50 },
  { cls: 'inaccuracy', maxLoss: 100 },
  { cls: 'mistake', maxLoss: 200 },
  { cls: 'blunder', maxLoss: Infinity },
];

const MATE_SCORE = 100000;

function evalToCpScalar(e: { cp: number | null; mate: number | null }): number {
  if (e.mate !== null) {
    return e.mate > 0 ? MATE_SCORE - e.mate : -MATE_SCORE - e.mate;
  }
  return e.cp ?? 0;
}

/**
 * Classify a move.
 * @param pre   engine eval on the position BEFORE the move (from mover's POV)
 * @param post  engine eval on the position AFTER the move (from opponent's POV, as UCI reports it)
 */
export function classifyMove(pre: EngineEval, post: EngineEval): { cls: MoveClass; lossCp: number } {
  const preScalar = evalToCpScalar(pre);
  const postFromMover = -evalToCpScalar(post);
  const loss = Math.max(0, preScalar - postFromMover);
  for (const { cls, maxLoss } of THRESHOLDS) {
    if (loss <= maxLoss) return { cls, lossCp: loss };
  }
  return { cls: 'blunder', lossCp: loss };
}

const GLYPH: Record<MoveClass, string> = {
  best: '!!',
  excellent: '!',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

const COLOR: Record<MoveClass, string> = {
  best: 'text-emerald-300',
  excellent: 'text-emerald-200',
  good: 'text-slate-200',
  inaccuracy: 'text-amber-300',
  mistake: 'text-orange-400',
  blunder: 'text-red-400',
};

const LABEL: Record<MoveClass, string> = {
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

export const classGlyph = (c: MoveClass) => GLYPH[c];
export const classColor = (c: MoveClass) => COLOR[c];
export const classLabel = (c: MoveClass) => LABEL[c];

/** True when `actual`'s severity meets or exceeds the configured revert threshold. */
export function shouldRevert(actual: MoveClass, threshold: RevertThreshold): boolean {
  if (threshold === 'off') return false;
  return MOVE_CLASSES.indexOf(actual) >= MOVE_CLASSES.indexOf(threshold);
}

/** Max centipawn loss (from best) that qualifies a move for a hint highlight. */
export function hintMaxLoss(quality: HintQuality): number {
  switch (quality) {
    case 'best':
      return 0;
    case 'excellent':
      return 10;
    case 'good':
      return 50;
  }
}

export const HINT_QUALITY_LABEL: Record<HintQuality, string> = {
  best: 'Best only',
  excellent: 'Excellent or better',
  good: 'Good or better',
};
