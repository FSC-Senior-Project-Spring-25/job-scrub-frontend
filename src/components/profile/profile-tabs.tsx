"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EducationSection from "./education-section"
import ExperienceSection from "./experience-section"
import ResumeSection from "./resume-section"
import { GraduationCap, Briefcase, FileText } from "lucide-react"

interface ProfileTabsProps {
  userData: {
    education: string[]
    experience: string[]
    resume_id?: string | null
  }
  isOwnProfile: boolean
  uid: string
}

export default function ProfileTabs({ userData, isOwnProfile, uid }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("education")

  return (
    <Tabs defaultValue="education" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-6">
        <TabsTrigger value="education" className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          <span className="hidden sm:inline">Education</span>
        </TabsTrigger>
        <TabsTrigger value="experience" className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Experience</span>
        </TabsTrigger>
        <TabsTrigger value="resume" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Resume</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="education" className="mt-0">
        <EducationSection education={userData.education} isOwnProfile={isOwnProfile} uid={uid} />
      </TabsContent>

      <TabsContent value="experience" className="mt-0">
        <ExperienceSection experience={userData.experience} isOwnProfile={isOwnProfile} uid={uid} />
      </TabsContent>

      <TabsContent value="resume" className="mt-0">
        <ResumeSection resumeId={userData.resume_id} isOwnProfile={isOwnProfile} uid={uid} />
      </TabsContent>
    </Tabs>
  )
}
