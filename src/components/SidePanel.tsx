'use client';

import type {
  Color,
  GameSettings,
  HintQuality,
  MoveClass,
  PlayedMove,
  RevertThreshold,
} from '@/lib/types';
import { classColor, classLabel } from '@/lib/classify';
import { OPENING_CHOICES } from '@/lib/openings';
import { MoveList } from './MoveList';

export interface ReviewLines {
  playedSan: string;
  playedClass: MoveClass;
  lossCp?: number;
  engineLine: string;
}

interface SidePanelProps {
  settings: GameSettings;
  onSettingsChange: (next: GameSettings) => void;
  onNewGame: (side: Color) => void;
  onHint: () => void;
  onExport: () => void;
  canHint: boolean;
  inProgress: boolean;
  moves: PlayedMove[];
  lastClass: MoveClass | null;
  lastLossCp: number | null;
  status: string;
  exportToast: string | null;
  viewIndex: number | null;
  onMoveClick: (index: number) => void;
  onPrevMistake: () => void;
  onNextMistake: () => void;
  onReturnLive: () => void;
  hasMistakes: boolean;
  review: ReviewLines | null;
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
    exportToast,
    viewIndex,
    onMoveClick,
    onPrevMistake,
    onNextMistake,
    onReturnLive,
    hasMistakes,
    review,
  } = props;

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <aside className="flex h-full w-full select-none flex-col gap-3 rounded-xl bg-panel p-4 text-sm shadow-xl">
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
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition ${
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
          <Toggle on={settings.evalOn} onChange={(v) => update('evalOn', v)} />
        </LabeledBlock>

        <LabeledBlock label="Revert on">
          <select
            value={settings.revertAt}
            onChange={(e) => update('revertAt', e.target.value as RevertThreshold)}
            className="w-full rounded-md border border-white/10 bg-panelAlt px-2 py-1.5 text-xs"
          >
            <option value="off">Off — never revert</option>
            <option value="inaccuracy">Inaccuracy or worse</option>
            <option value="mistake">Mistake or worse</option>
            <option value="blunder">Blunder only</option>
          </select>
        </LabeledBlock>

        <LabeledBlock label="Hint strictness">
          <select
            value={settings.hintQuality}
            onChange={(e) => update('hintQuality', e.target.value as HintQuality)}
            className="w-full rounded-md border border-white/10 bg-panelAlt px-2 py-1.5 text-xs"
          >
            <option value="best">Best only</option>
            <option value="excellent">Excellent or better</option>
            <option value="good">Good or better</option>
          </select>
        </LabeledBlock>

        <LabeledBlock label="Premoves">
          <Toggle on={settings.allowPremoves} onChange={(v) => update('allowPremoves', v)} />
        </LabeledBlock>

        <LabeledBlock label="Opponent opening">
          <select
            value={settings.openingId}
            onChange={(e) => update('openingId', e.target.value)}
            className="w-full rounded-md border border-white/10 bg-panelAlt px-2 py-1.5 text-xs"
          >
            <optgroup label="Free choice">
              {OPENING_CHOICES.filter((o) => o.group === 'free').map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Engine as White">
              {OPENING_CHOICES.filter((o) => o.group === 'white').map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Engine as Black">
              {OPENING_CHOICES.filter((o) => o.group === 'black').map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="mt-1 text-[10px] leading-tight text-neutral-500">
            Engine plays this line when the position fits, then continues normally.
          </p>
        </LabeledBlock>
      </section>

      <button
        type="button"
        onClick={() => onNewGame(settings.userColor)}
        className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-black hover:bg-accent/90"
      >
        {inProgress ? 'Restart game' : 'Start game'}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onHint}
          disabled={!canHint}
          className="flex-1 rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hint
        </button>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={onExport}
            disabled={moves.length === 0}
            className="w-full rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy PGN
          </button>
          {exportToast && (
            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-black shadow">
              {exportToast}
            </span>
          )}
        </div>
      </div>

      {/* Review navigation: prev/next mistake + back-to-live */}
      {(hasMistakes || viewIndex !== null) && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrevMistake}
            disabled={!hasMistakes}
            className="flex-1 rounded-md border border-white/10 bg-panelAlt/60 px-2 py-1.5 text-[11px] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            title="Previous mistake"
          >
            ← Prev mistake
          </button>
          <button
            type="button"
            onClick={onNextMistake}
            disabled={!hasMistakes || viewIndex === null}
            className="flex-1 rounded-md border border-white/10 bg-panelAlt/60 px-2 py-1.5 text-[11px] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            title="Next mistake"
          >
            Next mistake →
          </button>
          <button
            type="button"
            onClick={onReturnLive}
            disabled={viewIndex === null}
            className="rounded-md border border-white/10 bg-panelAlt/60 px-2 py-1.5 text-[11px] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            title="Return to live position"
          >
            Live
          </button>
        </div>
      )}

      {review && <ReviewCard review={review} />}

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
              {lastClass !== 'book' && lastLossCp !== null && lastLossCp > 0 && (
                <span className="ml-1 text-neutral-400">(-{lastLossCp}cp)</span>
              )}
            </span>
          </div>
        )}
      </div>

      <MoveList moves={moves} viewIndex={viewIndex} onMoveClick={onMoveClick} />
    </aside>
  );
}

function ReviewCard({ review }: { review: ReviewLines }) {
  const { playedSan, playedClass, lossCp, engineLine } = review;
  return (
    <div className="space-y-1.5 rounded-md border border-amber-400/30 bg-amber-500/5 px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">Reviewing</span>
        <span className={`font-semibold ${classColor(playedClass)}`}>
          {classLabel(playedClass)}
          {lossCp !== undefined && lossCp > 0 && (
            <span className="ml-1 text-neutral-400">(-{lossCp}cp)</span>
          )}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-neutral-400">You played</span>
        <span className={`font-mono ${classColor(playedClass)}`}>{playedSan}</span>
      </div>
      {engineLine && (
        <div>
          <div className="text-neutral-400">Engine line</div>
          <div className="mt-0.5 font-mono text-neutral-200">{engineLine}</div>
        </div>
      )}
    </div>
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

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-xs transition ${
        on ? 'border-accent bg-accent/20 text-white' : 'border-white/10 text-neutral-300 hover:bg-white/5'
      }`}
    >
      <span>{on ? 'On' : 'Off'}</span>
      <span className={`relative h-4 w-8 rounded-full transition ${on ? 'bg-accent' : 'bg-neutral-600'}`}>
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${
            on ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}
