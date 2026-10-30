// Strumento per chi sviluppa: controlla che l'elenco FILES di service-worker.js
// contenga esattamente i file dell'app. Uso: node tools/check-sw.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXCLUDE_DIRS = ['Doc', 'tools', '.git', '.claude', 'server'];
const EXCLUDE_FILES = ['README.md', 'CLAUDE.md', 'service-worker.js', '.gitignore', '.nojekyll'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return EXCLUDE_DIRS.includes(name) ? [] : walk(p);
    return EXCLUDE_FILES.includes(name) ? [] : [relative(ROOT, p).split('\\').join('/')];
  });
}

const sw = readFileSync(join(ROOT, 'service-worker.js'), 'utf8');
// Solo le voci dell'elenco FILES (il resto del file contiene altri percorsi, es. la nota delle push)
const block = (sw.match(/const FILES = \[([\s\S]*?)\];/) || [, ''])[1];
const listed = [...block.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]);
const actual = walk(ROOT);
const missing = actual.filter((f) => !listed.includes(f));
const extra = listed.filter((f) => f && !actual.includes(f) && f !== 'service-worker.js');
if (!missing.length && !extra.length) console.log('OK: elenco del service worker completo (' + actual.length + ' file).');
if (missing.length) console.log('Mancano nel service worker:\n  ' + missing.join('\n  '));
if (extra.length) console.log('In elenco ma non esistono:\n  ' + extra.join('\n  '));
process.exit(missing.length || extra.length ? 1 : 0);
