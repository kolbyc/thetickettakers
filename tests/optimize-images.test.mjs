import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { optimizeImage } from '../scripts/lib/optimize-images.mjs';

let tmp;

before(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ttt-optimize-'));
});

after(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

async function writeJpeg(name, { width, height, orientation }) {
  const image = sharp({ create: { width, height, channels: 3, background: '#668' } }).jpeg();
  const bytes = await (orientation ? image.withMetadata({ orientation }) : image).toBuffer();
  const file = path.join(tmp, name);
  await fs.writeFile(file, bytes);
  return file;
}

test('writes one webp per planned width and reports the entry for the manifest', async () => {
  const sourcePath = await writeJpeg('big.jpg', { width: 2000, height: 1000 });
  const outDir = path.join(tmp, 'out-big');

  const entry = await optimizeImage({ sourcePath, sourceUrl: 'static/images/big.jpg', outDir });

  assert.deepEqual(entry.widths, [480, 800, 1200, 1600]);
  assert.equal(entry.width, 2000);
  assert.equal(entry.height, 1000);
  assert.match(entry.hash, /^[0-9a-f]{8}$/);

  for (const width of entry.widths) {
    const file = path.join(outDir, `static/optimized/static-images-big-${width}-${entry.hash}.webp`);
    const meta = await sharp(file).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.width, width);
  }
});

test('does not upscale small images', async () => {
  const sourcePath = await writeJpeg('small.jpg', { width: 300, height: 200 });
  const outDir = path.join(tmp, 'out-small');

  const entry = await optimizeImage({ sourcePath, sourceUrl: 'static/images/small.jpg', outDir });

  assert.deepEqual(entry.widths, [300]);
});

test('honours EXIF orientation so phone photos get the right dimensions', async () => {
  // Stored 400x200 but flagged "rotate 90 degrees", so it displays as 200x400.
  const sourcePath = await writeJpeg('rotated.jpg', { width: 400, height: 200, orientation: 6 });
  const outDir = path.join(tmp, 'out-rotated');

  const entry = await optimizeImage({ sourcePath, sourceUrl: 'static/images/rotated.jpg', outDir });

  assert.equal(entry.width, 200);
  assert.equal(entry.height, 400);
  const file = path.join(outDir, `static/optimized/static-images-rotated-200-${entry.hash}.webp`);
  const meta = await sharp(file).metadata();
  assert.equal(meta.width, 200);
  assert.equal(meta.height, 400);
});

test('output files carry no EXIF metadata (strips GPS from phone photos)', async () => {
  const sourcePath = await writeJpeg('exif.jpg', { width: 600, height: 400, orientation: 3 });
  const outDir = path.join(tmp, 'out-exif');

  const entry = await optimizeImage({ sourcePath, sourceUrl: 'static/images/exif.jpg', outDir });

  const file = path.join(outDir, `static/optimized/static-images-exif-480-${entry.hash}.webp`);
  const meta = await sharp(file).metadata();
  assert.equal(meta.exif, undefined);
});
