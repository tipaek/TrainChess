'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board, type BoardOverlay } from '@/components/Board';
import { SidePanel } from '@/components/SidePanel';
import { EvalBar } from '@/components/EvalBar';
import { classifyMove, shouldRevert } from '@/lib/classify';
import { buildPgn, downloadPgn } from '@/lib/pgn';
import { createEngine, moveTimeForElo, type Engine } from '@/lib/engine';
import type {
  Color,
  EngineEval,
  GameSettings,
  MoveClass,
  PlayedMove,
} from '@/lib/types';

type Phase = 'idle' | 'userTurn' | 'classifying' | 'engineTurn' | 'reverting' | 'gameOver';

const CLASSIFY_DEPTH = 14;
const HINT_DEPTH = 14;
const EVAL_DEPTH = 12;
const REVERT_HOLD_MS = 1200;

const DEFAULT_SETTINGS: GameSettings = {
  userColor: 'w',
  elo: 1500,
  evalOn: true,
  revertAt: 'inaccuracy',
};

function pickRandomColor(): Color {
  return Math.random() < 0.5 ? 'w' : 'b';
}

export default function Page() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>('idle');
  const [fen, setFen] = useState<string>(new Chess().fen());
  const [overlay, setOverlay] = useState<BoardOverlay>({});
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [evalInfo, setEvalInfo] = useState<EngineEval | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [lastClass, setLastClass] = useState<MoveClass | null>(null);
  const [lastLossCp, setLastLossCp] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<string>('*');

  const chessRef = useRef<Chess>(new Chess());
  const playerEngineRef = useRef<Engine | null>(null);
  const analyzerRef = useRef<Engine | null>(null);
  // Tracks cancellation across async flows when the user restarts mid-think.
  const runIdRef = useRef(0);
  // Cached best-move eval for the position we're about to move in, so we don't
  // re-analyze the same FEN twice per turn.
  const preEvalRef = useRef<{ fen: string; evalInfo: EngineEval } | null>(null);

  // Boot engines once.
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

  // Push new ELO to the player engine when it changes.
  useEffect(() => {
    const engine = playerEngineRef.current;
    if (!engine) return;
    engine.setStrength(settings.elo);
  }, [settings.elo]);

  const sideToMove: Color = chessRef.current.turn();

  const updateBoard = useCallback(() => {
    setFen(chessRef.current.fen());
  }, []);

  const refreshEval = useCallback(async () => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;
    const thisRun = runIdRef.current;
    const snapshotFen = chessRef.current.fen();
    const result = await analyzer.analyze(snapshotFen, { depth: EVAL_DEPTH });
    if (thisRun !== runIdRef.current) return;
    if (chessRef.current.fen() !== snapshotFen) return;
    setEvalInfo(result);
  }, []);

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
      // Shouldn't happen — engine returned an illegal move.
      return;
    }
    updateBoard();
    setOverlay({ lastMove: { from, to } });
    if (checkGameOver()) return;
    setPhase('userTurn');
    setStatus('Your move');
    // Pre-compute best-move eval for the user's next decision.
    preEvalRef.current = null;
    preAnalyzeUser();
    refreshEval();
  }, [settings.elo, updateBoard, refreshEval]);

  const preAnalyzeUser = useCallback(async () => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;
    const fenSnapshot = chessRef.current.fen();
    const thisRun = runIdRef.current;
    const res = await analyzer.analyze(fenSnapshot, { depth: CLASSIFY_DEPTH });
    if (thisRun !== runIdRef.current) return;
    preEvalRef.current = { fen: fenSnapshot, evalInfo: res };
  }, []);

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

  const handleUserMove = useCallback(
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

      (async () => {
        const analyzer = analyzerRef.current;
        if (!analyzer) return;
        const preCached = preEvalRef.current;
        const prePromise =
          preCached && preCached.fen === fenBefore
            ? Promise.resolve(preCached.evalInfo)
            : analyzer.analyze(fenBefore, { depth: CLASSIFY_DEPTH });
        const postPromise = analyzer.analyze(fenAfter, { depth: CLASSIFY_DEPTH });
        const [pre, post] = await Promise.all([prePromise, postPromise]);
        if (thisRun !== runIdRef.current) return;

        const { cls, lossCp } = classifyMove(pre, post);
        setLastClass(cls);
        setLastLossCp(lossCp);
        setEvalInfo(post);

        if (shouldRevert(cls, settings.revertAt)) {
          setStatus(`${cls[0].toUpperCase() + cls.slice(1)} — try again`);
          const bestUci = pre.bestMove;
          const arrow =
            bestUci && bestUci.length >= 4
              ? { from: bestUci.slice(0, 2), to: bestUci.slice(2, 4) }
              : undefined;
          setOverlay({
            lastMove: { from: move.from, to: move.to },
            badMove: { from: move.from, to: move.to },
            bestArrow: arrow,
          });
          setPhase('reverting');

          await new Promise((r) => setTimeout(r, REVERT_HOLD_MS));
          if (thisRun !== runIdRef.current) return;
          chessRef.current.undo();
          updateBoard();
          setOverlay({});
          // Keep preEval cache — same position.
          preEvalRef.current = { fen: fenBefore, evalInfo: pre };
          setPhase('userTurn');
          setStatus('Your move');
          refreshEval();
          return;
        }

        // Accept move: record + let engine reply.
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
    [phase, settings, updateBoard, playEngineMove, checkGameOver, refreshEval],
  );

  const newGame = useCallback(
    (side: Color | 'random') => {
      runIdRef.current += 1;
      const userColor: Color = side === 'random' ? pickRandomColor() : side;
      chessRef.current = new Chess();
      setSettings((s) => ({ ...s, userColor }));
      setFen(chessRef.current.fen());
      setMoves([]);
      setOverlay({});
      setLastClass(null);
      setLastLossCp(null);
      setEvalInfo(null);
      setGameResult('*');
      preEvalRef.current = null;

      const playerEngine = playerEngineRef.current;
      const analyzer = analyzerRef.current;
      if (!playerEngine || !analyzer) return;
      (async () => {
        await Promise.all([playerEngine.newGame(), analyzer.newGame()]);
        await playerEngine.setStrength(settings.elo);

        if (userColor === 'w') {
          setPhase('userTurn');
          setStatus('Your move');
          preAnalyzeUser();
          refreshEval();
        } else {
          await playEngineMove();
        }
      })();
    },
    [settings.elo, playEngineMove, preAnalyzeUser, refreshEval],
  );

  const handleHint = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer || phase !== 'userTurn') return;
    const thisRun = runIdRef.current;
    const fenSnap = chessRef.current.fen();
    setStatus('Thinking…');
    analyzer.analyze(fenSnap, { depth: HINT_DEPTH }).then((res) => {
      if (thisRun !== runIdRef.current) return;
      if (chessRef.current.fen() !== fenSnap) return;
      if (res.bestMove && res.bestMove.length >= 4) {
        setOverlay((o) => ({ ...o, hintSquare: res.bestMove!.slice(0, 2) }));
      }
      preEvalRef.current = { fen: fenSnap, evalInfo: res };
      setStatus('Your move');
    });
  }, [phase]);

  const handleExport = useCallback(() => {
    const snapshot = new Chess();
    for (const m of moves) {
      snapshot.move({ from: m.from, to: m.to, promotion: 'q' });
    }
    const result = gameResult !== '*' ? gameResult : '*';
    const pgn = buildPgn(snapshot, settings, result);
    downloadPgn(pgn);
  }, [moves, settings, gameResult]);

  const boardDisabled = phase !== 'userTurn';

  const evalForBar = useMemo(() => {
    if (!settings.evalOn) return null;
    return evalInfo;
  }, [settings.evalOn, evalInfo]);

  return (
    <main className="flex h-screen w-screen items-stretch gap-4 bg-[#0f0f11] p-4 text-neutral-100">
      {settings.evalOn && (
        <div className="flex items-stretch">
          <EvalBar
            evalInfo={evalForBar}
            sideToMove={sideToMove}
            bottomColor={settings.userColor}
          />
        </div>
      )}

      <div className="flex flex-1 items-center justify-center">
        <div className="aspect-square h-full max-h-full max-w-full">
          <Board
            fen={fen}
            userColor={settings.userColor}
            disabled={boardDisabled}
            overlay={overlay}
            onDrop={handleUserMove}
          />
        </div>
      </div>

      <div className="w-[320px] flex-shrink-0">
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
        />
      </div>
    </main>
  );
}
