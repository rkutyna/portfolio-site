# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack portfolio site with four Docker services:

- **`client/`** - Next.js 15 (React 19, Tailwind CSS v4) frontend, port 3000
- **`server/`** - Express.js API server, port 3001
- **`worker/`** - Background Node.js process: converts RAW/HEIC photos to JPEG and generates thumbnail/display derivatives for every photo
- **`db`** - PostgreSQL 15 (managed by Docker Compose, no local directory)

All services are orchestrated via `docker-compose.yml` in the repo root.

### How the pieces connect

1. The client fetches data from the API at `NEXT_PUBLIC_API_URL` (baked in at build time as a Next.js env var).
2. The server serves REST endpoints under `/api/*` and static uploads from `/uploads/*`.
3. The worker polls the database every `WORKER_POLL_MS` ms and runs two jobs:
   - **Conversion** — photos with `image_url IS NULL` (RAW/HEIC not yet converted) are converted via `sharp` / `exiftool-vendored`.
   - **Derivatives** — photos with `thumb_url IS NULL` get a 640px `__thumb.webp` and a 2048px `__display.webp` written next to the original (`worker/derivatives.js`). A photo that fails is flagged `derivatives_failed` so it does not stall the queue; clearing that column re-queues it.
4. The server and worker share the `server_uploads` Docker volume.
5. The database schema is created/migrated automatically by `initDb()` in `server/index.js` on startup — there is no separate migration tool.

### Admin authentication

- Login endpoint: `POST /api/admin/login` with `{ secret }` matching `ADMIN_SECRET_KEY` env var
- Returns a JWT (2h expiry) signed with `JWT_SECRET`
- Admin pages store the token in `localStorage` as `admin_jwt`
- Protected API routes use the `requireAdmin` middleware which validates the Bearer token
- Client-side admin calls go through `adminFetch()` in `client/src/app/admin/useAdminAuth.js`, which clears the token and redirects to `/hiddenlogin?expired=1` on a 401/403 rather than failing silently

### Key API routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/projects` | public |
| POST | `/api/projects` | admin |
| PUT | `/api/projects/:id` | admin |
| DELETE | `/api/projects/:id` | admin |
| GET | `/api/blogs` | public |
| POST | `/api/blogs` | admin |
| PUT | `/api/blogs/:id` | admin |
| DELETE | `/api/blogs/:id` | admin |
| GET | `/api/photos` | public |
| POST | `/api/photos` | admin |
| PUT | `/api/photos/:id` | admin |
| DELETE | `/api/photos/:id` | admin |
| POST | `/api/admin/login` | public (rate-limited) |
| PUT | `/api/photos/group/:groupId` | admin (updates title/caption for the whole set) |
| DELETE | `/api/photos/group/:groupId` | admin |
| GET | `/api/content` | public |
| PUT | `/api/content` | admin (partial map of known keys) |
| DELETE | `/api/content/:key` | admin (restore one key to its default) |

### Database tables

- `projects` - portfolio projects, with `project_images` for multi-image support
- `blogs` - blog posts, with `blog_images` for multi-image support
- `photos` - photo gallery; `image_url IS NULL` means conversion is pending; `thumb_url IS NULL` means derivatives are pending; `storage_key` is the relative path within `/uploads/`; `upload_group_id` groups photos uploaded together
- `site_content` - editable site copy as `key`/`value` rows. Defaults live in `CONTENT_DEFAULTS` in `server/index.js` and are mirrored in `client/src/lib/content.js` (which also defines the admin editor's field groups). Keys are seeded on startup with `ON CONFLICT DO NOTHING`, so edits are never overwritten. Only keys in `CONTENT_DEFAULTS` are accepted by the API.
- `page_views` - analytics rows behind the admin overview

## Development Commands

### Running locally (Docker)

```bash
# Copy and configure env vars first
cp .env.example .env  # or create .env manually (see README)

# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f photo-worker

# Stop everything
docker-compose down
```

### Client (Next.js) — without Docker

```bash
cd client
npm install
npm run dev      # dev server with Turbopack on port 3000
npm run build    # production build
npm run lint     # ESLint
```

### Server (Express) — without Docker

```bash
cd server
npm install
node index.js    # starts on port 3001; requires DB env vars
```

## Environment Variables

A `.env` file in the repo root is required for Docker Compose. Minimum required:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_SERVER_URL=http://localhost:3001
ADMIN_SECRET_KEY=<your-secret>
JWT_SECRET=<your-jwt-secret>
PORTFOLIO_DB_USER=myuser
PORTFOLIO_DB_PASSWORD=password
PORTFOLIO_DB_NAME=portfolio_db
```

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL` are baked into the client Docker image as build args — changing them requires a full image rebuild (`docker-compose up --build`).

## Images

Photos are served in three sizes and the client picks deliberately:

| Size | File | Used by |
|------|------|---------|
| ~640px WebP | `<name>__thumb.webp` | gallery cards, carousel thumbnail strip |
| ~2048px WebP | `<name>__display.webp` | the large carousel image |
| original JPEG | `<name>.jpg` | the explicit "Download full resolution" link only |

`GET /api/photos` returns `thumb_urls`, `display_urls`, `image_urls` and `image_bytes` per group, each falling back to the original when a derivative is not ready. Helpers live in `client/src/lib/photos.js`. `/uploads/*` is served `immutable, max-age=1y` because upload filenames are unique per upload (`resume.pdf` is the exception and gets a 5-minute TTL).

Originals average ~10 MB; thumbnails average ~29 KB. Rendering originals directly is what made the gallery unusable — do not point a grid or thumbnail strip at `image_urls`.

## Client Page Structure

- `/` — home page: Hero, latest-photos teaser, About, Projects, Blogs, Contact (server-rendered)
- `/projects/[id]` — individual project detail
- `/blogs/[id]` — individual blog post (renders Markdown via `react-markdown` + `remark-gfm`)
- `/photos` — photo gallery grid
- `/photos/[id]` — photo detail with group navigation
- `/resume` — resume page
- `/hiddenlogin` — admin login (obscured URL)
- `/admin` — overview: content counts, page-view analytics
- `/admin/content` — edit every piece of site copy
- `/admin/projects` — manage projects
- `/admin/blog` — manage blog posts (Markdown, with live preview)
- `/admin/photos` — manage photo gallery
- `/admin/resume` — replace the resume PDF

All admin pages share `AdminShell` (`client/src/app/admin/AdminShell.js`) for navigation, the JWT session countdown, and logout.

## Image Upload Details

- Project/blog images: JPEG only, max 10MB per file, up to 10 files; stored directly in `/uploads/`
- Photo gallery uploads: JPEG, RAW (`.nef`, `.dng`, `.cr2`, `.cr3`, `.arw`, `.rw2`, `.orf`, `.raf`, `.srw`), or HEIC/HEIF; max 50MB per file, up to 25 files
- JPEG photos go directly to `/uploads/`; non-JPEG go to `/uploads/raw/` and are queued for conversion by the worker
- `/uploads/raw/` is blocked from public HTTP access by the server

## Server-side rendering

The home page, layout and resume page are React Server Components and fetch from
the API at request/revalidate time (`revalidate: 30`). Inside Docker they use
`INTERNAL_API_URL` (`http://server:3001/api`) so SSR does not leave the host and
come back through Cloudflare. `getContent()` never throws — on any failure it
returns `CONTENT_DEFAULTS`, so a page always renders.

Dates are formatted through `client/src/lib/dates.js`, which pins the time zone.
Formatting with the host's zone made the server (UTC) and the browser disagree
and produced hydration mismatches.
