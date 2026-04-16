export type Color = 'w' | 'b';

export const MOVE_CLASSES = [
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
] as const;
export type MoveClass = (typeof MOVE_CLASSES)[number];

export type RevertThreshold = 'off' | 'inaccuracy' | 'mistake' | 'blunder';

export type Square = string;

export interface EngineEval {
  /** Centipawn score from side-to-move perspective. Positive = side to move is better. */
  cp: number | null;
  /** Mate-in-N from side-to-move perspective (positive: we mate, negative: we get mated). */
  mate: number | null;
  /** UCI string of the best move the engine returned. */
  bestMove: string | null;
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
  evalBeforeCp?: number | null;
  evalAfterCp?: number | null;
}

export interface GameSettings {
  userColor: Color;
  elo: number;
  evalOn: boolean;
  revertAt: RevertThreshold;
}
