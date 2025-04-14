import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Get uid from query parameter instead of route parameter
  const uid = request.nextUrl.searchParams.get('uid');
  const { targetID } = await request.json();
  const authHeader = request.headers.get('authorization');
  
  if (!uid) {
    return NextResponse.json({ detail: "User ID is required" }, { status: 400 });
  }
  
  if (!targetID) {
    return NextResponse.json({ detail: "Target user ID is required" }, { status: 400 });
  }

  try {
    // Build headers with authorization if available
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    
    const response = await fetch(`${process.env.API_URL}/users/${uid}/follow?target_id=${encodeURIComponent(targetID)}`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error following user:", error);
    return NextResponse.json({ detail: "Failed to follow user" }, { status: 500 });
  }
}