import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const conversationHistory = formData.get('conversation_history') as string;
    const resume = formData.get('resume') as File | null;

    // Get authorization token from request headers
    const authHeader = request.headers.get('authorization');

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create a new FormData to send to backend
    const backendFormData = new FormData();
    backendFormData.append('message', message);
    backendFormData.append('conversation_history', conversationHistory);

    // Append resume if provided
    if (resume) {
      backendFormData.append('resume', resume);
    }

    // Headers for the backend request
    const headers: HeadersInit = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Forward the request to FastAPI backend with streaming
    const response = await fetch(`${process.env.API_URL}/chat`, {
      method: 'POST',
      body: backendFormData,
      headers,
    });

    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error from backend: ${response.status}`, errorText);
      return NextResponse.json({
        error: `Backend error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[API] Chat route error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}