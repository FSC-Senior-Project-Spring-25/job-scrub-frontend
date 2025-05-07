import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get('limit') || '1000';
  
  try {
    // Build headers with authorization if available
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Make request to your backend API
    const apiUrl = `${process.env.API_URL}/job/all?limit=${encodeURIComponent(limit)}`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[API] Error response from backend:`, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const jobs = await response.json();
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("[API] Error fetching all jobs:", error);
    return NextResponse.json(
      { detail: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}