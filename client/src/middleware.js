import { NextResponse } from 'next/server';

export function middleware(request) {
  const { method, url } = request;
  const now = new Date().toISOString();

  // Log the incoming request
  console.log(`[${now}] [Next.js Middleware] ${method} ${url}`);

  // Continue to the next handler
  const response = NextResponse.next();

  // (Optional) Add a header for debugging
  response.headers.set('X-Request-Logged', 'true');

  return response;
}

// Optionally, specify which paths should have middleware applied
// export const config = {
//   matcher: '/:path*',
// };