import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/', '/api'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(path + '/')
  );

  // Allow public paths and static files
  if (isPublicPath || request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    // If user is logged in and tries to access login/signup, redirect to home
    // if (sessionCookie && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    //   return NextResponse.redirect(new URL('/', request.url));
    // }
    return NextResponse.next();
  }

  // If no session cookie and not a public path, redirect to login
  if (!sessionCookie) {
    // Store the attempted URL to redirect back after login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('returnTo', request.nextUrl.pathname);
    return response;
  }

  try {
    // Verify session with FastAPI through Next.js API route
    const apiUrl = new URL('/api/auth/verify', request.url).toString();
    
    // Add debugging
    console.log(`[middleware] Verifying session at ${apiUrl}`);
    
    const verifyResponse = await fetch(apiUrl, {
      headers: {
        Cookie: `session=${sessionCookie}`,
      },
      cache: 'no-store', // Prevent caching issues
    });

    // Add response status debugging
    console.log(`[middleware] Verification response status: ${verifyResponse.status}`);
    
    const responseData = await verifyResponse.json();
    console.log(`[middleware] Verification response:`, responseData);

    if (!verifyResponse.ok || !responseData.valid) {
      console.error('[middleware] Session verification failed:', responseData);
      // Invalid session - clear cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }

    // Session is valid - allow request
    const response = NextResponse.next();
    
    // Don't attempt to set Cookie header here as it's not the correct approach
    // The session cookie is already in the browser and will be sent with subsequent requests
    
    return response;
  } catch (error) {
    console.error('[middleware] Verification error:', error);
    // On error, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
}

// Update matcher to be more specific
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api auth routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|assets/|api/auth/).*)',
  ],
};