import { Suspense } from "react"
import AnimatedLogo from "@/components/animated-logo"
import JobsContent from "@/components/job/job-content"


export default function JobsPage() {
  return (
    <Suspense fallback={<AnimatedLogo />}>
      <JobsContent />
    </Suspense>
  )
}
