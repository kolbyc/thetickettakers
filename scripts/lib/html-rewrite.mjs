import * as cheerio from 'cheerio';
import {
  isOptimizable,
  buildSrcset,
  variantPath,
  pickDefaultWidth,
} from './image-plan.mjs';

// `sizes` tells the browser how wide an image is drawn, so it can pick the
// smallest adequate file. Keep these in step with the layout in styles.css.
export const SIZES = {
  hero: '(max-width: 1240px) 100vw, 1200px',
  about: '(max-width: 768px) 80vw, 570px',
  posterPortrait: '(max-width: 480px) 85vw, (max-width: 768px) 45vw, 373px',
  posterLandscape: '(max-width: 768px) 95vw, 812px',
  gallery: '(max-width: 540px) 92vw, 280px',
  fallback: '100vw',
};

// First matching rule wins, so the narrower selectors come first.
const SIZES_RULES = [
  { closest: '.landing-image', sizes: SIZES.hero },
  { closest: '.landscape-img', sizes: SIZES.posterLandscape },
  { closest: '.ticket-images', sizes: SIZES.posterPortrait },
  { closest: '.about-us-images', sizes: SIZES.about },
  { closest: '.gallery-item', sizes: SIZES.gallery },
];

function sizesFor(img) {
  const rule = SIZES_RULES.find(({ closest }) => img.closest(closest).length > 0);
  return rule ? rule.sizes : SIZES.fallback;
}

/** Unique optimizable image sources, in page order. */
export function collectImageSources(html) {
  const $ = cheerio.load(html);
  const sources = $('img[src]')
    .map((_, el) => $(el).attr('src'))
    .get()
    .filter(isOptimizable);
  return [...new Set(sources)];
}

function addPreloadHint($, { srcset, sizes, href }) {
  $('head').append(
    `<link rel="preload" as="image" href="${href}" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high">`
  );
}

function rewriteImage($, img, entry) {
  const src = img.attr('src');
  const hasHighPriority = img.attr('data-priority') === 'high';
  const isEager = hasHighPriority || img.attr('data-eager') !== undefined;

  const defaultWidth = pickDefaultWidth(entry.widths);
  const largestWidth = entry.widths.at(-1);
  const attributes = {
    src: variantPath(src, defaultWidth, entry.hash),
    srcset: buildSrcset(src, entry.widths, entry.hash),
    sizes: img.attr('sizes') ?? sizesFor(img),
    width: entry.width,
    height: entry.height,
    decoding: 'async',
    loading: isEager ? 'eager' : 'lazy',
    // The lightbox opens this larger variant instead of the original upload.
    'data-full': variantPath(src, largestWidth, entry.hash),
  };
  if (hasHighPriority) attributes.fetchpriority = 'high';

  img.attr(attributes).removeAttr('data-priority').removeAttr('data-eager');

  if (hasHighPriority) {
    addPreloadHint($, { srcset: attributes.srcset, sizes: attributes.sizes, href: attributes.src });
  }
}

function isLocalAsset(url) {
  return !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
}

/** Replaces any hand-written ?v=1.0.x with a hash of the file, so browsers refetch only on change. */
function versionAsset(element, attribute, assetVersion) {
  const url = element.attr(attribute);
  if (!isLocalAsset(url)) return;

  const [pathOnly] = url.split('?');
  const version = assetVersion(pathOnly);
  if (version) element.attr(attribute, `${pathOnly}?v=${version}`);
}

/**
 * @param imageManifest  source path -> { width, height, hash, widths }
 * @param assetVersion   (path) => version string for a local css/js file
 */
export function rewriteHtml(html, { imageManifest, assetVersion }) {
  const $ = cheerio.load(html);

  $('img[src]').each((_, el) => {
    const img = $(el);
    const entry = imageManifest[img.attr('src')];
    if (entry) rewriteImage($, img, entry);
  });

  $('link[rel="stylesheet"][href]').each((_, el) => versionAsset($(el), 'href', assetVersion));
  $('script[src]').each((_, el) => versionAsset($(el), 'src', assetVersion));

  return $.html();
}
