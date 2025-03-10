"use client";

import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().min(1, {
    message: "Job title is required.",
  }),
  company: z.string().min(1, {
    message: "Company name is required.",
  }),
  url: z.string().url({
    message: "Please enter a valid URL.",
  }),
  date: z.date({
    required_error: "Date posted is required.",
  }),
  description: z.string().min(1, {
    message: "Job description is required.",
  }),
  salary: z.string().optional(),
  benefits: z.array(z.string()),
  skills: z.array(z.string()).min(1, {
    message: "At least one skill is required.",
  }),
  // Make location mandatory
  location: z.string().min(1, {
    message: "Location is required.",
  }).refine(
    (val) => /^[A-Za-z\s]+(,\s*[A-Za-z\s]+)+$/.test(val),
    {
      message: "Location must be in 'City, State' format.",
    }
  ),
  job_type: z
    .enum(["fulltime", "parttime", "contract", "freelance", "internship"])
    .optional(),
});

function debounce<F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<F>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

export default function ReportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [benefitInput, setBenefitInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      company: "",
      url: "",
      date: new Date(),
      description: "",
      salary: "",
      benefits: [],
      skills: [],
      location: "Remote",
      job_type: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(() => {
        toast.success("Job report submitted successfully!");
        form.reset();
      })
      .catch((error) => {
        console.error("Error:", error);
        toast.error("There was an error submitting the job report.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  const addSkill = () => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !form.getValues().skills.includes(trimmedSkill)) {
      form.setValue("skills", [...form.getValues().skills, trimmedSkill]);
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
    if (trimmedBenefit && !form.getValues().benefits.includes(trimmedBenefit)) {
      form.setValue("benefits", [...form.getValues().benefits, trimmedBenefit]);
      setBenefitInput("");
    }
  };

  const removeBenefit = (benefitToRemove: string) => {
    form.setValue(
      "benefits",
      form.getValues().benefits.filter((benefit) => benefit !== benefitToRemove)
    );
  };

  const fetchLocationSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setLocationSuggestions([]);
        return;
      }
  
      // Create a request ID to handle race conditions
      const requestId = Date.now();
      (fetchLocationSuggestions as any).lastRequestId = requestId;
  
      setIsValidatingLocation(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );
  
        // Only process if this is still the most recent request
        if ((fetchLocationSuggestions as any).lastRequestId !== requestId) {
          return;
        }
  
        if (response.ok) {
          const data = await response.json();
          const suggestions = data
            .map((item: any) => {
              const city =
                item.address?.city ||
                item.address?.town ||
                item.address?.village ||
                "";
              const state = item.address?.state || "";
              return city && state ? `${city}, ${state}` : "";
            })
            .filter(Boolean);
  
          setLocationSuggestions([...new Set(suggestions)] as string[]);
        }
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      } finally {
        if ((fetchLocationSuggestions as any).lastRequestId === requestId) {
          setIsValidatingLocation(false);
        }
      }
    }, 300),
    [] // Empty dependency array since we don't need to recreate this function
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Add Job Posting</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter job title" {...field} />
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
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/job" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
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
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
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
            <div className="flex-1 space-y-8">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter city, state"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          fetchLocationSuggestions(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onBlur={() => {
                          field.onBlur();
                          // Delay hiding suggestions to allow for clicks
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        onFocus={() => {
                          if (field.value && locationSuggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                      />
                    </FormControl>
                    {isValidatingLocation && (
                      <div className="absolute right-3 top-9">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="p-2 hover:bg-muted cursor-pointer"
                            onClick={() => {
                              form.setValue("location", suggestion);
                              setShowSuggestions(false);
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                    <FormDescription>
                      Enter a valid city and state (e.g., "San Francisco, CA")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="job_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fulltime">Full Time</SelectItem>
                        <SelectItem value="parttime">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., $50k-$70k" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="benefits"
                render={({ field }) => (
                  <FormItem style={{ marginTop: "22px" }}>
                    <FormLabel>Benefits</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a benefit"
                            value={benefitInput}
                            onChange={(e) => setBenefitInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addBenefit();
                              }
                            }}
                          />
                          <Button type="button" onClick={addBenefit}>
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((benefit, index) => (
                            <span
                              key={index}
                              className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center"
                            >
                              {benefit}
                              <button
                                type="button"
                                onClick={() => removeBenefit(benefit)}
                                className="ml-2 focus:outline-none"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Press Enter or click Add to add a benefit
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter job description"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skills Needed</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                      />
                      <Button type="button" onClick={addSkill}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {field.value.map((skill, index) => (
                        <span
                          key={index}
                          className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 focus:outline-none"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Press Enter or click Add to add a skill
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Job Posting"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
