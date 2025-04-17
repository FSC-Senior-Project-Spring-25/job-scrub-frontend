import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const uid = request.nextUrl.searchParams.get('uid');
  
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
    // Pass through the data as received from the API
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching followers:", error);
    return NextResponse.json(
      { detail: "Failed to fetch followers" },
      { status: 500 }
    );
  }
}