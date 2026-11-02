# The Ticket Takers website

Plain HTML/CSS/JS. A small build step makes the images fast; nothing else about the site changes.

## Cloudflare Pages settings (free plan)

- Build command: `npm run build`
- Build output directory: `dist`
- Node: Cloudflare's default (22) works as is, nothing to set. The build needs Node 20.9 or newer.

Each push is one build (free plan: 500 builds/month, 20 minute limit).

## Day to day

- Put photos in `static/images/` as usual and reference them in `index.html` with a plain
  `<img src="static/images/photo.jpg" alt="...">`. The build creates resized WebP versions,
  adds `srcset`, `width`/`height` and lazy loading, and strips GPS data from the copies.
- On an image near the top of the page, add `data-eager` (loads immediately) or
  `data-priority="high"` (also preloaded; use for the one big hero image only).
- Showing or hiding the "More to come!" ticket card works as before: comment or uncomment it.
- If you change the layout widths of a picture group in `styles.css`, update the matching
  entry in `SIZES` in `scripts/lib/html-rewrite.mjs` so browsers pick the right file size.

## Local use

```
npm install
npm test          # unit tests for the build step
npm run build     # writes dist/
npx wrangler pages dev dist   # preview (or: npx serve dist)
```

## Videos

Videos are served as-is. If a clip is large, re-encode it before committing, for example:

```
ffmpeg -i in.mp4 -vf "scale=-2:720" -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k -movflags +faststart out.mp4
```
