// Runs once when the Next.js server boots.
//
// `next build` prerenders the home page with whatever the API returned at
// build time — nothing at all when the API is unreachable from the builder.
// Pages are cached for an hour, so that snapshot would otherwise be served
// until it aged out. Flush it as soon as the server is listening.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;

  const url = `http://127.0.0.1:${process.env.PORT || 3000}/api/revalidate`;
  let attempts = 0;
  const attempt = () =>
    fetch(url, { method: "POST", headers: { "x-revalidate-secret": secret } })
      .then((res) => {
        if (!res.ok) throw new Error(`responded ${res.status}`);
      })
      .catch((err) => {
        if (++attempts < 10) setTimeout(attempt, 3000);
        else console.error("Boot-time cache flush failed:", err.message);
      });
  // register() runs before the server starts listening.
  setTimeout(attempt, 2000);
}
