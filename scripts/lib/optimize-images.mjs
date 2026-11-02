import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { planWidths, variantPath, pickDefaultWidth } from './image-plan.mjs';

// Photos tolerate heavier compression than graphics such as logos and posters.
const WEBP_QUALITY = { photo: 78, graphic: 85 };

export function contentHash(bytes) {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/** Size as displayed. EXIF orientations 5-8 mean the stored image is rotated a quarter turn. */
function displayedSize({ width, height, orientation = 1 }) {
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}

/**
 * Writes resized WebP variants under `outDir` and returns the manifest entry
 * for the HTML rewriter. `sourceUrl` is the path exactly as written in the HTML.
 */
export async function optimizeImage({ sourcePath, sourceUrl, outDir }) {
  const bytes = await fs.readFile(sourcePath);
  const hash = contentHash(bytes);
  const { width, height } = displayedSize(await sharp(bytes).metadata());
  const widths = planWidths(width);
  const quality = /\.png$/i.test(sourcePath) ? WEBP_QUALITY.graphic : WEBP_QUALITY.photo;

  let defaultVariantBytes = 0;
  for (const variantWidth of widths) {
    const destination = path.join(outDir, variantPath(sourceUrl, variantWidth, hash));
    await fs.mkdir(path.dirname(destination), { recursive: true });

    // rotate() applies EXIF orientation. sharp drops other metadata (GPS etc.) by default.
    const info = await sharp(bytes)
      .rotate()
      .resize({ width: variantWidth, withoutEnlargement: true })
      .webp({ quality })
      .toFile(destination);

    if (variantWidth === pickDefaultWidth(widths)) defaultVariantBytes = info.size;
  }

  return { width, height, hash, widths, originalBytes: bytes.length, defaultVariantBytes };
}
