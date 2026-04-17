export type Color = 'w' | 'b';

export const MOVE_CLASSES = [
  'book',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
] as const;
export type MoveClass = (typeof MOVE_CLASSES)[number];

export type RevertThreshold = 'off' | 'inaccuracy' | 'mistake' | 'blunder';
export type HintQuality = 'best' | 'excellent' | 'good';

export type Square = string;

export interface EngineEval {
  /** Centipawn score from side-to-move perspective. Positive = side to move is better. */
  cp: number | null;
  /** Mate-in-N from side-to-move perspective (positive: we mate, negative: we get mated). */
  mate: number | null;
  /** UCI string of the best move the engine returned. */
  bestMove: string | null;
  /** Full principal variation (UCI moves) starting with bestMove. */
  pv: string[];
}

export interface EnginePv extends EngineEval {
  /** MultiPV rank (1-indexed). */
  rank: number;
}

/** Eval always stored in white's perspective so the UI never has to flip. */
export interface WhiteEval {
  cp: number | null;
  mate: number | null;
}

export interface PlayedMove {
  san: string;
  from: Square;
  to: Square;
  fenBefore: string;
  fenAfter: string;
  moverColor: Color;
  moveClass?: MoveClass;
  lossCp?: number;
}

export interface GameSettings {
  userColor: Color;
  elo: number;
  evalOn: boolean;
  revertAt: RevertThreshold;
  hintQuality: HintQuality;
  allowPremoves: boolean;
}

export function toWhiteEval(e: EngineEval, sideToMove: Color): WhiteEval {
  const flip = sideToMove === 'b';
  return {
    cp: e.cp === null ? null : flip ? -e.cp : e.cp,
    mate: e.mate === null ? null : flip ? -e.mate : e.mate,
  };
}
