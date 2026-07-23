/**
 * data-grid build script
 * Bundles src/ → dist/ using esbuild.
 *
 * Outputs:
 *   dist/data-grid.js         CJS  (vanilla core)
 *   dist/data-grid.esm.js     ESM  (vanilla core)
 *   dist/react/index.js       CJS  (React wrapper)
 *   dist/react/index.esm.js   ESM  (React wrapper)
 *   dist/data-grid.css        CSS
 *   dist/index.d.ts           TypeScript types (core)
 *   dist/react/index.d.ts     TypeScript types (React)
 */

'use strict';

const esbuild = require('esbuild');
const fs      = require('fs');
const path    = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ── Clean ─────────────────────────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'react'), { recursive: true });

// ── Shared build options ──────────────────────────────────────────────────
const shared = {
  bundle:   true,
  platform: 'browser',
  target:   ['es2018'],
  external: ['react', 'react-dom', 'react-dom/client'],
  minify:   true,
  sourcemap: false,
};

// ── Core — CJS ────────────────────────────────────────────────────────────
esbuild.buildSync({
  ...shared,
  entryPoints: [path.join(ROOT, 'index.js')],
  format:  'cjs',
  outfile: path.join(DIST, 'data-grid.js'),
  footer:  { js: '// data-grid (CJS)' },
});

// ── Core — ESM ────────────────────────────────────────────────────────────
esbuild.buildSync({
  ...shared,
  entryPoints: [path.join(ROOT, 'index.js')],
  format:  'esm',
  outfile: path.join(DIST, 'data-grid.esm.js'),
  footer:  { js: '// data-grid (ESM)' },
});

// ── React wrapper — CJS ───────────────────────────────────────────────────
esbuild.buildSync({
  ...shared,
  entryPoints: [path.join(ROOT, 'src', 'react', 'index.jsx')],
  format:  'cjs',
  outfile: path.join(DIST, 'react', 'index.js'),
  jsx:     'transform',
  footer:  { js: '// data-grid/react (CJS)' },
});

// ── React wrapper — ESM ───────────────────────────────────────────────────
esbuild.buildSync({
  ...shared,
  entryPoints: [path.join(ROOT, 'src', 'react', 'index.jsx')],
  format:  'esm',
  outfile: path.join(DIST, 'react', 'index.esm.js'),
  jsx:     'transform',
  footer:  { js: '// data-grid/react (ESM)' },
});

// ── CSS ───────────────────────────────────────────────────────────────────
fs.copyFileSync(
  path.join(ROOT, 'src', 'universal-grid.css'),
  path.join(DIST, 'data-grid.css')
);

// ── TypeScript definitions ────────────────────────────────────────────────
fs.copyFileSync(
  path.join(ROOT, 'src', 'index.d.ts'),
  path.join(DIST, 'index.d.ts')
);
fs.copyFileSync(
  path.join(ROOT, 'src', 'react', 'index.d.ts'),
  path.join(DIST, 'react', 'index.d.ts')
);
// Stub so `import 'data-grid/css'` resolves without TS errors
fs.writeFileSync(
  path.join(DIST, 'css.d.ts'),
  '// data-grid/css — side-effect import\ndeclare module \'data-grid/css\' {}\n'
);

// ── Report ────────────────────────────────────────────────────────────────
const files = fs.readdirSync(DIST).concat(
  fs.readdirSync(path.join(DIST, 'react')).map(f => 'react/' + f)
);
const sizes = files.map(f => {
  const full = path.join(DIST, f);
  const stat = fs.statSync(full);
  return `  ${f.padEnd(30)} ${(stat.size / 1024).toFixed(1)} KB`;
});
console.log('\n✅  Build complete!\n');
console.log('dist/\n' + sizes.join('\n') + '\n');
