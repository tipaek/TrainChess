'use client';

import { Chessboard } from 'react-chessboard';
import type { Piece, Square } from 'react-chessboard/dist/chessboard/types';
import type { CSSProperties } from 'react';
import type { Color } from '@/lib/types';

export interface BoardOverlay {
  lastMove?: { from: string; to: string };
  badMove?: { from: string; to: string };
  hintSquare?: string;
  bestArrow?: { from: string; to: string };
}

interface BoardProps {
  fen: string;
  userColor: Color;
  disabled: boolean;
  overlay: BoardOverlay;
  onDrop: (from: string, to: string) => boolean;
}

const COLORS = {
  lastMove: 'rgba(155, 199, 0, 0.35)',
  bad: 'rgba(220, 38, 38, 0.55)',
  hint: 'rgba(59, 130, 246, 0.55)',
  bestFrom: 'rgba(16, 185, 129, 0.45)',
  bestTo: 'rgba(16, 185, 129, 0.35)',
};

function mergeStyle(
  map: Record<string, CSSProperties>,
  square: string | undefined,
  style: CSSProperties,
) {
  if (!square) return;
  map[square] = { ...(map[square] ?? {}), ...style };
}

export function Board({ fen, userColor, disabled, overlay, onDrop }: BoardProps) {
  const styles: Record<string, CSSProperties> = {};

  if (overlay.lastMove) {
    mergeStyle(styles, overlay.lastMove.from, { background: COLORS.lastMove });
    mergeStyle(styles, overlay.lastMove.to, { background: COLORS.lastMove });
  }
  if (overlay.bestArrow) {
    mergeStyle(styles, overlay.bestArrow.from, {
      background: COLORS.bestFrom,
      boxShadow: 'inset 0 0 0 3px rgba(16, 185, 129, 0.9)',
    });
    mergeStyle(styles, overlay.bestArrow.to, { background: COLORS.bestTo });
  }
  if (overlay.badMove) {
    mergeStyle(styles, overlay.badMove.from, {
      background: COLORS.bad,
      boxShadow: 'inset 0 0 0 3px rgba(248, 113, 113, 1)',
    });
    mergeStyle(styles, overlay.badMove.to, { background: COLORS.bad });
  }
  if (overlay.hintSquare) {
    mergeStyle(styles, overlay.hintSquare, {
      boxShadow: 'inset 0 0 0 4px rgba(59, 130, 246, 0.9)',
      background: COLORS.hint,
    });
  }

  const arrows = overlay.bestArrow
    ? ([[overlay.bestArrow.from as Square, overlay.bestArrow.to as Square, '#10b981']] as Array<
        [Square, Square, string?]
      >)
    : [];

  return (
    <Chessboard
      position={fen}
      boardOrientation={userColor === 'w' ? 'white' : 'black'}
      arePiecesDraggable={!disabled}
      customSquareStyles={styles}
      customArrows={arrows}
      customBoardStyle={{
        borderRadius: 6,
        boxShadow: '0 6px 32px rgba(0,0,0,0.45)',
      }}
      customDarkSquareStyle={{ backgroundColor: '#779556' }}
      customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
      onPieceDrop={(from: Square, to: Square, _piece: Piece) => onDrop(from, to)}
    />
  );
}
