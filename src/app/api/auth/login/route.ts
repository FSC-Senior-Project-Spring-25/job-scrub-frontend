import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }
    
    // Forward the request to FastAPI
    const cookieResponse = await fetch(`${process.env.API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: idToken }),
      credentials: 'include', // Important for cookie handling
    });
    
    if (!cookieResponse.ok) {
      const errorData = await cookieResponse.json();
      return NextResponse.json(
        { error: errorData.detail || 'Authentication failed' },
        { status: cookieResponse.status }
      );
    }
    
    const responseData = await cookieResponse.json();
    
    // Get Set-Cookie header from FastAPI response
    // Get Set-Cookie header from FastAPI response
    const setCookieHeader = cookieResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('No Set-Cookie header in FastAPI response');
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
    }

    // Create the response with the success data
    const response = NextResponse.json(responseData);
    
    // Parse cookie parts and set properly
    const sessionCookie = setCookieHeader.split(';')[0].split('=')[1];
    response.cookies.set({
      name: 'session',
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 24 * 60 * 60 // 5 days in seconds
    });
    
    return response;
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}