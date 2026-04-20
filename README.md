# TrainChess

Play against Stockfish. Every move gets graded. Set a quality threshold, and the app won't let you play anything worse — your bad move gets undone, the engine shows what it would have punished you with, and you try again until you find something acceptable.

It's the "do it again" loop from a chess coach, except the coach is a 3500-rated engine that never gets tired.

Live site: deploy to Vercel (or any static host) — no backend, no login, no database.

---

## Why

Playing full games against an engine teaches you to survive — not to play well. You lose, but you rarely learn where the game actually turned. TrainChess forces the feedback loop to happen on every move: if you blunder, you feel it immediately, see the refutation, and get the position back to try again.

You pick how strict you want it:

- **Blunder only** — still a game, just with a safety net for disasters.
- **Mistake or worse** — standard training mode.
- **Inaccuracy or worse** — tight filter, you'll be here a while.
- **Best only** (via Hint strictness, for hints) — for masochists.

## Features

- **ELO slider (800–2850)** — Stockfish's `UCI_LimitStrength` so the engine actually plays at a human-like level, not full strength with lowered depth.
- **Per-move classification** — Best / Excellent / Good / Inaccuracy / Mistake / Blunder, based on win-probability loss (chess.com-style) rather than raw centipawns, so a blunder in a winning position isn't graded the same as a blunder on move 4.
- **Revert threshold** — pick the worst move you'll allow yourself to play. Anything below the bar gets undone.
- **Interactive revert** — when your move gets rejected, the board stays on the bad position and shows the engine's punishment line as color-coded arrows (red = forcing, orange = quiet plan) plus the full PGN-notation line. Click **Try again** when you're ready to back up.
- **Hints** — highlights the source square of a good-enough move (destination hidden, so you still have to work). Strictness is configurable.
- **Eval bar + move list** — toggleable, with classification glyphs next to each move.
- **Mistake review** — jump between blunders/mistakes with Prev/Next buttons or arrow keys. Each mistake shows the same arrows + engine line you saw live.
- **Mobile-friendly** — responsive layout, drawer for settings, on-screen move-navigation arrows.
- **PGN export** — one-click copy with standard headers (Event, Date, White/Black, ELO, Result).
- **Fully client-side** — Stockfish runs in a Web Worker in your browser. Nothing is sent anywhere.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- [chess.js](https://github.com/jhlywa/chess.js) for move validation, SAN, PGN
- [react-chessboard](https://github.com/Clariity/react-chessboard) for the board UI
- [Stockfish 17 NNUE](https://stockfishchess.org/) (lite-single WASM build) as a Web Worker

Two engine instances are kept alive: a weakened one picks the opponent's moves, a full-strength analyzer does classification and hints. That avoids re-applying UCI options between calls and keeps latency low.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The `postinstall` hook copies the Stockfish WASM assets into `public/stockfish/` — no manual setup needed.

### Build

```bash
npm run build
npm start
```

### Deploy

Push to any git host connected to Vercel, Netlify, or Cloudflare Pages. There are no env vars, no API routes, no runtime secrets. The Stockfish worker is served as static assets from `public/stockfish/`.

## File layout

```
src/
  app/
    layout.tsx          shell, fonts, dark theme
    page.tsx            game orchestrator — state machine, revert flow
    globals.css
  components/
    Board.tsx           react-chessboard wrapper with overlay arrows/highlights
    SidePanel.tsx       settings + review card + mistake navigation
    MoveList.tsx        SAN list with class glyphs, clickable plies
    EvalBar.tsx         vertical eval bar
  lib/
    engine.ts           Stockfish worker wrapper (UCI promise API, MultiPV)
    classify.ts         win-probability → move class
    pgn.ts              PGN headers + build
    types.ts
public/
  stockfish/            vendored WASM worker
```

## Out of scope

- Accounts, persistence, leaderboards
- Openings trainer, tactics puzzles, analysis board
- Multiplayer
- Cloud analysis (everything is local)

## License

MIT.
