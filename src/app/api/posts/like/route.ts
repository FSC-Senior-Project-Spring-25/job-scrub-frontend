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

        const response = await fetch(`${process.env.API_URL}/posts/${postId}/like`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            return NextResponse.json(
                errorData || { error: "Failed to toggle like" },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error toggling post like:", error);
        return NextResponse.json(
            { error: "Failed to update like status" },
            { status: 500 }
        );
    }
}