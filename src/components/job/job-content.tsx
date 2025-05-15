/**
 * jobs-content.tsx
 *
 * Renders the searchable / filterable job-list page.
 * ▼  NEW IN THIS VERSION
 *   • “Verified only” checkbox in the filter panel
 *   • verifiedOnly flag in local state → sent to backend
 *   • badge in “Active filters” row
 */

"use client";

import { useState, useEffect, useRef, JSX } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/app/auth-context";
import type { Job } from "@/types/types";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  MapPinned,
  Clock,
} from "lucide-react";

import { toast } from "sonner";
import AnimatedLogo from "@/components/animated-logo";

const jobTypeLabels: Record<Job["jobType"], string> = {
  fulltime: "Full Time",
  parttime: "Part Time",
  internship: "Internship",
  contract: "Contract",
  volunteer: "Volunteer",
};

export default function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [tempDistance, setTempDistance] = useState(50);

  const [filters, setFilters] = useState({
    jobType: {
      internship: false,
      fullTime: false,
      partTime: false,
      contract: false,
      volunteer: false,
      remote: false,
    },
    locationType: {
      remote: false,
      hybrid: false,
      onsite: false,
    },
    maxDistance: 50,
    datePosted: "anytime",
    verifiedOnly: false,
  });

  const jobsPerPage = 10;
  const { user, loading: authLoading } = useAuth();

  /* search param from URL */
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const initialFetchDoneRef = useRef(false);

  /** decide when to fetch all or filtered jobs */
  useEffect(() => {
    const searchQuery = searchParams.get("search");

    if (searchQuery !== null && searchQuery !== search) {
      setSearch(searchQuery);
    }

    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;

      const hasActiveFilters =
        !!searchQuery ||
        Object.values(filters.jobType).some(Boolean) ||
        Object.values(filters.locationType).some(Boolean) ||
        filters.verifiedOnly ||
        (userLocation && filters.maxDistance !== 50) ||
        filters.datePosted !== "anytime";

      hasActiveFilters ? debouncedFetchFilteredJobs() : fetchJobs();
      return;
    }

    const hasActiveFilters =
      !!search ||
      Object.values(filters.jobType).some(Boolean) ||
      Object.values(filters.locationType).some(Boolean) ||
      filters.verifiedOnly ||
      (userLocation && filters.maxDistance !== 50) ||
      filters.datePosted !== "anytime";

    hasActiveFilters ? debouncedFetchFilteredJobs() : fetchJobs();
  }, [searchParams, filters, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      toast.error("Browser doesn't support geolocation");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
        toast.success("Location obtained successfully");
        setLoading(false);
      },
      () => {
        setLocationError("Could not get your location");
        toast.error("Location access denied");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => setTempDistance(filters.maxDistance), [filters.maxDistance]);

  const resetFilters = () => {
    setFilters({
      jobType: {
        internship: false,
        fullTime: false,
        partTime: false,
        contract: false,
        volunteer: false,
        remote: false,
      },
      locationType: {
        remote: false,
        hybrid: false,
        onsite: false,
      },
      maxDistance: 50,
      datePosted: "anytime",
      verifiedOnly: false,
    });
    setTempDistance(50);
    setSearch("");
    setUserLocation(null);
    setLocationError(null);
    fetchJobs();
  };

  const fetchFilteredJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/job/filtered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: search || "",
          jobType: filters.jobType,
          locationType: filters.locationType,
          maxDistance: filters.maxDistance,
          datePosted: filters.datePosted,
          userLocation,
          verified: filters.verifiedOnly ? true : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch filtered jobs");

      const data = await response.json();
      const jobs = processJobData(data);
      setJobs(jobs);

      const jobCount = jobs.length;
      setTotalPages(Math.max(1, Math.ceil(jobCount / jobsPerPage)));
    } catch (err) {
      console.error("Error filtering jobs:", err);
      toast.error("Failed to apply filters");
      setJobs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const debounce = (fn: (...args: any[]) => void, delay: number) => {
    let t: NodeJS.Timeout;
    return (...a: any[]) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), delay);
    };
  };
  const debouncedFetchFilteredJobs = debounce(fetchFilteredJobs, 500);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/job/all");
      if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.status}`);
      const data = await res.json();
      const jobs = processJobData(data);
      setJobs(jobs);

      const jobCount = jobs.length;
      setTotalPages(Math.max(1, Math.ceil(jobCount / jobsPerPage)));
    } catch (err) {
      console.error("Error fetching jobs:", err);
      toast.error("Failed to fetch job listings");
      setJobs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const processJobData = (data: any): Job[] => {
    if (!Array.isArray(data) && typeof data === "object") {
      return Object.entries(data).map(([id, job]) => {
        const jobObj = job as Record<string, any>;
        return transformJobData(id, jobObj.metadata || jobObj);
      });
    }
    return (data as any[]).map((item) =>
      transformJobData(item.id || "", item.metadata || item)
    );
  };

  const transformJobData = (id: string, job: any): Job => ({
    id,
    title: job.title || "",
    company: job.company || "",
    description: job.description || "",
    locationType: job.locationType || "onsite",
    jobType: job.jobType || "fulltime",
    address: job.address || job.location?.address || "",
    date: job.date || new Date().toISOString(),
    url: job.url || "",
    salary: job.salary || "",
    skills: Array.isArray(job.skills) ? job.skills : [],
    keywords: Array.isArray(job.keywords) ? job.keywords : [],
    benefits: Array.isArray(job.benefits) ? job.benefits : [],
    verified: !!job.verified,
    lat: job.lat || job.location?.lat || 0,
    lon: job.lon || job.location?.lon || 0,
    location: job.location || null,
  });

  const truncate = (txt = "", n = 150) =>
    txt.length <= n ? txt : `${txt.slice(0, n)}…`;

  const formatDate = (dateStr: string) => {
    try {
      const jobDate = new Date(dateStr);
      const today = new Date();
      const diffDays = Math.ceil(Math.abs(+today - +jobDate) / 86_400_000);

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return jobDate.toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  const filterJobs = (arr: Job[]) => {
    const s = search.toLowerCase();
    return arr.filter(
      (j) =>
        !s ||
        j.title.toLowerCase().includes(s) ||
        j.company.toLowerCase().includes(s) ||
        j.description.toLowerCase().includes(s) ||
        j.skills.some((sk) => sk.toLowerCase().includes(s))
    );
  };

  const getCurrentJobs = () => {
    const filtered = filterJobs(jobs);
    const start = (currentPage - 1) * jobsPerPage;
    return filtered.slice(start, start + jobsPerPage);
  };

  const currentJobs = getCurrentJobs();
  const filteredCount = filterJobs(jobs).length;

  const handlePageChange = (n: number) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generatePaginationItems = () => {
    const items: JSX.Element[] = [];
    const maxVisible = 5;
    const pages = Math.max(1, Math.ceil(filteredCount / jobsPerPage));

    const add = (i: number) =>
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

    if (pages <= maxVisible) {
      for (let i = 1; i <= pages; i++) add(i);
    } else {
      add(1);
      if (currentPage > 3)
        items.push(
          <PaginationItem key="e1">
            <PaginationEllipsis />
          </PaginationItem>
        );

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(pages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) add(i);

      if (currentPage < pages - 2)
        items.push(
          <PaginationItem key="e2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      add(pages);
    }
    return items;
  };

  const renderSkeletons = () =>
    Array.from({ length: jobsPerPage }, (_, i) => (
      <Card key={i} className="mb-4">
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, j) => (
            <Skeleton key={j} className="h-4 w-full mb-2" />
          ))}
          <div className="flex flex-wrap gap-2 mt-4">
            {[...Array(3)].map((_, j) => (
              <Skeleton key={j} className="h-6 w-16" />
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    ));

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* search input */}
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg bg-white px-4 py-2">
            <Search className="text-gray-500 h-5 w-5" />
            <input
              type="text"
              placeholder="Search job titles, companies, keywords..."
              className="ml-2 flex-1 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* filters dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex gap-2 whitespace-nowrap"
              >
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-[90vw] max-w-[700px] p-4"
              sideOffset={8}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Job Type</h4>
                  <div className="space-y-2">
                    {Object.entries(filters.jobType).map(([type, checked]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`jt-${type}`}
                          checked={checked}
                          onCheckedChange={(v) =>
                            setFilters((p) => ({
                              ...p,
                              jobType: { ...p.jobType, [type]: !!v },
                            }))
                          }
                        />
                        <label
                          htmlFor={`jt-${type}`}
                          className="text-sm capitalize"
                        >
                          {type === "fullTime"
                            ? "Full Time"
                            : type === "partTime"
                            ? "Part Time"
                            : type.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Location Type</h4>
                  <div className="space-y-2">
                    {Object.entries(filters.locationType).map(
                      ([type, checked]) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`lt-${type}`}
                            checked={checked}
                            onCheckedChange={(v) =>
                              setFilters((p) => ({
                                ...p,
                                locationType: {
                                  ...p.locationType,
                                  [type]: !!v,
                                },
                              }))
                            }
                          />
                          <label
                            htmlFor={`lt-${type}`}
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
                  <h4 className="font-medium mb-2">Date Posted</h4>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={filters.datePosted}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, datePosted: e.target.value }))
                    }
                  >
                    <option value="anytime">Anytime</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Other</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="verified-only"
                        checked={filters.verifiedOnly}
                        onCheckedChange={(v) =>
                          setFilters((p) => ({ ...p, verifiedOnly: !!v }))
                        }
                      />
                      <label htmlFor="verified-only" className="text-sm">
                        Verified only
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* bottom actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-2">
                {/* distance slider */}
                <div className="flex flex-col">
                  <h4 className="font-medium mb-2">Distance (miles)</h4>
                  <div className="flex items-center gap-4">
                    <Slider
                      className={`w-[200px] ${
                        !userLocation ? "opacity-50" : ""
                      }`}
                      defaultValue={[filters.maxDistance]}
                      value={[tempDistance]}
                      max={500}
                      min={1}
                      step={5}
                      onValueChange={(v) => setTempDistance(v[0])}
                      onValueCommit={(v) => {
                        if (!userLocation) {
                          toast.info(
                            "Please enable location to use distance filtering",
                            {
                              action: {
                                label: "Enable Location",
                                onClick: getCurrentLocation,
                              },
                            }
                          );
                          return;
                        }
                        setFilters((p) => ({ ...p, maxDistance: v[0] }));
                      }}
                      disabled={!userLocation}
                    />
                    <span className="text-sm block min-w-[60px]">
                      {tempDistance} mi
                    </span>
                  </div>

                  {!userLocation ? (
                    <div className="mt-2">
                      <p className="text-xs text-amber-500 flex items-center mb-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        Location access needed for distance filtering
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1 h-auto"
                        onClick={getCurrentLocation}
                      >
                        <MapPinned className="w-3 h-3 mr-1" />
                        Enable Location
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      Using your current location
                    </p>
                  )}
                </div>

                {/* reset btn */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:self-end">
                  <Button variant="default" size="sm" onClick={resetFilters}>
                    Reset All
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={fetchJobs}
            variant="ghost"
            className="whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {userLocation && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 flex gap-1 items-center"
            >
              <MapPin className="h-3 w-3" />
              Within {filters.maxDistance} mi
              <button
                className="ml-1 hover:text-blue-900"
                onClick={() => setUserLocation(null)}
              >
                ×
              </button>
            </Badge>
          )}

          {Object.entries(filters.jobType)
            .filter(([_, v]) => v)
            .map(([t]) => (
              <Badge
                key={t}
                variant="outline"
                className="bg-green-50 text-green-700 flex gap-1 items-center"
              >
                <Briefcase className="h-3 w-3" />
                {t === "fullTime"
                  ? "Full Time"
                  : t === "partTime"
                  ? "Part Time"
                  : t.replace(/([A-Z])/g, " $1").trim()}
                <button
                  className="ml-1 hover:text-green-900"
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      jobType: { ...p.jobType, [t]: false },
                    }))
                  }
                >
                  ×
                </button>
              </Badge>
            ))}

          {Object.entries(filters.locationType)
            .filter(([_, v]) => v)
            .map(([t]) => (
              <Badge
                key={t}
                variant="outline"
                className="bg-purple-50 text-purple-700 flex gap-1 items-center"
              >
                <MapPin className="h-3 w-3" />
                {t[0].toUpperCase() + t.slice(1)}
                <button
                  className="ml-1 hover:text-purple-900"
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      locationType: { ...p.locationType, [t]: false },
                    }))
                  }
                >
                  ×
                </button>
              </Badge>
            ))}

          {filters.verifiedOnly && (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 flex gap-1 items-center"
            >
              <CheckCircle className="h-3 w-3" />
              Verified
              <button
                className="ml-1 hover:text-emerald-900"
                onClick={() =>
                  setFilters((p) => ({ ...p, verifiedOnly: false }))
                }
              >
                ×
              </button>
            </Badge>
          )}

          {filters.datePosted !== "anytime" && (
            <Badge
              variant="outline"
              className="bg-orange-50 text-orange-700 flex gap-1 items-center"
            >
              <Clock className="h-3 w-3" />
              {filters.datePosted === "24h"
                ? "Last 24 hours"
                : filters.datePosted === "7d"
                ? "Last 7 days"
                : "Last 30 days"}
              <button
                className="ml-1 hover:text-orange-900"
                onClick={() =>
                  setFilters((p) => ({ ...p, datePosted: "anytime" }))
                }
              >
                ×
              </button>
            </Badge>
          )}

          {(search ||
            Object.values(filters.jobType).some(Boolean) ||
            Object.values(filters.locationType).some(Boolean) ||
            filters.verifiedOnly ||
            filters.datePosted !== "anytime" ||
            userLocation) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <div className="text-gray-600">
          Showing{" "}
          {filteredCount > 0
            ? `1-${Math.min(
                currentJobs.length,
                jobsPerPage
              )} of ${filteredCount}`
            : "0"}{" "}
          jobs
          {search && ` matching “${search}”`}
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          renderSkeletons()
        ) : currentJobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700">
              No jobs found
            </h2>
            <p className="text-gray-500 mt-2">
              Try adjusting your search criteria or filters to find more
              opportunities.
            </p>
            <Button onClick={resetFilters} variant="outline" className="mt-4">
              Reset all filters
            </Button>
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
                    <span>{job.address || "Location not specified"}</span>
                  </div>
                  <div className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-1" />
                    <span>
                      {jobTypeLabels[job.jobType] || job.jobType}
                      {job.locationType === "remote" && " • Remote"}
                      {job.locationType === "hybrid" && " • Hybrid"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(job.date)}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span>{job.salary}</span>
                    </div>
                  )}
                </div>

                <p className="text-gray-700 mb-4">
                  {truncate(job.description, 200)}
                </p>

                {job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.slice(0, 5).map((skill, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {job.skills.length > 5 && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
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
                      {job.benefits.slice(0, 3).map((b, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="bg-green-50 text-green-700"
                        >
                          {b}
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

        {/* pagination */}
        {!loading && currentJobs.length > 0 && (
          <Pagination className="mt-8">
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
    </>
  );
}
