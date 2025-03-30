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
} from "react-icons/fa";
import { toast } from "sonner";
import { useAuth } from "./auth-context";
import { Job } from "@/types/types";
import AnimatedLogo from "@/components/animated-logo";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading } = useAuth();

  // Fetch jobs when the component mounts and user is authenticated
  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

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

  // Format salary for display
  const formatSalary = (salary: string) => {
    const salaryNum = parseInt(salary);
    if (isNaN(salaryNum)) return "Salary not specified";

    if (salaryNum >= 1000) {
      return `$${(salaryNum / 1000).toFixed(0)}k`;
    }
    return `$${salaryNum}`;
  };

  // Format date to show days ago
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

  // If user is logged out, show the welcome/signup page
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

  // If user is logged in, show the dashboard/main application
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
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

          {/* Main content area */}
          <div className="md:col-span-2">
            {/* Search Bar */}
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
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                  Remote
                </button>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                  Full-time
                </button>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                  Part-time
                </button>
                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
                  Tech
                </button>
              </div>
            </div>

            {/* Job Listings */}
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
              ) : filteredJobs.length > 0 ? (
                <div className="space-y-4">
                  {filteredJobs.map(([jobId, job]) => (
                    <div
                      key={jobId}
                      className="border rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between">
                        <h3 className="font-medium text-lg">{job.title}</h3>
                        <span className="text-sm text-gray-500">
                          {formatDate(job.date)}
                        </span>
                      </div>
                      <p className="text-gray-700 font-medium">{job.company}</p>
                      <div className="flex flex-wrap gap-2 my-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FaBriefcase className="mr-1" />
                          {job.job_type}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FaMapMarkerAlt className="mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FaDollarSign className="mr-1" />
                          {formatSalary(job.salary)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {job.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {job.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 3 && (
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
                  ))}
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

              {filteredJobs.length > 0 && (
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
