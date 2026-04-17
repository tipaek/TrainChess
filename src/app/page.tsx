'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type BoardOverlay, type BoardRef } from '@/components/Board';
import { SidePanel } from '@/components/SidePanel';
import { EvalBar } from '@/components/EvalBar';
import { classifyMove, hintMaxLoss, shouldRevert } from '@/lib/classify';
import { isBookHistory } from '@/lib/openings';
import { buildPgn, downloadPgn } from '@/lib/pgn';
import { createEngine, strengthForElo, type Engine } from '@/lib/engine';
import type {
  Color,
  EnginePv,
  GameSettings,
  MoveClass,
  PlayedMove,
  WhiteEval,
} from '@/lib/types';
import { toWhiteEval } from '@/lib/types';

type Phase = 'idle' | 'userTurn' | 'classifying' | 'engineTurn' | 'reverting' | 'gameOver';

const CLASSIFY_DEPTH = 14;
const HINT_DEPTH = 14;
const EVAL_DEPTH = 14;
const HINT_MULTIPV = 6;
const MAX_HINT_SQUARES = 3;
const REVERT_HOLD_MS = 1400;
const TOAST_MS = 1600;
// Minimum visible "thinking" time for the engine. At low ELOs the search
// returns almost instantly, which feels off — pad the move so it reads like
// the engine is actually considering the position.
const MIN_ENGINE_THINK_MS = 500;

const DEFAULT_SETTINGS: GameSettings = {
  userColor: 'w',
  elo: 1500,
  evalOn: true,
  revertAt: 'inaccuracy',
  hintQuality: 'excellent',
  allowPremoves: false,
};

function sideFromFen(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

type Outcome = 'win' | 'loss' | 'draw';

function gameOutcome(result: string, userColor: Color): Outcome {
  if (result === '1/2-1/2') return 'draw';
  if (result === '1-0') return userColor === 'w' ? 'win' : 'loss';
  if (result === '0-1') return userColor === 'b' ? 'win' : 'loss';
  return 'draw';
}

function GameOverOverlay({
  label,
  result,
  outcome,
  onNewGame,
  onReview,
  onExport,
}: {
  label: string;
  result: string;
  outcome: Outcome;
  onNewGame: () => void;
  onReview: () => void;
  onExport: () => void;
}) {
  const accent =
    outcome === 'win'
      ? 'text-emerald-300'
      : outcome === 'loss'
        ? 'text-red-300'
        : 'text-slate-200';
  const headline = outcome === 'win' ? 'You won' : outcome === 'loss' ? 'You lost' : 'Draw';
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-xl border border-white/10 bg-panel p-5 text-center shadow-2xl">
        <div className={`text-2xl font-bold ${accent}`}>{headline}</div>
        <div className="mt-1 text-sm text-neutral-300">{label}</div>
        <div className="mt-1 font-mono text-xs text-neutral-500">{result}</div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onNewGame}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-black hover:bg-accent/90"
          >
            New game
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReview}
              className="flex-1 rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
            >
              Review
            </button>
            <button
              type="button"
              onClick={onExport}
              className="flex-1 rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
            >
              Export PGN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert the first `maxMoves` UCI moves of a principal variation into
 * from/to arrow pairs by replaying them on a scratch board. Stops early if a
 * move is malformed or illegal.
 */
