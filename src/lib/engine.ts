import type { EngineEval } from './types';

type Listener = (line: string) => void;

interface SearchLimits {
  depth?: number;
  movetime?: number;
}

class Engine {
  private worker: Worker;
  private listeners = new Set<Listener>();
  private readyPromise: Promise<void>;
  private busy: Promise<unknown> = Promise.resolve();

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

  /** Send a command, resolve when a line starting with `terminator` arrives. */
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

  /** Serialize search requests so concurrent callers don't clobber each other. */
  private queue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.busy.then(task, task);
    this.busy = next.catch(() => undefined);
    return next;
  }

  async setStrength(elo: number) {
    await this.ready();
    await this.queue(async () => {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${Math.round(elo)}`);
      await this.sync();
    });
  }

  async setUnlimited() {
    await this.ready();
    await this.queue(async () => {
      this.send('setoption name UCI_LimitStrength value false');
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

  async analyze(fen: string, limits: SearchLimits): Promise<EngineEval> {
    await this.ready();
    return this.queue(() => this.runSearch(fen, limits));
  }

  private runSearch(fen: string, limits: SearchLimits): Promise<EngineEval> {
    return new Promise((resolve) => {
      let latestCp: number | null = null;
      let latestMate: number | null = null;
      const off = this.onLine((line) => {
        if (line.startsWith('info')) {
          // Only trust multipv 1 lines (default when MultiPV=1).
          const cp = line.match(/score cp (-?\d+)/);
          const mate = line.match(/score mate (-?\d+)/);
          if (cp) {
            latestCp = Number(cp[1]);
            latestMate = null;
          } else if (mate) {
            latestMate = Number(mate[1]);
            latestCp = null;
          }
        } else if (line.startsWith('bestmove')) {
          off();
          const m = line.match(/^bestmove\s+(\S+)/);
          const bestMove = m && m[1] !== '(none)' ? m[1] : null;
          resolve({ cp: latestCp, mate: latestMate, bestMove });
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

/** Map ELO → movetime(ms) for the playing engine. Lower ELO thinks briefly. */
export function moveTimeForElo(elo: number): number {
  if (elo <= 1000) return 250;
  if (elo <= 1500) return 500;
  if (elo <= 2000) return 900;
  if (elo <= 2400) return 1400;
  return 2000;
}
