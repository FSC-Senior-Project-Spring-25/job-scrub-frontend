import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get the search query from URL parameters
    const searchQuery = request.nextUrl.searchParams.get("q");
    
    if (!searchQuery) {
      return NextResponse.json(
        { results: [], message: "Search query too short" },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${process.env.API_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      
      return NextResponse.json(
        { message: `Error from API: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Forward the API response
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json(
      { message: "Error searching users" },
      { status: 500 }
    );
  }
}