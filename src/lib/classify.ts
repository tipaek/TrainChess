import {
  MOVE_CLASSES,
  type EngineEval,
  type HintQuality,
  type MoveClass,
  type RevertThreshold,
} from './types';

const MATE_SCORE = 100000;

function evalToCpScalar(e: { cp: number | null; mate: number | null }): number {
  if (e.mate !== null) {
    return e.mate > 0 ? MATE_SCORE - e.mate : -MATE_SCORE - e.mate;
  }
  return e.cp ?? 0;
}

/**
 * Stockfish-style centipawn → win-probability (0..100) mapping. Same logistic
 * shape that chess.com uses for its move-quality calculation, so a 200cp drop
 * from a winning position is forgiven (you're still winning) while the same
 * drop from an even position is punished.
 */
function winProb(cp: number): number {
  // Clamp to keep the exponent finite for mate scores.
  const clamped = Math.max(-2000, Math.min(2000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

// Win-probability loss thresholds (percentage points).
const WP_THRESHOLDS: Array<{ cls: MoveClass; max: number }> = [
  { cls: 'best', max: 0.5 },
  { cls: 'excellent', max: 2 },
  { cls: 'good', max: 5 },
  { cls: 'inaccuracy', max: 10 },
  { cls: 'mistake', max: 20 },
  { cls: 'blunder', max: Infinity },
];

/**
 * Classify a played move.
 * @param pre        engine eval on the position BEFORE the move (mover's POV)
 * @param post       engine eval on the position AFTER the move (opponent's POV, as UCI reports it)
 * @param playedUci  UCI of the move that was actually played; if it matches the
 *                   engine's #1 from `pre`, the move is forced to "best" so a
 *                   tiny tail-end depth disagreement doesn't downgrade it.
 */
export function classifyMove(
  pre: EngineEval,
  post: EngineEval,
  playedUci?: string,
): { cls: MoveClass; lossCp: number } {
  const preScalar = evalToCpScalar(pre);
  const postFromMover = -evalToCpScalar(post);
  const lossCp = Math.max(0, preScalar - postFromMover);

  if (playedUci && pre.bestMove && playedUci === pre.bestMove) {
    return { cls: 'best', lossCp };
  }

  const wpLoss = Math.max(0, winProb(preScalar) - winProb(postFromMover));
  for (const { cls, max } of WP_THRESHOLDS) {
    if (wpLoss <= max) return { cls, lossCp };
  }
  return { cls: 'blunder', lossCp };
}

const GLYPH: Record<MoveClass, string> = {
  book: '',
  best: '!!',
  excellent: '!',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

const COLOR: Record<MoveClass, string> = {
  book: 'text-sky-300',
  best: 'text-emerald-300',
  excellent: 'text-emerald-200',
  good: 'text-slate-200',
  inaccuracy: 'text-amber-300',
  mistake: 'text-orange-400',
  blunder: 'text-red-400',
};

const LABEL: Record<MoveClass, string> = {
  book: 'Book',
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
