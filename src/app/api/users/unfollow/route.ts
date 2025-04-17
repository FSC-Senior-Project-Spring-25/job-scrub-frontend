import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { targetID } = await request.json();
  const uid = request.nextUrl.searchParams.get('uid');
  const authHeader = request.headers.get('authorization');
  
  if (!uid || !targetID) {
    return NextResponse.json({ detail: "User ID and target ID are required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${process.env.API_URL}/users/${uid}/unfollow?target_id=${encodeURIComponent(targetID)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { "Authorization": authHeader } : {})
      },
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