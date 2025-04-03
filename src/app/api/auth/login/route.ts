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
    const setCookieHeader = cookieResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('No Set-Cookie header in FastAPI response');
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
    }

    // Create the response with the success data
    const response = NextResponse.json(responseData);
    
    // Forward the Set-Cookie header from FastAPI
    response.headers.set('Set-Cookie', setCookieHeader);
    
    return response;
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}