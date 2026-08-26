// Helpers for working with the three sizes the API returns for every photo.
//
//   thumb_urls    ~640px  WebP  — grid cards and carousel thumbnails
//   display_urls  ~2048px WebP  — the large on-page image
//   image_urls    original JPEG — offered as an explicit download only
//
// The API already falls back to the original when a derivative has not been
// generated yet, so these helpers only have to handle shape differences
// between the grouped list response and a single photo row.

/** Normalise a grouped photo (from GET /api/photos) into per-image records. */
export function groupImages(group) {
  if (!group) return [];
  const originals = group.image_urls || (group.image_url ? [group.image_url] : []);
  const thumbs = group.thumb_urls || [];
  const displays = group.display_urls || [];
  const bytes = group.image_bytes || [];

  return originals.map((original, i) => ({
    original,
    thumb: thumbs[i] || original,
    display: displays[i] || original,
    bytes: Number(bytes[i]) || 0,
  }));
}

/** Normalise the group rows returned by GET /api/photos/:id. */
export function rowImages(rows = []) {
  return rows
    .filter((row) => row.image_url)
    .map((row) => ({
      original: row.image_url,
      thumb: row.thumb_url || row.image_url,
      display: row.display_url || row.image_url,
      bytes: Number(row.bytes) || 0,
      width: row.width || null,
      height: row.height || null,
    }));
}

/** "12.3 MB" — used to label the full-resolution download honestly. */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Filename to suggest when downloading the original. */
export function downloadName(url, title) {
  try {
    const base = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'photo.jpg');
    if (!title) return base;
    const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '.jpg';
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return slug ? `${slug}${ext}` : base;
  } catch {
    return 'photo.jpg';
  }
}
