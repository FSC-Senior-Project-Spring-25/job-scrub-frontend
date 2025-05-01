import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('id');
  const authHeader = request.headers.get('authorization');
  
  if (!jobId) {
    return NextResponse.json({ detail: "Job ID is required" }, { status: 400 });
  }

  try {
    // Build headers with authorization if available
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // Make request to your backend API
    const apiUrl = `${process.env.API_URL}/job/delete/${jobId}`;
    
    console.log(`[API] Deleting job with ID: ${jobId}`);
    
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[API] Error response from backend:`, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("[API] Error deleting job:", error);
    return NextResponse.json(
      { detail: "Failed to delete job" },
      { status: 500 }
    );
  }
}