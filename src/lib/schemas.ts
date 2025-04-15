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

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>
export type EducationValues = z.infer<typeof educationSchema>
export type ExperienceValues = z.infer<typeof experienceSchema>
