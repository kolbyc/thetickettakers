// Builds the deployable site into dist/:
//   1. copies every file across unchanged (originals stay reachable at their old URLs),
//   2. turns each referenced jpg/png into resized WebP variants,
//   3. rewrites the HTML to use them (srcset, dimensions, lazy loading) and versions css/js.
//
// Cloudflare Pages settings: build command `npm run build`, output directory `dist`.

import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectImageSources, rewriteHtml } from './lib/html-rewrite.mjs';
import { optimizeImage, contentHash } from './lib/optimize-images.mjs';

// Top-level entries that are tooling, not website.
const NOT_DEPLOYED = new Set([
  '.git', '.gitignore', '.node-version', '.DS_Store',
  'node_modules', 'dist', 'scripts', 'tests',
  'package.json', 'package-lock.json', 'README.md',
]);

const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(1);

// Copies entry by entry rather than the whole project at once: fs.cp refuses to copy a
// folder into its own subfolder, which is exactly what building into ./dist would be.
async function copySiteFiles(rootDir, outDir) {
  await fs.mkdir(outDir, { recursive: true });

  for (const name of await fs.readdir(rootDir)) {
    const source = path.join(rootDir, name);
    const isPage = name.endsWith('.html');
    const isOutputFolder = path.resolve(source) === path.resolve(outDir);
    if (NOT_DEPLOYED.has(name) || isPage || isOutputFolder) continue;

    await fs.cp(source, path.join(outDir, name), {
      recursive: true,
      filter: (file) => path.basename(file) !== '.DS_Store',
    });
  }
}

async function optimizeAll({ rootDir, outDir, sources, warnings, log }) {
  const manifest = {};
  for (const src of sources) {
    const sourcePath = path.join(rootDir, src);
    if (!existsSync(sourcePath)) {
      warnings.push(`Image referenced in HTML but not found: ${src}`);
      continue;
    }
    manifest[src] = await optimizeImage({ sourcePath, sourceUrl: src, outDir });
    log(`  ${src} -> ${manifest[src].widths.join(', ')}px`);
  }
  return manifest;
}

export async function build({ rootDir, outDir, log = console.log }) {
  const warnings = [];
  await fs.rm(outDir, { recursive: true, force: true });
  await copySiteFiles(rootDir, outDir);

  const pages = (await fs.readdir(rootDir)).filter((name) => name.endsWith('.html'));
  const htmlByPage = Object.fromEntries(
    await Promise.all(pages.map(async (page) => [page, await fs.readFile(path.join(rootDir, page), 'utf8')]))
  );

  const sources = [...new Set(Object.values(htmlByPage).flatMap(collectImageSources))];
  log(`Optimizing ${sources.length} images...`);
  const imageManifest = await optimizeAll({ rootDir, outDir, sources, warnings, log });

  const assetVersion = (assetPath) => {
    try {
      return contentHash(readFileSync(path.join(rootDir, assetPath)));
    } catch {
      warnings.push(`Asset referenced in HTML but not found: ${assetPath}`);
      return null;
    }
  };

  for (const [page, html] of Object.entries(htmlByPage)) {
    await fs.writeFile(path.join(outDir, page), rewriteHtml(html, { imageManifest, assetVersion }));
  }

  const entries = Object.values(imageManifest);
  const originalBytes = entries.reduce((sum, entry) => sum + entry.originalBytes, 0);
  const defaultBytes = entries.reduce((sum, entry) => sum + entry.defaultVariantBytes, 0);
  log(`\nDone. ${entries.length} images: originals ${toMB(originalBytes)} MB -> ` +
      `typical delivered size ${toMB(defaultBytes)} MB (800px variants).`);
  warnings.forEach((warning) => log(`WARNING: ${warning}`));

  return { warnings, imageCount: entries.length };
}

const isRunDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (isRunDirectly) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await build({ rootDir, outDir: path.join(rootDir, 'dist') });
}
