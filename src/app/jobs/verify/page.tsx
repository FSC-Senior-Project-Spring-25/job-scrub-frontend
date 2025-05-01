"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  X,
  Edit,
  Briefcase,
  MapPin,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobReport } from "@/types/types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { jobReportSchema, type JobReportValues } from "@/lib/schemas";

type FormValues = JobReportValues;

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

interface LocationSuggestion {
  address: string;
  coordinates: {
    lat: number;
    lon: number;
  };
}

export default function VerifyPage() {
  const [allJobs, setAllJobs] = useState<Record<string, JobReport>>({});
  const [filteredJobs, setFilteredJobs] = useState<Record<string, JobReport>>(
    {}
  );
  const { user } = useAuth();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [benefitInput, setBenefitInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [jobToAction, setJobToAction] = useState<string | null>(null);
  const JOBS_PER_PAGE = 3;

  const form = useForm<FormValues>({
    resolver: zodResolver(jobReportSchema),
    defaultValues: {
      title: "",
      company: "",
      url: "",
      date: new Date(),
      description: "",
      salary: "",
      skills: [""],
      benefits: [],
      location: {
        type: "onsite",
        address: "",
      },
      jobType: "fulltime",
    },
  });

  const fetchUnverifiedJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/job/unverified");
      const data = await response.json();

      setAllJobs(data);
      setFilteredJobs(data);

      // Set the first job as active if there are any jobs and no active job
      const jobIds = Object.keys(data);
      if (jobIds.length > 0 && !activeJobId) {
        setActiveJobId(jobIds[0]);
        updateFormWithJobData(data[jobIds[0]]);
      }
    } catch (error) {
      toast.error("Failed to fetch unverified jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredJobs(allJobs);
      setCurrentPage(1);

      const jobIds = Object.keys(allJobs);
      if (jobIds.length > 0) {
        setActiveJobId(jobIds[0]);
        updateFormWithJobData(allJobs[jobIds[0]]);
      }
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = Object.entries(allJobs).reduce((acc, [id, job]) => {
      if (job.title.toLowerCase().includes(lowerQuery)) {
        acc[id] = job;
      }
      return acc;
    }, {} as Record<string, JobReport>);

    setFilteredJobs(filtered);
    setCurrentPage(1);

    const filteredIds = Object.keys(filtered);
    if (filteredIds.length > 0) {
      setActiveJobId(filteredIds[0]);
      updateFormWithJobData(filtered[filteredIds[0]]);
    } else {
      setActiveJobId(null);
    }
  };

  const totalPages = Math.ceil(
    Object.keys(filteredJobs).length / JOBS_PER_PAGE
  );

  const getCurrentPageJobs = () => {
    const jobIds = Object.keys(filteredJobs);
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    const endIndex = startIndex + JOBS_PER_PAGE;

    return jobIds.slice(startIndex, endIndex).reduce((acc, id) => {
      acc[id] = filteredJobs[id];
      return acc;
    }, {} as Record<string, JobReport>);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const updateFormWithJobData = (job: JobReport) => {
    // Format date
    const formattedDate = job.date ? new Date(job.date) : new Date();

    // Parse location data based on the new schema
    const locationData = {
      type: job.locationType || "onsite",
      address: "",
      coordinates: { lat: 0, lon: 0 },
    };

    // If location exists and is not remote, set address and coordinates
    if (
      job.locationType !== "remote" &&
      typeof job.location === "object" &&
      job.location !== null
    ) {
      locationData.address = job.location.address || "";
      locationData.coordinates = {
        lat: job.location.lat,
        lon: job.location.lon,
      };
    }

    form.reset({
      title: job.title || "",
      company: job.company || "",
      url: job.url || "",
      date: formattedDate,
      description: job.description || "",
      salary: job.salary || "",
      skills: job.skills?.length ? job.skills : [""],
      benefits: job.benefits?.length ? job.benefits : [],
      location: locationData,
      jobType: job.jobType as
        | "fulltime"
        | "parttime"
        | "contract"
        | "volunteer"
        | "internship",
    });
  };

  const verifyJob = async (jobId: string, verified: boolean) => {
    if (!user) {
      toast.error("You must be logged in to verify jobs");
      return;
    }

    try {
      setIsSubmitting(true);

      // If we're editing, validate the form first
      if (isEditing) {
        const valid = await form.trigger();
        if (!valid) {
          toast.error("Please fix the errors before verifying the job.");
          setIsSubmitting(false);
          return;
        }
      }

      const formData = form.getValues();

      // Format the job data to match the schema
      const jobData = {
        ...allJobs[jobId],
        title: formData.title,
        company: formData.company,
        url: formData.url,
        date: format(formData.date, "yyyy-MM-dd"),
        description: formData.description,
        salary: formData.salary || "",
        skills: formData.skills.filter((skill) => skill.trim() !== ""),
        benefits: formData.benefits.filter((benefit) => benefit.trim() !== ""),
        location: {
          type: formData.location.type,
          address:
            formData.location.type === "remote"
              ? undefined
              : formData.location.address,
          coordinates:
            formData.location.type === "remote"
              ? undefined
              : formData.location.coordinates,
        },
        jobType: formData.jobType,
      };

      const response = await fetch(
        `/api/job/verify?jobId=${jobId}&verified=${verified}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify(jobData),
        }
      );

      if (response.ok) {
        // Remove the job from both lists
        const updatedAllJobs = { ...allJobs };
        delete updatedAllJobs[jobId];
        setAllJobs(updatedAllJobs);

        const updatedFilteredJobs = { ...filteredJobs };
        delete updatedFilteredJobs[jobId];
        setFilteredJobs(updatedFilteredJobs);

        // Set the next job as active if there are any jobs left
        const remainingJobIds = Object.keys(updatedFilteredJobs);
        const currentPageJobs = Object.keys(getCurrentPageJobs());

        if (currentPageJobs.length > 1) {
          // If there are still jobs on this page, select the next one
          const currentIndex = currentPageJobs.indexOf(jobId);
          const nextJobId =
            currentPageJobs[currentIndex + 1] ||
            currentPageJobs[currentIndex - 1];
          setActiveJobId(nextJobId);
          updateFormWithJobData(updatedFilteredJobs[nextJobId]);
        } else if (remainingJobIds.length > 0) {
          // If this was the last job on the page but there are more jobs
          if (currentPage > Math.ceil(remainingJobIds.length / JOBS_PER_PAGE)) {
            // Go to the previous page if current page no longer exists
            setCurrentPage(Math.ceil(remainingJobIds.length / JOBS_PER_PAGE));
          }
          // Set the first job of the current page as active
          const newCurrentPageJobs = Object.keys(getCurrentPageJobs());
          if (newCurrentPageJobs.length > 0) {
            setActiveJobId(newCurrentPageJobs[0]);
            updateFormWithJobData(updatedFilteredJobs[newCurrentPageJobs[0]]);
          } else {
            setActiveJobId(null);
            form.reset();
          }
        } else {
          setActiveJobId(null);
          form.reset();
        }

        if (verified) {
          toast.success("Job verified and published successfully");
        } else {
          toast.success("Job rejected successfully");
        }
      } else {
        throw new Error("Failed to update job");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to verify job");
    } finally {
      setIsSubmitting(false)
      setIsEditing(false)
      setShowVerifyDialog(false)
      setJobToAction(null)
    }
  };

  useEffect(() => {
    fetchUnverifiedJobs();
  }, []);

  const rejectJob = async (jobId: string) => {
    if (!user) {
      toast.error("You must be logged in to reject jobs");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `/api/job/delete?id=${encodeURIComponent(jobId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        }
      );

      if (response.ok) {
        // Remove the job from both lists
        const updatedAllJobs = { ...allJobs };
        delete updatedAllJobs[jobId];
        setAllJobs(updatedAllJobs);

        const updatedFilteredJobs = { ...filteredJobs };
        delete updatedFilteredJobs[jobId];
        setFilteredJobs(updatedFilteredJobs);

        // Set the next job as active if there are any jobs left
        const remainingJobIds = Object.keys(updatedFilteredJobs);
        const currentPageJobs = Object.keys(getCurrentPageJobs());

        if (currentPageJobs.length > 1) {
          // If there are still jobs on this page, select the next one
          const currentIndex = currentPageJobs.indexOf(jobId);
          const nextJobId =
            currentPageJobs[currentIndex + 1] ||
            currentPageJobs[currentIndex - 1];
          setActiveJobId(nextJobId);
          updateFormWithJobData(updatedFilteredJobs[nextJobId]);
        } else if (remainingJobIds.length > 0) {
          // If this was the last job on the page but there are more jobs
          if (currentPage > Math.ceil(remainingJobIds.length / JOBS_PER_PAGE)) {
            // Go to the previous page if current page no longer exists
            setCurrentPage(Math.ceil(remainingJobIds.length / JOBS_PER_PAGE));
          }
          // Set the first job of the current page as active
          const newCurrentPageJobs = Object.keys(getCurrentPageJobs());
          if (newCurrentPageJobs.length > 0) {
            setActiveJobId(newCurrentPageJobs[0]);
            updateFormWithJobData(updatedFilteredJobs[newCurrentPageJobs[0]]);
          } else {
            setActiveJobId(null);
            form.reset();
          }
        } else {
          setActiveJobId(null);
          form.reset();
        }

        toast.success("Job deleted successfully");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete job");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete job");
    } finally {
      setIsSubmitting(false)
      setShowRejectDialog(false)
      setJobToAction(null)
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Discard changes
      if (activeJobId) {
        updateFormWithJobData(allJobs[activeJobId]);
      }
    }
    setIsEditing(!isEditing);
  };

  const saveChanges = async () => {
    if (!activeJobId) return;

    const valid = await form.trigger();
    if (!valid) {
      toast.error("Please fix the errors before saving changes.");
      return;
    }

    const formData = form.getValues();

    // Update the job in state with the new schema
    const updatedJob: JobReport = {
      ...allJobs[activeJobId],
      title: formData.title,
      company: formData.company,
      url: formData.url,
      date: format(formData.date, "yyyy-MM-dd"),
      description: formData.description,
      salary: formData.salary || null,
      skills: formData.skills.filter((skill) => skill.trim() !== ""),
      benefits:
        formData.benefits.filter((benefit) => benefit.trim() !== "") || [],
      location:
        formData.location.type === "remote"
          ? null
          : {
              address: formData.location.address || "",
              lat: formData.location.coordinates?.lat || 0,
              lon: formData.location.coordinates?.lon || 0,
            },
      locationType: formData.location.type,
      jobType: formData.jobType,
    };
    setAllJobs({
      ...allJobs,
      [activeJobId]: updatedJob as JobReport,
    });

    setIsEditing(false);
    toast.success("Changes saved successfully");
  };

  const fetchLocationSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setLocationSuggestions([]);
        return;
      }

      const requestId = Date.now();
      (fetchLocationSuggestions as any).lastRequestId = requestId;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );

        if ((fetchLocationSuggestions as any).lastRequestId !== requestId) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const suggestions: LocationSuggestion[] = data
            .map((item: any) => {
              // Get the most specific location name with fallbacks
              const locationName =
                item.address?.city ||
                item.address?.town ||
                item.address?.village;

              // Skip if no location name found
              if (!locationName) return null;

              // For US addresses, use state
              if (
                item.address?.country === "United States" &&
                item.address?.state
              ) {
                return {
                  address: `${locationName}, ${item.address.state}`,
                  coordinates: {
                    lat: Number.parseFloat(item.lat),
                    lon: Number.parseFloat(item.lon),
                  },
                };
              }

              // For international addresses, use country
              if (item.address?.country) {
                return {
                  address: `${locationName}, ${item.address.country}`,
                  coordinates: {
                    lat: Number.parseFloat(item.lat),
                    lon: Number.parseFloat(item.lon),
                  },
                };
              }

              return null;
            })
            .filter((item: any): item is LocationSuggestion => item !== null);

          setLocationSuggestions(suggestions);
        }
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      }
    }, 300),
    []
  );

  const addSkill = () => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !form.getValues().skills.includes(trimmedSkill)) {
      const currentSkills = form
        .getValues()
        .skills.filter((skill) => skill.trim() !== "");
      form.setValue("skills", [...currentSkills, trimmedSkill]);
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    form.setValue(
      "skills",
      form.getValues().skills.filter((skill) => skill !== skillToRemove)
    );
  };

  const addBenefit = () => {
    const trimmedBenefit = benefitInput.trim();
    if (
      trimmedBenefit &&
      !form.getValues().benefits?.includes(trimmedBenefit)
    ) {
      const currentBenefits = form.getValues().benefits || [];
      form.setValue("benefits", [...currentBenefits, trimmedBenefit]);
      setBenefitInput("");
    }
  };

  const removeBenefit = (benefitToRemove: string) => {
    form.setValue(
      "benefits",
      (form.getValues().benefits || []).filter(
        (benefit) => benefit !== benefitToRemove
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-pulse text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading jobs...</h2>
          <p className="text-muted-foreground">
            Please wait while we fetch unverified jobs
          </p>
        </div>
      </div>
    );
  }

  if (Object.keys(allJobs).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">All caught up!</h2>
        <p className="text-muted-foreground">
          There are no jobs waiting for verification.
        </p>
        <Button className="mt-4" onClick={fetchUnverifiedJobs}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Job Verification</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {Object.keys(allJobs).length} job
            {Object.keys(allJobs).length !== 1 ? "s" : ""} pending
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchUnverifiedJobs}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search job titles..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {searchQuery && Object.keys(filteredJobs).length === 0 && (
          <div className="text-center py-8 border rounded-lg bg-muted/20 mb-4">
            <h3 className="text-lg font-medium mb-2">No matching jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Try a different search term or clear your search
            </p>
            <Button
              variant="outline"
              onClick={() => handleSearch("")}
              className="mx-auto"
            >
              Clear Search
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs
        value={activeJobId || ""}
        onValueChange={(value) => {
          setActiveJobId(value);
          if (filteredJobs[value]) {
            updateFormWithJobData(filteredJobs[value]);
          }
          setIsEditing(false);
        }}
        className="mb-6"
      >
        <div className="mb-4">
          <TabsList className="w-full flex flex-wrap gap-2">
            {Object.entries(getCurrentPageJobs()).map(([jobId, job]) => (
              <TabsTrigger
                key={jobId}
                value={jobId}
                className="text-sm px-3 py-2 mb-2 flex-grow flex-shrink-0 basis-[calc(33.333%-0.667rem)]"
                title={job.title}
              >
                {job.title.length > 30
                  ? `${job.title.substring(0, 15)}...`
                  : job.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {Object.entries(filteredJobs).map(([jobId, job]) => (
          <TabsContent key={jobId} value={jobId}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">
                  {isEditing ? "Edit Job Details" : "Review Job Details"}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={isEditing ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleEdit}
                    disabled={isSubmitting}
                  >
                    {isEditing ? (
                      "Cancel"
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </>
                    )}
                  </Button>
                  {isEditing && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={saveChanges}
                      disabled={isSubmitting}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Title</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                                <Input
                                  {...field}
                                  disabled={!isEditing || isSubmitting}
                                  placeholder="Enter job title"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing || isSubmitting}
                                placeholder="Enter company name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Location Type Field */}
                      <FormField
                        control={form.control}
                        name="location.type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Type</FormLabel>
                            <Select
                              disabled={!isEditing || isSubmitting}
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="remote">Remote</SelectItem>
                                <SelectItem value="onsite">On-site</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Only show address field if not remote */}
                      {form.watch("location.type") !== "remote" && (
                        <FormField
                          control={form.control}
                          name="location.address"
                          render={({ field }) => (
                            <FormItem className="relative">
                              <FormLabel>Location Address</FormLabel>
                              <FormControl>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    placeholder="Enter city, state"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      fetchLocationSuggestions(e.target.value);
                                      setShowSuggestions(true);
                                    }}
                                    disabled={
                                      !isEditing ||
                                      isSubmitting ||
                                      form.watch("location.type") === "remote"
                                    }
                                    onBlur={() => {
                                      field.onBlur();
                                      setTimeout(
                                        () => setShowSuggestions(false),
                                        200
                                      );
                                    }}
                                    onFocus={() => {
                                      if (
                                        field.value &&
                                        locationSuggestions.length > 0
                                      ) {
                                        setShowSuggestions(true);
                                      }
                                    }}
                                  />
                                </div>
                              </FormControl>
                              {showSuggestions &&
                                locationSuggestions.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                                    {locationSuggestions.map(
                                      (suggestion, index) => (
                                        <div
                                          key={index}
                                          className="p-2 hover:bg-muted cursor-pointer"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            form.setValue(
                                              "location.address",
                                              suggestion.address
                                            );
                                            form.setValue(
                                              "location.coordinates",
                                              suggestion.coordinates
                                            );
                                            setShowSuggestions(false);
                                          }}
                                        >
                                          {suggestion.address}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Date Field */}
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="">
                            <FormLabel>Date Posted</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    disabled={!isEditing || isSubmitting}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <DateCalendar // Change from Calendar to DateCalendar
                                  mode="single"
                                  selected={
                                    field.value instanceof Date
                                      ? field.value
                                      : new Date(field.value || Date.now())
                                  }
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() ||
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="jobType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Type</FormLabel>
                          <Select
                            disabled={!isEditing || isSubmitting}
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select job type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fulltime">
                                Full-time
                              </SelectItem>
                              <SelectItem value="parttime">
                                Part-time
                              </SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="freelance">
                                Freelance
                              </SelectItem>
                              <SelectItem value="internship">
                                Internship
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel className="block mb-2">Benefits</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a benefit"
                                value={benefitInput}
                                onChange={(e) =>
                                  setBenefitInput(e.target.value)
                                }
                                disabled={isSubmitting}
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    isEditing &&
                                    !isSubmitting
                                  ) {
                                    e.preventDefault();
                                    addBenefit();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                onClick={addBenefit}
                                disabled={isSubmitting}
                                size="sm"
                              >
                                Add
                              </Button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(form.watch("benefits") || [])
                              .filter((b) => b.trim() !== "")
                              .map((benefit, index) => (
                                <Badge
                                  key={index}
                                  variant={isEditing ? "outline" : "secondary"}
                                  className="flex items-center"
                                >
                                  {benefit}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => removeBenefit(benefit)}
                                      className="ml-1 focus:outline-none"
                                      disabled={isSubmitting}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </FormControl>
                      {!isEditing &&
                        (!form.watch("benefits") ||
                          form.watch("benefits")?.length === 0 ||
                          form.watch("benefits")?.every((b) => !b)) && (
                          <p className="text-sm text-muted-foreground italic mt-2">
                            No benefits specified
                          </p>
                        )}
                    </div>

                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing || isSubmitting}
                              placeholder="https://example.com/job"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel className="block mb-2">
                        Skills Required
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a skill"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                disabled={isSubmitting}
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    isEditing &&
                                    !isSubmitting
                                  ) {
                                    e.preventDefault();
                                    addSkill();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                onClick={addSkill}
                                disabled={isSubmitting}
                                size="sm"
                              >
                                Add
                              </Button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {form
                              .watch("skills")
                              .filter((s) => s.trim() !== "")
                              .map((skill, index) => (
                                <Badge
                                  key={index}
                                  variant={isEditing ? "outline" : "secondary"}
                                  className="flex items-center"
                                >
                                  {skill}
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => removeSkill(skill)}
                                      className="ml-1 focus:outline-none"
                                      disabled={isSubmitting}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </FormControl>
                      {!isEditing &&
                        form.watch("skills").filter((s) => s.trim() !== "")
                          .length === 0 && (
                          <p className="text-sm text-muted-foreground italic mt-2">
                            No skills specified
                          </p>
                        )}
                      {form.formState.errors.skills?.message && (
                        <p className="text-sm font-medium text-destructive mt-2">
                          {form.formState.errors.skills.message}
                        </p>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              disabled={!isEditing || isSubmitting}
                              rows={6}
                              placeholder="Enter job description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-between pt-6 border-t">
                {isEditing ? (
                  <Button
                    className="w-full"
                    onClick={saveChanges}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                ) : (
                  <>
                    <AlertDialog
                      open={showRejectDialog}
                      onOpenChange={setShowRejectDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setJobToAction(jobId);
                            setShowRejectDialog(true);
                          }}
                          disabled={isSubmitting}
                          className="flex items-center"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {isSubmitting ? "Processing..." : "Reject Job"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you sure you want to reject this job?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently delete the job listing
                            and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              if (jobToAction) {
                                rejectJob(jobToAction);
                              }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog
                      open={showVerifyDialog}
                      onOpenChange={setShowVerifyDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          onClick={() => {
                            setJobToAction(jobId);
                            setShowVerifyDialog(true);
                          }}
                          disabled={isSubmitting}
                          className="flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {isSubmitting ? "Processing..." : "Verify & Publish"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Verify and publish this job?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the job as verified and make it
                            publicly available on the platform.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              if (jobToAction) {
                                verifyJob(jobToAction, true);
                              }
                            }}
                            className="bg-green-600 text-white hover:bg-green-700"
                          >
                            Verify & Publish
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
