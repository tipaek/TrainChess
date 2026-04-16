'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type BoardOverlay } from '@/components/Board';
import { SidePanel } from '@/components/SidePanel';
import { EvalBar } from '@/components/EvalBar';
import { classifyMove, hintMaxLoss, shouldRevert } from '@/lib/classify';
import { buildPgn, downloadPgn } from '@/lib/pgn';
import { createEngine, moveTimeForElo, type Engine } from '@/lib/engine';
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

const DEFAULT_SETTINGS: GameSettings = {
  userColor: 'w',
  elo: 1500,
  evalOn: true,
  revertAt: 'inaccuracy',
  hintQuality: 'excellent',
};

function sideFromFen(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
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
  const [exportToast, setExportToast] = useState<string | null>(null);

  const chessRef = useRef<Chess>(new Chess());
  const playerEngineRef = useRef<Engine | null>(null);
  const analyzerRef = useRef<Engine | null>(null);
  const runIdRef = useRef(0);
  const preEvalRef = useRef<{ fen: string; pvs: EnginePv[] } | null>(null);

  // Board sizing
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  const [boardWidth, setBoardWidth] = useState<number>(480);

  useLayoutEffect(() => {
    const el = boardWrapperRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const side = Math.max(220, Math.floor(Math.min(rect.width, rect.height)));
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
    const w = toWhiteEval(pv, sideToMove);
    setWhiteEval(w);
  }, []);

  const refreshEval = useCallback(async () => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;
    const thisRun = runIdRef.current;
    const fenSnap = chessRef.current.fen();
    const stm = sideFromFen(fenSnap);
    const res = await analyzer.analyze(fenSnap, { depth: EVAL_DEPTH });
    if (thisRun !== runIdRef.current) return;
    if (chessRef.current.fen() !== fenSnap) return;
    applyWhiteEval({ ...res, rank: 1 }, stm);
  }, [applyWhiteEval]);

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
    const res = await engine.analyze(fenSnapshot, {
      movetime: moveTimeForElo(settings.elo),
    });
    if (thisRun !== runIdRef.current) return;
    if (!res.bestMove) {
      checkGameOver();
      return;
    }
    const from = res.bestMove.slice(0, 2);
    const to = res.bestMove.slice(2, 4);
    const promotion = res.bestMove.length > 4 ? res.bestMove.slice(4, 5) : undefined;
    try {
      chessRef.current.move({ from, to, promotion });
    } catch {
      return;
    }
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
      const ms = chess.moves({ square: square as Parameters<typeof chess.moves>[0]['square'], verbose: true }) as Array<{ to: string; flags: string; captured?: string }>;
      return ms.map((m) => ({ square: m.to, capture: Boolean(m.captured) || m.flags.includes('e') }));
    } catch {
      return [];
    }
  }, []);

  // Accept a user move (from/to) and run the classification + engine-reply pipeline.
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

        const pre = prePvs[0] ?? { cp: null, mate: null, bestMove: null };
        const { cls, lossCp } = classifyMove(pre, post);
        setLastClass(cls);
        setLastLossCp(lossCp);
        applyWhiteEval({ ...post, rank: 1 }, afterStm);

        if (shouldRevert(cls, settings.revertAt)) {
          setStatus(`${cls[0].toUpperCase() + cls.slice(1)} — try again`);
          // Show the ENGINE'S best refutation from the position AFTER the bad move.
          // Never reveal what the user should have played.
          const oppUci = post.bestMove;
          const arrow =
            oppUci && oppUci.length >= 4
              ? { from: oppUci.slice(0, 2), to: oppUci.slice(2, 4) }
              : undefined;
          setOverlay({
            lastMove: { from: move.from, to: move.to },
            badMove: { from: move.from, to: move.to },
            opponentArrow: arrow,
          });
          setPhase('reverting');

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

  const onSquareClick = useCallback(
    (square: string) => {
      if (phase !== 'userTurn') return;
      const chess = chessRef.current;
      const selected = overlay.selected;

      if (selected) {
        // Clicking same square deselects
        if (selected === square) {
          clearSelection();
          return;
        }
        // Attempt move
        const ok = submitUserMove(selected, square);
        if (ok) return;
        // Not a legal destination — maybe clicking another own piece
      }

      const piece = chess.get(square as Parameters<typeof chess.get>[0]);
      if (piece && piece.color === settings.userColor && chess.turn() === settings.userColor) {
        const dests = legalDestsFor(square);
        if (dests.length === 0) {
          clearSelection();
          return;
        }
        setOverlay((o) => ({ ...o, selected: square, legalDests: dests }));
      } else {
        clearSelection();
      }
    },
    [phase, overlay.selected, settings.userColor, submitUserMove, legalDestsFor, clearSelection],
  );

  const newGame = useCallback(
    (side: Color) => {
      runIdRef.current += 1;
      chessRef.current = new Chess();
      setSettings((s) => ({ ...s, userColor: side }));
      setFen(chessRef.current.fen());
      setMoves([]);
      setOverlay({});
      setLastClass(null);
      setLastLossCp(null);
      setWhiteEval(null);
      setGameResult('*');
      preEvalRef.current = null;

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
      // Best (from mover's POV) is the top-ranked line.
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
      snapshot.move({ from: m.from, to: m.to, promotion: 'q' });
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

  const boardDisabled = phase !== 'userTurn';
  const showEval = settings.evalOn;
  const evalForBar = useMemo(() => (showEval ? whiteEval : null), [showEval, whiteEval]);

  return (
    <main className="flex min-h-screen w-full flex-col gap-3 bg-[#0f0f11] p-3 text-neutral-100 md:flex-row md:gap-4 md:p-4">
      {/* Mobile horizontal eval bar */}
      {showEval && (
        <div className="md:hidden">
          <EvalBar whiteEval={evalForBar} bottomColor={settings.userColor} horizontal />
        </div>
      )}

      {/* Desktop vertical eval bar */}
      {showEval && (
        <div className="hidden md:flex md:items-stretch">
          <EvalBar whiteEval={evalForBar} bottomColor={settings.userColor} />
        </div>
      )}

      <div className="flex flex-1 items-center justify-center">
        <div
          ref={boardWrapperRef}
          className="relative aspect-square w-full max-w-[min(100vw-1.5rem,calc(100vh-14rem))] md:max-h-full md:max-w-full"
        >
          <Board
            fen={fen}
            userColor={settings.userColor}
            disabled={boardDisabled}
            overlay={overlay}
            onDrop={onDrop}
            onSquareClick={onSquareClick}
            boardWidth={boardWidth}
          />
        </div>
      </div>

      <div className="w-full flex-shrink-0 md:w-[320px] md:max-w-[360px]">
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
          status={status}
          exportToast={exportToast}
        />
      </div>
    </main>
  );
}
