import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Get the user ID from the request header or query parameter
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1]; // Extract token from "Bearer TOKEN"
  const uid = request.nextUrl.searchParams.get('uid');
  
  if (!uid) {
    return NextResponse.json({ detail: "User ID is required" }, { status: 400 });
  }
  

  try {
    // Create headers for backend request
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Make request to your backend API
    const apiUrl = `${process.env.API_URL}/users/${uid}/followers`;
    
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
    console.error("[API] Error fetching followers:", error);
    return NextResponse.json(
      { detail: "Failed to fetch followers" },
      { status: 500 }
    );
  }
}