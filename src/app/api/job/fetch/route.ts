import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    const requestData = await request.json();
    const ids = Array.isArray(requestData) ? requestData : requestData.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ detail: "Job IDs array is required" }, { status: 400 });
    }

    try {
        // Build headers with authorization if available
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };
        

        // Make a single call to the backend API to fetch multiple jobs
        const apiUrl = `${process.env.API_URL}/job/fetch`;
        
        const response = await fetch(apiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(ids),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`[API] Error response from backend:`, errorData);
            return NextResponse.json(errorData, { status: response.status });
        }

        // Get the raw response from the backend
        const rawData = await response.json();
        
        // Transform the data structure to match what the client expects
        const jobMap: Record<string, any> = {};
        
        // Handle the nested structure with metadata
        Object.entries(rawData).forEach(([jobId, jobData]: [string, any]) => {
            if (jobData && jobData.metadata) {
                // Extract metadata and add id to create a flat structure
                jobMap[jobId] = {
                    ...jobData.metadata,
                    id: jobId
                };
            } else if (jobData) {
                // If not nested, just use the job data directly
                jobMap[jobId] = jobData;
            }
        });
        
        return NextResponse.json(jobMap);
    } catch (error) {
        console.error("[API] Error fetching jobs:", error);
        return NextResponse.json(
            { detail: "Failed to fetch job details" },
            { status: 500 }
        );
    }
}