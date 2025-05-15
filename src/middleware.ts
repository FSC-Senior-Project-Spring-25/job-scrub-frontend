import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // skip Next.js static files and public folder
  const isPublic = PUBLIC_PATHS.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isPublic) return NextResponse.next();

  // skip Next.js prefetches
  const isPrefetch =
    req.method === "HEAD" ||
    req.headers.get("x-middleware-prefetch") === "1" ||
    searchParams.has("__next_router_prefetch");
  if (isPrefetch) return NextResponse.next();

  // if the user is authenticated, allow the request to continue
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.url);

  // If the user is not authenticated, redirect to the login page
  const res = NextResponse.redirect(loginUrl);
  res.cookies.set("redirectUrl", req.url, {
    maxAge: 600,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|assets/).*)',
  ],
};
