import type { EngineEval, EnginePv } from './types';

type Listener = (line: string) => void;

interface SearchLimits {
  depth?: number;
  movetime?: number;
  multipv?: number;
}

class Engine {
  private worker: Worker;
  private listeners = new Set<Listener>();
  private readyPromise: Promise<void>;
  private busy: Promise<unknown> = Promise.resolve();
  private currentMultiPv = 1;

  constructor() {
    this.worker = new Worker('/stockfish/stockfish.js');
    this.worker.onmessage = (ev) => {
      const line = typeof ev.data === 'string' ? ev.data : String(ev.data);
      for (const l of this.listeners) l(line);
    };
    this.readyPromise = this.exchange('uci', 'uciok').then(async () => {
      await this.sync();
    });
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private onLine(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private exchange(cmd: string, terminator: string): Promise<string[]> {
    return new Promise((resolve) => {
      const lines: string[] = [];
      const off = this.onLine((line) => {
        lines.push(line);
        if (line === terminator || line.startsWith(terminator + ' ')) {
          off();
          resolve(lines);
        }
      });
      this.send(cmd);
    });
  }

  private sync() {
    return this.exchange('isready', 'readyok');
  }

  async ready() {
    await this.readyPromise;
  }

  private queue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.busy.then(task, task);
    this.busy = next.catch(() => undefined);
    return next;
  }

  async setStrength(elo: number) {
    await this.ready();
    const { skill } = strengthForElo(elo);
    await this.queue(async () => {
      // UCI_LimitStrength on SF 17 NNUE is weakly calibrated — Skill Level is
      // the effective knob. Disable LimitStrength so Skill actually applies.
      this.send('setoption name UCI_LimitStrength value false');
      this.send(`setoption name Skill Level value ${skill}`);
      await this.sync();
    });
  }

  async setUnlimited() {
    await this.ready();
    await this.queue(async () => {
      this.send('setoption name UCI_LimitStrength value false');
      this.send('setoption name Skill Level value 20');
      await this.sync();
    });
  }

  async newGame() {
    await this.ready();
    await this.queue(async () => {
      this.send('ucinewgame');
      await this.sync();
    });
  }

  async analyze(fen: string, limits: SearchLimits = {}): Promise<EngineEval> {
    const pvs = await this.analyzeMulti(fen, limits);
    return pvs[0] ?? { cp: null, mate: null, bestMove: null };
  }

  async analyzeMulti(fen: string, limits: SearchLimits = {}): Promise<EnginePv[]> {
    await this.ready();
    return this.queue(() => this.runSearch(fen, limits));
  }

  private async runSearch(fen: string, limits: SearchLimits): Promise<EnginePv[]> {
    const desiredMultiPv = Math.max(1, limits.multipv ?? 1);
    if (desiredMultiPv !== this.currentMultiPv) {
      this.send(`setoption name MultiPV value ${desiredMultiPv}`);
      await this.sync();
      this.currentMultiPv = desiredMultiPv;
    }

    return new Promise((resolve) => {
      // multipv index → latest partial eval
      const latest = new Map<number, { cp: number | null; mate: number | null; pv: string[] }>();
      const ensure = (rank: number) => {
        let v = latest.get(rank);
        if (!v) {
          v = { cp: null, mate: null, pv: [] };
          latest.set(rank, v);
        }
        return v;
      };

      const off = this.onLine((line) => {
        if (line.startsWith('info')) {
          const rankMatch = line.match(/\bmultipv (\d+)/);
          const rank = rankMatch ? Number(rankMatch[1]) : 1;
          const v = ensure(rank);

          const cp = line.match(/\bscore cp (-?\d+)/);
          const mate = line.match(/\bscore mate (-?\d+)/);
          if (cp) {
            v.cp = Number(cp[1]);
            v.mate = null;
          } else if (mate) {
            v.mate = Number(mate[1]);
            v.cp = null;
          }
          const pv = line.match(/\bpv (.+)$/);
          if (pv) v.pv = pv[1].trim().split(/\s+/);
        } else if (line.startsWith('bestmove')) {
          off();
          const ranks = [...latest.keys()].sort((a, b) => a - b);
          const pvs: EnginePv[] = ranks.map((rank) => {
            const v = latest.get(rank)!;
            return {
              rank,
              cp: v.cp,
              mate: v.mate,
              bestMove: v.pv[0] ?? null,
              pv: v.pv,
            };
          });
          // Guarantee at least the bestmove line even if no info arrived.
          if (pvs.length === 0) {
            const m = line.match(/^bestmove\s+(\S+)/);
            const bestMove = m && m[1] !== '(none)' ? m[1] : null;
            pvs.push({ rank: 1, cp: null, mate: null, bestMove, pv: bestMove ? [bestMove] : [] });
          }
          resolve(pvs);
        }
      });

      this.send(`position fen ${fen}`);
      const parts: string[] = ['go'];
      if (limits.depth !== undefined) parts.push(`depth ${limits.depth}`);
      if (limits.movetime !== undefined) parts.push(`movetime ${limits.movetime}`);
      this.send(parts.join(' '));
    });
  }

  stop() {
    this.send('stop');
  }

  quit() {
    try {
      this.send('quit');
    } catch {}
    this.worker.terminate();
  }
}

export type { Engine };

export function createEngine(): Engine {
  return new Engine();
}

/**
 * Map ELO → Stockfish search parameters. Modeled on Lichess's 8-level AI
 * calibration: Skill Level is the primary weakening knob, search depth
 * stays at ≥5 so the engine still sees one-movers, and the candidate-pool
 * randomization (`multipv`/`randomCp`) is kept narrow so it only adds
 * opening variety rather than additional blundering.
 *
 * - `skill`     : UCI Skill Level (0..20).
 * - `depth`     : hard depth cap.
 * - `movetime`  : time budget in ms.
 * - `multipv`   : number of candidate lines retrieved.
 * - `randomCp`  : max cp-loss from best tolerated when random-picking.
 */
export function strengthForElo(elo: number): {
  skill: number;
  depth: number;
  movetime: number;
  multipv: number;
  randomCp: number;
} {
  if (elo <= 850) return { skill: 0, depth: 5, movetime: 50, multipv: 4, randomCp: 50 };
  if (elo <= 1000) return { skill: 2, depth: 5, movetime: 80, multipv: 4, randomCp: 40 };
  if (elo <= 1150) return { skill: 3, depth: 5, movetime: 100, multipv: 4, randomCp: 35 };
  if (elo <= 1300) return { skill: 5, depth: 5, movetime: 130, multipv: 3, randomCp: 30 };
  if (elo <= 1450) return { skill: 7, depth: 5, movetime: 170, multipv: 3, randomCp: 25 };
  if (elo <= 1600) return { skill: 9, depth: 6, movetime: 220, multipv: 3, randomCp: 20 };
  if (elo <= 1750) return { skill: 11, depth: 7, movetime: 300, multipv: 2, randomCp: 15 };
  if (elo <= 1900) return { skill: 13, depth: 8, movetime: 400, multipv: 2, randomCp: 12 };
  if (elo <= 2050) return { skill: 15, depth: 10, movetime: 500, multipv: 2, randomCp: 10 };
  if (elo <= 2200) return { skill: 16, depth: 12, movetime: 600, multipv: 2, randomCp: 8 };
  if (elo <= 2350) return { skill: 17, depth: 14, movetime: 700, multipv: 2, randomCp: 6 };
  if (elo <= 2500) return { skill: 18, depth: 16, movetime: 900, multipv: 1, randomCp: 0 };
  if (elo <= 2700) return { skill: 19, depth: 18, movetime: 1300, multipv: 1, randomCp: 0 };
  return { skill: 20, depth: 22, movetime: 2000, multipv: 1, randomCp: 0 };
}

