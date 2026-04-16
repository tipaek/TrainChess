'use client';

import { classColor, classGlyph, classLabel } from '@/lib/classify';
import type { PlayedMove } from '@/lib/types';

interface MoveListProps {
  moves: PlayedMove[];
}

export function MoveList({ moves }: MoveListProps) {
  const rows: Array<{ idx: number; white?: PlayedMove; black?: PlayedMove }> = [];
  for (let i = 0; i < moves.length; i++) {
    const isWhite = moves[i].moverColor === 'w';
    if (isWhite) {
      rows.push({ idx: rows.length + 1, white: moves[i] });
    } else {
      const last = rows[rows.length - 1];
      if (last && !last.black) last.black = moves[i];
      else rows.push({ idx: rows.length + 1, black: moves[i] });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto rounded-md border border-white/10 bg-panelAlt/50 p-2 font-mono text-sm">
      {rows.length === 0 ? (
        <div className="p-2 text-neutral-500">No moves yet.</div>
      ) : (
        <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5">
          {rows.map((row) => (
            <RowFragment key={row.idx} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function RowFragment({ row }: { row: { idx: number; white?: PlayedMove; black?: PlayedMove } }) {
  return (
    <>
      <div className="pr-1 text-right text-neutral-500">{row.idx}.</div>
      <MoveCell m={row.white} />
      <MoveCell m={row.black} />
    </>
  );
}

function MoveCell({ m }: { m?: PlayedMove }) {
  if (!m) return <div />;
  const glyph = m.moveClass ? classGlyph(m.moveClass) : '';
  const color = m.moveClass ? classColor(m.moveClass) : 'text-neutral-200';
  const title = m.moveClass
    ? `${classLabel(m.moveClass)}${m.lossCp !== undefined ? ` (-${m.lossCp}cp)` : ''}`
    : '';
  return (
    <div className={`truncate ${color}`} title={title}>
      {m.san}
      {glyph && <span className="ml-0.5">{glyph}</span>}
    </div>
  );
}
