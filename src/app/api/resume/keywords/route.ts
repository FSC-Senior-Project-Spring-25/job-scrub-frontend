// src/app/api/resume/keywords/route.ts
import { NextRequest, NextResponse } from "next/server";



export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization");

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 });
  }

  try {
    const backendRes = await fetch(`${process.env.API_URL}/resume/keywords`, {
      headers: { Authorization: token },
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

