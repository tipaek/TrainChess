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

  // --- Other ---
  ['b3'], // Larsen
  ['g3'], // Benko Opening
];

/** Strip check / mate / annotation glyphs so user-played SAN matches book SAN. */
function normalize(san: string): string {
  return san.replace(/[+#?!]+$/g, '');
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
