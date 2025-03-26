import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieResponse = await fetch(`${process.env.API_URL}/auth/logout`, {
      method: 'POST',
    });
    
    // If FastAPI response wasn't successful, return the error
    if (!cookieResponse.ok) {
      return NextResponse.json(
        { status: cookieResponse.status }
      );
    }
    
    // Create a successful response
    const response = NextResponse.json({ success: true });
    
    // Delete the session cookie
    response.cookies.delete('session');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}