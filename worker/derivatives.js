// Derivative image generation.
//
// Source photos off a camera are 8-20 MB. Rendering those directly is what made
// the gallery unusable, so every photo gets two smaller WebP copies:
//
//   <base>__thumb.webp    long edge 640px  — grid cards, carousel thumbnails
//   <base>__display.webp  long edge 2048px — the main viewer image
//
// The original file is never touched or removed; it stays linked as the
// full-resolution download.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const THUMB_EDGE = 640;
const DISPLAY_EDGE = 2048;
const THUMB_QUALITY = 70;
const DISPLAY_QUALITY = 80;

// Cap decode memory so a malicious or absurd file can't take the box down.
sharp.cache(false);
sharp.concurrency(1);

const SUFFIX_RE = /__(thumb|display)\.webp$/i;

/** True for files this module itself produced — never derive from a derivative. */
const isDerivative = (filename) => SUFFIX_RE.test(filename);

const derivativeNames = (storageKey) => {
  const dir = path.posix.dirname(storageKey) === '.' ? '' : path.posix.dirname(storageKey);
  const base = path.posix.basename(storageKey, path.posix.extname(storageKey));
  const join = (name) => (dir ? path.posix.join(dir, name) : name);
  return {
    thumbKey: join(`${base}__thumb.webp`),
    displayKey: join(`${base}__display.webp`),
  };
};

/**
 * Build both derivatives for one source image.
 *
 * @param {string} uploadsDir absolute path of the uploads root
 * @param {string} storageKey path of the source image relative to uploadsDir
 * @returns {Promise<{thumbKey, displayKey, width, height, bytes}>}
 */
const generate = async (uploadsDir, storageKey) => {
  const sourcePath = path.join(uploadsDir, storageKey);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source image not found: ${storageKey}`);
  }

  const { thumbKey, displayKey } = derivativeNames(storageKey);
  const thumbPath = path.join(uploadsDir, thumbKey);
  const displayPath = path.join(uploadsDir, displayKey);

  const stats = fs.statSync(sourcePath);
  const metadata = await sharp(sourcePath).metadata();

  // EXIF orientation 5-8 swap width/height once `.rotate()` is applied.
  const swapped = metadata.orientation >= 5 && metadata.orientation <= 8;
  const width = swapped ? metadata.height : metadata.width;
  const height = swapped ? metadata.width : metadata.height;

  const render = (outPath, edge, quality) =>
    sharp(sourcePath)
      .rotate() // bake in EXIF orientation; WebP output drops the tag
      .resize({
        width: edge,
        height: edge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toFile(outPath);

  // Write to a temp name then rename, so a crash mid-encode can't leave a
  // half-written file that later looks like a valid derivative.
  const atomically = async (outPath, edge, quality) => {
    const tmpPath = `${outPath}.tmp`;
    try {
      await render(tmpPath, edge, quality);
      fs.renameSync(tmpPath, outPath);
    } catch (err) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
      throw err;
    }
  };

  await atomically(thumbPath, THUMB_EDGE, THUMB_QUALITY);
  await atomically(displayPath, DISPLAY_EDGE, DISPLAY_QUALITY);

  return {
    thumbKey,
    displayKey,
    width: width || null,
    height: height || null,
    bytes: stats.size,
  };
};

/** Remove both derivatives for a source key, ignoring anything already gone. */
const remove = (uploadsDir, storageKey) => {
  if (!storageKey) return;
  const { thumbKey, displayKey } = derivativeNames(storageKey);
  for (const key of [thumbKey, displayKey]) {
    const target = path.join(uploadsDir, key);
    try {
      if (fs.existsSync(target)) fs.unlinkSync(target);
    } catch (err) {
      console.warn('Failed to delete derivative', key, err.message);
    }
  }
};

module.exports = {
  generate,
  remove,
  derivativeNames,
  isDerivative,
  THUMB_EDGE,
  DISPLAY_EDGE,
};
