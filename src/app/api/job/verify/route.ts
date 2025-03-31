import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const verified = req.nextUrl.searchParams.get("verified") === "true";
    const body = await req.json();

    const jobData = {
      title: body.title,
      company: body.company,
      url: body.url,
      description: body.description,
      jobType: body.jobType,
      skills: Array.isArray(body.skills) ? body.skills : [],
      location: {
        address: body.location.address,
        lat: body.location.coordinates.lat,
        lon: body.location.coordinates.lon,
      },
      locationType: body.locationType.toLowerCase(),
      benefits: Array.isArray(body.benefits) ? body.benefits : [],
      date: body.date,
      salary: body.salary || null,
    };
    
    const response = await fetch(`${process.env.API_URL}/job/verify/${jobId}?verified=${verified}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(jobData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json(
        { error: errorData.message || "Failed to verify job" },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error("Error verifying job:", error);
    return NextResponse.json(
      { error: "Failed to process job verification" },
      { status: 500 }
    );
  }
}