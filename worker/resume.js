// Resume page rendering.
//
// The resume page used to embed the PDF with <object>/<iframe>. That never
// worked in production: the PDF is served from api.rogerkutyna.com but embedded
// on rogerkutyna.com, and helmet's X-Frame-Options: SAMEORIGIN blocks framing
// across origins. Mobile browsers refuse to inline-render PDF embeds at all,
// so fixing the header alone would still leave phones showing an empty box.
//
// Instead the PDF is rasterised to WebP page images, which render everywhere.
// The PDF itself stays available to download or open full screen.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const sharp = require('sharp');

const execFileAsync = promisify(execFile);

const PAGES_DIR = 'resume-pages';
const MANIFEST = 'manifest.json';
const DPI = 200; // ~1700x2200 for US Letter: crisp on retina, still small as WebP
const MAX_PAGES = 20;
const QUALITY = 82;

const sourceFingerprint = (pdfPath) => {
  const buf = fs.readFileSync(pdfPath);
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
};

const manifestPath = (uploadsDir) => path.join(uploadsDir, PAGES_DIR, MANIFEST);

const readManifest = (uploadsDir) => {
  try {
    return JSON.parse(fs.readFileSync(manifestPath(uploadsDir), 'utf8'));
  } catch {
    return null;
  }
};

/**
 * Rasterise uploads/resume.pdf into uploads/resume-pages/page-N.webp.
 * No-op when the current PDF has already been rendered.
 *
 * @returns {Promise<{rendered: boolean, pages: number}>}
 */
const render = async (uploadsDir) => {
  const pdfPath = path.join(uploadsDir, 'resume.pdf');
  if (!fs.existsSync(pdfPath)) return { rendered: false, pages: 0 };

  const fingerprint = sourceFingerprint(pdfPath);
  const existing = readManifest(uploadsDir);
  if (existing && existing.sourceHash === fingerprint) {
    return { rendered: false, pages: existing.pages.length };
  }

  const outDir = path.join(uploadsDir, PAGES_DIR);
  // Render into a scratch directory and swap it in, so a viewer never sees a
  // half-rendered set of pages.
  const tmpDir = path.join(uploadsDir, `.${PAGES_DIR}.tmp`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    await execFileAsync(
      'pdftoppm',
      ['-r', String(DPI), '-png', '-l', String(MAX_PAGES), pdfPath, path.join(tmpDir, 'raw')],
      { timeout: 120000, maxBuffer: 1024 * 1024 }
    );

    // pdftoppm zero-pads page numbers based on the page count, so sort the
    // files it actually produced rather than assuming a naming pattern.
    const pngs = fs
      .readdirSync(tmpDir)
      .filter((f) => f.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    if (!pngs.length) throw new Error('pdftoppm produced no pages');

    const pages = [];
    for (let i = 0; i < pngs.length; i++) {
      const outName = `page-${i + 1}.webp`;
      const meta = await sharp(path.join(tmpDir, pngs[i]))
        .webp({ quality: QUALITY })
        .toFile(path.join(tmpDir, outName));
      fs.unlinkSync(path.join(tmpDir, pngs[i]));
      pages.push({
        key: path.posix.join(PAGES_DIR, outName),
        width: meta.width,
        height: meta.height,
      });
    }

    fs.writeFileSync(
      path.join(tmpDir, MANIFEST),
      JSON.stringify({ sourceHash: fingerprint, pages, renderedAt: new Date().toISOString() }, null, 2)
    );

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.renameSync(tmpDir, outDir);
    return { rendered: true, pages: pages.length };
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
};

module.exports = { render, PAGES_DIR, MANIFEST };
