'use client';

import { forwardRef } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Piece, Square } from 'react-chessboard/dist/chessboard/types';
import type { CSSProperties } from 'react';
import type { Color } from '@/lib/types';

export type BoardRef = { clearPremoves: (clearLastPieceColour?: boolean) => void };

export interface BoardOverlay {
  lastMove?: { from: string; to: string };
  badMove?: { from: string; to: string };
  hintSquares?: string[];
  opponentArrow?: { from: string; to: string };
  selected?: string;
  legalDests?: { square: string; capture: boolean }[];
}

interface BoardProps {
  fen: string;
  userColor: Color;
  disabled: boolean;
  allowPremoves: boolean;
  overlay: BoardOverlay;
  onDrop: (from: string, to: string) => boolean;
  onSquareClick: (square: string) => void;
  onPieceDragBegin: (square: string) => void;
  onPieceDragEnd: () => void;
  boardWidth?: number;
}

const LAST_MOVE_BG = 'rgba(155, 199, 0, 0.30)';
const BAD_BG = 'rgba(220, 38, 38, 0.55)';
const HINT_RING = 'inset 0 0 0 4px rgba(59, 130, 246, 0.9)';
const HINT_BG = 'rgba(59, 130, 246, 0.25)';
const SELECTED_BG = 'rgba(255, 230, 130, 0.45)';
const OPP_ARROW_COLOR = '#f97316';
const LEGAL_DOT =
  'radial-gradient(circle, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0) 22%)';
const LEGAL_CAPTURE =
  'radial-gradient(circle, transparent 0%, transparent 68%, rgba(0,0,0,0.35) 69%, rgba(0,0,0,0.35) 100%)';

function addStyle(map: Record<string, CSSProperties>, sq: string | undefined, s: CSSProperties) {
  if (!sq) return;
  map[sq] = { ...(map[sq] ?? {}), ...s };
}

function mergeBackground(existing: CSSProperties | undefined, layer: string): CSSProperties {
  const prev = (existing?.background as string | undefined) ?? '';
  return { ...(existing ?? {}), background: prev ? `${layer}, ${prev}` : layer };
}

export const Board = forwardRef<BoardRef, BoardProps>(function Board(
  {
    fen,
    userColor,
    disabled,
    allowPremoves,
    overlay,
    onDrop,
    onSquareClick,
    onPieceDragBegin,
    onPieceDragEnd,
    boardWidth,
  },
  ref,
) {
  const styles: Record<string, CSSProperties> = {};

  if (overlay.lastMove) {
    addStyle(styles, overlay.lastMove.from, { background: LAST_MOVE_BG });
    addStyle(styles, overlay.lastMove.to, { background: LAST_MOVE_BG });
  }
  if (overlay.selected) {
    addStyle(styles, overlay.selected, { background: SELECTED_BG });
  }
  if (overlay.legalDests) {
    for (const d of overlay.legalDests) {
      const layer = d.capture ? LEGAL_CAPTURE : LEGAL_DOT;
      styles[d.square] = mergeBackground(styles[d.square], layer);
    }
  }
  if (overlay.badMove) {
    addStyle(styles, overlay.badMove.from, {
      background: BAD_BG,
      boxShadow: 'inset 0 0 0 3px rgba(248, 113, 113, 1)',
    });
    addStyle(styles, overlay.badMove.to, { background: BAD_BG });
  }
  if (overlay.hintSquares) {
    for (const sq of overlay.hintSquares) {
      addStyle(styles, sq, { boxShadow: HINT_RING, background: HINT_BG });
    }
  }

  const arrows: Array<[Square, Square, string?]> = overlay.opponentArrow
    ? [[overlay.opponentArrow.from as Square, overlay.opponentArrow.to as Square, OPP_ARROW_COLOR]]
    : [];

  return (
    <Chessboard
      ref={ref}
      position={fen}
      boardOrientation={userColor === 'w' ? 'white' : 'black'}
      arePiecesDraggable={!disabled || allowPremoves}
      arePremovesAllowed={allowPremoves}
      boardWidth={boardWidth}
      customSquareStyles={styles}
      customArrows={arrows}
      customArrowColor={OPP_ARROW_COLOR}
      customBoardStyle={{
        borderRadius: 6,
        boxShadow: '0 6px 32px rgba(0,0,0,0.45)',
      }}
      customDarkSquareStyle={{ backgroundColor: '#779556' }}
      customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
      customPremoveDarkSquareStyle={{ backgroundColor: '#a56a3c' }}
      customPremoveLightSquareStyle={{ backgroundColor: '#cf8a4f' }}
      onPieceDrop={(from: Square, to: Square, _piece: Piece) => onDrop(from, to)}
      onSquareClick={(square: Square) => onSquareClick(square)}
      onPieceDragBegin={(_piece: Piece, square: Square) => onPieceDragBegin(square)}
      onPieceDragEnd={() => onPieceDragEnd()}
    />
  );
});
