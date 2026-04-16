// Copies the single-threaded Stockfish 17.1 lite build into public/stockfish/
// Runs as a postinstall step so the vendored worker is available at /stockfish/stockfish.{js,wasm}.
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgJson = require.resolve('stockfish/package.json');
const srcDir = join(dirname(pkgJson), 'src');
const outDir = join(process.cwd(), 'public', 'stockfish');

const files = readdirSync(srcDir);
const jsName = files.find((f) => /^stockfish-17\.1-lite-single-.*\.js$/.test(f));
const wasmName = files.find((f) => /^stockfish-17\.1-lite-single-.*\.wasm$/.test(f));

if (!jsName || !wasmName) {
  console.error('[copy-stockfish] could not find lite-single build in', srcDir);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(join(srcDir, jsName), join(outDir, 'stockfish.js'));
copyFileSync(join(srcDir, wasmName), join(outDir, 'stockfish.wasm'));

if (!existsSync(join(outDir, 'stockfish.js')) || !existsSync(join(outDir, 'stockfish.wasm'))) {
  console.error('[copy-stockfish] copy failed');
  process.exit(1);
}

console.log('[copy-stockfish] vendored', jsName, '+', wasmName, '→ public/stockfish/');
