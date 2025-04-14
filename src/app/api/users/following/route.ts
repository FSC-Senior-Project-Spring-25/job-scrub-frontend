import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get the user ID from the query parameter
  const uid = request.nextUrl.searchParams.get('uid');
  const authHeader = request.headers.get('authorization');
  
  if (!uid) {
    return NextResponse.json({ detail: "User ID is required" }, { status: 400 });
  }
  
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Make request to your backend API
    const apiUrl = `${process.env.API_URL}/users/${uid}/following`;
    
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

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching following list:", error);
    return NextResponse.json(
      { detail: "Failed to fetch following list" },
      { status: 500 }
    );
  }
}