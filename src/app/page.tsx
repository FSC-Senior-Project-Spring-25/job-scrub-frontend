"use client";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center">
        <div className="mt-6 w-full flex items-center px-6">
          <span className="mr-6 font-semibold text-black whitespace-nowrap">
            Your Job Search, Our Priority.
          </span>
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg bg-white px-4 py-2 w-full max-w-full">
            <FaSearch className="text-gray-500" />
            <input
              type="text"
              placeholder="Job Title or Company"
              className="ml-2 flex-1 outline-none w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col items-center mt-32 text-center">
          <h2 className="text-6xl font-extrabold text-black drop-shadow-md">
            Welcome to
          </h2>
          <h2 className="text-6xl font-extrabold text-black drop-shadow-md mt-2">
            JobScrub
          </h2>
          <p className="text-gray-600 text-lg mt-2 font-semibold drop-shadow-sm">
            Your Career Journey, Simplified.
          </p>
          <Link
            href="signup"
            className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Create an Account
          </Link>
          <Link href="login" className="mt-2 text-blue-600 hover:underline">
            Already a User? Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold text-lg mb-4">Quick Links</h2>
              <nav className="space-y-2">
                <Link
                  href="/jobs"
                  className="flex px-3 py-2 rounded hover:bg-gray-100 items-center"
                >
                  <FaRegClock className="mr-2" /> My Job Applications
                </Link>
                <Link
                  href="/saved"
                  className="flex px-3 py-2 rounded hover:bg-gray-100 items-center"
                >
                  <FaRegBookmark className="mr-2" /> Saved Jobs
                </Link>
              </nav>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3">
                Find Your Next Opportunity
              </h2>
              <div className="flex items-center">
                <div className="flex-1 flex items-center border border-gray-300 rounded-lg bg-white px-4 py-2">
                  <FaSearch className="text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search for job titles, companies, or keywords"
                    className="ml-2 flex-1 outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-gray-100"
                      >
                        <FaFilter className="text-gray-500 mr-2" />
                        Filters
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[90vw] max-w-[700px] p-4"
                      sideOffset={8}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Job Type</h4>
                          <div className="space-y-2">
                            {Object.entries(filters.jobType).map(
                              ([type, checked]) => (
                                <div
                                  key={type}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`job-type-${type}`}
                                    checked={checked}
                                    onCheckedChange={(isChecked) =>
                                      setFilters({
                                        ...filters,
                                        jobType: {
                                          ...filters.jobType,
                                          [type]: isChecked,
                                        },
                                      })
                                    }
                                  />
                                  <label
                                    htmlFor={`job-type-${type}`}
                                    className="text-sm capitalize"
                                  >
                                    {type.replace(/([A-Z])/g, " $1").trim()}
                                  </label>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Location Type</h4>
                          <div className="space-y-2">
                            {Object.entries(filters.locationType).map(
                              ([type, checked]) => (
                                <div
                                  key={type}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`location-type-${type}`}
                                    checked={checked}
                                    onCheckedChange={(isChecked) =>
                                      setFilters({
                                        ...filters,
                                        locationType: {
                                          ...filters.locationType,
                                          [type]: isChecked,
                                        },
                                      })
                                    }
                                  />
                                  <label
                                    htmlFor={`location-type-${type}`}
                                    className="text-sm capitalize"
                                  >
                                    {type}
                                  </label>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">
                            Max Distance (miles)
                          </h4>
                          <div className="space-y-2">
                            <Slider
                              defaultValue={[filters.maxDistance]}
                              value={[filters.maxDistance]}
                              max={10000}
                              step={5}
                              onValueChange={(value) =>
                                setFilters({
                                  ...filters,
                                  maxDistance: value[0],
                                })
                              }
                              disabled={filters.locationType.remote}
                            />
                            <span className="text-sm block text-center">
                              {filters.maxDistance} miles
                            </span>
                            {filters.locationType.remote && (
                              <p className="text-xs text-gray-500 mt-1">
                                Distance filter disabled for remote jobs
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Date Posted</h4>
                          <select
                            className="w-full p-2 border rounded-md text-sm"
                            value={filters.datePosted}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                datePosted: e.target.value,
                              })
                            }
                          >
                            <option value="anytime">Anytime</option>
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                        >
                          Reset All
                        </Button>
                        <Button size="sm" onClick={getCurrentLocation}>
                          <FaLocationArrow className="mr-2" />
                          Use My Location
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center mt-2">
                {userLocation && (
                  <span className="text-sm text-gray-600 flex items-center mr-4">
                    <FaMapMarkerAlt className="mr-1" />
                    Filtering within {filters.maxDistance} miles of your
                    location
                  </span>
                )}
                {locationError && (
                  <span className="text-sm text-red-600">{locationError}</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
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
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                  <p className="mt-2 text-gray-600">Loading jobs...</p>
                </div>
              ) : Object.keys(jobs).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(jobs).map(([jobId, job]) => {
                    const isRemote = job.locationType === "remote";
                    const hasCoords = job.location?.lat && job.location?.lon;

                    return (
                      <div
                        key={jobId}
                        className="border rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex justify-between">
                          <h3 className="font-medium text-lg">{job.title}</h3>
                          <span className="text-sm text-gray-500">
                            {job.date
                              ? formatDate(job.date)
                              : "Date not specified"}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium">
                          {job.company}
                        </p>
                        <div className="flex flex-wrap gap-2 my-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <FaBriefcase className="mr-1" />
                            {job.jobType || "Job type not specified"}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FaMapMarkerAlt className="mr-1" />
                            {isRemote
                              ? "Remote"
                              : job.location?.address ||
                                "Location not specified"}
                            {userLocation && hasCoords && !isRemote && (
                              <span className="ml-1 text-xs text-gray-500">
                                (
                                {Math.round(
                                  calculateDistance(
                                    userLocation.lat,
                                    userLocation.lng,
                                    job.location.lat,
                                    job.location.lon
                                  )
                                )}
                                miles away)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FaDollarSign className="mr-1" />
                            {job.salary
                              ? formatSalary(job.salary)
                              : "Salary not specified"}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {job.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.skills?.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills?.length > 3 && (
                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
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
                            <span className="text-xs text-gray-500 flex items-center">
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
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-lg text-gray-600">
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

              {Object.keys(jobs).length > 0 && (
                <div className="mt-6 text-center">
                  <Link
                    href="/jobs/browse"
                    className="text-blue-600 hover:underline"
                  >
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
