import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/', '/api/auth'];
  
  // Check if the current path is public
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || 
    path.startsWith(publicPath + '/')
  );
  
  // Allow public paths and static files without JWT verification
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Check if the user is authenticated - only if needed
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  // If the user is authenticated, allow the request
  if (token) {
    return NextResponse.next();
  }
  
  // User is not authenticated and trying to access a protected route
  // Create redirect URL to login page
  const redirectUrl = new URL('/login', request.url);
  
  // Add the original URL as a searchParam for post-login redirect
  redirectUrl.searchParams.set('callbackUrl', request.url);
  
  // Create a response that redirects to the login page
  const response = NextResponse.redirect(redirectUrl);
  
  // Store the URL they tried to visit in a cookie (as backup)
  response.cookies.set('redirectUrl', request.url, {
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  
  return response;
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