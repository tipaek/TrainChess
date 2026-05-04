/**
 * Small opening book used to mark moves as "book" so they don't get classified
 * by centipawn loss. Each entry is the SAN sequence from the start position.
 *
 * Coverage is intentionally pragmatic: ~80 main lines through the most common
 * openings to ~10 plies. A move is considered book if the cumulative SAN
 * history is a prefix of any line below.
 */

const LINES: string[][] = [
  // --- 1.e4 e5 ---
  // Italian Game
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O', 'd6', 'c3', 'O-O'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5'], // Two Knights
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'c3', 'd6'],
  // Ruy Lopez (Spanish)
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Nxe4'], // Open Spanish
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O'], // Exchange Spanish
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'], // Berlin
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8'],
  // Scotch
  ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5'],
  // Petrov / Russian Defense
  ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5', 'Bd3'],
  ['e4', 'e5', 'Nf3', 'Nf6', 'd4'],
  // Philidor
  ['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4'],
  // King's Gambit
  ['e4', 'e5', 'f4', 'exf4', 'Nf3'],
  ['e4', 'e5', 'f4', 'd5'], // Falkbeer
  // Vienna
  ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],
  ['e4', 'e5', 'Nc3', 'Nc6'],

  // --- 1.e4 c5 (Sicilian) ---
  // Najdorf
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2'],
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5'],
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3'], // English Attack
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'f3'],
  // Dragon
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2'],
  // Scheveningen
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6'],
  // Sveshnikov
  ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6'],
  // Classical
  ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd6'],
  // Taimanov
  ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6'],
  // Kan
  ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'a6'],
  // Alapin
  ['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4'],
  ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4'],
  // Closed Sicilian
  ['e4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7'],
  // Smith-Morra
  ['e4', 'c5', 'd4', 'cxd4', 'c3'],
  // Rossolimo
  ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'],
  // Moscow
  ['e4', 'c5', 'Nf3', 'd6', 'Bb5+'],

  // --- 1.e4 e6 (French) ---
  ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3'], // Advance
  ['e4', 'e6', 'd4', 'd5', 'Nd2', 'Nf6'], // Tarrasch
  ['e4', 'e6', 'd4', 'd5', 'Nd2', 'c5'],
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'], // Winawer
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'], // Classical
  ['e4', 'e6', 'd4', 'd5', 'exd5', 'exd5'], // Exchange

  // --- 1.e4 c6 (Caro-Kann) ---
  ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'], // Classical
  ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7'], // Karpov
  ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5'], // Advance
  ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5'], // Exchange
  ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4'], // Panov

  // --- Other 1.e4 ---
  ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'], // Pirc
  ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'd6'], // Modern
  ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6'], // Alekhine
  ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'], // Scandinavian
  ['e4', 'd5', 'exd5', 'Nf6'], // Scandinavian Modern

  // --- 1.d4 d5 ---
  // QGD
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'], // Orthodox
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5'], // Exchange
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c6'], // Semi-Slav setup
  ['d4', 'd5', 'c4', 'e6', 'Nf3', 'Nf6', 'Nc3', 'Be7'],
  // QGA
  ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3'],
  ['d4', 'd5', 'c4', 'dxc4', 'e4'],
  // Slav
  ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'], // Slav main
  ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6'], // Semi-Slav
  ['d4', 'd5', 'c4', 'c6', 'cxd5', 'cxd5'], // Slav Exchange
  // London
  ['d4', 'd5', 'Bf4'],
  ['d4', 'Nf6', 'Bf4'],
  // Colle / other
  ['d4', 'd5', 'Nf3', 'Nf6', 'e3'],

  // --- 1.d4 Nf6 ---
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], // Nimzo-Indian
  ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'], // Queen's Indian
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'], // King's Indian
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'], // Grunfeld
  ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6'], // Modern Benoni
  ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'], // Benko
  ['d4', 'Nf6', 'c4', 'e6', 'g3'], // Catalan setup
  ['d4', 'Nf6', 'Bg5'], // Trompowsky
  ['d4', 'Nf6', 'Nf3', 'g6', 'c4', 'Bg7'],

  // --- 1.d4 f5 (Dutch) ---
  ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'g6'], // Leningrad
  ['d4', 'f5', 'c4', 'Nf6', 'Nc3', 'e6'], // Classical Dutch

  // --- 1.d4 b5 (Polish Defense) ---
  ['d4', 'b5'],
  ['d4', 'b5', 'e4'],
  ['d4', 'b5', 'e4', 'Bb7'],
  ['d4', 'b5', 'e4', 'a6'],
  ['d4', 'b5', 'a4'],
  ['d4', 'b5', 'a4', 'Bb7'],
  ['d4', 'b5', 'a4', 'c6'],
  ['d4', 'b5', 'Nf3'],
  ['d4', 'b5', 'Nf3', 'Bb7'],
  ['d4', 'b5', 'c4'],
  ['d4', 'b5', 'c4', 'bxc4'],

  // --- 1.c4 (English) ---
  ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'], // Reversed Sicilian
  ['c4', 'Nf6', 'Nc3', 'e6'],
  ['c4', 'Nf6', 'Nc3', 'g6'],
  ['c4', 'c5', 'Nf3', 'Nf6', 'Nc3'], // Symmetrical
  ['c4', 'e6'],
  ['c4', 'c6'],

  // --- 1.Nf3 ---
  ['Nf3', 'd5', 'g3'], // KIA / Reti
  ['Nf3', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
  ['Nf3', 'd5', 'c4'], // Reti

  // --- Flank / irregular ---
  // Bird's Opening
  ['f4', 'd5', 'Nf3', 'Nf6', 'e3'],
  ['f4', 'd5', 'Nf3', 'g6'],
  ['f4', 'Nf6', 'Nf3', 'g6'],
  // From's Gambit
  ['f4', 'e5', 'fxe5', 'd6'],
  // Sokolsky / Polish / Orangutan (1.b4)
  ['b4', 'e5', 'Bb2', 'Bxb4', 'Bxe5', 'Nf6'],
  ['b4', 'e5', 'Bb2', 'f6', 'e4'],
  ['b4', 'e5', 'Bb2', 'Bxb4', 'Bxe5', 'Nf6', 'Nf3'],
  ['b4', 'e5', 'a3'],
  ['b4', 'd5', 'Bb2', 'Nf6', 'Nf3', 'e6'],
  ['b4', 'd5', 'Bb2', 'Qd6'],
  ['b4', 'Nf6', 'Bb2', 'e6', 'b5'],
  ['b4', 'c6', 'Bb2', 'a5'],
  ['b4', 'c5', 'bxc5'],
  ['b4', 'e6', 'Bb2', 'Nf6', 'a3'],
  ['b4', 'd5', 'Nf3'],
  // Nimzo-Larsen (1.b3)
  ['b3', 'e5', 'Bb2', 'Nc6', 'e3'],
  ['b3', 'd5', 'Bb2', 'Nf6', 'Nf3', 'e6'],
  ['b3', 'Nf6', 'Bb2', 'g6', 'g3'],
  // Van Geet (1.Nc3)
  ['Nc3', 'd5', 'e4'],
  ['Nc3', 'Nf6', 'd4'],
  // Grob
  ['g4', 'd5', 'Bg2', 'Bxg4'],
  // Benko-style / irregular
  ['g3', 'd5', 'Bg2'],
  ['g3', 'e5', 'Bg2', 'd5'],

  // --- Deeper main lines ---
  // Italian — Giuoco Pianissimo & Evans
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'], // Evans Gambit
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4'], // Scotch Gambit
  // Ponziani
  ['e4', 'e5', 'Nf3', 'Nc6', 'c3'],
  // Bishop's Opening
  ['e4', 'e5', 'Bc4', 'Nf6', 'd3'],
  ['e4', 'e5', 'Bc4', 'Nf6', 'Nc3'],
  // Four Knights
  ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bc4'], // Italian Four Knights
  // Ruy Lopez — Marshall
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'c3', 'd5'],
  // Ruy Lopez — Closed deeper
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5'],
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'Na5'],
  // Sicilian — Accelerated & Hyperaccelerated Dragon
  ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'g6'],
  ['e4', 'c5', 'Nf3', 'g6'],
  // Sicilian — Four Knights
  ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Nc6'],
  // Grand Prix Attack
  ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'g6'],
  ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'e6'],
  // Najdorf — deeper Be3 English Attack
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6'],
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6', 'f4'],
  // Dragon — Yugoslav
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6'],
  // Sveshnikov deeper
  ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5'],
  // French — Rubinstein
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4'],
  // French — Burn
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'dxe4'],
  // French — Steinitz
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'e5', 'Nfd7'],
  // Caro-Kann — Two Knights
  ['e4', 'c6', 'Nc3', 'd5', 'Nf3'],
  ['e4', 'c6', 'Nf3', 'd5', 'Nc3'],
  // Caro-Kann — Fantasy
  ['e4', 'c6', 'd4', 'd5', 'f3'],
  // Pirc — Austrian Attack
  ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7'],
  // Pirc — Classical
  ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Nf3', 'Bg7', 'Be2'],
  // Alekhine — Four Pawns
  ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'f4'],
  ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3'], // Modern
  // Scandinavian — 3...Qd8
  ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd8'],
  // Center Game / Danish
  ['e4', 'e5', 'd4', 'exd4', 'Qxd4'],
  ['e4', 'e5', 'd4', 'exd4', 'c3'], // Danish Gambit

  // --- 1.d4 deeper ---
  // QGD — Cambridge Springs
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'Nf3', 'c6', 'e3', 'Qa5'],
  // QGD — Lasker
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'Ne4'],
  // QGD — Tartakower
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6'],
  // Slav — Meran
  ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5'],
  // Slav — Classical
  ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5'],
  // Nimzo — 4.e3 Rubinstein
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3'],
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5'],
  // Nimzo — 4.Qc2 Classical
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2'],
  // Nimzo — 4.a3 Samisch
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'a3', 'Bxc3+', 'bxc3'],
  // KID — Classical
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2'],
  // KID — Samisch
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3'],
  // KID — Four Pawns
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4'],
  // KID — Fianchetto
  ['d4', 'Nf6', 'c4', 'g6', 'g3'],
  // Grunfeld — Exchange
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3'],
  // Grunfeld — Russian
  ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'Nf3', 'Bg7', 'Qb3'],
  // QID — Petrosian
  ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'a3'],
  // Bogo-Indian
  ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'Bb4+'],
  // Modern Benoni — Main
  ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6'],
  // Catalan — Open
  ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'dxc4'],
  // London deeper
  ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5'],
  ['d4', 'Nf6', 'Bf4', 'g6', 'Nf3', 'Bg7'],
  // Torre Attack
  ['d4', 'Nf6', 'Nf3', 'e6', 'Bg5'],
  // Blackmar-Diemer
  ['d4', 'd5', 'e4'],
  ['d4', 'd5', 'e4', 'dxe4', 'Nc3', 'Nf6', 'f3'],
  // Stonewall Attack
  ['d4', 'd5', 'e3', 'Nf6', 'Bd3', 'c5', 'c3'],

  // --- 1.c4 English deeper ---
  ['c4', 'e5', 'Nc3', 'Nf6', 'g3'], // Botvinnik-style
  ['c4', 'e5', 'Nc3', 'Nc6', 'Nf3'],
  ['c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'd5'],
  ['c4', 'c5', 'g3'], // Symmetrical fianchetto
  ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6'],
  ['c4', 'e6', 'Nc3', 'd5', 'd4'],
  ['c4', 'c6', 'd4', 'd5'], // Slav move order
  ['c4', 'g6', 'Nc3', 'Bg7', 'd4'],
  ['c4', 'Nf6', 'Nc3', 'g6', 'e4'], // Great Snake
];

