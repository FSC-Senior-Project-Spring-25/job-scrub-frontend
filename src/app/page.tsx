"use client";
export const unstable_runtimeJS = true;
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaSearch,
  FaRegBookmark,
  FaRegClock,
  FaMapMarkerAlt,
  FaBriefcase,
  FaDollarSign,
  FaFilter,
  FaLocationArrow,
} from "react-icons/fa";
import { toast } from "sonner";
import { useAuth } from "./auth-context";
import { Job } from "@/types/types";
import AnimatedLogo from "@/components/animated-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { json } from "stream/consumers";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading } = useAuth();
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    jobType: {
      internship: false,
      fullTime: false,
      partTime: false,
      contract: false,
      volunteer: false,
    },
    locationType: {
      remote: false,
      hybrid: false,
      onsite: false,
    },
    maxDistance: 50, // in miles
    datePosted: "anytime",
  });

  // Calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 3958.8; // earth radius in miles
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
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
          toast.success("Location obtained successfully");
          setIsLoading(false);
        },
        (error) => {
          setLocationError("Could not get your location");
          toast.error("Location access denied");
          setIsLoading(false);
        },
        { timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation not supported");
      toast.error("Browser doesn't support geolocation");
    }
  };

  // Reset all filters and fetch all jobs
  const resetFilters = () => {
    setFilters({
      jobType: {
        internship: false,
        fullTime: false,
        partTime: false,
        contract: false,
        volunteer: false,
      },
      locationType: {
        remote: false,
        hybrid: false,
        onsite: false,
      },
      maxDistance: 50,
      datePosted: "anytime",
    });
    setSearch("");
    setUserLocation(null);
    setLocationError(null);
    fetchJobs();
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/job/unverified");
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      toast.error("Failed to fetch job listings");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch filtered jobs based on current filters
  const fetchFilteredJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/job/filtered", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search: search || "",
          jobType: filters.jobType,
          locationType: filters.locationType,
          maxDistance: filters.maxDistance,
          datePosted: filters.datePosted,
          userLocation,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch filtered jobs");
      }
      const jsonResponse = await response.json();
      console.log(jsonResponse);
      setJobs(jsonResponse || {});
    } catch (error) {
      console.error("Error filtering jobs:", error);
      toast.error("Failed to apply filters");
    } finally {
      setIsLoading(false);
    }
  };

  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedFetchFilteredJobs = debounce(fetchFilteredJobs, 500);

  // Load initial jobs when user is available
  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const hasActiveFilters =
        search ||
        Object.values(filters.jobType).some(Boolean) ||
        Object.values(filters.locationType).some(Boolean) ||
        filters.maxDistance !== 50 ||
        filters.datePosted !== "anytime";

      if (hasActiveFilters) {
        debouncedFetchFilteredJobs();
      } else {
        // When no filters are active, show all jobs
        fetchJobs();
      }
    }
  }, [search, filters, userLocation, user]);

  // Format salary for display
  const formatSalary = (salary: string) => {
    const salaryNum = parseInt(salary);
    if (isNaN(salaryNum)) return "Salary not specified";
    if (salaryNum >= 1000) {
      return `$${(salaryNum / 1000).toFixed(0)}k`;
    }
    return `$${salaryNum}`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const jobDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - jobDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };
  // Filter jobs based on search
  const filteredJobs = Object.entries(jobs).filter(([id, job]) => {
    if (!job || typeof job !== 'object') return false;
    const searchLower = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchLower) ||
      job.company.toLowerCase().includes(searchLower) ||
      job.description.toLowerCase().includes(searchLower) ||
      job.skills.some((skill) => skill.toLowerCase().includes(searchLower))
    );
  });
  // If still loading auth state, show a simple loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    );
  }
