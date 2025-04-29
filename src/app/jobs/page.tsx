"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { Job } from "@/types/types";
import Link from "next/link";

// Map job type to a more readable format
const jobTypeLabels = {
  fulltime: "Full Time",
  parttime: "Part Time",
  internship: "Internship",
  contract: "Contract",
  volunteer: "Volunteer",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const jobsPerPage = 10;

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        // Use the /api/job/all route
        const response = await fetch("/api/job/all");

        if (!response.ok) {
          throw new Error(`Failed to fetch jobs: ${response.status}`);
        }

        const data = await response.json();

        // Transform the data to match the Job interface
        // This handles the API response format where each job has id and metadata
        const transformedJobs: Job[] = Array.isArray(data)
          ? data.map((item: any) => {
              const jobData = item.metadata || item;
              return {
                id: item.id || "",
                title: jobData.title || "",
                company: jobData.company || "",
                description: jobData.description || "",
                location: jobData.address || "",
                jobType: jobData.jobType || jobData.locationType || "fulltime",
                date: jobData.date || new Date().toISOString(),
                url: jobData.url || "",
                salary: jobData.salary || "",
                skills: Array.isArray(jobData.skills) ? jobData.skills : [],
                benefits: Array.isArray(jobData.benefits)
                  ? jobData.benefits
                  : [],
                verified: !!jobData.verified,
                lat: jobData.lat || 0,
                lon: jobData.lon || 0,
              };
            })
          : [];

        setJobs(transformedJobs);

        // Safely calculate total pages
        const jobCount = transformedJobs?.length || 0;
        setTotalPages(Math.max(1, Math.ceil(jobCount / jobsPerPage)));
      } catch (error) {
        console.error("Error fetching jobs:", error);
        // Set empty array to prevent undefined length errors
        setJobs([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Safely get current jobs for pagination
  const getCurrentJobs = () => {
    if (!jobs || !Array.isArray(jobs)) return [];

    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    return jobs.slice(indexOfFirstJob, indexOfLastJob);
  };

  const currentJobs = getCurrentJobs();

  // Change page
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate pagination numbers
  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if less than max visible
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={i === currentPage}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={1 === currentPage}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is more than 3
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={i === currentPage}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is less than totalPages - 2
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => handlePageChange(totalPages)}
            isActive={totalPages === currentPage}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  const renderSkeletons = () => {
    return Array(jobsPerPage)
      .fill(0)
      .map((_, index) => (
        <Card key={index} className="mb-4">
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex flex-wrap gap-2 mt-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ));
  };

  // Function to truncate description to a certain length
  const truncateDescription = (text: string = "", maxLength: number = 150) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          <span className="bg-green-700 text-white px-2 py-1 rounded mr-1">
            Job
          </span>
          <span className="text-green-700">Scrub</span>
        </h1>
        <p className="text-gray-600">
          Browse and find the perfect job opportunity
        </p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          renderSkeletons()
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-700">
              No jobs found
            </h2>
            <p className="text-gray-500 mt-2">
              Please try again later or adjust your search criteria.
            </p>
          </div>
        ) : (
          currentJobs.map((job) => (
            <Card
              key={job.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-green-700">
                      {job.title}
                    </CardTitle>
                    <CardDescription className="text-base font-medium">
                      {job.company}
                    </CardDescription>
                  </div>
                  {job.verified && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-1" />
                    <span>
                      {jobTypeLabels[
                        job.jobType as keyof typeof jobTypeLabels
                      ] || job.jobType}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{new Date(job.date).toLocaleDateString()}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span>{job.salary}</span>
                    </div>
                  )}
                </div>

                <p className="text-gray-700 mb-4">
                  {truncateDescription(job.description)}
                </p>

                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.slice(0, 5).map((skill, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-gray-50"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {job.skills.length > 5 && (
                      <Badge variant="outline" className="bg-gray-50">
                        +{job.skills.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}

                {job.benefits && job.benefits.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Benefits:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {job.benefits.slice(0, 3).map((benefit, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-green-50 text-green-700"
                        >
                          {benefit}
                        </Badge>
                      ))}
                      {job.benefits.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700"
                        >
                          +{job.benefits.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button
                  className="bg-green-700 hover:bg-green-800 text-white"
                  asChild
                >
                  <Link href={`/jobs/${job.id}`}>View Details</Link>
                </Button>

                {job.url && (
                  <Button
                    variant="outline"
                    className="border-green-700 text-green-700 hover:bg-green-50"
                    onClick={() => window.open(job.url, "_blank")}
                  >
                    Apply External
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        )}

        {!loading && jobs.length > 0 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    currentPage > 1 && handlePageChange(currentPage - 1)
                  }
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {generatePaginationItems()}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    currentPage < totalPages &&
                    handlePageChange(currentPage + 1)
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
