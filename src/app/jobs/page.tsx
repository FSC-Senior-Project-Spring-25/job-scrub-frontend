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
import { Job } from "@/types/types";
import Link from "next/link";
import { toast } from "sonner";
import AnimatedLogo from "@/components/animated-logo";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../auth-context";

// Map job type to a more readable format
const jobTypeLabels = {
  fulltime: "Full Time",
  parttime: "Part Time",
  internship: "Internship",
  contract: "Contract",
  volunteer: "Volunteer",
  remote: "Remote",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      remote: false,
    },
    locationType: {
      remote: false,
      hybrid: false,
      onsite: false,
    },
    maxDistance: 50, // in miles
    datePosted: "anytime",
  });
  const jobsPerPage = 10;
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  
  // Process URL search params on initial load
  useEffect(() => {
    const searchQuery = searchParams.get("search");
    if (searchQuery) {
      setSearch(searchQuery);
      // If there's a search query in the URL, we should apply it immediately
      const hasActiveFilters = true; // Force filter application
      if (hasActiveFilters) {
        debouncedFetchFilteredJobs();
      }
    } else {
      fetchJobs(); // Default fetch all jobs if no search param
    }
  }, [searchParams]); // Re-run when URL parameters change

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
        (error) => {
          setLocationError("Could not get your location");
          toast.error("Location access denied");
          setLoading(false);
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
        remote: false,
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

  useEffect(() => {
    fetchJobs();
  }, []);

  // Fetch filtered jobs based on current filters
  const fetchFilteredJobs = async () => {
    setLoading(true);
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
      
      const data = await response.json();
      
      // Transform the data to match the Job interface
      const transformedJobs = processJobData(data);
      
      setJobs(transformedJobs);
      
      // Safely calculate total pages
      const jobCount = transformedJobs?.length || 0;
      setTotalPages(Math.max(1, Math.ceil(jobCount / jobsPerPage)));
      
    } catch (error) {
      console.error("Error filtering jobs:", error);
      toast.error("Failed to apply filters");
      setJobs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
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
      const transformedJobs = processJobData(data);
      
      setJobs(transformedJobs);

      // Safely calculate total pages
      const jobCount = transformedJobs?.length || 0;
      setTotalPages(Math.max(1, Math.ceil(jobCount / jobsPerPage)));
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch job listings");
      // Set empty array to prevent undefined length errors
      setJobs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };
  
  // Process job data from API response
  const processJobData = (data: any): Job[] => {
    if (!Array.isArray(data)) {
      // Handle case where data might be an object with job IDs as keys
      if (data && typeof data === 'object') {
        return Object.entries(data).map(([id, job]: [string, any]) => {
          const jobData = job.metadata || job;
          return transformJobData(id, jobData);
        });
      }
      return [];
    }
    
    // Handle array format
    return data.map((item: any) => {
      const id = item.id || "";
      const jobData = item.metadata || item;
      return transformJobData(id, jobData);
    });
  };
  
  // Transform raw job data to match Job interface
  const transformJobData = (id: string, jobData: any): Job => {
    return {
      id: id,
      title: jobData.title || "",
      company: jobData.company || "",
      description: jobData.description || "",
      location: jobData.address || jobData.location?.address || "",
      jobType: jobData.jobType || "fulltime",
      locationType: jobData.locationType || "onsite",
      date: jobData.date || new Date().toISOString(),
      url: jobData.url || "",
      salary: jobData.salary || "",
      skills: Array.isArray(jobData.skills) ? jobData.skills : [],
      keywords: Array.isArray(jobData.keywords) ? jobData.keywords : [],
      benefits: Array.isArray(jobData.benefits) ? jobData.benefits : [],
      verified: !!jobData.verified,
      lat: jobData.lat || jobData.location?.lat || 0,
      lon: jobData.lon || jobData.location?.lon || 0,
      address: jobData.address || "",
    };
  };

  // Apply filters to jobs
  useEffect(() => {
    const hasActiveFilters =
      search ||
      Object.values(filters.jobType).some(Boolean) ||
      Object.values(filters.locationType).some(Boolean) ||
      filters.maxDistance !== 50 ||
      filters.datePosted !== "anytime" ||
      userLocation !== null;

    if (hasActiveFilters) {
      debouncedFetchFilteredJobs();
    }
  }, [search, filters, userLocation]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const jobDate = new Date(dateString);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - jobDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return jobDate.toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  // Filter jobs based on criteria
  const filterJobs = (jobs: Job[]) => {
    if (!Array.isArray(jobs)) return [];
    
    return jobs.filter((job) => {
      if (!job) return false;

      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !searchLower || 
        job.title?.toLowerCase().includes(searchLower) ||
        job.company?.toLowerCase().includes(searchLower) ||
        job.description?.toLowerCase().includes(searchLower) ||
        job.skills?.some((skill) => skill.toLowerCase().includes(searchLower)) ||
        false;

      return matchesSearch;
    });
  };

  // Safely get current jobs for pagination
  const getCurrentJobs = () => {
    if (!jobs || !Array.isArray(jobs)) return [];

    const filteredJobsList = filterJobs(jobs);
    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    return filteredJobsList.slice(indexOfFirstJob, indexOfLastJob);
  };

  const currentJobs = getCurrentJobs();
  const filteredCount = filterJobs(jobs).length;

  // Change page
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate pagination numbers
  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const calculatedTotalPages = Math.max(1, Math.ceil(filteredCount / jobsPerPage));

    if (calculatedTotalPages <= maxVisiblePages) {
      for (let i = 1; i <= calculatedTotalPages; i++) {
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
      const end = Math.min(calculatedTotalPages - 1, currentPage + 1);

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
      if (currentPage < calculatedTotalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      items.push(
        <PaginationItem key={calculatedTotalPages}>
          <PaginationLink
            onClick={() => handlePageChange(calculatedTotalPages)}
            isActive={calculatedTotalPages === currentPage}
          >
            {calculatedTotalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  // Function to truncate description to a certain length
  const truncateDescription = (text: string = "", maxLength: number = 150) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Render loading skeletons
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <AnimatedLogo />
      </div>
    );
  }

  return (
    <>
      {/* Search and filter section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-2 whitespace-nowrap">
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[90vw] max-w-[700px] p-4" sideOffset={8}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Job Type</h4>
                  <div className="space-y-2">
                    {Object.entries(filters.jobType).map(([type, checked]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`job-type-${type}`}
                          checked={checked}
                          onCheckedChange={(isChecked) =>
                            setFilters({
                              ...filters,
                              jobType: {
                                ...filters.jobType,
                                [type]: !!isChecked,
                              },
                            })
                          }
                        />
                        <label
                          htmlFor={`job-type-${type}`}
                          className="text-sm capitalize"
                        >
                          {type === "fullTime" ? "Full Time" : 
                           type === "partTime" ? "Part Time" : 
                           type.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Location Type</h4>
                  <div className="space-y-2">
                    {Object.entries(filters.locationType).map(([type, checked]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`location-type-${type}`}
                          checked={checked}
                          onCheckedChange={(isChecked) =>
                            setFilters({
                              ...filters,
                              locationType: {
                                ...filters.locationType,
                                [type]: !!isChecked,
                              },
                            })
                          }
                        />
                        <label htmlFor={`location-type-${type}`} className="text-sm capitalize">
                          {type}
                        </label>
                      </div>
                    ))}
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
              
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <h4 className="font-medium mb-2">Distance (miles)</h4>
                  <div className="flex items-center gap-4">
                    <Slider
                      className="w-[200px]"
                      defaultValue={[filters.maxDistance]}
                      value={[filters.maxDistance]}
                      max={500}
                      step={5}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          maxDistance: value[0],
                        })
                      }
                      disabled={!userLocation}
                    />
                    <span className="text-sm block min-w-[60px]">
                      {filters.maxDistance} miles
                    </span>
                  </div>
                  {!userLocation && (
                    <p className="text-xs text-gray-500 mt-1">
                      Set your location first to use distance filter
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:self-end">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset All
                  </Button>
                  <Button size="sm" onClick={getCurrentLocation}>
                    <MapPinned className="w-4 h-4 mr-2" />
                    Use My Location
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={fetchJobs} variant="ghost" className="whitespace-nowrap">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Active filters display */}
        <div className="mt-3 flex flex-wrap gap-2">
          {userLocation && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 flex gap-1 items-center">
              <MapPin className="h-3 w-3" />
              Within {filters.maxDistance} miles
              <button className="ml-1 hover:text-blue-900" onClick={() => setUserLocation(null)}>×</button>
            </Badge>
          )}
          
          {Object.entries(filters.jobType)
            .filter(([_, checked]) => checked)
            .map(([type]) => (
              <Badge key={type} variant="outline" className="bg-green-50 text-green-700 flex gap-1 items-center">
                <Briefcase className="h-3 w-3" />
                {type === "fullTime" ? "Full Time" : 
                 type === "partTime" ? "Part Time" : 
                 type.replace(/([A-Z])/g, " $1").trim()}
                <button 
                  className="ml-1 hover:text-green-900" 
                  onClick={() => 
                    setFilters({
                      ...filters,
                      jobType: {
                        ...filters.jobType,
                        [type]: false,
                      },
                    })
                  }
                >×</button>
              </Badge>
            ))}
            
          {Object.entries(filters.locationType)
            .filter(([_, checked]) => checked)
            .map(([type]) => (
              <Badge key={type} variant="outline" className="bg-purple-50 text-purple-700 flex gap-1 items-center">
                <MapPin className="h-3 w-3" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
                <button 
                  className="ml-1 hover:text-purple-900" 
                  onClick={() => 
                    setFilters({
                      ...filters,
                      locationType: {
                        ...filters.locationType,
                        [type]: false,
                      },
                    })
                  }
                >×</button>
              </Badge>
            ))}
            
          {filters.datePosted !== "anytime" && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 flex gap-1 items-center">
              <Clock className="h-3 w-3" />
              {filters.datePosted === "24h" ? "Last 24 hours" : 
               filters.datePosted === "7d" ? "Last 7 days" : 
               "Last 30 days"}
              <button 
                className="ml-1 hover:text-orange-900" 
                onClick={() => 
                  setFilters({
                    ...filters,
                    datePosted: "anytime",
                  })
                }
              >×</button>
            </Badge>
          )}
          
          {(search || 
            Object.values(filters.jobType).some(Boolean) || 
            Object.values(filters.locationType).some(Boolean) ||
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
      
      {/* Results summary */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-gray-600">
          Showing {filteredCount > 0 ? `1-${Math.min(currentJobs.length, jobsPerPage)} of ${filteredCount}` : "0"} jobs
          {search ? ` matching "${search}"` : ""}
        </div>
      </div>

      {/* Job listings */}
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
              Try adjusting your search criteria or filters to find more opportunities.
            </p>
            <Button 
              onClick={resetFilters}
              variant="outline" 
              className="mt-4"
            >
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
                      {jobTypeLabels[
                        job.jobType as keyof typeof jobTypeLabels
                      ] || job.jobType}
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
                  {truncateDescription(job.description, 200)}
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