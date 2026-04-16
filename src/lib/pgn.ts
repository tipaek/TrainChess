import type { Chess } from 'chess.js';
import type { GameSettings } from './types';

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function dateStamp(d = new Date()) {
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

function fileStamp(d = new Date()) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

export function buildPgn(chess: Chess, settings: GameSettings, result: string): string {
  const engineName = `Stockfish (${settings.elo})`;
  const userName = 'You';
  const white = settings.userColor === 'w' ? userName : engineName;
  const black = settings.userColor === 'b' ? userName : engineName;
  const whiteElo = settings.userColor === 'w' ? '?' : String(settings.elo);
  const blackElo = settings.userColor === 'b' ? '?' : String(settings.elo);

  chess.header(
    'Event', 'TrainChess vs Engine',
    'Site', 'trainchess.local',
    'Date', dateStamp(),
    'White', white,
    'Black', black,
    'WhiteElo', whiteElo,
    'BlackElo', blackElo,
    'Result', result,
  );
  return chess.pgn();
}

export function downloadPgn(pgn: string, filenameBase = 'trainchess') {
  const name = `${filenameBase}-${fileStamp()}.pgn`;
  const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