/** Strip check / mate / annotation glyphs so user-played SAN matches book SAN. */
function normalize(san: string): string {
  return san.replace(/[+#?!]+$/g, '');
}

/**
 * User-selectable engine repertoire. Each entry is the SAN sequence the
 * engine should try to steer into (alternating White/Black moves from the
 * starting position). The orchestrator plays book[history.length] whenever
 * the engine is to move and the played history is an exact prefix.
 *
 * `forSide` is informational only — it tells the UI which side this opening
 * makes sense for so we can hint at the user when they pick a Black defense
 * while playing Black themselves (the engine wouldn't get to play it).
 */
export interface OpeningChoice {
  id: string;
  name: string;
  group: 'free' | 'white' | 'black';
  /** SAN sequence from the starting position. Engine plays its plies; user
   *  plies are required for the line to apply. */
  moves: string[];
}

export const OPENING_CHOICES: OpeningChoice[] = [
  { id: 'free', name: 'Free choice (no forcing)', group: 'free', moves: [] },

  // ---- White first moves (engine as White, or just the first move) ----
  { id: 'w-e4', name: '1. e4 (King’s Pawn)', group: 'white', moves: ['e4'] },
  { id: 'w-d4', name: '1. d4 (Queen’s Pawn)', group: 'white', moves: ['d4'] },
  { id: 'w-c4', name: '1. c4 (English)', group: 'white', moves: ['c4'] },
  { id: 'w-nf3', name: '1. Nf3 (Réti)', group: 'white', moves: ['Nf3'] },
  { id: 'w-b4', name: '1. b4 (Polish / Sokolsky)', group: 'white', moves: ['b4'] },
  { id: 'w-b3', name: '1. b3 (Nimzo-Larsen)', group: 'white', moves: ['b3'] },
  { id: 'w-f4', name: '1. f4 (Bird’s)', group: 'white', moves: ['f4'] },
  { id: 'w-kg', name: 'King’s Gambit', group: 'white', moves: ['e4', 'e5', 'f4'] },

  // ---- Black defenses (engine as Black) ----
  // vs 1.e4
  { id: 'b-sicilian', name: 'Sicilian (1…c5)', group: 'black', moves: ['e4', 'c5'] },
  { id: 'b-french', name: 'French (1…e6)', group: 'black', moves: ['e4', 'e6'] },
  { id: 'b-caro', name: 'Caro-Kann (1…c6)', group: 'black', moves: ['e4', 'c6'] },
  { id: 'b-scandi', name: 'Scandinavian (1…d5)', group: 'black', moves: ['e4', 'd5'] },
  { id: 'b-pirc', name: 'Pirc (1…d6)', group: 'black', moves: ['e4', 'd6'] },
  { id: 'b-modern', name: 'Modern (1…g6)', group: 'black', moves: ['e4', 'g6'] },
  { id: 'b-alekhine', name: 'Alekhine (1…Nf6)', group: 'black', moves: ['e4', 'Nf6'] },
  { id: 'b-e5', name: 'Open Game (1…e5)', group: 'black', moves: ['e4', 'e5'] },
  // vs 1.d4
  { id: 'b-kid', name: 'King’s Indian (vs 1.d4)', group: 'black', moves: ['d4', 'Nf6', 'c4', 'g6'] },
  { id: 'b-nimzo', name: 'Nimzo-Indian (vs 1.d4)', group: 'black', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { id: 'b-grunfeld', name: 'Grünfeld (vs 1.d4)', group: 'black', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'] },
  { id: 'b-qid', name: 'Queen’s Indian (vs 1.d4)', group: 'black', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
  { id: 'b-qgd', name: 'Queen’s Gambit Declined (vs 1.d4)', group: 'black', moves: ['d4', 'd5', 'c4', 'e6'] },
  { id: 'b-slav', name: 'Slav (vs 1.d4)', group: 'black', moves: ['d4', 'd5', 'c4', 'c6'] },
  { id: 'b-dutch', name: 'Dutch (1…f5 vs 1.d4)', group: 'black', moves: ['d4', 'f5'] },
  { id: 'b-benko', name: 'Benko Gambit (vs 1.d4)', group: 'black', moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'] },
  { id: 'b-polish-def', name: 'Polish Defense (1.d4 b5)', group: 'black', moves: ['d4', 'b5'] },
];

export const OPENING_BY_ID: Record<string, OpeningChoice> = Object.fromEntries(
  OPENING_CHOICES.map((o) => [o.id, o]),
);

/**
 * If the engine is to play next and `historySan` exactly matches the prefix
 * of `opening.moves`, return the next forced SAN. Otherwise null.
 */
export function nextOpeningMove(
  opening: OpeningChoice | undefined,
  historySan: string[],
): string | null {
  if (!opening || opening.moves.length === 0) return null;
  if (historySan.length >= opening.moves.length) return null;
  for (let i = 0; i < historySan.length; i++) {
    if (normalize(historySan[i]) !== normalize(opening.moves[i])) return null;
  }
  return opening.moves[historySan.length];
}

/**
 * Returns true if `history` (full SAN list from start) is a prefix of any known
 * opening line. Always true for the empty position.
 */
export function isBookHistory(history: string[]): boolean {
  if (history.length === 0) return true;
  const norm = history.map(normalize);
  for (const line of LINES) {
    if (line.length < norm.length) continue;
    let ok = true;
    for (let i = 0; i < norm.length; i++) {
      if (line[i] !== norm[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}
