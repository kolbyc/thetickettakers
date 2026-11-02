import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { build } from '../scripts/build.mjs';

let tmp;
let rootDir;
let outDir;

const PAGE = `<!DOCTYPE html>
<html><head>
<link rel="stylesheet" href="styles/styles.css">
</head><body>
<img data-priority="high" class="landing-image" src="static/images/a.jpg" alt="A">
<img src="static/images/typo.jpg" alt="Missing">
<!--<div class="ticket-option coming-soon">More to come!</div>-->
<script src="javascript/main.js" defer></script>
</body></html>`;

async function write(relativePath, content) {
  const file = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ttt-build-'));
  rootDir = path.join(tmp, 'project');
  outDir = path.join(tmp, 'dist');

  await write('index.html', PAGE);
  await write('styles/styles.css', 'body{}');
  await write('javascript/main.js', 'void 0;');
  await write('_headers', '/static/optimized/*\n  Cache-Control: public, max-age=31536000, immutable\n');
  await write('static/videos/clip.mp4', 'not really a video');
  await write('package.json', '{}');
  await write('scripts/build.mjs', '// should not ship');
  await write('node_modules/dep/index.js', '// should not ship');

  const photo = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#a55' } })
    .jpeg()
    .toBuffer();
  await write('static/images/a.jpg', photo);
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

test('builds an optimized page into the output folder', async () => {
  const result = await build({ rootDir, outDir, log: () => {} });

  const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
  assert.match(html, /srcset="static\/optimized\/static-images-a-480-[0-9a-f]{8}\.webp 480w/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /href="styles\/styles\.css\?v=[0-9a-f]{8}"/);
  assert.match(html, /src="javascript\/main\.js\?v=[0-9a-f]{8}"/);
  assert.match(html, /<!--<div class="ticket-option coming-soon">More to come!<\/div>-->/);

  const optimized = await fs.readdir(path.join(outDir, 'static/optimized'));
  assert.equal(optimized.length, 4);
  assert.equal(result.imageCount, 1);
});

test('copies static files, including originals, and ships the _headers file', async () => {
  await build({ rootDir, outDir, log: () => {} });

  for (const file of ['static/images/a.jpg', 'static/videos/clip.mp4', 'styles/styles.css', '_headers']) {
    await fs.access(path.join(outDir, file));
  }
});

test('can build into a dist folder inside the project, as `npm run build` does', async () => {
  const insideOutDir = path.join(rootDir, 'dist');

  await build({ rootDir, outDir: insideOutDir, log: () => {} });
  // A second build must also work, now that dist/ already exists and holds files.
  await build({ rootDir, outDir: insideOutDir, log: () => {} });

  await fs.access(path.join(insideOutDir, 'index.html'));
  await assert.rejects(fs.access(path.join(insideOutDir, 'dist')), 'dist must not be copied into itself');
});

test('leaves build tooling out of the output', async () => {
  await build({ rootDir, outDir, log: () => {} });

  for (const name of ['package.json', 'scripts', 'node_modules']) {
    await assert.rejects(fs.access(path.join(outDir, name)));
  }
});

test('warns about a missing image and leaves its tag untouched', async () => {
  const result = await build({ rootDir, outDir, log: () => {} });

  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /static\/images\/typo\.jpg/);
  const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
  assert.match(html, /<img src="static\/images\/typo\.jpg" alt="Missing">/);
});
