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
            };
          });
          // Guarantee at least the bestmove line even if no info arrived.
          if (pvs.length === 0) {
            const m = line.match(/^bestmove\s+(\S+)/);
            const bestMove = m && m[1] !== '(none)' ? m[1] : null;
            pvs.push({ rank: 1, cp: null, mate: null, bestMove });
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

/** Map ELO → movetime(ms) for the playing engine. Lower ELO thinks briefly. */
export function moveTimeForElo(elo: number): number {
  if (elo <= 1000) return 250;
  if (elo <= 1500) return 500;
  if (elo <= 2000) return 900;
  if (elo <= 2400) return 1400;
  return 2000;
}
