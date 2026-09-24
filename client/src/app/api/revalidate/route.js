// On-demand cache invalidation.
//
// Server-rendered pages are cached for an hour, and the API server calls this
// after every successful admin write so a new post, edit or copy change shows
// up on the next visit instead of waiting out the hour. The API reaches it over
// the Docker network (http://client:3000); the shared secret keeps the public
// hostname from being used to flush the cache.
import { revalidatePath } from "next/cache";
import { createHash, timingSafeEqual } from "crypto";

const digest = (value) => createHash("sha256").update(value).digest();

export async function POST(request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret") || "";
  // Compare digests so the check takes the same time whatever the input length.
  if (!secret || !timingSafeEqual(digest(given), digest(secret))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Every server-rendered page sits under the root layout, and the layout
  // itself renders admin-editable copy, so drop the lot.
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}
