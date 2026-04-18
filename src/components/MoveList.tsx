'use client';

import { classColor, classGlyph, classLabel } from '@/lib/classify';
import type { PlayedMove } from '@/lib/types';

interface MoveListProps {
  moves: PlayedMove[];
  /** null = live, otherwise 1-based ply the user is reviewing. */
  viewIndex: number | null;
  onMoveClick: (index: number) => void;
}

interface Row {
  idx: number;
  white?: { move: PlayedMove; ply: number };
  black?: { move: PlayedMove; ply: number };
}

export function MoveList({ moves, viewIndex, onMoveClick }: MoveListProps) {
  const rows: Row[] = [];
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const ply = i + 1;
    if (m.moverColor === 'w') {
      rows.push({ idx: rows.length + 1, white: { move: m, ply } });
    } else {
      const last = rows[rows.length - 1];
      if (last && !last.black) last.black = { move: m, ply };
      else rows.push({ idx: rows.length + 1, black: { move: m, ply } });
    }
  }

  return (
    <div className="flex-1 select-text overflow-y-auto rounded-md border border-white/10 bg-panelAlt/50 p-2 font-mono text-sm">
      {rows.length === 0 ? (
        <div className="p-2 text-neutral-500">No moves yet.</div>
      ) : (
        <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5">
          {rows.map((row) => (
            <RowFragment key={row.idx} row={row} viewIndex={viewIndex} onMoveClick={onMoveClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function RowFragment({
  row,
  viewIndex,
  onMoveClick,
}: {
  row: Row;
  viewIndex: number | null;
  onMoveClick: (index: number) => void;
}) {
  return (
    <>
      <div className="pr-1 text-right text-neutral-500">{row.idx}.</div>
      <MoveCell entry={row.white} viewIndex={viewIndex} onMoveClick={onMoveClick} />
      <MoveCell entry={row.black} viewIndex={viewIndex} onMoveClick={onMoveClick} />
    </>
  );
}

function MoveCell({
  entry,
  viewIndex,
  onMoveClick,
}: {
  entry?: { move: PlayedMove; ply: number };
  viewIndex: number | null;
  onMoveClick: (index: number) => void;
}) {
  if (!entry) return <div />;
  const { move: m, ply } = entry;
  const glyph = m.moveClass ? classGlyph(m.moveClass) : '';
  const color = m.moveClass ? classColor(m.moveClass) : 'text-neutral-200';
  const title = m.moveClass
    ? `${classLabel(m.moveClass)}${m.lossCp !== undefined ? ` (-${m.lossCp}cp)` : ''}`
    : '';
  const active = viewIndex === ply;
  return (
    <button
      type="button"
      onClick={() => onMoveClick(ply)}
      title={title}
      className={`truncate rounded px-1 text-left ${color} ${
        active ? 'bg-white/15 ring-1 ring-accent/60' : 'hover:bg-white/5'
      }`}
    >
      {m.san}
      {glyph && <span className="ml-0.5">{glyph}</span>}
    </button>
  );
}
