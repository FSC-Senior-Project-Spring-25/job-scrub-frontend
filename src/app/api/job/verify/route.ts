import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    // Get the job ID from the URL params
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const verified = req.nextUrl.searchParams.get("verified") === "true";
    const body = await req.json();

    // Prepare the job data for the FastAPI service
    // Converting any stringified JSON back to arrays
    const jobData = {
      title: body.title,
      company: body.company,
      url: body.url,
      description: body.description,
      job_type: body.job_type,
      location: body.location,
      skills: typeof body.skills === "string" ? JSON.parse(body.skills) : body.skills,
      benefits: typeof body.benefits === "string" ? JSON.parse(body.benefits) : body.benefits,
      date: body.date,
      salary: body.salary,
    };
    
    const response = await fetch(`${process.env.API_URL}/job/verify/${jobId}?verified=${verified}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(jobData)
    });

    if (!response.ok) {
      // Forward any errors from the API
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json(
        { error: errorData.message || "Failed to verify job" },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return NextResponse.json(
      responseData,
      { status: response.status }
    );

  } catch (error) {
    console.error("Error verifying job:", error);
    return NextResponse.json(
      { error: "Failed to process job verification" },
      { status: 500 }
    );
  }
}