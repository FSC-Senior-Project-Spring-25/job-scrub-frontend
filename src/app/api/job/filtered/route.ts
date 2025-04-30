import { NextRequest, NextResponse } from "next/server";

interface Location {
  address?: string;
  lat?: number;
  lon?: number;
}

enum LocationType {
  REMOTE = "remote",
  ONSITE = "onsite",
  HYBRID = "hybrid",
}

enum JobType {
  FULL_TIME = "fulltime",
  PART_TIME = "parttime",
  INTERNSHIP = "internship",
  CONTRACT = "contract",
  VOLUNTEER = "volunteer",
}

interface JobMetadata {
  title?: string;
  company?: string;
  url?: string;
  description?: string;
  jobType?: JobType;
  skills?: string[];
  location?: Location;
  locationType?: LocationType;
  benefits?: string[];
  date?: string;
  salary?: string;
  verified?: boolean;
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

    const data = await response.json();

    const jobMap = data.reduce((acc: Record<string, JobMetadata>, job: any) => {
      acc[job.id] = job.metadata;
      return acc;
    }, {});

    const filteredJobs = Object.entries(jobMap).filter(([jobId, job]) => {
      if (!job) return false;

      // Search filter with null checks
      const searchLower = search.toLowerCase();
      const matchesSearch =
        (job.title?.toLowerCase() || "").includes(searchLower) ||
        (job.company?.toLowerCase() || "").includes(searchLower) ||
        (job.description?.toLowerCase() || "").includes(searchLower) ||
        (job.skills || []).some((skill) =>
          (skill?.toLowerCase() || "").includes(searchLower)
        );

      // Job type filter
      const activeJobTypes = Object.entries(jobType)
        .filter(([_, checked]) => checked)
        .map(([type]) => type);

      const matchesJobType =
        activeJobTypes.length === 0 ||
        activeJobTypes.some((type) => {
          if (!job.jobType) return false;
          switch (type) {
            case "fullTime":
              return job.jobType === JobType.FULL_TIME;
            case "partTime":
              return job.jobType === JobType.PART_TIME;
            case "internship":
              return job.jobType === JobType.INTERNSHIP;
            case "contract":
              return job.jobType === JobType.CONTRACT;
            case "volunteer":
              return job.jobType === JobType.VOLUNTEER;
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
        activeLocationTypes.some((type) => {
          if (!job.locationType) return false;
          switch (type) {
            case "remote":
              return job.locationType === LocationType.REMOTE;
            case "onsite":
              return job.locationType === LocationType.ONSITE;
            case "hybrid":
              return job.locationType === LocationType.HYBRID;
            default:
              return false;
          }
        });

      // Distance filter
      let withinDistance = true;
      if (
        userLocation &&
        job.locationType !== LocationType.REMOTE &&
        job.location?.lat &&
        job.location?.lon
      ) {
        try {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            job.location.lat,
            job.location.lon
          );
          withinDistance = distance <= maxDistance;
        } catch {
          withinDistance = true;
        }
      }

      // Date filter
      let matchesDatePosted = true;
      if (job.date && datePosted !== "anytime") {
        try {
          const now = new Date();
          const jobDate = new Date(job.date);
          const diffHours =
            (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);

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
        } catch {
          matchesDatePosted = true;
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

    const result = Object.fromEntries(filteredJobs);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error filtering jobs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
