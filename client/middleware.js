import { NextResponse } from 'next/server';

const base = process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
  ? 'http://server:3001/api'
  : (process.env.NEXT_PUBLIC_API_URL ?? 'http://server:3001/api');
const LOG_ENDPOINT = `${base}/client-logs`;

export function middleware(request) {
  const { method, url, headers } = request;
  const ip = headers.get('x-forwarded-for') ?? request.ip ?? 'unknown';

  // Fire-and-forget; Edge runtime supports fetch
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'http',
      message: `${method} ${url}`,
      ip,
      ua: headers.get('user-agent') ?? '',
    }),
  }).catch(() => {});

  return NextResponse.next();
}

// Exclude Next.js internal assets (_next) so we only log page/API requests
export const config = {
  matcher: ['/(?!_next/).*'],
};
