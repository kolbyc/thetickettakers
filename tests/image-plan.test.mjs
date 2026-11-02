import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planWidths,
  variantPath,
  buildSrcset,
  pickDefaultWidth,
  isOptimizable,
} from '../scripts/lib/image-plan.mjs';

test('planWidths caps at the largest target width', () => {
  assert.deepEqual(planWidths(3000), [480, 800, 1200, 1600]);
  assert.deepEqual(planWidths(1600), [480, 800, 1200, 1600]);
});

test('planWidths never upscales a smaller source', () => {
  assert.deepEqual(planWidths(1000), [480, 800, 1000]);
  assert.deepEqual(planWidths(480), [480]);
  assert.deepEqual(planWidths(300), [300]);
});

test('variantPath flattens the source path and embeds width and content hash', () => {
  assert.equal(
    variantPath('static/images/walter_1.jpg', 800, 'abc12345'),
    'static/optimized/static-images-walter_1-800-abc12345.webp'
  );
});

test('buildSrcset lists every width with its descriptor', () => {
  assert.equal(
    buildSrcset('static/images/a.jpg', [480, 800], 'h1'),
    'static/optimized/static-images-a-480-h1.webp 480w, ' +
      'static/optimized/static-images-a-800-h1.webp 800w'
  );
});

test('pickDefaultWidth prefers the first width of at least 800, else the largest', () => {
  assert.equal(pickDefaultWidth([480, 800, 1200, 1600]), 800);
  assert.equal(pickDefaultWidth([480, 1000]), 1000);
  assert.equal(pickDefaultWidth([300]), 300);
});

test('isOptimizable accepts local jpg/png only', () => {
  assert.equal(isOptimizable('static/images/a.jpg'), true);
  assert.equal(isOptimizable('static/images/a.JPEG'), true);
  assert.equal(isOptimizable('static/images/a.png'), true);
  assert.equal(isOptimizable('static/images/a.svg'), false);
  assert.equal(isOptimizable('static/images/a.gif'), false);
  assert.equal(isOptimizable('https://example.com/a.jpg'), false);
  assert.equal(isOptimizable('//example.com/a.jpg'), false);
  assert.equal(isOptimizable('data:image/png;base64,AAAA'), false);
  assert.equal(isOptimizable('/static/images/a.jpg'), false);
});