function planArrows(
  fen: string,
  pv: string[] | undefined,
  maxMoves: number,
): { from: string; to: string }[] {
  if (!pv || pv.length === 0) return [];
  const scratch = new Chess(fen);
  const out: { from: string; to: string }[] = [];
  for (let i = 0; i < Math.min(maxMoves, pv.length); i++) {
    const uci = pv[i];
    if (!uci || uci.length < 4) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    try {
      const played = scratch.move({ from, to, promotion });
      if (!played) break;
      out.push({ from: played.from, to: played.to });
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Pick one of the top candidate PVs at random among those within `tolCp` of
 * the best score. Returns its UCI string, or null if no candidates exist.
 */
function pickCandidate(pvs: EnginePv[], tolCp: number): string | null {
  const usable = pvs.filter((p) => p.bestMove);
  if (usable.length === 0) return null;
  if (usable.length === 1 || tolCp <= 0) return usable[0].bestMove!;
  const score = (p: EnginePv) =>
    p.mate !== null ? (p.mate > 0 ? 1_000_000 - p.mate : -1_000_000 - p.mate) : p.cp ?? 0;
  const best = score(usable[0]);
  const pool = usable.filter((p) => best - score(p) <= tolCp);
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return chosen.bestMove!;
}

export default function Page() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fen, setFen] = useState<string>(new Chess().fen());
  const [overlay, setOverlay] = useState<BoardOverlay>({});
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [whiteEval, setWhiteEval] = useState<WhiteEval | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [lastClass, setLastClass] = useState<MoveClass | null>(null);
  const [lastLossCp, setLastLossCp] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<string>('*');
  const [gameOverLabel, setGameOverLabel] = useState<string | null>(null);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // null = live. 0..moves.length = reviewing that ply (0 = start position).
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const chessRef = useRef<Chess>(new Chess());
  const playerEngineRef = useRef<Engine | null>(null);
  const analyzerRef = useRef<Engine | null>(null);
  const runIdRef = useRef(0);
  const preEvalRef = useRef<{ fen: string; pvs: EnginePv[] } | null>(null);
  const boardRef = useRef<BoardRef | null>(null);

  // Board sizing
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  const [boardWidth, setBoardWidth] = useState<number>(480);

  useLayoutEffect(() => {
    const el = boardWrapperRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const side = Math.max(200, Math.floor(Math.min(rect.width, rect.height)));
      setBoardWidth(side);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Lock page scroll while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    const player = createEngine();
    const analyzer = createEngine();
    playerEngineRef.current = player;
    analyzerRef.current = analyzer;
    let cancelled = false;
    (async () => {
      await Promise.all([player.ready(), analyzer.ready()]);
      if (cancelled) return;
      await player.setStrength(DEFAULT_SETTINGS.elo);
      await analyzer.setUnlimited();
      setStatus('Engine ready');
    })();
    return () => {
      cancelled = true;
      player.quit();
      analyzer.quit();
    };
  }, []);

  useEffect(() => {
    playerEngineRef.current?.setStrength(settings.elo);
  }, [settings.elo]);

  const updateBoard = useCallback(() => {
    setFen(chessRef.current.fen());
  }, []);

  const applyWhiteEval = useCallback((pv: EnginePv, sideToMove: Color) => {
    setWhiteEval(toWhiteEval(pv, sideToMove));
  }, []);

  const preAnalyzeUser = useCallback(async () => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;
    const fenSnap = chessRef.current.fen();
    const thisRun = runIdRef.current;
    const stm = sideFromFen(fenSnap);
    const pvs = await analyzer.analyzeMulti(fenSnap, {
      depth: CLASSIFY_DEPTH,
      multipv: HINT_MULTIPV,
    });
    if (thisRun !== runIdRef.current) return;
    preEvalRef.current = { fen: fenSnap, pvs };
    if (pvs[0]) applyWhiteEval(pvs[0], stm);
  }, [applyWhiteEval]);

  const checkGameOver = useCallback((): boolean => {
    const c = chessRef.current;
    if (!c.isGameOver()) return false;
    let result = '1/2-1/2';
    let label = 'Draw';
    if (c.isCheckmate()) {
      const loser = c.turn();
      result = loser === 'w' ? '0-1' : '1-0';
      label = loser === settings.userColor ? 'Checkmate — you lost' : 'Checkmate — you won!';
    } else if (c.isStalemate()) label = 'Stalemate';
    else if (c.isThreefoldRepetition()) label = 'Draw by repetition';
    else if (c.isInsufficientMaterial()) label = 'Draw — insufficient material';
    else if (c.isDraw()) label = 'Draw';
    setGameResult(result);
    setStatus(label);
    setGameOverLabel(label);
    setGameOverDismissed(false);
    setPhase('gameOver');
    return true;
  }, [settings.userColor]);

  const playEngineMove = useCallback(async () => {
    const engine = playerEngineRef.current;
    if (!engine) return;
    const thisRun = runIdRef.current;
    setPhase('engineTurn');
    setStatus('Engine thinking…');
    const fenSnapshot = chessRef.current.fen();
    const tier = strengthForElo(settings.elo);
    // Widen the candidate pool in the opening so games don't all look the
    // same — but stay within a small cp tolerance so we're still picking
    // among engine-approved moves, not playing random stuff.
    const plies = chessRef.current.history().length;
    const inOpening = plies < 12;
    const multipv = Math.min(6, inOpening ? Math.max(tier.multipv, 4) : tier.multipv);
    const randomCp = inOpening ? Math.max(tier.randomCp, 30) : tier.randomCp;

    const startedAt = Date.now();
    const pvs = await engine.analyzeMulti(fenSnapshot, {
      depth: tier.depth,
      movetime: tier.movetime,
      multipv,
    });
    if (thisRun !== runIdRef.current) return;
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_ENGINE_THINK_MS) {
      await new Promise((r) => setTimeout(r, MIN_ENGINE_THINK_MS - elapsed));
      if (thisRun !== runIdRef.current) return;
    }
    const pick = pickCandidate(pvs, randomCp);
    if (!pick) {
      checkGameOver();
      return;
    }
    const from = pick.slice(0, 2);
    const to = pick.slice(2, 4);
    const promotion = pick.length > 4 ? pick.slice(4, 5) : undefined;
    const fenBeforeEngine = chessRef.current.fen();
    let engineMove;
    try {
      engineMove = chessRef.current.move({ from, to, promotion });
    } catch {
      return;
    }
    const fenAfterEngine = chessRef.current.fen();
    const enginePlayed: PlayedMove = {
      san: engineMove.san,
      from: engineMove.from,
      to: engineMove.to,
      fenBefore: fenBeforeEngine,
      fenAfter: fenAfterEngine,
      moverColor: settings.userColor === 'w' ? 'b' : 'w',
    };
    setMoves((m) => [...m, enginePlayed]);
    updateBoard();
    setOverlay({ lastMove: { from, to } });
    if (checkGameOver()) return;
    setPhase('userTurn');
    setStatus('Your move');
    preEvalRef.current = null;
    preAnalyzeUser();
  }, [settings.elo, updateBoard, preAnalyzeUser, checkGameOver]);

  const clearSelection = useCallback(() => {
    setOverlay((o) => ({ ...o, selected: undefined, legalDests: undefined }));
  }, []);

  const legalDestsFor = useCallback((square: string) => {
    const chess = chessRef.current;
    try {
      const ms = chess.moves({
        square: square as Parameters<typeof chess.moves>[0]['square'],
        verbose: true,
      }) as Array<{ to: string; flags: string; captured?: string }>;
      return ms.map((m) => ({ square: m.to, capture: Boolean(m.captured) || m.flags.includes('e') }));
    } catch {
      return [];
    }
  }, []);

  const showLegalMovesFor = useCallback(
    (square: string) => {
      const chess = chessRef.current;
      const piece = chess.get(square as Parameters<typeof chess.get>[0]);
      if (!piece || piece.color !== settings.userColor) return false;
      const dests = legalDestsFor(square);
      if (dests.length === 0) return false;
      setOverlay((o) => ({ ...o, selected: square, legalDests: dests }));
      return true;
    },
    [legalDestsFor, settings.userColor],
  );

  const submitUserMove = useCallback(
    (from: string, to: string): boolean => {
      if (phase !== 'userTurn') return false;
      if (chessRef.current.turn() !== settings.userColor) return false;

      const fenBefore = chessRef.current.fen();
      let move;
      try {
        move = chessRef.current.move({ from, to, promotion: 'q' });
      } catch {
        return false;
      }
      if (!move) return false;

      updateBoard();
      setOverlay({ lastMove: { from: move.from, to: move.to } });
      setPhase('classifying');
      setStatus('Analyzing…');

      const thisRun = runIdRef.current;
      const fenAfter = chessRef.current.fen();
      const afterStm = sideFromFen(fenAfter);

      const playedUci = `${move.from}${move.to}${move.promotion ?? ''}`;
      const inBook = isBookHistory(chessRef.current.history());

      (async () => {
        const analyzer = analyzerRef.current;
        if (!analyzer) return;

        const preCached = preEvalRef.current;
        const prePromise =
          preCached && preCached.fen === fenBefore
            ? Promise.resolve(preCached.pvs)
            : analyzer.analyzeMulti(fenBefore, { depth: CLASSIFY_DEPTH, multipv: HINT_MULTIPV });
        const postPromise = analyzer.analyze(fenAfter, { depth: CLASSIFY_DEPTH });
        const [prePvs, post] = await Promise.all([prePromise, postPromise]);
        if (thisRun !== runIdRef.current) return;

        const pre = prePvs[0] ?? { cp: null, mate: null, bestMove: null, pv: [] };
        const classified = classifyMove(pre, post, playedUci);
        const cls: MoveClass = inBook ? 'book' : classified.cls;
        const lossCp = classified.lossCp;
        setLastClass(cls);
        setLastLossCp(lossCp);
        applyWhiteEval({ ...post, rank: 1 }, afterStm);

        if (shouldRevert(cls, settings.revertAt)) {
          setStatus(`${cls[0].toUpperCase() + cls.slice(1)} — try again`);
          // Show the engine's planned continuation from the position AFTER the
          // bad move — up to four plies, so the player sees the refutation
          // plus the next couple of moves in the plan.
          const plan = planArrows(fenAfter, post.pv, 4);
          setOverlay({
            lastMove: { from: move.from, to: move.to },
            badMove: { from: move.from, to: move.to },
            opponentPlan: plan,
          });
          setPhase('reverting');
          // A queued premove no longer corresponds to the same situation after revert.
          boardRef.current?.clearPremoves();

          await new Promise((r) => setTimeout(r, REVERT_HOLD_MS));
          if (thisRun !== runIdRef.current) return;
          chessRef.current.undo();
          updateBoard();
          setOverlay({});
          preEvalRef.current = { fen: fenBefore, pvs: prePvs };
          if (prePvs[0]) applyWhiteEval(prePvs[0], sideFromFen(fenBefore));
          setPhase('userTurn');
          setStatus('Your move');
          return;
        }

        const played: PlayedMove = {
          san: move.san,
          from: move.from,
          to: move.to,
          fenBefore,
          fenAfter,
          moverColor: settings.userColor,
          moveClass: cls,
          lossCp,
        };
        setMoves((m) => [...m, played]);

        if (checkGameOver()) return;
        await playEngineMove();
      })();

      return true;
    },
    [phase, settings, updateBoard, playEngineMove, checkGameOver, applyWhiteEval],
  );

  const onDrop = useCallback(
    (from: string, to: string): boolean => {
      clearSelection();
      return submitUserMove(from, to);
    },
    [submitUserMove, clearSelection],
  );

  const onPieceDragBegin = useCallback(
    (square: string) => {
      showLegalMovesFor(square);
    },
    [showLegalMovesFor],
  );

  const onPieceDragEnd = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const onSquareClick = useCallback(
    (square: string) => {
      if (phase !== 'userTurn') return;
      const selected = overlay.selected;

      if (selected) {
        if (selected === square) {
          clearSelection();
          return;
        }
        const ok = submitUserMove(selected, square);
        if (ok) return;
        // Not a legal destination; maybe selecting another own piece.
      }

      if (!showLegalMovesFor(square)) clearSelection();
    },
    [phase, overlay.selected, submitUserMove, showLegalMovesFor, clearSelection],
  );

  const newGame = useCallback(
    (side: Color) => {
      runIdRef.current += 1;
      chessRef.current = new Chess();
      setSettings((s) => ({ ...s, userColor: side }));
      setFen(chessRef.current.fen());
      setMoves([]);
      setOverlay({});
      setViewIndex(null);
      setLastClass(null);
      setLastLossCp(null);
      setWhiteEval(null);
      setGameResult('*');
      setGameOverLabel(null);
      setGameOverDismissed(false);
      preEvalRef.current = null;
      boardRef.current?.clearPremoves();
      setDrawerOpen(false);

      const playerEngine = playerEngineRef.current;
      const analyzer = analyzerRef.current;
      if (!playerEngine || !analyzer) return;
      (async () => {
        await Promise.all([playerEngine.newGame(), analyzer.newGame()]);
        await playerEngine.setStrength(settings.elo);
        if (side === 'w') {
          setPhase('userTurn');
          setStatus('Your move');
          preAnalyzeUser();
        } else {
          await playEngineMove();
        }
      })();
    },
    [settings.elo, playEngineMove, preAnalyzeUser],
  );

  const handleHint = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer || phase !== 'userTurn') return;
    const thisRun = runIdRef.current;
    const fenSnap = chessRef.current.fen();
    setStatus('Thinking…');

    const compute = (pvs: EnginePv[]) => {
      if (!pvs.length) return;
      const bestScalar = (() => {
        const top = pvs[0];
        if (top.mate !== null) return top.mate > 0 ? 100000 - top.mate : -100000 - top.mate;
        return top.cp ?? 0;
      })();
      const maxLoss = hintMaxLoss(settings.hintQuality);
      const seen = new Set<string>();
      const sources: string[] = [];
      for (const pv of pvs) {
        if (!pv.bestMove || pv.bestMove.length < 4) continue;
        const scalar =
          pv.mate !== null
            ? pv.mate > 0
              ? 100000 - pv.mate
              : -100000 - pv.mate
            : (pv.cp ?? 0);
        const loss = Math.max(0, bestScalar - scalar);
        if (loss > maxLoss) continue;
        const from = pv.bestMove.slice(0, 2);
        if (seen.has(from)) continue;
        seen.add(from);
        sources.push(from);
        if (sources.length >= MAX_HINT_SQUARES) break;
      }
      setOverlay((o) => ({ ...o, hintSquares: sources }));
    };

    const cached = preEvalRef.current;
    if (cached && cached.fen === fenSnap) {
      compute(cached.pvs);
      setStatus('Your move');
      return;
    }
    analyzer
      .analyzeMulti(fenSnap, { depth: HINT_DEPTH, multipv: HINT_MULTIPV })
      .then((pvs) => {
        if (thisRun !== runIdRef.current) return;
        if (chessRef.current.fen() !== fenSnap) return;
        preEvalRef.current = { fen: fenSnap, pvs };
        if (pvs[0]) applyWhiteEval(pvs[0], sideFromFen(fenSnap));
        compute(pvs);
        setStatus('Your move');
      });
  }, [phase, settings.hintQuality, applyWhiteEval]);

  const handleExport = useCallback(async () => {
    const snapshot = new Chess();
    for (const m of moves) {
      snapshot.move(m.san);
    }
    const result = gameResult !== '*' ? gameResult : '*';
    const pgn = buildPgn(snapshot, settings, result);
    downloadPgn(pgn);
    try {
      await navigator.clipboard.writeText(pgn);
      setExportToast('PGN copied + downloaded');
    } catch {
      setExportToast('PGN downloaded');
    }
    setTimeout(() => setExportToast(null), TOAST_MS);
  }, [moves, settings, gameResult]);

  const reviewing = viewIndex !== null;
  const boardDisabled = phase !== 'userTurn' || reviewing;
  const showEval = settings.evalOn;
  const evalForBar = useMemo(() => (showEval ? whiteEval : null), [showEval, whiteEval]);

  // Scrubbed-to-history position: show the board at the reviewed ply. The
  // live move handlers are disabled via `boardDisabled` so the user can't
  // accidentally mutate the real game while browsing.
  const displayFen = useMemo(() => {
    if (viewIndex === null) return fen;
    if (viewIndex === 0) return new Chess().fen();
    return moves[viewIndex - 1]?.fenAfter ?? fen;
  }, [viewIndex, fen, moves]);

  const displayOverlay = useMemo<BoardOverlay>(() => {
    if (viewIndex === null) return overlay;
    if (viewIndex === 0) return {};
    const m = moves[viewIndex - 1];
    return m ? { lastMove: { from: m.from, to: m.to } } : {};
  }, [viewIndex, overlay, moves]);

  // Snap back to live whenever a new move is appended so the player isn't
  // stranded in the past after the engine replies.
  const lastLiveLenRef = useRef(moves.length);
  useEffect(() => {
    if (moves.length > lastLiveLenRef.current) setViewIndex(null);
    lastLiveLenRef.current = moves.length;
  }, [moves.length]);

  // Arrow-key history navigation, chess.com style. Ignored while typing in a
  // form control so sliders/selects keep their own keyboard behavior.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft') {
        setViewIndex((v) => {
          const cur = v ?? moves.length;
          return Math.max(0, cur - 1);
        });
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        setViewIndex((v) => {
          if (v === null) return null;
          const next = v + 1;
          return next >= moves.length ? null : next;
        });
        e.preventDefault();
      } else if (e.key === 'ArrowUp' || e.key === 'Home') {
        if (moves.length > 0) setViewIndex(0);
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 'End') {
        setViewIndex(null);
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moves.length]);

  const sidePanel = (
    <SidePanel
      settings={settings}
      onSettingsChange={setSettings}
      onNewGame={newGame}
      onHint={handleHint}
      onExport={handleExport}
      canHint={phase === 'userTurn'}
      inProgress={moves.length > 0 && phase !== 'gameOver'}
      moves={moves}
      lastClass={lastClass}
      lastLossCp={lastLossCp}
      status={reviewing ? `Reviewing ply ${viewIndex} — → to return` : status}
      exportToast={exportToast}
    />
  );

  return (
    <main className="flex h-[100dvh] w-full flex-col gap-2 bg-[#0f0f11] p-2 text-neutral-100 md:flex-row md:gap-4 md:p-4">
      {/* Mobile eval bar (horizontal) */}
      {showEval && (
        <div className="md:hidden">
          <EvalBar whiteEval={evalForBar} bottomColor={settings.userColor} horizontal />
        </div>
      )}

      {/* Desktop eval bar (vertical) */}
      {showEval && (
        <div className="hidden md:flex md:items-stretch">
          <EvalBar whiteEval={evalForBar} bottomColor={settings.userColor} />
        </div>
      )}

      {/* Board — fills remaining space on mobile, shares row on desktop */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          ref={boardWrapperRef}
          className="relative aspect-square w-full max-w-full md:max-h-full md:max-w-full"
          style={{ maxHeight: '100%' }}
        >
          <Board
            ref={boardRef}
            fen={displayFen}
            userColor={settings.userColor}
            disabled={boardDisabled}
            allowPremoves={settings.allowPremoves && !reviewing}
            overlay={displayOverlay}
            onDrop={onDrop}
            onSquareClick={onSquareClick}
            onPieceDragBegin={onPieceDragBegin}
            onPieceDragEnd={onPieceDragEnd}
            boardWidth={boardWidth}
          />
          {phase === 'gameOver' && gameOverLabel && !gameOverDismissed && (
            <GameOverOverlay
              label={gameOverLabel}
              result={gameResult}
              outcome={gameOutcome(gameResult, settings.userColor)}
              onNewGame={() => newGame(settings.userColor)}
              onReview={() => setGameOverDismissed(true)}
              onExport={handleExport}
            />
          )}
        </div>
      </div>

      {/* Mobile bottom action bar */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => newGame(settings.userColor)}
          className="flex-1 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-black hover:bg-accent/90"
        >
          {moves.length > 0 && phase !== 'gameOver' ? 'Restart' : 'Start'}
        </button>
        <button
          type="button"
          onClick={handleHint}
          disabled={phase !== 'userTurn'}
          className="flex-1 rounded-md border border-white/10 bg-panel px-3 py-2 text-xs hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hint
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-md border border-white/10 bg-panel px-3 py-2 text-xs font-semibold hover:bg-white/5"
          aria-label="Open settings"
        >
          ☰ Menu
        </button>
      </div>

      {/* Mobile compact status readout (keeps users oriented without opening the drawer) */}
      <div className="flex items-center justify-between rounded-md border border-white/10 bg-panelAlt/60 px-3 py-1.5 text-[11px] md:hidden">
        <span className="font-mono text-neutral-300">{status}</span>
        {lastClass && (
          <span className="font-semibold text-neutral-200">{lastClass}</span>
        )}
      </div>

      {/* Desktop side panel */}
      <div className="hidden md:block md:w-[320px] md:max-w-[360px] md:flex-shrink-0">
        {sidePanel}
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[90vw] max-w-[360px] flex-col bg-panel shadow-2xl md:hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <span className="text-sm font-semibold">Settings</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">{sidePanel}</div>
          </div>
        </>
      )}
    </main>
  );
}
