'use client';

import type { Color, GameSettings, MoveClass, PlayedMove, RevertThreshold } from '@/lib/types';
import { classColor, classLabel } from '@/lib/classify';
import { MoveList } from './MoveList';

interface SidePanelProps {
  settings: GameSettings;
  onSettingsChange: (next: GameSettings) => void;
  onNewGame: (side: Color | 'random') => void;
  onHint: () => void;
  onExport: () => void;
  canHint: boolean;
  inProgress: boolean;
  moves: PlayedMove[];
  lastClass: MoveClass | null;
  lastLossCp: number | null;
  status: string;
}

export function SidePanel(props: SidePanelProps) {
  const {
    settings,
    onSettingsChange,
    onNewGame,
    onHint,
    onExport,
    canHint,
    inProgress,
    moves,
    lastClass,
    lastLossCp,
    status,
  } = props;

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <aside className="flex h-full w-full flex-col gap-4 rounded-xl bg-panel p-4 text-sm shadow-xl">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">TrainChess</h1>
          <span className="text-xs text-neutral-400">vs Stockfish</span>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Play. Every move gets graded. Bad moves snap you back so you can try again.
        </p>
      </div>

      <section className="space-y-3">
        <LabeledBlock label="Your side">
          <div className="flex gap-2">
            {(['w', 'b'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update('userColor', c)}
                className={`flex-1 rounded-md border px-2 py-1 text-xs transition ${
                  settings.userColor === c
                    ? 'border-accent bg-accent/20 text-white'
                    : 'border-white/10 text-neutral-300 hover:bg-white/5'
                }`}
              >
                {c === 'w' ? 'White' : 'Black'}
              </button>
            ))}
          </div>
        </LabeledBlock>

        <LabeledBlock
          label={
            <span className="flex items-center justify-between">
              Engine ELO <span className="font-mono text-accent">{settings.elo}</span>
            </span>
          }
        >
          <input
            type="range"
            min={800}
            max={2850}
            step={50}
            value={settings.elo}
            onChange={(e) => update('elo', Number(e.target.value))}
            className="w-full accent-[#759900]"
          />
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span>800</span>
            <span>1500</span>
            <span>2200</span>
            <span>2850</span>
          </div>
        </LabeledBlock>

        <LabeledBlock label="Evaluation">
          <Toggle
            on={settings.evalOn}
            onChange={(v) => update('evalOn', v)}
            labelOn="On"
            labelOff="Off"
          />
        </LabeledBlock>

        <LabeledBlock label="Revert on">
          <select
            value={settings.revertAt}
            onChange={(e) => update('revertAt', e.target.value as RevertThreshold)}
            className="w-full rounded-md border border-white/10 bg-panelAlt px-2 py-1 text-xs"
          >
            <option value="off">Off — never revert</option>
            <option value="inaccuracy">Inaccuracy or worse</option>
            <option value="mistake">Mistake or worse</option>
            <option value="blunder">Blunder only</option>
          </select>
        </LabeledBlock>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onNewGame(settings.userColor)}
          className="flex-1 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-black hover:bg-accent/90"
        >
          {inProgress ? 'Restart' : 'Start'}
        </button>
        <button
          type="button"
          onClick={() => onNewGame('random')}
          className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
          title="New game with random side"
        >
          Random
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onHint}
          disabled={!canHint}
          className="flex-1 rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={moves.length === 0}
          className="flex-1 rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export PGN
        </button>
      </div>

      <div className="rounded-md border border-white/10 bg-panelAlt/60 px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Status</span>
          <span className="font-mono text-neutral-200">{status}</span>
        </div>
        {lastClass && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-neutral-400">Last move</span>
            <span className={`font-semibold ${classColor(lastClass)}`}>
              {classLabel(lastClass)}
              {lastLossCp !== null && lastLossCp > 0 && (
                <span className="ml-1 text-neutral-400">(-{lastLossCp}cp)</span>
              )}
            </span>
          </div>
        )}
      </div>

      <MoveList moves={moves} />
    </aside>
  );
}

function LabeledBlock({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  labelOn,
  labelOff,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-xs transition ${
        on ? 'border-accent bg-accent/20 text-white' : 'border-white/10 text-neutral-300 hover:bg-white/5'
      }`}
    >
      <span>{on ? labelOn : labelOff}</span>
      <span
        className={`h-4 w-8 rounded-full transition ${on ? 'bg-accent' : 'bg-neutral-600'} relative`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${
            on ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}
