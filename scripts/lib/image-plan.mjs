// Pure helpers that decide which image variants exist and what they are called.
// No file access here, so everything is easy to test.

export const VARIANT_WIDTHS = [480, 800, 1200, 1600];

// Width the plain `src` points at; srcset lets browsers pick something better.
export const DEFAULT_DISPLAY_WIDTH = 800;

export const OPTIMIZED_DIR = 'static/optimized';

/**
 * Widths to generate for a source image. Never upscales: if the source is
 * narrower than a target, the source's own width is used instead.
 */
export function planWidths(sourceWidth, targets = VARIANT_WIDTHS) {
  const largest = Math.min(sourceWidth, Math.max(...targets));
  const smaller = targets.filter((width) => width < largest);
  return [...smaller, largest];
}

/**
 * Site-relative path of one variant. The content hash is part of the name, so
 * replacing a photo in place produces a new URL and never serves a stale cache.
 */
export function variantPath(sourcePath, width, hash) {
  const flatName = sourcePath.replace(/\.[^./]+$/, '').replaceAll('/', '-');
  return `${OPTIMIZED_DIR}/${flatName}-${width}-${hash}.webp`;
}

export function buildSrcset(sourcePath, widths, hash) {
  return widths.map((width) => `${variantPath(sourcePath, width, hash)} ${width}w`).join(', ');
}

export function pickDefaultWidth(widths) {
  return widths.find((width) => width >= DEFAULT_DISPLAY_WIDTH) ?? widths.at(-1);
}

/** Only local, relative jpg/png files are converted. GIFs and SVGs are left alone. */
export function isOptimizable(src) {
  const isLocalRelative = !/^([a-z][a-z0-9+.-]*:|\/)/i.test(src);
  return isLocalRelative && /^[^?#]+\.(jpe?g|png)$/i.test(src);
}
