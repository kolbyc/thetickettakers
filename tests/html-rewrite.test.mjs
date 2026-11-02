import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { rewriteHtml, collectImageSources, SIZES } from '../scripts/lib/html-rewrite.mjs';

const manifest = {
  'static/images/a.jpg': { width: 3000, height: 2000, hash: 'h1', widths: [480, 800, 1200, 1600] },
  'static/images/hero.jpg': { width: 2400, height: 1200, hash: 'h2', widths: [480, 800, 1200, 1600] },
};

function rewrite(html) {
  const output = rewriteHtml(html, { imageManifest: manifest, assetVersion: () => 'v123' });
  return cheerio.load(output);
}

test('gallery image gets srcset, sizes, dimensions, lazy loading and a full-size variant', () => {
  const $ = rewrite(
    '<div class="gallery"><div class="gallery-item"><img src="static/images/a.jpg" alt="A"></div></div>'
  );
  const img = $('img');

  assert.equal(img.attr('src'), 'static/optimized/static-images-a-800-h1.webp');
  assert.match(img.attr('srcset'), /static-images-a-480-h1\.webp 480w, .*-1600-h1\.webp 1600w$/);
  assert.equal(img.attr('sizes'), SIZES.gallery);
  assert.equal(img.attr('width'), '3000');
  assert.equal(img.attr('height'), '2000');
  assert.equal(img.attr('loading'), 'lazy');
  assert.equal(img.attr('decoding'), 'async');
  assert.equal(img.attr('data-full'), 'static/optimized/static-images-a-1600-h1.webp');
  assert.equal(img.attr('alt'), 'A');
});

test('sizes depend on where the image sits in the page', () => {
  const $ = rewrite(`
    <img id="hero" class="landing-image" src="static/images/hero.jpg" alt="">
    <div class="ticket-images">
      <img id="portrait" class="portrait-img" src="static/images/a.jpg" alt="">
      <img id="landscape" class="landscape-img" src="static/images/a.jpg" alt="">
    </div>
    <div class="about-us-images"><img id="about" src="static/images/a.jpg" alt=""></div>
    <img id="plain" src="static/images/a.jpg" alt="">
  `);

  assert.equal($('#hero').attr('sizes'), SIZES.hero);
  assert.equal($('#portrait').attr('sizes'), SIZES.posterPortrait);
  assert.equal($('#landscape').attr('sizes'), SIZES.posterLandscape);
  assert.equal($('#about').attr('sizes'), SIZES.about);
  assert.equal($('#plain').attr('sizes'), SIZES.fallback);
});

test('an author-supplied sizes attribute is kept', () => {
  const $ = rewrite('<img src="static/images/a.jpg" sizes="50vw" alt="">');
  assert.equal($('img').attr('sizes'), '50vw');
});

test('data-priority="high" loads eagerly, raises fetch priority and adds a preload hint', () => {
  const $ = rewrite(
    '<html><head></head><body><img class="landing-image" data-priority="high" src="static/images/hero.jpg" alt=""></body></html>'
  );
  const img = $('img');

  assert.equal(img.attr('loading'), 'eager');
  assert.equal(img.attr('fetchpriority'), 'high');
  assert.equal(img.attr('data-priority'), undefined);

  const preload = $('head link[rel="preload"][as="image"]');
  assert.equal(preload.length, 1);
  assert.equal(preload.attr('imagesrcset'), img.attr('srcset'));
  assert.equal(preload.attr('imagesizes'), SIZES.hero);
});

test('data-eager loads eagerly without a preload hint', () => {
  const $ = rewrite(
    '<html><head></head><body><img data-eager src="static/images/a.jpg" alt=""></body></html>'
  );
  assert.equal($('img').attr('loading'), 'eager');
  assert.equal($('img').attr('fetchpriority'), undefined);
  assert.equal($('img').attr('data-eager'), undefined);
  assert.equal($('head link[rel="preload"]').length, 0);
});

test('images outside the manifest are left alone', () => {
  const $ = rewrite(
    '<img id="remote" src="https://example.com/x.jpg" alt=""><img id="unknown" src="static/images/missing.jpg" alt="">'
  );
  assert.equal($('#remote').attr('srcset'), undefined);
  assert.equal($('#unknown').attr('srcset'), undefined);
  assert.equal($('#unknown').attr('src'), 'static/images/missing.jpg');
});

test('local stylesheets and scripts get a content version, remote ones do not', () => {
  const $ = rewrite(`
    <html><head>
      <link rel="stylesheet" href="styles/styles.css?v=1.0.9">
      <link rel="stylesheet" href="https://fonts.example.com/f.css">
    </head><body><script src="javascript/main.js" defer></script></body></html>
  `);
  assert.equal($('link[href^="styles"]').attr('href'), 'styles/styles.css?v=v123');
  assert.equal($('link[href^="https"]').attr('href'), 'https://fonts.example.com/f.css');
  assert.equal($('script').attr('src'), 'javascript/main.js?v=v123');
});

test('HTML comments survive, so the show/no-show toggle keeps working', () => {
  const html = '<body><!--<div class="ticket-option coming-soon">More to come!</div>--></body>';
  const output = rewriteHtml(html, { imageManifest: manifest, assetVersion: () => 'v1' });
  assert.match(output, /<!--<div class="ticket-option coming-soon">More to come!<\/div>-->/);
});

test('collectImageSources returns unique optimizable sources in page order', () => {
  const sources = collectImageSources(`
    <img src="static/images/b.jpg"><img src="static/images/a.png">
    <img src="static/images/b.jpg"><img src="https://x.com/c.jpg">
    <img src="static/images/logo.svg"><img>
  `);
  assert.deepEqual(sources, ['static/images/b.jpg', 'static/images/a.png']);
});
