#!/usr/bin/env bash
# Publish a resume PDF to rogerkutyna.com/resume.
#
# A deliberate, manual step: nothing calls this automatically, and re-rendering
# the resume in ~/Documents/Job_Search does not publish it. Run it (or ask a
# Claude session to) when Roger wants a particular PDF to go live.
#
# It copies the PDF into the API server's uploads volume over SSH (Tailscale,
# as rkadmin), so no admin secret has to live on the Mac. The photo worker
# notices the new file within seconds, renders the page images and flushes the
# site's page cache; this script waits for that and checks the live page.
#
#   scripts/publish-resume.sh [path/to/resume.pdf]
#
# The default path is Job_Search's canonical PDF. Exits 0 when the live site
# serves the given PDF (including when it already did), non-zero otherwise.
# Environment overrides: RESUME_SYNC_HOST, RESUME_SYNC_SITE, RESUME_SYNC_API,
# RESUME_SYNC_CONTAINER, RESUME_SYNC_TIMEOUT (seconds).
set -euo pipefail

PDF="${1:-$HOME/Documents/Job_Search/resume/Roger_Kutyna_Resume.pdf}"
HOST="${RESUME_SYNC_HOST:-rkadmin@rk-minipc}"
SITE="${RESUME_SYNC_SITE:-https://rogerkutyna.com}"
API="${RESUME_SYNC_API:-https://api.rogerkutyna.com/api}"
TIMEOUT="${RESUME_SYNC_TIMEOUT:-120}"
CONTAINER="${RESUME_SYNC_CONTAINER:-portfolio-api-server}"
REMOTE_PDF="/app/uploads/resume.pdf"
MAX_BYTES=$((20 * 1024 * 1024)) # the admin upload's limit

fail() { echo "publish-resume: $*" >&2; exit 1; }

[ -f "$PDF" ] || fail "no such file: $PDF"
[ "$(head -c 5 "$PDF")" = "%PDF-" ] || fail "not a PDF: $PDF"
size=$(wc -c < "$PDF" | tr -d ' ')
[ "$size" -le "$MAX_BYTES" ] || fail "PDF is $size bytes; the limit is $MAX_BYTES"

# The worker identifies a rendered resume by the first 16 hex digits of its
# SHA-256 (worker/resume.js), and the live page URLs carry the same value.
hash=$(shasum -a 256 "$PDF" | cut -c1-16)

remote_hash() {
  ssh -o ConnectTimeout=20 "$HOST" "docker exec $CONTAINER sha256sum $REMOTE_PDF 2>/dev/null" | cut -c1-16
}

if [ "$(remote_hash || true)" = "$hash" ]; then
  echo "publish-resume: server already has this PDF ($hash)"
else
  echo "publish-resume: uploading $(basename "$PDF") ($size bytes, $hash) to $HOST"
  # Write beside the target and rename, so the API never serves a partial file.
  ssh -o ConnectTimeout=20 "$HOST" \
    "docker exec -i $CONTAINER sh -c 'cat > /app/uploads/.resume.pdf.tmp && mv /app/uploads/.resume.pdf.tmp $REMOTE_PDF'" \
    < "$PDF"
  [ "$(remote_hash)" = "$hash" ] || fail "upload did not verify: server hash differs from $hash"
fi

# Wait for the worker to render the pages and flush the page cache, then
# confirm the public page references this version.
deadline=$(( $(date +%s) + TIMEOUT ))
until curl -fsS "$API/resume/pages" 2>/dev/null | grep -q "\"sourceHash\":\"$hash\""; do
  [ "$(date +%s)" -lt "$deadline" ] || fail "page images for $hash not rendered after ${TIMEOUT}s"
  sleep 3
done
until curl -fsS "$SITE/resume" 2>/dev/null | grep -q "$hash"; do
  [ "$(date +%s)" -lt "$deadline" ] || fail "$SITE/resume still shows an older version after ${TIMEOUT}s"
  sleep 3
done
curl -fsS "$API/resume" 2>/dev/null | shasum -a 256 | cut -c1-16 | grep -qx "$hash" \
  || fail "$API/resume does not serve $hash"

echo "publish-resume: live — $SITE/resume now serves $hash"
