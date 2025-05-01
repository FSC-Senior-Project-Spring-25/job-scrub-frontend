import { NextRequest, NextResponse } from "next/server";

interface Job {
  id: string;
  metadata: {
    title: string;
    company: string;
    url: string;
    description: string;
    jobType: string;
    skills: string[];
    location: {
      address: string;
      lat: number;
      lon: number;
    };
    locationType: string;
    benefits: string[];
    date: string;
  };
}

interface FilterParams {
  search?: string;
  jobType?: Record<string, boolean>;
  locationType?: Record<string, boolean>;
  maxDistance?: number;
  datePosted?: string;
  userLocation?: { lat: number; lng: number } | null;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number | undefined,
  lon2: number | undefined
): number {
  if (lat2 === undefined || lon2 === undefined) return Infinity;

  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const {
      search = "",
      jobType = {},
      locationType = {},
      maxDistance = 50,
      datePosted = "anytime",
      userLocation = null,
    }: FilterParams = await req.json();

    // First fetch all jobs from the /all route
    const response = await fetch(`${process.env.API_URL}/job/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("Authorization") || "",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || "Error fetching jobs" },
        { status: response.status }
      );
    }

    const jobs: Job[] = await response.json();

    // Filter jobs based on criteria
    const filteredJobs = jobs.filter(job => {
      const jobData = job.metadata; // Access the metadata object
      
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = search === "" || 
        jobData.title.toLowerCase().includes(searchLower) ||
        jobData.company.toLowerCase().includes(searchLower) ||
        jobData.description.toLowerCase().includes(searchLower) ||
        (jobData.skills || []).some(skill => 
          skill.toLowerCase().includes(searchLower)
        );

      // Job type filter
      const activeJobTypes = Object.entries(jobType)
        .filter(([_, checked]) => checked)
        .map(([type]) => type);

      const matchesJobType =
        activeJobTypes.length === 0 ||
        activeJobTypes.some(type => {
          switch (type) {
            case "fullTime":
              return jobData.jobType === "fulltime";
            case "partTime":
              return jobData.jobType === "parttime";
            case "internship":
              return jobData.jobType === "internship";
            case "contract":
              return jobData.jobType === "contract";
            case "volunteer":
              return jobData.jobType === "volunteer";
            default:
              return false;
          }
        });

      // Location type filter
      const activeLocationTypes = Object.entries(locationType)
        .filter(([_, checked]) => checked)
        .map(([type]) => type);

      const matchesLocationType =
        activeLocationTypes.length === 0 ||
        activeLocationTypes.some(type => {
          switch (type) {
            case "remote":
              return jobData.locationType === "remote";
            case "onsite":
              return jobData.locationType === "onsite";
            case "hybrid":
              return jobData.locationType === "hybrid";
            default:
              return false;
          }
        });

      // Distance filter
      let withinDistance = true;
      if (
        userLocation &&
        jobData.locationType !== "remote" &&
        jobData.location?.lat && 
        jobData.location?.lon &&
        maxDistance > 0
      ) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          jobData.location.lat,
          jobData.location.lon
        );
        withinDistance = distance <= maxDistance;
      }

      // Date filter
      let matchesDatePosted = true;
      if (jobData.date && datePosted !== "anytime") {
        const now = new Date();
        const jobDate = new Date(jobData.date);
        const diffHours = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);

        switch (datePosted) {
          case "24h":
            matchesDatePosted = diffHours <= 24;
            break;
          case "7d":
            matchesDatePosted = diffHours <= 168;
            break;
          case "30d":
            matchesDatePosted = diffHours <= 720;
            break;
        }
      }

      return (
        matchesSearch &&
        matchesJobType &&
        matchesLocationType &&
        withinDistance &&
        matchesDatePosted
      );
    });

    // Transform the filteredJobs to flatten the structure for the response
    const transformedJobs = filteredJobs.map(job => ({
      id: job.id,
      ...job.metadata
    }));

    return NextResponse.json(transformedJobs);
  } catch (error) {
    console.error("Error filtering jobs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}