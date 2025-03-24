import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ valid: false, error: 'No session cookie found' }, { status: 401 });
    }
    
    // Forward the request to FastAPI with the cookie
    const response = await fetch(`${process.env.API_URL}/auth/verify`, {
      credentials: 'include',
      headers: {
        'Cookie': `session=${sessionCookie}`
      }
    });
    
    const responseData = await response.json();
    
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ valid: false, error: 'Session verification failed' }, { status: 401 });
  }
}