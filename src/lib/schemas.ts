import * as z from "zod"

export const personalInfoSchema = z.object({
  username: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  bio: z.string().optional(),
  isPrivate: z.boolean().default(false),
})

export const educationSchema = z.object({
  education: z.string().min(5, "Education details must be at least 5 characters"),
})

export const experienceSchema = z.object({
  experience: z.string().min(5, "Experience details must be at least 5 characters"),
})

export const locationSchema = z
  .object({
    type: z.enum(["remote", "onsite", "hybrid"]),
    address: z.string().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lon: z.number(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === "remote") return true;
      return !!(data.address && data.coordinates);
    },
    {
      message: "Location details required for non-remote positions",
      path: ["address"],
    }
  );

export const jobReportSchema = z.object({
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
  location: locationSchema,
  jobType: z.enum([
    "fulltime",
    "parttime",
    "contract", 
    "volunteer",
    "internship",
  ]),
});

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>
export type EducationValues = z.infer<typeof educationSchema>
export type ExperienceValues = z.infer<typeof experienceSchema>
export type JobReportValues = z.infer<typeof jobReportSchema>
export type LocationValues = z.infer<typeof locationSchema>