// 2. Not logged in (welcome page + scrubby)
if (!user) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background flex flex-col md:flex-row items-center justify-between px-12 py-12 gap-12">
      {/* Left side: Scrubby GIF */}
      <div className="flex-1 max-w-lg rounded-xl p-12 text-center self-start -mt-8 bg-[#DDDBD5] dark:bg-muted shadow-md">
        <img
          src="/assets/Scrubby-logo.gif"
          alt="Scrubby Logo"
          className="mx-auto w-full mb-4 rounded"
        />
        <p className="text-black dark:text-foreground text-sm">
          JobScrub simplifies your career journey with powerful tools designed to match you with the right opportunities.
          Upload your resume, discover personalized job listings, and manage your applications — all in one place.
          Your next career move starts here.
        </p>
        <Link href="/signup">
          <button className="mt-4 bg-green-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-green-700">
            Get Started
          </button>
        </Link>
      </div>

      {/* Right side: text */}
      <div className="flex-1 flex flex-col items-center text-center">
        <div className="max-w-xl mx-auto">
          <p className="text-green-600 dark:text-green-400 text-base font-semibold mb-2">
            Find Your Dream Job Today!
          </p>
          <h1 className="text-6xl font-extrabold text-black dark:text-foreground">
            Welcome to
          </h1>
          <h1 className="text-6xl font-extrabold text-black dark:text-foreground">
            JobScrub!
          </h1>
          <p className="text-gray-700 dark:text-muted-foreground text-lg mt-6 leading-relaxed font-medium">
            Your Career Journey, Simplified.
          </p>

          {/* Bullet Points */}
          <ul className="text-gray-600 dark:text-muted-foreground text-sm mt-6 space-y-2 text-left pl-2">
            <li>• Upload your resume in seconds</li>
            <li>• Discover job matches instantly</li>
            <li>• Track and manage your applications easily</li>
          </ul>

          {/* Buttons */}
          <div className="mt-8 flex flex-col items-center">
            <Link href="/signup">
              <button className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg text-lg hover:bg-green-700">
                Create an Account
              </button>
            </Link>
            <Link href="/login" className="mt-4 text-blue-600 hover:underline text-base">
              Already a User? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// If user is logged in, show the dashboard/main application
return (
  <div className="min-h-screen bg-gray-100 dark:bg-background flex flex-col">
    <main className="flex-1 container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="sticky top-24 bg-white dark:bg-card dark:text-foreground rounded-lg shadow p-4 border border-gray-300 dark:border-muted">
            <h2 className="font-semibold text-lg mb-4">Quick Links</h2>
            <nav className="space-y-2">
              <ApplicationBadge />
              <SavedJobsBadge />
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Search Bar */}
          <div className="bg-white dark:bg-card dark:text-foreground rounded-lg shadow p-4 mb-6 border border-gray-300 dark:border-muted">
            <h2 className="text-lg font-semibold mb-3">
              Find Your Next Opportunity
            </h2>
            <div className="flex items-center">
              <div className="flex-1 flex items-center border-2 border-gray-300 dark:border-muted rounded-lg bg-white dark:bg-muted px-4 py-2">
                <FaSearch className="text-gray-300 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for job titles, companies, or keywords"
                  className="ml-2 flex-1 outline-none bg-transparent text-gray-800 dark:text-gray-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                className="ml-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={() =>
                  filteredJobs.length > 0
                    ? null
                    : toast.error("No matching jobs found")
                }
              >
                Search
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {["Remote", "Full-time", "Part-time", "Tech"].map((tag) => (
                <button
                  key={tag}
                  className="px-3 py-1 border border-gray-300 dark:border-muted bg-gray-100 dark:bg-muted text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-muted-foreground"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Job Listings */}
          <div className="bg-white dark:bg-card dark:text-foreground rounded-lg shadow p-6 border border-gray-300 dark:border-muted">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Job Listings</h2>
              <button
                onClick={fetchJobs}
                className="text-sm text-green-600 hover:text-green-700"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-2 border-green-600"></div>
                <p className="mt-2 text-gray-600 dark:text-muted-foreground">Loading jobs...</p>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-4">
                {filteredJobs.map(([jobId, job]) => (
                  <div
                    key={jobId}
                    className="border-2 border-gray-300 dark:border-muted rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between">
                      <h3 className="font-medium text-lg">{job.title}</h3>
                      <span className="text-sm text-gray-300 dark:text-muted-foreground">
                        {formatDate(job.date)}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-muted-foreground font-medium">{job.company}</p>

                    <div className="flex flex-wrap gap-2 my-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-muted-foreground">
                        <FaBriefcase className="mr-1" />
                        {job.job_type}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-muted-foreground">
                        <FaMapMarkerAlt className="mr-1" />
                        {job.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-muted-foreground">
                        <FaDollarSign className="mr-1" />
                        {formatSalary(job.salary)}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-muted-foreground line-clamp-2 mt-1">
                      {job.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {job.skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 3 && (
                        <span className="bg-gray-100 dark:bg-muted text-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded">
                          +{job.skills.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex justify-between items-center">
                      {job.verified ? (
                        <span className="text-xs text-green-600 flex items-center">
                          ✓ Verified listing
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-muted-foreground flex items-center">
                          Pending verification
                        </span>
                      )}
                      <div className="flex space-x-2">
                        <button className="text-sm text-blue-600 hover:underline">
                          Save
                        </button>
                        <Link
                          href={`/jobs/${jobId}`}
                          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-lg text-gray-600 dark:text-muted-foreground">
                  No jobs found{search ? " matching your search" : ""}.
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-2 text-green-600 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {filteredJobs.length > 0 && (
              <div className="mt-6 text-center">
                <Link href="/jobs/browse" className="text-blue-600 hover:underline">
                  View All Job Listings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  </div>
);
}
