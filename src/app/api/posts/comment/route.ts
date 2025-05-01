import { NextRequest, NextResponse } from "next/server";


export async function POST(
  request: NextRequest,
) {
  try {
    const postId = request.nextUrl.searchParams.get('postId');
    // Get auth token from request
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    
    // Get request body
    const commentData = await request.json();
    
    const response = await fetch(`${process.env.API_URL}/posts/${postId}/comment`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commentData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        errorData || { error: "Failed to add comment" },
        { status: response.status }
      );
    }
    
    const newComment = await response.json();
    return NextResponse.json(newComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}